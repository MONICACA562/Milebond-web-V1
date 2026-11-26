/* Shared quote / inquiry form handler — validation, POST /api/inquiry, FormSubmit fallback, lead events */
(function () {
  var MAX_FILE = 10 * 1024 * 1024;
  var forms = document.querySelectorAll('form[data-quote-form]');
  if (!forms.length) return;

  /* Attribution: the landing page records first touch sitewide
     (functions/_middleware.js). Here it is copied into hidden fields so every
     inquiry email carries where the buyer actually came from — including the
     case where they landed on a product page and only later opened the form. */
  var ATTR_KEY = 'mb_attr_v1';
  var ATTR_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'msclkid'];

  function ensureHidden(form, name) {
    var el = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.name = name;
      form.appendChild(el);
    }
    return el;
  }

  function channelOf(params, referrer) {
    var src = String(params.utm_source || '').toLowerCase();
    var med = String(params.utm_medium || '').toLowerCase();
    if (src) return med ? src + ' / ' + med : src;
    var host = '';
    try { host = new URL(referrer).hostname.replace(/^www\./, ''); } catch (e) { host = ''; }
    if (!host) return 'direct';
    if (/google\./.test(host)) return 'google organic';
    if (/bing\.|msn\./.test(host)) return 'bing organic';
    if (/chatgpt|openai|perplexity|copilot|claude|gemini/.test(host)) return 'ai assistant';
    if (/linkedin|lnkd\.in/.test(host)) return 'linkedin';
    if (/mail\.google|outlook|yahoo|qq\.com|163\.com/.test(host)) return 'webmail';
    return host;
  }

  function applyAttribution(form) {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null'); } catch (e) { stored = null; }

    var params = (stored && stored.p) || {};
    try {
      var q = new URLSearchParams(window.location.search);
      ATTR_PARAMS.forEach(function (k) {
        var v = q.get(k);
        if (v) params[k] = v;
      });
    } catch (e) { /* noop */ }

    var parts = [];
    Object.keys(params).forEach(function (k) {
      if (params[k]) parts.push(k + '=' + params[k]);
    });

    ensureHidden(form, 'utm').value = parts.join(' | ');
    ensureHidden(form, 'entry_page').value =
      (stored && stored.entry) || (window.location.pathname + window.location.search);
    ensureHidden(form, 'referrer').value = (stored && stored.ref) || document.referrer || '';
    ensureHidden(form, 'first_visit').value =
      stored && stored.t ? new Date(stored.t).toISOString().slice(0, 10) : '';
    ensureHidden(form, 'traffic').value =
      channelOf(params, (stored && stored.ref) || document.referrer || '');
  }

  /* On a product detail page, pre-fill "What do you want to source?" from the page H1
     so the buyer only has to add email + quantity. */
  function prefillProduct(form) {
    var input = form.querySelector('input[name="product"]');
    if (!input || input.value) return;
    /* Links that carry the request in the URL (e.g. the HS code page's per-row
       "Ask us") fill the field directly. */
    try {
      var qp = new URLSearchParams(window.location.search).get('product');
      if (qp) { input.value = qp.slice(0, 180); return; }
    } catch (e) { /* noop */ }
    if (!/^\/products\/[^/]+\/[^/]+/.test(window.location.pathname)) return;
    var h1 = document.querySelector('h1');
    if (!h1) return;
    var text = (h1.textContent || '').replace(/\s+/g, ' ').trim();
    if (text && text.length <= 90) input.value = text;
  }

  /* Category listing cards: "Get a Quote" opens the on-page modal with the
     product pre-filled instead of sending the buyer to WhatsApp. Falls back to
     the original WhatsApp link when the page has no modal. */
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('.psc-quote-btn') : null;
    if (!link || typeof window.openQuoteModal !== 'function') return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('wa.me') === -1) return;
    e.preventDefault();
    var m = href.match(/[?&]text=([^&]+)/);
    var text = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    var skuMatch = text.match(/\(SKU ([^)]+)\)/);
    var name = text.replace(/^Hi,\s*I'd like a sourcing quote for\s*/i, '')
      .replace(/\s*\(SKU [^)]+\)\s*$/, '').trim();
    window.openQuoteModal(skuMatch ? skuMatch[1] : '', name);
  }, true);

  /* Form messages follow the document language. English stays the default so
     existing English pages behave exactly as before. */
  var isGerman = /^de\b/i.test(document.documentElement.lang || '');
  var T = isGerman ? {
    email: 'Bitte geben Sie eine g\u00fcltige E-Mail-Adresse an, damit wir Ihnen das Angebot senden k\u00f6nnen.',
    product: 'Bitte geben Sie an, was wir beschaffen sollen.',
    consent: 'Bitte best\u00e4tigen Sie die Datenschutzbedingungen, bevor Sie senden.',
    file: 'Die Datei ist gr\u00f6\u00dfer als 10 MB. Bitte senden Sie sie per E-Mail an info@milebond.com.',
    bad: 'Mit dem Formular stimmt etwas nicht. Bitte pr\u00fcfen Sie Ihre E-Mail und versuchen Sie es erneut.',
    net: 'Netzwerkfehler. Bitte versuchen Sie es erneut oder schreiben Sie an info@milebond.com.',
    sending: 'Wird gesendet\u2026'
  } : {
    email: 'Please enter a valid email address so we can send your quote.',
    product: 'Please tell us what you want to source.',
    consent: 'Please accept the privacy terms before sending.',
    file: 'That file is larger than 10 MB. Please email it to info@milebond.com instead.',
    bad: 'Something looks off with the form. Please check your email and try again.',
    net: 'Network error. Please try again or email info@milebond.com.',
    sending: 'Sending\u2026'
  };

  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('.qf-status');
    var btn = form.querySelector('.qf-submit');
    var file = form.querySelector('input[type="file"]');
    var source = form.querySelector('input[name="source_page"]');
    var pageUrl = form.querySelector('input[name="page_url"]');
    var type = form.getAttribute('data-form-type') || 'quote';
    var thankYou = form.getAttribute('data-thank-you') || '/thank-you';
    var sending = false;

    function setStatus(msg, isError) {
      if (!status) return;
      status.textContent = msg || '';
      status.className = 'qf-status' + (isError ? ' err' : '');
    }

    function fail(msg) {
      setStatus(msg, true);
      return false;
    }

    applyAttribution(form);
    if (pageUrl) pageUrl.value = window.location.href;
    prefillProduct(form);

    if (file) {
      file.addEventListener('change', function () {
        if (file.files && file.files.length && file.files[0].size > MAX_FILE) {
          file.value = '';
          setStatus(T.file, true);
        } else {
          setStatus('', false);
        }
      });
    }

    form.addEventListener('submit', function (e) {
      if (sending) {
        e.preventDefault();
        return;
      }
      setStatus('', false);

      var data = new FormData(form);
      var email = String(data.get('email') || '').trim();
      var product = String(data.get('product') || '').trim();

      if (data.get('_honey')) {
        e.preventDefault();
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        e.preventDefault();
        return fail(T.email);
      }
      if (!product) { e.preventDefault(); return fail(T.product); }
      if (!data.get('consent')) { e.preventDefault(); return fail(T.consent); }
      if (file && file.files && file.files.length && file.files[0].size > MAX_FILE) {
        e.preventDefault();
        return fail(T.file);
      }

      if (pageUrl) pageUrl.value = window.location.href;
      if (source && !source.value) source.value = window.location.href;

      e.preventDefault();
      sending = true;
      if (btn) {
        btn.setAttribute('data-label', btn.textContent);
        btn.disabled = true;
        btn.textContent = T.sending;
      }

      if (typeof window.mbTrack === 'function') {
        window.mbTrack('form_submit_start', {
          form_type: type,
          page_path: window.location.pathname,
          language: isGerman ? 'de' : 'en'
        });
      }

      send(form, product);
    });

    /* Primary path: our own /api/inquiry endpoint (notification + auto-reply).
       Any failure falls back to the native FormSubmit POST so a lead is never lost. */
    function send(form, productText) {
      var skipApi = false;
      try { skipApi = sessionStorage.getItem('mbApiDown') === '1'; } catch (err) { /* noop */ }
      if (skipApi || !window.fetch) { fallback(form); return; }

      var controller = window.AbortController ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

      fetch('/api/inquiry', {
        method: 'POST',
        body: new FormData(form),
        credentials: 'same-origin',
        signal: controller ? controller.signal : undefined,
        headers: { 'X-Requested-With': 'fetch' }
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.ok && body && body.ok) {
            if (typeof window.mbTrack === 'function') {
              window.mbTrack('generate_lead', {
                form_type: type,
                product: productText.slice(0, 80),
                page_path: window.location.pathname,
                language: isGerman ? 'de' : 'en'
              });
              if (isGerman) {
                window.mbTrack('german_form_submit_success', {
                  form_type: type,
                  page_path: window.location.pathname
                });
              }
            }
            window.location.href = thankYou;
            return;
          }
          if (res.status === 400) {
            sending = false;
            if (btn) { btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Send inquiry'; }
            fail(T.bad);
            return;
          }
          fallback(form);
        });
      }).catch(function () {
        if (timer) clearTimeout(timer);
        fallback(form);
      });
    }

    function fallback(form) {
      try { sessionStorage.setItem('mbApiDown', '1'); } catch (err) { /* noop */ }
      if (typeof window.mbTrack === 'function') {
        window.mbTrack('lead_fallback', { form_type: type, page_path: window.location.pathname });
      }
      /* Native submit bypasses this listener and posts to FormSubmit. */
      HTMLFormElement.prototype.submit.call(form);
    }
  });
})();
