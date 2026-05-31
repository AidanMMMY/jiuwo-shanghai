import { InstagramIcon, WeiboIcon, XiaohongshuIcon } from './SocialIcons';
import type { SiteData } from '@/lib/data';

export default function Footer({ site }: { site: SiteData }) {
  return (
    <footer className="relative border-t border-[#222] bg-[#0a0a0a] py-16 px-6">
      {/* Gold gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/40 to-transparent" />

      <div className="mx-auto max-w-7xl">
        {/* Top section: Brand + Tagline */}
        <div className="text-center mb-12">
          <p className="text-2xl md:text-3xl font-medium tracking-[0.1em] text-[#f5f5f0] mb-3">
            {site.name}
          </p>
          <p className="text-sm tracking-wider text-[#a0a0a0] italic">
            {site.tagline}
          </p>
        </div>

        {/* Middle section: Social icons */}
        <div className="flex justify-center gap-6 mb-12">
          {site.social.instagram && (
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-colors duration-300"
            >
              <InstagramIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs tracking-wider">Instagram</span>
            </a>
          )}
          {site.social.weibo && (
            <a
              href={site.social.weibo}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-colors duration-300"
            >
              <WeiboIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs tracking-wider">微博</span>
            </a>
          )}
          {site.social.xiaohongshu && (
            <a
              href={site.social.xiaohongshu}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-colors duration-300"
            >
              <XiaohongshuIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs tracking-wider">小红书</span>
            </a>
          )}
        </div>

        {/* Bottom section: Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[#1a1a1a]">
          <p className="text-xs text-[#666] tracking-wider">
            © {new Date().getFullYear()} {site.name}
          </p>
          <p className="text-xs text-[#444] tracking-wider">
            Drink on me, the stars are watching
          </p>
        </div>
      </div>
    </footer>
  );
}
