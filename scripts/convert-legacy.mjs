/**
 * One-off migration helper: turns the legacy static pages into React.
 *
 * - `components/chrome/ChromeBefore.tsx` / `ChromeAfter.tsx` hold the shared
 *   header, footer, drawers and overlays from `index.html`.
 * - `components/legacy/*.tsx` hold the `<main>` content of every fixed page,
 *   except the hand-written pages listed in `CUSTOM_PAGES`.
 * - `components/home/HomeMain.tsx` holds the home page body.
 * - Journal articles share one data-driven `components/journal/ArticleView.tsx`.
 *   Their static FAQ blocks are intentionally not rendered, so the converter
 *   also strips the matching FAQPage schema from their metadata.
 * - `src/data/seo.json` records title/description/canonical/robots/JSON-LD for
 *   every route so metadata stays byte-compatible with the static build.
 * - `src/data/routes.json` is the route list used by the sitemap.
 *
 * Re-run with `npm run convert:legacy` after the static site is rebuilt.
 */
import { createRequire } from "node:module";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HTMLtoJSX = require("htmltojsx");

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..");
const legacy = path.resolve(project, "../cosmika");
const SITE = "https://iconicbeautyandbaby.com";

const converter = new HTMLtoJSX({ createClass: false });

const STATIC_PAGES = [
  ["index.html", "/", "HomeMain", "home"],
  ["about.html", "/about", "AboutMain"],
  ["accessibility.html", "/accessibility", "AccessibilityMain"],
  ["account.html", "/account", "AccountMain"],
  ["article.html", "/article", "ArticleDemoMain"],
  ["brands.html", "/brands", "BrandsMain"],
  ["cart.html", "/cart", "CartMain"],
  ["categories.html", "/categories", "CategoriesMain"],
  ["category.html", "/category", "CategoryDemoMain"],
  ["checkout.html", "/checkout", "CheckoutMain"],
  ["compare.html", "/compare", "CompareMain"],
  ["contact.html", "/contact", "ContactMain"],
  ["cookies.html", "/cookies", "CookiesMain"],
  ["faq.html", "/faq", "FaqMain"],
  ["gift-cards.html", "/gift-cards", "GiftCardsMain"],
  ["help.html", "/help", "HelpMain"],
  ["journal.html", "/journal", "JournalMain"],
  ["loyalty.html", "/loyalty", "LoyaltyMain"],
  ["order-confirmation.html", "/order-confirmation", "OrderConfirmationMain"],
  ["privacy.html", "/privacy", "PrivacyMain"],
  ["product.html", "/product", "ProductDemoMain"],
  ["shipping-returns.html", "/shipping-returns", "ShippingReturnsMain"],
  ["shop.html", "/shop", "ShopMain"],
  ["sitemap.html", "/sitemap", "SitemapMain"],
  ["stores.html", "/stores", "StoresMain"],
  ["terms.html", "/terms", "TermsMain"],
  ["top-deals.html", "/top-deals", "TopDealsMain"],
  ["track-order.html", "/track-order", "TrackOrderMain"],
  ["wishlist.html", "/wishlist", "WishlistMain"],
];

// Hand-written pages. The converter still records their SEO and writes the
// route wrapper, but it leaves the component alone so redesigns survive a
// regeneration.
const CUSTOM_PAGES = new Map([
  [
    "/brands",
    {
      component: "BrandsBrowse",
      importPath: "@/components/pages/BrandsBrowse",
    },
  ],
  [
    "/track-order",
    {
      component: "TrackOrderView",
      importPath: "@/components/pages/TrackOrderView",
    },
  ],
]);

/* ---------- URL rewriting ---------- */
function rewriteUrls(markup) {
  let out = markup
    .replace(/(href|src|action)="assets\//g, '$1="/assets/')
    .replace(/href="index\.html((?:[?#][^"]*)?)"/g, 'href="/$1"')
    .replace(/href="products\/([^"?#]+)\.html((?:[?#][^"]*)?)"/g, 'href="/products/$1$2"')
    .replace(/href="categories\/([^"?#]+)\.html((?:[?#][^"]*)?)"/g, 'href="/categories/$1$2"')
    .replace(/href="journal\/([^"?#]+)\.html((?:[?#][^"]*)?)"/g, 'href="/journal/$1$2"')
    .replace(/href="([a-z0-9-]+)\.html((?:[?#][^"]*)?)"/g, 'href="/$1$2"')
    .replace(/href="(sitemap\.xml|llms\.txt)"/g, 'href="/$1"')
    .replace(/action="shop\.html"/g, 'action="/shop"')
    // The header text stays in the DOM and becomes visually hidden (not
    // display:none) at narrow widths, so it names each icon link. Keep the
    // phone link's aria-label aligned with its visible text.
    .replace(
      'aria-label="Call or WhatsApp Iconic Beauty &amp; Baby on 077 629 0490"',
      'aria-label="Call or WhatsApp 077 629 0490"',
    );
  // The legacy demo pages link through query strings; map the common ones.
  out = out
    .replace(/href="category\.html\?cat=serum"/g, 'href="/categories/skin-care"')
    .replace(/href="category\.html\?cat=moisturiser"/g, 'href="/categories/skin-care"')
    .replace(/href="category\.html\?cat=cleanser"/g, 'href="/categories/skin-care"')
    .replace(/href="category\.html\?cat=makeup"/g, 'href="/categories/makeup"')
    .replace(/href="category\.html\?cat=sets"/g, 'href="/categories/gifts-and-home"');
  return out;
}

function extractFirst(html, tag) {
  const start = html.indexOf(`<${tag}`);
  if (start === -1) return "";
  const close = html.indexOf(`</${tag}>`, start);
  const end = close === -1 ? html.length : close + tag.length + 3;
  return html.slice(start, end);
}

function jsxComponent(name, markup) {
  // htmltojsx writes valueless `alt` as a boolean and leaves a few HTML-only
  // attribute names alone; normalise them for React/TSX.
  const jsx = markup
    .replace(/\salt(?=\s+(?:width|height|loading|decoding|class|style|src|aria-[a-z-]+)=|\s*\/?>)/g, ' alt=""')
    .replace(/<option value>/g, '<option value="">')
    .replace(/\bfetchpriority=/g, "fetchPriority=")
    .replace(/\benterkeyhint=/g, "enterKeyHint=")
    .replace(/\bcrossorigin=/g, "crossOrigin=")
    .replace(/\ballowfullscreen\b/g, "allowFullScreen")
    .replace(/\bframeborder=/g, "frameBorder=")
    .replace(/\bcellpadding=/g, "cellPadding=")
    .replace(/\bcellspacing=/g, "cellSpacing=");

  return `/* eslint-disable */
// Generated by scripts/convert-legacy.mjs from the static storefront.
// Edit the source page in ./cosmika/tools/pages and re-run the converter,
// or turn this into a hand-written component.

export default function ${name}() {
  return (
    <>
${jsx}
    </>
  );
}
`;
}

/* ---------- run ---------- */
const indexHtml = await readFile(path.join(legacy, "index.html"), "utf8");

// 1. Shared chrome.
const beforeStart = indexHtml.indexOf('<a class="skip-link"');
const beforeEnd = indexHtml.indexOf("<main");
// The footer is the shared block between `</main>` and the drawers. Start the
// "after" chrome there so every page renders it, and drop the page-level
// JSON-LD script (each route gets its own copy from src/data/seo.json).
const afterStart = indexHtml.indexOf('<footer class="footer"');
const afterEnd = indexHtml.indexOf('<script src="assets/js/catalog.min.js');

const chromeBefore = rewriteUrls(indexHtml.slice(beforeStart, beforeEnd));
const chromeAfter = rewriteUrls(indexHtml.slice(afterStart, afterEnd)).replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
  "",
);

await mkdir(path.join(project, "components/chrome"), { recursive: true });
await mkdir(path.join(project, "components/legacy"), { recursive: true });
await mkdir(path.join(project, "components/home"), { recursive: true });
await mkdir(path.join(project, "components/categories"), { recursive: true });
await mkdir(path.join(project, "components/journal"), { recursive: true });

await writeFile(
  path.join(project, "components/chrome/ChromeBefore.tsx"),
  jsxComponent("ChromeBefore", converter.convert(chromeBefore)),
);
await writeFile(
  path.join(project, "components/chrome/ChromeAfter.tsx"),
  jsxComponent("ChromeAfter", converter.convert(chromeAfter)),
);

// 2. Fixed pages.
const seo = {};
const routes = [];

for (const [file, route, component, folder] of STATIC_PAGES) {
  const html =
    file === "index.html" ? indexHtml : await readFile(path.join(legacy, file), "utf8");
  const main = extractFirst(html, "main");
  if (!main) throw new Error(`No <main> in ${file}`);

  // The loyalty preview note sat directly against the hero below it. Keep a
  // little breathing room without touching the static source.
  const pageMain =
    file === "loyalty.html"
      ? main.replace("margin:18px 0 0;", "margin:18px 0 24px;")
      : main;

  if (!CUSTOM_PAGES.has(route)) {
    const outDir =
      folder === "home" ? path.join(project, "components/home") : path.join(project, "components/legacy");
    await writeFile(
      path.join(outDir, `${component}.tsx`),
      jsxComponent(component, converter.convert(rewriteUrls(pageMain))),
    );
  }

  seo[route] = readSeo(html, file);
  routes.push({ route, file, robots: seo[route].robots });
}

// 2b. App Router wrappers for the fixed pages. Each one keeps the generated
// component untouched and adds the SEO metadata/JSON-LD recorded for the route.
for (const [, route, component, folder] of STATIC_PAGES) {
  if (route === "/") continue;
  const dir = path.join(project, "app", route.slice(1));
  await mkdir(dir, { recursive: true });
  const custom = CUSTOM_PAGES.get(route);
  const importPath = custom
    ? custom.importPath
    : folder === "home"
      ? `@/components/home/${component}`
      : `@/components/legacy/${component}`;
  const componentName = custom ? custom.component : component;
  const functionName = `${pascal(route.slice(1))}Page`;
  await writeFile(
    path.join(dir, "page.tsx"),
    `// Generated by scripts/convert-legacy.mjs — edit the source page in
// ../cosmika/tools/pages and re-run the converter.
import ${componentName} from "${importPath}";
import { JsonLd, metadataFor, seoFor } from "@/lib/seo";

export const metadata = metadataFor(${JSON.stringify(route)});

export default function ${functionName}() {
  return (
    <>
      <${componentName} />
      <JsonLd schemas={seoFor(${JSON.stringify(route)}).schemas} />
    </>
  );
}
`,
  );
}

// 404 page -> not-found content.
const notFoundHtml = await readFile(path.join(legacy, "404.html"), "utf8");
await writeFile(
  path.join(project, "components/legacy/NotFoundMain.tsx"),
  jsxComponent("NotFoundMain", converter.convert(rewriteUrls(extractFirst(notFoundHtml, "main")))),
);
seo["/404"] = readSeo(notFoundHtml, "404.html");

// Product, brand, category and journal article routes are generated from data,
// but their metadata still comes from the built pages.
const dynamicFiles = [];
const categoryFiles = [];
for (const file of await listHtml(legacy)) {
  if (/^(products|categories|journal)\/.+\.html$/.test(file)) dynamicFiles.push(file);
  else if (/^brand-.+\.html$/.test(file)) dynamicFiles.push(file);
  if (file.startsWith("categories/")) categoryFiles.push(file);
}

for (const file of dynamicFiles) {
  const html = await readFile(path.join(legacy, file), "utf8");
  const route = routeForFile(file);
  seo[route] = readSeo(html, file);
}

// Category pages are a small, fixed set. Convert each one so the generated
// FAQs and internal link lists stay identical to the static build.
const categoryRegistry = [];
for (const file of categoryFiles) {
  const slug = file.slice("categories/".length, -5);
  const component = `${pascal(slug)}CategoryMain`;
  const html = await readFile(path.join(legacy, file), "utf8");
  await writeFile(
    path.join(project, "components/categories", `${component}.tsx`),
    jsxComponent(component, converter.convert(rewriteUrls(extractFirst(html, "main")))),
  );
  categoryRegistry.push({ slug, component });
}

// Journal pages render without the static build's FAQ block, so drop the
// FAQPage schema and the FAQ selectors from the speakable spec. This keeps the
// structured data aligned with what is actually visible on the page.
for (const route of Object.keys(seo)) {
  if (!route.startsWith("/journal/")) continue;
  for (const schema of seo[route].schemas ?? []) {
    if (!Array.isArray(schema["@graph"])) continue;
    schema["@graph"] = schema["@graph"].filter((node) => node["@type"] !== "FAQPage");
    for (const node of schema["@graph"]) {
      const selectors = node.speakable?.cssSelector;
      if (!Array.isArray(selectors)) continue;
      const kept = selectors.filter((selector) => !String(selector).includes(".faq-block"));
      if (kept.length) node.speakable.cssSelector = kept;
      else delete node.speakable;
    }
  }
}

await writeFile(
  path.join(project, "components/categories/registry.ts"),
  `// Generated by scripts/convert-legacy.mjs
import type { ComponentType } from "react";
${categoryRegistry.map((c) => `import ${c.component} from "./${c.component}";`).join("\n")}

export const categoryViews: Record<string, ComponentType> = {
${categoryRegistry.map((c) => `  ${JSON.stringify(c.slug)}: ${c.component},`).join("\n")}
};
`,
);

await mkdir(path.join(project, "src/data"), { recursive: true });
await writeFile(path.join(project, "src/data/seo.json"), JSON.stringify(seo, null, 2) + "\n");
await writeFile(path.join(project, "src/data/routes.json"), JSON.stringify(routes, null, 2) + "\n");

// Snapshot the data files the app imports at build time.
for (const file of [
  "site.json",
  "journal.json",
  "business.json",
  "stores.json",
  "tracking.json",
]) {
  await cp(path.join(legacy, "data", file), path.join(project, "src/data", file));
}

console.log(
  `Converted ${STATIC_PAGES.length} fixed pages + chrome; SEO manifest has ${Object.keys(seo).length} routes.`,
);

/* ---------- helpers ---------- */
async function listHtml(root) {
  const { readdir } = await import("node:fs/promises");
  const out = [];
  for (const dir of ["products", "categories", "journal"]) {
    for (const entry of await readdir(path.join(root, dir))) {
      if (entry.endsWith(".html")) out.push(`${dir}/${entry}`);
    }
  }
  for (const entry of await readdir(root)) {
    if (/^brand-.+\.html$/.test(entry)) out.push(entry);
  }
  return out;
}

function routeForFile(file) {
  if (file.startsWith("products/")) return "/products/" + file.slice("products/".length, -5);
  if (file.startsWith("categories/")) return "/categories/" + file.slice("categories/".length, -5);
  if (file.startsWith("journal/")) return "/journal/" + file.slice("journal/".length, -5);
  if (/^brand-.+\.html$/.test(file)) return "/" + file.slice(0, -5);
  return "/" + file.slice(0, -5);
}

function readSeo(html, file) {
  const head = html.slice(0, html.indexOf("</head>"));
  const attr = (re) => (head.match(re) || [])[1] || "";
  const title = (head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
  const description = attr(/<meta name="description" content="([^"]*)"/);
  const canonical = attr(/<link rel="canonical" href="([^"]*)"/);
  const robots = attr(/<meta name="robots" content="([^"]*)"/) || "index,follow";
  const ogType = attr(/<meta property="og:type" content="([^"]*)"/);
  const ogTitle = attr(/<meta property="og:title" content="([^"]*)"/);
  const ogDescription = attr(/<meta property="og:description" content="([^"]*)"/);
  const ogUrl = attr(/<meta property="og:url" content="([^"]*)"/);
  const ogImage = attr(/<meta property="og:image" content="([^"]*)"/);
  const twitterCard = attr(/<meta name="twitter:card" content="([^"]*)"/);
  const twitterTitle = attr(/<meta name="twitter:title" content="([^"]*)"/);
  const twitterDescription = attr(/<meta name="twitter:description" content="([^"]*)"/);
  const twitterImage = attr(/<meta name="twitter:image" content="([^"]*)"/);

  const schemas = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = re.exec(html))) {
    try {
      schemas.push(cleanSchemaUrls(JSON.parse(match[1])));
    } catch {
      throw new Error(`Invalid JSON-LD in ${file}`);
    }
  }

  return {
    title: decode(title),
    description: decode(description),
    canonical: cleanSchemaUrls(canonical),
    robots,
    ogType,
    ogTitle: decode(ogTitle),
    ogDescription: decode(ogDescription),
    ogUrl: cleanSchemaUrls(ogUrl),
    ogImage,
    twitterCard,
    twitterTitle: decode(twitterTitle),
    twitterDescription: decode(twitterDescription),
    twitterImage,
    schemas,
  };
}

/**
 * The static build emitted absolute `.html` URLs inside JSON-LD. The export
 * serves clean routes (and 301s the `.html` forms), so rewrite them here to
 * keep schema, canonicals and the sitemap pointing at the same URLs.
 */
function cleanSchemaUrls(value) {
  if (typeof value === "string") {
    if (!value.startsWith(SITE + "/")) return value;
    return value
      .replace(
        /^https:\/\/iconicbeautyandbaby\.com\/index\.html(?=$|[?#])/,
        SITE + "/",
      )
      .replace(
        /^https:\/\/iconicbeautyandbaby\.com\/([^?#]*)\.html(?=$|[?#])/,
        SITE + "/$1",
      );
  }
  if (Array.isArray(value)) return value.map(cleanSchemaUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanSchemaUrls(item)]),
    );
  }
  return value;
}

function decode(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pascal(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
