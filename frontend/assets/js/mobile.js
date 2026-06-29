/* mobile.js — FortisPH hamburger sidebar toggle */
(function () {
  'use strict';

  function init() {
    const ticker = document.getElementById('ticker-bar');
    if (!ticker) return;

    /* ── Inject hamburger button ── */
    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.setAttribute('aria-label', 'Toggle navigation');
    btn.innerHTML = '&#9776;'; /* ☰ */
    btn.addEventListener('click', toggleSidebar);

    /* Insert as FIRST child of ticker-bar so it appears on the left */
    ticker.insertBefore(btn, ticker.firstChild);

    /* ── Inject overlay ── */
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
    window._mobOverlay = overlay;

    /* ── Close sidebar on nav-item click (mobile) ── */
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.querySelectorAll('.nav-item').forEach(function (item) {
        item.addEventListener('click', function () {
          if (window.innerWidth <= 768) closeSidebar();
        });
      });
    }

    /* ── Handle resize: reset if desktop ── */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeSidebar();
    });
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('mob-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.add('mob-open');
    if (window._mobOverlay) window._mobOverlay.classList.add('mob-open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.remove('mob-open');
    if (window._mobOverlay) window._mobOverlay.classList.remove('mob-open');
    document.body.style.overflow = '';
  }

  /* Run after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
