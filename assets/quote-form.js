/* Shared quote / inquiry form handler — validation, file check, native FormSubmit post, lead event */
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
      var name = String(data.get('name') || '').trim();
      var email = String(data.get('email') || '').trim();
      var message = String(data.get('message') || '').trim();

      if (data.get('_honey')) {
        e.preventDefault();
        return;
      }
      if (!name) { e.preventDefault(); return fail('Please enter your name.'); }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        e.preventDefault();
        return fail('Please enter a valid email address.');
      }
      if (!data.get('category')) { e.preventDefault(); return fail('Please select a product category.'); }
      if (!data.get('service')) { e.preventDefault(); return fail('Please select the service you need.'); }
      if (!message) { e.preventDefault(); return fail('Please describe what you are sourcing.'); }
      if (!data.get('consent')) { e.preventDefault(); return fail('Please accept the privacy terms before sending.'); }
      if (file && file.files && file.files.length && file.files[0].size > MAX_FILE) {
        e.preventDefault();
        return fail('That file is larger than 10 MB. Please email it to info@milebond.com instead.');
      }

      if (pageUrl) pageUrl.value = window.location.href;
      if (source && !source.value) source.value = window.location.href;

      sending = true;
      if (btn) {
        btn.setAttribute('data-label', btn.textContent);
        btn.disabled = true;
        btn.textContent = 'Sending…';
      }

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'generate_lead', form_type: type });
      } catch (err) { /* noop */ }

      /* Native POST continues to https://formsubmit.co/... with all fields and attachments */
    });
  });
})();
