import { NextRequest, NextResponse } from 'next/server';
import {
  ALLOWED_STAMPS,
  hashIp,
  createEntry,
  recentCountForIp,
  deleteEntry,
  getEntryById,
  type StampId,
} from '@/lib/guestbook';
import { sendGuestbookNotification } from '@/lib/email';

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

function validateEmail(email: string): boolean {
  if (!email || email.trim().length === 0) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST — Create a new entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, message, stamp, email, website } = body;

    // Honeypot check
    if (website && typeof website === 'string' && website.length > 0) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 30) {
      return NextResponse.json({ error: 'Name must be 1-30 characters' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.trim().length > 140) {
      return NextResponse.json({ error: 'Message must be 1-140 characters' }, { status: 400 });
    }
    if (!stamp || !ALLOWED_STAMPS.includes(stamp)) {
      return NextResponse.json({ error: 'Invalid stamp' }, { status: 400 });
    }
    if (email && !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // IP rate limit
    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const recentCount = await recentCountForIp(ipHash, 60);
    if (recentCount >= 5) {
      return NextResponse.json(
        { error: "You've left a few stamps already — try again in a bit." },
        { status: 429 }
      );
    }

    // Insert
    const entry = await createEntry({
      name: name.trim(),
      message: message.trim(),
      stamp: stamp as StampId,
      email: email?.trim(),
      ipHash,
    });

    // Fire-and-forget email
    const fullEntry = await getEntryById(entry.id);
    if (fullEntry) {
      sendGuestbookNotification(fullEntry).catch(() => {});
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error('Guestbook POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — Admin only
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const key = searchParams.get('key');

    if (!id || !key) {
      return NextResponse.json({ error: 'Missing id or key' }, { status: 400 });
    }

    const adminKey = process.env.GUESTBOOK_ADMIN_KEY;
    if (!adminKey || key !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await deleteEntry(Number(id));
    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Guestbook DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
