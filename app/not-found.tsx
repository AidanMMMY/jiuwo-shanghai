import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-6xl font-bold text-[#c9a227]"
          style={{ fontFamily: 'var(--font-bodoni), Georgia, serif' }}
        >
          404
        </h1>
        <p className="text-sm text-[#a0a0a0] tracking-wider">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-4 px-6 py-2.5 border border-[#c9a227]/50 text-[#c9a227] text-xs tracking-[0.2em] rounded-full hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors"
        >
          GO HOME
        </Link>
      </div>
    </div>
  );
}
