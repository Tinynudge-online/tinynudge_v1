import { LoopsClient } from 'loops';
import { NextRequest, NextResponse } from 'next/server';

const loops = new LoopsClient(process.env.LOOPS_API_KEY!);

export async function POST(req: NextRequest) {
  const { email, firstName, source, ...rest } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  try {
    // updateContact is an upsert — safe to call for both new and existing contacts
    const result = await loops.updateContact({
      email,
      properties: { firstName, source, ...rest },
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Loops updateContact error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
