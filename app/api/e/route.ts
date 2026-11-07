import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';

// First-party funnel events. Small allow-list: anything else is dropped so the
// table cannot be used as a general-purpose log sink.
const EVENT_NAMES = [
  'page_view',
  'scroll_depth',
  'cta_click',
  'form_start',
  'form_submit',
  'form_error',
  'handle_check',
  'whatsapp_click',
  'share_click',
] as const;

const payload = z.object({
  name: z.enum(EVENT_NAMES),
  anonId: z.string().max(64).optional().nullable(),
  path: z.string().max(300).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  props: z.record(z.string(), z.unknown()).optional(),
  utm: z
    .object({
      source: z.string().max(80).optional().nullable(),
      medium: z.string().max(80).optional().nullable(),
      campaign: z.string().max(80).optional().nullable(),
    })
    .optional(),
});

export async function POST(request: Request) {
  // No database-backed rate limit: on the free Workers plan every extra
  // Hyperdrive round-trip doubles the CPU and pushes this endpoint over its
  // 10ms budget. The event allow-list below bounds what can be written, and
  // per-IP throttling belongs at the edge (Cloudflare WAF), not in the Worker.
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const parsed = payload.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const { name, anonId, path, referrer, props, utm } = parsed.data;

  try {
    await query(
      `insert into analytics_event
         (name, anon_id, path, referrer, utm_source, utm_medium, utm_campaign, props)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        name,
        anonId ?? null,
        path ?? null,
        referrer ? referrer.slice(0, 500) : null,
        utm?.source ?? null,
        utm?.medium ?? null,
        utm?.campaign ?? null,
        JSON.stringify(props ?? {}),
      ],
    );
  } catch (error) {
    // Analytics must never break the page or surface a 500 to the browser.
    // Log the fields that identify the failure (message/code/detail), not just
    // the stack, so the cause is visible in the Cloudflare log stream.
    const err = error as { message?: string; code?: string; detail?: string };
    console.error('[analytics] insert failed', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
