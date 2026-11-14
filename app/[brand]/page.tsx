import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BrandView from "@/components/brand/BrandView";
import { brands, getBrand } from "@/lib/site";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

// Brand pages live at the root as `/brand-<id>`; nothing else is generated.
export const dynamicParams = false;

export function generateStaticParams() {
  return brands.map((brand) => ({ brand: `brand-${brand.id}` }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  return metadataFor(`/${brand}`);
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: segment } = await params;
  if (!segment.startsWith("brand-")) notFound();

  const brand = getBrand(segment.slice("brand-".length));
  if (!brand) notFound();

  const route = `/${segment}`;
  return (
    <>
      <BrandView brand={brand} />
      <JsonLd schemas={seoFor(route).schemas} />
    </>
  );
}
