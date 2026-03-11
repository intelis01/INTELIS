/**
 * FAQ Accordion – smooth max-height animation, single-open mode
 */

export function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');
  if (!triggers.length) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const isOpen    = trigger.getAttribute('aria-expanded') === 'true';
      const contentId = trigger.getAttribute('aria-controls');
      const content   = document.getElementById(contentId);

      // Close all others
      triggers.forEach(other => {
        if (other === trigger) return;
        const otherId      = other.getAttribute('aria-controls');
        const otherContent = document.getElementById(otherId);
        other.setAttribute('aria-expanded', 'false');
        if (otherContent) otherContent.style.maxHeight = '0';
      });

      // Toggle current
      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = '0';
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}
