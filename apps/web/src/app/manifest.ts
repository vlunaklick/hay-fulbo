import { tokenHex } from "@hay-fulbo/ui/tokens";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hay Fulbo",
    short_name: "Hay Fulbo",
    description: "La mesa de control de tus partidos.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: tokenHex("background", "dark"),
    theme_color: tokenHex("background", "dark"),
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
