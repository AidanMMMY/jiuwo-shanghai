import { InstagramIcon, WeiboIcon, XiaohongshuIcon } from './SocialIcons';
import type { SiteData } from '@/lib/data';

export default function Footer({ site }: { site: SiteData }) {
  return (
    <>
      <div className="page-bottom-fade" />
      <footer className="relative border-t border-[#222] bg-[#0a0a0a] py-12 px-6">
      {/* Gold gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/40 to-transparent" />

      <div className="mx-auto max-w-7xl">
        {/* Social icons */}
        <div className="flex justify-center gap-6 mb-10">
          {site.social.instagram && (
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-all duration-300"
            >
              <InstagramIcon className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(201,162,39,0.3)]" />
              <span className="text-xs tracking-wider">Instagram</span>
            </a>
          )}
          {site.social.weibo && (
            <a
              href={site.social.weibo}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-all duration-300"
            >
              <WeiboIcon className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(201,162,39,0.3)]" />
              <span className="text-xs tracking-wider">微博</span>
            </a>
          )}
          {site.social.xiaohongshu && (
            <a
              href={site.social.xiaohongshu}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-all duration-300"
            >
              <XiaohongshuIcon className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(201,162,39,0.3)]" />
              <span className="text-xs tracking-wider">小红书</span>
            </a>
          )}
        </div>

        {/* Tagline + Copyright */}
        <div className="flex flex-col items-center gap-3 pt-8 border-t border-[#1a1a1a]">
          <p className="text-xs text-[#666] tracking-wider italic">
            {site.tagline}
          </p>
          <p className="text-xs text-[#444] tracking-wider">
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </div>
    </footer>
    </>
  );
}
