// A living crafted peel on the cursor peel (src/art/peelCraft.ts): the peel's texture becomes a dynamic texture the
// handle and the head's surface are stamped into each frame, the head flexed about where it meets the handle (so the
// peel's tint, shine, fades and spins all still apply). The surface is a small canvas texture repainted at about
// 30 fps (every frame for a moment after a smack); what flies off (flour, chips, sparks, shards) lives in the play
// field over the peel, and neon's light glows behind it. The rig is built in idle time; the still shows until then.

import Phaser from 'phaser';
import { PEEL_H, PEEL_W } from '../art/peelArt';
import { PIVOT } from '../art/peelCraftArt';
import { CraftLive, SPR_COUNT, craftSprites, hasPeelCraft, requestCraftRig, rigBox, sprDef, type CraftRig, type Spr } from '../art/peelCraft';
import type { PeelWorld } from '../art/peelLive';
import type { LookFx, LookHost } from '../art/lookKit';
import { makeCanvas } from '../art/util';

const DT_KEY = 'peel_craft';
const SURF_KEY = 'peel_craft_surface';
const ATLAS = 'peel_craft_sprites';
/** The peel's grip point on its texture (the cursor peel's origin). */
const OX = 110;
const OY = 100;

/** Every sprite frame on one texture, named `${sprite}_${frame}` (made once per game). */
function atlas(sc: Phaser.Scene): string {
  if (sc.textures.exists(ATLAS)) return ATLAS;
  const sp = craftSprites();
  let w = 0;
  let h = 0;
  for (let k = 0; k < SPR_COUNT; k++) {
    const d = sprDef(k as Spr);
    w = Math.max(w, (d.w + 2) * d.n);
    h += d.h + 2;
  }
  const [c, ctx] = makeCanvas(w, h);
  const at: [number, number][] = [];
  let y = 0;
  for (let k = 0; k < SPR_COUNT; k++) {
    const d = sprDef(k as Spr);
    sp[k].forEach((f, i) => ctx.drawImage(f, i * (d.w + 2), y));
    at.push([0, y]);
    y += d.h + 2;
  }
  const tex = sc.textures.addCanvas(ATLAS, c)!;
  for (let k = 0; k < SPR_COUNT; k++) {
    const d = sprDef(k as Spr);
    for (let i = 0; i < d.n; i++) tex.add(`${k}_${i}`, 0, i * (d.w + 2), at[k][1], d.w, d.h);
  }
  return ATLAS;
}

/** Play a crafted peel on the cursor peel (null for peels that aren't crafted). */
export function playPeelCraft(id: string, h: LookHost): LookFx | null {
  if (!hasPeelCraft(id)) return null;
  const { scene: sc, layer, peel } = h;
  let live: CraftLive | null = null;
  let rig: CraftRig | null = null;
  let active = true;
  let dead = false;
  let tex: Phaser.Textures.DynamicTexture | null = null;
  let surf: Phaser.Textures.CanvasTexture | null = null;
  let handleKey = '';
  const back = sc.add.container(0, 0);
  const front = sc.add.container(0, 0);
  layer.add([back, front]);
  layer.moveBelow(back as unknown as Phaser.GameObjects.GameObject, peel as unknown as Phaser.GameObjects.GameObject);
  const pool: Phaser.GameObjects.Image[] = [];
  const glows: Phaser.GameObjects.Image[] = [];
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

  const start = (r: CraftRig) => {
    rig = r;
    handleKey = `${r.key}_handle`;
    if (!sc.textures.exists(handleKey)) sc.textures.addCanvas(handleKey, r.handle);
    tex = sc.textures.exists(DT_KEY) ? (sc.textures.get(DT_KEY) as Phaser.Textures.DynamicTexture) : sc.textures.addDynamicTexture(DT_KEY, PEEL_W, PEEL_H);
    live = new CraftLive(r, world);
    // (one cursor peel at a time: its surface's texture is replaced with each new one)
    if (sc.textures.exists(SURF_KEY)) sc.textures.remove(SURF_KEY);
    surf = sc.textures.addCanvas(SURF_KEY, live.surface);
    const at = atlas(sc);
    for (let i = 0; i < live.bits.n; i++) {
      const im = sc.add.image(0, 0, at, '0_0').setVisible(false);
      pool.push(im);
      front.add(im);
    }
    for (let i = 0; i < live.glows.length; i++) {
      const im = sc.add.image(0, 0, 'glow').setVisible(false);
      glows.push(im);
      back.add(im);
    }
  };
  requestCraftRig(id, (r) => !dead && r && start(r), () => !dead, true);

  const draw = () => {
    const r = rig!;
    const L = live!;
    const t = tex!;
    if (L.wantsPaint()) {
      L.paint();
      surf!.refresh();
    }
    t.clear();
    t.beginDraw();
    t.stamp(handleKey, undefined, 0, 0, { originX: 0, originY: 0, scale: 1 / r.RR, skipBatch: true });
    const box = rigBox(r);
    t.stamp(SURF_KEY, undefined, PIVOT.x + L.dx, PIVOT.y + L.dy, {
      originX: (PIVOT.x - box.x) / (L.surface.width / r.RR),
      originY: (PIVOT.y - box.y) / (L.surface.height / r.RR),
      scaleX: L.sx / r.RR,
      scaleY: L.sy / r.RR,
      rotation: L.rot,
      skipBatch: true,
    });
    t.endDraw();
  };

  const effects = () => {
    const L = live!;
    const b = L.bits;
    let used = 0;
    for (let i = 0; i < b.n; i++) {
      const lk = b.look(i);
      if (!lk) continue;
      const [size, a, f] = lk;
      const s = b.spr[i] as Spr;
      const d = sprDef(s);
      const im = pool[used++];
      im.setVisible(true).setFrame(`${s}_${f}`).setAlpha(Math.min(1, a)).setPosition(b.x[i], b.y[i]);
      if (d.streak) {
        const v = Math.hypot(b.vx[i], b.vy[i]);
        const len = size * (1 + Math.min(1.5, v / 400));
        im.setOrigin(0.9, 0.5).setRotation(Math.atan2(b.vy[i], b.vx[i])).setScale(len / d.w, (size * 0.28) / d.h);
      } else im.setOrigin(0.5, 0.5).setRotation(b.rot[i]).setScale(size / d.w);
    }
    for (let i = used; i < pool.length; i++) if (pool[i].visible) pool[i].setVisible(false);
    L.glows.forEach((g, i) => {
      const im = glows[i];
      if (!im) return;
      const [wx, wy] = world.toWorld(g.x, g.y);
      const s = peel.scale;
      // (the glow texture's soft edge reaches about half its width: twice the radius)
      im.setVisible(g.a > 0.01).setPosition(wx, wy).setRotation(peel.rotation).setScale((g.rx * 2 * s) / 256, (g.ry * 2 * s) / 256).setTint(g.color).setAlpha(Math.min(1, g.a));
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
