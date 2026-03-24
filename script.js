/* ==========================================================================
   STEWART & CO. PAINTING — Premium Script
   ========================================================================== */

(function() {
  'use strict';

  // ===== NAVIGATION =====
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  // Scroll: transparent → white
  function handleNavScroll() {
    nav.classList.toggle('nav--scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // Mobile toggle
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && navLinks.classList.contains('active')) {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ===== SERVICE CARD NUMBERS =====
  // Inject data-number attributes for the CSS ::before pseudo-elements
  document.querySelectorAll('.service-card').forEach((card, i) => {
    card.setAttribute('data-number', String(i + 1).padStart(2, '0'));
  });

  // ===== SCROLL REVEAL =====
  // Tag all revealable elements
  const revealSelectors = [
    '.section__tagline',
    '.section__title',
    '.service-card',
    '.gallery__item',
    '.ba-card',
    '.about__content .section__tagline',
    '.about__content .section__title',
    '.about__text',
    '.about__features',
    '.about .btn',
    '.cta-banner__card',
    '.contact__card',
    '.form__group',
    '.contact .btn',
  ];

  const revealEls = document.querySelectorAll(revealSelectors.join(','));
  revealEls.forEach(el => {
    if (!el.classList.contains('reveal')) {
      el.classList.add('reveal');
    }
  });

  // Hero elements get a different animation (slide from left)
  const heroEls = document.querySelectorAll(
    '.hero__tagline, .hero__title, .hero__subtitle, .hero__actions'
  );
  heroEls.forEach(el => el.classList.add('hero-reveal'));

  // Intersection Observer for scroll reveal
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stagger children within a parent
        const parent = entry.target.parentElement;
        const siblings = Array.from(parent.children).filter(
          c => c.classList.contains('reveal') || c.classList.contains('hero-reveal')
        );
        const index = siblings.indexOf(entry.target);
        const delay = Math.min(index * 150, 600); // max 600ms stagger

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal, .hero-reveal').forEach(el => {
    revealObserver.observe(el);
  });

  // ===== BEFORE/AFTER SLIDERS =====
  document.querySelectorAll('[data-ba-slider]').forEach(slider => {
    const beforeEl = slider.querySelector('[data-ba-before]');
    const divider = slider.querySelector('[data-ba-divider]');
    let isDragging = false;

    function setPosition(clientX) {
      const rect = slider.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(2, Math.min(98, pct));
      beforeEl.style.width = pct + '%';
      divider.style.left = pct + '%';
    }

    function onStart(e) {
      e.preventDefault();
      isDragging = true;
    }

    function onMove(e) {
      if (!isDragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setPosition(x);
    }

    function onEnd() {
      isDragging = false;
    }

    slider.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    slider.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    slider.addEventListener('click', (e) => setPosition(e.clientX));

    // Sync before image to fill full slider width
    function syncSize() {
      const img = beforeEl.querySelector('img');
      if (img) {
        img.style.width = slider.offsetWidth + 'px';
        img.style.height = slider.offsetHeight + 'px';
        img.style.maxWidth = 'none';
      }
    }
    syncSize();
    let syncTimer;
    window.addEventListener('resize', function() {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncSize, 150);
    }, { passive: true });
  });

  // ===== CONTACT FORM =====
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot check
      const honeypot = contactForm.querySelector('input[name="website"]');
      if (honeypot && honeypot.value) {
        return;
      }

      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData);
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(response => {
        if (response.ok) {
          contactForm.innerHTML = `
            <div class="form__success active">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h3>Request Received</h3>
              <p>Thank you, ${data.name || ''}. We'll be in touch within 24 hours.</p>
              <p style="margin-top: 20px;"><a href="tel:+19025802665" style="color: var(--accent); font-family: var(--font-display); font-size: 24px;">(902) 580-2665</a></p>
            </div>
          `;
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Quote Request';
          alert('Something went wrong. Please try again or call us directly.');
        }
      }).catch(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Quote Request';
        alert('Something went wrong. Please try again or call us directly.');
      });
    });
  }

  // ===== GALLERY SCROLL =====
  const galleryScroll = document.querySelector('.gallery__scroll');
  const galleryPages = document.querySelectorAll('.gallery__page');
  const galleryDotsContainer = document.querySelector('.gallery__dots');
  const arrowLeft = document.querySelector('.gallery__arrow--left');
  const arrowRight = document.querySelector('.gallery__arrow--right');
  let currentPage = 0;

  // Build dot indicators
  galleryPages.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'gallery__dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Go to gallery page ' + (i + 1));
    dot.addEventListener('click', () => scrollToPage(i));
    galleryDotsContainer.appendChild(dot);
  });

  function scrollToPage(index) {
    const page = galleryPages[index];
    if (page) {
      galleryScroll.scrollTo({ left: page.offsetLeft, behavior: 'smooth' });
    }
  }

  function updateGalleryState() {
    const scrollLeft = galleryScroll.scrollLeft;
    const pageWidth = galleryScroll.offsetWidth;
    currentPage = Math.round(scrollLeft / pageWidth);

    // Update dots
    galleryDotsContainer.querySelectorAll('.gallery__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPage);
    });

    // Update arrows
    arrowLeft.disabled = currentPage === 0;
    arrowRight.disabled = currentPage === galleryPages.length - 1;
  }

  galleryScroll.addEventListener('scroll', updateGalleryState, { passive: true });
  arrowLeft.addEventListener('click', () => scrollToPage(currentPage - 1));
  arrowRight.addEventListener('click', () => scrollToPage(currentPage + 1));
  updateGalleryState();

  // ===== LIGHTBOX =====
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox__img');
  const lightboxCaption = lightbox.querySelector('.lightbox__caption');
  const lightboxClose = lightbox.querySelector('.lightbox__close');
  const lightboxPrev = lightbox.querySelector('.lightbox__prev');
  const lightboxNext = lightbox.querySelector('.lightbox__next');
  const galleryItems = document.querySelectorAll('[data-lightbox]');
  let currentLightboxIndex = 0;

  function openLightbox(index) {
    currentLightboxIndex = index;
    const item = galleryItems[index];
    lightboxImg.src = item.getAttribute('data-lightbox');
    lightboxImg.alt = item.getAttribute('data-caption') || '';
    lightboxCaption.textContent = item.getAttribute('data-caption') || '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showPrev() {
    currentLightboxIndex = (currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentLightboxIndex);
  }

  function showNext() {
    currentLightboxIndex = (currentLightboxIndex + 1) % galleryItems.length;
    openLightbox(currentLightboxIndex);
  }

  galleryItems.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
  lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  // ===== SMOOTH ANCHOR SCROLLING (fallback) =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

})();
