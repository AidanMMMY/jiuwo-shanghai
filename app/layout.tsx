import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nameless Bar",
  description: "The night starts here.",
  icons: {
    icon: "/images/logo-for-light.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function apply(){var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var href=dark?'/images/logo-for-dark.png':'/images/logo-for-light.png';document.querySelectorAll('link[rel="icon"]').forEach(function(el){el.parentNode.removeChild(el);});var link=document.createElement('link');link.rel='icon';link.href=href;document.head.appendChild(link);}apply();var mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener?mq.addEventListener('change',apply):mq.addListener(apply);})();`,
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
