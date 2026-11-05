import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, query } from '@/lib/db';
import { handleInbound, rememberInbound } from '@/lib/whatsapp/engine';
import type { InboundMessage } from '@/lib/whatsapp/inbound';
import type { Outbound } from '@/lib/whatsapp/messages';
import type { Messenger } from '@/lib/whatsapp/provider';

const PHONE = '+233241000001';

let sent: { to: string; message: Outbound }[] = [];
const messenger: Messenger = {
  name: 'test',
  async send(to, message) {
    sent.push({ to, message });
  },
};

function inbound(partial: Partial<InboundMessage>): InboundMessage {
  return {
    providerMessageId: `wamid.test.${randomUUID()}`,
    from: PHONE,
    kind: 'text',
    text: null,
    buttonId: null,
    caption: null,
    mediaId: null,
    receivedAt: new Date(),
    raw: {},
    ...partial,
  };
}

async function say(text: string): Promise<Outbound[]> {
  sent = [];
  await handleInbound(inbound({ kind: 'text', text }), messenger);
  return sent.map((entry) => entry.message);
}

async function tap(buttonId: string): Promise<Outbound[]> {
  sent = [];
  await handleInbound(inbound({ kind: 'button', text: buttonId, buttonId }), messenger);
  return sent.map((entry) => entry.message);
}

function body(replies: Outbound[]): string {
  return replies
    .map((reply) => (reply.kind === 'buttons' ? `${reply.body} [${reply.buttons.map((b) => b.title).join(' | ')}]` : reply.body))
    .join('\n');
}

function buttonId(replies: Outbound[], prefix: string): string | undefined {
  for (const reply of replies) {
    if (reply.kind !== 'buttons') continue;
    const found = reply.buttons.find((option) => option.id.startsWith(prefix));
    if (found) return found.id;
  }
  return undefined;
}

beforeEach(async () => {
  await query(
    'truncate vendors, items, wa_conversation, wa_message, waitlist_signup, reserved_handle restart identity cascade',
  );
});

afterAll(async () => {
  await db().end();
});

describe('WhatsApp onboarding', () => {
  it('walks a new vendor from START to a live page', async () => {
    let replies = await say('START');
    expect(body(replies)).toContain('Welcome to sikatree');
    expect(buttonId(replies, 'consent_yes')).toBeTruthy();

    replies = await tap('consent_yes');
    expect(body(replies)).toContain('What is your business called?');

    replies = await say("Ama's Glow");
    expect(body(replies)).toContain('What do you do?');

    replies = await tap('type_products');
    const handleChoice = buttonId(replies, 'handle:');
    expect(handleChoice).toBeTruthy();
    const handle = handleChoice!.slice('handle:'.length);
    expect(handle.startsWith('ama')).toBe(true);

    replies = await tap(handleChoice!);
    expect(body(replies)).toContain('is yours');
    expect(body(replies)).toContain('Vitamin C serum 120');

    replies = await say('Serum 120');
    expect(body(replies)).toContain('Serum: GH₵120.00');
    expect(buttonId(replies, 'item_confirm')).toBeTruthy();

    replies = await tap('item_confirm');
    expect(body(replies)).toContain('You are live');
    expect(body(replies)).toContain(`sikatree.africa/${handle}`);

    const vendor = await query<{ id: string; name: string; handle: string; status: string }>(
      'select id, name, handle, status from vendors where phone = $1',
      [PHONE],
    );
    expect(vendor[0]).toMatchObject({ name: "Ama's Glow", handle, status: 'live' });

    const items = await query<{ name: string; price_pesewas: number }>(
      'select name, price_pesewas from items where vendor_id = $1',
      [vendor[0].id],
    );
    expect(items).toEqual([{ name: 'Serum', price_pesewas: 12000 }]);
  });

  it('keeps state between messages so a stalled setup resumes', async () => {
    await say('START');
    await tap('consent_yes');
    await say('Kofi Kitchen');

    const rows = await query<{ state: string }>(
      'select state from wa_conversation where phone = $1',
      [PHONE],
    );
    expect(rows[0].state).toBe('type');

    const replies = await tap('type_both');
    expect(body(replies)).toContain('page link');
  });

  it('rejects reserved handles without losing the draft', async () => {
    await say('START');
    await tap('consent_yes');
    await say('Ama Glow');
    await tap('type_products');

    const replies = await say('admin');
    expect(body(replies)).toContain('reserved');

    const rows = await query<{ state: string; context: { draft?: { name?: string } } }>(
      'select state, context from wa_conversation where phone = $1',
      [PHONE],
    );
    expect(rows[0].state).toBe('handle');
    expect(rows[0].context.draft?.name).toBe('Ama Glow');
  });

  it('prefills a waitlist vendor and marks them onboarded on go-live', async () => {
    const waitlist = await query<{ id: string }>(
      `insert into waitlist_signup
         (phone, business_type, business_name, handle, referral_code, consent_at)
       values ($1, 'products', 'Ama Glow', 'amaglow', 'ABC123', now())
       returning id`,
      [PHONE],
    );
    await query(
      `insert into reserved_handle (handle, signup_id, expires_at)
       values ('amaglow', $1, now() + interval '30 days')`,
      [waitlist[0].id],
    );

    await say('START');
    const replies = await tap('consent_yes');

    expect(body(replies)).toContain('amaglow');
    expect(body(replies)).toContain('Vitamin C serum');

    await say('Beaded bag 180');
    await tap('item_confirm');

    const vendor = await query<{ handle: string }>('select handle from vendors where phone = $1', [
      PHONE,
    ]);
    expect(vendor[0].handle).toBe('amaglow');

    const signup = await query<{ status: string }>(
      'select status from waitlist_signup where id = $1',
      [waitlist[0].id],
    );
    expect(signup[0].status).toBe('onboarded');

    const reserved = await query<{ status: string }>(
      "select status from reserved_handle where handle = 'amaglow'",
    );
    expect(reserved[0].status).toBe('claimed');
  });

  it('honours STOP and stays quiet afterwards', async () => {
    await query(
      `insert into vendors (phone, name, handle, type, status, consent_at)
       values ($1, 'Ama Glow', 'amaglow', 'products', 'live', now())`,
      [PHONE],
    );
    await query(
      `insert into wa_conversation (phone, state, vendor_id, context)
       values ($1, 'live', (select id from vendors where phone = $1), '{}')`,
      [PHONE],
    );

    const stop = await say('STOP');
    expect(body(stop)).toContain('will not hear from me');

    const rows = await query<{ opted_out: boolean }>(
      'select opted_out from wa_conversation where phone = $1',
      [PHONE],
    );
    expect(rows[0].opted_out).toBe(true);

    const quiet = await say('menu');
    expect(quiet).toHaveLength(0);
  });
});

describe('webhook idempotency', () => {
  it('stores a provider message id once', async () => {
    const message = inbound({ text: 'START' });
    expect(await rememberInbound(message)).toBe(true);
    expect(await rememberInbound(message)).toBe(false);
  });
});

describe('durability and photos', () => {
  it('does not apply the same message twice', async () => {
    const message = inbound({ text: 'START' });
    const first = await (async () => {
      sent = [];
      await handleInbound(message, messenger);
      return sent.length;
    })();
    expect(first).toBeGreaterThan(0);

    sent = [];
    await handleInbound(message, messenger);
    expect(sent).toHaveLength(0);
  });

  it('runs a queued job end to end', async () => {
    const { setMessenger } = await import('@/lib/whatsapp/provider');
    const { enqueueInbound, drainOnce } = await import('@/lib/wa-jobs');
    sent = [];
    setMessenger(messenger);

    const message = inbound({ text: 'START' });
    await enqueueInbound(message);
    const processed = await drainOnce();

    expect(processed).toBe(1);
    expect(sent.map((entry) => body([entry.message])).join('\n')).toContain('Welcome to sikatree');
    setMessenger(null);
  });

  it('parses a photo caption into an item and keeps the media reference', async () => {
    await say('START');
    await tap('consent_yes');
    await say('Ama Glow');
    const handleReply = await tap('type_products');
    const handleChoice = buttonId(handleReply, 'handle:');
    await tap(handleChoice ?? 'handle:amaglow');

    const preview = await (async () => {
      sent = [];
      await handleInbound(
        inbound({ kind: 'image', text: null, caption: 'Serum 120', mediaId: 'media-abc' }),
        messenger,
      );
      return sent.map((entry) => entry.message);
    })();
    expect(body(preview)).toContain('Serum: GH₵120.00');

    await tap('item_confirm');

    const items = await query<{ name: string; image_ref: string | null }>(
      'select name, image_ref from items order by position',
    );
    expect(items).toEqual([{ name: 'Serum', image_ref: 'media-abc' }]);
  });

  it('asks for a name and price when a photo has no caption', async () => {
    await say('START');
    await tap('consent_yes');
    await say('Ama Glow');
    const handleReply = await tap('type_products');
    const handleChoice = buttonId(handleReply, 'handle:');
    await tap(handleChoice ?? 'handle:amaglow');

    const replies = await (async () => {
      sent = [];
      await handleInbound(inbound({ kind: 'image', text: null, caption: null, mediaId: 'media-x' }), messenger);
      return sent.map((entry) => entry.message);
    })();
    expect(body(replies)).toContain('Got the photo');
  });
});
