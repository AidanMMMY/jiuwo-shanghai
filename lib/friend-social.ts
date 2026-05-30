import type { FriendSocial } from './data';

export type SocialPlatform = {
  key: keyof FriendSocial;
  label: string;
  labelZh: string;
  isLinkable: boolean;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: 'instagram', label: 'Instagram', labelZh: 'Instagram', isLinkable: true },
  { key: 'weibo', label: 'Weibo', labelZh: '微博', isLinkable: true },
  { key: 'xiaohongshu', label: 'Xiaohongshu', labelZh: '小红书', isLinkable: true },
  { key: 'wechat', label: 'WeChat', labelZh: '微信', isLinkable: false },
];

export function getSocialUrl(platform: string, value: string): string | null {
  if (!value) return null;
  if (value.startsWith('http')) return value;

  const handle = value.replace(/^@/, '');

  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'weibo':
      return `https://weibo.com/${handle}`;
    case 'xiaohongshu':
      // Xiaohongshu requires full URL — if no http, treat as search link
      return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(handle)}`;
    case 'wechat':
      return null;
    default:
      return null;
  }
}

export function getActiveSocials(social?: FriendSocial): Array<{ platform: SocialPlatform; value: string; url: string | null }> {
  if (!social) return [];

  return SOCIAL_PLATFORMS
    .map((platform) => {
      const value = social[platform.key];
      if (!value) return null;
      return {
        platform,
        value,
        url: getSocialUrl(platform.key, value),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
