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
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TinyNudge",
    statusBarStyle: "default",
  },
  alternates: {
    canonical: APP_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ec4899",
  // Draw under the notch / home indicator; page.tsx pads with env(safe-area-inset-*).
  viewportFit: "cover",
};

// The cookie banner is website chrome: skip it inside the iOS app (user agent
// "TinyNudgeApp/ios") and the Android TWA (?source=twa, the TWA referrer, or the
// per-tab flag set by src/lib/app-context.ts).
//
// The banner is injected dynamically, which doesn't block hydration, so every
// analytics script waits for it: window.__tnConsentReady resolves once
// CookieYes has run (or right away in the apps, which have no banner). gtag
// below and Firebase Analytics (src/app/firebase.js) only start after that, so
// CookieYes's consent defaults and script blocking are always in place first.
const COOKIEYES_SRC =
  "https://cdn-cookieyes.com/client_data/561389f5256e00675f218595/script.js";
const cookieBannerLoader = `
(function () {
  var done;
  window.__tnConsentReady = new Promise(function (resolve) { done = resolve; });
  try {
    var twa = /[?&]source=twa(&|$)/.test(location.search || "") ||
      (document.referrer || "").indexOf("android-app://online.tinynudge.app") === 0;
    try {
      if (sessionStorage.getItem("tn_app_ctx") === "android-twa") twa = true;
      // Record it on whatever page the app opened (deep links from emails land
      // on any path), so later navigations without the referrer stay in app mode.
      else if (twa) sessionStorage.setItem("tn_app_ctx", "android-twa");
    } catch (e) {}
    var app = twa || (navigator.userAgent || "").indexOf("TinyNudgeApp") !== -1;
    // The apps have no consent banner, so no analytics run there: resolve false.
    if (app) { done(false); return; }
    var s = document.createElement("script");
    s.id = "cookieyes";
    s.src = ${JSON.stringify(COOKIEYES_SRC)};
    s.async = false;
    // On a CDN failure there is no banner to wait for; still never load
    // analytics before CookieYes had its chance to run.
    s.onload = s.onerror = function () { done(); };
    document.head.appendChild(s);
  } catch (e) { done(); }
})();
`;
const GA_ID = "G-ZX6KVDYLH0";
const analyticsLoader = `
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  (window.__tnConsentReady || Promise.resolve()).then(function (allowed) {
    if (allowed === false) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=${GA_ID}";
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", "${GA_ID}");
  });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="cookieyes-loader" strategy="beforeInteractive">
          {cookieBannerLoader}
        </Script>
        <Script id="google-analytics" strategy="afterInteractive">
          {analyticsLoader}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
