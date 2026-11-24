// Leg fixes from the final polish pass: feet whose styled leg had lost its old leg's colour or material get it back
// (registerLeg merges over the style's own leg spec), and Broken Bill's plaster cast keeps its get-well doodles as a
// leg material of its own (registerLegKind). Patterns the old legs had (sock stripes, argyle, toe-sock rainbows, stripy
// tights, clown dots, ballet ribbons, puffer quilting, bandage wraps) come back on their own (src/art/feetArt.ts).

import { mix, rgba, shade } from '../../art/util';
import { registerLeg, registerLegKind, wrapTile } from '../../art/style/legs';
import { texture } from '../../art/style/kit';

// Thrym's leg: the frost king's greave of rune-cut blued iron (the 'thrymgreave' kind, src/content/style/thrym.ts),
// darker than his ice boot so the boot stands out bright under it; its runes hold a thread of cold light.
registerLeg('thrym', { kind: 'thrymgreave', color: '#4a5c7a', accent: '#8af0ff' });
// The Harpy stood on a scaly gold leg under her feather ruff, not a purple furry one.
registerLeg('harpy', { kind: 'scales', color: '#d4b25a' });
// The Echo Knight Clown's leg was the knight's red armour with a gold band, not grey trousers.
registerLeg('echoclown', { kind: 'plate', color: '#d6262f', accent: '#ffd400' });
// The Valkyrie's clogs ride on copper plate with gold trim (the old leg's colour; the iron default was grey).
registerLeg('valkyrie', { kind: 'plate', color: '#c98a3a', accent: '#f2c14e' });

// The Frost Giant's skin is drawn a deeper glacial blue than its data's (acts-d-3.ts): its leg follows.
registerLeg('frostgiant', { color: '#7fa6d0' });

// Stiletto Sasha's dark tights over a bare foot: a long fade smeared them into a muddy brown; a short one is a crisp
// stocking edge.
registerLeg('sasha', { fade: 8 });
// Jörmungandr's head fades into the serpent's neck over a longer run (a short one left a hard line).
registerLeg('jormungandr', { fade: 40 });

// Plaster of Paris with felt-tip doodles and signatures down the cast, as the old leg had.
registerLegKind('cast', {
  tint: '#4a5070',
  sheen: 0.12,
  draw(ctx, x0, w, H) {
    texture(ctx, 'canvas', { x: x0, y: 0, w, h: H }, 0.18, 1.4, 'soft-light');
    // the gauze's wraps showing faintly through the plaster
    const n = Math.max(1, Math.round(H / 22));
    for (let i = 0; i < n; i++) {
      const y = (i / n) * H;
      ctx.fillStyle = rgba('#000000', 0.05);
      ctx.fillRect(x0, y, w, 2);
    }
    const inks = ['#3a6ad0', '#e5242f', '#2f9a4a', '#8a3cff'];
    const per = H / Math.max(1, Math.round(H / 64));
    wrapTile(ctx, H, () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let y = 0, k = 0; y < H - 0.5; y += per, k++) {
        const ink = inks[k % inks.length];
        ctx.strokeStyle = rgba(ink, 0.75);
        ctx.lineWidth = 1.6;
        // a squiggle signature
        ctx.beginPath();
        ctx.moveTo(x0 + w * 0.18, y + per * 0.3);
        ctx.bezierCurveTo(x0 + w * 0.35, y + per * 0.08, x0 + w * 0.5, y + per * 0.5, x0 + w * 0.78, y + per * 0.22);
        ctx.stroke();
        // and a heart or a smiley
        const cx = x0 + w * (k % 2 ? 0.3 : 0.62);
        const cy = y + per * 0.7;
        ctx.strokeStyle = rgba(inks[(k + 1) % inks.length], 0.8);
        ctx.beginPath();
        if (k % 2) {
          ctx.moveTo(cx, cy + 4);
          ctx.bezierCurveTo(cx - 7, cy - 1, cx - 3, cy - 6, cx, cy - 2);
          ctx.bezierCurveTo(cx + 3, cy - 6, cx + 7, cy - 1, cx, cy + 4);
        } else {
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.moveTo(cx - 2.5, cy + 1.5);
          ctx.quadraticCurveTo(cx, cy + 3.6, cx + 2.5, cy + 1.5);
        }
        ctx.stroke();
      }
    });
    // a scuffed, slightly grubby lower edge of each tile reads as handled plaster
    ctx.fillStyle = rgba(mix(shade('#f5f2ea', -0.3), '#8a7a5a', 0.4), 0.08);
    ctx.fillRect(x0, 0, w * 0.2, H);
  },
});
registerLeg('bill', { kind: 'cast' });
