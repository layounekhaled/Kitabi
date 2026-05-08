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
  title: "Kitabi - Librairie en ligne | Print-on-Demand",
  description:
    "Kitabi est votre librairie en ligne spécialisée dans l'impression à la demande. Des milliers de livres en français, arabe et anglais, imprimés avec soin et livrés partout en Algérie.",
  keywords: [
    "Kitabi",
    "librairie",
    "livre",
    "impression à la demande",
    "print on demand",
    "Algérie",
    "livre en ligne",
    "كتاب",
    "مكتبة",
  ],
  authors: [{ name: "Kitabi" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Kitabi - Librairie en ligne | Print-on-Demand",
    description:
      "Votre librairie en ligne, imprimée à la demande. Découvrez des milliers de livres et recevez-les partout en Algérie.",
    url: "https://kitabi.dz",
    siteName: "Kitabi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitabi - Librairie en ligne | Print-on-Demand",
    description:
      "Votre librairie en ligne, imprimée à la demande. Découvrez des milliers de livres et recevez-les partout en Algérie.",
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
