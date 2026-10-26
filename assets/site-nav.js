/* Standard Milebond site navigation behaviour — shared by legacy pages */
(function () {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;

  function updateNav() {
    if (window.scrollY > 8) navbar.classList.add('navbar-scrolled');
    else navbar.classList.remove('navbar-scrolled');
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  var toggle = document.getElementById('mobileToggle');
  var menu = document.getElementById('mobileMenu');
  var iconO = document.getElementById('iconOpen');
  var iconC = document.getElementById('iconClose');

  function openMenu() {
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    iconO.classList.add('hidden');
    iconC.classList.remove('hidden');
  }
  function closeMenu() {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    iconO.classList.remove('hidden');
    iconC.classList.add('hidden');
    document.querySelectorAll('#navbar .mobile-services.open').forEach(function (el) {
      el.classList.remove('open');
      var h = el.querySelector('.ms-head');
      if (h) h.setAttribute('aria-expanded', 'false');
    });
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  document.querySelectorAll('#navbar .mobile-services').forEach(function (acc) {
    var head = acc.querySelector('.ms-head');
    if (!head) return;
    head.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = acc.classList.toggle('open');
      head.setAttribute('aria-expanded', String(isOpen));
    });
  });

  var megaItems = Array.prototype.slice.call(document.querySelectorAll('#navbar .services-mega'));
  function closeMega(except) {
    megaItems.forEach(function (li) {
      if (li === except) return;
      li.classList.remove('open');
      var b = li.querySelector('.mega-trigger');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  megaItems.forEach(function (li) {
    var btn = li.querySelector('.mega-trigger');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (btn.tagName === 'A') return;
      e.preventDefault();
      var willOpen = !li.classList.contains('open');
      closeMega(li);
      li.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        li.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
    li.addEventListener('mouseenter', function () {
      btn.setAttribute('aria-expanded', 'true');
    });
    li.addEventListener('mouseleave', function () {
      if (!li.classList.contains('open')) btn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMega(null);
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.services-mega')) closeMega(null);
  });
})();
