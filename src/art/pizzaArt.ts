// Procedural pizzas: a detailed top-down image per variety, plus a perspective renderer
// that shows remaining slices, crust thickness and stomp footprints.

import { toppingDrawer } from './registry';
import type { PizzaType, Topping } from '../data/pizzas';
import { TIER_LOOK, type PizzaRarity } from '../data/pizzaRarity';
import { EXTRA_COUNTS, EXTRA_ORDER, drawDrizzles, drawExtraTopping } from './toppingsExtra';
import { type Ctx, blob, ellipse, grain, hashStr, makeCanvas, mix, rgba, rng, roundRect, shade } from './util';

export const PIZZA_SIZE = 400; // top-down texture size
export const PIZZA_R = 188;
export const TILT = 0.5; // vertical squash for the table perspective
export const SIDE = 20; // crust thickness in top-down units
export const MAX_SIDE = 46;

export function sideFor(shape: PizzaType['shape']): number {
  return shape === 'deep' ? 46 : shape === 'square' ? 26 : shape === 'calzone' ? 30 : SIDE;
}

export const CALZONE_CY = PIZZA_SIZE / 2 - PIZZA_R * 0.36;

export const SAUCE: Record<PizzaType['base'], string> = {
  tomato: '#c22f1c',
  pesto: '#4d8a2a',
  bbq: '#6a2812',
  white: '#f1e2bd',
  choc: '#4a2414',
  // phase 3 bases
  saffron: '#e8a02a',
  ink: '#231e2a',
  moon: '#c9d0d8',
  pink: '#d23a78',
};

function shapePath(ctx: Ctx, shape: PizzaType['shape'], r: number): void {
  const c = PIZZA_SIZE / 2;
  if (shape === 'square') roundRect(ctx, c - r, c - r, r * 2, r * 2, r * 0.12);
  else if (shape === 'calzone') {
    ctx.beginPath();
    ctx.moveTo(c + r, CALZONE_CY);
    ctx.arc(c, CALZONE_CY, r, 0, Math.PI);
    ctx.quadraticCurveTo(c, CALZONE_CY - r * 0.22, c + r, CALZONE_CY);
    ctx.closePath();
  } else ellipse(ctx, c, c, r, r);
}

function pointInShape(shape: PizzaType['shape'], r: number, rand: () => number): [number, number] {
  const c = PIZZA_SIZE / 2;
  if (shape === 'square') return [c - r + rand() * r * 2, c - r + rand() * r * 2];
  if (shape === 'calzone') {
    const a = rand() * Math.PI;
    const d = Math.sqrt(rand()) * r * 0.85;
    return [c + Math.cos(a) * d, CALZONE_CY + Math.sin(a) * d];
  }
  const a = rand() * Math.PI * 2;
  const d = Math.sqrt(rand()) * r;
  return [c + Math.cos(a) * d, c + Math.sin(a) * d];
}

function scatter(shape: PizzaType['shape'], r: number, n: number, minDist: number, rand: () => number): [number, number][] {
  const pts: [number, number][] = [];
  let tries = 0;
  while (pts.length < n && tries < n * 60) {
    tries++;
    const p = pointInShape(shape, r, rand);
    if (pts.every((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 > minDist * minDist)) pts.push(p);
  }
  return pts;
}

function drawCrust(ctx: Ctx, p: PizzaType, rand: () => number): void {
  const c = PIZZA_SIZE / 2;
  const R = PIZZA_R;
  shapePath(ctx, p.shape, R);
  const g =
    p.shape === 'square'
      ? ctx.createLinearGradient(c - R, c - R, c + R, c + R)
      : ctx.createRadialGradient(c - 30, c - 40, R * 0.55, c, c, R);
  if (p.shape === 'square') {
    g.addColorStop(0, shade(p.crust, 0.25));
    g.addColorStop(1, shade(p.crust, -0.25));
  } else {
    g.addColorStop(0, shade(p.crust, -0.15));
    g.addColorStop(0.82, shade(p.crust, 0.18));
    g.addColorStop(0.93, p.crust);
    g.addColorStop(1, shade(p.crust, -0.35));
  }
  ctx.fillStyle = g;
  ctx.fill();
  // puffy rim highlight
  ctx.save();
  shapePath(ctx, p.shape, R);
  ctx.clip();
  ctx.strokeStyle = rgba(shade(p.crust, 0.5), 0.55);
  ctx.lineWidth = 7;
  shapePath(ctx, p.shape, R - 12);
  ctx.stroke();
  // char blisters
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2;
    const d = R - 6 - rand() * 18;
    const x = p.shape === 'square' ? c + Math.max(-1, Math.min(1, Math.cos(a) * 1.5)) * d : c + Math.cos(a) * d;
    const y = p.shape === 'square' ? c + Math.max(-1, Math.min(1, Math.sin(a) * 1.5)) * d : c + Math.sin(a) * d;
    ctx.fillStyle = rgba('#3a1a08', 0.25 + rand() * 0.45);
    blob(ctx, x, y, 2 + rand() * 6, 0.6, rand, 7);
    ctx.fill();
  }
  // flour dust
  for (let i = 0; i < 60; i++) {
    const [x, y] = pointInShape(p.shape, R, rand);
    ctx.fillStyle = rgba('#fff8e8', 0.18 * rand());
    ellipse(ctx, x, y, 1.5 + rand() * 2.5, 1.5 + rand() * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = rgba('#3a1a08', 0.55);
  ctx.lineWidth = 3;
  shapePath(ctx, p.shape, R);
  ctx.stroke();
}

function drawSauce(ctx: Ctx, p: PizzaType, rand: () => number): void {
  const c = PIZZA_SIZE / 2;
  const r = PIZZA_R * 0.8;
  const col = SAUCE[p.base];
  ctx.save();
  if (p.shape === 'square') {
    roundRect(ctx, c - r, c - r, r * 2, r * 2, 14);
  } else blob(ctx, c, c, r, 0.06, rand, 26);
  ctx.clip();
  const g = ctx.createRadialGradient(c - 40, c - 40, 10, c, c, r * 1.2);
  g.addColorStop(0, shade(col, 0.15));
  g.addColorStop(1, shade(col, -0.2));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
  for (let i = 0; i < 40; i++) {
    const [x, y] = pointInShape(p.shape, r, rand);
    ctx.fillStyle = rgba(rand() > 0.5 ? shade(col, 0.2) : shade(col, -0.3), 0.35);
    blob(ctx, x, y, 6 + rand() * 18, 0.5, rand, 8);
    ctx.fill();
  }
  if (p.base === 'tomato' || p.base === 'pesto') {
    // herb flecks
    for (let i = 0; i < 70; i++) {
      const [x, y] = pointInShape(p.shape, r, rand);
      ctx.fillStyle = rgba(p.base === 'pesto' ? '#1d3d10' : '#2f5d1c', 0.7);
      ctx.fillRect(x, y, 2 + rand() * 2, 1.5 + rand() * 2);
    }
  }
  grain(ctx, c - r, c - r, r * 2, r * 2, 0.08, rand, 2);
  ctx.restore();
  // sauce edge shadow
  ctx.strokeStyle = rgba('#2a0e04', 0.25);
  ctx.lineWidth = 3;
  if (p.shape === 'square') roundRect(ctx, c - r, c - r, r * 2, r * 2, 14);
  else ellipse(ctx, c, c, r, r);
  ctx.stroke();
}

function drawCheese(ctx: Ctx, p: PizzaType, rand: () => number): void {
  if (p.cheese <= 0) return;
  const r = PIZZA_R * 0.77;
  const n = Math.round(14 + p.cheese * 60);
  const base = p.base === 'white' ? '#fbefcc' : '#f7d77c';
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pointInShape(p.shape, r - 10, rand);
    pts.push([x, y, (p.cheese > 0.7 ? 22 : 16) + rand() * 22]);
  }
  // shadow pass, then cheese
  for (const [x, y, rr] of pts) {
    ctx.fillStyle = rgba('#7a3a10', 0.18);
    blob(ctx, x + 2, y + 3, rr, 0.45, rand, 9);
    ctx.fill();
  }
  for (const [x, y, rr] of pts) {
    const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 1, x, y, rr);
    g.addColorStop(0, shade(base, 0.35));
    g.addColorStop(0.7, base);
    g.addColorStop(1, shade(base, -0.12));
    ctx.fillStyle = g;
    blob(ctx, x, y, rr, 0.45, rand, 9);
    ctx.fill();
  }
  // browned bubbles and oil sheen
  for (let i = 0; i < n * 0.8; i++) {
    const [x, y] = pointInShape(p.shape, r - 14, rand);
    ctx.fillStyle = rgba('#c06a1c', 0.3 + rand() * 0.4);
    blob(ctx, x, y, 2 + rand() * 6, 0.5, rand, 7);
    ctx.fill();
  }
  for (let i = 0; i < n * 0.5; i++) {
    const [x, y] = pointInShape(p.shape, r - 14, rand);
    ctx.fillStyle = rgba('#ffffff', 0.35 + rand() * 0.3);
    ellipse(ctx, x, y, 2 + rand() * 4, 1 + rand() * 2, -0.6);
    ctx.fill();
  }
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.5): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, -0.6);
  ctx.fill();
}

function drawTopping(ctx: Ctx, t: Topping, x: number, y: number, rand: () => number): void {
  const rot = rand() * Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  switch (t) {
    case 'pepperoni':
    case 'salami': {
      const r = t === 'salami' ? 25 : 24;
      ctx.fillStyle = rgba('#3a0c04', 0.35);
      ellipse(ctx, 2, 3, r, r);
      ctx.fill();
      const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, r);
      g.addColorStop(0, t === 'salami' ? '#d85a4a' : '#d8432a');
      g.addColorStop(0.75, t === 'salami' ? '#a8322a' : '#b02a17');
      g.addColorStop(1, '#6a160a');
      ctx.fillStyle = g;
      ellipse(ctx, 0, 0, r, r);
      ctx.fill();
      ctx.fillStyle = t === 'salami' ? rgba('#ffe0d8', 0.7) : rgba('#5a1206', 0.45);
      for (let i = 0; i < (t === 'salami' ? 9 : 6); i++) {
        ellipse(ctx, (rand() - 0.5) * r * 1.3, (rand() - 0.5) * r * 1.3, 1.5 + rand() * 2.5, 1.5 + rand() * 2);
        ctx.fill();
      }
      // cupped char edge
      ctx.strokeStyle = rgba('#3a0a02', 0.7);
      ctx.lineWidth = 2.5;
      ellipse(ctx, 0, 0, r - 1, r - 1);
      ctx.stroke();
      shine(ctx, -r * 0.35, -r * 0.4, r * 0.35, r * 0.15, 0.55);
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = rgba('#3a2010', 0.3);
      ctx.beginPath();
      ctx.arc(2, 3, 18, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 17, Math.PI, 0);
      ctx.lineTo(7, 0);
      ctx.lineTo(6, 16);
      ctx.quadraticCurveTo(0, 19, -6, 16);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fillStyle = '#d9c3a4';
      ctx.fill();
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = rgba('#8a6a48', 0.6);
      ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4, -2);
        ctx.lineTo(i * 2.2, -13);
        ctx.stroke();
      }
      break;
    }
    case 'olive': {
      ellipse(ctx, 0, 0, 9, 9);
      ctx.strokeStyle = '#1b1c1a';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = rgba('#8a8f84', 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10, -2.4, -1.2);
      ctx.stroke();
      break;
    }
    case 'greenPepper':
    case 'redPepper':
    case 'jalapeno': {
      const col = t === 'greenPepper' ? '#3f9a2e' : t === 'redPepper' ? '#e0402a' : '#2f7a22';
      ctx.strokeStyle = shade(col, -0.45);
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.arc(0, 0, 18, -0.6, 1.6);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.45);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17, -0.4, 0.6);
      ctx.stroke();
      if (t === 'jalapeno') {
        ctx.fillStyle = '#f2e7b0';
        for (let i = 0; i < 3; i++) {
          ellipse(ctx, Math.cos(i) * 8, Math.sin(i) * 8, 2, 1.4, i);
          ctx.fill();
        }
      }
      break;
    }
    case 'onion': {
      ctx.strokeStyle = rgba('#7a2a6a', 0.9);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0.2, 2.6);
      ctx.stroke();
      ctx.strokeStyle = rgba('#f2d8ef', 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0.3, 2.5);
      ctx.stroke();
      break;
    }
    case 'pineapple': {
      roundRect(ctx, -10, -9, 20, 18, 4);
      const g = ctx.createLinearGradient(-10, -9, 10, 9);
      g.addColorStop(0, '#fff07a');
      g.addColorStop(1, '#e8b52a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#a77a12';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = rgba('#c9921a', 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(-6, 2);
      ctx.lineTo(2, -6);
      ctx.stroke();
      break;
    }
    case 'ham':
    case 'bacon': {
      const col = t === 'ham' ? '#f08b8b' : '#c2453a';
      ctx.beginPath();
      if (t === 'ham') ctx.rect(-13, -11, 26, 22);
      else {
        ctx.moveTo(-22, -6);
        ctx.bezierCurveTo(-8, -14, 8, 2, 22, -6);
        ctx.lineTo(22, 6);
        ctx.bezierCurveTo(8, 14, -8, -2, -22, 6);
        ctx.closePath();
      }
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.45);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffe8e0', 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (t === 'ham') {
        ctx.moveTo(-10, 4);
        ctx.quadraticCurveTo(0, -4, 10, 2);
      } else {
        ctx.moveTo(-20, 0);
        ctx.bezierCurveTo(-8, -8, 8, 8, 20, 0);
      }
      ctx.stroke();
      break;
    }
    case 'basil':
    case 'arugula': {
      const col = t === 'basil' ? '#2f8a2a' : '#4c8f2c';
      ctx.beginPath();
      if (t === 'basil') {
        ctx.moveTo(-16, 0);
        ctx.quadraticCurveTo(0, -16, 16, 0);
        ctx.quadraticCurveTo(0, 16, -16, 0);
      } else {
        ctx.moveTo(-18, 0);
        for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(-14 + i * 7, i % 2 ? -14 : -8, -10 + i * 7, -3);
        ctx.lineTo(18, 0);
        for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(14 - i * 7, i % 2 ? 12 : 7, 10 - i * 7, 3);
        ctx.closePath();
      }
      const g = ctx.createLinearGradient(0, -12, 0, 12);
      g.addColorStop(0, shade(col, 0.25));
      g.addColorStop(1, shade(col, -0.35));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.strokeStyle = rgba('#cdf0a0', 0.6);
      ctx.stroke();
      break;
    }
    case 'chili': {
      ctx.fillStyle = '#d4140a';
      ellipse(ctx, 0, 0, 7, 7);
      ctx.fill();
      ctx.fillStyle = '#f8e6a8';
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, Math.cos(i * 1.6) * 3, Math.sin(i * 1.6) * 3, 1.3, 1);
        ctx.fill();
      }
      shine(ctx, -2, -3, 3, 1.4, 0.6);
      break;
    }
    case 'chicken':
    case 'sausage': {
      const col = t === 'chicken' ? '#d9b07a' : '#8a4a2a';
      blob(ctx, 0, 0, t === 'chicken' ? 12 : 10, 0.5, rand, 8);
      const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
      g.addColorStop(0, shade(col, 0.25));
      g.addColorStop(1, shade(col, -0.25));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      if (t === 'chicken') {
        ctx.strokeStyle = rgba('#5a2a10', 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(6, -2);
        ctx.moveTo(-5, 3);
        ctx.lineTo(5, 3);
        ctx.stroke();
      }
      break;
    }
    case 'blueCheese': {
      ctx.fillStyle = '#f3efe2';
      blob(ctx, 0, 0, 11, 0.5, rand, 8);
      ctx.fill();
      ctx.fillStyle = '#5a7fa0';
      for (let i = 0; i < 5; i++) {
        ellipse(ctx, (rand() - 0.5) * 12, (rand() - 0.5) * 12, 1.5, 1.2);
        ctx.fill();
      }
      break;
    }
    case 'parmesan': {
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.lineTo(9, -5);
      ctx.lineTo(6, 4);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba('#b8a070', 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case 'mozzarella': {
      const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 24);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.8, '#f6eedb');
      g.addColorStop(1, '#d9b98a');
      blob(ctx, 0, 0, 22, 0.25, rand, 10);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = rgba('#c88a3a', 0.3);
      ellipse(ctx, 5, 6, 6, 4);
      ctx.fill();
      break;
    }
    case 'tomato': {
      ellipse(ctx, 0, 0, 17, 17);
      ctx.fillStyle = '#e5452f';
      ctx.fill();
      ctx.strokeStyle = '#8a1a0e';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#f7a089';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ellipse(ctx, Math.cos(a) * 8, Math.sin(a) * 8, 5, 3.5, a);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd0b8';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ellipse(ctx, Math.cos(a) * 9, Math.sin(a) * 9, 1.2, 1.2);
        ctx.fill();
      }
      shine(ctx, -5, -7, 5, 2, 0.5);
      break;
    }
    case 'truffle': {
      ctx.fillStyle = '#3a2a22';
      blob(ctx, 0, 0, 12, 0.3, rand, 9);
      ctx.fill();
      ctx.strokeStyle = rgba('#d9c3a4', 0.75);
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo((rand() - 0.5) * 16, (rand() - 0.5) * 16);
        ctx.quadraticCurveTo(0, 0, (rand() - 0.5) * 16, (rand() - 0.5) * 16);
        ctx.stroke();
      }
      break;
    }
    case 'strawberry': {
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.bezierCurveTo(16, -14, 14, 8, 0, 15);
      ctx.bezierCurveTo(-14, 8, -16, -14, 0, -14);
      const g = ctx.createRadialGradient(-4, -6, 1, 0, 0, 16);
      g.addColorStop(0, '#ff6f7d');
      g.addColorStop(1, '#b3122a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 7; i++) {
        ellipse(ctx, (rand() - 0.5) * 14, (rand() - 0.4) * 18, 1, 1.5);
        ctx.fill();
      }
      ctx.fillStyle = '#3f9a2e';
      ctx.beginPath();
      ctx.moveTo(-8, -14);
      ctx.lineTo(0, -10);
      ctx.lineTo(8, -14);
      ctx.lineTo(0, -18);
      ctx.closePath();
      ctx.fill();
      shine(ctx, -4, -6, 4, 2, 0.6);
      break;
    }
    case 'chocolate': {
      ctx.strokeStyle = '#2a120a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-26, -4);
      ctx.bezierCurveTo(-10, -18, 10, 14, 26, 0);
      ctx.stroke();
      ctx.strokeStyle = rgba('#a06a4a', 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'goldLeaf': {
      ctx.fillStyle = '#f7d354';
      ctx.shadowColor = '#fff2a0';
      ctx.shadowBlur = 8;
      blob(ctx, 0, 0, 8, 0.8, rand, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case 'bbq':
      break;
    default:
      if (!drawExtraTopping(ctx, t, rand)) toppingDrawer(t)?.draw(ctx, rand);
  }
  ctx.restore();
}

/** Where each topping piece goes, as it's drawn: `draw` paints it on the ctx given (exactly once, in order, so the
 *  pizza's randomness stays the same). The pizza peels (src/art/peelPizza.ts) lift some pieces onto their own layer. */
export type ToppingHook = (t: Topping, x: number, y: number, count: number, draw: (ctx: Ctx) => void) => void;

/** Draw order: bigger/base toppings first, garnish last. */
function toppingOrderAll(): Topping[] {
  const order: Topping[] = ['mozzarella', 'tomato', 'ham', 'bacon', 'pepperoni', 'salami', 'chicken', 'sausage', 'mushroom', 'pineapple', 'greenPepper', 'redPepper', 'jalapeno', 'onion', 'olive', 'blueCheese', 'strawberry', 'truffle', 'chili', 'parmesan', 'chocolate', 'arugula', 'basil', 'goldLeaf'];
  order.splice(4, 0, ...EXTRA_ORDER.slice(0, 5));
  order.splice(order.indexOf('olive') + 1, 0, ...EXTRA_ORDER.slice(5));
  return order;
}

function drawToppings(ctx: Ctx, p: PizzaType, rand: () => number, each?: ToppingHook): void {
  const r = PIZZA_R * 0.72;
  const counts: Partial<Record<Topping, number>> = {
    pepperoni: 13, salami: 9, mushroom: 13, olive: 12, greenPepper: 8, redPepper: 7, onion: 9, pineapple: 14, ham: 12,
    basil: 7, chili: 18, chicken: 14, sausage: 14, bacon: 8, blueCheese: 10, parmesan: 18, truffle: 10, arugula: 10,
    strawberry: 12, chocolate: 7, goldLeaf: 14, tomato: 7, jalapeno: 9, mozzarella: 9,
  };
  Object.assign(counts, EXTRA_COUNTS);
  const per = p.toppings.length > 3 ? 0.6 : p.toppings.length > 2 ? 0.7 : 1;
  const order = toppingOrderAll();
  for (const t of order) {
    if (!p.toppings.includes(t)) continue;
    const n = Math.round((counts[t] ?? 8) * per);
    const pts = scatter(p.shape, r, n, t === 'chili' || t === 'parmesan' || t === 'goldLeaf' ? 14 : t === 'pepperoni' || t === 'salami' ? 44 : 28, rand);
    for (const [x, y] of pts) {
      if (each) each(t, x, y, n, (c) => drawTopping(c, t, x, y, rand));
      else drawTopping(ctx, t, x, y, rand);
    }
  }
  // Feetza 2.0 toppings registered by content modules, drawn after the built-in ones
  for (const t of p.toppings) {
    const d = toppingDrawer(t);
    if (!d || order.includes(t)) continue;
    const n = Math.round((d.count ?? 8) * per);
    const pts = scatter(p.shape, r, n, d.minDist ?? 28, rand);
    for (const [x, y] of pts) {
      if (each) each(t, x, y, n, (c) => drawTopping(c, t, x, y, rand));
      else drawTopping(ctx, t, x, y, rand);
    }
  }
  drawDrizzles(ctx, p.toppings, PIZZA_SIZE);
  if (p.toppings.includes('bbq')) {
    ctx.strokeStyle = rgba('#3a1408', 0.8);
    ctx.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const y = 100 + i * 40;
      ctx.beginPath();
      ctx.moveTo(70, y);
      for (let x = 70; x <= 330; x += 26) ctx.lineTo(x, y + Math.sin(x * 0.07 + i) * 12);
      ctx.stroke();
    }
  }
}

function drawCalzone(ctx: Ctx, p: PizzaType, rand: () => number): void {
  const c = PIZZA_SIZE / 2;
  const R = PIZZA_R;
  shapePath(ctx, 'calzone', R);
  const g = ctx.createRadialGradient(c - 30, CALZONE_CY + 40, 10, c, CALZONE_CY + 40, R);
  g.addColorStop(0, shade(p.crust, 0.35));
  g.addColorStop(0.6, p.crust);
  g.addColorStop(1, shade(p.crust, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  shapePath(ctx, 'calzone', R);
  ctx.clip();
  // char + egg-wash gloss
  for (let i = 0; i < 30; i++) {
    const [x, y] = pointInShape('calzone', R, rand);
    ctx.fillStyle = rgba('#3a1a08', 0.15 + rand() * 0.3);
    blob(ctx, x, y, 2 + rand() * 6, 0.6, rand, 7);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#fff6dc', 0.35);
  ellipse(ctx, c - 40, CALZONE_CY + 50, 90, 26, -0.15);
  ctx.fill();
  // vents with oozing sauce + cheese
  for (const [vx, vy, rot] of [[c - 70, CALZONE_CY + 70, -0.3], [c, CALZONE_CY + 80, 0], [c + 70, CALZONE_CY + 70, 0.3]]) {
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(rot);
    ellipse(ctx, 0, 0, 20, 6);
    ctx.fillStyle = '#9a2414';
    ctx.fill();
    ellipse(ctx, 3, 2, 10, 3);
    ctx.fillStyle = '#f7d77c';
    ctx.fill();
    ctx.restore();
  }
  // parmesan + herbs
  for (let i = 0; i < 60; i++) {
    const [x, y] = pointInShape('calzone', R * 0.9, rand);
    ctx.fillStyle = rand() > 0.5 ? rgba('#fff8e0', 0.8) : rgba('#2f5d1c', 0.8);
    ctx.fillRect(x, y, 2 + rand() * 2, 2);
  }
  ctx.restore();
  // crimped edge
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    const x = c + Math.cos(a) * (R - 10);
    const y = CALZONE_CY + Math.sin(a) * (R - 10);
    ellipse(ctx, x, y, 11, 8, a);
    ctx.fillStyle = shade(p.crust, i % 2 ? 0.15 : -0.05);
    ctx.fill();
    ctx.strokeStyle = rgba('#5a2a08', 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  shapePath(ctx, 'calzone', R);
  ctx.strokeStyle = rgba('#3a1a08', 0.55);
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawDeepFilling(ctx: Ctx, p: PizzaType, rand: () => number): void {
  const c = PIZZA_SIZE / 2;
  const r = PIZZA_R * 0.78;
  // inner wall shadow
  ellipse(ctx, c, c, r + 6, r + 6);
  ctx.fillStyle = shade(p.crust, -0.45);
  ctx.fill();
  ellipse(ctx, c, c + 4, r, r);
  ctx.fillStyle = '#a8261a';
  ctx.fill();
  ctx.save();
  ellipse(ctx, c, c + 4, r, r);
  ctx.clip();
  // chunky tomato
  for (let i = 0; i < 70; i++) {
    const [x, y] = pointInShape('round', r, rand);
    const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 12);
    g.addColorStop(0, '#f05a3c');
    g.addColorStop(1, '#8a1a0e');
    ctx.fillStyle = g;
    blob(ctx, x, y, 6 + rand() * 9, 0.6, rand, 7);
    ctx.fill();
  }
  // sausage peeking through
  for (let i = 0; i < 8; i++) {
    const [x, y] = pointInShape('round', r * 0.9, rand);
    ctx.fillStyle = '#7a4024';
    blob(ctx, x, y, 8, 0.6, rand, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawFrico(ctx: Ctx, p: PizzaType, rand: () => number): void {
  // caramelised cheese crown around a Detroit pan pizza
  const c = PIZZA_SIZE / 2;
  const R = PIZZA_R;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const side = Math.floor(rand() * 4);
    const t = rand() * 2 - 1;
    const x = side < 2 ? c + t * R * 0.95 : c + (side === 2 ? -1 : 1) * R * 0.9;
    const y = side < 2 ? c + (side === 0 ? -1 : 1) * R * 0.9 : c + t * R * 0.95;
    ctx.fillStyle = rgba(rand() > 0.5 ? '#5a2a0c' : '#8a4a14', 0.5 + rand() * 0.4);
    blob(ctx, x, y, 3 + rand() * 7, 0.7, rand, 7);
    ctx.fill();
  }
  ctx.restore();
  void p;
}

/** A pizza's top painted in layers (the pizza peels animate them: src/art/peelPizza.ts): the crust and sauce (and a
 *  calzone whole) on `base`, the cheese on `cheese`, the toppings and the warm gloss on `tops`, each piece through
 *  `each` if given. Drawn on one ctx it is the pizza's top. Yields between the layers. */
export interface PizzaLayers {
  base: Ctx;
  cheese: Ctx;
  tops: Ctx;
  each?: ToppingHook;
}

export function* pizzaTopSteps(p: PizzaType, L: PizzaLayers): Generator<void, void> {
  const rand = rng(hashStr(p.id));
  const ctx = L.base;
  if (p.shape === 'calzone') {
    drawCalzone(ctx, p, rand);
    // phase 3 calzones paint their overlays (lava, cracks) over the folded crust
    for (const t of p.toppings) {
      ctx.save();
      toppingDrawer(t)?.draw(ctx, rand);
      ctx.restore();
    }
    return;
  }
  drawCrust(ctx, p, rand);
  if (p.shape === 'deep') drawDeepFilling(ctx, p, rand);
  else drawSauce(ctx, p, rand);
  if (p.toppings.includes('redStripes')) drawFrico(ctx, p, rand);
  yield;
  drawCheese(L.cheese, p, rand);
  yield;
  drawToppings(L.tops, p, rand, L.each);
  // warm gloss (over everything: on the top layer, it composites the same)
  const t = L.tops;
  const c0 = PIZZA_SIZE / 2;
  const g = t.createRadialGradient(c0 - 60, c0 - 70, 10, c0 - 40, c0 - 40, PIZZA_R);
  g.addColorStop(0, rgba('#fff2d0', 0.22));
  g.addColorStop(1, rgba('#fff2d0', 0));
  t.save();
  shapePath(t, p.shape, PIZZA_R);
  t.clip();
  t.fillStyle = g;
  t.fillRect(0, 0, PIZZA_SIZE, PIZZA_SIZE);
  t.restore();
}

export function drawPizzaTop(p: PizzaType): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(PIZZA_SIZE, PIZZA_SIZE);
  const gen = pizzaTopSteps(p, { base: ctx, cheese: ctx, tops: ctx });
  while (!gen.next().done);
  return c;
}

/** The calzone's three vents (top-down px, and each one's turn). */
export const CALZONE_VENTS: [number, number, number][] = [
  [PIZZA_SIZE / 2 - 70, CALZONE_CY + 70, -0.3],
  [PIZZA_SIZE / 2, CALZONE_CY + 80, 0],
  [PIZZA_SIZE / 2 + 70, CALZONE_CY + 70, 0.3],
];

/** The order toppings are drawn in (the pizza peels lift the last-drawn pieces). */
export function toppingOrder(p: PizzaType): Topping[] {
  const order = toppingOrderAll();
  const out = order.filter((t) => p.toppings.includes(t));
  for (const t of p.toppings) if (toppingDrawer(t) && !order.includes(t)) out.push(t);
  return out;
}

/** Path for slice i of n in top-down coords. */
export function slicePath(ctx: Ctx, shape: PizzaType['shape'], i: number, n: number, rOver = 6): void {
  ctx.beginPath();
  addSlice(ctx, shape, i, n, rOver);
}

function addSlice(ctx: Ctx, shape: PizzaType['shape'], i: number, n: number, rOver = 6): void {
  const c = PIZZA_SIZE / 2;
  const R = PIZZA_R + rOver;
  if (shape === 'calzone') {
    const w = (R * 2) / n;
    ctx.rect(c - R + i * w, CALZONE_CY - R * 0.3, w, R * 1.35);
    return;
  }
  if (shape === 'square') {
    const top = Math.ceil(n / 2);
    const bot = n - top;
    const row = i < top ? 0 : 1;
    const cols = row === 0 ? top : bot;
    const col = row === 0 ? i : i - top;
    const w = (R * 2) / cols;
    ctx.rect(c - R + col * w, c - R + row * R, w, R);
    return;
  }
  const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2;
  const a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2;
  ctx.moveTo(c, c);
  ctx.arc(c, c, R, a0, a1);
  ctx.closePath();
}

export interface Footprint {
  x: number;
  y: number;
  rot: number;
  s: number;
}

export interface PizzaRenderState {
  type: PizzaType;
  top: HTMLCanvasElement;
  alive: boolean[];
  prints: Footprint[];
  shield: boolean;
}

export const PIZZA_CANVAS_W = PIZZA_SIZE + 20;
export const PIZZA_CANVAS_H = PIZZA_SIZE * TILT + MAX_SIDE + 20;

/** Render a pizza in table perspective into the given canvas. */
export function renderPizza(ctx: Ctx, st: PizzaRenderState): void {
  const { type } = st;
  const n = st.alive.length;
  const SIDE = sideFor(type.shape);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const k = ctx.canvas.width / PIZZA_CANVAS_W;
  const ox = 10 * k;
  const oy = 6 * k;
  const aliveClip = () => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) if (st.alive[i]) addSlice(ctx, type.shape, i, n);
  };
  // Pizza Fantasma: the whole pie is see-through
  ctx.globalAlpha = type.finish?.ghost ? 0.72 : 1;
  // crust side (thickness)
  ctx.save();
  ctx.setTransform(k, 0, 0, k * TILT, ox, oy + SIDE * k);
  aliveClip();
  ctx.clip();
  shapePath(ctx, type.shape, PIZZA_R);
  const sg = ctx.createLinearGradient(0, 0, PIZZA_SIZE, 0);
  sg.addColorStop(0, shade(type.crust, -0.45));
  sg.addColorStop(0.4, shade(type.crust, -0.05));
  sg.addColorStop(1, shade(type.crust, -0.5));
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.restore();
  // side mid-layers to fake extrusion
  for (let t = SIDE - 3; t > 0; t -= 3) {
    ctx.save();
    ctx.setTransform(k, 0, 0, k * TILT, ox, oy + t * k);
    aliveClip();
    ctx.clip();
    shapePath(ctx, type.shape, PIZZA_R);
    ctx.fillStyle = mix(shade(type.crust, -0.25), shade(type.crust, 0.15), 1 - t / SIDE);
    ctx.fill();
    ctx.restore();
  }
  // top
  ctx.save();
  ctx.setTransform(k, 0, 0, k * TILT, ox, oy);
  aliveClip();
  ctx.clip();
  ctx.drawImage(st.top, 0, 0);
  // stomp prints
  for (const fp of st.prints) drawPrint(ctx, fp);
  // cut lines (clipped to the pizza itself)
  ctx.save();
  shapePath(ctx, type.shape, PIZZA_R - 2);
  ctx.clip();
  ctx.strokeStyle = rgba('#3a1606', 0.35);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < n; i++) {
    if (!st.alive[i]) continue;
    slicePath(ctx, type.shape, i, n, -2);
    ctx.stroke();
  }
  ctx.restore();
  if (st.shield) {
    shapePath(ctx, type.shape, PIZZA_R);
    ctx.fillStyle = rgba('#fff4a8', 0.18);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawPrint(ctx: Ctx, fp: Footprint): void {
  ctx.save();
  ctx.translate(fp.x, fp.y);
  ctx.rotate(fp.rot);
  ctx.scale(fp.s, fp.s);
  ctx.fillStyle = rgba('#5a1a08', 0.32);
  // sole + heel
  ctx.beginPath();
  ctx.ellipse(0, 10, 30, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes = [
    [-26, -50, 7],
    [-14, -58, 8],
    [0, -62, 9],
    [15, -60, 10],
    [32, -52, 13],
  ];
  for (const [x, y, r] of toes) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // squished cheese ridges
  ctx.strokeStyle = rgba('#fff0b8', 0.35);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 10, 36, 58, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A single slice image for the "slice goes flying" particle (top-down). */
export function drawSliceSprite(p: PizzaType, top: HTMLCanvasElement): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(PIZZA_SIZE, PIZZA_SIZE);
  ctx.save();
  slicePath(ctx, p.shape, 0, 8);
  ctx.clip();
  ctx.drawImage(top, 0, 0);
  ctx.restore();
  // crop to the slice bounds
  const sq = p.shape === 'square' || p.shape === 'calzone';
  const minX = sq ? PIZZA_SIZE / 2 - PIZZA_R - 6 : PIZZA_SIZE / 2 - 4;
  const w = sq ? (PIZZA_R + 6) / 2 : PIZZA_R * 0.78;
  const minY = p.shape === 'calzone' ? CALZONE_CY - PIZZA_R * 0.3 : PIZZA_SIZE / 2 - PIZZA_R - 6;
  const h = PIZZA_R + 10;
  const [o, octx] = makeCanvas(w + 8, h);
  octx.drawImage(c, minX, minY, w + 8, h, 0, 0, w + 8, h);
  return o;
}

/** A portrait's plate (drawn at the origin, unsquashed: the caller tilts it), in its tier's materials (TIER_LOOK). */
function tierPlate(ctx: Ctx, r: PizzaRarity): void {
  const t = TIER_LOOK[r];
  const R = 205;
  // the rim
  const rim = ctx.createLinearGradient(-R, -R, R, R);
  rim.addColorStop(0, t.b);
  rim.addColorStop(0.45, t.a);
  rim.addColorStop(0.7, t.b);
  rim.addColorStop(1, t.a);
  ellipse(ctx, 0, 0, R, R);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = t.edge;
  ctx.stroke();
  // the well
  const inner = r === 'common' ? R - 10 : R - 18;
  const well = ctx.createRadialGradient(-50, -70, 20, 0, 0, inner + 10);
  if (r === 'common') {
    well.addColorStop(0, '#f0cf9c');
    well.addColorStop(0.7, t.b);
    well.addColorStop(1, t.a);
  } else if (r === 'rare') {
    well.addColorStop(0, '#ffffff');
    well.addColorStop(0.8, '#e4e9f0');
    well.addColorStop(1, '#a6b0bd');
  } else if (r === 'epic') {
    well.addColorStop(0, '#b98cff');
    well.addColorStop(0.75, '#7a3ae0');
    well.addColorStop(1, '#4a1a9a');
  } else {
    well.addColorStop(0, '#fff6c8');
    well.addColorStop(0.75, '#ffd25a');
    well.addColorStop(1, '#c88a10');
  }
  ellipse(ctx, 0, 0, inner, inner);
  ctx.fillStyle = well;
  ctx.fill();
  if (r === 'common') {
    // the board's grain: faint rings
    ctx.lineWidth = 3;
    for (let k = 1; k <= 5; k++) {
      ellipse(ctx, 6 * k - 15, 4 * k - 10, inner - 28 * k, inner - 30 * k);
      ctx.strokeStyle = `rgba(120, 70, 30, ${0.1 + 0.02 * k})`;
      ctx.stroke();
    }
  } else {
    // a fine line between rim and well
    ellipse(ctx, 0, 0, inner, inner);
    ctx.lineWidth = 4;
    ctx.strokeStyle = r === 'epic' ? '#ffe680' : rgba(t.edge, 0.45);
    ctx.stroke();
  }
}

/** Small preview used in the DOM menus. */
export function pizzaPortrait(p: PizzaType, top: HTMLCanvasElement, size = 160, alive: boolean[] = new Array(8).fill(true)): string {
  const [c, ctx] = makeCanvas(PIZZA_CANVAS_W, PIZZA_CANVAS_H + 60);
  // its plate, by its tier: a wooden board, a silver platter, a purple plate with a gold rim, a gold platter
  ctx.save();
  ctx.translate(PIZZA_CANVAS_W / 2, PIZZA_CANVAS_H / 2 + 26);
  ctx.scale(1, TILT);
  tierPlate(ctx, p.rarity ?? 'common');
  ctx.restore();
  const [pc, pctx] = makeCanvas(PIZZA_CANVAS_W, PIZZA_CANVAS_H);
  renderPizza(pctx, { type: p, top, alive, prints: [], shield: false });
  ctx.drawImage(pc, 0, 6);
  const k = size / c.width;
  const [o, octx] = makeCanvas(c.width * k, c.height * k);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}
