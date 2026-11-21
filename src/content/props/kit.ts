// Props for the shared boss kit (force-field bubble). Every module in src/content/props/ exports
// `props`: texture key → drawing function. They're drawn once at load like the other sprites.
import { makeCanvas } from '../../art/util';

function bubble(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(512, 512);
  const g = ctx.createRadialGradient(256, 256, 120, 256, 256, 250);
  g.addColorStop(0, 'rgba(140,220,255,0.04)');
  g.addColorStop(0.75, 'rgba(140,220,255,0.22)');
  g.addColorStop(0.93, 'rgba(200,245,255,0.75)');
  g.addColorStop(1, 'rgba(200,245,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();
  // hex sheen
  ctx.strokeStyle = 'rgba(220,250,255,0.35)';
  ctx.lineWidth = 3;
  for (let y = 40; y < 480; y += 52) {
    for (let x = 40 + ((y / 52) % 2) * 30; x < 480; x += 60) {
      if (Math.hypot(x - 256, y - 256) > 225) continue;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const px = x + Math.cos(ang) * 22;
        const py = y + Math.sin(ang) * 22;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(170, 150, 60, 26, -0.6, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_bubble: bubble,
};
