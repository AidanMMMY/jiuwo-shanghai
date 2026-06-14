'use client';

import { useRouter, usePathname } from 'next/navigation';
import DarkroomChat from '@/components/DarkroomChat';

export default function DarkroomChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');

  return (
    <DarkroomChat
      mode="fullscreen"
      isZh={isZh}
      onBack={() => router.push(isZh ? '/zh' : '/')}
    />
  );
}
