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

export const metadata: Metadata = {
  title: "无名酒吧",
  description: "今夜，从这里开始",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteData();

  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
