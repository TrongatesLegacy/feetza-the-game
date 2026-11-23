// Hero variants: upgraded hero peels, each earned by beating a boss with its base hero equipped. Every variant sits
// beside its base peel in the locker (`after`), counts towards the God Peel like any hero, keeps its base's passive
// and gets a stronger move with a twist. Their moves are in src/game/acts/variants.ts. The Dark Kneader, the first
// of them, is in ./nemesis.ts. Parody names and looks of our own.
//
// - Kratos, Ghost of Sparta: beat Zeus 3 times with the Kratos Peel (Zeus only turns up with Kratos equipped).
// - Against the bosses already on the journey, with that hero equipped: Superpeel Prime (Doomstomp ×3), Iron Pan
//   Mark Infinity (Ultoe ×3), Thor, Thunder Unleashed (Surtr ×3), Odin Allfather Ascended (Fenrir's Paw ×3) and Zeus,
//   King Unbound (Hades ×3); and an Endgame variant for each Avengers-style hero (Thanfoot, once each). Endgame
//   variants share a look (a white-and-red time-heist band and a gold hex badge over the hero's own head) and a
//   modest upgrade: the meter fills 10% faster and every signature opens a ring of portals that strike the 5
//   toughest feet (×3 each).

import type { Ability } from '../../game/abilities';
import { registerTrackers, type HeroGoal } from '../../game/heroGoals';
import { godLook, kratosLook, type GodArt } from '../../art/godHeads';
import { heroLook, type HeroArt } from '../../art/heroHeads';
import { PEEL_HEAD, headPath } from '../../art/peelArt';
import type { PeelLook } from '../../art/peelArt';
import { rgba, type Ctx } from '../../art/util';
import type { HeroPeel } from '../heroPeels';
import { HERO_ART, peels as HEROES } from './heroes';

const S = '{slam}';

/** Beat a boss n times with a hero equipped, on any heat (the nemesis bosses only turn up with their hero). */
function beatWith(key: string, boss: string, bossName: string, hero: string, heroName: string, need: number): HeroGoal {
  registerTrackers({
    [key]: [`Beat ${bossName} with ${heroName} equipped`, { bossDown: (e, c) => e.foot.type.id === boss && c.run.peel === hero }],
  });
  return { kind: 'track', key, need, minHeat: 'mild' };
}

// ——— Kratos, Ghost of Sparta ———

/** The Kratos helm, darkened with ash, red war paint, white-hot eyes and a wreath of embers behind it. */
function ghostSpartaLook(): PeelLook {
  const base = kratosLook();
  const { x: HX, y: HY } = PEEL_HEAD;
  return {
    ...base,
    handle: ['#2a1410', '#140806'],
    trail: '#ff3a1a',
    seed: 'hero:ghostofsparta',
    custom: (ctx: Ctx) => {
      base.custom!(ctx);
      // ash over the bronze: everything drawn so far goes darker and colder
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const ash = ctx.createLinearGradient(0, HY - 140, 0, HY + 200);
      ash.addColorStop(0, 'rgba(40,30,30,0.5)');
      ash.addColorStop(1, 'rgba(10,6,6,0.55)');
      ctx.fillStyle = ash;
      ctx.fillRect(0, 0, 220, 360);
      ctx.restore();
      // a burst of flame behind the helm, licking out round the cheek guards and down the handle
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      for (const [r, col, n] of [[92, '#ffb040', 9], [104, '#ff6a1a', 11], [112, '#c8201a', 13]] as const) {
        ctx.beginPath();
        for (let i = 0; i <= n * 2; i++) {
          const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2;
          const low = Math.max(0, Math.sin(a));
          const rr = i % 2 ? r * 0.6 : r * (0.85 + low * 0.45);
          const x = HX + Math.cos(a) * rr * 0.92;
          const y = HY + 34 + Math.sin(a) * rr;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = '#2a1810';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
      // the red war paint: a stripe down the helm and a swirl over the left eye
      ctx.save();
      ctx.strokeStyle = '#d8201a';
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(HX - 2, HY - 74);
      ctx.lineTo(HX - 2, HY - 26);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(HX - 34, HY - 2, 16, Math.PI * 0.9, Math.PI * 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(HX - 46, HY + 14);
      ctx.lineTo(HX - 60, HY + 62);
      ctx.stroke();
      ctx.restore();
      // white-hot eyes in the dark of the helm
      ctx.save();
      ctx.shadowColor = '#ff3a1a';
      ctx.shadowBlur = 18;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(HX + sx * 18, HY + 2, 10, 4.5, sx * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#fff4d0';
        ctx.fill();
      }
      ctx.restore();
      // ash flecks
      ctx.fillStyle = rgba('#e8e0d8', 0.6);
      for (const [x, y] of [[HX - 60, HY - 40], [HX + 44, HY - 56], [HX + 64, HY + 30], [HX - 20, HY + 64], [HX + 18, HY - 66]]) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

const ghostSparta: Ability = {
  name: 'Ghost of Sparta',
  trigger: { t: 'active' },
  fx: [{ e: 'move', id: 'ghostSparta' }],
  charge: 0.7,
  color: 0xff3a1a,
  vfx: 'burst',
  custom: true,
  desc: `Signature (${S}): a bestial war roar, then 30 s of Spartan Rage, as the Kratos Peel’s: +100% damage, every smack hits all feet within 160 px, burns them and knocks them back. The twist: the rage leaves a trail of fire across the table wherever your peel goes, and every foot that touches it burns (1×/s for 2 s). Passive, Spinning Blades: three chained blades orbit your peel from the start (one more each new act, up to 5), and an ember aura burns round it all the time.`,
};

// ——— shared bits for the hero variants ———

const { x: HX, y: HY, r: HR } = PEEL_HEAD;

function stroke(ctx: Ctx, lw: number, col = '#2a1810'): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** A variant's ability: its own move id and name, its base's meter speed (times `charge`), new locker text. */
function variantAbility(base: Ability, name: string, move: string, desc: string, charge = 1, color = base.color): Ability {
  return { ...base, name, fx: [{ e: 'move', id: move }], charge: base.charge * charge, color, custom: true, desc };
}

const hero = (id: string) => HEROES.find((p) => p.id === `hero:${id}`)!;

/** A god variant's look: the god's own carved head in new colours, with something drawn over it. */
function godVariant(id: string, a: GodArt, over: (ctx: Ctx) => void): () => PeelLook {
  const base = godLook(id, a);
  return () => {
    const l = base();
    return { ...l, custom: (ctx) => (l.custom!(ctx), over(ctx)) };
  };
}

/** A little forked bolt from (x, y), for the storm gods' looks. */
function bolt(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 8 * s, y + 14 * s);
  ctx.lineTo(x + 2 * s, y + 16 * s);
  ctx.lineTo(x - 6 * s, y + 32 * s);
  stroke(ctx, 6 * s, 'rgba(42,24,16,0.7)');
  stroke(ctx, 3 * s, col);
}

// ——— Superpeel Prime: a midnight suit, a chrome emblem, burning eyes ———

function primeDetail(ctx: Ctx): void {
  // chrome piping round the emblem and a glow in each eye: the heat vision waiting
  ctx.beginPath();
  ctx.arc(HX, HY + 58, 31, 0, Math.PI * 2);
  stroke(ctx, 6);
  stroke(ctx, 3, '#e8edf2');
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(HX + s * 24, HY - 12, 0, HX + s * 24, HY - 12, 20);
    g.addColorStop(0, 'rgba(255,240,220,0.95)');
    g.addColorStop(0.4, 'rgba(255,70,40,0.75)');
    g.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(HX + s * 24 - 20, HY - 32, 40, 40);
  }
  // silver seams down the suit
  ctx.save();
  headPath(ctx, 'round');
  ctx.clip();
  ctx.setLineDash([4, 4]);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(HX + s * 60, HY + 20);
    ctx.quadraticCurveTo(HX + s * 50, HY + 70, HX + s * 34, HY + HR);
    stroke(ctx, 1.8, 'rgba(232,237,242,0.6)');
  }
  ctx.restore();
}

// ——— Iron Pan Mark Infinity: a deeper red, six gem studs round the faceplate, gold filigree ———

function infinityDetail(ctx: Ctx): void {
  const gems = ['#7a5aff', '#ff3a3a', '#3a8aff', '#ffd23f', '#ff8a1c', '#3acf6a'];
  gems.forEach((c, i) => {
    const a = Math.PI * (0.15 + (i / 5) * 0.7);
    const x = HX - Math.cos(a) * 64;
    const y = HY + 30 + Math.sin(a) * 40;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    stroke(ctx, 2.5);
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(HX - 50, HY - 46);
  ctx.quadraticCurveTo(HX, HY - 70, HX + 50, HY - 46);
  stroke(ctx, 5);
  stroke(ctx, 2.5, '#ffd23f');
}

// ——— Endgame: a white-and-red time-heist band and a gold hex badge over the hero's own head ———

function endgameDetail(shape: HeroArt['shape']): (ctx: Ctx) => void {
  return (ctx) => {
    ctx.save();
    headPath(ctx, shape ?? 'round');
    ctx.clip();
    // the band: white with red edges, sweeping across the lower head
    const band = (y0: number, w: number, col: string) => {
      ctx.beginPath();
      ctx.moveTo(HX - HR - 10, y0 + 18);
      ctx.quadraticCurveTo(HX, y0 - 10, HX + HR + 10, y0 + 18);
      ctx.lineTo(HX + HR + 10, y0 + 18 + w);
      ctx.quadraticCurveTo(HX, y0 - 10 + w, HX - HR - 10, y0 + 18 + w);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    band(HY + 62, 26, '#c8102e');
    band(HY + 68, 14, '#f4f2ee');
    ctx.restore();
    // the gold hex badge with a white time-glass
    const bx = HX + HR * 0.62;
    const by = HY + HR * 0.58;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = bx + Math.cos(a) * 17;
      const y = by + Math.sin(a) * 17;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(bx, by - 17, bx, by + 17);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.5, '#e8b23a');
    g.addColorStop(1, '#8a5a14');
    ctx.fillStyle = g;
    ctx.fill();
    stroke(ctx, 3.5);
    ctx.beginPath();
    ctx.moveTo(bx - 7, by - 9);
    ctx.lineTo(bx + 7, by - 9);
    ctx.lineTo(bx - 7, by + 9);
    ctx.lineTo(bx + 7, by + 9);
    ctx.closePath();
    ctx.fillStyle = '#f4f2ee';
    ctx.fill();
    stroke(ctx, 2);
  };
}

/** The Avengers-style heroes that get an Endgame variant (Iron Pan, Captain Pizzeria, Spider-Pan and Thor have
 * variants of their own). */
const ENDGAME = ['captainmarvellous', 'starlard', 'incrediblebulk', 'blackwindow', 'hawkeyetalian', 'blackpanther', 'strangeloaf', 'scarletpitch', 'antpan', 'wasabiwasp', 'rocketrucola', 'iamcrust'];

const ENDGAME_TWIST = ' Endgame: the meter fills 10% faster, and the signature opens a ring of portals that strike the 5 toughest feet (×3 each).';

function endgamePeel(id: string): HeroPeel {
  const base = hero(id);
  const art = HERO_ART[id];
  const fx0 = base.ability.fx[0];
  const move = fx0?.e === 'move' ? fx0.id : '';
  const noButton = base.ability.trigger.t !== 'active';
  const ability: Ability = noButton
    ? { ...base.ability, name: `${base.ability.name}: Endgame`, desc: `${base.ability.desc} Endgame: the first time he hulks out each wave, a ring of portals opens and strikes the 5 toughest feet (×3 each).` }
    : variantAbility(base.ability, `${base.ability.name}: Endgame`, `endgame_${move}`, id === 'iamcrust' ? 'I am Crust.' : `${base.ability.desc}${ENDGAME_TWIST}`, 0.9);
  return {
    id: `hero:${id}endgame`,
    name: `${base.name}: Endgame`,
    sub: 'heroes',
    after: base.id,
    goal: beatWith(`thanfoot_${id}`, 'thanfoot', 'Thanfoot', base.id, base.name, 1),
    how: id === 'iamcrust'
      ? 'I am Crust. (Beat Thanfoot with I Am Crust equipped: he’s the boss at wave 70, in The Doom Lab. Any heat counts.)'
      : `Whatever it takes: beat Thanfoot with ${base.name} equipped. He’s the boss at wave 70, in The Doom Lab. Any heat counts.`,
    look: heroLook(`hero:${id}endgame`, { ...art, glow: '#ffd23f', fine: true, detail: endgameDetail(art.shape) }),
    ability,
  };
}

// ——— the comic nemeses' variants ———

/** Shield of Liberty: the star shield itself, big and gold-rimmed, held in front. */
function libertyDetail(ctx: Ctx): void {
  const x = HX + 46;
  const y = HY + 62;
  for (const [r, col] of [[34, '#ffd23f'], [27, '#c8102e'], [19, '#f4f1ea'], [12, '#2a4ab8']] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    stroke(ctx, 2.5);
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? 4.5 : 10;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - 12, y - 14, 10, 4, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
}

/** Symbiote Pan: a big white jagged spider across the chest, and goo dripping off the rim. */
function symbioteDetail(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(HX, HY + 28);
  for (const [dx, dy] of [[-8, 50], [-44, 38], [-20, 62], [-48, 86], [-12, 76], [0, 104], [12, 76], [48, 86], [20, 62], [44, 38], [8, 50]]) ctx.lineTo(HX + dx, HY + dy);
  ctx.closePath();
  ctx.fillStyle = '#f4f4f8';
  ctx.fill();
  stroke(ctx, 2.5);
  for (const [x, l] of [[HX - 60, 22], [HX + 54, 30], [HX - 20, 16]]) {
    ctx.beginPath();
    ctx.moveTo(x - 6, HY + HR - 18);
    ctx.quadraticCurveTo(x - 4, HY + HR - 18 + l, x, HY + HR - 14 + l);
    ctx.quadraticCurveTo(x + 4, HY + HR - 18 + l, x + 6, HY + HR - 18);
    ctx.fillStyle = '#16161e';
    ctx.fill();
    stroke(ctx, 2);
  }
}

/** Amazon Queen: a golden eagle-wing crest over the head and a gold breastplate rim. */
function amazonDetail(ctx: Ctx): void {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(HX + s * 10, HY - HR + 14);
    ctx.bezierCurveTo(HX + s * 40, HY - HR - 20, HX + s * 80, HY - HR - 10, HX + s * 96, HY - HR + 30);
    ctx.lineTo(HX + s * 70, HY - HR + 22);
    ctx.lineTo(HX + s * 74, HY - HR + 40);
    ctx.lineTo(HX + s * 48, HY - HR + 30);
    ctx.lineTo(HX + s * 46, HY - HR + 46);
    ctx.lineTo(HX + s * 16, HY - HR + 32);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, HY - HR - 20, 0, HY - HR + 46);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.5, '#e8b23a');
    g.addColorStop(1, '#8a5a14');
    ctx.fillStyle = g;
    ctx.fill();
    stroke(ctx, 3);
  }
  ctx.beginPath();
  ctx.arc(HX, HY + 58, 34, Math.PI * 0.1, Math.PI * 0.9);
  stroke(ctx, 6);
  stroke(ctx, 3, '#ffd23f');
}

const sp = hero('superpeel');
const ip = hero('ironpan');

export const peels: HeroPeel[] = [
  {
    id: 'hero:ghostofsparta',
    name: 'Kratos, Ghost of Sparta',
    sub: 'greek',
    pantheon: 'greek',
    after: 'hero:kratos',
    goal: beatWith('zeusKratos', 'zeus', 'Zeus', 'hero:kratos', 'the Kratos Peel', 3),
    how: 'Kill the king of the gods: beat Zeus 3 times with the Kratos Peel equipped. He only turns up at wave 90, in Tartarus, when the Kratos Peel is your peel. Any heat counts.',
    look: ghostSpartaLook,
    ability: ghostSparta,
  },  {
    id: 'hero:superpeelprime',
    name: 'Superpeel Prime',
    sub: 'heroes',
    after: 'hero:superpeel',
    goal: beatWith('doomstompSuperpeel', 'doomstomp', 'Doomstomp', 'hero:superpeel', 'Superpeel', 3),
    how: 'The day he stopped holding back: beat Doomstomp 3 times with Superpeel equipped. Doomstomp is the boss at wave 65, on Metropizza Rooftops. Any heat counts.',
    look: heroLook('hero:superpeelprime', { ...HERO_ART.superpeel, suit: '#1c2a5e', suit2: '#141f48', cape: '#8a0a18', emblemColor: '#e8edf2', emblemBg: '#8a0a18', eyes: 'glow', eyeColor: '#ff6a4a', metal: true, glow: '#ff3a2a', trail: '#ff3a2a', handle: '#141f48', detail: primeDetail }),
    ability: variantAbility(sp.ability, 'Heat Vision: Full Sweep', 'heatVisionPrime', `Signature (${S} when the meter is full): the peel’s eyes burn, then two red beams rake the whole screen from top to bottom: ×12 to every foot they touch, a 1.5 s stun and a burn. Passive, Man of Steel: your peel can’t be stunned, frozen, slowed or snatched.`, 1, 0xff3a2a),
  },
  {
    id: 'hero:ironpaninfinity',
    name: 'Iron Pan Mark Infinity',
    sub: 'heroes',
    after: 'hero:ironpan',
    goal: beatWith('ultoeIronpan', 'ultoe', 'Ultoe', 'hero:ironpan', 'Iron Pan', 3),
    how: 'The last suit he ever built: beat Ultoe 3 times with Iron Pan equipped. Ultoe is the mini-boss at wave 68, in The Doom Lab. Any heat counts.',
    look: heroLook('hero:ironpaninfinity', { ...HERO_ART.ironpan, suit: '#8a0a1a', maskColor: '#ffd23f', emblemColor: '#ffffff', glow: '#9ff0ff', trail: '#ffd23f', fine: true, detail: infinityDetail }),
    ability: variantAbility(ip.ability, 'Suit Up: Mark Infinity', 'suitUpInfinity', `Signature (${S}): armour plates snap onto the peel for 20 s. Auto repulsors fire at the two nearest feet every 0.7 s (×2 each), and the suit ends with the Infinity Beam: the Unibeam down the centre lane (×15), then a six-coloured beam that sweeps across every lane (×15). Passive, HUD: every foot shows a health bar.`),
  },
  {
    id: 'hero:thorunleashed',
    name: 'Thor, Thunder Unleashed',
    sub: 'norse',
    pantheon: 'norse',
    after: 'hero:thor',
    goal: beatWith('surtrThor', 'surtr', 'Surtr', 'hero:thor', 'Thor', 3),
    how: 'Stop Ragnarök: beat Surtr 3 times with Thor equipped. Surtr is the boss at wave 80, on the Bifröst Bridge. Any heat counts (and any day of the week).',
    look: godVariant('hero:thorunleashed', { pantheon: 'norse', symbol: 'hammer', color: '#ffe680', base: '#4a4a5a', rim: '#c9cfd8', handle: '#2a2a36' }, (ctx) => {
      bolt(ctx, HX - 46, HY - 70, 1, '#ffe680');
      bolt(ctx, HX + 52, HY - 64, 0.9, '#bfe8ff');
      bolt(ctx, HX + 10, HY + 70, 0.8, '#ffe680');
    }),
    ability: {
      name: 'Thunder Unleashed', trigger: { t: 'active' }, fx: [{ e: 'move', id: 'thunderUnleashed' }], charge: 0.85, color: 0xffe680, vfx: 'burst', custom: true,
      desc: `Signature (${S}): the sky darkens and the hammer is raised; lightning strikes every foot (×6) and chains on for 3 jumps (×2). Then the storm stays for 4 s, a bolt every 0.35 s on a random foot (×2, chaining on). Passive, Mjölnir: every 5 s the hammer is thrown as a boomerang (×4 out, ×4 back). Your peel can’t be snatched or stunned.`,
    },
  },
  {
    id: 'hero:odinascended',
    name: 'Odin Allfather Ascended',
    sub: 'norse',
    pantheon: 'norse',
    after: 'hero:odin',
    goal: beatWith('fenrirOdin', 'fenrir', 'Fenrir’s Paw', 'hero:odin', 'Odin', 3),
    how: 'Bind the wolf for good: beat Fenrir’s Paw 3 times with Odin equipped. Fenrir’s Paw is the mini-boss at wave 73, on the Jotunheim Ice Fields. Any heat counts (and any day of the week).',
    look: godVariant('hero:odinascended', { pantheon: 'norse', symbol: 'eye', color: '#ffd23f', base: '#3a3048', rim: '#ffd23f', handle: '#1e1828' }, (ctx) => {
      // light pours down from the eye: thin gold rays and three rune sparks
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(HX + i * 6, HY - 10);
        ctx.lineTo(HX + i * 26, HY + HR + 6);
        stroke(ctx, 2, '#ffe680');
      }
      ctx.restore();
      for (const [x, y] of [[HX - 60, HY - 50], [HX + 62, HY - 40], [HX, HY - 84]]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff2b0';
        ctx.fill();
        stroke(ctx, 2);
      }
    }),
    ability: {
      name: 'Allfather Ascended', trigger: { t: 'active' }, fx: [{ e: 'move', id: 'allfatherAscended' }], charge: 0.85, color: 0xffd23f, vfx: 'burst', custom: true,
      desc: `Signature (${S}): his single eye opens over the table and its light stuns every foot for 1.5 s. Two ravens fly out and mark every foot (×2 damage taken for 8 s), then Gungnir strikes the 8 toughest (×6). Passive, Wisdom of Mimir: every foot shows its weak point (its toes); a smack there deals +25%.`,
    },
  },
  {
    id: 'hero:zeusunbound',
    name: 'Zeus, King Unbound',
    sub: 'greek',
    pantheon: 'greek',
    after: 'hero:zeus',
    goal: beatWith('hadesZeus', 'hades', 'Hades', 'hero:zeus', 'Zeus', 3),
    how: 'Brother against brother: beat Hades 3 times with Zeus equipped. Hades is the boss at wave 90, in Tartarus. Any heat counts.',
    look: godVariant('hero:zeusunbound', { pantheon: 'greek', symbol: 'bolt', color: '#c8a0ff', base: '#5a5a74', rim: '#ffd23f', handle: '#2a2a3a' }, (ctx) => {
      // storm-dark: the whole sword goes violet and shadowed, then violet forks crackle off the blade
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const g = ctx.createLinearGradient(0, 0, 0, 360);
      g.addColorStop(0, 'rgba(90,40,170,0.5)');
      g.addColorStop(1, 'rgba(20,10,40,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 220, 360);
      ctx.restore();
      bolt(ctx, HX - 34, HY - 30, 1, '#e8d8ff');
      bolt(ctx, HX + 36, HY - 60, 0.9, '#e8d8ff');
      bolt(ctx, HX - 30, HY + 50, 0.8, '#ffe680');
    }),
    ability: {
      name: 'Wrath Unbound', trigger: { t: 'active' }, fx: [{ e: 'move', id: 'wrathUnbound' }], charge: 0.8, color: 0xc8a0ff, vfx: 'burst', custom: true,
      desc: `Signature (${S}): the sky splits, and for 3 s thunderbolts rain on every foot (×6 each, chaining to 2 more for ×2). Then the king unbound brings down one last colossal bolt through every foot on the table (×8, a 2 s stun). Passive, King of the Gods: wear Zeus’s look over any other god peel and its numbers go up 10%.`,
    },
  },
  ...ENDGAME.map(endgamePeel),
  {
    id: 'hero:shieldofliberty',
    name: 'Shield of Liberty',
    sub: 'heroes',
    after: 'hero:captainpizzeria',
    goal: beatWith('redsoleCaptain', 'redsole', 'the Red Sole', 'hero:captainpizzeria', 'Captain Pizzeria', 3),
    how: 'HYDRANT falls: beat the Red Sole 3 times with Captain Pizzeria equipped. He only turns up at wave 68, in The Doom Lab, when Captain Pizzeria is your peel. Any heat counts.',
    look: heroLook('hero:shieldofliberty', { ...HERO_ART.captainpizzeria, suit: '#1a2f80', maskColor: '#1a2f80', earColor: '#ffd23f', emblemBg: '#c8102e', metal: true, glow: '#ffd23f', trail: '#ffd23f', handle: '#8a0a1a', fine: true, detail: libertyDetail }),
    ability: variantAbility(hero('captainpizzeria').ability, 'Shield of Liberty', 'shieldLiberty', `Signature (${S}): the star shield ricochets 16 times round the screen (×3 each), twice as often as Captain Pizzeria’s, and on its last bounce it lands on your weakest pizza as a stomp shield. Passive, I can do this all day: +30% damage while any pizza is on 1 slice.`, 1, 0xffd23f),
  },
  {
    id: 'hero:symbiotepan',
    name: 'Symbiote Pan',
    sub: 'heroes',
    after: 'hero:spiderpan',
    goal: beatWith('venomnomSpider', 'venomnom', 'Venomnom', 'hero:spiderpan', 'Spider-Pan', 3),
    how: 'We are Spider-Pan: beat Venomnom 3 times with Spider-Pan equipped. It only turns up at wave 68, in The Doom Lab, when Spider-Pan is your peel. Any heat counts.',
    look: heroLook('hero:symbiotepan', { ...HERO_ART.spiderpan, suit: '#16161e', patternColor: '#30303e', maskColor: '#16161e', emblemColor: '#f4f4f8', glow: '#7a6aff', trail: '#c8c8ff', handle: '#16161e', fine: true, detail: symbioteDetail }),
    ability: variantAbility(hero('spiderpan').ability, 'Web Ceiling: Symbiote', 'webSymbiote', `Signature (${S}): black webs span the top of the screen for 10 s. Every foot that drops through them sticks for 2 s, and the webs grow tendrils: every 0.7 s one reaches down, grabs the nearest foot below and drags it up into the web (stuck for 2 s, ×1). Passive, Spider-Sense: a foot’s outline tingles 0.5 s before it stomps.`, 1, 0x7a6aff),
  },
  {
    id: 'hero:amazonqueen',
    name: 'Amazon Queen',
    sub: 'heroes',
    after: 'hero:wonderwedge',
    goal: beatWith('cheetoeWonder', 'cheetoe', 'the Cheetoe', 'hero:wonderwedge', 'Wonder Wedge', 3),
    how: 'Queen of the Amazons: beat the Cheetoe 3 times with Wonder Wedge equipped. She only turns up at wave 63, on Metropizza Rooftops, when Wonder Wedge is your peel. Any heat counts.',
    look: heroLook('hero:amazonqueen', { ...HERO_ART.wonderwedge, suit: '#e8b23a', suit2: '#8a1a1a', emblemColor: '#c8102e', emblemBg: '#ffd23f', metal: true, glow: '#ffd23f', trail: '#ffd23f', handle: '#8a1a1a', fine: true, detail: amazonDetail }),
    ability: variantAbility(hero('wonderwedge').ability, 'Lasso of the Queen', 'lassoQueen', `Signature (${S}): the golden lasso ropes the 3 toughest feet and yanks them together: each is stunned for 1.5 s, its next stomp is cancelled and its weak spot glows (×3 damage there for 8 s). Passive, Royal Bracers: 25% of stomps glance off with a ping.`, 1),
  },
];
