import { MetadataRoute } from 'next';
import { getJournalEntries, getGalleryAlbums, getEvents } from '@/lib/data';

const BASE_URL = 'https://jiuwoshanghai.net';

const STATIC_ROUTES = ['', '/about', '/menu', '/gallery', '/guestbook', '/special'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, albums, events] = await Promise.all([
    getJournalEntries(),
    getGalleryAlbums(),
    getEvents(),
  ]);

  const pages: MetadataRoute.Sitemap = [];

  // Static EN pages
  for (const route of STATIC_ROUTES) {
    pages.push({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'daily' : 'weekly',
      priority: route === '' ? 1.0 : 0.8,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh${route}`,
        },
      },
    });
  }

  // Static ZH pages
  for (const route of STATIC_ROUTES) {
    pages.push({
      url: `${BASE_URL}/zh${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'daily' : 'weekly',
      priority: route === '' ? 0.9 : 0.7,
      alternates: {
        languages: {
          'en': `${BASE_URL}${route}`,
        },
      },
    });
  }

  // Journal entries
  for (const entry of entries) {
    pages.push({
      url: `${BASE_URL}/updates/${entry.slug}`,
      lastModified: new Date(entry.date),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh/updates/${entry.slug}`,
        },
      },
    });
  }

  // Gallery albums
  for (const album of albums) {
    pages.push({
      url: `${BASE_URL}/gallery/${album.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh/gallery/${album.id}`,
        },
      },
    });
  }

  // Special event pages
  for (const event of events) {
    pages.push({
      url: `${BASE_URL}/special/${event.slug}`,
      lastModified: new Date(event.date),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh/special/${event.slug}`,
        },
      },
    });
  }

  return pages;
}
