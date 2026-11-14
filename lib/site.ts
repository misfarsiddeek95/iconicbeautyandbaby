import siteData from "@/src/data/site.json";
import journalData from "@/src/data/journal.json";

export const SITE = "https://iconicbeautyandbaby.com";

export type Variant = {
  label: string;
  price: number;
  was?: number;
  stock?: number;
  sku?: string;
  img?: string;
};

export type ProductContent = {
  benefits?: string[];
  how?: string;
  goodToKnow?: string[];
  warnings?: string;
  gallery?: string[];
};

export type Product = {
  id: string;
  name: string;
  desc: string;
  brand: string;
  sku: string;
  price: number;
  in_stock?: boolean;
  img: string;
  cat: string;
  cat_label: string;
  size?: string;
  variants: Variant[];
  was?: number;
  meta_title?: string;
  meta_desc?: string;
  desc_long?: string[];
  content?: ProductContent;
  subcategory?: string;
  cats?: string[];
  types?: string[];
};

export type Brand = {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  img: string;
  count: number;
};

export type Category = {
  key: string;
  label: string;
  chip: string;
  desc: string;
  img: string;
  count: number;
  hidden?: boolean;
  types: { key: string; label: string; count: number }[];
};

export type Article = {
  slug: string;
  title: string;
  meta_title: string;
  meta_desc: string;
  excerpt: string;
  category: string;
  date: string;
  read: string;
  img: string;
  intro: string;
  sections: { h: string; p: string[] }[];
  takeaways?: string[];
  faqs?: { q: string; a: string }[];
};

export const products = siteData.products as Product[];
export const brands = siteData.brands as Brand[];
export const categories = siteData.categories as Category[];
export const articles = journalData.articles as Article[];

const productMap = new Map(products.map((p) => [p.id, p]));
const brandMap = new Map(brands.map((b) => [b.id, b]));
const categoryMap = new Map(categories.map((c) => [c.key, c]));

export function getProduct(id: string): Product | undefined {
  return productMap.get(id);
}

export function getBrand(id: string): Brand | undefined {
  return brandMap.get(id);
}

export function getCategory(key: string): Category | undefined {
  return categoryMap.get(key);
}

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function brandName(id: string): string {
  return brandMap.get(id)?.name ?? "Iconic";
}

export function money(value: number): string {
  return "Rs " + Math.round(value).toLocaleString("en-US");
}

export function discountPercent(price: number, was?: number): number {
  return was && was > price ? Math.round((1 - price / was) * 100) : 0;
}

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + Number(v.stock ?? 0), 0);
}

export function isVariable(product: Product): boolean {
  return product.variants.length > 1;
}

export function priceRange(product: Product): { lo: number; hi: number } {
  const prices = product.variants.map((v) => Number(v.price));
  return { lo: Math.min(...prices), hi: Math.max(...prices) };
}

export function wasLowest(product: Product): number {
  const was = product.variants
    .map((v) => Number(v.was ?? 0))
    .filter((v) => v > 0);
  return was.length ? Math.min(...was) : 0;
}

export function categoryProducts(key: string): Product[] {
  return products.filter((p) => (p.cats ?? [p.cat]).includes(key));
}

export function brandProducts(name: string): Product[] {
  return products.filter((p) => (p.brand || "") === name);
}

/** The static build rotates the related list by product id; keep that stable. */
export function relatedProducts(product: Product, limit = 12): Product[] {
  const pool = products.filter((p) => p.cat === product.cat && p.id !== product.id);
  if (!pool.length) return [];
  const start =
    String(product.id)
      .split("")
      .reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, limit);
}

export function articleDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
