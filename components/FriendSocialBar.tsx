'use client';

import { useState, useCallback } from 'react';
import type { FriendSocial } from '@/lib/data';
import { getActiveSocials } from '@/lib/friend-social';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function WeiboIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573h.014zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.579-.18-.405-.649.388-1.031.428-1.923.008-2.557-.786-1.187-2.936-1.123-5.404-.034 0 0-.774.34-.576-.275.381-1.215.324-2.234-.27-2.82-1.344-1.325-4.918.048-7.984 3.065C1.468 10.059 0 12.283 0 14.2c0 3.669 4.709 5.901 9.314 5.901 6.035 0 10.054-3.508 10.054-6.294 0-1.682-1.418-2.635-2.299-2.938l.002-.001zm1.644-3.457c-.553-.653-1.369-.998-2.304-.998-.337 0-.688.045-1.047.14l.036.094c.109.284.17.59.17.9 0 .723-.286 1.399-.806 1.905-.521.507-1.215.783-1.957.783-.147 0-.295-.012-.44-.035l-.057.142c.265.341.629.594 1.043.738.302.104.62.158.945.158.934 0 1.752-.349 2.305-1.003.551-.653.789-1.514.666-2.428l-.027-.204.473-.196zM20.25 4.85c-.938-1.107-2.32-1.69-3.896-1.69-.57 0-1.165.077-1.772.238l.061.16c.185.483.287 1.001.287 1.527 0 1.225-.483 2.371-1.362 3.226-.881.857-2.055 1.325-3.313 1.325-.249 0-.499-.021-.746-.059l-.097.24c.449.578 1.066 1.007 1.768 1.249.512.176 1.051.268 1.601.268 1.576 0 2.959-.588 3.896-1.69.937-1.106 1.343-2.566 1.136-4.112l-.043-.33.48-.352z"/>
    </svg>
  );
}

function XiaohongshuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.505 13.168l-1.932.517.34 3.447-2.23.597-.34-3.447-3.118.835-.34-3.448 3.118-.835-1.07-3.115 2.23-.597 1.07 3.115 1.932-.517.34 3.448z"/>
    </svg>
  );
}

function WechatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03v-.001zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
    </svg>
  );
}

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  instagram: InstagramIcon,
  weibo: WeiboIcon,
  xiaohongshu: XiaohongshuIcon,
  wechat: WechatIcon,
};

function WechatRevealPanel({
  value,
  platformLabel,
  isOpen,
  onClose,
}: {
  value: string;
  platformLabel: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#c9a22733]">
        <div className="mx-auto max-w-md px-4 md:px-8 py-8 text-center">
          {/* Close */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="text-[#a0a0a0] hover:text-[#f5f5f0] text-sm tracking-wider"
            >
              ✕
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <WechatIcon className="text-[#c9a227]" />
          </div>

          {/* Label */}
          <p className="text-xs uppercase tracking-[0.2em] text-[#a0a0a0] mb-4">
            {platformLabel}
          </p>

          {/* ID */}
          <p className="text-2xl text-[#f5f5f0] tracking-wider font-medium mb-2">
            {value}
          </p>

          {/* Hint */}
          <p className="text-xs text-[#666] mt-3">
            Scan or search to add
          </p>
        </div>
      </div>
    </>
  );
}

export default function FriendSocialBar({
  social,
  locale = 'en',
}: {
  social?: FriendSocial;
  locale?: 'en' | 'zh';
}) {
  const [revealedWechat, setRevealedWechat] = useState<string | null>(null);
  const handleClose = useCallback(() => setRevealedWechat(null), []);

  const activeSocials = getActiveSocials(social);
  if (activeSocials.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 mt-4">
        {activeSocials.map(({ platform, value, url }) => {
          const Icon = PLATFORM_ICONS[platform.key];
          const label = locale === 'zh' ? platform.labelZh : platform.label;

          if (url) {
            // Linkable — external link
            return (
              <a
                key={platform.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
              >
                {Icon && <Icon className="text-current" />}
                <span>{label}</span>
                <ExternalLinkIcon className="text-current opacity-60" />
              </a>
            );
          }

          // Non-linkable — reveal on click
          return (
            <button
              key={platform.key}
              onClick={() => setRevealedWechat(value)}
              className="inline-flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
            >
              {Icon && <Icon className="text-current" />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {revealedWechat && (
        <WechatRevealPanel
          value={revealedWechat}
          platformLabel={locale === 'zh' ? '微信' : 'WeChat'}
          isOpen={!!revealedWechat}
          onClose={handleClose}
        />
      )}
    </>
  );
}
