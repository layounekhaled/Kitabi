import type { Metadata } from "next";
import { Inter, Playfair_Display, Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/components/providers/language-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kitibi - Librairie en ligne",
  description:
    "Kitibi est votre librairie en ligne. Des milliers de livres en français, arabe et anglais, livrés partout en Algérie.",
  keywords: [
    "Kitibi",
    "librairie",
    "livre",
    "livre en ligne",
    "Algérie",
    "كتاب",
    "مكتبة",
    "livre français",
    "livre arabe",
  ],
  authors: [{ name: "Kitibi" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Kitibi - Librairie en ligne",
    description:
      "Votre librairie en ligne. Découvrez des milliers de livres et recevez-les partout en Algérie.",
    url: "https://kitabi.dz",
    siteName: "Kitibi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitibi - Librairie en ligne",
    description:
      "Votre librairie en ligne. Découvrez des milliers de livres et recevez-les partout en Algérie.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${notoArabic.variable} font-sans antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
