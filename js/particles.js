/**
 * Aurora canvas – multi-color iridescent orbs
 * Respects prefers-reduced-motion
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || prefersReducedMotion) return;

  const ctx = canvas.getContext('2d');
  let rafId = null;
  let orbs = [];
  let t = 0;

  /* Color definitions for each orb: [r, g, b] */
  const COLORS = [
    [0,  229, 168],   // iris green
    [0,  212, 255],   // iris cyan
    [139, 92, 246],   // iris purple
    [236, 72, 153],   // iris pink
    [0,  180, 255],   // iris blue
    [0,  229, 168],   // iris green (second)
  ];

  function resize() {
    const parent = canvas.parentElement;
    canvas.width  = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    createOrbs();
  }

  function createOrbs() {
    const w = canvas.width;
    const h = canvas.height;
    orbs = [
      { x: w * 0.15, y: h * 0.35, r: 280, vx:  0.12, vy:  0.07,  color: COLORS[0], alpha: 0.07, phase: 0 },
      { x: w * 0.82, y: h * 0.22, r: 320, vx: -0.09, vy:  0.10,  color: COLORS[1], alpha: 0.05, phase: 1 },
      { x: w * 0.55, y: h * 0.72, r: 240, vx:  0.10, vy: -0.08,  color: COLORS[2], alpha: 0.055, phase: 2 },
      { x: w * 0.88, y: h * 0.78, r: 180, vx: -0.07, vy: -0.09,  color: COLORS[3], alpha: 0.04, phase: 3 },
      { x: w * 0.40, y: h * 0.15, r: 200, vx:  0.08, vy:  0.11,  color: COLORS[4], alpha: 0.045, phase: 4 },
      { x: w * 0.70, y: h * 0.55, r: 160, vx: -0.11, vy:  0.06,  color: COLORS[5], alpha: 0.05, phase: 5 },
    ];
  }

  function drawOrb(orb, time) {
    const pulse = 1 + 0.15 * Math.sin(time * 0.0008 + orb.phase * 1.2);
    const r = orb.r * pulse;
    const [cr, cg, cb] = orb.color;

    /* Slowly shift hue over time per orb */
    const hShift = (time * 0.0003 + orb.phase * 0.5) % (Math.PI * 2);
    const rf = Math.round(cr + 40 * Math.sin(hShift));
    const gf = Math.round(cg + 20 * Math.cos(hShift * 1.3));
    const bf = Math.round(cb + 30 * Math.sin(hShift * 0.7));

    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r);
    grad.addColorStop(0,   `rgba(${rf},${gf},${bf},${orb.alpha})`);
    grad.addColorStop(0.4, `rgba(${rf},${gf},${bf},${orb.alpha * 0.55})`);
    grad.addColorStop(0.75,`rgba(${rf},${gf},${bf},${orb.alpha * 0.15})`);
    grad.addColorStop(1,   `rgba(${rf},${gf},${bf},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function tick(timestamp) {
    t = timestamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    orbs.forEach(orb => {
      /* Subtle sine wander on top of linear drift */
      orb.x += orb.vx + 0.06 * Math.sin(t * 0.0004 + orb.phase);
      orb.y += orb.vy + 0.04 * Math.cos(t * 0.0005 + orb.phase);

      /* Wrap around */
      if (orb.x < -orb.r) orb.x = canvas.width + orb.r;
      if (orb.x > canvas.width + orb.r)  orb.x = -orb.r;
      if (orb.y < -orb.r) orb.y = canvas.height + orb.r;
      if (orb.y > canvas.height + orb.r) orb.y = -orb.r;

      drawOrb(orb, t);
    });

    rafId = requestAnimationFrame(tick);
  }

  /* Pause when hero off-screen */
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
