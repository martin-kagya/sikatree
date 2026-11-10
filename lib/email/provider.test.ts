import { describe, expect, it } from 'vitest';
import { createResendProvider, emailFrom } from '@/lib/email/provider';
import { magicLinkEmail } from '@/lib/email/templates';

describe('email templates', () => {
  const message = magicLinkEmail({
    to: 'ama@example.com',
    url: 'https://sikatree.africa/auth/verify?token=abc',
    vendorName: 'Ama <Glow> & Co',
    handle: 'amasglow',
    kind: 'welcome',
  });

  it('addresses the vendor and includes the shop and sign-in link', () => {
    expect(message.to).toBe('ama@example.com');
    expect(message.subject).toContain('live');
    expect(message.text).toContain('https://sikatree.africa/amasglow');
    expect(message.text).toContain('https://sikatree.africa/auth/verify?token=abc');
  });

  it('escapes vendor input in the html', () => {
    expect(message.html).toContain('Ama &lt;Glow&gt; &amp; Co');
    expect(message.html).not.toContain('Ama <Glow>');
  });

  it('uses a sign-in subject for login links', () => {
    const login = magicLinkEmail({
      to: 'ama@example.com',
      url: 'https://x',
      vendorName: 'Ama',
      handle: 'amasglow',
      kind: 'login',
    });
    expect(login.subject).toBe('Your sikatree sign-in link');
  });
});

describe('Resend provider', () => {
  it('posts the message to the Resend API', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const provider = createResendProvider({
      apiKey: 're_test',
      from: 'sikatree <hello@sikatree.africa>',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ id: 'mail_1' }), { status: 200 });
      },
    });

    await provider.send({
      to: 'ama@example.com',
      subject: 'Hello',
      text: 'Body',
      html: '<p>Body</p>',
    });

    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init?.method).toBe('POST');
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe('Bearer re_test');
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      from: 'sikatree <hello@sikatree.africa>',
      to: ['ama@example.com'],
      subject: 'Hello',
      text: 'Body',
      html: '<p>Body</p>',
    });
  });

  it('throws when Resend rejects the send', async () => {
    const provider = createResendProvider({
      apiKey: 're_test',
      fetchImpl: async () => new Response('domain not verified', { status: 403 }),
    });

    await expect(
      provider.send({ to: 'a@b.co', subject: 'x', text: 'x', html: 'x' }),
    ).rejects.toThrow(/403/);
  });

  it('defaults the sender to the brand address', () => {
    expect(emailFrom()).toContain('@');
  });
});
