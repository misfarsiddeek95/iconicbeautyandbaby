import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Demo/cart pages stay crawlable in the static build only via links,
        // never via the sitemap. Keep both the clean and legacy forms blocked.
        disallow: [
          "/checkout",
          "/cart",
          "/account",
          "/checkout.html",
          "/cart.html",
          "/account.html",
        ],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
