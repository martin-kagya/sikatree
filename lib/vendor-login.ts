import { getEmailProvider, type EmailProvider } from '@/lib/email/provider';
import { magicLinkEmail } from '@/lib/email/templates';
import { createLoginLink } from '@/lib/login-links';
import { query } from '@/lib/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EmailLoginResult = { configured: boolean; sent: boolean };

// Sends a sign-in link when the email belongs to a vendor. The caller shows the
// same confirmation either way, so this cannot be used to enumerate accounts.
export async function requestEmailLogin(
  rawEmail: string,
  options: { provider?: EmailProvider | null } = {},
): Promise<EmailLoginResult> {
  const provider = options.provider === undefined ? getEmailProvider() : options.provider;
  if (!provider) return { configured: false, sent: false };

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { configured: true, sent: false };

  const rows = await query<{ id: string; name: string; handle: string }>(
    `select id, name, handle from vendors where lower(email) = $1 limit 1`,
    [email],
  );
  const vendor = rows[0];
  if (!vendor) return { configured: true, sent: false };

  const { url } = await createLoginLink(vendor.id);
  await provider.send(
    magicLinkEmail({
      to: email,
      url,
      vendorName: vendor.name,
      handle: vendor.handle,
      kind: 'login',
    }),
  );

  return { configured: true, sent: true };
}
