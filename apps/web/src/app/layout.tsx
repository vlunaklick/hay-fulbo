import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

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
  colorScheme: "dark",
  themeColor: "#101512",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
