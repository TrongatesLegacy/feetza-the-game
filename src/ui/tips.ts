// Tips as popups that work on a phone. The game never uses the browser's own hover text (a `title` shows nothing on a
// touch screen): any element given a `title` anywhere has it moved to `data-tip`, and the tip shows as a small bubble.
//   - Something you just read (a badge, a tag, a tile): tap or click it to show its tip, tap anywhere to close it.
//   - Something you press (a button): pressing does what it does; press and hold to read its tip instead.
//   - With a mouse, hovering either shows the tip after a moment.
// Escape, scrolling, or a tap elsewhere closes it.

/** Cards shown in place of a tip: an element with `data-tip-card` (a topping, `top:<id>`, or a pizza, `pizza:<id>`)
 *  shows that thing's whole card, drawn by whoever registered for it (src/ui/ui.ts). */
let cardFor: ((key: string, el: HTMLElement) => HTMLElement | null) | null = null;
export function setTipCards(fn: (key: string, el: HTMLElement) => HTMLElement | null): void {
  cardFor = fn;
}

const INTERACTIVE = 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"]';
const HOLD_MS = 450;
const HOVER_MS = 350;

let box: HTMLDivElement | null = null;
let owner: HTMLElement | null = null;
let hoverTimer = 0;
let holdTimer = 0;
/** A press that showed a tip doesn't also press the button. */
let swallowClick = false;
/** The last press's pointer (a context menu has none of its own). */
let lastPointer = 'mouse';

/** Move an element's `title` to `data-tip` (and keep it readable by screen readers). */
function adopt(el: Element): void {
  const t = el.getAttribute('title');
  if (t === null) return;
  el.removeAttribute('title');
  if (!t.trim()) return;
  el.setAttribute('data-tip', t);
  if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !(el.textContent ?? '').trim()) el.setAttribute('aria-label', t);
  if (!el.matches(INTERACTIVE)) el.classList.add('has-tip');
}

function adoptAll(root: ParentNode): void {
  if (root instanceof Element) adopt(root);
  root.querySelectorAll?.('[title]').forEach(adopt);
}

function tipOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? (target.closest('[data-tip], [data-tip-card]') as HTMLElement | null) : null;
}

export function hideTip(): void {
  window.clearTimeout(hoverTimer);
  box?.remove();
  box = null;
  owner = null;
}

function showTip(el: HTMLElement): void {
  const text = el.getAttribute('data-tip');
  const key = el.getAttribute('data-tip-card');
  const card = key && cardFor ? cardFor(key, el) : null;
  if (!text && !card) return;
  hideTip();
  owner = el;
  box = document.createElement('div');
  box.className = card ? 'tipbox with-card' : 'tipbox';
  box.setAttribute('role', 'tooltip');
  if (card) box.append(card);
  else box.textContent = text;
  document.body.appendChild(box);
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const m = 8;
  // a card sits beside what it came from (the popover the chip is in, or the chip), level with the chip: to its right,
  // else its left; only when neither side has room does it go above or below like a text tip
  if (card) {
    const a = (el.closest('.st-pop') ?? el).getBoundingClientRect();
    const gap = 14;
    const y = Math.max(m, Math.min(window.innerHeight - b.height - m, r.top + r.height / 2 - b.height / 2));
    const side = a.right + gap + b.width <= window.innerWidth - m ? a.right + gap : a.left - gap - b.width >= m ? a.left - gap - b.width : null;
    if (side !== null) {
      box.style.left = `${Math.round(side)}px`;
      box.style.top = `${Math.round(y)}px`;
      return;
    }
  }
  // above the element, or below when there's no room; always inside the screen
  const gapY = card ? 16 : 10;
  const above = r.top - b.height - gapY >= m;
  const y = above ? r.top - b.height - gapY : Math.min(window.innerHeight - b.height - m, r.bottom + gapY);
  const x = Math.max(m, Math.min(window.innerWidth - b.width - m, r.left + r.width / 2 - b.width / 2));
  box.style.left = `${Math.round(x)}px`;
  box.style.top = `${Math.round(y)}px`;
  box.style.setProperty('--ax', `${Math.round(Math.max(12, Math.min(b.width - 12, r.left + r.width / 2 - x)))}px`);
  box.classList.add(above ? 'above' : 'below');
}

export function installTips(): void {
  adoptAll(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes') adopt(m.target as Element);
      else m.addedNodes.forEach((n) => n instanceof Element && adoptAll(n));
    }
    // the element it belongs to went away: so does its tip
    if (owner && !owner.isConnected) hideTip();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });

  // a mouse: hover shows it after a moment
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = tipOf(e.target);
    if (!el || el === owner) return;
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => el.matches(':hover') && showTip(el), HOVER_MS);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = tipOf(e.target);
    if (el && !el.contains(e.relatedTarget as Node | null)) {
      window.clearTimeout(hoverTimer);
      if (el === owner) hideTip();
    }
  });

  // touch or pen: press and hold anything with a tip to read it
  document.addEventListener('pointerdown', (e) => {
    window.clearTimeout(holdTimer);
    swallowClick = false;
    lastPointer = e.pointerType;
    if (e.pointerType === 'mouse') return;
    const el = tipOf(e.target);
    if (!el) return;
    holdTimer = window.setTimeout(() => {
      showTip(el);
      swallowClick = true;
    }, HOLD_MS);
  });
  for (const t of ['pointerup', 'pointercancel', 'pointermove'] as const)
    document.addEventListener(t, (e) => {
      if (t === 'pointermove' && Math.abs(e.movementX) + Math.abs(e.movementY) < 4) return;
      window.clearTimeout(holdTimer);
    });

  // a tap or click: on something you read, it toggles its tip; anywhere else closes it
  document.addEventListener(
    'click',
    (e) => {
      if (swallowClick) {
        swallowClick = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const el = tipOf(e.target);
      const pressable = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (el && !pressable) {
        if (owner === el) hideTip();
        else showTip(el);
        return;
      }
      hideTip();
    },
    true,
  );
  // (the long press's own context menu and text selection would get in the way)
  document.addEventListener('contextmenu', (e) => {
    if (lastPointer !== 'mouse' && tipOf(e.target)) e.preventDefault();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hideTip());
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('resize', hideTip);
}
