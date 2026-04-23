import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://discord-role-scheduler.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Discord Role Scheduler",
    template: "%s | Discord Role Scheduler"
  },
  description:
    "Automate temporary Discord role grants and removals for events, contests, and time-limited server access.",
  keywords: [
    "discord role scheduler",
    "discord automation",
    "community management",
    "temporary roles",
    "discord bot"
  ],
  openGraph: {
    type: "website",
    title: "Discord Role Scheduler",
    description:
      "Stop manually adding and removing temporary permissions. Schedule roles once and let the bot handle revocations.",
    url: appUrl,
    siteName: "Discord Role Scheduler"
  },
  twitter: {
    card: "summary_large_image",
    title: "Discord Role Scheduler",
    description:
      "Schedule temporary role assignments in Discord and avoid forgotten revokes forever."
  },
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
