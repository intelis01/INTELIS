/**
 * Animated number counters
 * Elements must have data-counter-end (number) and optionally data-suffix / data-prefix.
 * Animation triggers once when element enters viewport.
 */

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCounter(el, end, duration, prefix, suffix) {
  const start     = 0;
  const startTime = performance.now();

  function format(val) {
    if (val >= 1000) {
      return prefix + (val / 1000).toFixed(1).replace('.0', '') + 'k' + suffix;
    }
    return prefix + Math.round(val) + suffix;
  }

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value    = start + (end - start) * easeOut(progress);

    el.textContent = format(value);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = format(end);
    }
  }

  requestAnimationFrame(step);
}

export function initCounters() {
  const elements = document.querySelectorAll('[data-counter-end]');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el     = entry.target;
        const end    = parseFloat(el.dataset.counterEnd);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix !== undefined ? el.dataset.suffix : '';

        animateCounter(el, end, 1800, prefix, suffix);
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  elements.forEach(el => observer.observe(el));
}
