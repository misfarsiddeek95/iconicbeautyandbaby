import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductView from "@/components/product/ProductView";
import { getProduct, products } from "@/lib/site";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

// Every product page is generated at build time; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return metadataFor(`/products/${id}`);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  const route = `/products/${id}`;
  return (
    <>
      <ProductView product={product} />
      <JsonLd schemas={seoFor(route).schemas} />
    </>
  );
}
