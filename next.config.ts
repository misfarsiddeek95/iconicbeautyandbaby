import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The storefront is fully static. `next build` writes plain HTML to `out/`,
  // and Next names the files exactly like the old site (`about.html`,
  // `products/<id>.html`) so existing URLs keep working.
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
