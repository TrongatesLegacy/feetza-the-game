// King Leonidas: a hero peel in the GREEK GODS section (a king, not a god, but Greek, so it sits with them). He takes
// the Kratos Peel's old unlock, 300 Persian feet; his nemesis is the Hot Gates (src/game/nemesis.ts, the bosses in
// src/game/bosses/leonidas.ts), and his variant, Leonidas, Hot Gates, is earned by beating Xerxes 3 times with him.
// Moves and passives are in src/game/acts/leonidas.ts. His look is our own: a bronze helm with a crest worn side to
// side, a red cloak, and a round shield with a lambda.

import type { Ability } from '../../game/abilities';
import { registerTrackers } from '../../game/heroGoals';
import { FEET } from '../../data/feet';
import { PEEL_HEAD, handleFrom, headFrom, type PeelLook } from '../../art/peelArt';
import { type Ctx, ellipse, roundRect, shade } from '../../art/util';
import { save } from '../../systems/save';
import type { HeroPeel } from '../heroPeels';

const S = '{slam}';
const INK = '#2a1810';
const { x: HX, y: HY } = PEEL_HEAD;

function stroke(ctx: Ctx, lw: number, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function bronze(ctx: Ctx, x0: number, x1: number, col = '#c9873a'): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.28, shade(col, 0.15));
  g.addColorStop(0.4, shade(col, 0.6));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

/** The round shield with a lambda, at (x, y), radius r. */
function lambdaShield(ctx: Ctx, x: number, y: number, r: number, face: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = bronze(ctx, x - r, x + r);
  ctx.fill();
  stroke(ctx, 4.5);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  stroke(ctx, 2.5);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.42, y + r * 0.5);
  ctx.lineTo(x, y - r * 0.55);
  ctx.lineTo(x + r * 0.42, y + r * 0.5);
  ctx.lineJoin = 'miter';
  ctx.lineWidth = r * 0.24;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = '#ffd890';
  ctx.stroke();
  ellipse(ctx, x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.12, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
}

/** Leonidas: the cloak behind, the helm with its side-to-side crest, and the shield in front. */
function drawLeonidas(ctx: Ctx, o: { cloak: string; crest: string; helm: string; face: string; worn?: boolean }): void {
  // the red cloak, falling from behind the helm round the handle
  ctx.beginPath();
  ctx.moveTo(HX - 80, HY + 20);
  ctx.bezierCurveTo(HX - 110, HY + 120, HX - 70, HY + 220, HX - 40, HY + 250);
  ctx.lineTo(HX - 18, HY + 200);
  ctx.lineTo(HX, HY + 262);
  ctx.lineTo(HX + 22, HY + 196);
  ctx.lineTo(HX + 44, HY + 248);
  ctx.bezierCurveTo(HX + 74, HY + 210, HX + 108, HY + 120, HX + 80, HY + 20);
  ctx.closePath();
  const cg = ctx.createLinearGradient(HX - 100, 0, HX + 100, 0);
  cg.addColorStop(0, shade(o.cloak, -0.45));
  cg.addColorStop(0.4, shade(o.cloak, 0.15));
  cg.addColorStop(1, shade(o.cloak, -0.5));
  ctx.fillStyle = cg;
  ctx.fill();
  stroke(ctx, 4.5);
  for (const dx of [-46, -16, 16, 46]) {
    ctx.beginPath();
    ctx.moveTo(HX + dx * 0.6, HY + 60);
    ctx.quadraticCurveTo(HX + dx, HY + 150, HX + dx * 0.8, HY + 220);
    stroke(ctx, 2.5, 'rgba(42,24,16,0.4)');
  }
  // the crest, worn side to side across the helm (black with a red stripe)
  ctx.beginPath();
  ctx.moveTo(HX - 104, HY - 34);
  ctx.bezierCurveTo(HX - 80, HY - 124, HX + 80, HY - 124, HX + 104, HY - 34);
  ctx.bezierCurveTo(HX + 70, HY - 70, HX - 70, HY - 70, HX - 104, HY - 34);
  ctx.closePath();
  ctx.fillStyle = o.crest;
  ctx.fill();
  stroke(ctx, 4.5);
  ctx.beginPath();
  ctx.moveTo(HX - 90, HY - 54);
  ctx.bezierCurveTo(HX - 60, HY - 110, HX + 60, HY - 110, HX + 90, HY - 54);
  stroke(ctx, 5, '#c8102e');
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(HX + i * 13, HY - 64);
    ctx.lineTo(HX + i * 15, HY - 100 + Math.abs(i) * 4);
    stroke(ctx, 1.6, 'rgba(255,255,255,0.18)');
  }
  // the helm: rounded bronze with deep cheek guards and a narrow T opening
  const helm = () => {
    ctx.beginPath();
    ctx.moveTo(HX - 70, HY + 74);
    ctx.bezierCurveTo(HX - 92, HY + 4, HX - 82, HY - 72, HX, HY - 76);
    ctx.bezierCurveTo(HX + 82, HY - 72, HX + 92, HY + 4, HX + 70, HY + 74);
    ctx.quadraticCurveTo(HX + 42, HY + 92, HX + 24, HY + 82);
    ctx.lineTo(HX + 18, HY + 14);
    ctx.lineTo(HX + 7, HY + 6);
    ctx.lineTo(HX + 7, HY + 70);
    ctx.lineTo(HX - 7, HY + 70);
    ctx.lineTo(HX - 7, HY + 6);
    ctx.lineTo(HX - 18, HY + 14);
    ctx.lineTo(HX - 24, HY + 82);
    ctx.quadraticCurveTo(HX - 42, HY + 92, HX - 70, HY + 74);
    ctx.closePath();
  };
  ellipse(ctx, HX, HY + 30, 46, 54);
  ctx.fillStyle = '#140a06';
  ctx.fill();
  // eyes in the dark: a steady gold glint
  for (const s of [-1, 1]) {
    ellipse(ctx, HX + s * 16, HY + 2, 6, 3, s * 0.2);
    ctx.fillStyle = '#ffd890';
    ctx.fill();
  }
  helm();
  ctx.fillStyle = bronze(ctx, HX - 90, HX + 90, o.helm);
  ctx.fill();
  stroke(ctx, 5);
  ctx.save();
  helm();
  ctx.clip();
  // a band of embossed waves round the brow
  ctx.beginPath();
  for (let x = HX - 80; x < HX + 80; x += 20) {
    ctx.moveTo(x, HY - 20);
    ctx.quadraticCurveTo(x + 10, HY - 32, x + 20, HY - 20);
  }
  stroke(ctx, 2.5, 'rgba(42,24,16,0.45)');
  if (o.worn) {
    // nicks and a gash from the fighting
    for (const [x0, y0, x1, y1] of [[HX - 56, HY - 40, HX - 36, HY - 18], [HX + 40, HY + 20, HX + 60, HY + 44], [HX + 20, HY - 60, HX + 34, HY - 44]]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      stroke(ctx, 3, 'rgba(42,24,16,0.6)');
    }
  }
  ctx.beginPath();
  ctx.ellipse(HX - 40, HY - 44, 22, 10, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fill();
  ctx.restore();
  // the crest's bronze bar
  roundRect(ctx, HX - 70, HY - 76, 140, 12, 5);
  ctx.fillStyle = bronze(ctx, HX - 70, HX + 70, o.helm);
  ctx.fill();
  stroke(ctx, 3);
  // the shield, held up in front to the lower left
  lambdaShield(ctx, HX - 52, HY + 92, 44, o.face);
  if (o.worn) {
    // Persian arrows stuck in the shield
    for (const [x, y, a] of [[HX - 70, HY + 70, -0.5], [HX - 34, HY + 104, -0.9], [HX - 60, HY + 118, -0.2]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      roundRect(ctx, -2, -46, 4, 46, 2);
      ctx.fillStyle = '#8a5a2a';
      ctx.fill();
      stroke(ctx, 1.6);
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.lineTo(-7, -58);
      ctx.lineTo(0, -54);
      ctx.lineTo(7, -58);
      ctx.closePath();
      ctx.fillStyle = '#2a2430';
      ctx.fill();
      ctx.restore();
    }
  }
}

function leonidasLook(id: string, o: Parameters<typeof drawLeonidas>[1], trail: string, handle: string): () => PeelLook {
  return () => ({
    shape: 'round',
    head: headFrom(o.helm),
    handle: handleFrom(handle),
    pattern: 'plain',
    patternColor: o.cloak,
    metal: true,
    trail,
    seed: id,
    custom: (ctx) => drawLeonidas(ctx, o),
  });
}

registerTrackers({
  xerxesLeonidas: ['Beat Xerxes with King Leonidas equipped', { bossDown: (e, c) => e.foot.type.id === 'xerxes' && c.run.peel === 'hero:leonidas' }],
});

const persianKills = (): number => FEET.filter((f) => f.persian).reduce((n, f) => n + (save.kills[f.id] ?? 0), 0);

const holdLine: Ability = {
  name: 'Hold the Line',
  trigger: { t: 'active' },
  fx: [{ e: 'move', id: 'holdTheLine' }],
  charge: 0.8,
  color: 0xc9873a,
  vfx: 'burst',
  custom: true,
  desc: `Signature (${S}): the phalanx locks a wall of bronze shields across the table for 10 s, and it blocks every stomp (the foot is shoved back up). Passive, The Spear: every 6 s a Spartan spear flies through a lane, piercing every foot in its path (×3).`,
};

const hotGates: Ability = {
  name: 'This Is Where We Hold',
  trigger: { t: 'active' },
  fx: [{ e: 'move', id: 'holdHotGates' }],
  charge: 0.8,
  color: 0xff6a2a,
  vfx: 'burst',
  custom: true,
  desc: `Signature (${S}): a war cry, and the phalanx locks its shield wall across the table for 14 s. Every stomp it blocks drives the foot back up and costs it ×2, and the wall shoves forward as it lands (×2 to every foot, knocked back). Passive, Spears of the Three Hundred: every 4 s two spears fly through the two busiest lanes, piercing every foot in their path (×3).`,
};

export const peels: HeroPeel[] = [
  {
    id: 'hero:leonidas',
    name: 'King Leonidas',
    sub: 'greek',
    pantheon: 'greek',
    goal: { kind: 'value', read: persianKills, need: 300 },
    how: 'Three hundred: defeat 300 Persian feet (any of the Persian army).',
    look: leonidasLook('hero:leonidas', { cloak: '#b8182a', crest: '#1e1a1c', helm: '#c9873a', face: '#a8182a' }, '#c9873a', '#5a2a1a'),
    ability: holdLine,
  },
  {
    id: 'hero:hotgates',
    name: 'Leonidas, Hot Gates',
    sub: 'greek',
    pantheon: 'greek',
    after: 'hero:leonidas',
    goal: { kind: 'track', key: 'xerxesLeonidas', need: 3, minHeat: 'mild' },
    how: 'Tonight we dine on pizza: beat Xerxes 3 times with King Leonidas equipped. He only turns up at wave 85, at the Hot Gates, when King Leonidas is your peel. Any heat counts.',
    look: leonidasLook('hero:hotgates', { cloak: '#7a0a14', crest: '#c8102e', helm: '#a86a2a', face: '#5a0a10', worn: true }, '#ff6a2a', '#3a1a10'),
    ability: hotGates,
  },
];
