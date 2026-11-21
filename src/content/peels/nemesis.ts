// Nemesis variants: upgraded hero peels earned by beating a hero's nemesis (src/game/nemesis.ts) with that hero.
// The Dark Kneader is Batpeel's: beat the Jokester 3 times with Batpeel equipped. It's a hero peel like any other
// (the HEROES section, a progress bar in the locker, and it counts towards the God Peel). Its move and passive are
// in src/game/acts/gotham.ts. A parody name and a look of our own.

import type { Ability } from '../../game/abilities';
import { registerTrackers, type HeroGoal } from '../../game/heroGoals';
import { PEEL_HEAD, headPath } from '../../art/peelArt';
import { heroLook } from '../../art/heroHeads';
import { rgba } from '../../art/util';
import type { HeroPeel } from '../heroPeels';

const GOLD = 0xffd23f;
const S = '{slam}';

registerTrackers({
  // any heat counts: the Jokester only turns up at wave 65, and only with Batpeel equipped
  jokesterBatpeel: ['Beat the Jokester with Batpeel equipped', {
    bossDown: (e, c) => e.foot.type.id === 'jokester' && c.run.peel === 'hero:batpeel',
  }],
});

const goal: HeroGoal = { kind: 'track', key: 'jokesterBatpeel', need: 3, minHeat: 'mild' };

const ability: Ability = {
  name: 'Night Falls',
  trigger: { t: 'active' },
  fx: [{ e: 'move', id: 'darkFalls' }],
  charge: 0.8,
  color: GOLD,
  vfx: 'burst',
  custom: true,
  desc: `Signature (${S}): the lights go out for 18 s. A spotlight follows your peel, feet in the dark move 35% slower, and an exploding wing-boomerang flies every 1.6 s (×2.5 out, ×2.5 back, a blast as it lands). Each one splits in two on impact, and the halves fly at the next feet (×1.5 each). Passive, Utility Belt: every wave hands you one gadget that fires itself when it’s needed: a smoke pellet, a grapple or a gel charge.`,
};

/** Upgraded armour over the cowl: angular chest plates, a jaw guard, gold piping round the emblem. */
function armour(ctx: CanvasRenderingContext2D): void {
  const { x: HX, y: HY, r: R } = PEEL_HEAD;
  ctx.save();
  headPath(ctx, 'round');
  ctx.clip();
  // chest plates: two angled panels meeting under the emblem, with a cool sheen on the lit one
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(HX + s * 4, HY + 30);
    ctx.lineTo(HX + s * (R + 10), HY + 14);
    ctx.lineTo(HX + s * (R + 10), HY + R + 20);
    ctx.lineTo(HX + s * 4, HY + R + 20);
    ctx.closePath();
    ctx.fillStyle = rgba(s < 0 ? '#5a6278' : '#0a0b10', 0.32);
    ctx.fill();
    ctx.strokeStyle = rgba('#2a1810', 0.8);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // plate seams with rivets
  ctx.strokeStyle = rgba('#8a92a8', 0.55);
  ctx.lineWidth = 1.6;
  for (const y of [HY + 70, HY + 96]) {
    ctx.beginPath();
    ctx.moveTo(HX - R, y);
    ctx.lineTo(HX + R, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#c9cfd8';
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    ctx.beginPath();
    ctx.arc(HX + k * 22, HY + 70, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // a jaw guard across the chin
  ctx.beginPath();
  ctx.moveTo(HX - 40, HY + 22);
  ctx.quadraticCurveTo(HX, HY + 44, HX + 40, HY + 22);
  ctx.lineTo(HX + 34, HY + 32);
  ctx.quadraticCurveTo(HX, HY + 52, HX - 34, HY + 32);
  ctx.closePath();
  ctx.fillStyle = '#2a2d3a';
  ctx.fill();
  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // gold piping round the emblem
  ctx.beginPath();
  ctx.arc(HX, HY + 58, 30, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.stroke();
  // glowing white lenses in the cowl, a soft bloom round each
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(HX + s * 24, HY - 12, 0, HX + s * 24, HY - 12, 22);
    g.addColorStop(0, 'rgba(255,255,255,0.65)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(HX + s * 24 - 22, HY - 34, 44, 44);
  }
}

export const peels: HeroPeel[] = [
  {
    id: 'hero:darkkneader',
    name: 'The Dark Kneader',
    sub: 'heroes',
    goal,
    how: 'The long night: beat the Jokester 3 times with Batpeel equipped. He only turns up at wave 65, in Goth-Ham, when Batpeel is your peel. Any heat counts.',
    look: heroLook('hero:darkkneader', {
      suit: '#1e2029',
      suit2: '#14151c',
      cape: '#0b0c12',
      capeTrim: '#3a3d4c',
      skin: '#e0b894',
      mask: 'cowl',
      maskColor: '#15161d',
      eyes: 'glowSlits',
      eyeColor: '#ffffff',
      ears: 'bat',
      earColor: '#15161d',
      emblem: 'nightSlice',
      emblemColor: '#ffd23f',
      emblemBg: '#0b0c12',
      extras: ['utilityBelt'],
      metal: true,
      glow: '#ffd23f',
      trail: '#ffd23f',
      handle: '#0b0c12',
      fine: true,
      detail: armour,
    }),
    ability,
  },
];
