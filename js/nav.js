/**
 * Navigation behavior:
 * - Sticky background on scroll
 * - Scroll-spy: highlights active nav link
 * - Mobile hamburger drawer
 * - Smooth scroll for anchor links
 * - Pricing toggle (monthly/annual)
 */

export function initNav() {
  const nav        = document.getElementById('main-nav');
  const hamburger  = document.getElementById('hamburger-btn');
  const drawer     = document.getElementById('mobile-drawer');
  const navLinks   = document.querySelectorAll('.nav__links .nav-link');
  const sections   = document.querySelectorAll('main section[id]');
  const drawerClose = document.querySelectorAll('[data-close-drawer]');

  // ── Sticky background ──────────────────────────────
  function onScroll() {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Scroll-spy ─────────────────────────────────────
  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(link => {
          const isActive = link.getAttribute('href') === `#${id}`;
          link.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
      });
    },
    { threshold: 0.35, rootMargin: `-${72}px 0px 0px 0px` }
  );
  sections.forEach(s => spyObserver.observe(s));

  // ── Mobile menu ────────────────────────────────────
  function openDrawer() {
    drawer.dataset.open = 'true';
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.dataset.open = 'false';
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    drawer.dataset.open === 'true' ? closeDrawer() : openDrawer();
  });

  drawerClose.forEach(el => {
    el.addEventListener('click', closeDrawer);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.dataset.open === 'true') closeDrawer();
  });

  // ── Smooth scroll ──────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = 72; // nav height
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// ── Pricing billing toggle ─────────────────────────
export function initBillingToggle() {
  const toggle         = document.getElementById('billing-toggle');
  const pricingSection = document.getElementById('pricing-section');
  const labelMonthly   = document.getElementById('label-monthly');
  const labelAnnual    = document.getElementById('label-annual');

  if (!toggle || !pricingSection) return;

  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      pricingSection.dataset.billing = 'annual';
      labelMonthly.classList.remove('active');
      labelAnnual.classList.add('active');
    } else {
      pricingSection.dataset.billing = 'monthly';
      labelMonthly.classList.add('active');
      labelAnnual.classList.remove('active');
    }
  });
}
