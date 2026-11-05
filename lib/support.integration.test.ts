import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, query } from '@/lib/db';
import {
  getSupportTicket,
  listSupportMessages,
  listSupportTickets,
  openSupportTicket,
  replyToSupportTicket,
  setSupportStatus,
} from '@/lib/support';
import type { Outbound } from '@/lib/whatsapp/messages';
import { setMessenger, type Messenger } from '@/lib/whatsapp/provider';

const PHONE = '+233241000009';
let vendorId = '';
let sent: { to: string; message: Outbound }[] = [];

const messenger: Messenger = {
  name: 'test',
  async send(to, message) {
    sent.push({ to, message });
  },
};

beforeEach(async () => {
  await query(
    'truncate support_ticket, wa_message, wa_conversation, orders, items, vendors restart identity cascade',
  );
  const vendor = await query<{ id: string }>(
    `insert into vendors (phone, name, handle, type, status, consent_at)
     values ($1, 'Ama''s Glow Studio', 'amasglow', 'products', 'live', now())
     returning id`,
    [PHONE],
  );
  vendorId = vendor[0].id;
  sent = [];
  setMessenger(messenger);
});

afterAll(async () => {
  setMessenger(null);
  await db().end();
});

async function open(message = 'Help'): Promise<void> {
  const client = await db().connect();
  try {
    await client.query('begin');
    await openSupportTicket(client, { vendorId, phone: PHONE, message });
    await client.query('commit');
  } finally {
    client.release();
  }
}

describe('support inbox', () => {
  it('reuses one open ticket per phone and keeps the latest message', async () => {
    await open('Help');
    await open('My stock numbers look wrong');

    const tickets = await listSupportTickets();
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toMatchObject({
      phone: PHONE,
      vendorHandle: 'amasglow',
      status: 'open',
      lastMessage: 'My stock numbers look wrong',
    });
  });

  it('starts a new ticket after the previous one is closed', async () => {
    await open('Help');
    const first = await listSupportTickets();
    await setSupportStatus(first[0].id, 'closed');
    await open('Help again');

    const all = await listSupportTickets();
    expect(all).toHaveLength(2);
    expect(all.filter((ticket) => ticket.status === 'open')).toHaveLength(1);
  });

  it('keeps only one open ticket when an old one is reopened', async () => {
    await open('Help');
    const first = (await listSupportTickets())[0];
    await setSupportStatus(first.id, 'closed');
    await open('Second issue');
    const second = (await listSupportTickets()).find((ticket) => ticket.id !== first.id)!;

    await setSupportStatus(first.id, 'open');
    const all = await listSupportTickets();
    expect(all.filter((ticket) => ticket.status === 'open')).toHaveLength(1);
    expect(all.find((ticket) => ticket.id === first.id)?.status).toBe('open');
    expect(all.find((ticket) => ticket.id === second.id)?.status).toBe('closed');
  });

  it('sends a reply and records it in the conversation', async () => {
    await open('Help');
    const ticket = (await listSupportTickets())[0];

    const result = await replyToSupportTicket(ticket.id, 'We are checking this now.');
    expect(result).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(PHONE);
    expect(sent[0].message.body).toContain('checking this now');

    const messages = await listSupportMessages(PHONE);
    expect(messages.some((message) => message.direction === 'out' && message.body?.includes('checking'))).toBe(true);

    const updated = await getSupportTicket(ticket.id);
    expect(updated?.lastMessage).toBe('We are checking this now.');
  });

  it('refuses to reply on a closed ticket', async () => {
    await open('Help');
    const ticket = (await listSupportTickets())[0];
    await setSupportStatus(ticket.id, 'closed');

    const result = await replyToSupportTicket(ticket.id, 'Hello?');
    expect(result).toMatchObject({ ok: false });
    expect(sent).toHaveLength(0);
  });
});
