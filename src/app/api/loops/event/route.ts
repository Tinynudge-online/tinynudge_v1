import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { sendLoopsEvent } from '@/lib/loops-server';

type Primitive = string | number | boolean;

// Events the browser may send, and exactly which properties each may carry.
// Anything else is dropped so clients can't set arbitrary Loops contact fields
// (e.g. subscription state) or event data.
const EVENT_RULES: Record<string, { contact: string[]; event: string[] }> = {
  signup: { contact: ['firstName', 'source'], event: [] },
  trial_started: { contact: [], event: [] },
};

function pick(input: unknown, keys: string[]): Record<string, Primitive> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: Record<string, Primitive> = {};
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (['string', 'number', 'boolean'].includes(typeof value)) out[key] = value as Primitive;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let decoded: { email?: string };
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    console.error('loops/event verifyIdToken failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = decoded.email;
  if (!email) {
    return NextResponse.json({ error: 'Token has no email' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { eventName, contactProperties, eventProperties } = body as Record<string, unknown>;

  if (typeof eventName !== 'string' || !eventName) {
    return NextResponse.json({ error: 'eventName is required' }, { status: 400 });
  }
  const rules = EVENT_RULES[eventName];
  if (!rules) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  }

  try {
    await sendLoopsEvent(email, eventName, {
      contactProperties: pick(contactProperties, rules.contact),
      eventProperties: pick(eventProperties, rules.event),
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Loops sendEvent error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
