import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { tokenHex } from "@hay-fulbo/ui/tokens";

import "../index.css";
import Providers from "@/components/providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Hay Fulbo", template: "%s · Hay Fulbo" },
  description: "Partidos, equipos, cuentas y estadísticas del grupo.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: tokenHex("background", "light") },
    { media: "(prefers-color-scheme: dark)", color: tokenHex("background", "dark") },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
