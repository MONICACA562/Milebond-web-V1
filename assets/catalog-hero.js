/* 可复用目录 Hero 组件
 * 用法：
 * <catalog-hero title="分类名称 — China Wholesale Catalog" subtitle="分类副文"></catalog-hero>
 * 可选属性：label（小标签文字）、search-target（搜索框 id，默认 catalog-search）
 * 小标签、按钮、四个统计项保持全站目录页一致，仅 title / subtitle 按分类替换。
 */
(function () {
  if (customElements.get('catalog-hero')) return;

  const HERO_STYLES = `
    catalog-hero{display:block;font-family:'Inter',system-ui,-apple-system,sans-serif}
    catalog-hero .mbc-hero{
      background:linear-gradient(135deg,#0f1e3d 0%,#16294d 100%);
      color:#fff;
      padding:36px 24px 32px;
      text-align:center;
    }
    catalog-hero .mbc-inner{max-width:960px;margin:0 auto}
    catalog-hero .mbc-eyebrow{
      display:inline-flex;align-items:center;gap:8px;
      color:#8fb8e8;
      font-size:11px;font-weight:600;
      letter-spacing:.14em;text-transform:uppercase;line-height:1.2;
      margin:0;
    }
    catalog-hero .mbc-eyebrow svg{width:14px;height:14px;flex-shrink:0}
    catalog-hero .mbc-title{
      margin:14px auto 0;max-width:900px;
      color:#fff;
      font-family:inherit;
      font-size:clamp(24px,3.6vw,32px);
      font-weight:800;line-height:1.15;letter-spacing:-.02em;
    }
    catalog-hero .mbc-subtitle{
      margin:12px auto 0;max-width:680px;
      color:#b8c8e0;
      font-size:14px;line-height:1.55;
    }
    catalog-hero .mbc-actions{
      display:flex;flex-wrap:wrap;justify-content:center;gap:10px;
      margin-top:20px;
    }
    catalog-hero .mbc-btn{
      display:inline-flex;align-items:center;justify-content:center;gap:6px;
      padding:9px 18px;border-radius:7px;border:1px solid transparent;
      font-family:inherit;font-size:13px;font-weight:600;line-height:1.2;
      text-decoration:none;cursor:pointer;
      transition:background-color .18s ease,border-color .18s ease,color .18s ease;
    }
    catalog-hero .mbc-btn svg{width:14px;height:14px;flex-shrink:0}
    catalog-hero .mbc-btn-primary{background:#2563eb;color:#fff}
    catalog-hero .mbc-btn-primary:hover{background:#1d4ed8}
    catalog-hero .mbc-btn-outline{background:transparent;color:#fff;border-color:rgba(255,255,255,.55)}
    catalog-hero .mbc-btn-outline:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.8)}
    catalog-hero .mbc-divider{
      margin-top:24px;padding-top:18px;
      border-top:1px solid rgba(255,255,255,.1);
    }
    catalog-hero .mbc-stats{
      display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
      gap:16px;max-width:820px;margin:0 auto;
    }
    catalog-hero .mbc-num{color:#fff;font-size:20px;font-weight:700;line-height:1.2}
    catalog-hero .mbc-lbl{margin-top:3px;color:#8fa8cc;font-size:11px;line-height:1.4}
    @media (max-width:640px){
      catalog-hero .mbc-hero{padding:32px 18px 28px}
      catalog-hero .mbc-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 12px}
    }`;

  const HERO_TEMPLATE = `
    <section class="mbc-hero" aria-label="Catalog hero">
      <div class="mbc-inner">
        <p class="mbc-eyebrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          <span class="mbc-label-text"></span>
        </p>
        <h1 class="mbc-title"></h1>
        <p class="mbc-subtitle"></p>
        <div class="mbc-actions">
          <button type="button" class="mbc-btn mbc-btn-primary mbc-search-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
            Search with Filters
          </button>
          <a class="mbc-btn mbc-btn-outline" href="mailto:info@milebond.com">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>
            Request a Custom Quote
          </a>
        </div>
        <div class="mbc-divider">
          <div class="mbc-stats">
            <div class="mbc-stat"><div class="mbc-num">10+</div><div class="mbc-lbl">Years of Amazon selection</div></div>
            <div class="mbc-stat"><div class="mbc-num">Weekly</div><div class="mbc-lbl">New product pushes</div></div>
            <div class="mbc-stat"><div class="mbc-num">50+</div><div class="mbc-lbl">Brands scaled</div></div>
            <div class="mbc-stat"><div class="mbc-num">100%</div><div class="mbc-lbl">QC for your first order</div></div>
          </div>
        </div>
      </div>
    </section>`;

  function ensureStyles() {
    if (document.getElementById('catalog-hero-styles')) return;
    const style = document.createElement('style');
    style.id = 'catalog-hero-styles';
    style.textContent = HERO_STYLES;
    document.head.appendChild(style);
  }

  class CatalogHero extends HTMLElement {
    static get observedAttributes() {
      return ['title', 'subtitle', 'label'];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      this.render();
    }

    render() {
      if (!this._built) {
        ensureStyles();
        this.innerHTML = HERO_TEMPLATE;
        this._built = true;
        this.querySelector('.mbc-search-btn').addEventListener('click', () => {
          const id = this.getAttribute('search-target') || 'catalog-search';
          const input = document.getElementById(id);
          if (!input) return;
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus({ preventScroll: true });
        });
      }
      const label = this.getAttribute('label') || 'CHINA WHOLESALE PRODUCT CATALOG';
      this.querySelector('.mbc-label-text').textContent = label;
      this.querySelector('.mbc-title').textContent = this.getAttribute('title') || '';
      this.querySelector('.mbc-subtitle').textContent = this.getAttribute('subtitle') || '';
    }
  }

  customElements.define('catalog-hero', CatalogHero);
})();
