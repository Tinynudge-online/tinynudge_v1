import { createCheckout, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let decoded: { uid: string; email?: string };
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    console.error('checkout verifyIdToken failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = decoded.uid;
  const email = decoded.email;
  if (!email) {
    return NextResponse.json({ error: 'Token has no email' }, { status: 400 });
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.replace(/[﻿\s]/g, '');
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID?.replace(/[﻿\s]/g, '');

  if (!apiKey || !storeId || !variantId) {
    console.error('Missing LemonSqueezy env vars:', { apiKey: !!apiKey, storeId: !!storeId, variantId: !!variantId });
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  lemonSqueezySetup({ apiKey });

  const { data, error } = await createCheckout(
    storeId,
    variantId,
    {
      checkoutData: {
        email,
        custom: { user_id: userId },
      },
    }
  );

  if (error || !data) {
    console.error('LemonSqueezy checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }

  return NextResponse.json({ url: data.data.attributes.url });
}
