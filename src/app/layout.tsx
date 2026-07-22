import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Gym Sessions — AI Strength Coach",
  applicationName: "Gym Sessions",
  description: "Your personal AI-powered strength coach. Smart workout planning based on your real training history.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gym Sessions",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/icon-192.png?v=3", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png?v=3", type: "image/png", sizes: "512x512" },
      { url: "/icon-1024.png?v=3", type: "image/png", sizes: "1024x1024" },
    ],
    shortcut: [{ url: "/favicon.ico?v=3" }],
    apple: [
      { url: "/apple-touch-icon-512.png?v=3", type: "image/png", sizes: "512x512" },
      { url: "/apple-touch-icon.png?v=3", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="1024x1024" href="/icon-1024.png?v=3" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" sizes="512x512" href="/apple-touch-icon-512.png?v=3" />
        <link rel="apple-touch-icon-precomposed" sizes="512x512" href="/apple-touch-icon-512.png?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
