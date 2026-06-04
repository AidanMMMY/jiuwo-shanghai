import { NextRequest, NextResponse } from 'next/server';
import { hashIp, createRsvpEntry, listRsvpEntries, recentCountForRsvpIp } from '@/lib/rsvp';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

// GET — Fetch RSVP list for an event
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventSlug = searchParams.get('event') || 'event-20260605';
    const entries = await listRsvpEntries(eventSlug);
    return NextResponse.json({ entries });
  } catch (error: unknown) {
    console.error('RSVP GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — Create a new RSVP entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, eventSlug = 'event-20260605' } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
      return NextResponse.json({ error: 'Name must be 1-50 characters' }, { status: 400 });
    }

    // IP rate limit
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const recentCount = await recentCountForRsvpIp(ipHash, 60);
    if (recentCount >= 5) {
      return NextResponse.json(
        { error: "You've RSVP'd a few times already — try again in a bit." },
        { status: 429 }
      );
    }

    const entry = await createRsvpEntry({
      name: name.trim(),
      eventSlug,
      ipHash,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error('RSVP POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
