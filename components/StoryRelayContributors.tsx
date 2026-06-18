'use client';

import { useState } from 'react';

interface Contributor {
  name: string;
  segments: number[];
}

export function StoryRelayContributors({ contributors, isMobile, isZh }: { contributors: Contributor[]; isMobile?: boolean; isZh?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const title = isZh ? '贡献者' : 'Contributors';

  if (isMobile) {
    return (
      <div className="mt-8 border-t border-[#2a2a2a] pt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-3 text-xs uppercase tracking-widest text-[#c9a227]"
        >
          {title} {expanded ? '▲' : '▼'}
        </button>
        {expanded && (
          <div className="space-y-3">
            {contributors.map((c) => (
              <div key={c.name} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#c9a227]" />
                <div>
                  <div className="text-sm text-[#f5f5f0]">{c.name}</div>
                  <div className="text-xs text-[#888]">段 {c.segments.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
      <div className="mb-4 text-xs uppercase tracking-widest text-[#c9a227]">{title}</div>
      <div className="space-y-3">
        {contributors.map((c) => (
          <div key={c.name} className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#c9a227]" />
            <div>
              <div className="text-sm text-[#f5f5f0]">{c.name}</div>
              <div className="text-xs text-[#888]">段 {c.segments.join(', ')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
