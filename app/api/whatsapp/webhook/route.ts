import { NextResponse, after } from 'next/server';
import { hitRateLimit } from '@/lib/rate-limit';
import { rememberInbound } from '@/lib/whatsapp/engine';
import { parseInbound } from '@/lib/whatsapp/inbound';
import { verifyWhatsappSignature } from '@/lib/whatsapp/signature';
import { drainOnce, enqueueInbound } from '@/lib/wa-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Meta calls this once when the webhook URL is saved.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    console.error('[wa] WHATSAPP_APP_SECRET is not set; rejecting webhook');
    return new NextResponse('Webhook not configured', { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyWhatsappSignature(raw, signature, secret)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad payload', { status: 400 });
  }

  const messages = parseInbound(payload);
  let accepted = 0;

  for (const message of messages) {
    // Per-number throttle (ONB-27). Over the limit, drop quietly: the vendor
    // gets one nudge, not a ban.
    const limit = await hitRateLimit(`wa:in:${message.from}`, 30, 60).catch(() => null);
    if (limit && !limit.allowed) continue;

    const fresh = await rememberInbound(message).catch((error) => {
      console.error('[wa] could not store message', error);
      return false;
    });
    if (!fresh) continue;

    accepted += 1;

    // Answer Meta now, then drain the queue. The message is durable in wa_job,
    // so a crash here is retried by the worker route instead of being lost.
    try {
      await enqueueInbound(message);
    } catch (error) {
      console.error('[wa] could not enqueue', error);
      continue;
    }

    after(() => {
      drainOnce().catch((error) => console.error('[wa] drain failed', error));
    });
  }

  return NextResponse.json({ received: accepted });
}
