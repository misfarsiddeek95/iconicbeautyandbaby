import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ArticleView from "@/components/journal/ArticleView";
import { articles, getArticle } from "@/lib/site";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return metadataFor(`/journal/${slug}`);
}

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getArticle(slug)) notFound();

  const route = `/journal/${slug}`;
  return (
    <>
      <ArticleView slug={slug} />
      <JsonLd schemas={seoFor(route).schemas} />
    </>
  );
}
