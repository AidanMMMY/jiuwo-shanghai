import { getSiteData } from '@/lib/data';

export default async function Footer() {
  const site = await getSiteData();

  return (
    <footer className="border-t border-[#222] bg-[#0a0a0a] py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-sm text-[#a0a0a0]">© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <div className="flex gap-6">
          {site.social.instagram && (
            <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
              Instagram
            </a>
          )}
          {site.social.weibo && (
            <a href={site.social.weibo} target="_blank" rel="noopener noreferrer" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
              微博
            </a>
          )}
          {site.social.xiaohongshu && (
            <a href={site.social.xiaohongshu} target="_blank" rel="noopener noreferrer" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
              小红书
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
