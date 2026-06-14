'use client';

import { useRouter } from 'next/navigation';
import DarkroomChat from '@/components/DarkroomChat';

export default function DarkroomChatPageZh() {
  const router = useRouter();

  return (
    <DarkroomChat
      mode="fullscreen"
      isZh={true}
      onBack={() => router.push('/zh')}
    />
  );
}
