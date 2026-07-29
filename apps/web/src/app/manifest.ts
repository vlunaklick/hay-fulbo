import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hay Fulbo",
    short_name: "Hay Fulbo",
    description: "La mesa de control de tus partidos.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#101512",
    theme_color: "#101512",
    icons: [
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
