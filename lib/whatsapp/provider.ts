import type { Outbound } from '@/lib/whatsapp/messages';

export interface Messenger {
  readonly name: string;
  send(to: string, message: Outbound): Promise<void>;
}

// Development and CI: print instead of calling Meta. The whole flow works
// without a WhatsApp Business account.
class ConsoleMessenger implements Messenger {
  readonly name = 'console';

  async send(to: string, message: Outbound): Promise<void> {
    const body =
      message.kind === 'buttons'
        ? `${message.body}\n[${message.buttons.map((button) => button.title).join('] [')}]`
        : message.body;
    console.log(`[wa:out] ${to}\n${body}\n`);
  }
}

class CloudMessenger implements Messenger {
  readonly name = 'cloud';

  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
    private readonly version = 'v21.0',
  ) {}

  async send(to: string, message: Outbound): Promise<void> {
    const payload =
      message.kind === 'text'
        ? { messaging_product: 'whatsapp', to, type: 'text', text: { body: message.body } }
        : {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: message.body },
              action: {
                buttons: message.buttons.map((button) => ({
                  type: 'reply',
                  reply: { id: button.id, title: button.title },
                })),
              },
            },
          };

    const response = await fetch(
      `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`WhatsApp send failed (${response.status}): ${detail.slice(0, 300)}`);
    }
  }
}

let cached: Messenger | null = null;

export function getMessenger(): Messenger {
  if (cached) return cached;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const forced = process.env.WHATSAPP_PROVIDER;

  if (forced === 'cloud' || (!forced && phoneNumberId && accessToken)) {
    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required for the cloud provider',
      );
    }
    cached = new CloudMessenger(phoneNumberId, accessToken, process.env.WHATSAPP_API_VERSION);
  } else {
    cached = new ConsoleMessenger();
  }

  return cached;
}

// Tests inject their own messenger.
export function setMessenger(messenger: Messenger | null): void {
  cached = messenger;
}
