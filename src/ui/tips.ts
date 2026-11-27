// Tips as popups that work on a phone. The game never uses the browser's own hover text (a `title` shows nothing on a
// touch screen): any element given a `title` anywhere has it moved to `data-tip`, and the tip shows as a small bubble.
//   - Something you just read (a badge, a tag, a tile): tap or click it to show its tip, tap anywhere to close it.
//   - Something you press (a button): pressing does what it does; press and hold to read its tip instead.
//   - With a mouse, hovering either shows the tip after a moment.
// Escape, scrolling, or a tap elsewhere closes it.

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
  return target instanceof Element ? (target.closest('[data-tip]') as HTMLElement | null) : null;
}

export function hideTip(): void {
  window.clearTimeout(hoverTimer);
  box?.remove();
  box = null;
  owner = null;
}

function showTip(el: HTMLElement): void {
  const text = el.getAttribute('data-tip');
  if (!text) return;
  hideTip();
  owner = el;
  box = document.createElement('div');
  box.className = 'tipbox';
  box.setAttribute('role', 'tooltip');
  box.textContent = text;
  document.body.appendChild(box);
  // above the element, or below when there's no room; always inside the screen
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const m = 8;
  const above = r.top - b.height - 10 >= m;
  const y = above ? r.top - b.height - 10 : Math.min(window.innerHeight - b.height - m, r.bottom + 10);
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
