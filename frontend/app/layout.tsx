import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Keeps the browser chrome tinted to match the brand on mobile
  themeColor: "#7C3AED",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://riffmax.ai"),
  title: {
    default: "Riffmax AI — Website Riffing Powered by Claude",
    template: "%s · Riffmax AI",
  },
  description:
    "Tell Riffmax AI what you want to build, paste a site you admire, and get an original multi-page website in seconds. Powered by Claude.",
  keywords: [
    "AI website builder",
    "Claude AI",
    "Riffmax",
    "multi-page website generator",
    "website riffing",
    "AI design",
  ],
  authors: [{ name: "Riffmax AI" }],
  openGraph: {
    type: "website",
    title: "Riffmax AI — Website Riffing Powered by Claude",
    description:
      "Riff off any site you admire and get an original multi-page website, ready to ship.",
    siteName: "Riffmax AI",
    url: "https://riffmax.ai",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Riffmax AI — Website Riffing Powered by Claude",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Riffmax AI — Website Riffing Powered by Claude",
    description:
      "Riff off any site you admire and get an original multi-page website, ready to ship.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <Providers>
          <SiteHeader />
          <div className="flex-1 flex flex-col">{children}</div>
          <SiteFooter />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            theme="system"
          />
        </Providers>
      </body>
    </html>
  );
}
