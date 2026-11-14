# Iconic Beauty & Baby — Next.js storefront

A Next.js port of the static Iconic Beauty & Baby storefront. It keeps the
original design, copy, assets, vanilla interactions and URLs; React renders the
markup and `app.js` handles cart, search, quick view and drawers.

- **App Router + TypeScript**
- **Static export** (`output: "export"`) — `npm run build` writes `out/`
- **Full coverage**: home, 29 fixed pages, 798 products, 129 brands, 11 category
  pages and 4 journal articles (972 indexable/demo routes plus a 404)
- **Redesigned pages**: a searchable A–Z brand directory, a two-column track-order
  page, a data-driven journal article with a sticky sidebar, and a spacing fix on
  the loyalty page

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static site in out/
npm run start        # preview out/ at http://localhost:4180
npm run typecheck
```

Regenerate content after changing the static site in `../cosmika`:

```bash
npm run sync:assets    # CSS, images, JS, root files -> public/
npm run convert:legacy # chrome, page components, SEO manifest, route wrappers
npm run build
```

`sync:assets` copies `assets/css`, `assets/img` and the browser scripts, then
rewrites the legacy `.html` links and relative image paths in `app.js` for clean
routes. It also patches `_headers` so the CSP allows Next's inline bootstrap
scripts, and applies three small CSS fixes: the low-stock label contrast, keeping
header labels in the accessibility tree at narrow widths, and the 24px minimum
target size for footer contact links.

`convert:legacy` reads the built pages in `../cosmika`, converts `<main>` bodies
with `htmltojsx`, writes the fixed-page and category components, and records
title/description/canonical/robots/JSON-LD for every route in
`src/data/seo.json`. It also regenerates the App Router wrappers under `app/`.
The hand-written `/brands` and `/track-order` components in `components/pages/`
are skipped, so the redesigns survive regeneration. Journal articles are rendered
by one data-driven `ArticleView`. The static FAQ blocks are not carried over, and
the converter strips the matching FAQPage schema from those routes so the
structured data matches the visible page.

`public/assets/css/pages.css` holds the page-level styles layered on top of
`app.min.css` (brand directory, track-order help column, article sidebar, the
product “more in category” panel, the floating chat greeting and the
sticky-header fix). `sync:assets` does not overwrite it.

## Structure

```
app/                     routes (exported as .html filenames like the old site)
  [brand]/               /brand-<id>
  categories/[slug]/     /categories/<slug>
  journal/[slug]/        /journal/<slug>
  products/[id]/         /products/<id>
  sitemap.ts, robots.ts  generated at build time
components/chrome/       shared header, footer, drawers, overlays
components/home/         converted home page body
components/legacy/       converted fixed-page bodies
components/pages/        hand-written brands and track-order pages
components/product/      parameterised product detail view
components/brand/        parameterised brand landing page
components/categories/   one converted category page per slug + registry
components/journal/      data-driven article view with sidebar
lib/site.ts              typed data access and product helpers
lib/seo.tsx              metadata + JSON-LD helpers
scripts/                 asset sync and legacy page conversion
src/data/                site/journal data, SEO manifest, route list
public/assets/           synced CSS, images and scripts, plus pages.css
public/_redirects        legacy URL redirects
public/_headers          security headers (Netlify/Cloudflare format)
```

## URLs and deployment

The export keeps the old filenames: `/about` -> `about.html`,
`/products/<id>` -> `products/<id>.html`, `/brand-<id>` -> `brand-<id>.html`,
`/categories/<slug>` -> `categories/<slug>.html`,
`/journal/<slug>` -> `journal/<slug>.html`.

Deploy `out/` to any static host with pretty URLs enabled (Netlify and
Cloudflare Pages do this by default), so extensionless links resolve. The old
`.html` URLs keep working: hosts canonicalise them to the clean route with a
301. Canonicals, Open Graph URLs and the sitemap all use the clean form, and
`_redirects` points the old demo URLs straight at their new pages.

The `_redirects` and `_headers` files are copied for Netlify-style hosts. If you
deploy elsewhere, translate them to the host's configuration.

## Notes

- Links are plain `<a>` elements on purpose: every navigation is a full page
  load, so `app.js` boots and re-renders the catalogue exactly as it did on the
  static site.
- `catalog.min.js` loads `beforeInteractive`; `app.min.js` and the analytics
  stubs load `afterInteractive`.
- Product pages render crawlable title, price, benefits, description,
  specification, delivery notes and 12 related links server-side. The script
  then enriches the gallery, variants, reviews and cart.
- For the five sold-out products the server-rendered stock label says
  "Sold out" (the static build left the placeholder "In stock").
- The brands directory is server-rendered with a small React client component for
  search, letter filters and the empty state. It deliberately avoids the legacy
  `#brands-grid` id so `app.js` does not overwrite it.
- The track-order page keeps `#track-form`, the `number`/`email` field names,
  `#track-error` and `#track-result`, so the existing `initTrack()` handler keeps
  working.
- `pages.css` also removes the anonymous wrapper around the shared header
  (`display: contents`) so the sticky header keeps the whole page as its
  containing block.
- `components/chrome/ChatGreeting.tsx` is the animated “Hi there” bubble above
  the floating WhatsApp button. It appears after a short delay and a dismissal
  lasts for the browser session, so full-page navigation does not repeat it.
- Journal articles render no FAQ block. The converter removes their FAQPage
  schema and the `.faq-block` speakable selectors from `seo.json`.
