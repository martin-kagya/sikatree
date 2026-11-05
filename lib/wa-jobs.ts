import { db } from '@/lib/db';
import { handleInbound } from '@/lib/whatsapp/engine';
import type { InboundMessage } from '@/lib/whatsapp/inbound';

// A small durable job queue for webhook work. The webhook enqueues and answers
// Meta immediately; a worker drains due jobs with SKIP LOCKED. Failures retry
// with exponential backoff instead of being lost.
export type Job = {
  id: string;
  kind: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
};

export async function enqueueInbound(message: InboundMessage): Promise<string> {
  const { rows } = await db().query<{ id: string }>(
    `insert into wa_job (kind, payload) values ('inbound_message', $1) returning id`,
    [JSON.stringify(message)],
  );
  return rows[0].id;
}

export async function claimJobs(limit = 5): Promise<Job[]> {
  const client = await db().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<{
      id: string;
      kind: string;
      payload: unknown;
      attempts: number;
      max_attempts: number;
    }>(
      `select id, kind, payload, attempts, max_attempts
         from wa_job
        where status = 'pending' and run_after <= now()
        order by run_after, created_at
        for update skip locked
        limit $1`,
      [limit],
    );

    if (rows.length) {
      await client.query(
        `update wa_job
            set status = 'running', attempts = attempts + 1, updated_at = now()
          where id = any($1::uuid[])`,
        [rows.map((row) => row.id)],
      );
    }

    await client.query('commit');
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      payload: row.payload,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
    }));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function backoffSeconds(attempts: number): number {
  return Math.min(2 ** Math.max(attempts - 1, 0), 300);
}

async function complete(jobId: string): Promise<void> {
  await db().query("update wa_job set status = 'done', updated_at = now() where id = $1", [jobId]);
}

async function fail(jobId: string, error: string): Promise<void> {
  await db().query(
    "update wa_job set status = 'failed', last_error = $2, updated_at = now() where id = $1",
    [jobId, error.slice(0, 1000)],
  );
}

async function retry(jobId: string, attempts: number, error: string): Promise<void> {
  await db().query(
    `update wa_job
        set status = 'pending',
            run_after = now() + make_interval(secs => $2),
            last_error = $3,
            updated_at = now()
      where id = $1`,
    [jobId, backoffSeconds(attempts), error.slice(0, 1000)],
  );
}

export async function runJob(job: Job): Promise<void> {
  try {
    if (job.kind === 'inbound_message') {
      await handleInbound(job.payload as InboundMessage);
    } else {
      throw new Error(`unknown job kind: ${job.kind}`);
    }
    await complete(job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (job.attempts >= job.maxAttempts) {
      await fail(job.id, message);
      console.error('[jobs] gave up on', job.id, message);
    } else {
      await retry(job.id, job.attempts, message);
    }
  }
}

// Drains whatever is due right now. The webhook calls this after enqueueing so
// messages feel instant; a cron hits the worker route for the backlog.
export async function drainOnce(limit = 5): Promise<number> {
  const jobs = await claimJobs(limit);
  for (const job of jobs) await runJob(job);
  return jobs.length;
}
