import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MatchDay ZGZ",
    short_name: "MatchDay",
    description:
      "Partidos, clasificación y actualidad del Real Zaragoza en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#07111f",
    lang: "es",
    orientation: "portrait-primary",
    categories: ["sports", "news"],
  };
}

