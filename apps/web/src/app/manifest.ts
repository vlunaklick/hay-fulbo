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
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
