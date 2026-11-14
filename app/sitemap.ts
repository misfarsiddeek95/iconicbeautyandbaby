import type { MetadataRoute } from "next";
import seoData from "@/src/data/seo.json";
import type { SeoRecord } from "@/lib/seo";
import { SITE } from "@/lib/site";

const seo = seoData as Record<string, SeoRecord>;

export const dynamic = "force-static";

/**
 * Every indexable page, using the clean URL that the static host serves.
 * (`/page.html` requests redirect to `/page`, so the sitemap must not list the
 * redirecting form.)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(seo)
    .filter(
      ([route, record]) => route !== "/404" && !record.robots.startsWith("noindex"),
    )
    .map(([route]) => ({
      url: route === "/" ? SITE + "/" : SITE + route,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "/" ? 1 : 0.7,
    }));
}
