import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import ReadingProgress from "@/components/ReadingProgress";
import { getSiteDataZh } from "@/lib/data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
    <div className={`${inter.variable} font-sans antialiased`}>
      {/* Ambient light layer */}
      <div className="ambient-light" aria-hidden="true">
        <div className="ambient-light-blob" />
      </div>
      <Navbar name={site.name} nav={site.nav} />
      <main className="pt-0 min-h-screen relative z-10">{children}</main>
      <Footer site={site} />
      <BackToTop />
      <ReadingProgress />
    </div>
  );
}
