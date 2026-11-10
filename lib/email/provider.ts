// Outbound email, kept behind a tiny interface so the app can run locally with
// no account and switch to a real sender in production. Only the magic link is
// sent today; receipts and order updates route through the same provider later.

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || 'sikatree <hello@sikatree.africa>';
}

export const consoleEmailProvider: EmailProvider = {
  name: 'console',
  async send(message) {
    console.log(
      `[email:out] ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`,
    );
  },
};

export function createResendProvider(options: {
  apiKey: string;
  from?: string;
  fetchImpl?: FetchLike;
}): EmailProvider {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));

  return {
    name: 'resend',
    async send(message) {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from ?? emailFrom(),
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Resend send failed (${response.status}): ${detail.slice(0, 200)}`);
      }
    },
  };
}

// Local development and tests use the console sender; production refuses to
// start silently without a key rather than logging sign-in links.
export function getEmailProvider(): EmailProvider | null {
  const key = process.env.RESEND_API_KEY?.trim();
  const forced = process.env.EMAIL_PROVIDER?.trim();
  const production = process.env.NODE_ENV === 'production';

  if (forced === 'console' || (!key && !production)) return consoleEmailProvider;
  if (!key) return null;
  return createResendProvider({ apiKey: key });
}

export function emailEnabled(): boolean {
  return getEmailProvider() !== null;
}
