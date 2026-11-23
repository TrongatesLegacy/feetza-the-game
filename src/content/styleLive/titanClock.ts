// The live clock on a Kronos's shackle (art: the shackle clock in src/content/style/acts-f-3.ts), shared by the Titan
// King and the Hades-fight Kronos. Its hands are images on the rig, over the face the body texture shows, with the
// glass over them: the second hand ticks a step a second and overshoots and settles like an escapement, the minute
// hand creeps round, the hour hand with it, and the glass catches a glint on every tick. Hot, time races.

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { footRes } from '../../art/feetArt';
import type { LiveFoot } from '../../game/liveKit';
import { save } from '../../systems/save';
import { CLOCK_STILL, type TitanClock, clockGlass, clockHands } from '../style/acts-f-3';

export interface LiveClock {
  update(dt: number): void;
}

export function liveClock(k: LiveFoot, c: TitanClock, gold: string, key: string): LiveClock {
  const f = k.f;
  const ts = f.type.scale;
  const res = footRes(f.type);
  const tex = ts * res;
  const L = c.r + 4;
  const sheet = (name: string, draw: (g: CanvasRenderingContext2D) => void) =>
    k.sheet(`lk_${key}_${name}`, Math.ceil(L * 2 * tex), Math.ceil(L * 2 * tex), 1, (g) => {
      g.scale(tex, tex);
      g.translate(-(c.x - L), -(c.y - L));
      draw(g);
    });
  const at = (k0: string, additive = false) => {
    const img = k.sc.add.image((c.x - CX) * ts, (c.y - f.meta.footHeight) * ts, k0, 0).setOrigin(0.5, 0.5).setScale(1 / res);
    if (additive) img.setBlendMode(Phaser.BlendModes.ADD);
    f.addLiveArt(img, false, additive);
    return img;
  };
  // the hands drawn pointing at twelve (the images turn), the glass, and a glint
  const up = { hour: 0, min: 0, sec: 0 };
  const hour = at(sheet('hour', (g) => clockHands(g, c, gold, 'hour', up)));
  const min = at(sheet('min', (g) => clockHands(g, c, gold, 'min', up)));
  const sec = at(sheet('sec', (g) => clockHands(g, c, gold, 'sec', up)));
  at(sheet('glass', (g) => clockGlass(g, c)));
  const glint = at(
    sheet('glint', (g) => {
      const gx = c.x - c.r * 0.45;
      const gy = c.y - c.r * 0.5;
      const s = c.r * 0.5;
      const gr = g.createRadialGradient(gx, gy, 0, gx, gy, s);
      gr.addColorStop(0, 'rgba(255,250,230,.9)');
      gr.addColorStop(1, 'rgba(255,250,230,0)');
      g.fillStyle = gr;
      g.fillRect(gx - s, gy - s, s * 2, s * 2);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(gx, gy - s);
      g.quadraticCurveTo(gx, gy, gx + s * 0.35, gy);
      g.quadraticCurveTo(gx, gy, gx, gy + s);
      g.quadraticCurveTo(gx, gy, gx - s * 0.35, gy);
      g.quadraticCurveTo(gx, gy, gx, gy - s);
      g.fill();
    }),
    true,
  ).setAlpha(0);
  // start at the still art's time
  let secTo = CLOCK_STILL.sec;
  let secAt = secTo;
  let secV = 0;
  let minAt = CLOCK_STILL.min;
  let next = 1;
  let glintT = 9;
  return {
    update(dt: number) {
      const hot = Math.min(1, k.heat);
      const pace = 1 + hot * 5;
      const calm = save.settings.reducedMotion ? 0.4 : 1;
      next -= dt * pace;
      if (next <= 0) {
        next += 1;
        secTo += Math.PI / 30;
        glintT = 0;
      }
      // a stiff escapement spring: a snap forward, a little overshoot, settled
      const h = Math.min(dt, 1 / 30);
      secV += ((secTo - secAt) * 1400 - secV * 22) * h;
      secAt += secV * h;
      // the minute hand creeps (a turn every two minutes: time runs fast for a Titan), the hour hand a twelfth of that
      minAt += dt * pace * ((Math.PI * 2) / 120);
      sec.rotation = secAt;
      min.rotation = minAt;
      hour.rotation = CLOCK_STILL.hour + (minAt - CLOCK_STILL.min) / 12;
      glintT += dt;
      glint.setAlpha(Math.max(0, 1 - glintT / 0.22) * 0.9 * calm * f.visualAlpha);
    },
  };
}
