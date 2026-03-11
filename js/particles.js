/**
 * Hero canvas background – floating gradient orbs
 * Respects prefers-reduced-motion
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || prefersReducedMotion) return;

  const ctx = canvas.getContext('2d');
  let rafId;
  let orbs = [];

  function resize() {
    const parent = canvas.parentElement;
    canvas.width  = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    createOrbs();
  }

  function createOrbs() {
    orbs = [
      { x: canvas.width * 0.15, y: canvas.height * 0.3,  r: 220, vx: 0.15, vy: 0.08,  alpha: 0.06 },
      { x: canvas.width * 0.8,  y: canvas.height * 0.2,  r: 280, vx: -0.1, vy: 0.12,  alpha: 0.04 },
      { x: canvas.width * 0.5,  y: canvas.height * 0.7,  r: 180, vx: 0.12, vy: -0.09, alpha: 0.05 },
      { x: canvas.width * 0.9,  y: canvas.height * 0.75, r: 140, vx: -0.08, vy: -0.1, alpha: 0.07 },
    ];
  }

  function drawOrb(orb) {
    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    grad.addColorStop(0,   `rgba(0, 200, 150, ${orb.alpha})`);
    grad.addColorStop(0.5, `rgba(0, 200, 150, ${orb.alpha * 0.5})`);
    grad.addColorStop(1,   'rgba(0, 200, 150, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    orbs.forEach(orb => {
      orb.x += orb.vx;
      orb.y += orb.vy;

      // Wrap around
      if (orb.x < -orb.r) orb.x = canvas.width + orb.r;
      if (orb.x > canvas.width + orb.r)  orb.x = -orb.r;
      if (orb.y < -orb.r) orb.y = canvas.height + orb.r;
      if (orb.y > canvas.height + orb.r) orb.y = -orb.r;

      drawOrb(orb);
    });

    rafId = requestAnimationFrame(tick);
  }

  // Stop animation when hero is off-screen
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
  }, { threshold: 0 });

  observer.observe(canvas.parentElement);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize();
}
