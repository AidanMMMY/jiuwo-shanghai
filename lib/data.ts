import { promises as fs } from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'data');

export type NavItem = { label: string; href: string };

export type SiteData = {
  name: string;
  tagline: string;
  nav: NavItem[];
  social: {
    instagram?: string;
    weibo?: string;
    xiaohongshu?: string;
  };
};

export type HeroSlide = {
  src: string;
  alt: string;
};

export type JournalEntry = {
  slug: string;
  title: string;
  date: string;
  cover: string;
  content: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  cover: string;
  photos: { src: string; alt: string }[];
};

export type MenuItem = {
  name: string;
  price: string;
  description: string;
};

export type MenuCategory = {
  category: string;
  items: MenuItem[];
};

export type AboutData = {
  hours: string;
  address: string;
  phone: string;
  mapEmbedUrl: string;
  story: string;
};

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDirectory, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function getSiteData(): Promise<SiteData> {
  return readJsonFile<SiteData>('site.json');
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return readJsonFile<HeroSlide[]>('hero.json');
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const entries = await readJsonFile<JournalEntry[]>('journal.json');
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getJournalEntry(slug: string): Promise<JournalEntry | undefined> {
  const entries = await getJournalEntries();
  return entries.find((e) => e.slug === slug);
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  return readJsonFile<GalleryAlbum[]>('gallery.json');
}

export async function getGalleryAlbum(id: string): Promise<GalleryAlbum | undefined> {
  const albums = await getGalleryAlbums();
  return albums.find((a) => a.id === id);
}

export async function getMenu(): Promise<MenuCategory[]> {
  return readJsonFile<MenuCategory[]>('menu.json');
}

export async function getAboutData(): Promise<AboutData> {
  return readJsonFile<AboutData>('about.json');
}
