// Accessibility options that live in CSS: colour-blind palette and reduced motion.

import { save } from '../systems/save';

export function applyA11y(): void {
  const b = document.body;
  b.dataset.cb = save.settings.colorBlind;
  b.classList.toggle('reduced-motion', save.settings.reducedMotion);
}
