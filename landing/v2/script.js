(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const year = document.querySelector('#year');
  const header = document.querySelector('.site-header.nav');
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('#mobileNav');
  const mobileClose = document.querySelector('.mobile-nav-close');
  const mobileLinks = document.querySelectorAll('.mobile-nav-links a, .mobile-nav-cta');
  const media = window.matchMedia('(prefers-color-scheme: light)');

  const storedTheme = (() => {
    try {
      return localStorage.getItem('lucaos-v2-theme');
    } catch {
      return null;
    }
  })();

  const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : media.matches ? 'light' : 'dark';

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    metaTheme.setAttribute('content', theme === 'dark' ? '#08090b' : '#f6f7f9');
  };

  applyTheme(initialTheme);

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const setMobileNav = (open) => {
    if (!mobileNav || !hamburger) return;
    mobileNav.classList.toggle('open', open);
    mobileNav.setAttribute('aria-hidden', String(!open));
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger?.addEventListener('click', () => {
    setMobileNav(!mobileNav?.classList.contains('open'));
  });

  mobileClose?.addEventListener('click', () => setMobileNav(false));
  mobileLinks.forEach((link) => link.addEventListener('click', () => setMobileNav(false)));

  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });

  toggle.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try {
      localStorage.setItem('lucaos-v2-theme', theme);
    } catch {
      // Theme remains active for this page view when storage is unavailable.
    }
  });
})();
