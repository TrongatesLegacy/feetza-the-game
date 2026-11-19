// Generates every procedural texture and registers it with Phaser.

import Phaser from 'phaser';
import '../content/art';
import { drawBackdrop, type BackdropId } from '../art/backdrops';
import { ART_RES, drawFoot, footPortrait, type FootTextures } from '../art/feetArt';
import { drawPizzaTop, drawSliceSprite, pizzaPortrait } from '../art/pizzaArt';
import { buildEventSprites } from '../art/eventArt';
import { buildSprites } from '../art/sprites';
import { FEET, FOOT_BY_ID } from '../data/feet';
import { PIZZAS, PIZZA_BY_ID } from '../data/pizzas';

export interface FootMeta {
  footKey: string;
  legKey: string;
  cuffKey?: string;
  originY: number;
  footHeight: number;
  halfWidth: number;
  legWidth: number;
  textures: FootTextures;
}

export const footMeta: Record<string, FootMeta> = {};
export const pizzaTops: Record<string, HTMLCanvasElement> = {};
const portraitCache = new Map<string, string>();

export { ART_RES };

function addCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/** Generate everything in small async chunks so the loading bar can animate. */
export async function generateAll(scene: Phaser.Scene, progress: (p: number, label: string) => void): Promise<void> {
  const jobs: [string, () => void][] = [];
  jobs.push([
    'Polishing plates',
    () => {
      const sprites = buildSprites();
      for (const [k, c] of Object.entries(sprites)) addCanvas(scene, k, c);
      for (const [k, c] of Object.entries(buildEventSprites())) addCanvas(scene, k, c);
    },
  ]);
  for (const p of PIZZAS) {
    jobs.push([
      `Baking ${p.name}`,
      () => {
        const top = drawPizzaTop(p);
        pizzaTops[p.id] = top;
        addCanvas(scene, `slice_${p.id}`, drawSliceSprite(p, top));
      },
    ]);
  }
  for (const f of FEET) {
    jobs.push([
      `Washing ${f.name}`,
      () => {
        const t = drawFoot(f);
        const meta: FootMeta = {
          footKey: `foot_${f.id}`,
          legKey: `leg_${f.id}`,
          cuffKey: t.cuff ? `cuff_${f.id}` : undefined,
          originY: t.originY,
          footHeight: t.footHeight,
          halfWidth: t.footHalfWidth,
          legWidth: t.legWidth,
          textures: t,
        };
        addCanvas(scene, meta.footKey, t.foot);
        addCanvas(scene, meta.legKey, t.leg);
        if (t.cuff && meta.cuffKey) addCanvas(scene, meta.cuffKey, t.cuff);
        footMeta[f.id] = meta;
      },
    ]);
  }
  jobs.push(['Lighting the oven', () => ensureBackdrop(scene, 'trattoria')]);
  let last = performance.now();
  for (let i = 0; i < jobs.length; i++) {
    const [label, fn] = jobs[i];
    fn();
    if (performance.now() - last > 30) {
      progress((i + 1) / jobs.length, label);
      await new Promise((r) => setTimeout(r, 0));
      last = performance.now();
    }
  }
  progress(1, 'Ready!');
}

export function backdropKey(id: BackdropId): string {
  return `bg_${id}`;
}

export function ensureBackdrop(scene: Phaser.Scene, id: BackdropId): string {
  const key = backdropKey(id);
  if (!scene.textures.exists(key)) addCanvas(scene, key, drawBackdrop(id));
  return key;
}

export function footPortraitURL(id: string): string {
  const k = `foot:${id}`;
  let url = portraitCache.get(k);
  if (!url) {
    const f = FOOT_BY_ID[id];
    url = footPortrait(f, footMeta[id].textures, 220);
    portraitCache.set(k, url);
  }
  return url;
}

export function pizzaPortraitURL(id: string): string {
  const k = `pizza:${id}`;
  let url = portraitCache.get(k);
  if (!url) {
    url = pizzaPortrait(PIZZA_BY_ID[id], pizzaTops[id], 200);
    portraitCache.set(k, url);
  }
  return url;
}
