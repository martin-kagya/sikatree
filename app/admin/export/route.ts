import { isAdmin } from '@/lib/admin-auth';
import { listForAdmin } from '@/lib/waitlist';

export const dynamic = 'force-dynamic';

function cell(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Spreadsheet formula injection guard. Phone numbers start with "+", so they
  // are quoted as text rather than evaluated.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request): Promise<Response> {
  if (!(await isAdmin())) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const filters = {
    q: (url.searchParams.get('q') ?? '').trim(),
    status: url.searchParams.get('status') ?? '',
    type: url.searchParams.get('type') ?? '',
  };

  const rows = await listForAdmin(filters, 5000);

  const header = [
    'position',
    'phone',
    'business_type',
    'business_name',
    'monthly_orders',
    'handle',
    'status',
    'notes',
    'referral_code',
    'referred_by_phone',
    'referred_by_name',
    'joined_at',
  ];

  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        row.position,
        row.phone,
        row.businessType ?? '',
        row.businessName ?? '',
        row.monthlyOrders ?? '',
        row.handle ?? '',
        row.status,
        row.notes ?? '',
        row.referralCode,
        row.referrerPhone ?? '',
        row.referrerName ?? '',
        row.createdAt,
      ]
        .map(cell)
        .join(','),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${lines.join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sikatree-waitlist-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
