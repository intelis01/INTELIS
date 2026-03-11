/**
 * INTELIS Landing Page – Main entry point
 * Initializes all interactive modules.
 */

import { initParticles }     from './particles.js';
import { initAnimations }    from './animations.js';
import { initCounters }      from './counter.js';
import { initAccordion }     from './accordion.js';
import { initNav, initBillingToggle } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initBillingToggle();
  initAnimations();
  initCounters();
  initAccordion();
  initParticles();
});
