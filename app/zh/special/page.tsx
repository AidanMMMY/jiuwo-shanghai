import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '特别活动',
  description: '敬请期待。',
};

export default function Page() {
  return (
    <main className="bg-[#0a0a0a] min-h-[100lvh] flex items-center justify-center">
      <div className="text-center px-6">
        <p
          className="text-2xl md:text-3xl text-[#c9a227] tracking-[0.15em] mb-4"
          style={{ fontFamily: 'var(--font-bodoni), Georgia, serif', fontWeight: 700 }}
        >
          Coming Soon
        </p>
        <p className="text-sm text-[#a0a0a0] tracking-wider">
          精彩即将呈现，敬请期待。
        </p>
      </div>
    </main>
  );
}
