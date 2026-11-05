import type { PoolClient } from 'pg';
import { db } from '@/lib/db';
import { checkHandle, normalizeHandle } from '@/lib/handle';
import { parseItems, type ParsedItem } from '@/lib/parsing/text-items';
import { site } from '@/lib/brand';
import { copy } from '@/lib/whatsapp/copy';
import { formatCedis } from '@/lib/money';
import { createLoginLink } from '@/lib/login-links';
import { openSupportTicket } from '@/lib/support';
import { saveItemImage } from '@/lib/whatsapp/media';
import { parseInbound, type InboundMessage } from '@/lib/whatsapp/inbound';
import { buttons, text, type Outbound } from '@/lib/whatsapp/messages';
import { getMessenger, type Messenger } from '@/lib/whatsapp/provider';

export type VendorType = 'products' | 'services' | 'both';

type Draft = {
  name?: string;
  type?: VendorType;
  handle?: string;
  consentAt?: string;
  waitlistId?: string;
};

type Context = {
  draft?: Draft;
  pending?: ParsedItem[];
  pendingImage?: string | null;
  mode?: 'onboarding' | 'add';
};

type Conversation = {
  phone: string;
  state: string;
  context: Context;
  optedOut: boolean;
  vendorId: string | null;
  lastMessageId: string | null;
};

type StepResult = {
  state: string;
  context: Context;
  replies: Outbound[];
  optedOut?: boolean;
};

const TYPES: { id: string; title: string; value: VendorType; words: RegExp }[] = [
  { id: 'type_products', title: 'I sell products', value: 'products', words: /product|goods/i },
  { id: 'type_services', title: 'I offer services', value: 'services', words: /service|book/i },
  { id: 'type_both', title: 'Both', value: 'both', words: /both|and both/i },
];

const CONSENT_BUTTONS = [
  { id: 'consent_yes', title: 'I agree' },
  { id: 'consent_terms', title: 'Read terms' },
];

const START_WORDS = /^(start|hi|hello|hey|hola|good (morning|afternoon|evening))$/i;
const RESTART_WORDS = /^(restart|cancel|reset|stop setup)$/i;
const CONFIRM = /^(confirm|yes|ok|okay|looks good|correct)$/i;
const EDIT = /^(edit|change|wrong)$/i;
const CANCEL = /^(cancel|no|stop)$/i;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
}

function asContext(value: unknown): Context {
  return value && typeof value === 'object' ? (value as Context) : {};
}

function withDraft(context: Context, patch: Partial<Draft>): Context {
  return { ...context, draft: { ...context.draft, ...patch } };
}

async function loadConversation(client: PoolClient, phone: string): Promise<Conversation> {
  await client.query(
    'insert into wa_conversation (phone) values ($1) on conflict (phone) do nothing',
    [phone],
  );

  const { rows } = await client.query<{
    phone: string;
    state: string;
    context: unknown;
    opted_out: boolean;
    vendor_id: string | null;
    last_message_id: string | null;
  }>(
    'select phone, state, context, opted_out, vendor_id, last_message_id from wa_conversation where phone = $1 for update',
    [phone],
  );

  const row = rows[0];
  return {
    phone,
    state: row.state,
    context: asContext(row.context),
    optedOut: row.opted_out,
    vendorId: row.vendor_id,
    lastMessageId: row.last_message_id,
  };
}

async function handleUsable(
  client: PoolClient,
  handle: string,
  waitlistId?: string,
): Promise<{ ok: true } | { ok: false; reason: 'reserved' | 'blocked' | 'invalid' | 'taken' }> {
  const status = checkHandle(handle);
  if (status === 'reserved' || status === 'blocked') return { ok: false, reason: status };
  if (status !== 'available') return { ok: false, reason: 'invalid' };

  const vendor = await client.query('select 1 from vendors where handle = $1', [handle]);
  if (vendor.rowCount) return { ok: false, reason: 'taken' };

  const reserved = await client.query<{ signup_id: string; status: string; expires_at: Date }>(
    'select signup_id, status, expires_at from reserved_handle where handle = $1',
    [handle],
  );
  const row = reserved.rows[0];
  if (row) {
    if (row.status === 'claimed') return { ok: false, reason: 'taken' };
    if (row.expires_at.getTime() > Date.now() && row.signup_id !== waitlistId) {
      return { ok: false, reason: 'taken' };
    }
  }

  return { ok: true };
}

async function suggestHandles(
  client: PoolClient,
  name: string,
  waitlistId?: string,
  limit = 2,
): Promise<string[]> {
  const base = slugify(name) || 'shop';
  const candidates = [base, `${base}gh`, `${base}-shop`, `${base}1`].map((handle) =>
    handle.slice(0, 20),
  );

  const free: string[] = [];
  for (const candidate of candidates) {
    if (candidate.length < 3) continue;
    if (free.includes(candidate)) continue;
    const usable = await handleUsable(client, candidate, waitlistId);
    if (usable.ok) free.push(candidate);
    if (free.length >= limit) break;
  }
  return free;
}

async function prefillFromWaitlist(client: PoolClient, phone: string): Promise<Partial<Draft>> {
  const { rows } = await client.query<{
    id: string;
    business_name: string | null;
    business_type: VendorType | null;
    handle: string | null;
    held: boolean;
  }>(
    `select w.id, w.business_name, w.business_type, w.handle,
            exists (
              select 1 from reserved_handle r
              where r.handle = w.handle and r.signup_id = w.id
                and (r.status = 'claimed' or (r.status = 'reserved' and r.expires_at > now()))
            ) as held
       from waitlist_signup w
      where w.phone = $1 and w.status <> 'unsubscribed'`,
    [phone],
  );

  const row = rows[0];
  if (!row) return {};

  const draft: Partial<Draft> = {
    waitlistId: row.id,
    name: row.business_name ?? undefined,
    type: row.business_type ?? undefined,
  };

  if (row.handle && row.held) draft.handle = row.handle;
  else if (row.handle) {
    const usable = await handleUsable(client, row.handle, row.id);
    if (usable.ok) draft.handle = row.handle;
  }

  return draft;
}

async function goLive(
  client: PoolClient,
  conversation: Conversation,
  context: Context,
  items: ParsedItem[],
  imageRef: string | null = null,
): Promise<StepResult> {
  const existing = await client.query<{ id: string; handle: string }>(
    'select id, handle from vendors where phone = $1',
    [conversation.phone],
  );
  if (existing.rows[0]) {
    const vendor = existing.rows[0];
    await client.query('update wa_conversation set vendor_id = $2 where phone = $1', [
      conversation.phone,
      vendor.id,
    ]);
    return {
      state: 'live',
      context: {},
      replies: [text(copy.live(vendor.handle, site.domain)), text(copy.menu())],
    };
  }

  const draft = context.draft ?? {};
  if (!draft.name || !draft.type || !draft.handle) {
    return {
      state: 'name',
      context: { ...context, draft },
      replies: [text(copy.askName())],
    };
  }

  await client.query('savepoint vendor_insert');
  const inserted = await client
    .query<{ id: string }>(
      `insert into vendors (phone, name, handle, type, status, consent_at, waitlist_signup_id)
       values ($1, $2, $3, $4, 'live', coalesce($5::timestamptz, now()), $6)
       on conflict (handle) do nothing
       returning id`,
      [conversation.phone, draft.name, draft.handle, draft.type, draft.consentAt ?? null, draft.waitlistId ?? null],
    )
    .catch(async (error: Error & { code?: string }) => {
      if (error.code === '23505') {
        await client.query('rollback to savepoint vendor_insert');
        return { rows: [] as { id: string }[] };
      }
      throw error;
    });

  const vendor = inserted.rows[0];
  if (!vendor) {
    const suggestion = (await suggestHandles(client, draft.name, draft.waitlistId))[0] ?? `${draft.handle}gh`;
    return {
      state: 'handle',
      context: withDraft(context, { handle: undefined }),
      replies: [
        buttons(copy.handleTaken(suggestion), [
          { id: `handle:${suggestion}`, title: suggestion.slice(0, 20) },
          { id: 'handle_custom', title: 'Type my own' },
        ]),
      ],
    };
  }
  await client.query('release savepoint vendor_insert');

  const imageUrl = imageRef
    ? await saveItemImage({ mediaId: imageRef, vendorId: vendor.id })
    : null;

  for (const [index, item] of items.entries()) {
    await client.query(
      `insert into items (vendor_id, name, price_pesewas, stock, image_ref, image_url, position)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        vendor.id,
        item.name,
        item.pricePesewas,
        item.stock,
        index === 0 ? imageRef : null,
        index === 0 ? imageUrl : null,
        index,
      ],
    );
  }

  if (draft.waitlistId) {
    await client.query(
      `update reserved_handle set status = 'claimed'
        where handle = $1 and signup_id = $2`,
      [draft.handle, draft.waitlistId],
    );
    await client.query("update waitlist_signup set status = 'onboarded' where id = $1", [
      draft.waitlistId,
    ]);
  }

  await client.query('update wa_conversation set vendor_id = $2 where phone = $1', [
    conversation.phone,
    vendor.id,
  ]);

  const replies: Outbound[] = [text(copy.live(draft.handle, site.domain))];
  if (imageRef && !imageUrl) replies.push(text(copy.photoFailed()));
  replies.push(
    buttons('What next?', [
      { id: 'share', title: 'Share my page' },
      { id: 'add', title: 'Add an item' },
      { id: 'dashboard', title: 'Open dashboard' },
    ]),
  );

  return { state: 'live', context: {}, replies };
}

async function startOnboarding(context: Context): Promise<StepResult> {
  return {
    state: 'consent',
    context: { ...context, draft: {}, pending: undefined, mode: undefined },
    replies: [text(copy.welcome()), buttons(copy.consent(), CONSENT_BUTTONS)],
  };
}

export async function advance(
  client: PoolClient,
  conversation: Conversation,
  inbound: InboundMessage,
): Promise<StepResult> {
  const context = conversation.context;
  const raw = (inbound.text ?? '').trim();
  const lower = raw.toLowerCase();
  const button = inbound.buttonId;

  if (lower === 'stop' || lower === 'unsubscribe') {
    return { state: 'stopped', context, optedOut: true, replies: [text(copy.stopped())] };
  }

  if (conversation.optedOut) {
    if (START_WORDS.test(lower) || button === 'consent_yes') {
      return startOnboarding(context);
    }
    return { state: 'stopped', context, optedOut: true, replies: [] };
  }

  if (RESTART_WORDS.test(lower) && conversation.state !== 'live') {
    return startOnboarding(context);
  }

  if (lower === 'help' || button === 'help') {
    await openSupportTicket(client, {
      vendorId: conversation.vendorId,
      phone: conversation.phone,
      message: raw || 'Help',
    });
    return { state: conversation.state, context, replies: [text(copy.help())] };
  }

  if (lower === 'menu' || button === 'menu') {
    if (conversation.state === 'live') {
      return { state: 'live', context, replies: [text(copy.menu())] };
    }
    return { state: conversation.state, context, replies: [text(copy.setupInProgress())] };
  }

  if (conversation.state === 'new') {
    return startOnboarding(context);
  }

  switch (conversation.state) {
    case 'consent': {
      if (button === 'consent_terms' || /terms|privacy/i.test(raw)) {
        return {
          state: 'consent',
          context,
          replies: [text(copy.terms()), buttons(copy.consent(), CONSENT_BUTTONS)],
        };
      }

      const agreed = button === 'consent_yes' || /^(i agree|agree|yes|ok|okay|continue)$/i.test(raw);
      if (!agreed) {
        return {
          state: 'consent',
          context,
          replies: [buttons(copy.consent(), CONSENT_BUTTONS)],
        };
      }

      const prefill = await prefillFromWaitlist(client, conversation.phone);
      const draft: Draft = { consentAt: new Date().toISOString(), ...prefill };
      const next = { ...context, draft };

      if (draft.name && draft.type && draft.handle) {
        return {
          state: 'item',
          context: next,
          replies: [
            text(copy.handleChosen(draft.handle)),
            buttons(copy.askFirstItem(), [{ id: 'item_skip', title: 'Skip for now' }]),
          ],
        };
      }
      if (draft.name && draft.type) {
        const suggestions = await suggestHandles(client, draft.name, draft.waitlistId, 2);
        const options = [
          ...suggestions.map((handle) => ({ id: `handle:${handle}`, title: handle })),
          { id: 'handle_custom', title: 'Type my own' },
        ].slice(0, 3);
        return { state: 'handle', context: next, replies: [buttons(copy.askHandle(suggestions), options)] };
      }
      if (draft.name) {
        return {
          state: 'type',
          context: next,
          replies: [buttons(copy.askType(), TYPES.map((t) => ({ id: t.id, title: t.title })))],
        };
      }
      return { state: 'name', context: next, replies: [text(copy.askName())] };
    }

    case 'name': {
      const name = raw.replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 60 || !/[a-z]/i.test(name)) {
        return { state: 'name', context, replies: [text(copy.nameInvalid())] };
      }

      const next = withDraft(context, { name });
      if (next.draft?.type) {
        const suggestions = await suggestHandles(client, name, next.draft.waitlistId, 2);
        const options = [
          ...suggestions.map((handle) => ({ id: `handle:${handle}`, title: handle })),
          { id: 'handle_custom', title: 'Type my own' },
        ].slice(0, 3);
        return { state: 'handle', context: next, replies: [buttons(copy.askHandle(suggestions), options)] };
      }
      return {
        state: 'type',
        context: next,
        replies: [buttons(copy.askType(), TYPES.map((t) => ({ id: t.id, title: t.title })))],
      };
    }

    case 'type': {
      const chosen =
        TYPES.find((type) => type.id === button) ??
        TYPES.find((type) => type.words.test(raw)) ??
        TYPES.find((type) => raw.toLowerCase() === type.value);
      if (!chosen) {
        return {
          state: 'type',
          context,
          replies: [buttons(copy.askType(), TYPES.map((t) => ({ id: t.id, title: t.title })))],
        };
      }

      const next = withDraft(context, { type: chosen.value });
      const name = next.draft?.name ?? 'shop';
      const suggestions = await suggestHandles(client, name, next.draft?.waitlistId, 2);
      const options = [
        ...suggestions.map((handle) => ({ id: `handle:${handle}`, title: handle })),
        { id: 'handle_custom', title: 'Type my own' },
      ].slice(0, 3);
      return { state: 'handle', context: next, replies: [buttons(copy.askHandle(suggestions), options)] };
    }

    case 'handle': {
      if (button === 'handle_custom') {
        return { state: 'handle', context, replies: [text(copy.handleCustom())] };
      }

      const candidate = button?.startsWith('handle:') ? button.slice('handle:'.length) : raw;
      const handle = normalizeHandle(candidate);
      if (!handle) {
        return { state: 'handle', context, replies: [text(copy.handleInvalid())] };
      }

      const usable = await handleUsable(client, handle, context.draft?.waitlistId);
      if (!usable.ok) {
        if (usable.reason === 'reserved' || usable.reason === 'blocked') {
          return { state: 'handle', context, replies: [text(copy.handleReserved())] };
        }
        if (usable.reason === 'invalid') {
          return { state: 'handle', context, replies: [text(copy.handleInvalid())] };
        }
        const suggestion =
          (await suggestHandles(client, context.draft?.name ?? 'shop', context.draft?.waitlistId, 1))[0] ??
          `${handle}gh`;
        return {
          state: 'handle',
          context,
          replies: [
            buttons(copy.handleTaken(suggestion), [
              { id: `handle:${suggestion}`, title: suggestion.slice(0, 20) },
              { id: 'handle_custom', title: 'Type my own' },
            ]),
          ],
        };
      }

      const next = withDraft(context, { handle });
      return {
        state: 'item',
        context: next,
        replies: [
          text(copy.handleChosen(handle)),
          buttons(copy.askFirstItem(), [{ id: 'item_skip', title: 'Skip for now' }]),
        ],
      };
    }

    case 'item': {
      if (button === 'item_skip' || /^skip( for now)?$/i.test(raw)) {
        return goLive(client, conversation, context, []);
      }

      const isImage = inbound.kind === 'image';
      const source = isImage ? (inbound.caption ?? '') : raw;

      if (isImage && !source) {
        return {
          state: 'item',
          context: { ...context, pendingImage: inbound.mediaId },
          replies: [text(copy.photoNoCaption())],
        };
      }

      const parsed = parseItems(source);
      if (!parsed.ok) {
        return {
          state: 'item',
          context,
          replies: [text(parsed.hint ?? copy.itemInvalid())],
        };
      }

      // A photo applies to a single item; a list stays photo-less for now. A
      // photo sent without a caption is attached to the next text item.
      const pendingImage =
        parsed.items.length === 1
          ? isImage
            ? inbound.mediaId
            : (context.pendingImage ?? null)
          : null;
      const next = { ...context, pending: parsed.items, pendingImage };
      const preview = parsed.items
        .map((item) => `${item.name}: ${formatCedis(item.pricePesewas)}`)
        .join('\n');
      return {
        state: 'item_confirm',
        context: next,
        replies: [
          buttons(copy.itemPreview(preview), [
            { id: 'item_confirm', title: 'Confirm' },
            { id: 'item_edit', title: 'Edit' },
            { id: 'item_cancel', title: 'Cancel' },
          ]),
        ],
      };
    }

    case 'item_confirm': {
      if (button === 'item_edit' || EDIT.test(raw)) {
        return {
          state: 'item',
          context: { ...context, pending: undefined },
          replies: [text(copy.askFirstItem())],
        };
      }

      const cancel = button === 'item_cancel' || CANCEL.test(raw);
      const confirm = button === 'item_confirm' || CONFIRM.test(raw);
      if (!confirm && !cancel) {
        return {
          state: 'item_confirm',
          context,
          replies: [
            buttons('Confirm this item?', [
              { id: 'item_confirm', title: 'Confirm' },
              { id: 'item_edit', title: 'Edit' },
              { id: 'item_cancel', title: 'Cancel' },
            ]),
          ],
        };
      }

      const items = cancel ? [] : (context.pending ?? []);

      if (context.mode === 'add' && conversation.vendorId) {
        const imageUrl = context.pendingImage
          ? await saveItemImage({
              mediaId: context.pendingImage,
              vendorId: conversation.vendorId,
            })
          : null;

        for (const [index, item] of items.entries()) {
          await client.query(
            `insert into items (vendor_id, name, price_pesewas, stock, image_ref, image_url, position)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [
              conversation.vendorId,
              item.name,
              item.pricePesewas,
              item.stock,
              index === 0 ? (context.pendingImage ?? null) : null,
              index === 0 ? imageUrl : null,
              index,
            ],
          );
        }
        const replies: Outbound[] = [
          text(cancel ? copy.cancelled() : copy.itemAdded(items[0]?.name ?? 'item')),
        ];
        if (!cancel && context.pendingImage && !imageUrl) replies.push(text(copy.photoFailed()));
        replies.push(text(copy.menu()));

        return {
          state: 'live',
          context: { ...context, pending: undefined, pendingImage: undefined, mode: undefined },
          replies,
        };
      }

      return goLive(client, conversation, context, items, context.pendingImage ?? null);
    }

    case 'live': {
      if (button === 'share' || /^1$|share/.test(lower)) {
        if (!conversation.vendorId) return { state: 'live', context, replies: [text(copy.menu())] };
        const { rows } = await client.query<{ handle: string }>(
          'select handle from vendors where id = $1',
          [conversation.vendorId],
        );
        const handle = rows[0]?.handle;
        return {
          state: 'live',
          context,
          replies: [
            text(
              handle
                ? `My shop: ${site.domain}/${handle}\n\nSend this to your customers.`
                : copy.menu(),
            ),
          ],
        };
      }

      if (button === 'dashboard' || /^5$|dashboard/.test(lower)) {
        if (!conversation.vendorId) return { state: 'live', context, replies: [text(copy.menu())] };
        const link = await createLoginLink(conversation.vendorId);
        return { state: 'live', context, replies: [text(copy.dashboard(link.url))] };
      }

      if (button === 'add' || /^2$|add (an )?item/.test(lower)) {
        return {
          state: 'item',
          context: { ...context, mode: 'add', pending: undefined },
          replies: [text(copy.addPrompt())],
        };
      }

      if (/^3$|orders?/.test(lower)) {
        return { state: 'live', context, replies: [text(copy.orders())] };
      }

      if (/^4$|help/.test(lower)) {
        await openSupportTicket(client, {
          vendorId: conversation.vendorId,
          phone: conversation.phone,
          message: raw || 'Help',
        });
        return { state: 'live', context, replies: [text(copy.help())] };
      }

      return { state: 'live', context, replies: [text(copy.fallback())] };
    }

    case 'stopped':
      return { state: 'stopped', context, optedOut: true, replies: [] };

    default:
      return startOnboarding(context);
  }
}

// Entry point used by the webhook. Serialises per number, persists the new
// state, then sends outside the transaction so a slow provider cannot hold a
// database lock.
export async function handleInbound(
  inbound: InboundMessage,
  messenger: Messenger = getMessenger(),
): Promise<void> {
  if (inbound.kind === 'unsupported') {
    await messenger.send(inbound.from, text(copy.unsupported())).catch(() => {});
    return;
  }

  const client = await db().connect();
  let result: StepResult | null = null;

  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [inbound.from]);
    const conversation = await loadConversation(client, inbound.from);

    // Replay guard: if this delivery was already applied, do nothing. This is
    // what lets the job queue retry safely.
    if (conversation.lastMessageId === inbound.providerMessageId) {
      await client.query('commit');
      return;
    }

    result = await advance(client, conversation, inbound);
    await client.query(
      `update wa_conversation
          set state = $2, context = $3, opted_out = $4, last_message_id = $5, last_activity = now()
        where phone = $1`,
      [
        inbound.from,
        result.state,
        JSON.stringify(result.context),
        result.optedOut ?? conversation.optedOut,
        inbound.providerMessageId,
      ],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (result) {
    for (const reply of result.replies) {
      try {
        await messenger.send(inbound.from, reply);
      } catch (error) {
        console.error('[wa] send failed', error);
      }
    }
    await markProcessed(inbound.providerMessageId).catch(() => {});
  }
}

// Small helper for the webhook: store first, process only when the insert was
// not a duplicate.
export async function rememberInbound(inbound: InboundMessage): Promise<boolean> {
  const { rows } = await db().query(
    `insert into wa_message (provider_message_id, phone, direction, kind, body, payload)
     values ($1, $2, 'in', $3, $4, $5)
     on conflict (provider_message_id) do nothing
     returning id`,
    [inbound.providerMessageId, inbound.from, inbound.kind, inbound.text, JSON.stringify(inbound.raw)],
  );
  return rows.length > 0;
}

export async function markProcessed(providerMessageId: string): Promise<void> {
  await db().query('update wa_message set processed_at = now() where provider_message_id = $1', [
    providerMessageId,
  ]);
}

