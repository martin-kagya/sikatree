import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { db } from '@/lib/db';
import { text } from '@/lib/whatsapp/messages';
import { getMessenger } from '@/lib/whatsapp/provider';

export type SupportStatus = 'open' | 'closed';

// Called inside the WhatsApp engine transaction when a vendor asks for help.
// A second "help" while a ticket is open updates it instead of duplicating it.
export async function openSupportTicket(
  client: PoolClient,
  input: { vendorId: string | null; phone: string; message: string },
): Promise<void> {
  const message = input.message.trim().slice(0, 500) || 'Help';
  await client.query(
    `insert into support_ticket (vendor_id, phone, last_message)
     values ($1, $2, $3)
     on conflict (phone) where status = 'open'
     do update set
       vendor_id = coalesce(excluded.vendor_id, support_ticket.vendor_id),
       last_message = excluded.last_message,
       updated_at = now()`,
    [input.vendorId, input.phone, message],
  );
}

export type SupportTicket = {
  id: string;
  vendorId: string | null;
  vendorName: string | null;
  vendorHandle: string | null;
  vendorStatus: string | null;
  phone: string;
  status: SupportStatus;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const TICKET_SELECT = `
  select t.id, t.vendor_id, v.name as vendor_name, v.handle as vendor_handle,
         v.status as vendor_status, t.phone, t.status, t.last_message,
         t.created_at, t.updated_at
    from support_ticket t
    left join vendors v on v.id = t.vendor_id
`;

function toTicket(row: {
  id: string;
  vendor_id: string | null;
  vendor_name: string | null;
  vendor_handle: string | null;
  vendor_status: string | null;
  phone: string;
  status: SupportStatus;
  last_message: string | null;
  created_at: Date;
  updated_at: Date;
}): SupportTicket {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    vendorHandle: row.vendor_handle,
    vendorStatus: row.vendor_status,
    phone: row.phone,
    status: row.status,
    lastMessage: row.last_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listSupportTickets(status = ''): Promise<SupportTicket[]> {
  const rows = await db().query(
    `${TICKET_SELECT}
      where ($1 = '' or t.status = $1)
      order by case when t.status = 'open' then 0 else 1 end, t.updated_at desc
      limit 100`,
    [status],
  );
  return rows.rows.map(toTicket);
}

export async function getSupportTicket(id: string): Promise<SupportTicket | null> {
  const rows = await db().query(`${TICKET_SELECT} where t.id = $1`, [id]);
  return rows.rows[0] ? toTicket(rows.rows[0]) : null;
}

export type SupportMessage = {
  id: string;
  direction: 'in' | 'out';
  kind: string | null;
  body: string | null;
  createdAt: string;
};

export async function listSupportMessages(phone: string): Promise<SupportMessage[]> {
  const rows = await db().query<{
    id: string;
    direction: 'in' | 'out';
    kind: string | null;
    body: string | null;
    created_at: Date;
  }>(
    `select id, direction, kind, body, created_at
       from wa_message where phone = $1 order by created_at asc limit 200`,
    [phone],
  );
  return rows.rows.map((row) => ({
    id: row.id,
    direction: row.direction,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function setSupportStatus(id: string, status: SupportStatus): Promise<void> {
  if (status === 'open') {
    const ticket = await getSupportTicket(id);
    if (!ticket) return;
    // The partial unique index allows one open ticket per phone. Reopening an
    // old thread closes the newer open one rather than failing the update.
    await db().query(
      `update support_ticket
          set status = 'closed', updated_at = now()
        where phone = $1 and status = 'open' and id <> $2`,
      [ticket.phone, id],
    );
  }

  await db().query('update support_ticket set status = $2, updated_at = now() where id = $1', [
    id,
    status,
  ]);
}

export type ReplyResult = { ok: true } | { ok: false; error: string };

export async function replyToSupportTicket(id: string, raw: string): Promise<ReplyResult> {
  const body = raw.trim().slice(0, 1000);
  if (!body) return { ok: false, error: 'Write a reply first.' };

  const ticket = await getSupportTicket(id);
  if (!ticket) return { ok: false, error: 'Ticket not found.' };
  if (ticket.status === 'closed') return { ok: false, error: 'Reopen the ticket before replying.' };

  try {
    await getMessenger().send(ticket.phone, text(body));
  } catch (error) {
    console.error('[support] reply failed', error);
    return { ok: false, error: 'WhatsApp did not accept the reply. Try again.' };
  }

  await db().query(
    `insert into wa_message (provider_message_id, phone, direction, kind, body, status)
     values ($1, $2, 'out', 'text', $3, 'sent')`,
    [`admin:${randomUUID()}`, ticket.phone, body],
  );
  await db().query('update support_ticket set updated_at = now(), last_message = $2 where id = $1', [
    id,
    body,
  ]);

  return { ok: true };
}
