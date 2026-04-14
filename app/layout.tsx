import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSiteData } from "@/lib/data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteData();
  return {
    title: site.name,
    description: site.tagline,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteData();

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0 min-h-screen">{children}</main>
        <Footer site={site} />
      </body>
    </html>
  );
}
