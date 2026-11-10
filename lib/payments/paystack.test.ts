import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createPaystackProvider } from '@/lib/payments/paystack';

const SECRET = 'sk_test_abc123';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function webhookSignature(body: string, secret = SECRET): string {
  return createHmac('sha512', secret).update(body).digest('hex');
}

function providerWith(response: () => Response, calls: { url: string; init?: RequestInit }[] = []) {
  return createPaystackProvider({
    secretKey: SECRET,
    baseUrl: 'https://api.test',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response();
    },
  });
}

describe('Paystack adapter', () => {
  it('initializes a GHS transaction with the order reference and callback', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const provider = providerWith(
      () =>
        json({
          status: true,
          data: { authorization_url: 'https://checkout.paystack.com/abc', reference: 'ref-1' },
        }),
      calls,
    );

    const result = await provider.initialize({
      reference: 'ref-1',
      amountPesewas: 25_500,
      email: 'kofi@example.com',
      callbackUrl: 'https://sikatree.africa/o/ORD-ABCD/payment-callback',
    });

    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/abc');
    expect(calls[0].url).toBe('https://api.test/transaction/initialize');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      amount: 25_500,
      currency: 'GHS',
      reference: 'ref-1',
      callback_url: 'https://sikatree.africa/o/ORD-ABCD/payment-callback',
    });
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe(`Bearer ${SECRET}`);
  });

  it('verifies a successful payment and reports the fee', async () => {
    const provider = providerWith(() =>
      json({
        status: true,
        data: {
          id: 4242,
          status: 'success',
          reference: 'ref-1',
          amount: 25_500,
          currency: 'GHS',
          channel: 'mobile_money',
          fees: 497,
          paid_at: '2026-11-10T12:00:00.000Z',
        },
      }),
    );

    const verified = await provider.verify('ref-1');
    expect(verified).toMatchObject({
      status: 'success',
      amountPesewas: 25_500,
      currency: 'GHS',
      feesPesewas: 497,
      channel: 'mobile_money',
      providerReference: '4242',
    });
    expect(verified.paidAt).toBe('2026-11-10T12:00:00.000Z');
  });

  it('treats abandoned and failed attempts as not successful', async () => {
    const provider = providerWith(() =>
      json({ status: true, data: { status: 'abandoned', amount: 100, currency: 'GHS' } }),
    );
    expect((await provider.verify('ref-1')).status).toBe('failed');
  });

  it('throws when Paystack rejects the request', async () => {
    const provider = providerWith(() =>
      json({ status: false, message: 'Invalid key' }, 401),
    );
    await expect(provider.verify('ref-1')).rejects.toThrow(/Invalid key/);
  });

  it('accepts only a correct webhook signature', () => {
    const provider = providerWith(() => json({ status: true }));
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } });

    expect(provider.verifyWebhook(body, webhookSignature(body))).toBe(true);
    expect(provider.verifyWebhook(body, webhookSignature(body, 'wrong-secret'))).toBe(false);
    expect(provider.verifyWebhook(body, null)).toBe(false);
    expect(provider.verifyWebhook(body, 'not-hex')).toBe(false);
  });

  it('parses a charge event into a stable event id', () => {
    const provider = providerWith(() => json({ status: true }));
    const body = JSON.stringify({
      event: 'charge.success',
      data: { id: 4242, reference: 'ref-1' },
    });

    expect(provider.parseWebhook(body)).toEqual({
      id: 'charge.success:4242',
      type: 'charge.success',
      reference: 'ref-1',
    });
    expect(provider.parseWebhook('not json')).toBeNull();
  });
});
