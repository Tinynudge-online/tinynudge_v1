import { LoopsClient, RateLimitExceededError } from 'loops';
import crypto from 'crypto';
import { LOOPS_TRANSACTIONAL_IDS, type LoopsTransactionalKey } from '@/lib/loops-transactional';

export type LoopsContactProperties = {
  firstName?: string;
  currentStreak?: number;
  lastActiveDate?: string;
  lastNudgeId?: string;
  source?: string;
};

type EventProperties = Record<string, string | number | boolean>;

// Children's data must never be sent to Loops (COPPA). Enforced here as a last
// line of defence for every contact/event payload, whatever the caller passes.
const CHILD_DATA_KEYS = new Set(['childName', 'relationshipType']);

function withoutChildData<T extends Record<string, unknown>>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([k]) => !CHILD_DATA_KEYS.has(k))) as T;
}

function getClient(): LoopsClient {
  const key = process.env.LOOPS_API_KEY;
  if (!key) throw new Error('LOOPS_API_KEY environment variable is not set');
  return new LoopsClient(key);
}

// The loops SDK throws RateLimitExceededError on 429 (it has no `status` field).
// The name check covers duplicate module copies where instanceof fails.
function isRateLimitError(err: unknown): boolean {
  return (
    err instanceof RateLimitExceededError ||
    (err instanceof Error && err.name === 'RateLimitExceededError')
  );
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [200, 600, 1500];
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      if (isRateLimitError(err) && i < 2) {
        await new Promise<void>((r) => setTimeout(r, delays[i]));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

/**
 * Create-or-update a Loops contact. Safe to call on every user action —
 * Loops upserts by email.
 */
export async function syncContact(
  email: string,
  properties: LoopsContactProperties | Record<string, string | number | boolean>
): Promise<void> {
  const client = getClient();
  await withRetry(() => client.updateContact({ email, properties: withoutChildData(properties) }));
}

/**
 * Fire a Loops event. Pass `idempotencyKey` when the same logical event could be
 * sent twice (e.g. a retried request); Loops ignores repeats within 24 hours.
 */
export async function sendLoopsEvent(
  email: string,
  eventName: string,
  opts?: {
    contactProperties?: LoopsContactProperties;
    eventProperties?: EventProperties;
    idempotencyKey?: string;
  }
): Promise<void> {
  const client = getClient();
  const idempotencyKey = opts?.idempotencyKey ?? crypto.randomUUID();
  await withRetry(() =>
    client.sendEvent({
      email,
      eventName,
      ...(opts?.contactProperties && { contactProperties: withoutChildData(opts.contactProperties) }),
      ...(opts?.eventProperties && { eventProperties: withoutChildData(opts.eventProperties) }),
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  );
}

/**
 * Send an account or billing email (a Loops transactional email). These reach the
 * user even if they've unsubscribed from marketing emails. Templates are managed by
 * scripts/loops/setup.mjs; `firstName` is always sent and the rest per template.
 */
export async function sendAccountEmail(
  key: LoopsTransactionalKey,
  email: string,
  dataVariables: Record<string, string> = {},
  idempotencyKey?: string
): Promise<void> {
  const client = getClient();
  await withRetry(() =>
    client.sendTransactionalEmail({
      transactionalId: LOOPS_TRANSACTIONAL_IDS[key],
      email,
      dataVariables: withoutChildData(dataVariables),
      ...(idempotencyKey && { headers: { 'Idempotency-Key': idempotencyKey } }),
    })
  );
}
