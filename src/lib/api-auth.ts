import { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// Returns the verified Firebase user for the request's Bearer token, or null.
export async function getRequestUser(
  req: NextRequest
): Promise<{ uid: string; email: string | null; name: string | null } | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null, name: (decoded.name as string | undefined) ?? null };
  } catch {
    return null;
  }
}

export async function getRequestUid(req: NextRequest): Promise<string | null> {
  return (await getRequestUser(req))?.uid ?? null;
}

// Validates a client-supplied local date (YYYY-MM-DD). Must be within one day
// of the server's UTC date to cover every timezone without allowing backdating.
export function isPlausibleLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(parsed)) return false;
  const todayUtc = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z').getTime();
  return Math.abs(parsed - todayUtc) <= 86400000;
}
