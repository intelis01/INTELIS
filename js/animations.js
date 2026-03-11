/**
 * Scroll-reveal system via IntersectionObserver
 * Elements with class "reveal" animate in when they enter the viewport.
 * Stagger via data-delay="ms" attribute.
 */

export function initAnimations() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);

        setTimeout(() => {
          el.classList.add('reveal--visible');
        }, delay);

        observer.unobserve(el); // Fire once
      });
    },
    {
      threshold:   0.12,
      rootMargin: '0px 0px -48px 0px',
    }
  );

  elements.forEach(el => observer.observe(el));
}
