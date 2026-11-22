// Leg fixes from the old-vs-new regression pass: feet whose old leg was part of their identity get it back. Cowboy
// Cal's and Wellie Wendy's boots carry on up the leg as a boot shaft (not jeans); Hairy Harold's leg is hairy skin
// (not a pelt); the Cavalry Hooves wear the red saddle cloth up the leg; the Iron Heel's leg is red armour again.

import { mix, rgba, shade } from '../../art/util';
import { registerLeg, registerLegKind, wrapTile } from '../../art/style/legs';
import { texture } from '../../art/style/kit';

/** A seeded random for the tiles (deterministic art; never the game's RNG). */
function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Each tile's period must divide its height so it wraps: the nearest period that does to the one wanted. */
const per = (H: number, want: number) => H / Math.max(1, Math.round(H / want));

// A tooled leather boot shaft: grain, a stitched side seam, and the fancy wave of decorative stitching down the front
// (the old Cal's), in the accent colour.
registerLegKind('bootshaft', {
  tint: '#2a1008',
  sheen: 0.3,
  draw(ctx, x0, w, H, base, accent) {
    const box = { x: x0, y: 0, w, h: H };
    texture(ctx, 'leather', box, 0.45, 1.3);
    const thread = accent ?? '#f2c14e';
    const p = per(H, 64);
    wrapTile(ctx, H, () => {
      ctx.lineCap = 'round';
      // the front's wave of stitching, two rows
      for (const [dx, a] of [[0, 0.9], [7, 0.55]] as const) {
        ctx.strokeStyle = rgba(thread, a);
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let y = 0; y <= H; y += 2) {
          const x = x0 + w * 0.42 + dx + Math.sin((y / p) * Math.PI * 2) * w * 0.12;
          if (y) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    });
    // the side seams: a welt with a stitch line, both edges
    for (const sx of [x0 + 5, x0 + w - 5]) {
      ctx.fillStyle = rgba(shade(base, -0.45), 0.5);
      ctx.fillRect(sx - 1.2, 0, 2.4, H);
      ctx.strokeStyle = rgba(mix(thread, base, 0.3), 0.6);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx + (sx < x0 + w / 2 ? 3 : -3), 0);
      ctx.lineTo(sx + (sx < x0 + w / 2 ? 3 : -3), H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // a long polished gleam down the lit side
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0.12, rgba('#ffffff', 0));
    g.addColorStop(0.2, rgba('#fff4e0', 0.28));
    g.addColorStop(0.28, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, H);
  },
});

// Glossy rubber: a wellie's shaft, with a hard window reflection down the lit side and a few raindrops beading on it.
registerLegKind('rubber', {
  tint: '#5a3a00',
  sheen: 0.4,
  draw(ctx, x0, w, H) {
    const r = seeded(4471);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0.1, rgba('#ffffff', 0));
    g.addColorStop(0.16, rgba('#ffffff', 0.75));
    g.addColorStop(0.22, rgba('#ffffff', 0.15));
    g.addColorStop(0.3, rgba('#ffffff', 0.4));
    g.addColorStop(0.34, rgba('#ffffff', 0));
    g.addColorStop(0.86, rgba('#ffffff', 0));
    g.addColorStop(0.9, rgba('#ffffff', 0.25));
    g.addColorStop(0.94, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, H);
    const drops: [number, number, number][] = [];
    for (let i = 0; i < Math.round(H / 40); i++) drops.push([x0 + 8 + r() * (w - 16), r() * H, 1.6 + r() * 2]);
    wrapTile(ctx, H, () => {
      for (const [x, y, s] of drops) {
        ctx.fillStyle = rgba('#000000', 0.18);
        ctx.beginPath();
        ctx.ellipse(x + 0.8, y + 1.2, s, s * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba('#fffbe8', 0.55);
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.95);
        ctx.beginPath();
        ctx.arc(x - s * 0.35, y - s * 0.45, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
});

// Hairy skin: a bare leg with dark hairs lying down it (Hairy Harold).
registerLegKind('hairy', {
  tint: '#8a2a14',
  sheen: 0.18,
  draw(ctx, x0, w, H, base) {
    const r = seeded(9137);
    texture(ctx, 'pores', { x: x0, y: 0, w, h: H }, 0.25, 1, 'soft-light');
    const hairs: [number, number, number, number, number][] = [];
    for (let i = 0; i < (w * H) / 30; i++) {
      const x = x0 + r() * w;
      const u = (x - x0) / w;
      hairs.push([x, r() * H, 7 + r() * 9, (u - 0.5) * 5 + (r() - 0.5) * 3, 0.35 + r() * 0.45]);
    }
    const hair = mix(shade(base, -0.7), '#1a0e08', 0.5);
    wrapTile(ctx, H, () => {
      ctx.lineCap = 'round';
      for (const [x, y, l, b, a] of hairs) {
        ctx.strokeStyle = rgba(hair, a);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + b * 0.2, y + l * 0.6, x + b, y + l);
        ctx.stroke();
      }
    });
  },
});

// A woven saddle cloth: dense vertical threads, a darker weave between, gold embroidered pinstripes.
registerLegKind('saddlecloth', {
  tint: '#2a0410',
  sheen: 0.15,
  draw(ctx, x0, w, H, base, accent) {
    const r = seeded(2291);
    texture(ctx, 'canvas', { x: x0, y: 0, w, h: H }, 0.35, 1.2);
    // the shaggy pile: short vertical threads, light and dark
    const threads: [number, number, number, boolean][] = [];
    for (let i = 0; i < (w * H) / 18; i++) threads.push([x0 + r() * w, r() * H, 5 + r() * 7, r() < 0.5]);
    wrapTile(ctx, H, () => {
      ctx.lineCap = 'round';
      for (const [x, y, l, lit] of threads) {
        ctx.strokeStyle = rgba(lit ? shade(base, 0.35) : shade(base, -0.45), lit ? 0.35 : 0.4);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.6, y + l);
        ctx.stroke();
      }
    });
    // gold pinstripes down the cloth
    const gold = accent ?? '#e8b43a';
    for (const u of [0.18, 0.82]) {
      ctx.fillStyle = rgba(shade(gold, -0.4), 0.6);
      ctx.fillRect(x0 + w * u - 1.8, 0, 3.6, H);
      ctx.fillStyle = rgba(gold, 0.9);
      ctx.fillRect(x0 + w * u - 1, 0, 2, H);
    }
  },
});

// the shaft is the boot's own width at its top (COWBOY.topHW), so the two edges meet
registerLeg('cowboy', { kind: 'bootshaft', color: '#a0552a', accent: '#f2c14e', hw: 58, join: 'blend', fade: 18 });
registerLeg('wendy', { kind: 'rubber', color: '#ffd000', hw: 62, join: 'blend', fade: 18 });
registerLeg('harold', { kind: 'hairy' });
registerLeg('cavalry', { kind: 'saddlecloth', color: '#b8202a', accent: '#e8b43a' });
registerLeg('ironheel', { color: '#b33a3a' });
// Bat Feet: the old leg was smooth, dark and leathery; a pelt read as static at game size.
registerLeg('batfeet', { kind: 'skin', color: '#4a3a5c', fade: 30 });
// The Gorgon Snake's leg is the snake's own scaly green body, as the old art had it.
registerLeg('gorgonsnake', { kind: 'scales', color: '#4f9a3a' });
