/* Shared catalog collection components
 * Usage:
 *   <script type="application/json" id="catalog-data">
 *     {"tags":["Tag A","Tag B"],"products":[{"sku":"...","tag":"Tag A","name":"...","moq":"300 pcs","moqN":300,"price":"$1 – $3","priceN":1}]}
 *   </script>
 *   <catalog-tagbar data-source="#catalog-data"></catalog-tagbar>
 *   <catalog-grid  data-source="#catalog-data"></catalog-grid>
 * The tagbar renders "All" (no count) plus each tag with a product-count chip,
 * and filters the grid on click. The grid also wires #catalog-search and
 * #catalog-sort when present on the page (live search + sorting).
 */
(function () {
  if (customElements.get('catalog-tagbar')) return;

  var CSS = [
    'catalog-tagbar,catalog-grid{display:block}',
    '.cc-wrap{max-width:1280px;margin:0 auto;padding:0 24px}',
    '.cc-tagbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:18px 0 6px}',
    '.cc-tag{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border:1px solid #e2e0d8;border-radius:999px;background:#fff;color:#0a2a2b;font-size:13px;font-weight:600;line-height:1.2;cursor:pointer;font-family:inherit;transition:border-color .18s,background-color .18s,color .18s}',
    '.cc-tag:hover{border-color:#0a2a2b}',
    '.cc-tag.is-active{background:#0a2a2b;border-color:#0a2a2b;color:#fff}',
    '.cc-n{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:rgba(10,42,43,.08);color:#5a5950;font-size:11px;font-weight:700;line-height:1}',
    '.cc-tag.is-active .cc-n{background:rgba(255,255,255,.2);color:#fff}',
    '.cc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding:14px 0 10px}',
    '.cc-card{background:#fff;border:1px solid #ecebe5;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s}',
    '.cc-card:hover{transform:translateY(-4px);box-shadow:0 14px 34px rgba(10,42,43,.12)}',
    '.cc-media{aspect-ratio:4/3;background:#f1f2f0;display:flex;align-items:center;justify-content:center;color:#c9c4b6}',
    '.cc-media svg{width:34px;height:34px}',
    '.cc-body{padding:16px;display:flex;flex-direction:column;gap:9px;flex:1}',
    '.cc-meta{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#6a7282}',
    '.cc-meta .cc-row{display:inline-flex;align-items:center;gap:6px;min-width:0}',
    '.cc-meta svg{width:13px;height:13px;flex-shrink:0;color:#8a94a6}',
    '.cc-sku{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:600;color:#0a2a2b;letter-spacing:.02em}',
    '.cc-name{margin:0;font-size:15px;font-weight:700;color:#0a2a2b;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.7em}',
    '.cc-price{font-size:16px;font-weight:800;color:#a06a30;margin-top:auto;white-space:nowrap}',
    '.cc-quote{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:2px;padding:10px 14px;border-radius:8px;background:#008138;color:#fff;font-size:13px;font-weight:700;text-decoration:none;transition:background-color .18s}',
    '.cc-quote:hover{background:#0f3d3e;color:#fff}',
    '.cc-quote svg{width:14px;height:14px;flex-shrink:0}',
    '.cc-empty{grid-column:1/-1;padding:44px 20px;text-align:center;color:#6a7282;font-size:14px;border:1px dashed #d8d4c8;border-radius:12px}',
    '@media(max-width:1024px){.cc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media(max-width:640px){.cc-wrap{padding:0 16px}.cc-grid{grid-template-columns:1fr}.cc-tagbar{flex-wrap:nowrap;overflow-x:auto;padding-bottom:10px;-webkit-overflow-scrolling:touch}.cc-tag{flex-shrink:0}}'
  ].join('\n');

  function ensureStyles() {
    if (document.getElementById('catalog-collection-styles')) return;
    var s = document.createElement('style');
    s.id = 'catalog-collection-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var EVT = 'mbcatalog:filter';
  var state = { tag: 'All', query: '', sort: 'newest' };

  function readData(el) {
    var node = document.querySelector(el.getAttribute('data-source') || '#catalog-data');
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (e) { return null; }
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICONS = {
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.3 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.8c.1.2 1.9 3 4.6 4.2.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z"/></svg>'
  };

  function cardHTML(p) {
    var msg = "Hi, I'd like a quote for " + p.sku + ' - ' + p.name;
    var href = 'https://wa.me/8615057960102?text=' + encodeURIComponent(msg);
    return '<article class="cc-card">'
      + '<div class="cc-media" aria-hidden="true">' + ICONS.img + '</div>'
      + '<div class="cc-body">'
      + '<div class="cc-meta">'
      + '<span class="cc-row cc-sku">' + ICONS.tag + 'SKU: ' + esc(p.sku) + '</span>'
      + '<span class="cc-row">' + ICONS.box + 'MOQ: ' + esc(p.moq) + '</span>'
      + '</div>'
      + '<h3 class="cc-name">' + esc(p.name) + '</h3>'
      + '<div class="cc-price">' + esc(p.price) + '</div>'
      + '<a class="cc-quote" href="' + href + '" target="_blank" rel="noopener noreferrer">' + ICONS.wa + 'Get a Quote</a>'
      + '</div></article>';
  }

  class CatalogTagbar extends HTMLElement {
    connectedCallback() {
      ensureStyles();
      var data = readData(this);
      if (!data) { this.innerHTML = ''; return; }
      var counts = {};
      (data.products || []).forEach(function (p) { counts[p.tag] = (counts[p.tag] || 0) + 1; });
      var html = '<div class="cc-wrap"><div class="cc-tagbar" role="tablist" aria-label="Sub-category filters">';
      html += '<button type="button" class="cc-tag' + (state.tag === 'All' ? ' is-active' : '') + '" data-tag="All">All</button>';
      (data.tags || []).forEach(function (t) {
        var n = counts[t] || 0;
        html += '<button type="button" class="cc-tag' + (state.tag === t ? ' is-active' : '') + '" data-tag="' + esc(t) + '">'
          + esc(t) + (n ? '<span class="cc-n">' + n + '</span>' : '') + '</button>';
      });
      html += '</div></div>';
      this.innerHTML = html;
      var self = this;
      this.querySelectorAll('.cc-tag').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.tag = btn.getAttribute('data-tag');
          self.querySelectorAll('.cc-tag').forEach(function (b) {
            b.classList.toggle('is-active', b.getAttribute('data-tag') === state.tag);
          });
          document.dispatchEvent(new CustomEvent(EVT));
        });
      });
    }
  }

  class CatalogGrid extends HTMLElement {
    connectedCallback() {
      this._data = readData(this);
      this.render();
      var self = this;
      document.addEventListener(EVT, function () { self.render(); });
      var search = document.getElementById('catalog-search');
      var sort = document.getElementById('catalog-sort');
      if (search && !search.dataset.ccBound) {
        search.dataset.ccBound = '1';
        search.addEventListener('input', function () {
          state.query = search.value.trim().toLowerCase();
          self.render();
        });
      }
      if (sort && !sort.dataset.ccBound) {
        sort.dataset.ccBound = '1';
        sort.addEventListener('change', function () {
          state.sort = sort.value;
          self.render();
        });
      }
    }
    render() {
      ensureStyles();
      var data = this._data;
      if (!data) { this.innerHTML = ''; return; }
      var list = (data.products || []).slice();
      if (state.tag && state.tag !== 'All') {
        list = list.filter(function (p) { return p.tag === state.tag; });
      }
      if (state.query) {
        list = list.filter(function (p) {
          return ((p.name || '') + ' ' + (p.sku || '') + ' ' + (p.tag || '')).toLowerCase().indexOf(state.query) !== -1;
        });
      }
      if (state.sort === 'price-asc') list.sort(function (a, b) { return a.priceN - b.priceN; });
      else if (state.sort === 'price-desc') list.sort(function (a, b) { return b.priceN - a.priceN; });
      else if (state.sort === 'moq-asc') list.sort(function (a, b) { return a.moqN - b.moqN; });
      var html = '<div class="cc-wrap"><div class="cc-grid">';
      html += list.length
        ? list.map(cardHTML).join('')
        : '<div class="cc-empty">No products match your search. Try another keyword or sub-category.</div>';
      html += '</div></div>';
      this.innerHTML = html;
    }
  }

  customElements.define('catalog-tagbar', CatalogTagbar);
  customElements.define('catalog-grid', CatalogGrid);
})();
