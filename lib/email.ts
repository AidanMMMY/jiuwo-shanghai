import { Resend } from 'resend';
import type { GuestbookEntryRaw } from './guestbook';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    return null;
  }
  return new Resend(apiKey);
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function stampEmoji(stamp: string): string {
  const map: Record<string, string> = {
    monkey: '🐵',
    pig: '🐷',
    wolf: '🐺',
    dog: '🐶',
    bear: '🐻',
  };
  return map[stamp] || '✦';
}

export async function sendGuestbookNotification(entry: GuestbookEntryRaw): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.log('[guestbook] Email skipped: RESEND_API_KEY not set');
    return;
  }

  const adminKey = process.env.GUESTBOOK_ADMIN_KEY || '';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3001';

  const relativeTime = formatRelativeTime(entry.created_at);
  const ipShort = entry.ip_hash.slice(-8);
  const adminLink = `${baseUrl}/admin/guestbook?id=${entry.id}&key=${adminKey}`;

  const subject = `New stamp in guestbook — ${entry.name}`;

  const plainText = `
New guestbook entry

Name: ${entry.name}
Message: ${entry.message}
Stamp: ${stampEmoji(entry.stamp)} ${entry.stamp}
Time: ${relativeTime}
IP hash (last 8): ${ipShort}

Admin: ${adminLink}
`.trim();

  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 480px; color: #0a0a0a;">
  <h2 style="color: #c9a227; font-weight: 500;">New stamp in guestbook</h2>
  <p style="font-size: 18px; margin: 16px 0; color: #0a0a0a;"><strong>${entry.name}</strong></p>
  <p style="font-size: 16px; font-style: italic; color: #333; border-left: 2px solid #c9a227; padding-left: 12px;">${entry.message}</p>
  <p style="margin-top: 12px; color: #666;">Stamp: ${stampEmoji(entry.stamp)} ${entry.stamp} · ${relativeTime}</p>
  <p style="margin-top: 8px; font-size: 12px; color: #999;">IP hash: …${ipShort}</p>
  <p style="margin-top: 20px;">
    <a href="${adminLink}" style="color: #c9a227; text-decoration: underline;">View in admin →</a>
  </p>
</div>
`.trim();

  try {
    await resend.emails.send({
      from: 'JIUWO <noreply@jiuwoshanghai.net>',
      to: 'aidan@jiuwoshanghai.net',
      subject,
      text: plainText,
      html,
    });
    console.log(`[guestbook] Email sent for "${entry.name}" (id=${entry.id})`);
  } catch (err) {
    console.error('[guestbook] Resend error:', err);
    // don't throw, entry already saved
  }
}
