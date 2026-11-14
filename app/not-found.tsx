import type { Metadata } from "next";
import NotFoundMain from "@/components/legacy/NotFoundMain";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

export const metadata: Metadata = metadataFor("/404");

export default function NotFound() {
  return (
    <>
      <NotFoundMain />
      <JsonLd schemas={seoFor("/404").schemas} />
    </>
  );
}
