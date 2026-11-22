// A living foot peel on the cursor peel (src/art/peelLive.ts): the peel's own texture becomes a dynamic texture the
// peel's layers are stamped into each frame (so the peel's tint, shine, fades and spins all still apply), and what
// the foot sheds (embers, steam, bubbles) and the critters round it (flies, bats) live in the play field, below or
// over the peel, trailing behind it as it moves. The rig is built in idle time; the still peel shows until it's ready.

import Phaser from 'phaser';
import { PEEL_H, PEEL_W } from '../art/peelArt';
import { PeelLive, SHEETS, hasPeelLive, requestRig, sheetFrameAt, spriteXform, type Layer, type PeelRig, type PeelWorld } from '../art/peelLive';
import type { LookFx, LookHost } from '../art/lookKit';
import { makeCanvas } from '../art/util';
import { FX_R, fxAtlas } from './liveKit';

const DT_KEY = 'peel_live';
/** The peel's grip point on its texture (the cursor peel's origin). */
const OX = 110;
const OY = 100;

/** A rig's layers as textures (made once per game, shared by every run). */
function texOf(sc: Phaser.Scene, key: string, l: Layer): string {
  if (!sc.textures.exists(key)) sc.textures.addCanvas(key, l.c);
  return key;
}

function sheetTex(sc: Phaser.Scene, key: string): string | null {
  const frames = SHEETS.get(key);
  if (!frames?.length) return null;
  const tk = `pls_${key}`;
  if (sc.textures.exists(tk)) return tk;
  const fw = frames[0].width;
  const fh = frames[0].height;
  const [c, ctx] = makeCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => ctx.drawImage(f, i * fw, 0));
  const tex = sc.textures.addCanvas(tk, c)!;
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
  return tk;
}

/** Play a living foot peel on the cursor peel (null for peels that aren't living feet). */
export function playPeelLive(id: string, h: LookHost): LookFx | null {
  if (!hasPeelLive(id)) return null;
  const { scene: sc, layer, peel } = h;
  let live: PeelLive | null = null;
  let rig: PeelRig | null = null;
  let active = true;
  let dead = false;
  let tex: Phaser.Textures.DynamicTexture | null = null;
  // what sits below the peel and over it, in the play field
  const back = sc.add.container(0, 0);
  const front = sc.add.container(0, 0);
  layer.add([back, front]);
  layer.moveBelow(back as unknown as Phaser.GameObjects.GameObject, peel as unknown as Phaser.GameObjects.GameObject);
  const pool: Phaser.GameObjects.Image[] = [];
  const crit: Phaser.GameObjects.Image[] = [];
  const keys = { base: '', hilt: '', band: [] as string[], parts: [] as string[][], glow: '', heat: '', spark: [] as string[] };
  let lastX = peel.x;
  let lastY = peel.y;
  let vx = 0;
  let vy = 0;

  const world: PeelWorld = {
    toWorld(lx, ly) {
      const s = peel.scale;
      const c = Math.cos(peel.rotation);
      const sn = Math.sin(peel.rotation);
      const x = (lx - OX) * s;
      const y = (ly - OY) * s;
      return [peel.x + x * c - y * sn, peel.y + x * sn + y * c];
    },
    scale: () => peel.scale,
  };

  const start = (r: PeelRig) => {
    rig = r;
    const k = r.key;
    keys.base = texOf(sc, `${k}_base`, r.base);
    keys.hilt = texOf(sc, `${k}_hilt`, r.hilt);
    keys.band = r.band.map((l, i) => texOf(sc, `${k}_band${i}`, l));
    keys.parts = r.parts.map((p, i) => p.frames.map((l, j) => texOf(sc, `${k}_p${i}_${j}`, l)));
    keys.glow = r.glow ? texOf(sc, `${k}_glow`, r.glow) : '';
    keys.heat = r.heat ? texOf(sc, `${k}_heat`, r.heat) : '';
    keys.spark = r.sparkles.map((l, i) => texOf(sc, `${k}_s${i}`, l));
    tex = sc.textures.exists(DT_KEY) ? (sc.textures.get(DT_KEY) as Phaser.Textures.DynamicTexture) : sc.textures.addDynamicTexture(DT_KEY, PEEL_W, PEEL_H);
    live = new PeelLive(r, world);
    const fx = fxAtlas(sc);
    for (let i = 0; i < live.bits.n; i++) {
      const im = sc.add.image(0, 0, fx, 'soft').setVisible(false);
      pool.push(im);
      front.add(im);
    }
    for (const c of live.critters) {
      const tk = sheetTex(sc, c.sheet);
      const im = tk ? sc.add.image(0, 0, tk, 0) : sc.add.image(0, 0, fx, 'mote');
      crit.push(im);
      back.add(im);
    }
  };
  requestRig(id, (r) => !dead && r && start(r), () => !dead, true);

  const stamp = (key: string, l: Layer, cfg: Phaser.Types.Textures.StampConfig = {}) => {
    tex!.stamp(key, undefined, l.x, l.y, { originX: 0, originY: 0, scale: 1 / rig!.RR, skipBatch: true, ...cfg });
  };

  const draw = () => {
    const r = rig!;
    const L = live!;
    const t = tex!;
    t.clear();
    // one batch for the frame (each stamp on its own would bind and flush the texture)
    t.beginDraw();
    r.parts.forEach((p, i) => p.below && part(i));
    sprites(true);
    stamp(keys.base, r.base);
    if (L.band >= 0 && keys.band[L.band]) stamp(keys.band[L.band], r.band[L.band]);
    r.parts.forEach((p, i) => !p.below && part(i));
    sprites(false);
    r.sparkles.forEach((l, i) => stamp(keys.spark[i], l, { alpha: L.sparkA[i] }));
    if (r.glow && L.glowA > 0.01) stamp(keys.glow, r.glow, { alpha: L.glowA, blendMode: Phaser.BlendModes.ADD });
    if (r.heat && L.heatA > 0.01) stamp(keys.heat, r.heat, { alpha: L.heatA, blendMode: Phaser.BlendModes.ADD });
    stamp(keys.hilt, r.hilt);
    t.endDraw();
  };
  // the def's own sprites (a spur's rowel, Medusa's snakes)
  const sprites = (below: boolean) => {
    for (const sp of live!.sprites) {
      if (sp.below !== below || !sp.visible || sp.alpha <= 0.01) continue;
      const [x, y, rotation, scaleX, scaleY] = spriteXform(live!, sp);
      const src = SHEETS.get(sp.key)?.[sp.frame];
      const fr = sheetFrameAt(sp.key, sp.frame, Math.abs(scaleX));
      if (!fr || !src) continue;
      const m = src.width / fr.width;
      const tk = `pls_${sp.key}|${sp.frame}|${fr.width}`;
      if (!sc.textures.exists(tk)) sc.textures.addCanvas(tk, fr);
      tex!.stamp(tk, undefined, x, y, { originX: sp.originX, originY: sp.originY, rotation, scaleX: scaleX * m, scaleY: scaleY * m, skipBatch: true, alpha: Math.min(1, sp.alpha), blendMode: sp.additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL });
    }
  };
  const part = (i: number) => {
    const r = rig!;
    const L = live!;
    const p = r.parts[i];
    const f = Math.max(0, Math.min(p.frames.length - 1, L.pf[i]));
    const l = p.frames[f];
    const key = keys.parts[i][f];
    if (p.kind === 'sway') tex!.stamp(key, undefined, p.px, p.py, { originX: (p.px - l.x) / l.w, originY: (p.py - l.y) / l.h, rotation: L.prot[i], scale: 1 / r.RR, skipBatch: true });
    else tex!.stamp(key, undefined, l.x + L.pox[i], l.y + L.poy[i], { originX: 0, originY: 0, scale: 1 / r.RR, skipBatch: true });
  };

  const effects = () => {
    const L = live!;
    const b = L.bits;
    const ems = L.emitterOpts;
    let used = 0;
    for (let i = 0; i < b.n; i++) {
      const sh = b.shape(i);
      if (!sh) continue;
      const o = ems[b.em[i]];
      const im = pool[used++];
      const host = o.below ? back : front;
      if (im.parentContainer !== host) host.add(im);
      im.setVisible(true)
        .setFrame(o.frame)
        .setTint(b.tint[i])
        .setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL)
        .setAlpha(Math.min(1, sh[1]))
        .setScale(sh[0] / FX_R)
        .setRotation(b.rot[i])
        .setPosition(b.x[i], b.y[i]);
    }
    for (let i = used; i < pool.length; i++) if (pool[i].visible) pool[i].setVisible(false);
    L.critters.forEach((c, i) => {
      const im = crit[i];
      if (!im) return;
      const [wx, wy] = world.toWorld(c.x, c.y);
      const host = c.front ? front : back;
      if (im.parentContainer !== host) host.add(im);
      im.setPosition(wx, wy)
        .setRotation(c.rot + peel.rotation)
        .setScale(c.s * peel.scale)
        .setAlpha(0.7 + 0.3 * (c.depth + 1) * 0.5)
        .setFrame(c.frame);
    });
  };

  return {
    ownTrail: false,
    tick(dt) {
      const on = active && peel.visible && !!live;
      back.setVisible(on);
      front.setVisible(on);
      if (!on || dt <= 0) {
        lastX = peel.x;
        lastY = peel.y;
        return;
      }
      // the peel's velocity in its own frame (peel units/s), smoothed
      const d = Math.max(dt, 0.004);
      const s = Math.max(0.05, peel.scale);
      let mx = (peel.x - lastX) / d;
      let my = (peel.y - lastY) / d;
      // a jump (a teleport, a respawn) is not a move
      if (Math.hypot(peel.x - lastX, peel.y - lastY) > 320) mx = my = 0;
      lastX = peel.x;
      lastY = peel.y;
      const c = Math.cos(-peel.rotation);
      const sn = Math.sin(-peel.rotation);
      const k = Math.min(1, dt * 12);
      vx += ((mx * c - my * sn) / s - vx) * k;
      vy += ((mx * sn + my * c) / s - vy) * k;
      live!.update(dt, vx, vy);
      draw();
      effects();
      back.setAlpha(peel.alpha);
      front.setAlpha(peel.alpha);
      if (peel.texture.key === 'peel') peel.setTexture(DT_KEY);
    },
    smack() {
      if (active) live?.smack();
    },
    setActive(on) {
      active = on;
      // (the scene has put another peel's texture on for a while, or put the peel's own back)
      if (on && live && peel.texture.key === 'peel') peel.setTexture(DT_KEY);
    },
    destroy() {
      dead = true;
      if (peel.active && peel.texture.key === DT_KEY) peel.setTexture('peel');
      back.destroy();
      front.destroy();
    },
  };
}
