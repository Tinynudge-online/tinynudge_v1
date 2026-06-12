import { createCheckout, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, userId } = await req.json();

  if (!email || !userId) {
    return NextResponse.json({ error: 'email and userId are required' }, { status: 400 });
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY!.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!.replace(/[﻿\s]/g, '');
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID!.replace(/[﻿\s]/g, '');

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
