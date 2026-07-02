document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeToggle = document.querySelector('.theme-toggle');

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0c0c0a' : '#ffffff');
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  };

  // The inline head script already set the initial theme; sync labels/meta to it.
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('lucaos-v3-theme', next); } catch (e) { /* storage unavailable */ }
    });
  }

  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('mobileMenu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    });
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  const eaForm = document.getElementById('eaForm');
  if (eaForm) {
    eaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = document.getElementById('eaSuccess');
      eaForm.hidden = true;
      if (success) success.hidden = false;
    });
  }

  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach((el) => io.observe(el));
      // Degenerate viewport (0-height embeds, some prerenderers): show everything.
      if (!window.innerHeight) revealEls.forEach((el) => el.classList.add('in'));
    } else {
      revealEls.forEach((el) => el.classList.add('in'));
    }
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
});
