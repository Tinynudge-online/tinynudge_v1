import { NextRequest } from 'next/server';

export function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}
