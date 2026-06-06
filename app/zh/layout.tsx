import type { Metadata } from "next";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import ReadingProgress from "@/components/ReadingProgress";
import { getSiteDataZh } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteDataZh();
  return {
    description: site.tagline,
  };
}

export default async function ZhLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteDataZh();

  return (
    <div className="font-sans antialiased flex flex-col min-h-[100dvh]">
      {/* Ambient light layer */}
      <div className="ambient-light" aria-hidden="true">
        <div className="ambient-light-blob" />
      </div>
      <Navbar name={site.name} nav={site.nav} />
      <main className="flex-1 relative z-10">{children}</main>
      <Footer site={site} />
      <BackToTop />
      <ReadingProgress />
    </div>
  );
}
