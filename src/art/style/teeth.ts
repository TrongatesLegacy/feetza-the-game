// Gnarled teeth, shared by the mouths that bite: the Immortal Brute's burst cuts and the Zombie Loafer's jaw.

import type { Ctx } from '../util';

/** The enamel from root to tip: the Brute's old bone, or a zombie's rotten yellow-brown. */
export const ENAMEL = {
  bone: [[0, '#4b443a'], [0.35, '#9d957f'], [0.8, '#d7d1bf'], [1, '#ebe7da']] as [number, string][],
  rot: [[0, '#0e0a05'], [0.3, '#4a3a1a'], [0.72, '#9a8650'], [1, '#bcaa72']] as [number, string][],
};

/**
 * One jagged tooth from its root (bx, by) towards its tip, `len` long and `wd` wide at the root, pointing down
 * (dir 1) or up (dir -1), leaning by `lean` (tip offset per unit length), its tip chipped off if `chipped`: the far
 * side in shadow, a hard light down the near edge, inked.
 */
export function gnarledFang(x: Ctx, bx: number, by: number, len: number, wd: number, dir: number, lean: number, chipped: boolean, enamel = ENAMEL.bone): void {
  const tx = bx + lean * len;
  const ty = by + dir * len;
  const path = () => {
    x.beginPath();
    x.moveTo(bx - wd / 2, by - dir * 3);
    x.quadraticCurveTo(bx - wd * 0.55, by + dir * len * 0.5, tx - (chipped ? wd * 0.22 : 0), ty - (chipped ? dir * 2 : 0));
    if (chipped) x.lineTo(tx + wd * 0.05, ty - dir * 4.5);
    if (chipped) x.lineTo(tx + wd * 0.24, ty);
    x.quadraticCurveTo(bx + wd * 0.5, by + dir * len * 0.45, bx + wd / 2, by - dir * 3);
    x.closePath();
  };
  path();
  const g = x.createLinearGradient(bx, by, tx, ty);
  for (const [o, c] of enamel) g.addColorStop(o, c);
  x.fillStyle = g;
  x.fill();
  // the far side in shadow, a hard light on the near edge
  x.save();
  path();
  x.clip();
  x.fillStyle = 'rgba(8,8,12,.32)';
  x.fillRect(bx + wd * 0.08, Math.min(by, ty) - 4, wd, len + 8);
  x.restore();
  const p0: [number, number] = [bx - wd * 0.3, by + dir * 2];
  const p1: [number, number] = [bx - wd * 0.3 + lean * len * 0.5, by + dir * len * 0.55];
  const p2: [number, number] = [tx - wd * 0.08, ty - dir * 3];
  x.save();
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = 'rgba(255,255,248,.75)';
  x.lineWidth = 1.1;
  x.beginPath();
  x.moveTo(p0[0], p0[1]);
  x.quadraticCurveTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
  x.lineTo(p2[0], p2[1]);
  x.stroke();
  x.restore();
  path();
  x.strokeStyle = '#08080b';
  x.lineWidth = 1.6;
  x.stroke();
}
