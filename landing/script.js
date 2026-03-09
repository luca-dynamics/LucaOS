/* ========================================
   LUCA OS - SOVEREIGN SCRIPTS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle ---
    const themeToggle = document.querySelector('.theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const brandIcon = document.querySelector('.nav-brand .brand-icon');
    
    if (savedTheme === 'light' || (!savedTheme && !systemDark)) {
        document.documentElement.setAttribute('data-theme', 'light');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        if (brandIcon) brandIcon.src = 'icon_dark.png';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        if (brandIcon) brandIcon.src = 'icon.png';
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (newTheme === 'light') {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
                if (brandIcon) brandIcon.src = 'icon_dark.png';
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
                if (brandIcon) brandIcon.src = 'icon.png';
            }
        });
    }

    // --- Scroll Reveal ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Apply to sections
    document.querySelectorAll('.feature-section, .showcase-section, .waitlist-container').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });

    // Apply to cards with stagger
    document.querySelectorAll('.feature-card, .showcase-feature').forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.classList.contains('coming-soon-btn')) return; // handled below
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Coming Soon Buttons ---
    document.querySelectorAll('.coming-soon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert("Coming Soon..");
        });
    });

    // --- Form Submission (Placeholder) ---
    const form = document.querySelector('.waitlist-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('input');
            if (input && input.value) {
                alert('Thank you for joining the waitlist!');
                input.value = '';
            }
        });
    }
});
