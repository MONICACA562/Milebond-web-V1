// Cloudflare Worker entry — serves the static site from ./ via env.ASSETS.
//
// The two legacy service pages were merged into /services/supplier-verification-factory-audit.
// Requests for the old URLs get a permanent 301 so inbound links and search results land on
// the merged page. Everything else is passed straight through to the asset layer.

const MERGED_SERVICE_PATH = '/services/supplier-verification-factory-audit';

const LEGACY_SERVICE_PATHS = new Set([
  '/services/supplier-verification',
  '/services/factory-audit',
]);

function normalisePath(pathname) {
  let path = pathname.toLowerCase().replace(/\/+$/, '');
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }
  return path || '/';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (LEGACY_SERVICE_PATHS.has(normalisePath(url.pathname))) {
      const target = new URL(MERGED_SERVICE_PATH, url.origin);
      target.search = url.search;
      return new Response(null, {
        status: 301,
        headers: {
          Location: target.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
