import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Sessions — AI Strength Coach",
  description: "Your personal AI-powered strength coach. Smart workout planning based on your real training history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
