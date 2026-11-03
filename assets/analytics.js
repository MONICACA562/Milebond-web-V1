/* Milebond site analytics — conversion events for GA4 / Clarity.
 *
 * NOTE: the GA4 property (G-K14PJKDC9H) and Clarity are already injected on every
 * page by functions/_middleware.js. Do NOT set GA4_ID here — that would load a
 * second gtag property and split the data. This file only defines the event
 * helper and the click / form tracking; events are forwarded to the gtag()
 * function created by the middleware.
 *
 * Events sent:
 *   generate_lead   — quote/inquiry form submitted (form_type: main | inline | modal | tool)
 *   lead_fallback   — /api/inquiry failed, submission sent through FormSubmit instead
 *   quote_modal_open— a CTA opened the on-page quote modal
 *   form_start      — first field focus inside a quote form
 *   whatsapp_click  — any wa.me / api.whatsapp.com link
 *   phone_click     — any tel: link
 *   email_click     — any mailto: link
 *   quote_cta_click — links to /free-quote, /contact-us, /tools/
 */
(function () {
  var GA4_ID = '';      /* e.g. 'G-XXXXXXXXXX' */
  var CLARITY_ID = '';  /* e.g. 'abcdefghij'   */

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) window.gtag = gtag;

  if (GA4_ID) {
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(ga);
    gtag('js', new Date());
    gtag('config', GA4_ID, { anonymize_ip: true });
  }

  if (CLARITY_ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  /* Single helper used by quote-form.js and this file.
     Prefers the gtag() created by functions/_middleware.js so events land in the
     same GA4 property as page views. */
  window.mbTrack = function (name, params) {
    params = params || {};
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
      return;
    }
    var payload = { event: name };
    for (var k in params) {
      if (Object.prototype.hasOwnProperty.call(params, k)) payload[k] = params[k];
    }
    window.dataLayer.push(payload);
  };

  var path = function () { return window.location.pathname; };

  /* Outbound / CTA click tracking (delegated, works for dynamically added links). */
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') { el = el.parentElement; }
    if (!el) return;
    var href = el.getAttribute('href') || '';
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    var base = { link_text: label, page_path: path() };
    var opensModal = el.classList.contains('open-quote-modal') ||
      (el.classList.contains('psc-quote-btn') && typeof window.openQuoteModal === 'function');

    if (opensModal) {
      window.mbTrack('quote_modal_open', base);
    } else if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href.replace(/^\/\//, 'https://'))) {
      window.mbTrack('whatsapp_click', base);
    } else if (href.indexOf('tel:') === 0) {
      window.mbTrack('phone_click', base);
    } else if (href.indexOf('mailto:') === 0) {
      window.mbTrack('email_click', base);
    } else if (/\/(free-quote|contact-us|tools)(\/|$|#|\?)/.test(href)) {
      window.mbTrack('quote_cta_click', base);
    }
  }, true);

  /* Form start — first interaction with any quote form on the page. */
  document.addEventListener('focusin', function (e) {
    var form = e.target && e.target.closest ? e.target.closest('form[data-quote-form]') : null;
    if (!form || form.getAttribute('data-mb-start')) return;
    form.setAttribute('data-mb-start', '1');
    window.mbTrack('form_start', {
      form_type: form.getAttribute('data-form-type') || 'quote',
      page_path: path()
    });
  }, true);
})();
