import { auth } from '@/app/firebase';

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Fire a Loops event via the authenticated API route.
 * Failures are logged but do not throw — email is non-critical path.
 */
export async function fireLoopsEvent(
  eventName: string,
  opts?: {
    contactProperties?: Record<string, string | number | boolean>;
    eventProperties?: Record<string, string | number | boolean>;
  }
): Promise<void> {
  const token = await getToken();
  if (!token) return;
  const res = await fetch('/api/loops/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventName, ...opts }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[loops-client] sendEvent failed (HTTP ${res.status}):`, body);
  }
}

/**
 * Update the Loops contact for the current user.
 * Failures are logged but do not throw — email is non-critical path.
 */
export async function updateLoopsContact(
  properties: Record<string, string | number | boolean>
): Promise<void> {
  const token = await getToken();
  if (!token) return;
  const res = await fetch('/api/loops/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(properties),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('[loops-client] updateContact failed:', body);
  }
}
