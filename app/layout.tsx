import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "MatchDay ZGZ",
    template: "%s · MatchDay ZGZ",
  },
  description:
    "Partidos, clasificación y actualidad del Real Zaragoza en una experiencia deportiva rápida y clara.",
  applicationName: "MatchDay ZGZ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MatchDay ZGZ",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "MatchDay ZGZ — El partido empieza aquí",
    description:
      "Partidos, clasificación y actualidad para acompañarte cada jornada.",
    type: "website",
    locale: "es_ES",
    images: [
      {
        url: "/og.png",
        width: 1734,
        height: 907,
        alt: "MatchDay ZGZ — El partido empieza aquí",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MatchDay ZGZ — El partido empieza aquí",
    description:
      "Partidos, clasificación y actualidad para acompañarte cada jornada.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${archivo.variable} ${archivoBlack.variable}`}>
        {children}
      </body>
    </html>
  );
}
