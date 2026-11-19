// Dev-only trailer director. Steps the real game frame-by-frame on a virtual clock, uploads every
// frame as a JPEG, and logs every sound effect with its frame time so the soundtrack can be mixed
// in post (ffmpeg). Nothing plays through the speakers. Never included in production builds.
/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import { BACKDROPS, type BackdropId } from './art/backdrops';
import { FOOT_BY_ID } from './data/feet';
import { audio } from './systems/audio';
import { updateSettings } from './systems/save';

const W = 1920;
const H = 1080;
const FPS = 60;
const DURATION = 30.4;

function logoCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1300;
  c.height = 420;
  const ctx = c.getContext('2d')!;
  const x = c.width / 2;
  const y = 300;
  ctx.font = '280px "Lilita One"';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(0, 24);
  ctx.lineWidth = 44;
  ctx.strokeStyle = '#2a1810';
  ctx.strokeText('FEETZA', x, y);
  ctx.fillStyle = '#2a1810';
  ctx.fillText('FEETZA', x, y);
  ctx.restore();
  ctx.lineWidth = 32;
  ctx.strokeStyle = '#2a1810';
  ctx.strokeText('FEETZA', x, y);
  const g = ctx.createLinearGradient(0, y - 220, 0, y);
  g.addColorStop(0, '#fff6b8');
  g.addColorStop(0.38, '#ffd23f');
  g.addColorStop(0.72, '#ff9f1c');
  g.addColorStop(1, '#e5402a');
  ctx.fillStyle = g;
  ctx.fillText('FEETZA', x, y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeText('FEETZA', x - 3, y - 6);
  return c;
}

export interface TrailerResult {
  frames: number;
  sfx: number;
  ms: number;
}

export async function recordTrailer(game: Phaser.Game, opts: { prefix: string }): Promise<TrailerResult> {
  const started = performance.now();
  updateSettings({ screenShake: true, flashes: true, damageNumbers: true });
  // speakers off: nothing should play out loud while rendering
  const sm = game.sound as Phaser.Sound.WebAudioSoundManager;
  try {
    sm.masterVolumeNode.disconnect(sm.context.destination);
  } catch {
    /* already disconnected */
  }
  sm.stopAll();

  // virtual clock + sound log
  let vt = 0;
  const sfxLog: { key: string; t: number; vol: number; rate: number }[] = [];
  const music: { key: string; t: number }[] = [];
  const lastByKey = new Map<string, number>();
  (audio as any).sfx = (key: string, o: { volume?: number; rate?: number; throttle?: number; jitter?: number } = {}) => {
    const thr = (o.throttle ?? 35) / 1000;
    if (vt - (lastByKey.get(key) ?? -1) < thr) return;
    lastByKey.set(key, vt);
    const jitter = o.jitter ?? 0.06;
    sfxLog.push({ key, t: +vt.toFixed(4), vol: o.volume ?? 1, rate: +((o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter)).toFixed(3) });
  };

  // fresh game scene under director control
  document.querySelectorAll('.screen').forEach((e) => e.remove());
  game.scene.getScenes(true).forEach((s) => s.scene.stop());
  game.scene.start('Game', { lineup: ['pepperoni', 'margherita', 'diavola'] });
  const g = game.scene.getScene('Game') as any;
  for (let i = 0; i < 80 && !g.plan; i++) await new Promise((r) => setTimeout(r, 50));
  g.time.removeAllEvents();
  const { ui } = await import('./ui/ui');
  ui.showHud(false);
  ui.closeAll();
  ui.hud.tutorial(false);
  sm.stopAll();
  Object.assign(g.plan, { queue: [], golden: false, maxAlive: 99, eliteChance: 0, speedMult: 1.55 });
  Object.assign(g, { bossPending: true, waveActive: true, tutorial: false, slamHinted: true });
  Object.assign(g.run.stats, { critChance: 0.28, knockback: 170 });
  for (const f of g.feet) f.destroy();
  const cam: Phaser.Cameras.Scene2D.Camera = g.cameras.main;
  const show = (id: BackdropId, fade: number) => {
    g.backdrop.show(id, fade);
    g.tintGrade(BACKDROPS[id].light, fade);
    g.currentBackdrop = id;
  };
  show('trattoria', 0);

  if (g.textures.exists('trailerLogo')) g.textures.remove('trailerLogo');
  g.textures.addCanvas('trailerLogo', logoCanvas());
  // titles live in their own scene so camera zoom/shake in the game never clips them
  if (game.scene.getScene('TrailerOverlay')) game.scene.remove('TrailerOverlay');
  game.scene.add('TrailerOverlay', class extends Phaser.Scene {}, true);
  const o = game.scene.getScene('TrailerOverlay') as any;
  game.scene.bringToTop('TrailerOverlay');
  const top = o.add.container(0, 0);
  const shade = o.add.rectangle(W / 2, H / 2, W, H, 0x120a06).setAlpha(0);
  top.add(shade);
  const caption = (text: string, color = '#ffd23f', y = 190, hold = 1500, size = 120) => {
    const t = o.add
      .text(W / 2, y, text, { fontFamily: '"Lilita One"', fontSize: `${size}px`, color, stroke: '#2a1810', strokeThickness: 22, align: 'center' })
      .setOrigin(0.5)
      .setShadow(0, 10, '#2a1810', 0, true, true)
      .setScale(2.2)
      .setAlpha(0)
      .setAngle(-4);
    top.add(t);
    o.tweens.add({ targets: t, scale: 1, alpha: 1, angle: -2, duration: 260, ease: 'Back.Out' });
    o.tweens.add({ targets: t, alpha: 0, y: y - 40, scale: 0.9, delay: hold, duration: 260, ease: 'Quad.In', onComplete: () => t.destroy() });
    audio.sfx('sfx_whoosh', { volume: 0.9, rate: 0.9 });
  };

  // auto-player: the peel glides to the lowest foot and smacks it
  const bot = { on: false, gap: 170, cd: 0, minY: 600 };
  const spawner = { on: false, every: 420, next: 0, pool: [] as string[], max: 6 };
  const healAll = () => g.pizzas.forEach((p: any) => p.heal(8));
  const tick = (dms: number) => {
    if (bot.on) {
      const tgt = g.feet.filter((f: any) => f.hittable && f.y > (f.type.boss ? 700 : bot.minY)).sort((a: any, b: any) => b.y - a.y)[0];
      if (tgt) {
        const k = Math.min(1, dms / 60);
        g.pointer.x += (tgt.cx - g.pointer.x) * k;
        g.pointer.y += (tgt.cy - g.pointer.y) * k;
        bot.cd -= dms;
        if (bot.cd <= 0 && Math.hypot(tgt.cx - g.pointer.x, tgt.cy - g.pointer.y) < 60) {
          g.smack(g.pointer.x, g.pointer.y);
          bot.cd = bot.gap;
        }
      }
    }
    if (spawner.on && vt * 1000 >= spawner.next) {
      spawner.next = vt * 1000 + spawner.every;
      if (g.feet.filter((f: any) => f.alive).length < spawner.max) {
        const t = g.pickTarget(null);
        if (t) g.spawnFoot(FOOT_BY_ID[Phaser.Utils.Array.GetRandom(spawner.pool)], t, false);
      }
    }
  };

  // ——— timeline (seconds) ———
  const timeline: [number, () => void][] = [];
  const at = (t: number, fn: () => void) => timeline.push([t, fn]);
  let logo: any;
  let tag: any;
  let boss: any;

  at(0, () => {
    // frame 0 is the thumbnail: open on feet already looming over two nervous pizzas
    const loom = (id: string, pizza: number, y: number) => {
      const f = g.spawnFoot(FOOT_BY_ID[id], g.pizzas[pizza], false);
      f.x = g.pizzas[pizza].x;
      f.y = y;
      f.slot = 0;
      f.setState('descend');
      f.vy = 40;
    };
    loom('tina', 0, 700);
    loom('clown', 2, 650);
    music.push({ key: 'music_boss', t: 0 });
    Object.assign(spawner, { on: true, every: 380, pool: ['bob', 'patty', 'sock', 'flipflop', 'sneaker', 'tina', 'harold', 'clara'] });
  });
  at(0.35, () => {
    logo = o.add.image(W / 2, 330, 'trailerLogo').setScale(3).setAlpha(0);
    top.add(logo);
    o.tweens.add({ targets: logo, scale: 1, alpha: 1, duration: 380, ease: 'Back.Out' });
  });
  at(0.62, () => {
    audio.sfx('sfx_stomp');
    audio.sfx('sfx_crit');
    cam.shake(380, 0.012);
    g.fx.party(W / 2, 360, 60);
  });
  at(1.0, () => {
    tag = o.add
      .text(W / 2, 520, 'Stop the feet. Save the pizza.', { fontFamily: '"Fredoka"', fontStyle: '600', fontSize: '64px', color: '#ffffff', stroke: '#2a1810', strokeThickness: 16 })
      .setOrigin(0.5)
      .setAlpha(0);
    top.add(tag);
    o.tweens.add({ targets: tag, alpha: 1, y: 500, duration: 400, ease: 'Quad.Out' });
  });
  at(2.75, () => o.tweens.add({ targets: [logo, tag], y: '-=420', alpha: 0, duration: 420, ease: 'Back.In' }));
  at(3.1, () => {
    bot.on = true;
    caption('SMACK THE FEET!', '#ffffff', 190, 1500);
  });
  at(5.6, () => caption('COMBOS. CRITS. TIPS.', '#ffd23f', 190, 1200, 104));
  at(7.4, () => {
    healAll();
    spawner.pool = ['clown', 'bella', 'robo', 'bunny', 'dino', 'xeno', 'mummy', 'jingle', 'moe', 'stompalot', 'disco', 'quack', 'wally', 'skate', 'cowboy', 'sasha', 'wendy', 'pete', 'striker', 'lava'];
    spawner.every = 300;
    caption('52 FEET. EACH WITH A TRICK.', '#ffd23f', 190, 2600, 100);
  });
  at(11.3, () => caption('12 LOCATIONS', '#ffffff', 190, 1300));
  (['rooftop', 'beach', 'diner', 'lodge', 'space'] as BackdropId[]).forEach((id, i) =>
    at(11.45 + i * 1.1, () => {
      show(id, 220);
      healAll();
    }),
  );
  at(17.0, () => {
    show('diner', 220);
    caption('WILD UPGRADES', '#7dff9a', 190, 1500);
    Object.assign(g.run.stats, { chainChance: 0.7, chainCount: 3, explodeDmg: 45, burnDps: 14, cutters: 2, doubleChance: 0.35 });
    g.syncCutters();
    bot.gap = 130;
    bot.minY = 520;
  });
  at(19.5, () => {
    spawner.on = false;
    bot.on = false;
    for (const f of g.feet.filter((x: any) => x.alive)) g.killFoot(f, 'slam');
    Object.assign(g.run.stats, { chainChance: 0, explodeDmg: 0, burnDps: 0, cutters: 0, doubleChance: 0 });
    g.syncCutters();
    healAll();
    show('bigfoot', 350);
    music.push({ key: 'music_boss_bigfoot', t: 19.5 });
    audio.sfx('sfx_warning');
    cam.flash(300, 255, 40, 20);
    cam.shake(700, 0.008);
    caption('BOSS FIGHTS!', '#ff5a3d', 200, 1700, 140);
  });
  at(20.4, () => {
    boss = g.spawnFoot(FOOT_BY_ID.bigfoot, g.pizzas[1], false);
    boss.maxHp = 260;
    boss.hp = 260;
    g.bossFoot = boss;
    audio.sfx('sfx_stomp');
    cam.shake(600, 0.01);
  });
  at(21.6, () => {
    bot.on = true;
    bot.gap = 120;
    Object.assign(spawner, { on: true, every: 650, pool: ['baby'], max: 4 });
  });
  at(23.7, () => {
    spawner.on = false;
    if (boss?.alive) boss.hp = Math.min(boss.hp, 40);
    g.run.super = 1;
    g.peelSlam();
  });
  at(26.0, () => {
    bot.on = false;
    o.tweens.add({ targets: shade, alpha: 0.72, duration: 600 });
    const endLogo = o.add.image(W / 2, 410, 'trailerLogo').setScale(2.6).setAlpha(0);
    top.add(endLogo);
    o.tweens.add({ targets: endLogo, scale: 1.05, alpha: 1, duration: 420, delay: 250, ease: 'Back.Out' });
  });
  at(26.7, () => {
    audio.sfx('sfx_stomp');
    cam.shake(300, 0.008);
    const cta = o.add
      .text(W / 2, 650, 'PLAY FREE IN YOUR BROWSER', { fontFamily: '"Lilita One"', fontSize: '76px', color: '#ffd23f', stroke: '#2a1810', strokeThickness: 16 })
      .setOrigin(0.5)
      .setAlpha(0);
    const url = o.add
      .text(W / 2, 750, 'trongateslegacy.github.io/feetza-the-game', { fontFamily: '"Fredoka"', fontStyle: '600', fontSize: '46px', color: '#ffffff', stroke: '#2a1810', strokeThickness: 10 })
      .setOrigin(0.5)
      .setAlpha(0);
    top.add([cta, url]);
    o.tweens.add({ targets: cta, alpha: 1, y: 640, duration: 400, delay: 200 });
    o.tweens.add({ targets: url, alpha: 1, y: 740, duration: 400, delay: 450 });
  });
  at(27.2, () => audio.sfx('sfx_levelup', { volume: 0.8 }));
  timeline.sort((a, b) => a[0] - b[0]);

  // ——— render loop: step the game on the virtual clock and upload each frame ———
  game.loop.stop();
  const canvas = game.canvas;
  const dtMs = 1000 / FPS;
  const total = Math.round(DURATION * FPS);
  const base = game.loop.time + 1000;
  const inflight = new Set<Promise<unknown>>();
  let ti = 0;
  for (let frame = 0; frame < total; frame++) {
    vt = frame / FPS;
    while (ti < timeline.length && timeline[ti][0] <= vt + 1e-6) timeline[ti++][1]();
    tick(dtMs);
    game.step(base + frame * dtMs, dtMs);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
    if (blob) {
      const p = fetch(`/__file?name=${opts.prefix}${String(frame).padStart(5, '0')}.jpg`, { method: 'POST', body: blob });
      inflight.add(p);
      void p.finally(() => inflight.delete(p));
      if (inflight.size > 12) await Promise.race(inflight);
    }
  }
  await Promise.all(inflight);
  await fetch(`/__file?name=${opts.prefix}audio.json`, { method: 'POST', body: JSON.stringify({ fps: FPS, sfx: sfxLog, music }) });
  delete (audio as any).sfx; // back to the real (prototype) method
  game.scene.remove('TrailerOverlay');
  game.loop.start(game.loop.callback);
  return { frames: total, sfx: sfxLog.length, ms: Math.round(performance.now() - started) };
}
