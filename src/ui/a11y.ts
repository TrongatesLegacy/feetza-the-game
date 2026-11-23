// Accessibility options that live in CSS: colour-blind palette and reduced motion (and still peels: the graphics
// setting's animated peels off stops the shiny peels' sheen too).

import { peelsAnimated } from '../systems/graphics';
import { save } from '../systems/save';

export function applyA11y(): void {
  const b = document.body;
  b.dataset.cb = save.settings.colorBlind;
  b.classList.toggle('reduced-motion', save.settings.reducedMotion);
  b.classList.toggle('still-peels', !peelsAnimated());
}
