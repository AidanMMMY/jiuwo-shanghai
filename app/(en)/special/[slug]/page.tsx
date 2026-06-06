import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EventPage from '@/app/components/pages/EventPage';
import { getEventBySlug, getEvents } from '@/lib/data';

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  const description = event.description.slice(0, 160);

  return {
    title: event.title,
    description,
    alternates: { canonical: `/special/${slug}` },
    openGraph: {
      title: event.title,
      description,
      images: [{ url: event.poster, alt: event.title }],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return <EventPage event={event} backHref="/" isZh={false} />;
}
