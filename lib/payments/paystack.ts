import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  InitializedPayment,
  PaymentInitialization,
  PaymentProvider,
  PaymentWebhookEvent,
  VerifiedPayment,
} from '@/lib/payments/provider';

const DEFAULT_BASE_URL = 'https://api.paystack.co';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type PaystackEnvelope<T> = {
  status: boolean;
  message?: string;
  data?: T;
};

type InitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type VerifyData = {
  id?: number | string;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string | null;
  fees?: number;
  paid_at?: string | null;
};

function mapStatus(raw: string | undefined): VerifiedPayment['status'] {
  if (raw === 'success') return 'success';
  if (raw === 'failed' || raw === 'abandoned' || raw === 'reversed') return 'failed';
  return 'pending';
}

export function createPaystackProvider(options: {
  secretKey: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}): PaymentProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${options.secretKey}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let body: PaystackEnvelope<T> | null = null;
    try {
      body = text ? (JSON.parse(text) as PaystackEnvelope<T>) : null;
    } catch {
      /* the message below carries the raw body */
    }
    if (!response.ok || !body?.status || !body.data) {
      const message = body?.message ?? text.slice(0, 200) ?? '';
      throw new Error(`Paystack ${path} failed (${response.status}): ${message}`);
    }
    return body.data;
  }

  return {
    name: 'paystack',

    async initialize(input: PaymentInitialization): Promise<InitializedPayment> {
      const data = await call<InitializeData>('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: input.email,
          amount: input.amountPesewas,
          currency: 'GHS',
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        }),
      });
      return { reference: data.reference, authorizationUrl: data.authorization_url };
    },

    async verify(reference: string): Promise<VerifiedPayment> {
      const data = await call<VerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
      return {
        reference: data.reference ?? reference,
        status: mapStatus(data.status),
        amountPesewas: Number(data.amount ?? 0),
        currency: data.currency ?? '',
        channel: data.channel ?? null,
        feesPesewas: Number(data.fees ?? 0),
        providerReference: data.id == null ? null : String(data.id),
        paidAt: data.paid_at ?? null,
      };
    },

    verifyWebhook(rawBody: string, signature: string | null): boolean {
      if (!signature) return false;
      const expected = createHmac('sha512', options.secretKey).update(rawBody).digest('hex');
      const given = signature.trim().toLowerCase();
      if (given.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    },

    parseWebhook(rawBody: string): PaymentWebhookEvent | null {
      let body: { event?: unknown; data?: { id?: unknown; reference?: unknown } };
      try {
        body = JSON.parse(rawBody);
      } catch {
        return null;
      }
      if (typeof body.event !== 'string') return null;
      const data = body.data ?? {};
      const reference = typeof data.reference === 'string' ? data.reference : null;
      const identity = data.id == null ? reference : String(data.id);
      if (!identity) return null;
      return { id: `${body.event}:${identity}`, type: body.event, reference };
    },
  };
}

// The app is in test mode until a live key replaces the test key; the adapter
// behaves the same either way.
export function paystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

export function paymentsEnabled(): boolean {
  return paystackSecretKey() !== null;
}

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider | null {
  const secretKey = paystackSecretKey();
  if (!secretKey) return null;
  if (!cached) cached = createPaystackProvider({ secretKey });
  return cached;
}
