import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = "https://tinynudge.online";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "TinyNudge",
    template: "%s | TinyNudge",
  },
  description:
    "TinyNudge gives busy parents a tiny daily activity — a nudge — to stay close to their children. 50 expert-backed micro-moments, 5-minute connection rituals, streak tracking. Free to start.",
  keywords: [
    "parent child connection app",
    "daily activities for kids",
    "strengthen parent child bond",
    "relationship building app",
    "parenting app",
    "child bonding activities",
    "family connection app",
    "daily nudge app",
    "micro moments parenting",
    "parent engagement app",
  ],
  authors: [{ name: "TinyNudge", url: APP_URL }],
  creator: "TinyNudge",
  publisher: "TinyNudge",
  category: "Parenting",
  applicationName: "TinyNudge",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "TinyNudge",
    title: "TinyNudge — One tap a day keeps the distance away",
    description:
      "Stay close to your child with one tiny daily activity. TinyNudge gives busy parents 50 expert-backed micro-moments to strengthen their bond — no prep, no guilt, just 5 minutes a day.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TinyNudge — daily micro-moments for parents and children",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TinyNudge — One tap a day keeps the distance away",
    description:
      "Stay close to your child with one tiny daily activity. 50 expert-backed nudges, streak tracking, no prep required.",
    images: ["/og-image.png"],
    creator: "@tinynudge",
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
  icons: {
    icon: "/heart-favicon.svg",
    shortcut: "/heart-favicon.svg",
    apple: "/heart-favicon.svg",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: APP_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ec4899",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/561389f5256e00675f218595/script.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZX6KVDYLH0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZX6KVDYLH0');
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
