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
    
    const updateBrandIcon = (theme) => {
        if (!brandIcon) return;
        const currentSrc = brandIcon.getAttribute('src');
        const pathPrefix = currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
        brandIcon.src = pathPrefix + (theme === 'light' ? 'icon_dark.png' : 'icon.png');
    };
    
    if (themeToggle && sunIcon && moonIcon) {
        if (savedTheme === 'light' || (!savedTheme && !systemDark)) {
            document.documentElement.setAttribute('data-theme', 'light');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            updateBrandIcon('light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            updateBrandIcon('dark');
        }
    } else {
        const theme = savedTheme || (systemDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        updateBrandIcon(theme);
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
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }
            updateBrandIcon(newTheme);
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
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Coming Soon Modal System (Waitlist Integrated) ---
    const createModal = () => {
        const modal = document.createElement('div');
        modal.className = 'coming-soon-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-content-close-x" aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div class="showcase-badge">Sovereign AI</div>
                <h2 class="waitlist-title">Join the Waitlist</h2>
                <p class="waitlist-subtitle">Be the first to try out the version when it live. Choose your preferred kernel versions.</p>
                
                <form id="modal-waitlist-form">
                    <div class="input-group">
                        <input type="email" class="waitlist-input" placeholder="Enter your email" required>
                    </div>
                    
                    <div class="platform-selection">
                        <p class="platform-selection-label">Target Kernels</p>
                        <div class="platform-grid">
                            <label class="platform-option">
                                <input type="checkbox" name="platform" value="macos">
                                <span>macOS</span>
                            </label>
                            <label class="platform-option">
                                <input type="checkbox" name="platform" value="windows">
                                <span>Windows</span>
                            </label>
                             <label class="platform-option">
                                 <input type="checkbox" name="platform" value="android">
                                 <span>Android</span>
                             </label>
                             <label class="platform-option">
                                 <input type="checkbox" name="platform" value="ios">
                                 <span>iOS</span>
                             </label>
                             <label class="platform-option">
                                 <input type="checkbox" name="platform" value="linux">
                                 <span>Linux</span>
                             </label>
                        </div>
                    </div>
                    
                    <button type="submit" class="waitlist-submit">Reserve Spot</button>
                </form>

                <div id="waitlist-success-content" style="display: none;">
                    <div class="success-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <h3 class="waitlist-title">You're on the list!</h3>
                    <p class="waitlist-subtitle">We'll notify you as soon as the kernel for your selected platforms is ready for testing.</p>
                    <button class="modal-close">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const form = modal.querySelector('#modal-waitlist-form');
        const success = modal.querySelector('#waitlist-success-content');
        const badge = modal.querySelector('.showcase-badge');
        const title = modal.querySelector('.waitlist-title');
        const subtitle = modal.querySelector('.waitlist-subtitle');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                // Reset state after transition
                form.style.display = 'block';
                success.style.display = 'none';
                badge.style.display = 'inline-flex';
                title.style.display = 'block';
                subtitle.style.display = 'block';
                form.reset();
            }, 400);
        };

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-content-close-x').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const checked = form.querySelectorAll('input[name="platform"]:checked');
            if (checked.length === 0) {
                alert('Please select at least one kernel version.');
                return;
            }
            
            // Show success state
            form.style.display = 'none';
            badge.style.display = 'none';
            title.style.display = 'none';
            subtitle.style.display = 'none';
            success.style.display = 'block';
        });

        return modal;
    };

    let soonModal = null;

    document.querySelectorAll('.coming-soon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!soonModal) soonModal = createModal();
            
            // Small delay to ensure display:flex is handled before opacity
            soonModal.classList.add('active');
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

    // --- Navbar Scroll Effect ---
    const nav = document.querySelector('.nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }
});
