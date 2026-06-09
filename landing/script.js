document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const themeToggle = document.querySelector('.theme-toggle');
  const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
  const themeImages = document.querySelectorAll('[data-dark-src][data-light-src]');

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f7f8fb' : '#050507');
    themeToggle?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    themeImages.forEach((image) => {
      image.src = theme === 'light' ? image.dataset.lightSrc : image.dataset.darkSrc;
    });
  };

  applyTheme(root.dataset.theme || 'dark');
  themeToggle?.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('lucaos-theme', nextTheme);
    applyTheme(nextTheme);
  });
  systemTheme.addEventListener('change', (event) => {
    if (!localStorage.getItem('lucaos-theme')) applyTheme(event.matches ? 'light' : 'dark');
  });

  const mobileToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  const closeMobileMenu = () => {
    if (!mobileToggle || !mobileMenu) return;
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.setAttribute('aria-label', 'Open menu');
    mobileMenu.hidden = true;
  };
  mobileToggle?.addEventListener('click', () => {
    const isOpen = mobileToggle.getAttribute('aria-expanded') === 'true';
    mobileToggle.setAttribute('aria-expanded', String(!isOpen));
    mobileToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    mobileMenu.hidden = isOpen;
  });
  mobileMenu?.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', closeMobileMenu));

  document.querySelectorAll('.nav-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.nav-trigger').forEach((item) => item.setAttribute('aria-expanded', 'false'));
      trigger.setAttribute('aria-expanded', String(!expanded));
    });
  });

  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;
  document.querySelectorAll('.reveal').forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('visible');
  });

  const modal = document.querySelector('[data-waitlist-modal]');
  const modalPanel = modal?.querySelector('.waitlist-modal');
  const closeButton = modal?.querySelector('[data-close-waitlist]');
  const waitlistForm = modal?.querySelector('[data-waitlist-form]');
  const waitlistSuccess = modal?.querySelector('[data-waitlist-success]');
  let lastFocusedElement = null;

  const openModal = () => {
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('active');
      closeButton?.focus();
    });
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    window.setTimeout(() => {
      modal.hidden = true;
      lastFocusedElement?.focus?.();
    }, 200);
  };

  document.querySelectorAll('[data-open-waitlist]').forEach((button) => button.addEventListener('click', openModal));
  closeButton?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    if (event.key === 'Tab' && modal && !modal.hidden) {
      const focusable = [...modalPanel.querySelectorAll('button, a, input')].filter((element) => !element.disabled && !element.hidden);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  waitlistForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedInterests = waitlistForm.querySelectorAll('input[name="interest"]:checked');
    if (!selectedInterests.length) {
      waitlistForm.querySelector('input[name="interest"]')?.focus();
      return;
    }
    localStorage.setItem('lucaos-early-access-interest', JSON.stringify([...selectedInterests].map((input) => input.value)));
    waitlistForm.hidden = true;
    waitlistSuccess.hidden = false;
    waitlistSuccess.querySelector('a')?.focus();
  });
});
