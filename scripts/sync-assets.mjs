/**
 * Copies the static storefront assets into `public/` and rewrites the few
 * route references in the vanilla interaction script.
 *
 * The legacy site builds links like `products/<id>.html` and relies on a
 * `<base>` tag for asset paths. Next owns routing and serves every page from
 * the root, so the script links become clean routes (`/products/<id>`) and the
 * image URLs become absolute (`/assets/img/...`).
 *
 * Run with `npm run sync:assets` after editing assets in ../cosmika.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..");
const legacy = path.resolve(project, "../cosmika");
const pub = path.join(project, "public");

if (!existsSync(legacy)) {
  console.error(`Legacy site not found at ${legacy}`);
  process.exit(1);
}

await mkdir(path.join(pub, "assets/css"), { recursive: true });
await mkdir(path.join(pub, "assets/js"), { recursive: true });
await mkdir(path.join(pub, "assets/img"), { recursive: true });

// CSS is served close to the original so the rendered result matches the
// static site, with three accessibility tweaks:
// - the low-stock label was 4.43:1 against white (just under the 4.5:1 minimum);
// - header labels were `display:none` at narrow widths, which left the icon-only
//   links with no accessible name (keep them in the tree, visually hidden);
// - footer contact links were 18px tall, under the 24px minimum target size.
const footerTargets = `
/* Keep footer contact links at or above the 24px minimum target size. */
@media (pointer: fine) {
  .footer__details a { display: inline-flex; align-items: center; min-height: 24px; }
}
`;
const cssPatches = [
  [/#a86a1d/g, "#9c5f16"],
  [
    /\.header-action__text \{ display: none; \}/,
    `.header-action__text {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }`,
  ],
  [
    /\.header-action__text\{display:none\}/,
    ".header-action__text{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}",
  ],
];
for (const file of ["app.css", "app.min.css"]) {
  const source = await readFile(path.join(legacy, "assets/css", file), "utf8");
  const patched = cssPatches.reduce(
    (css, [from, to]) => css.replace(from, to),
    source,
  );
  await writeFile(path.join(pub, "assets/css", file), patched + footerTargets);
}

// Images: the logo, product art, brand marks and icons.
await cp(path.join(legacy, "assets/img"), path.join(pub, "assets/img"), { recursive: true });

// Catalogue data for the browser (window.ICONIC_CATALOG) and consent-gated
// analytics stubs.
await cp(path.join(legacy, "assets/js/catalog.js"), path.join(pub, "assets/js/catalog.js"));
await cp(path.join(legacy, "assets/js/catalog.min.js"), path.join(pub, "assets/js/catalog.min.js"));
await cp(path.join(legacy, "assets/js/tracking-config.js"), path.join(pub, "assets/js/tracking-config.js"));
await cp(path.join(legacy, "assets/js/tracking.js"), path.join(pub, "assets/js/tracking.js"));

let app = await readFile(path.join(legacy, "assets/js/app.js"), "utf8");

const replacements = [
  // --- route helpers -------------------------------------------------------
  [`return "products/" + id + ".html";`, `return "/products/" + id;`],
  [`function categoryHref(cat) { return "categories/" + cat + ".html"; }`,
   `function categoryHref(cat) { return "/categories/" + cat; }`],
  [`location.href = "shop.html?q=" + encodeURIComponent(v);`,
   `location.href = "/shop?q=" + encodeURIComponent(v);`],

  // --- generated markup links ---------------------------------------------
  [`href="shop.html`, `href="/shop`],
  [`href="brands.html"`, `href="/brands"`],
  [`href="brand-' + b.id + '.html"`, `href="/brand-' + b.id + '"`],
  [`href="brand-' + x.id + '.html"`, `href="/brand-' + x.id + '"`],
  [`href="contact.html"`, `href="/contact"`],
  [`href="help.html#size-guide"`, `href="/help#size-guide"`],
  [`href="order-confirmation.html?order=`, `href="/order-confirmation?order=`],
  [`href="track-order.html?order=`, `href="/track-order?order=`],
  [`brandLink.href = "brand-" + p.brand + ".html";`, `brandLink.href = "/brand-" + p.brand;`],
  [`set("#pdp-brand", brandName(p.brand));`,
   `set("#pdp-brand", brandName(p.brand) || "Iconic");`],
  [`if (brandLink) brandLink.href = "/brand-" + p.brand;`,
   `if (brandLink) brandLink.href = byBrand(p.brand) ? "/brand-" + p.brand : "/brands";`],
  [`location.href = "checkout.html";`, `location.href = "/checkout";`],
  [`window.location.href = "order-confirmation.html?order="`,
   `window.location.href = "/order-confirmation?order="`],

  // --- assets --------------------------------------------------------------
  [`src="assets/img/`, `src="/assets/img/`],
  [`src = "assets/img/`, `src = "/assets/img/`],

  // --- page detection (no more .html suffixes) ----------------------------
  [`if (/(checkout|cart|account|order-confirmation)\\.html/.test(location.pathname)) return;`,
   `if (/\\/(checkout|cart|account|order-confirmation)\\/?$/.test(location.pathname)) return;`],

  // Inactive hero slides are aria-hidden; make them non-focusable too.
  [`        s.setAttribute("aria-hidden", k === i ? "false" : "true");`,
   `        s.setAttribute("aria-hidden", k === i ? "false" : "true");\n        if (k === i) s.removeAttribute("inert"); else s.setAttribute("inert", "");`],

  // The canonical now comes from the server-rendered <head> for every route.
  // The legacy script rewrote it to the current URL on product pages, which
  // would strip the .html form recorded in the SEO manifest — leave it alone.
  [`    var canonical = document.querySelector('link[rel="canonical"]');\n    if (canonical) canonical.href = location.origin + location.pathname;\n`, ``],
];

for (const [from, to] of replacements) {
  app = app.split(from).join(to);
}

// Anything still pointing at a legacy .html page (e.g. footer-style links added
// later) is normalised to a clean route, except the generated catalogue paths.
app = app.replace(/href="([a-z0-9-]+)\.html"/g, 'href="/$1"');

const minified = await minify(app, { compress: true, mangle: true });

await writeFile(path.join(pub, "assets/js/app.js"), app);
await writeFile(path.join(pub, "assets/js/app.min.js"), minified.code ?? app);

// Root-level files that are served verbatim (crawler/AI hints, manifest).
for (const file of ["llms.txt", "site.webmanifest"]) {
  await cp(path.join(legacy, file), path.join(pub, file));
}

// Legacy URL redirects, pointed straight at the clean routes the Next app uses.
const redirects = await readFile(path.join(legacy, "_redirects"), "utf8");
await writeFile(
  path.join(pub, "_redirects"),
  redirects
    .replace("/categories.html", "/categories")
    .replace("/shop.html", "/shop")
    .replace("/checkout.html", "/checkout"),
);

// Next's static export bootstraps the RSC payload with inline scripts, so the
// legacy CSP (which only allowed same-origin script files) would block the app.
// Keep every other directive identical and allow inline scripts.
const headers = await readFile(path.join(legacy, "_headers"), "utf8");
await writeFile(
  path.join(pub, "_headers"),
  headers.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"),
);

console.log("Synced assets -> public/assets (app.js patched for clean routes)");
