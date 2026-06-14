import type { Metadata, Viewport } from "next";
import { Inter, Bodoni_Moda, Space_Mono, Share_Tech_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import OrientLock from "@/components/OrientLock";
import "./globals.css";
import "./darkroom-portal.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  weight: ["400", "700"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  weight: ["400"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://jiuwoshanghai.net"),
  title: {
    template: "%s | JIUWO",
    default: "JIUWO — Shanghai Wine & Cocktail Bar",
  },
  description:
    "JIUWO is a queer-friendly cocktail bar on Julu Road in Shanghai. Natural wines, craft cocktails, rock oolong tea, and a welcoming space for everyone. Open Tue–Sun 7pm–2am.",
  keywords: [
    "Shanghai bar",
    "cocktail bar Shanghai",
    "Julu Road",
    "wine bar",
    "natural wine",
    "Shanghai nightlife",
    "JIUWO",
    "queer friendly",
    "queer friendly bar Shanghai",
    "gay bar Shanghai",
    "LGBTQ bar Shanghai",
    "LGBT friendly bar",
    "巨鹿路酒吧",
    "上海酒吧",
  ],
  authors: [{ name: "JIUWO" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "JIUWO",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "JIUWO — Shanghai Cocktail Bar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jiuwoshanghai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    languages: {
      'en': 'https://jiuwoshanghai.net',
      'zh-Hans': 'https://jiuwoshanghai.net/zh',
    },
  },
  icons: {
    icon: "/images/logo-for-light.png",
    apple: "/images/logo-for-light.png",
  },
  appleWebApp: {
    capable: true,
    title: "JIUWO",
    statusBarStyle: "black",
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bodoni.variable} ${spaceMono.variable} ${shareTechMono.variable} font-sans antialiased`}>
        <OrientLock />
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
