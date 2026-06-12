import { LoopsClient } from 'loops';
import { NextRequest, NextResponse } from 'next/server';

const loops = new LoopsClient(process.env.LOOPS_API_KEY!);

export async function POST(req: NextRequest) {
  const { email, eventName, contactProperties, eventProperties } = await req.json();

  if (!email || !eventName) {
    return NextResponse.json({ error: 'email and eventName are required' }, { status: 400 });
  }

  try {
    const result = await loops.sendEvent({
      email,
      eventName,
      ...(contactProperties && { contactProperties }),
      ...(eventProperties && { eventProperties }),
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Loops sendEvent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
