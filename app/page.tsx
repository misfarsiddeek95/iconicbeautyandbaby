import HomeMain from "@/components/home/HomeMain";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

// Next normalises the root canonical to the origin without a slash. The old
// site (and its sitemap) use `https://iconicbeautyandbaby.com/`, so render that
// exact tag here instead; React 19 hoists it into <head>.
export const metadata = metadataFor("/", { canonical: false });

export default function HomePage() {
  return (
    <>
      <link rel="canonical" href="https://iconicbeautyandbaby.com/" />
      <HomeMain />
      <JsonLd schemas={seoFor("/").schemas} />
    </>
  );
}
