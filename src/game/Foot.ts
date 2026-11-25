// A descending foot: state machine, traits, status effects and its visuals (leg + foot + cuff).

import Phaser from 'phaser';
import { BASE_DESCEND, GUARD_FETCH, HOVER_Y } from '../config';
import { makeGuardFx } from './guardShield';
import type { FootType } from '../data/feet';
import { ensureFootArt, type FootMeta } from './assets';
import type { Pizza } from './Pizza';

export type FootState = 'enter' | 'hover' | 'descend' | 'stomp' | 'lift' | 'dying' | 'gone';

export interface FootHooks {
  onStomp(foot: Foot): void;
  pickTarget(foot: Foot): Pizza | null;
  onEscape(foot: Foot): void;
  /** Ability callouts so the scene can show text/sound. */
  onTrait?(foot: Foot, trait: 'switch' | 'clumsy' | 'hop' | 'surface' | 'reveal' | 'guardDown' | 'guardBreak' | 'guardRearm'): void;
  /** Called every frame while alive (medic heals, magnet pull, roll targeting). */
  onTick?(foot: Foot, dt: number): void;
  /** Lane offset (px from pizza centre) if this foot may start its dive now, or null if the pizza's lanes are full. */
  canDescend?(foot: Foot): number | null;
  /** Move this foot to a free lane over a different pizza (switch, hop, teleport). Returns the new pizza, or null if none is free. */
  relane?(foot: Foot): Pizza | null;
}

/** Where feet wait while every foot is pulled back to the top (a boss set-piece). */
const PINNED_Y = 150;
/** Where a foot with no free lane waits, off the top of the screen. */
const HELD_Y = -260;

const LEG_LEN = 1500;

/** How much further down (world px) a leg's bottom edge must go to tuck inside the foot. The leg is drawn behind
 * the foot, so its square bottom corners show wherever the foot is narrower than the leg (a boot's neck, a narrow
 * cuff). Push the edge down until the foot is at least as wide as the leg, but no more than a third of the foot. */
const tuckCache = new Map<string, number>();
function legTuck(scene: Phaser.Scene, type: FootType, m: FootMeta, footTop: number): number {
  const hit = tuckCache.get(type.id);
  if (hit !== undefined) return hit;
  let tuck = 0;
  try {
    const ft = scene.textures.get(m.footKey).getSourceImage() as HTMLCanvasElement;
    const lt = scene.textures.get(m.legKey).getSourceImage() as HTMLCanvasElement;
    const fw = ft.width;
    const fh = ft.height;
    const fd = ft.getContext('2d')!.getImageData(0, 0, fw, fh).data;
    const ld = lt.getContext('2d')!.getImageData(0, 0, lt.width, 1).data;
    // the leg's solid width (its canvas has a little clear padding)
    let la = -1;
    let lb = -1;
    for (let x = 0; x < lt.width; x++) if (ld[x * 4 + 3] > 128) (la < 0 && (la = x), (lb = x));
    const legSolid = la < 0 ? lt.width : lb - la + 1;
    const rowWidth = (y: number) => {
      let a = -1;
      let b = -1;
      for (let x = 0; x < fw; x++) if (fd[(y * fw + x) * 4 + 3] > 128) (a < 0 && (a = x), (b = x));
      return a < 0 ? 0 : b - a + 1;
    };
    // leg bottom in the foot texture's rows (contact is at originY · height)
    const res = m.textures.res;
    const start = Math.round((-footTop + 16 * type.scale) * res + m.originY * fh);
    const limit = Math.min(fh - 1, start + Math.round(fh * 0.33));
    let y = Math.max(0, start);
    if (rowWidth(y) < legSolid - 2) {
      while (y < limit && rowWidth(y) < legSolid - 2) y++;
      // only tuck when it actually hides the corners; otherwise leave the leg as drawn
      tuck = y < limit ? (y - start + 2) / res : 0;
    }
  } catch {
    tuck = 0;
  }
  tuckCache.set(type.id, tuck);
  return tuck;
}
/** Feet are drawn a touch larger than their texture so they read clearly against the busy backdrops. */
const FOOT_DISPLAY = 1.12;

export class Foot {
  readonly scene: Phaser.Scene;
  readonly type: FootType;
  readonly meta: FootMeta;
  readonly root: Phaser.GameObjects.Container;
  private readonly baseScale: number;
  /** Size multiplier on top of the type's scale (King Honk's shuffle shrinks his shoes so three fit). */
  sizeMul = 1;
  get scale(): number {
    return this.baseScale * this.sizeMul;
  }
  /** Overrides where this foot hovers (contact y) before diving; null = the usual HOVER_Y. */
  hoverY: number | null = null;
  private leg: Phaser.GameObjects.TileSprite;
  /** Leg, art and cuff together: outline glows (elite, golden, shiny, phase auras) go round this one silhouette,
   * so they run up the leg instead of cutting across the ankle. */
  private body: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image;
  private cuff?: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Graphics;
  private stars?: Phaser.GameObjects.Container;
  private hooks: FootHooks;

  hp: number;
  maxHp: number;
  armor: number;
  speedMul: number;
  elite: boolean;
  state: FootState = 'enter';
  target: Pizza | null = null;
  x: number;
  y: number;
  vy = 0;
  stateT = 0;
  age = 0;
  hoverTime = 1;
  burnT = 0;
  burnDps = 0;
  burnAcc = 0;
  /** The current burn came from a peel ability (its kills don't charge the meter). */
  burnFromAbility = false;
  slowT = 0;
  slowPct = 0;
  stunT = 0;
  frozen = false;
  phased = false;
  feinted = false;
  reviveUsed = false;
  stink = 0;
  trapped = false;
  hitOnce = false;
  lastHitBy = 0;
  /** Seconds before a regrowing boss starts to heal again after a hit (GameScene sets it on damage). */
  regenHold = 0;
  golden = false; // converted by Golden Touch
  slowAbove = 0;
  /** Speed boost from a nearby Jingle Toes (0..1). */
  cheer = 0;
  /** Horizontal lane offset from the target pizza's centre while diving. */
  slot = 0;
  /** A fixed screen x to hover over instead of the target pizza (King Honk's shuffle keeps each shoe in its own lane). */
  laneX: number | null = null;
  /** Unused by lanes (kept for queued boss stand-ins): waits higher up. */
  waiting = false;
  /** First lane this foot holds (index into the table's lanes), -1 = none. Set by the scene. */
  laneSide = -1;
  /** How many lanes it holds (wide feet take two). */
  laneRow = 1;
  /** The table layout its lane was picked for (the scene re-places it when the table changes). */
  laneKey = '';
  /** No free lane: waits off the top of the screen until one opens. */
  held = false;
  /** Pulled back to the top and paused (a boss set-piece is playing). */
  pinned = false;
  /** Hover time multiplier (the heat's crowd setting). */
  hoverMul = 1;
  /** Seconds actually on screen (not held or pinned). */
  fleeAge = 0;
  /** A twin that shares this foot's health: damage to this foot goes to `link` instead. */
  link: Foot | null = null;
  glossy: boolean;
  wool: number;
  parryReady = true;
  enraged = false;
  private switched = false;
  private stompedTwice = false;
  private phaseT = Math.random() * 2;
  private burstT = 0;
  private zigBase = 0;
  private wobbleT = Math.random() * 10;
  private flashT = 0;
  /** A guard foot with a rhythm (Spartan Sandals): its shield is down for this much longer (on its beat, or just
   * after a stomp). */
  guardOpen = 0;
  /** The rhythm: counts up to the next drop while hovering or diving. */
  guardT = 0;
  guardNext = 1;
  /** The shield is about to drop (it trembles and its rim glows): set guardWarn seconds before each drop. */
  guardWarned = false;
  /** Blocked smacks the shield can still take (guardMax at full strength: GameScene sets both from the heat). */
  guardHp = 6;
  guardMax = 6;
  /** Its shield shattered: unguarded until it re-arms. */
  guardBroken = false;
  /** Knock-on damage (chains, splashes, blasts) soaked by the raised shield, towards knocking its next step off
   * (GameScene: guardChip). Automatic damage glances off it and doesn't count. */
  guardChipAcc = 0;
  /** Its step's worth when it last soaked some (for the badge's filling step). */
  guardChipStep = 1;
  /** Done with shields for good (a raging Spartan threw its shield away): no rhythm, no new one. */
  guardDone = false;
  /** Seconds since the shield broke, and how long until a new one is raised (whatever happens meanwhile). */
  guardIdle = 0;
  guardRearmAfter = 9;
  /** The new shield is being fetched (seconds into it, the last GUARD_FETCH of the wait): still unguarded. */
  guardFetchT = -1;
  /** The shield's moving piece and leg badge (src/game/guardShield.ts). */
  guardFx: {
    update(dt: number): void;
    blocked(left: number, quiet?: boolean, steps?: number): void;
    chipped(): void;
    /** Automatic damage glanced off the raised shield: true if it showed (a ting and a shiver, throttled). */
    deflected(): boolean;
    broke(): void;
    /** A raging foot rears back with its shield (gods.ts), then throws it: where it leaves from, or null. */
    windup(): void;
    throwOff(): { key: string; x: number; y: number; scale: number } | null;
    /** Done with shields: the badge says RAGE. */
    rage(): void;
    /** Hide its leg badge while another one stands in (a friendly zombie's: src/game/zombiePeel.ts). */
    setBadgeVisible(v: boolean): void;
    destroy(): void;
  } | null = null;
  /** Extra lean (radians) the foot's own moves add (reaching back for a new shield). */
  leanExtra = 0;
  /** Extra lean (radians) a boss's effect adds on top (a zombie foot's sickly sway and twitches). */
  leanFx = 0;
  /** The shield piece's containers: they follow the rig like its light twin (attachShield). */
  private shieldSwing?: Phaser.GameObjects.Container;
  private shieldSquash?: Phaser.GameObjects.Container;
  /** Gym Bro: armour gained while unhit. */
  bulk = 0;
  private bulkT = 0;
  private hopped = false;
  /** Sandy: buried (untouchable) while hovering. */
  buried = false;
  /** Seconds the foot stays visible after being revealed (Mime). */
  revealT = 0;
  /** Tips stolen by a Thief, returned when it is smacked down. */
  stolen = 0;
  /** Greek perk: traits switched off for a few seconds. */
  disarmT = 0;
  /** Boss phase (1-based). */
  phase = 1;
  /** Extra state for boss brains. */
  brain: Record<string, number | boolean> = {};
  /** Damage-taken multiplier (overheat windows, marks). */
  vuln = 1;
  /** Hard invulnerability (stone form, decoys handled by brains). */
  shielded = false;
  private icons?: Phaser.GameObjects.Container;
  /** Live art layered round the drawn foot (src/game/footLive.ts): images follow its tint, flashes and fades. */
  private liveImgs: Phaser.GameObjects.Image[] = [];
  private liveAbove = 0;
  private fxAbove = 0;
  /** The leg's rest y (the rig drops it as the foot squashes). */
  private legY = 0;
  /** The rig (src/game/footRig.ts): the art hangs from the ankle (swing) and squashes at the sole (squash). */
  private rig: { swing: Phaser.GameObjects.Container; squash: Phaser.GameObjects.Container; lightSwing: Phaser.GameObjects.Container; light: Phaser.GameObjects.Container } | null = null;
  /** The live art's owner: told when the foot dies, escapes or is destroyed. */
  liveHost: { die(): void; destroy(): void } | null = null;
  /** A boss brain is moving this foot by hand: skip its own movement AI. */
  puppet = false;
  /** A zombie foot (the Zombie Loafer's bite, or the zombie peels' own): defeating one counts towards its zombie peel. */
  zombified = false;
  /** A friendly zombie the zombie peels made (src/game/zombiePeel.ts): it holds still, takes no damage and can't be
   * smacked or targeted until it bursts. */
  zombieHold = false;
  /** The share of its health it gets back up with (the revive trait: half; a Zombie Loafer's zombie by heat). */
  reviveFrac = 0.5;
  /** Speed multiplier from boss roars, avalanches and enrages. */
  hurry = 1;
  /** A rare shiny: unlocks its shiny peel when defeated. */
  shiny = false;
  /** Peel-ability mark: takes markMult damage until markUntil (scene time). */
  markUntil = 0;
  markMult = 1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, shadowLayer: Phaser.GameObjects.Container, type: FootType, x: number, opts: { hpMult: number; speedMult: number; elite: boolean; hooks: FootHooks }) {
    this.scene = scene;
    this.type = type;
    // drawn now if nothing warmed it first (src/game/assets.ts)
    this.meta = ensureFootArt(scene, type.id)!;
    this.hooks = opts.hooks;
    this.elite = opts.elite;
    this.baseScale = type.scale * FOOT_DISPLAY * (opts.elite ? 1.08 : 1);
    this.maxHp = Math.round(type.hp * opts.hpMult * (opts.elite ? 1.8 : 1));
    this.hp = this.maxHp;
    this.armor = type.armor + (opts.elite ? 1 : 0);
    this.speedMul = opts.speedMult;
    this.x = x;
    this.y = -80;

    const m = this.meta;
    const k = 1 / m.textures.res;
    const rel = this.scale / type.scale; // elite enlargement relative to the drawn texture
    this.root = scene.add.container(x, this.y);
    this.root.setScale(rel);
    const legTex = scene.textures.get(m.legKey).getSourceImage() as HTMLCanvasElement;
    const legW = legTex.width * k;
    const footTop = m.footHeight * type.scale; // world px from contact up to ankle
    // a styled leg ends where its join says; the others are tucked in far enough to hide their corners
    const legBottom = m.textures.legEnd !== undefined ? (m.textures.legEnd - m.footHeight) * type.scale : -footTop + 16 * type.scale + legTuck(scene, type, m, footTop);
    this.leg = scene.add.tileSprite(0, legBottom, legW, LEG_LEN, m.legKey).setOrigin(0.5, 1).setTileScale(k, k);
    this.img = scene.add.image(0, 0, m.footKey).setOrigin(0.5, m.originY).setScale(k);
    this.body = scene.add.container(0, 0, [this.leg, this.img]);
    this.root.add(this.body);
    this.legY = legBottom;
    if (m.cuffKey) {
      this.cuff = scene.add.image(0, -footTop + 4 * type.scale, m.cuffKey).setScale(k);
      this.body.add(this.cuff);
    }
    this.hpBar = scene.add.graphics();
    this.root.add(this.hpBar);
    layer.add(this.root);

    this.shadow = scene.add.image(x, 0, 'shadow').setAlpha(0).setVisible(false);
    shadowLayer.add(this.shadow);

    if (type.art.ghost) {
      this.leg.setAlpha(0.7);
      this.img.setAlpha(0.8);
    }
    if (opts.elite || type.id === 'golden') {
      this.body.postFX?.addGlow(opts.elite ? 0xff4dd2 : 0xffe066, 4, 0, false, 0.1, 12);
    }
    if (type.mini) this.root.setScale(rel);
    this.glossy = type.traits.includes('glossy');
    this.buildIcons();
    // a guard foot's shield is a piece of its own, with a badge counting down to its drop
    if (type.traits.includes('guard')) this.guardFx = makeGuardFx(this);
    // (a pair with a shield beat doesn't march in lockstep)
    if (type.guard) this.guardT = Math.random() * type.guard.up[0];
    this.wool = type.traits.includes('woolly') ? 15 : 0;
    this.hoverTime = this.freshHoverTime(type.traits.includes('flee') ? 0.4 : 0.7 + Math.random() * 0.7);
  }

  has(t: FootType['traits'][number]): boolean {
    if (this.disarmT > 0) return false;
    return this.type.traits.includes(t) || this.extraTraits.has(t);
  }

  /** Traits a fight has given it on top of its type's (a zombie foot gets back up once). */
  readonly extraTraits = new Set<FootType['traits'][number]>();

  get isBossLike(): boolean {
    return !!this.type.boss || !!this.type.mini;
  }

  /** Trait badges on the cuff, so players can see what a foot does before it does it. */
  private buildIcons(): void {
    // (a guard foot's shield badge stands in for its trait icon: src/game/guardShield.ts)
    const ts = this.type.traits.filter((t) => t !== 'tiny' && t !== 'guard').slice(0, 3);
    if (!ts.length || this.type.boss || !this.scene.textures.exists(`trait_${ts[0]}`)) return;
    const c = this.scene.add.container(0, -this.meta.footHeight * this.type.scale - 70);
    ts.forEach((t, i) => {
      const k = `trait_${t}`;
      if (!this.scene.textures.exists(k)) return;
      c.add(this.scene.add.image((i - (ts.length - 1) / 2) * 46, 0, k).setScale(0.9));
    });
    this.icons = c;
    this.root.add(c);
    this.syncIcons();
  }

  syncIcons(): void {
    if (!this.icons) return;
    const on = (this.scene.registry.get('traitIcons') as boolean | undefined) ?? true;
    this.icons.setVisible(on && this.alive);
  }

  private freshHoverTime(base: number): number {
    if (this.has('rush')) return 0.12 * this.hoverMul;
    return (base / Math.max(0.7, this.type.speed)) * this.hoverMul;
  }

  /** Set the heat's hover multiplier and re-roll the first hover with it. */
  setHoverMul(m: number): void {
    this.hoverMul = m;
    this.hoverTime = this.freshHoverTime(this.type.traits.includes('flee') ? 0.4 : 0.7 + Math.random() * 0.7);
  }

  get alive(): boolean {
    return this.state !== 'dying' && this.state !== 'gone';
  }

  get hittable(): boolean {
    return this.alive && !this.phased && !this.buried && this.y > -20 && !this.zombieHold;
  }

  get stompY(): number {
    return this.target ? this.target.surfaceY + 4 : 880;
  }

  /** Distance from point to this foot's body (foot + lower leg), in world px. */
  distanceTo(px: number, py: number): number {
    const s = this.scale;
    const hw = this.meta.halfWidth * s * 0.92;
    const fh = this.meta.footHeight * s;
    const top = this.y - fh;
    const dxFoot = Math.max(0, Math.abs(px - this.x) - hw);
    const dyFoot = Math.max(0, top - py, py - this.y);
    const dFoot = Math.hypot(dxFoot, dyFoot);
    const lw = this.meta.legWidth * s * 0.45;
    const legTop = top - 320;
    const dxLeg = Math.max(0, Math.abs(px - this.x) - lw);
    const dyLeg = Math.max(0, legTop - py, py - top);
    return Math.min(dFoot, Math.hypot(dxLeg, dyLeg));
  }

  /** Centre of the foot body (for effects). */
  get cx(): number {
    return this.x;
  }

  get cy(): number {
    return this.y - this.meta.footHeight * this.scale * 0.45;
  }

  /** Where it hovers: its own or the usual height, but a boss (big, often hovering high) always low enough that the
   *  whole foot shows below the top of the screen. */
  hoverAt(): number {
    const hy = this.hoverY ?? HOVER_Y;
    return this.isBossLike ? Math.max(hy, this.showAllY()) : hy;
  }

  /** Low enough that the whole foot shows below the top of the screen, but never lower than the Immortal Brute
   *  needs (520 px tall): the biggest bosses (up to ~750 px) would otherwise hover over the pizzas, so they stay
   *  partly cut off. */
  showAllY(): number {
    return Math.min(this.meta.footHeight * this.scale, 520) + 24;
  }

  /** The guard shield: up until it's smashed (Spartan Sandals alone lower and raise theirs on a rhythm: FootType.guard).
   * Once broken, a fixed timer from the break (whatever happens meanwhile) brings a new one at full strength; the
   * foot reaches back for it in its last GUARD_FETCH seconds. */
  private guardTick(dt: number): void {
    if (this.guardDone) return;
    if (this.guardBroken) {
      this.guardIdle += dt;
      if (this.guardFetchT < 0 && this.guardIdle >= this.guardRearmAfter - GUARD_FETCH) this.guardFetchT = 0;
      else if (this.guardFetchT >= 0) this.guardFetchT += dt;
      if (this.guardIdle >= this.guardRearmAfter) this.guardRearm();
      return;
    }
    const g = this.type.guard;
    if (!g) return;
    if (!this.has('guard') || this.guardOpen > 0 || (this.state !== 'hover' && this.state !== 'descend')) return;
    this.guardT += dt;
    if (!this.guardWarned && this.guardT >= this.guardNext - this.guardWarnTime) this.guardWarned = true;
    if (this.guardT >= this.guardNext) {
      this.guardT = 0;
      this.guardNext = g.up[0] + Math.random() * (g.up[1] - g.up[0]);
      this.guardWarned = false;
      this.guardOpen = g.down;
      this.hooks.onTrait?.(this, 'guardDown');
    }
  }

  /** Seconds of warning before each drop. */
  get guardWarnTime(): number {
    return this.type.guard?.warn ?? 0.6;
  }

  /** The shield is up: a smack now is blocked (it cracks the shield). Down once it's broken (until a new one is
   * raised) and while the foot is disarmed; a foot with a rhythm (Spartan Sandals) also lowers it on its beat, after
   * a stomp and while stunned. */
  get guardUp(): boolean {
    return this.has('guard') && this.alive && !this.guardBroken && !this.guardDone && this.guardOpen <= 0 && !(this.type.guard && this.stunT > 0);
  }

  /** Seconds until the next drop on its rhythm (while the shield is up). */
  get guardToDrop(): number {
    return Math.max(0, this.guardNext - this.guardT);
  }

  /** A smack landed while its shield was down: a foot with `react` (Spartan Sandals) slams it straight back up and
   * holds it for longer (one hit per opening). */
  guardReact(): void {
    const g = this.type.guard;
    if (!g?.react || this.guardOpen <= 0 || this.guardBroken || this.guardDone || !this.has('guard') || this.stunT > 0 || !this.alive) return;
    this.guardOpen = 0;
    this.guardT = 0;
    this.guardNext = g.up[0] * g.react;
    this.guardWarned = false;
  }

  /** Knock-on damage soaked by the raised shield: every `step` of it knocks a step off, as a smack does. Returns
   * what's left over past the step that breaks it (it carries through to the foot), or 0. */
  guardChip(amount: number, step: number): number {
    this.guardChipStep = Math.max(0.01, step);
    this.guardChipAcc += amount;
    this.guardFx?.chipped();
    while (this.guardChipAcc >= this.guardChipStep && !this.guardBroken) {
      this.guardChipAcc -= this.guardChipStep;
      // (what's past the breaking step: guardBlock clears the accumulator)
      const left = this.guardChipAcc;
      if (this.guardBlock(true)) return left;
    }
    return 0;
  }

  /** A blow worth n steps (a Peel Slam, an ability): returns the steps left unused if it smashed the shield, or 0. */
  guardKnock(n: number): number {
    const before = this.guardHp;
    this.guardBlock(false, n);
    return Math.max(0, n - before);
  }

  /** A smack bounced off the raised shield (or a blow worth n steps; or automatic damage soaked a step's worth:
   * `quiet`): it cracks, and the last one it can take shatters it. True if it broke. */
  guardBlock(quiet = false, n = 1): boolean {
    this.guardHp = Math.max(0, this.guardHp - n);
    if (this.guardHp > 0) {
      this.guardFx?.blocked(this.guardHp, quiet, n);
      return false;
    }
    this.guardChipAcc = 0;
    this.guardBroken = true;
    this.guardIdle = 0;
    this.guardFetchT = -1;
    this.guardWarned = false;
    this.guardOpen = 0;
    this.guardFx?.broke();
    this.hooks.onTrait?.(this, 'guardBreak');
    return true;
  }

  /** The new shield is raised: full strength, back on the usual rhythm. */
  private guardRearm(): void {
    this.guardBroken = false;
    this.guardFetchT = -1;
    this.guardIdle = 0;
    this.guardHp = this.guardMax;
    this.guardChipAcc = 0;
    this.guardOpen = 0;
    this.guardT = 0;
    this.guardWarned = false;
    const g = this.type.guard;
    if (g) this.guardNext = g.up[0] + Math.random() * (g.up[1] - g.up[0]);
    this.hooks.onTrait?.(this, 'guardRearm');
  }

  /** Hang a shield piece in front of the foot (a gameplay layer: it shows whatever the graphics settings). It sits
   * over the foot's art and follows its rig. Returns the container to put it in (in the foot's own frame). */
  attachShield(): Phaser.GameObjects.Container {
    if (this.shieldSquash) return this.shieldSquash;
    const ankle = -this.meta.footHeight * this.type.scale;
    const swing = this.scene.add.container(0, ankle);
    const squash = this.scene.add.container(0, -ankle);
    swing.add(squash);
    this.root.addAt(swing, this.root.getIndex(this.body) + 1);
    this.shieldSwing = swing;
    this.shieldSquash = squash;
    return squash;
  }

  /** An image of the foot's that tints, flashes and fades with it (a shield piece). */
  trackLiveImage(o: Phaser.GameObjects.Image): void {
    this.liveImgs.push(o);
  }

  /** Put the shield piece behind the foot's art (fetching a new one from behind its back) or back in front. */
  shieldBehind(on: boolean): void {
    const sw = this.shieldSwing;
    if (!sw) return;
    if (on) {
      // (back where it was afterwards: over the glow and effects added above the foot since)
      this.shieldAt = this.root.getIndex(sw);
      this.root.remove(sw);
      this.root.addAt(sw, this.root.getIndex(this.body));
    } else if (this.shieldAt >= 0) {
      this.root.remove(sw);
      this.root.addAt(sw, Math.min(this.shieldAt, this.root.length));
      this.shieldAt = -1;
    }
  }
  private shieldAt = -1;

  setState(s: FootState): void {
    this.state = s;
    this.stateT = 0;
    if (s === 'descend') this.parryReady = true;
    if (s === 'lift') {
      this.switched = false;
      this.stompedTwice = false;
    }
  }

  update(dt: number, globalSlow: number): void {
    this.age += dt;
    this.stateT += dt;
    this.wobbleT += dt;
    // statuses
    if (this.burnT > 0) this.burnT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.clearTint();
    }
    // a friendly zombie (src/game/zombiePeel.ts) is out of the fight until it bursts: none of its own abilities or
    // timers run, only its looks (the scene's footTick keeps just the live layer going)
    if (this.zombieHold) {
      this.hooks.onTick?.(this, dt);
      this.render(dt);
      return;
    }
    if (this.disarmT > 0) this.disarmT -= dt;
    if (this.guardOpen > 0) this.guardOpen -= dt;
    if (this.type.traits.includes('guard') && this.alive) this.guardTick(dt);
    if (this.revealT > 0) this.revealT -= dt;
    // Mime: invisible (only its shadow shows) until it commits to a stomp or gets smacked
    if (this.has('invisible') && this.alive) {
      const seen = this.state === 'stomp' || this.revealT > 0 || this.state === 'lift';
      const a = seen ? 1 : 0.07;
      this.img.setAlpha(a);
      this.leg.setAlpha(a);
      this.cuff?.setAlpha(a);
      this.icons?.setAlpha(seen ? 1 : 0.5);
    }
    // Gym Bro: bulks up while nobody hits it
    if (this.has('bulk') && this.alive) {
      this.bulkT += dt;
      if (this.bulkT > 1.5 && this.bulk < 6) {
        this.bulkT = 0;
        this.bulk++;
        this.armor++;
        this.scene.tweens.add({ targets: this.img, scaleX: this.img.scaleX * 1.05, duration: 120, yoyo: true });
      }
    }
    this.hooks.onTick?.(this, dt);
    if (this.type.traits.includes('phase') && this.alive) {
      this.phaseT += dt;
      const cycle = this.type.boss ? 3.2 : 2.6;
      const t = this.phaseT % cycle;
      this.phased = t > cycle - 0.9 && this.state !== 'stomp';
      const a = this.phased ? 0.18 + Math.sin(this.age * 30) * 0.06 : this.type.art.ghost ? 0.82 : 1;
      this.img.setAlpha(a);
      this.leg.setAlpha(a * 0.85);
    }
    // time on screen (golden feet flee after 7 s of it, not counting time spent waiting for a lane)
    if (!this.held && !this.pinned) this.fleeAge += dt;
    if (this.puppet) {
      // a boss moved by hand still comes out of a stun
      if (this.stunT > 0) {
        this.stunT -= dt;
        if (this.stars) this.stars.rotation += dt * 5;
        if (this.stunT <= 0) this.endStun();
      }
      this.render(dt);
      return;
    }
    // no free lane: wait off the top of the screen
    if (this.held && this.alive) {
      this.y += (HELD_Y - this.y) * Math.min(1, dt * 4);
      if (this.state !== 'enter') this.setState('enter');
      this.render(dt);
      return;
    }
    // a boss set-piece: every foot backs off to the top of its lane and waits
    if (this.pinned && this.alive) {
      // stuns still wear off while pinned (a boss holding a lane can be frozen by a slam)
      if (this.stunT > 0) {
        this.stunT -= dt;
        if (this.stars) this.stars.rotation += dt * 5;
        if (this.stunT <= 0) this.endStun();
      }
      if (this.state !== 'hover') this.setState('hover');
      this.stateT = 0;
      this.vy = 0;
      // bosses holding a lane stay near their usual hover height, clear of the boss bar
      // …low enough that the whole foot shows, up to the ankle (a big boss held at the top used to be cut off)
      const py = Math.max(this.isBossLike ? this.hoverAt() - 40 : PINNED_Y, this.showAllY());
      this.y += (py - this.y) * Math.min(1, dt * 5);
      const px = this.laneX ?? (this.target && !this.target.dead ? this.target.x : this.x);
      this.x += (px - this.x) * Math.min(1, dt * 3);
      this.render(dt);
      return;
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      if (this.stars) this.stars.rotation += dt * 5;
      if (this.stunT <= 0) this.endStun();
      this.render(dt);
      return;
    }

    if (this.regenHold > 0) this.regenHold -= dt;
    // regrowing feet heal 4% a second; a boss (the Kraken) only 1%, and only between flurries of hits, so steady
    // smacking always wins (at 4% its regrowth outpaced a whole Mild build and the fight could never end)
    if (this.has('regen') && this.alive && this.hp < this.maxHp && !(this.isBossLike && this.regenHold > 0)) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * (this.isBossLike ? 0.01 : 0.04) * dt);
    const slowF =
      (this.slowT > 0 && !this.type.traits.includes('immuneSlow') ? 1 - this.slowPct : 1) *
      globalSlow *
      (1 - this.slowAbove) *
      (1 + this.cheer) *
      (this.enraged ? 1.5 : 1) *
      this.hurry;
    const speed = BASE_DESCEND * this.type.speed * this.speedMul * slowF;
    const target = this.target;

    switch (this.state) {
      case 'enter': {
        const hy = this.hoverAt();
        this.y += (hy - 20 - this.y) * Math.min(1, dt * 4);
        if (this.laneX !== null) this.x += (this.laneX - this.x) * Math.min(1, dt * 3);
        else if (target) this.x += (target.x + this.slot - this.x) * Math.min(1, dt * 3);
        if (this.y > hy - 40) this.setState('hover');
        break;
      }
      case 'hover': {
        if (this.has('bury')) {
          const was = this.buried;
          this.buried = this.stateT < this.hoverTime * 0.9;
          this.img.setAlpha(this.buried ? 0.25 : 1);
          this.leg.setAlpha(this.buried ? 0.25 : 1);
          if (was && !this.buried) this.hooks.onTrait?.(this, 'surface');
        }
        if (!target || target.dead) {
          this.target = this.hooks.pickTarget(this);
          if (!this.target) break;
        }
        // each foot hovers in its own lane; a back-row foot waits higher up the same lane
        let hoverX = this.laneX ?? this.target!.x + this.slot;
        // bowling shoe: sways side to side in its lane before it dives
        if (this.has('roll') && this.stateT < this.hoverTime) hoverX += Math.sin(this.age * 3.2) * 70;
        this.x += (hoverX - this.x) * Math.min(1, dt * 3);
        const hy = this.hoverAt();
        this.y += ((this.waiting ? hy - 170 : hy) - this.y) * Math.min(1, dt * 3);
        if (this.type.traits.includes('teleport') && this.stateT > this.hoverTime * 0.6 && Math.random() < dt * 0.8) {
          const from = this.target;
          const other = this.hooks.relane?.(this);
          if (other && other !== from) this.blinkTo(other);
        }
        // a boss holds its hover for a moment as a phase begins, so the phase's first move gets its chance
        if (this.stateT > this.hoverTime && !(Number(this.brain.holdHoverT ?? 0) > 0)) {
          this.buried = false;
          const lane = this.hooks.canDescend ? this.hooks.canDescend(this) : 0;
          if (lane !== null) {
            this.slot = lane;
            this.vy = speed * 0.5;
            this.setState('descend');
          }
        }
        if (this.type.traits.includes('flee') && this.fleeAge > 7) this.escape();
        break;
      }
      case 'descend': {
        if (!target || target.dead) {
          this.target = this.hooks.pickTarget(this);
          if (!this.target) {
            this.vy = -300;
            this.setState('lift');
            break;
          }
        }
        const t = this.target!;
        // a laned shoe sharing a pizza dives on its own side of it, never on top of another
        const aimX = this.laneX !== null ? t.x + Phaser.Math.Clamp(this.laneX - t.x, -t.radius * 0.8, t.radius * 0.8) : t.x + this.slot;
        // zig-zag weave
        if (this.type.traits.includes('zigzag')) {
          this.zigBase += dt;
          const weave = aimX + Math.sin(this.zigBase * 3.2) * (this.slot ? 45 : 70);
          // a laned shoe eases into its weave instead of snapping across from its hover spot
          this.x = this.laneX !== null ? this.x + (weave - this.x) * Math.min(1, dt * 6) : weave;
        } else {
          this.x += (aimX - this.x) * Math.min(1, dt * 2);
        }
        let want = speed;
        if (this.type.traits.includes('burst')) {
          this.burstT += dt;
          const ph = this.burstT % 1.1;
          want = ph < 0.3 ? speed * 3.4 : speed * 0.15;
        }
        const recover = this.type.traits.includes('flutter') ? 2400 : this.type.traits.includes('floaty') ? 420 : 1000;
        if (this.vy < want) this.vy = Math.min(want, this.vy + recover * dt);
        else this.vy += (want - this.vy) * Math.min(1, dt * 4);
        this.y += this.vy * dt;
        if (this.y < 110) {
          this.y = 110;
          this.vy = Math.max(this.vy, 0);
        }
        // striker: switch pizzas once, mid-dive
        // (only into a free lane on another pizza, so it never lands on top of another foot)
        if (this.has('switch') && !this.isBossLike && !this.switched && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.4) {
          this.switched = true;
          if (this.hooks.relane?.(this)) this.hooks.onTrait?.(this, 'switch');
        }
        // pogo: bounces over to another pizza once, mid-dive
        if (this.has('hop') && !this.hopped && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.5) {
          this.hopped = true;
          if (this.hooks.relane?.(this)) {
            this.vy = -420;
            this.hooks.onTrait?.(this, 'hop');
          }
        }
        // astronaut: floats back up partway through every dive
        if (this.has('antigrav') && this.y > HOVER_Y + (this.stompY - HOVER_Y) * 0.55 && Math.random() < dt * 0.9) {
          this.vy = -260;
        }
        // clumsy: occasionally trips and stumbles back up on its own
        if (this.has('clumsy') && this.vy > 0 && Math.random() < dt * 0.35) {
          this.vy = -380;
          this.hooks.onTrait?.(this, 'clumsy');
        }
        // ballerina feint: fake out once at the halfway point
        if (this.type.traits.includes('feint') && !this.feinted && this.y > (HOVER_Y + this.stompY) / 2) {
          this.feinted = true;
          this.vy = -520;
        }
        if (this.type.traits.includes('flee') && this.fleeAge > 7) this.escape();
        if (this.y >= this.stompY) {
          this.y = this.stompY;
          this.vy = 0;
          this.setState('stomp');
          if (this.type.guard && this.has('guard') && !this.guardBroken && !this.guardDone) {
            // (a foot with a shield rhythm lowers it for a moment after every stomp)
            if (this.guardOpen <= 0) this.hooks.onTrait?.(this, 'guardDown');
            this.guardOpen = Math.max(this.guardOpen, 1.2);
            this.guardT = 0;
            this.guardWarned = false;
          }
          this.hooks.onStomp(this);
        }
        break;
      }
      case 'stomp': {
        // dino: a second stomp before lifting off
        if (this.has('double') && !this.stompedTwice && this.stateT > 0.32) {
          this.stompedTwice = true;
          this.scene.tweens.add({ targets: this, y: this.y - 60, duration: 90, yoyo: true, ease: 'Quad.Out' });
          this.scene.time.delayedCall(180, () => this.alive && this.state === 'stomp' && this.hooks.onStomp(this));
          this.stateT = 0.05;
        }
        if (this.stateT > 0.5) {
          this.vy = -560;
          this.setState('lift');
        }
        break;
      }
      case 'lift': {
        this.vy += 700 * dt;
        this.y += this.vy * dt;
        if (this.vy >= 0 || this.y <= HOVER_Y) {
          this.target = this.hooks.pickTarget(this);
          this.feinted = false;
          this.hopped = false;
          this.hoverTime = this.freshHoverTime(0.4 + Math.random() * 0.6);
          this.setState('hover');
        }
        break;
      }
      default:
        break;
    }
    this.render(dt);
  }

  /** Show the foot regardless of invisibility (Mime) for a moment. */
  reveal(sec: number): void {
    this.revealT = Math.max(this.revealT, sec);
  }

  /** Dev views: crop the leg so it ends at local y `top` (above the foot) instead of running off screen. */
  /** Keep the still art whatever the graphics setting (a dev view's still column). */
  forceStill = false;

  /** Set once a dev view crops the leg (cropLeg): things hung from above stop at the crop instead. */
  legCropped = false;

  cropLeg(top: number): void {
    this.legCropped = true;
    const h = Math.max(1, Math.round(this.leg.y - top));
    if (Math.abs(this.leg.height - h) >= 1) this.leg.setSize(this.leg.width, h);
    // the tile pattern starts at the sprite's top: shift it so it stays fixed to the leg's bottom (the foot), as
    // an uncropped leg's does, or the foot seems to slide up and down a still leg as it moves
    this.leg.tilePositionY = (LEG_LEN - this.leg.height) / this.leg.tileScaleY;
  }

  /** The top of the leg in the foot's own frame (far off screen in play; the card's top when a dev view crops it). */
  get legTopLocal(): number {
    return this.leg.y - this.leg.height;
  }

  /** How visible the foot's own art is now (faded by invisibility, phasing, portals and the like). */
  get visualAlpha(): number {
    return this.img.alpha;
  }

  setVisualAlpha(a: number): void {
    this.img.setAlpha(a);
    this.leg.setAlpha(a);
    this.cuff?.setAlpha(a);
    for (const o of this.liveImgs) o.setAlpha(a);
  }

  /** Add live art round the drawn foot: `below` stacks it under the foot's art (over the leg), otherwise over it.
   * Each call goes above the earlier ones on its side. Images are tinted, flashed and faded with the foot. On a
   * rigged foot the art goes on the rig, so it swings and squashes with the foot. */
  addLiveArt(o: Phaser.GameObjects.GameObject, below: boolean, additive = false): void {
    // additive light (glow, overheat) rides a twin of the rig that sits over it, outside the rig's post-FX
    // (an additive layer inside a post-FX'd container breaks its transparency: the foot turned see-through)
    if (additive && this.rig) {
      this.rig.light.add(o);
      if (o instanceof Phaser.GameObjects.Image) this.liveImgs.push(o);
      return;
    }
    // without a rig, additive light goes just over the body (its post-FX would break it the same way)
    if (additive) {
      this.root.addAt(o, this.root.getIndex(this.body) + 1 + this.fxAbove++);
      if (o instanceof Phaser.GameObjects.Image) this.liveImgs.push(o);
      return;
    }
    const parent = this.img.parentContainer ?? this.root;
    const i = parent.getIndex(this.img);
    if (below) parent.addAt(o, i);
    else parent.addAt(o, i + 1 + this.liveAbove++);
    if (o instanceof Phaser.GameObjects.Image) this.liveImgs.push(o);
  }

  /** Add live effects in the foot's own frame but off the rig (particle emitters that keep the layer's frame):
   * `below` under the foot's art, otherwise over it. */
  addLiveFx(o: Phaser.GameObjects.GameObject, below: boolean): void {
    // never inside the body: its outline glows would ring every particle, and additive ones would break its
    // transparency. Below goes behind the leg and the foot, above over both.
    if (below) this.root.addAt(o, this.root.getIndex(this.body));
    else this.root.addAt(o, this.root.getIndex(this.rig?.lightSwing ?? this.body) + 1 + this.fxAbove++);
  }

  /** Hang the foot's art on a rig (once): a container at the ankle that swings, holding one at the sole that
   * squashes, holding the art. Live art added after this goes on the rig too. */
  enableRig(): void {
    if (this.rig) return;
    const ankle = -this.meta.footHeight * this.type.scale;
    const swing = this.scene.add.container(0, ankle);
    const squash = this.scene.add.container(0, -ankle);
    swing.add(squash);
    const i = this.body.getIndex(this.img);
    this.body.remove(this.img);
    this.body.addAt(swing, i);
    squash.add(this.img);
    const lightSwing = this.scene.add.container(0, ankle);
    const light = this.scene.add.container(0, -ankle);
    lightSwing.add(light);
    this.root.addAt(lightSwing, this.root.getIndex(this.body) + 1);
    this.rig = { swing, squash, lightSwing, light };
  }

  /** A point of the foot's design space (src/art/style: centre x 110, sole at its contact y) in world
   * coordinates, following the rig and the foot's own transform. */
  styleWorld(dx: number, dy: number): [number, number] {
    const ts = this.type.scale;
    let x = (dx - 110) * ts;
    let y = (dy - this.meta.footHeight) * ts;
    if (this.rig) {
      const { swing, squash } = this.rig;
      const a = swing.y;
      const qx = x * squash.scaleX;
      const qy = -a + y * squash.scaleY;
      const c = Math.cos(swing.rotation);
      const s = Math.sin(swing.rotation);
      x = qx * c - qy * s;
      y = qx * s + qy * c + a;
    }
    const r = this.root;
    const c = Math.cos(r.rotation);
    const s = Math.sin(r.rotation);
    const lx = x * r.scaleX;
    const ly = y * r.scaleY;
    return [r.x + lx * c - ly * s, r.y + lx * s + ly * c];
  }

  /** Where foot-wide FX (glows, shines, the phase aura) go: the body, leg and foot as one silhouette. */
  private fxHost(): Phaser.GameObjects.Components.FX | null {
    return this.body.postFX;
  }

  /** Pose the rig: swing (radians, round the ankle) and squash (scale at the sole). The leg follows the ankle
   * down as the foot squashes, so they never part. */
  setRigPose(swing: number, sx: number, sy: number): void {
    if (!this.rig) return;
    this.rig.swing.rotation = swing;
    this.rig.squash.setScale(sx, sy);
    this.rig.lightSwing.rotation = swing;
    this.rig.light.setScale(sx, sy);
    if (this.shieldSwing) {
      this.shieldSwing.rotation = swing;
      this.shieldSquash!.setScale(sx, sy);
    }
    const drop = this.meta.footHeight * this.type.scale * (1 - sy);
    this.leg.y = this.legY + drop;
    if (this.cuff) this.cuff.y = -this.meta.footHeight * this.type.scale + 4 * this.type.scale + drop;
  }

  /** The foot's painted pieces: the leg, the art, the cuff and its live images (not the additive light layers).
   * Whole-foot re-skins (the Zombie Loafer's bite: src/game/zombieArt.ts) swap their textures. */
  artPieces(): (Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite)[] {
    const out: (Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite)[] = [this.leg, this.img];
    if (this.cuff) out.push(this.cuff);
    for (const o of this.liveImgs) if (o.active && o.blendMode !== Phaser.BlendModes.ADD && !out.includes(o)) out.push(o);
    return out;
  }

  /** Squash or stretch the foot's body (leg, art and cuff) from the sole, on top of whatever its root does: an
   * effect's own pose (a zombie foot's convulsions) that never fights the root's tweens (knocks, resizes, death). */
  setBodyScale(sx: number, sy: number): void {
    this.body.setScale(sx, sy);
  }

  /** Take an image added with addLiveArt off the foot again (and destroy it). */
  removeLiveArt(o: Phaser.GameObjects.Image): void {
    const i = this.liveImgs.indexOf(o);
    if (i >= 0) this.liveImgs.splice(i, 1);
    o.destroy();
  }

  /** Draw the foot with another texture of the same frame (its live art draws the rest). */
  setArtTexture(key: string): void {
    this.img.setTexture(key);
  }

  /** Resize the whole foot (art and hit area) to `mul` of its normal size. */
  setSize(mul: number, ms = 250): void {
    this.sizeMul = mul;
    const rel = (this.baseScale / this.type.scale) * mul;
    if (ms > 0) this.scene.tweens.add({ targets: this.root, scaleX: rel, scaleY: rel, duration: ms, ease: 'Back.Out' });
    else this.root.setScale(rel);
  }

  private auraFx: Phaser.FX.Glow | null = null;
  private auraTween: Phaser.Tweens.Tween | null = null;

  /** A pulsing coloured outline that shows the boss's phase at a glance (null clears it). */
  /** Turn this foot shiny: a white-gold glow and a sweeping shine (sparkles are emitted by the scene). */
  makeShiny(): void {
    this.shiny = true;
    this.fxHost()?.addGlow(0xfff6c0, 5, 0, false, 0.1, 14);
    this.fxHost()?.addShine(0.7, 0.35, 4);
  }

  setPhaseAura(color: number | null): void {
    this.auraTween?.remove();
    this.auraTween = null;
    if (this.auraFx) this.fxHost()?.remove(this.auraFx);
    this.auraFx = null;
    const host = this.fxHost();
    if (color === null || !host) return;
    this.auraFx = host.addGlow(color, 6, 0, false, 0.1, 14);
    this.auraTween = this.scene.tweens.add({ targets: this.auraFx, outerStrength: { from: 4, to: 10 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  tint(color: number | null): void {
    for (const o of [this.img, this.leg, this.cuff, ...this.liveImgs]) {
      if (!o) continue;
      if (color === null) o.clearTint();
      else o.setTint(color);
    }
  }

  /** Hold it as a friendly zombie (src/game/zombiePeel.ts), or let it go: held, it's fully there (a phasing or
   * invisible foot shows itself) and out of the fight. */
  holdAsZombie(on: boolean): void {
    this.zombieHold = on;
    if (!on) return;
    this.phased = false;
    this.vy = 0;
    this.img.setAlpha(1);
    this.leg.setAlpha(1);
    this.cuff?.setAlpha(1);
    this.icons?.setAlpha(1);
  }

  render(dt: number): void {
    if (!this.alive) return;
    const lean = this.state === 'descend' ? Phaser.Math.Clamp(this.vy / 2400, -0.08, 0.08) : 0;
    const wob = this.state === 'hover' ? Math.sin(this.wobbleT * 5) * 0.03 : Math.sin(this.wobbleT * 9) * 0.008;
    this.root.setPosition(this.x, this.y);
    this.root.rotation += (wob + lean * (this.x > 960 ? -1 : 1) + this.leanExtra + this.leanFx - this.root.rotation) * Math.min(1, dt * 10);
    // telegraph shadow on the target pizza
    const t = this.target;
    if (t && !t.dead && (this.state === 'descend' || this.state === 'hover' || this.state === 'stomp')) {
      const prox = Phaser.Math.Clamp(1 - (this.stompY - this.y) / (this.stompY - HOVER_Y + 60), 0, 1);
      const w = this.meta.halfWidth * 2 * this.scale;
      this.shadow
        .setVisible(true)
        .setPosition(this.x, t.surfaceY + 6)
        .setScale(((0.45 + 0.55 * prox) * w) / 300, ((0.45 + 0.55 * prox) * w * 0.38) / 110)
        .setAlpha(0.18 + 0.55 * prox);
    } else {
      this.shadow.setAlpha(Math.max(0, this.shadow.alpha - dt * 3));
    }
    this.drawHp();
    this.guardFx?.update(dt);
  }

  private drawHp(): void {
    const g = this.hpBar;
    g.clear();
    if (!this.hitOnce || this.isBossLike || this.hp <= 0) return;
    if (this.has('invisible') && this.revealT <= 0 && this.state !== 'stomp') return;
    const w = 90;
    const y = -this.meta.footHeight * this.type.scale - 34;
    const f = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    g.fillStyle(0x2a1810, 0.85).fillRoundedRect(-w / 2 - 3, y - 3, w + 6, 14, 7);
    g.fillStyle(f > 0.5 ? 0x7be04a : f > 0.25 ? 0xffc42e : 0xff4d3d, 1).fillRoundedRect(-w / 2, y, Math.max(6, w * f), 8, 4);
    if (this.armor > 0) {
      g.fillStyle(0xc7ccd4, 1).fillCircle(-w / 2 - 10, y + 4, 7);
      g.lineStyle(2, 0x2a1810, 1).strokeCircle(-w / 2 - 10, y + 4, 7);
    }
  }

  flash(color = 0xffffff, ms = 70): void {
    this.flashT = ms / 1000;
    this.img.setTintFill(color);
    this.leg.setTintFill(color);
    this.cuff?.setTintFill(color);
    for (const o of this.liveImgs) o.setTintFill(color);
  }

  clearTint(): void {
    const slowTint = this.slowT > 0 || this.frozen ? 0xa8dcff : this.burnT > 0 ? 0xffc0a0 : null;
    for (const o of [this.img, this.leg, this.cuff, ...this.liveImgs]) {
      if (!o) continue;
      o.clearTint();
      if (slowTint) o.setTint(slowTint);
    }
  }

  /** Apply knockback (positive = upward impulse). */
  knock(power: number): void {
    if (this.state === 'stomp') {
      this.setState('lift');
      this.vy = -power * 1.2;
      return;
    }
    if (this.state !== 'descend' && this.state !== 'hover') return;
    let p = power;
    if (this.type.traits.includes('heavy')) p *= 0.35;
    if (this.type.traits.includes('floaty')) p *= 1.8;
    if (this.isBossLike) p *= 0.4;
    if (this.state === 'hover') {
      this.y -= p * 0.12;
      this.stateT = Math.min(this.stateT, this.hoverTime * 0.5);
      return;
    }
    this.vy = Math.min(this.vy, 0) - p;
    this.scene.tweens.add({ targets: this.root, scaleY: { from: 0.86, to: this.root.scaleX }, duration: 220, ease: 'Back.Out' });
  }

  dodge(): void {
    const dir = this.x < 960 ? 1 : -1;
    const dx = dir * (90 + Math.random() * 60);
    this.scene.tweens.add({ targets: this, x: this.x + dx, duration: 180, ease: 'Quad.Out' });
  }

  stun(sec: number, frozen = false): void {
    if (!this.alive) return;
    this.stunT = Math.max(this.stunT, sec);
    this.frozen = frozen;
    if (frozen) this.clearTint();
    if (!this.stars && !frozen) {
      const c = this.scene.add.container(0, -this.meta.footHeight * this.type.scale - 10);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        c.add(this.scene.add.image(Math.cos(a) * 46, Math.sin(a) * 14, 'star5').setScale(0.55));
      }
      this.stars = c;
      this.root.add(c);
    }
  }

  private endStun(): void {
    this.stars?.destroy();
    this.stars = undefined;
    this.frozen = false;
    this.clearTint();
  }

  private blinkTo(p: Pizza): void {
    this.target = p;
    this.scene.tweens.add({
      targets: this.root,
      alpha: { from: 1, to: 0 },
      duration: 120,
      yoyo: true,
      onYoyo: () => {
        // reappear in the lane relane() just gave it, not on the pizza's centre (on top of the foot there)
        this.x = this.laneX ?? p.x + this.slot;
      },
    });
  }

  escape(): void {
    if (!this.alive) return;
    this.setState('dying');
    this.shadow.setVisible(false);
    this.liveHost?.die();
    this.guardFx?.destroy();
    this.guardFx = null;
    this.hooks.onEscape(this);
    this.scene.tweens.add({ targets: this.root, y: -900, duration: 700, ease: 'Back.In', onComplete: () => this.destroy() });
  }

  revive(): void {
    this.reviveUsed = true;
    this.hp = Math.round(this.maxHp * this.reviveFrac);
    this.stun(1.4);
    this.flash(0x7dff9a, 300);
  }

  /** Comedic yank off-screen. */
  die(boss = false): void {
    this.auraTween?.remove();
    this.auraTween = null;
    this.setState('dying');
    this.liveHost?.die();
    // the killing blow flashes white; make sure the flash clears since update() stops running now
    this.scene.time.delayedCall(boss ? 140 : 70, () => {
      this.flashT = 0;
      if (this.root.active) this.clearTint();
    });
    this.hpBar.clear();
    this.icons?.setVisible(false);
    // (the shield's badge goes; the shield itself leaves with the foot)
    this.guardFx?.destroy();
    this.guardFx = null;
    this.stars?.destroy();
    this.shadow.setVisible(false);
    const spin = (Math.random() < 0.5 ? -1 : 1) * (boss ? 0.15 : 0.35);
    this.scene.tweens.add({
      targets: this.root,
      scaleY: this.root.scaleX * 0.78,
      duration: boss ? 500 : 90,
      yoyo: !boss,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.root,
          y: -this.meta.footHeight * this.scale - 200,
          rotation: spin,
          duration: boss ? 900 : 380,
          ease: 'Back.In',
          onComplete: () => this.destroy(),
        });
      },
    });
  }

  destroy(): void {
    this.auraTween?.remove();
    this.auraTween = null;
    this.state = 'gone';
    this.liveHost?.destroy();
    this.liveHost = null;
    this.guardFx?.destroy();
    this.guardFx = null;
    this.root.destroy();
    this.shadow.destroy();
  }
}
