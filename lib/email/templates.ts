import type { EmailMessage } from '@/lib/email/provider';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function magicLinkEmail(input: {
  to: string;
  url: string;
  vendorName: string;
  handle: string;
  kind: 'welcome' | 'login';
}): EmailMessage {
  const shopUrl = `https://sikatree.africa/${input.handle}`;
  const subject =
    input.kind === 'welcome' ? 'Your sikatree shop is live' : 'Your sikatree sign-in link';

  const intro =
    input.kind === 'welcome'
      ? `Your shop is live: ${shopUrl}. Open your dashboard to add items and set your prices.`
      : 'Use the link below to open your dashboard.';

  const text = [
    `Hi ${input.vendorName},`,
    '',
    intro,
    '',
    input.url,
    '',
    'The link works once and expires in 15 minutes. If you did not ask for it, ignore this email.',
    '',
    'sikatree',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
      <p style="margin:0 0 18px;font-size:20px;font-weight:600;">sikatree</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Hi ${escapeHtml(input.vendorName)},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">${
        input.kind === 'welcome'
          ? `Your shop is live: <a href="${escapeHtml(shopUrl)}" style="color:#0f6b3f;">${escapeHtml(shopUrl)}</a>. Open your dashboard to add items and set your prices.`
          : 'Use the button below to open your dashboard.'
      }</p>
      <p style="margin:0 0 22px;">
        <a href="${escapeHtml(input.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-size:15px;font-weight:500;">Open dashboard</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#666;">The link works once and expires in 15 minutes. If you did not ask for it, ignore this email.</p>
    </div>
  </body>
</html>`;

  return { to: input.to, subject, text, html };
}
