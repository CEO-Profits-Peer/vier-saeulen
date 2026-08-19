import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vier Säulen",
  description: "Learn, Body, Image, Money — dein Tag in vier Säulen, mit Flow-Timer, Zielen und Streaks.",
  manifest: "/manifest.webmanifest",
  applicationName: "Vier Säulen",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Vier Säulen" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body>
        <Providers>
          <div className="screen">{children}</div>
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
