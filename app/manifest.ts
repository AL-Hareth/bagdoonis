import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "بقدونس؟ ولّا كزبرة؟",
    short_name: "بقدونس",
    description: "صوّر الورقة ونقولك: كزبرة ولا بقدونس.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    background_color: "#f3eedf",
    theme_color: "#f3eedf",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
