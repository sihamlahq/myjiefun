import type { Metadata } from "next";
import { Syne, Figtree } from "next/font/google";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://myjiefun.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Myjiefun — Eat. Laugh. Linger.",
  description:
    "Myjiefun is a warm hangout for shared plates, cold drinks, and easy evenings. Come for the food, stay for the fun.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Myjiefun",
    title: "Myjiefun — Eat. Laugh. Linger.",
    description:
      "A hangout for shared plates, cold drinks, and unhurried evenings.",
    images: [
      {
        url: "/hero.jpg",
        width: 1376,
        height: 768,
        alt: "Shared plates and warm lights at Myjiefun",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Myjiefun — Eat. Laugh. Linger.",
    description:
      "A hangout for shared plates, cold drinks, and unhurried evenings.",
    images: ["/hero.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
