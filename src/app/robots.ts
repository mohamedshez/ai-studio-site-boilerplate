import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

// Only the production site may be indexed.
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
