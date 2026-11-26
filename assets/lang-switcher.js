/* Milebond language switcher — data-driven header component.
   Renders only locales whose status is "live" in data/i18n-pages.json.
   Supports several mounts per page (desktop nav + mobile drawer); if fewer than
   two locales are live, every mount is removed so no empty control is shown.
   Markup:
   <div data-mb-lang-switcher data-label="Language" data-hint="..."></div>
   Styles: assets/lang-switcher.css (also carries the shared header breakpoints). */
(function () {
  'use strict';

  var mounts = [].slice.call(document.querySelectorAll('[data-mb-lang-switcher]'));
  if (!mounts.length) return;

  function normalize(value) {
    var s = String(value || '').split('?')[0].split('#')[0];
    s = s.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (s.length > 1) s = s.replace(/\/+$/, '');
    return s || '/';
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function render(mount, registry, liveCodes) {
    var locales = registry.locales || {};
    var here = normalize(window.location.pathname);
    var currentPage = (registry.pages || []).filter(function (page) {
      return Object.keys(page.translations || {}).some(function (code) {
        return normalize(page.translations[code].path) === here;
      });
    })[0];

    var currentCode = registry.defaultLocale;
    if (currentPage) {
      Object.keys(currentPage.translations).forEach(function (code) {
        if (normalize(currentPage.translations[code].path) === here) currentCode = code;
      });
    }

    var label = mount.getAttribute('data-label') || 'Language';
    var hint = mount.getAttribute('data-hint') || 'This page is not available in this language yet.';

    var nav = make('nav', 'mb-lang');
    nav.setAttribute('aria-label', label);

    var sr = make('span', 'mb-lang__label', label);
    nav.appendChild(sr);

    liveCodes.forEach(function (code, index) {
      var locale = locales[code];
      var translation = currentPage && currentPage.translations && currentPage.translations[code];
      var hasPage = !!(translation && translation.status === 'live');
      var href = hasPage ? translation.path : locale.home;

      if (index > 0) {
        var sep = make('span', 'mb-lang__sep', '\u00b7');
        sep.setAttribute('aria-hidden', 'true');
        nav.appendChild(sep);
      }

      if (code === currentCode) {
        var current = make('span', 'mb-lang__current', locale.label);
        current.lang = locale.htmlLang;
        current.setAttribute('aria-current', 'true');
        nav.appendChild(current);
        return;
      }

      var link = make('a', '', locale.label);
      link.href = href;
      link.lang = locale.htmlLang;
      link.hreflang = locale.htmlLang;
      if (!hasPage) {
        link.title = hint;
        link.setAttribute('aria-description', hint);
      }
      link.addEventListener('click', function () {
        if (typeof window.mbTrack === 'function') {
          window.mbTrack('language_switch_click', { from: currentCode, to: code, fallback: !hasPage });
        }
      });
      nav.appendChild(link);
    });

    mount.textContent = '';
    mount.appendChild(nav);
  }

  fetch('/data/i18n-pages.json', { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('registry unavailable');
      return response.json();
    })
    .then(function (registry) {
      var locales = registry.locales || {};
      var liveCodes = Object.keys(locales).filter(function (code) {
        return locales[code] && locales[code].status === 'live';
      });
      if (liveCodes.length < 2) {
        mounts.forEach(function (mount) {
          if (mount.parentNode) mount.parentNode.removeChild(mount);
        });
        return;
      }
      mounts.forEach(function (mount) { render(mount, registry, liveCodes); });
    })
    .catch(function () {
      /* Leave every page exactly as authored if the registry cannot be read. */
    });
})();
