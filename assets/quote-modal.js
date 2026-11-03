/* Shared quote modal - open/close and product prefill */
(function () {
  function openQuoteModal(sku, name) {
    var modal = document.getElementById('quoteModal');
    if (!modal) return;
    if (!sku) {
      var s = document.querySelector('.pdp-sku-line b') || document.querySelector('.sku-line b');
      if (s) sku = s.textContent.trim();
    }
    if (!name) {
      var h = document.querySelector('h1');
      if (h) name = h.textContent.trim();
    }
    var skuField = document.getElementById('qSkuView');
    var nameField = document.getElementById('qProductView');
    var source = document.getElementById('qSource');
    if (skuField) skuField.value = sku || '';
    if (nameField) nameField.value = name || '';
    if (source) source.value = location.href;
    var category = modal.getAttribute('data-category');
    var categoryField = document.getElementById('qCategory');
    if (category && categoryField) {
      for (var i = 0; i < categoryField.options.length; i++) {
        if (categoryField.options[i].textContent.trim() === category) {
          categoryField.selectedIndex = i;
          break;
        }
      }
    }
    modal.classList.add('open');
  }

  function closeQuoteModal(e) {
    var modal = document.getElementById('quoteModal');
    if (!modal) return;
    if (e && e.target !== modal) return;
    modal.classList.remove('open');
  }

  window.openQuoteModal = openQuoteModal;
  window.closeQuoteModal = closeQuoteModal;

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeQuoteModal();
  });
})();
