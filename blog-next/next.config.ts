import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so we can host on Cloudflare Pages alongside main site
  output: "export",
  // Serve blog under /blog subpath
  basePath: "/blog",
  // Images are unoptimized in static export
  images: { unoptimized: true },
  // Clean URLs: generate /blog/article-name/index.html (no .html in URL)
  trailingSlash: true,
};

export default nextConfig;
