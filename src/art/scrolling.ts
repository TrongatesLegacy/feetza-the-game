// Is the player scrolling a page right now (the Peel Locker's grid)? The living peels' rig builders hold back while
// they are, so a scroll never pays for a step (each one draws a foot or a part, 10–40 ms); tiles keep their stills
// until the scroll settles, then come alive. Element scrolls don't bubble, so the window listens in the capture phase.

let last = -1e9;
const QUIET_MS = 260;

if (typeof window !== 'undefined') {
  const mark = () => {
    last = performance.now();
  };
  window.addEventListener('scroll', mark, { capture: true, passive: true });
  window.addEventListener('wheel', mark, { capture: true, passive: true });
  window.addEventListener('touchmove', mark, { capture: true, passive: true });
}

/** Scrolled within the last quarter second or so. */
export function scrollingNow(): boolean {
  return performance.now() - last < QUIET_MS;
}
