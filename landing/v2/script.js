(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
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
