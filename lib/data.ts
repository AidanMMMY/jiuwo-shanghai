import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

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
  specialEvent?: {
    enabled: boolean;
    heroFallback: string;
    heroFallbackZh: string;
    hostFallback?: string;
    hostFallbackZh?: string;
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
  coverAspect?: 'wide' | 'square' | 'tall';
  hidden?: boolean;
};

export type GalleryPhoto = {
  src: string;
  alt: string;
  altZh: string;
};

export type FriendSocial = {
  instagram?: string;
  weibo?: string;
  xiaohongshu?: string;
  wechat?: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  titleZh: string;
  subtitle: string;
  subtitleZh: string;
  cover: string;
  photos: GalleryPhoto[];
  category: string;
  categoryZh: string;
  friendSocial?: FriendSocial;
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
  pullQuote: string;
  pullQuoteZh: string;
  heroImage: string;
};

export type EventItem = {
  slug: string;
  title: string;
  titleZh: string;
  label: string;
  labelZh: string;
  hostName?: string;
  date: string;
  dateDisplay: string;
  dateDisplayZh: string;
  description: string;
  descriptionZh: string;
  subtitle: string;
  subtitleZh: string;
  poster: string;
  venue: string;
  venueZh: string;
  rsvpEnabled: boolean;
  retrospective?: string;
  retrospectiveZh?: string;
  retrospectivePhotos?: string[];
};

export type EventItemResolved = EventItem & {
  isUpcoming: boolean;
};

function localizeSite(site: SiteData): SiteData {
  const zh: SiteData = {
    ...site,
    name: site.nameZh,
    tagline: site.taglineZh,
    intro: site.introZh,
    nav: site.nav.map((n) => ({ ...n, label: n.labelZh })),
  };
  if (site.specialEvent) {
    zh.specialEvent = {
      ...site.specialEvent,
      heroFallback: site.specialEvent.heroFallbackZh,
      hostFallback: site.specialEvent.hostFallbackZh,
    };
  }
  return zh;
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
    category: a.categoryZh,
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
    pullQuote: about.pullQuoteZh,
  };
}

function localizeEvent(event: EventItem): EventItem {
  return {
    ...event,
    title: event.titleZh,
    label: event.labelZh,
    dateDisplay: event.dateDisplayZh,
    description: event.descriptionZh,
    subtitle: event.subtitleZh,
    venue: event.venueZh,
    retrospective: event.retrospectiveZh,
  };
}

export async function getSiteData(): Promise<SiteData> {
  return readAndValidateJson('site.json', siteDataSchema);
}

export async function getSiteDataZh(): Promise<SiteData> {
  const site = await getSiteData();
  return localizeSite(site);
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return readAndValidateJson('hero.json', z.array(heroSlideSchema));
}

export async function getHeroSlidesZh(): Promise<HeroSlide[]> {
  const slides = await getHeroSlides();
  return localizeHero(slides);
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const entries = await readAndValidateJson('updates.json', z.array(journalEntrySchema));
  return entries
    .filter((e) => !e.hidden)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  return readAndValidateJson('gallery.json', z.array(galleryAlbumSchema));
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
  return readAndValidateJson('menu.json', z.array(menuCategorySchema));
}

export async function getMenuZh(): Promise<MenuCategory[]> {
  const categories = await getMenu();
  return localizeMenu(categories);
}

export async function getAboutData(): Promise<AboutData> {
  return readAndValidateJson('about.json', aboutDataSchema);
}

export async function getAboutDataZh(): Promise<AboutData> {
  const about = await getAboutData();
  return localizeAbout(about);
}

// ── Event data loaders ──

function isEventUpcoming(eventDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(eventDate + 'T00:00:00');
  return d >= today;
}

export async function getEvents(): Promise<EventItemResolved[]> {
  const data = await readAndValidateJson('events.json', eventsDataSchema);
  return data.events
    .map((e) => ({ ...e, isUpcoming: isEventUpcoming(e.date) }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getEventsZh(): Promise<EventItemResolved[]> {
  const events = await getEvents();
  return events.map((e) => ({ ...localizeEvent(e), isUpcoming: e.isUpcoming }));
}

export async function getUpcomingEvents(): Promise<EventItemResolved[]> {
  const events = await getEvents();
  return events.filter((e) => e.isUpcoming);
}

export async function getUpcomingEventsZh(): Promise<EventItemResolved[]> {
  const events = await getEventsZh();
  return events.filter((e) => e.isUpcoming);
}

export async function getPastEvents(): Promise<EventItemResolved[]> {
  const events = await getEvents();
  return events.filter((e) => !e.isUpcoming);
}

export async function getPastEventsZh(): Promise<EventItemResolved[]> {
  const events = await getEventsZh();
  return events.filter((e) => !e.isUpcoming);
}

export async function getEventBySlug(slug: string): Promise<EventItemResolved | undefined> {
  const events = await getEvents();
  return events.find((e) => e.slug === slug);
}

export async function getEventBySlugZh(slug: string): Promise<EventItemResolved | undefined> {
  const events = await getEventsZh();
  return events.find((e) => e.slug === slug);
}

// ── Zod schemas for runtime validation ──

const navItemSchema = z.object({
  label: z.string(),
  href: z.string(),
  labelZh: z.string(),
});

const siteDataSchema = z.object({
  name: z.string(),
  nameZh: z.string(),
  tagline: z.string(),
  taglineZh: z.string(),
  intro: z.string(),
  introZh: z.string(),
  nav: z.array(navItemSchema),
  social: z.object({
    instagram: z.string().optional(),
    weibo: z.string().optional(),
    xiaohongshu: z.string().optional(),
  }),
  specialEvent: z.object({
    enabled: z.boolean(),
    heroFallback: z.string(),
    heroFallbackZh: z.string(),
    hostFallback: z.string().optional(),
    hostFallbackZh: z.string().optional(),
  }).optional(),
});

const heroSlideSchema = z.object({
  src: z.string(),
  alt: z.string(),
  altZh: z.string(),
});

const journalEntrySchema = z.object({
  slug: z.string(),
  title: z.string(),
  titleZh: z.string(),
  date: z.string(),
  cover: z.string(),
  content: z.string(),
  contentZh: z.string(),
  coverAspect: z.enum(['wide', 'square', 'tall']).optional(),
  hidden: z.boolean().optional(),
});

const galleryPhotoSchema = z.object({
  src: z.string(),
  alt: z.string(),
  altZh: z.string(),
});

const friendSocialSchema = z.object({
  instagram: z.string().optional(),
  weibo: z.string().optional(),
  xiaohongshu: z.string().optional(),
  wechat: z.string().optional(),
});

const galleryAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleZh: z.string(),
  subtitle: z.string(),
  subtitleZh: z.string(),
  cover: z.string(),
  photos: z.array(galleryPhotoSchema),
  category: z.string(),
  categoryZh: z.string(),
  friendSocial: friendSocialSchema.optional(),
});

const menuItemSchema = z.object({
  name: z.string(),
  nameZh: z.string(),
  price: z.string(),
  description: z.string(),
  descriptionZh: z.string(),
  image: z.string().optional(),
});

const menuCategorySchema = z.object({
  category: z.string(),
  categoryZh: z.string(),
  items: z.array(menuItemSchema),
});

const aboutDataSchema = z.object({
  hours: z.string(),
  hoursZh: z.string(),
  address: z.string(),
  addressZh: z.string(),
  email: z.string(),
  mapEmbedUrl: z.string(),
  story: z.string(),
  storyZh: z.string(),
  pullQuote: z.string(),
  pullQuoteZh: z.string(),
  heroImage: z.string(),
});

const eventItemSchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  titleZh: z.string(),
  label: z.string(),
  labelZh: z.string(),
  hostName: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  dateDisplay: z.string(),
  dateDisplayZh: z.string(),
  description: z.string(),
  descriptionZh: z.string(),
  subtitle: z.string(),
  subtitleZh: z.string(),
  poster: z.string(),
  venue: z.string(),
  venueZh: z.string(),
  rsvpEnabled: z.boolean(),
  retrospective: z.string().optional(),
  retrospectiveZh: z.string().optional(),
  retrospectivePhotos: z.array(z.string()).optional(),
});

const eventsDataSchema = z.object({
  events: z.array(eventItemSchema),
});

async function readAndValidateJson<T>(filename: string, schema: z.ZodSchema<T>): Promise<T> {
  const filePath = path.join(dataDirectory, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return schema.parse(parsed);
}
