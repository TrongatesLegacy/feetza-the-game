// Act 8 · Norse feet: what their traits can't say.
// - Frost Giant Toes chill the pizzas beside them (their perks ice over while it's near).
// - Draugr Boots rise again once (the 'revive' trait), unless they were ever set burning.
// - Troll Feet follow your peel from pizza to pizza, and turn to stone in the sun-gap's light.
// - Valkyrie-Cursed Clogs always fly in as a pair, swooping down from the top.
// - Raven Talons, Skald Slippers, Dwarf-Forged Boots and Muspel Fire-Feet: their traits do the work too (flutter and
//   thief, cheer, guard, immuneBurn and scorch); here they get their voices and their trait moments (the raven's caw
//   as it steals, the skald's song while he rallies the feet round him, the scorch's roar; the dwarf's shield rings
//   with its own sounds: ShieldDef.sounds in src/content/style/acts-d-5.ts).
// - Wolf-Pup Paws, Berserker Boots and Shieldmaiden Sabatons: their traits do the work (swarm and woolly, rush and
//   enrage, parry); here they get their voices (arrival, hurt, death) and their trait moments (the litter's yips,
//   the berserker's rage, the shield's clang, which also tells its live layer to swing the shield).
// It also tells the Norse backdrops which wave of the stage it is (see actFx at the end).

import Phaser from 'phaser';
import { heatRank } from '../../data/difficulty';
import { FOOT_BY_ID } from '../../data/feet';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { ActFx, FootFx } from '../contentFx';
import { waveInStage } from '../Run';
import type { Pizza } from '../Pizza';
import { crand } from '../../systems/cosmeticRandom';

const onScreen = (f: Foot) => f.alive && !f.held && !f.pinned && f.y > 60 && (f.state === 'hover' || f.state === 'descend' || f.state === 'stomp');

// ——— Frost Giant Toes ———

/** How far its chill reaches (px either side): its own pizza and the ones beside it. */
const CHILL_R = 380;
/** Perks stay iced this long after it leaves. */
const CHILL_LINGER = 0.8;

const frostgiant: FootFx = {
  tick: (a, f, dt) => {
    if (!onScreen(f)) return;
    for (const p of a.alivePizzas()) {
      if (Math.abs(p.x - f.x) > CHILL_R) continue;
      if (!p.perkFrozen) {
        a.freezePerk(p, CHILL_LINGER + 0.4);
        a.quip(p.x, p.surfaceY - 190, 'CHILLED!', '#bfe8ff', 34);
        a.sfx('sfx_frostchill', { throttle: 400 });
        a.fx.frost(p.x, p.surfaceY - 20);
      } else if (p.perkFrozenT < CHILL_LINGER) p.perkFrozenT = CHILL_LINGER;
      // frost breath drifting from the toes onto the pizza
      if (Math.random() < dt * 2.5) a.fx.frost(p.x + (Math.random() - 0.5) * p.radius * 1.4, p.surfaceY - 10);
    }
    if (Math.random() < dt * 3) a.fx.frost(f.x + (Math.random() - 0.5) * 120 * f.scale, f.y - 30);
  },
};

// ——— Draugr Boots ———

const draugr: FootFx = {
  tick: (a, f, _dt) => {
    // a burning draugr stays in its grave
    if (f.burnT > 0 && !f.reviveUsed) {
      f.reviveUsed = true;
      f.brain.burned = true;
      a.quip(f.x, Math.max(260, f.cy - 140), 'BURNED: IT STAYS DOWN!', '#ffb24a', 32);
      for (let i = 0; i < 5; i++) a.fx.burn(f.cx + (Math.random() - 0.5) * 80, f.cy + (Math.random() - 0.5) * 80);
    }
    // it went down and got back up: grave-fire and earth
    if (f.reviveUsed && !f.brain.burned && !f.brain.rose) {
      f.brain.rose = true;
      f.setPhaseAura(0x7fe8ff);
      a.quip(f.x, Math.max(260, f.cy - 170), 'THE DEAD RISE!', '#7fe8ff', 40);
      a.sfx('sfx_draugrrise');
      a.fx.puff(f.x, f.y, 12);
      a.fx.ring(f.cx, f.cy, 0x7fe8ff, 1.2, 0.6);
    }
  },
};

// ——— Troll Feet and the sun-gap ———

/** The beam of sunlight through the clouds. One per scene, alive while any troll is. */
interface Sun {
  sc: Phaser.Scene;
  x: number;
  /** Where it's moving to next (it glows there first). */
  next: number | null;
  t: number;
  warnT: number;
  g: Phaser.GameObjects.Graphics;
  hint: Phaser.GameObjects.Graphics;
  motes: Phaser.GameObjects.Particles.ParticleEmitter;
  alpha: number;
  frame: number;
  stop?: () => void;
}

let sun: Sun | null = null;
/** Seconds between the beam's moves, and its half width at the table. */
const SUN_STAY = 7;
const SUN_WARN = 1.6;
const SUN_HALF = 150;

function pizzaXs(a: Arena): number[] {
  return a.alivePizzas().map((p) => p.x).sort((x, y) => x - y);
}

function sunFor(a: Arena): Sun {
  if (sun && sun.sc === a.sc && sun.g.active) return sun;
  const xs = pizzaXs(a);
  const x = xs.length ? xs[Math.floor(Math.random() * xs.length)] : 960;
  const g = a.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const hint = a.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const motes = a.sc.add.particles(0, 0, 'soft', {
    x: { min: -SUN_HALF * 0.8, max: SUN_HALF * 0.8 }, y: { min: 120, max: 860 }, lifespan: 2600, frequency: 90,
    speedY: { min: -12, max: 14 }, speedX: { min: -8, max: 8 }, scale: { min: 0.04, max: 0.1 },
    alpha: { values: [0, 0.8, 0] }, tint: [0xfff2b0, 0xffffff], blendMode: 'ADD',
  });
  a.underLayer.addAt([g, hint, motes], 0);
  sun = { sc: a.sc, x, next: null, t: SUN_STAY, warnT: 0, g, hint, motes, alpha: 0, frame: -1 };
  // trolls tick the beam; this watches for the last one going (then nothing ticks it) and fades it out
  const watch = () => sunCheck(a);
  const stop = () => {
    a.sc.events.off('update', watch);
    a.sc.events.off('shutdown', stop);
    sun = null;
  };
  a.sc.events.on('update', watch);
  a.sc.events.once('shutdown', stop);
  sun.stop = stop;
  a.quip(x, 200, 'THE SUN BREAKS THROUGH!', '#fff2b0', 34);
  a.sfx('sfx_sungap');
  return sun;
}

function drawBeam(g: Phaser.GameObjects.Graphics, x: number, alpha: number, now: number): void {
  g.clear();
  if (alpha <= 0.01) return;
  // a soft column, wider at the table, with a bright core and a pool of light on the table
  const top = 40;
  const bot = 900;
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    const wTop = 60 + 70 * k;
    const wBot = SUN_HALF * (0.45 + 0.75 * k);
    const a = alpha * (0.16 - k * 0.022) * (0.9 + Math.sin(now * 1.7 + i) * 0.1);
    g.fillStyle(0xfff0b8, a);
    g.beginPath();
    g.moveTo(x - wTop, top);
    g.lineTo(x + wTop, top);
    g.lineTo(x + wBot, bot);
    g.lineTo(x - wBot, bot);
    g.closePath();
    g.fillPath();
  }
  g.fillStyle(0xfff6d0, alpha * 0.22).fillEllipse(x, 892, SUN_HALF * 2.3, 120);
  g.fillStyle(0xffffff, alpha * 0.16).fillEllipse(x, 892, SUN_HALF * 1.3, 62);
}

/** Update the beam once per frame (every troll calls this; only the first call each frame counts). */
function tickSun(a: Arena, dt: number): Sun {
  const s = sunFor(a);
  const frame = Math.round(a.now() * 1000);
  if (s.frame === frame) return s;
  s.frame = frame;
  s.alpha = Math.min(1, s.alpha + dt * 1.2);
  s.t -= dt;
  if (s.next === null && s.t <= SUN_WARN) {
    // the clouds part over another pizza first
    const xs = pizzaXs(a).filter((x) => Math.abs(x - s.x) > 60);
    if (xs.length) {
      s.next = xs[Math.floor(Math.random() * xs.length)];
      a.quip(s.next, 230, 'THE CLOUDS PART…', '#fff2b0', 30);
      a.sfx('sfx_sungap', { volume: 0.6 });
    } else s.t = SUN_STAY;
  }
  if (s.next !== null) {
    if (s.t <= 0) {
      // slide across
      s.x += (s.next - s.x) * Math.min(1, dt * 3.5);
      if (Math.abs(s.next - s.x) < 4) {
        s.x = s.next;
        s.next = null;
        s.t = SUN_STAY;
      }
    }
  } else {
    // keep it over its pizza if the table re-lays out
    const xs = pizzaXs(a);
    if (xs.length) {
      const near = xs.reduce((b, x) => (Math.abs(x - s.x) < Math.abs(b - s.x) ? x : b));
      s.x += (near - s.x) * Math.min(1, dt * 2);
    }
  }
  drawBeam(s.g, s.x, s.alpha, a.now());
  s.motes.setPosition(s.x, 0);
  s.hint.clear();
  if (s.next !== null && s.t > 0) {
    const k = 1 - s.t / SUN_WARN;
    drawBeam(s.hint, s.next, 0.25 + 0.35 * k * (0.7 + Math.sin(a.now() * 14) * 0.3), a.now());
  }
  return s;
}

/** Fade the beam out once the last troll is gone. */
function sunCheck(a: Arena): void {
  if (!sun || sun.sc !== a.sc || !sun.g.active) return;
  if (a.allFeet().some((o) => o.alive && o.type.id === 'troll')) return;
  const s = sun;
  s.stop?.();
  a.sc.tweens.add({ targets: [s.g, s.hint, s.motes], alpha: 0, duration: 900, onComplete: () => [s.g, s.hint, s.motes].forEach((o) => o.destroy()) });
}

type LaneScene = { assignLane(f: Foot, prefer?: Pizza | null): boolean; laneCache: { key: string } };

/** Move a hovering troll to a lane over pizza p (if one is free there). */
function relaneTo(a: Arena, f: Foot, p: Pizza): boolean {
  const sc = a as unknown as LaneScene;
  const before = f.target;
  if (!sc.assignLane || !sc.assignLane(f, p)) return false;
  f.laneKey = sc.laneCache.key;
  return f.target !== before;
}

const STONE_GREY = 0x9a9a94;

const troll: FootFx = {
  tick: (a, f, dt) => {
    const s = tickSun(a, dt);
    const stone = Number(f.brain.stone ?? 0);
    if (stone > 0) {
      f.brain.stone = stone - dt;
      f.tint(STONE_GREY);
      if (stone - dt <= 0) {
        f.vuln = 1;
        f.tint(null);
        f.brain.stoneCool = 2.5;
        a.quip(f.x, Math.max(260, f.cy - 150), 'IT SHAKES OFF THE STONE!', '#c9b47a', 30);
        a.fx.puff(f.cx, f.cy, 8);
      }
      return;
    }
    f.brain.stoneCool = Math.max(0, Number(f.brain.stoneCool ?? 0) - dt);
    if (!onScreen(f)) return;
    // trolls follow your peel: once per hover, it shuffles over to the pizza under the peel
    if (f.state === 'hover' && !f.brain.sniffed && f.stateT > 0.35 && f.stateT < f.hoverTime * 0.7) {
      const pp = a.peelPoint();
      const ps = a.alivePizzas();
      if (ps.length > 1 && pp.y > 150) {
        const want = ps.reduce((b, p) => (Math.abs(p.x - pp.x) < Math.abs(b.x - pp.x) ? p : b));
        if (want !== f.target && Math.abs(want.x - pp.x) < want.radius * 1.3) {
          f.brain.sniffed = true;
          if (relaneTo(a, f, want)) {
            f.stateT = Math.min(f.stateT, f.hoverTime * 0.4);
            a.quip(f.x, Math.max(250, f.cy - 140), 'SNIFF SNIFF…', '#c9e08a', 30);
          }
        }
      }
    }
    if (f.state === 'lift') f.brain.sniffed = false;
    // sunlight turns it to stone (stone takes double damage)
    if (Number(f.brain.stoneCool ?? 0) <= 0 && s.alpha > 0.6 && Math.abs(f.x - s.x) < SUN_HALF && (f.state === 'hover' || f.state === 'descend')) {
      const sec = heatRank(a.heat()) === 0 ? 5 : heatRank(a.heat()) >= 3 ? 3.2 : 4;
      f.brain.stone = sec;
      f.stun(sec, true);
      f.vuln = 2;
      f.tint(STONE_GREY);
      a.quip(f.x, Math.max(260, f.cy - 160), 'TURNED TO STONE!', '#fff2b0', 40);
      a.sfx('sfx_trollstone');
      a.fx.ring(f.cx, f.cy, 0xfff2b0, 1.3, 0.7);
      a.fx.puff(f.cx, f.cy, 10);
      a.shake(160, 0.004);
    }
  },
};

// ——— Valkyrie-Cursed Clogs ———

let partnering = false;

const valkyrie: FootFx = {
  spawn: (a, f) => {
    // swoop in from high above, off to one side
    const side = f.x < 960 ? -1 : 1;
    f.y = -320;
    f.x += side * 260;
    if (partnering || f.brain.partner) return;
    a.sfx('sfx_valkyrieswoop');
    a.quip(Phaser.Math.Clamp(f.x - side * 260, 260, 1660), 380, 'VALKYRIES!', '#fff6e2', 38);
    // her partner flies in beside her, a beat behind
    const others = a.alivePizzas().filter((p) => p !== f.target);
    const p = others.length ? others.reduce((b, q) => (Math.abs(q.x - f.x) < Math.abs(b.x - f.x) ? q : b)) : f.target;
    partnering = true;
    try {
      const t = FOOT_BY_ID.valkyrie ? a.spawn('valkyrie', p ?? null) : null;
      if (t) {
        t.brain.partner = true;
        t.y = -520;
      }
    } finally {
      partnering = false;
    }
  },
  tick: (a, f, dt) => {
    // a trail of feathers while it dives in
    if ((f.state === 'enter' || f.state === 'descend') && f.y > 0 && Math.random() < dt * 8) a.fx.propTrail(f.cx + (Math.random() - 0.5) * 80, f.cy - 30, 0xfff6e2, 0.4);
  },
};

// ——— Wolf-Pup Paws, Berserker Boots, Shieldmaiden Sabatons ———

/** Hits a foot voices: your smacks, slams, abilities and direct hits (not burn, garlic, splash or chain ticks, which
 * land several times a second). */
const VOICED = new Set(['smack', 'slam', 'ability', 'direct']);

/** A foot's hurt sound on a hit that didn't kill it (the killing blow gets its death sound instead). */
const hurt = (key: string, volume = 0.7, gap = 260) => (a: Arena, f: Foot, _dealt: number, source: string) => {
  if (f.hp <= 0 || !VOICED.has(source)) return;
  a.sfx(key, { volume, throttle: gap });
};

const wolfpup: FootFx = {
  // the litter arrives together: one chorus of yips for the three
  spawn: (a) => a.sfx('sfx_wolfpupyip', { volume: 0.85, throttle: 700 }),
  hit: hurt('sfx_wolfpuphurt', 0.65, 220),
  kill: (a, f) => {
    a.sfx('sfx_wolfpupdie', { volume: 0.8, throttle: 150 });
    a.fx.puff(f.cx, f.cy, 6);
  },
};

const berserker: FootFx = {
  spawn: (a) => a.sfx('sfx_berserkerspawn', { volume: 0.8, throttle: 500 }),
  hit: (a, f, dealt, source) => {
    // the moment it rages (the enrage trait set it just before this hook): a war roar, a red flash
    if (f.enraged && !f.brain.raged && f.hp > 0) {
      f.brain.raged = true;
      a.sfx('sfx_berserkerrage');
      a.fx.ring(f.cx, f.cy, 0xff3a1a, 1.1, 0.6);
      a.shake(120, 0.003);
      return;
    }
    hurt('sfx_berserkerhurt', 0.7)(a, f, dealt, source);
  },
  kill: (a) => a.sfx('sfx_berserkerdie', { throttle: 150 }),
};

const shieldmaiden: FootFx = {
  spawn: (a) => a.sfx('sfx_shieldmaidenspawn', { volume: 0.75, throttle: 500 }),
  hit: hurt('sfx_shieldmaidenhurt', 0.7),
  parry: (a, f) => {
    // the live layer swings the shield out when this count changes (src/content/styleLive/act8a.ts)
    f.brain.parries = Number(f.brain.parries ?? 0) + 1;
    a.sfx('sfx_shieldmaidenparry');
    return true;
  },
  kill: (a) => a.sfx('sfx_shieldmaidendie', { throttle: 150 }),
};

// ——— Raven Talons, Skald Slippers, Dwarf-Forged Boots, Muspel Fire-Feet ———

const raven: FootFx = {
  spawn: (a) => a.sfx('sfx_ravencaw', { volume: 0.8, throttle: 600 }),
  hit: hurt('sfx_ravenhurt', 0.65, 240),
  // its stomp swipes tips: a gloating caw over the clink of coin
  steal: (a) => {
    a.sfx('sfx_ravensteal', { throttle: 300 });
    return true;
  },
  kill: (a, f) => {
    a.sfx('sfx_ravendie', { volume: 0.85, throttle: 150 });
    for (let i = 0; i < 6; i++) a.fx.propTrail(f.cx + (crand() - 0.5) * 120, f.cy + (crand() - 0.5) * 80, 0x1a1a26, 0.5);
  },
};

/** How far the skald's song carries (the cheer trait's reach: GameScene's footTick). */
const SONG_REACH = 450;
/** Seconds between his verses while there's a foot near him to rally. */
const SONG_EVERY = 7.5;

const skald: FootFx = {
  spawn: (a, f) => {
    a.sfx('sfx_skaldsong', { volume: 0.8, throttle: 1200 });
    // (the live layer bursts runes off the strings when this count changes: src/content/styleLive/act8b.ts)
    f.brain.sang = 1;
    f.brain.songT = 0;
  },
  tick: (a, f, dt) => {
    // (no song while he's disarmed: his cheer is off then, Foot.has)
    if (!a.inWave() || !f.has('cheer')) return;
    f.brain.songT = Number(f.brain.songT ?? 0) + dt;
    if (Number(f.brain.songT) < SONG_EVERY) return;
    // a verse only when there's someone near him to hear it
    if (!a.allFeet().some((o) => o !== f && o.alive && Math.abs(o.x - f.x) < SONG_REACH)) return;
    f.brain.songT = 0;
    f.brain.sang = Number(f.brain.sang ?? 0) + 1;
    a.sfx('sfx_skaldrally', { volume: 0.75, throttle: 2500 });
  },
  hit: hurt('sfx_skaldhurt', 0.7),
  kill: (a) => a.sfx('sfx_skalddie', { throttle: 150 }),
};

const dwarfboot: FootFx = {
  spawn: (a) => a.sfx('sfx_dwarfspawn', { volume: 0.8, throttle: 500 }),
  hit: hurt('sfx_dwarfhurt', 0.7),
  kill: (a, f) => {
    a.sfx('sfx_dwarfdie', { throttle: 150 });
    a.fx.ring(f.cx, f.cy + 40, 0xffb04a, 0.8, 0.5);
  },
};

const muspel: FootFx = {
  spawn: (a) => a.sfx('sfx_muspelspawn', { volume: 0.8, throttle: 600 }),
  hit: hurt('sfx_muspelhurt', 0.7),
  // the stomped pizza bursts into flame a moment later
  scorch: (a) => {
    a.sfx('sfx_muspelscorch', { volume: 0.85, throttle: 300 });
    return true;
  },
  kill: (a, f) => {
    a.sfx('sfx_muspeldie', { throttle: 150 });
    a.fx.ring(f.cx, f.cy + 40, 0xff6a1a, 1.1, 0.5);
    a.shake(120, 0.003);
  },
};

export const footFx: Record<string, FootFx> = {
  frostgiant,
  draugr,
  troll: {
    tick: (a, f, dt) => troll.tick!(a, f, dt),
    spawn: (a) => void tickSun(a, 0),
  },
  valkyrie,
  wolfpup,
  berserker,
  shieldmaiden,
  raven,
  skald,
  dwarfboot,
  muspel,
};

/** The act's weather: the Norse backdrops' live layers (src/content/live/act8.ts) change with the wave
 * of the stage (snow thickens, the sky reddens), so each wave tells the backdrop where it is. */
export const actFx: Record<number, ActFx> = {
  8: {
    enter: (a, n) => (a as unknown as { backdrop?: { setWave(w: number): void } }).backdrop?.setWave(waveInStage(n)),
  },
};
