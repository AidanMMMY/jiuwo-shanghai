import { promises as fs } from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'data');

export type NavItem = { label: string; href: string; labelZh: string };

export type SiteData = {
  name: string;
  nameZh: string;
  tagline: string;
  taglineZh: string;
  intro: string;
  introZh: string;
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
  altZh: string;
};

export type JournalEntry = {
  slug: string;
  title: string;
  titleZh: string;
  date: string;
  cover: string;
  content: string;
  contentZh: string;
  coverIsLandscape?: boolean;
};

export type GalleryPhoto = {
  src: string;
  alt: string;
  altZh: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  titleZh: string;
  subtitle: string;
  subtitleZh: string;
  cover: string;
  photos: GalleryPhoto[];
};

export type MenuItem = {
  name: string;
  nameZh: string;
  price: string;
  description: string;
  descriptionZh: string;
  image?: string;
};

export type MenuCategory = {
  category: string;
  categoryZh: string;
  items: MenuItem[];
};

export type AboutData = {
  hours: string;
  hoursZh: string;
  address: string;
  addressZh: string;
  email: string;
  mapEmbedUrl: string;
  story: string;
  storyZh: string;
};

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDirectory, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

function localizeSite(site: SiteData): SiteData {
  return { ...site, name: site.nameZh, tagline: site.taglineZh, intro: site.introZh, nav: site.nav.map((n) => ({ ...n, label: n.labelZh })) };
}

function localizeHero(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((s) => ({ ...s, alt: s.altZh }));
}

function localizeJournal(entries: JournalEntry[]): JournalEntry[] {
  return entries.map((e) => ({ ...e, title: e.titleZh, content: e.contentZh }));
}

function localizeGallery(albums: GalleryAlbum[]): GalleryAlbum[] {
  return albums.map((a) => ({
    ...a,
    title: a.titleZh,
    subtitle: a.subtitleZh,
    photos: a.photos.map((p) => ({ ...p, alt: p.altZh })),
  }));
}

function localizeMenu(categories: MenuCategory[]): MenuCategory[] {
  return categories.map((c) => ({
    ...c,
    category: c.categoryZh,
    items: c.items.map((i) => ({ ...i, name: i.nameZh, description: i.descriptionZh })),
  }));
}

function localizeAbout(about: AboutData): AboutData {
  return {
    ...about,
    hours: about.hoursZh,
    address: about.addressZh,
    story: about.storyZh,
  };
}

export async function getSiteData(): Promise<SiteData> {
  return readJsonFile<SiteData>('site.json');
}

export async function getSiteDataZh(): Promise<SiteData> {
  const site = await getSiteData();
  return localizeSite(site);
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return readJsonFile<HeroSlide[]>('hero.json');
}

export async function getHeroSlidesZh(): Promise<HeroSlide[]> {
  const slides = await getHeroSlides();
  return localizeHero(slides);
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const entries = await readJsonFile<JournalEntry[]>('updates.json');
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getJournalEntriesZh(): Promise<JournalEntry[]> {
  const entries = await getJournalEntries();
  return localizeJournal(entries);
}

export async function getJournalEntry(slug: string): Promise<JournalEntry | undefined> {
  const entries = await getJournalEntries();
  return entries.find((e) => e.slug === slug);
}

export async function getJournalEntryZh(slug: string): Promise<JournalEntry | undefined> {
  const entries = await getJournalEntriesZh();
  return entries.find((e) => e.slug === slug);
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  return readJsonFile<GalleryAlbum[]>('gallery.json');
}

export async function getGalleryAlbumsZh(): Promise<GalleryAlbum[]> {
  const albums = await getGalleryAlbums();
  return localizeGallery(albums);
}

export async function getGalleryAlbum(id: string): Promise<GalleryAlbum | undefined> {
  const albums = await getGalleryAlbums();
  return albums.find((a) => a.id === id);
}

export async function getGalleryAlbumZh(id: string): Promise<GalleryAlbum | undefined> {
  const albums = await getGalleryAlbumsZh();
  return albums.find((a) => a.id === id);
}

export async function getMenu(): Promise<MenuCategory[]> {
  return readJsonFile<MenuCategory[]>('menu.json');
}

export async function getMenuZh(): Promise<MenuCategory[]> {
  const categories = await getMenu();
  return localizeMenu(categories);
}

export async function getAboutData(): Promise<AboutData> {
  return readJsonFile<AboutData>('about.json');
}

export async function getAboutDataZh(): Promise<AboutData> {
  const about = await getAboutData();
  return localizeAbout(about);
}
