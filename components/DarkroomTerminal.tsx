'use client';

import DarkroomChat from '@/components/DarkroomChat';

export default function DarkroomTerminal({ isZh = false }: { isZh?: boolean }) {
  return (
    <section className="px-4 md:px-12 pt-20 pb-4 bg-[#0a0a0a]">
      <div className="mx-auto max-w-4xl">
        <DarkroomChat mode="embedded" isZh={isZh} />
      </div>
    </section>
  );
}
