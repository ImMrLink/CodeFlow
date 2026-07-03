/* CodeFlow marketing site — minimal, dependency-free.
   Mobile nav toggle, smooth in-page scrolling, current year. */
(function () {
  'use strict';

  /* Current year in the footer */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');

  function closeMenu() {
    var wasOpen = toggle && toggle.getAttribute('aria-expanded') === 'true';
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    /* Restore focus to the toggle if it was inside the now-hidden menu. */
    if (wasOpen && menu && menu.contains(document.activeElement)) {
      toggle.focus();
    }
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      document.body.classList.toggle('nav-open', !open);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  /* Smooth scroll for same-page anchors (respects prefers-reduced-motion) */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('click', function (event) {
    var origin = event.target instanceof Element ? event.target : null;
    var link = origin ? origin.closest('a[href^="#"]') : null;
    if (!link) return;

    var id = link.getAttribute('href').slice(1);
    if (!id) {
      /* Placeholder links (href="#") — do nothing rather than jump to top. */
      event.preventDefault();
      return;
    }

    var target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    /* Keep the URL in sync and move focus for keyboard users. */
    if (window.history && window.history.pushState) {
      try {
        window.history.pushState(null, '', '#' + id);
      } catch (err) {
        /* Can throw SecurityError on file:// — ignore so focus handoff still runs. */
      }
    }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
})();
