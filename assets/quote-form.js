/* Shared quote / inquiry form handler — validation, POST /api/inquiry, FormSubmit fallback, lead events */
(function () {
  var MAX_FILE = 10 * 1024 * 1024;
  var forms = document.querySelectorAll('form[data-quote-form]');
  if (!forms.length) return;

  function captureUtm(form) {
    var field = form.querySelector('input[name="utm"]');
    if (!field) return;
    try {
      var params = new URLSearchParams(window.location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
      var parts = [];
      keys.forEach(function (k) {
        var v = params.get(k);
        if (v) parts.push(k + '=' + v);
      });
      if (parts.length) field.value = parts.join(' | ');
    } catch (e) { /* noop */ }
  }

  /* On a product detail page, pre-fill "What do you want to source?" from the page H1
     so the buyer only has to add email + quantity. */
  function prefillProduct(form) {
    var input = form.querySelector('input[name="product"]');
    if (!input || input.value) return;
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

  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('.qf-status');
    var btn = form.querySelector('.qf-submit');
    var file = form.querySelector('input[type="file"]');
    var source = form.querySelector('input[name="source_page"]');
    var pageUrl = form.querySelector('input[name="page_url"]');
    var type = form.getAttribute('data-form-type') || 'quote';
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

    captureUtm(form);
    if (pageUrl) pageUrl.value = window.location.href;
    prefillProduct(form);

    if (file) {
      file.addEventListener('change', function () {
        if (file.files && file.files.length && file.files[0].size > MAX_FILE) {
          file.value = '';
          setStatus('That file is larger than 10 MB. Please email it to info@milebond.com instead.', true);
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
        return fail('Please enter a valid email address so we can send your quote.');
      }
      if (!product) { e.preventDefault(); return fail('Please tell us what you want to source.'); }
      if (!data.get('consent')) { e.preventDefault(); return fail('Please accept the privacy terms before sending.'); }
      if (file && file.files && file.files.length && file.files[0].size > MAX_FILE) {
        e.preventDefault();
        return fail('That file is larger than 10 MB. Please email it to info@milebond.com instead.');
      }

      if (pageUrl) pageUrl.value = window.location.href;
      if (source && !source.value) source.value = window.location.href;

      e.preventDefault();
      sending = true;
      if (btn) {
        btn.setAttribute('data-label', btn.textContent);
        btn.disabled = true;
        btn.textContent = 'Sending…';
      }

      if (typeof window.mbTrack === 'function') {
        window.mbTrack('generate_lead', {
          form_type: type,
          product: product.slice(0, 80),
          page_path: window.location.pathname
        });
      }

      send(form);
    });

    /* Primary path: our own /api/inquiry endpoint (notification + auto-reply).
       Any failure falls back to the native FormSubmit POST so a lead is never lost. */
    function send(form) {
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
            window.location.href = '/thank-you';
            return;
          }
          if (res.status === 400) {
            sending = false;
            if (btn) { btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Send inquiry'; }
            fail('Something looks off with the form. Please check your email and try again.');
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
