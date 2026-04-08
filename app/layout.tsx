import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Send to Me",
  description: "Cross-device inbox for notes, links, files, images, and audio.",
  applicationName: "Send to Me",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/stm-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/stm-icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/stm-logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
    shortcut: ["/stm-logo.svg"],
  },
  appleWebApp: {
    capable: true,
    title: "Send to Me",
    statusBarStyle: "default",
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
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
