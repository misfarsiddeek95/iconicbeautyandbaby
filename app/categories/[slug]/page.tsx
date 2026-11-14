import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { categoryViews } from "@/components/categories/registry";
import { categories } from "@/lib/site";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return metadataFor(`/categories/${slug}`);
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const View = categoryViews[slug];
  if (!View) notFound();

  const route = `/categories/${slug}`;
  return (
    <>
      <View />
      <JsonLd schemas={seoFor(route).schemas} />
    </>
  );
}
