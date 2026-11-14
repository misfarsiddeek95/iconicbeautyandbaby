import type { Metadata } from "next";
import seoData from "@/src/data/seo.json";
import { SITE } from "./site";

export type SeoRecord = {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemas: unknown[];
};

const seo = seoData as Record<string, SeoRecord>;

export function seoFor(route: string): SeoRecord {
  const record = seo[route];
  if (record) return record;
  // Fallback keeps a page renderable if a route is missing from the manifest.
  return {
    title: "Iconic Beauty & Baby | Cosmetics & Baby Care Sri Lanka",
    description:
      "Shop skin care, hair care, makeup, fragrance and baby essentials at Iconic Beauty & Baby in Colombo 02. 798 products, 129 brands, delivery across Sri Lanka.",
    canonical: SITE + "/",
    robots: "index,follow",
    ogType: "website",
    ogTitle: "Iconic Beauty & Baby | Cosmetics & Baby Care Sri Lanka",
    ogDescription:
      "Shop skin care, hair care, makeup, fragrance and baby essentials at Iconic Beauty & Baby in Colombo 02. 798 products, 129 brands, delivery across Sri Lanka.",
    ogUrl: SITE + "/",
    ogImage: SITE + "/assets/img/og-iconic.png",
    twitterCard: "summary_large_image",
    twitterTitle: "Iconic Beauty & Baby | Cosmetics & Baby Care Sri Lanka",
    twitterDescription:
      "Shop skin care, hair care, makeup, fragrance and baby essentials at Iconic Beauty & Baby in Colombo 02. 798 products, 129 brands, delivery across Sri Lanka.",
    twitterImage: SITE + "/assets/img/og-iconic.png",
    schemas: [],
  };
}

function robots(value: string): Metadata["robots"] {
  const [index, follow] = value.split(",").map((part) => part.trim());
  return { index: index !== "noindex", follow: follow !== "nofollow" };
}

export function metadataFor(
  route: string,
  options: { canonical?: boolean } = {},
): Metadata {
  const record = seoFor(route);
  // The exported files keep their `.html` names, but static hosts canonicalise
  // `/page.html` to `/page` with a 301. Point canonicals at the URL that is
  // actually served so they never target a redirect.
  const canonical = SITE + route;
  // Next only accepts its own Open Graph type names. `product` is a valid opg.me
  // type but not in Next's union, so those pages fall back to `website`; the
  // Product JSON-LD carries the richer semantics.
  const ogType = record.ogType === "product" ? "website" : record.ogType || "website";
  return {
    title: { absolute: record.title },
    description: record.description,
    ...(options.canonical === false
      ? {}
      : { alternates: { canonical } }),
    robots: robots(record.robots),
    openGraph: {
      type: ogType as "website",
      siteName: "Iconic Beauty & Baby",
      locale: "en_LK",
      title: record.ogTitle || record.title,
      description: record.ogDescription || record.description,
      url: canonical,
      images: [{ url: record.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: record.twitterTitle || record.title,
      description: record.twitterDescription || record.description,
      images: [record.twitterImage || record.ogImage],
    },
  };
}

/** Renders the JSON-LD captured from the static build for this route. */
export function JsonLd({ schemas }: { schemas: unknown[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
