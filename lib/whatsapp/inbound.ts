import { toE164 } from '@/lib/whatsapp/signature';

export type InboundKind = 'text' | 'button' | 'list' | 'unsupported';

export type InboundMessage = {
  providerMessageId: string;
  from: string;
  kind: InboundKind;
  text: string | null;
  buttonId: string | null;
  receivedAt: Date;
  raw: unknown;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// Meta's webhook envelope: entry[].changes[].value.messages[]. Tolerant on
// purpose, because payloads evolve and an unknown shape must not 500.
export function parseInbound(payload: unknown): InboundMessage[] {
  const root = record(payload);
  if (!root || root.object !== 'whatsapp_business_account') return [];

  const messages: InboundMessage[] = [];

  for (const entry of asArray(root.entry)) {
    const entryRecord = record(entry);
    if (!entryRecord) continue;

    for (const change of asArray(entryRecord.changes)) {
      const value = record(record(change)?.value);
      if (!value) continue;

      for (const raw of asArray(value.messages)) {
        const message = record(raw);
        if (!message) continue;

        const id = typeof message.id === 'string' ? message.id : null;
        const from = typeof message.from === 'string' ? toE164(message.from) : null;
        if (!id || !from) continue;

        const timestamp = Number(message.timestamp);
        const receivedAt = Number.isFinite(timestamp) ? new Date(timestamp * 1000) : new Date();

        let kind: InboundKind = 'unsupported';
        let text: string | null = null;
        let buttonId: string | null = null;
        const type = typeof message.type === 'string' ? message.type : '';

        if (type === 'text') {
          const body = record(message.text)?.body;
          if (typeof body === 'string') {
            kind = 'text';
            text = body.trim();
          }
        } else if (type === 'interactive') {
          const interactive = record(message.interactive);
          const buttonReply = record(interactive?.button_reply);
          const listReply = record(interactive?.list_reply);
          if (buttonReply && typeof buttonReply.id === 'string') {
            kind = 'button';
            buttonId = buttonReply.id;
            text = typeof buttonReply.title === 'string' ? buttonReply.title : null;
          } else if (listReply && typeof listReply.id === 'string') {
            kind = 'list';
            buttonId = listReply.id;
            text = typeof listReply.title === 'string' ? listReply.title : null;
          }
        }

        messages.push({ providerMessageId: id, from, kind, text, buttonId, receivedAt, raw });
      }
    }
  }

  return messages;
}
