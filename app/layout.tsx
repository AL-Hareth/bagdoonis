import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Lalezar } from "next/font/google";
import "./globals.css";

const display = Lalezar({
  variable: "--font-lalezar",
  weight: "400",
  subsets: ["arabic", "latin"],
});

const body = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  weight: ["400", "500", "700"],
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "بقدونس؟ ولّا كزبرة؟",
  description: "صوّر الورقة ونقولك: كزبرة ولا بقدونس. بدون إحراج.",
  appleWebApp: { capable: true, title: "بقدونس", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f3eedf",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
