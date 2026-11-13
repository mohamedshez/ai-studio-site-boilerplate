import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const PAGES = ["/", "/about", "/contact"];

// Empty unless this is the production site.
export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.SITE_ENV !== "production") return [];
  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  return PAGES.map((path) => ({ url: `${base}${path}` }));
}
