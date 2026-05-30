import { NextRequest, NextResponse } from 'next/server';
import { hashIp, getLikeCount, hasLiked, toggleLike, ensureLikesTable } from '@/lib/likes';

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

// GET — Fetch like count and user's like status
export async function GET(req: NextRequest) {
  try {
    await ensureLikesTable();
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get('type');
    const targetId = searchParams.get('id');

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);

    const [count, liked] = await Promise.all([
      getLikeCount(targetType, targetId),
      hasLiked(ipHash, targetType, targetId),
    ]);

    return NextResponse.json({ count, liked });
  } catch (error: unknown) {
    console.error('Likes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Toggle like
export async function POST(req: NextRequest) {
  try {
    await ensureLikesTable();
    const body = await req.json();
    const { targetType, targetId } = body;

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Missing targetType or targetId' }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);

    const result = await toggleLike(ipHash, targetType, targetId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Likes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
