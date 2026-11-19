// Extra pizza toppings (second menu wave). Drawn centred at the origin, already rotated.

import type { Topping } from '../data/pizzas';
import { type Ctx, blob, ellipse, rgba, roundRect, shade } from './util';

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.5): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, -0.6);
  ctx.fill();
}

/** Returns false when the topping isn't one of the extras. */
export function drawExtraTopping(ctx: Ctx, t: Topping, rand: () => number): boolean {
  switch (t) {
    case 'garlic': {
      ellipse(ctx, 0, 0, 9, 6);
      ctx.fillStyle = '#f7efd6';
      ctx.fill();
      ctx.strokeStyle = '#c9a86a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = rgba('#d9b35a', 0.8);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.stroke();
      ctx.fillStyle = rgba('#b8742c', 0.5);
      ellipse(ctx, 6, 2, 3, 2);
      ctx.fill();
      return true;
    }
    case 'artichoke': {
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(-0.9 + i * 0.45);
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.quadraticCurveTo(-8, -8, 0, -18);
        ctx.quadraticCurveTo(8, -8, 0, 6);
        ctx.fillStyle = i % 2 ? '#9db86a' : '#b6c98a';
        ctx.fill();
        ctx.strokeStyle = '#5a6e32';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      ellipse(ctx, 0, 6, 8, 5);
      ctx.fillStyle = '#e4e2b0';
      ctx.fill();
      return true;
    }
    case 'prosciutto': {
      ctx.beginPath();
      ctx.moveTo(-28, -4);
      ctx.bezierCurveTo(-14, -18, -2, 8, 10, -10);
      ctx.bezierCurveTo(18, -18, 26, -6, 30, 0);
      ctx.bezierCurveTo(22, 12, 12, 2, 2, 14);
      ctx.bezierCurveTo(-8, 22, -20, 6, -28, 10);
      ctx.closePath();
      ctx.fillStyle = rgba('#e46f74', 0.92);
      ctx.fill();
      ctx.strokeStyle = rgba('#9a2f38', 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff2ee', 0.85);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-24, 6);
      ctx.bezierCurveTo(-12, -6, 4, 12, 24, -2);
      ctx.stroke();
      shine(ctx, -6, -4, 8, 2.5, 0.35);
      return true;
    }
    case 'egg': {
      ctx.fillStyle = rgba('#000', 0.15);
      blob(ctx, 2, 3, 30, 0.35, rand, 10);
      ctx.fill();
      blob(ctx, 0, 0, 30, 0.35, rand, 10);
      const g = ctx.createRadialGradient(-6, -6, 4, 0, 0, 32);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#efe6d2');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = rgba('#c88a3a', 0.4);
      blob(ctx, 12, 14, 7, 0.6, rand, 7);
      ctx.fill();
      ellipse(ctx, 0, 0, 12, 12);
      const y = ctx.createRadialGradient(-4, -4, 1, 0, 0, 13);
      y.addColorStop(0, '#ffe680');
      y.addColorStop(0.7, '#ffb21c');
      y.addColorStop(1, '#e08a00');
      ctx.fillStyle = y;
      ctx.fill();
      shine(ctx, -4, -5, 4, 2, 0.8);
      return true;
    }
    case 'shrimp': {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#a8401f';
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0.3, Math.PI * 1.55);
      ctx.stroke();
      ctx.strokeStyle = '#ff8a5c';
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffd9c2', 0.8);
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = 0.5 + i * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.stroke();
      }
      ctx.fillStyle = '#c2401f';
      ctx.beginPath();
      ctx.moveTo(13, 6);
      ctx.lineTo(22, 2);
      ctx.lineTo(20, 12);
      ctx.closePath();
      ctx.fill();
      return true;
    }
    case 'mussel': {
      ellipse(ctx, 0, 0, 16, 10);
      const g = ctx.createLinearGradient(-16, -10, 16, 10);
      g.addColorStop(0, '#3a4a6a');
      g.addColorStop(1, '#0d1220');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#05080f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ellipse(ctx, 1, 0, 10, 6);
      ctx.fillStyle = '#f2a65a';
      ctx.fill();
      shine(ctx, -8, -5, 5, 1.5, 0.6);
      return true;
    }
    case 'squid': {
      ellipse(ctx, 0, 0, 12, 10);
      ctx.strokeStyle = '#c99a8a';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = '#fff4ee';
      ctx.lineWidth = 4.5;
      ctx.stroke();
      return true;
    }
    case 'lettuce': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i % 2 ? '#8fd14f' : '#c9ef8a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const y = (i - 1) * 6;
        ctx.moveTo(-14, y);
        ctx.quadraticCurveTo(0, y + (rand() - 0.5) * 14, 14, y + (rand() - 0.5) * 6);
        ctx.stroke();
      }
      return true;
    }
    case 'nacho': {
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(16, 12);
      ctx.lineTo(-16, 12);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -18, 0, 12);
      g.addColorStop(0, '#ffd45a');
      g.addColorStop(1, '#e09a2a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#9a5e12';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = rgba('#9a5e12', 0.5);
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, (rand() - 0.5) * 12, rand() * 14 - 4, 1.5, 1.5);
        ctx.fill();
      }
      return true;
    }
    case 'feta': {
      roundRect(ctx, -8, -7, 16, 14, 3);
      ctx.fillStyle = '#fbfaf3';
      ctx.fill();
      ctx.strokeStyle = '#cfc9b0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = rgba('#cfc9b0', 0.8);
      ellipse(ctx, 3, 2, 1.5, 1.5);
      ctx.fill();
      return true;
    }
    case 'spinach': {
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.quadraticCurveTo(-6, -18, 18, -4);
      ctx.quadraticCurveTo(4, 16, -20, 0);
      const g = ctx.createLinearGradient(0, -14, 0, 12);
      g.addColorStop(0, '#3e8a2a');
      g.addColorStop(1, '#1f4d14');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#a6d97a', 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(16, -3);
      ctx.stroke();
      return true;
    }
    case 'marshmallow': {
      ctx.fillStyle = rgba('#000', 0.15);
      roundRect(ctx, -10, -8, 22, 20, 7);
      ctx.fill();
      roundRect(ctx, -12, -10, 22, 20, 7);
      const g = ctx.createRadialGradient(-2, -2, 2, 0, 0, 16);
      g.addColorStop(0, '#d98a3a');
      g.addColorStop(0.45, '#f5d6a8');
      g.addColorStop(1, '#fffaf2');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#d9c3a4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return true;
    }
    case 'sprinkles': {
      const cols = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#b06bff', '#ffffff'];
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = cols[i % cols.length];
        const x = (rand() - 0.5) * 24;
        const y = (rand() - 0.5) * 24;
        const a = rand() * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4);
        ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
        ctx.stroke();
      }
      return true;
    }
    case 'potato': {
      ellipse(ctx, 0, 0, 20, 17);
      const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 20);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.75, '#f0d27a');
      g.addColorStop(1, '#c4862a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#8a5a1a', 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();
      shine(ctx, -6, -6, 6, 2, 0.4);
      return true;
    }
    case 'rosemary': {
      ctx.strokeStyle = '#3d5a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
      ctx.strokeStyle = '#4f7a35';
      ctx.lineWidth = 2.5;
      for (let i = -16; i <= 16; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 3, -7);
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 3, 7);
        ctx.stroke();
      }
      return true;
    }
    case 'cheddar': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i ? '#ffa62b' : '#e88a12';
        ctx.lineWidth = 4;
        const a = rand() * Math.PI;
        const x = (rand() - 0.5) * 12;
        const y = (rand() - 0.5) * 12;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9);
        ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
        ctx.stroke();
      }
      return true;
    }
    case 'beef': {
      blob(ctx, 0, 0, 7, 0.7, rand, 7);
      ctx.fillStyle = '#6a3a22';
      ctx.fill();
      ctx.strokeStyle = '#3a1a0a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = rgba('#b07a52', 0.6);
      ellipse(ctx, -2, -2, 2, 1.4);
      ctx.fill();
      return true;
    }
    case 'hotSauce':
    case 'redStripes':
      return true; // drawn as drizzles elsewhere
    default:
      return false;
  }
}

/** Sauce drizzles that span the whole pizza. */
export function drawDrizzles(ctx: Ctx, toppings: Topping[], size: number): void {
  if (toppings.includes('hotSauce')) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#7a1a06', 0.85);
    ctx.lineWidth = 7;
    for (let i = 0; i < 5; i++) {
      const x = size * 0.22 + i * size * 0.14;
      ctx.beginPath();
      ctx.moveTo(x, size * 0.2);
      for (let y = size * 0.2; y <= size * 0.8; y += 20) ctx.lineTo(x + Math.sin(y * 0.06 + i) * 14, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ff5a1f';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const x = size * 0.22 + i * size * 0.14;
      ctx.beginPath();
      ctx.moveTo(x, size * 0.2);
      for (let y = size * 0.2; y <= size * 0.8; y += 20) ctx.lineTo(x + Math.sin(y * 0.06 + i) * 14, y);
      ctx.stroke();
    }
  }
  if (toppings.includes('redStripes')) {
    for (const y of [size * 0.36, size * 0.64]) {
      ctx.fillStyle = shade('#c22f1c', -0.05);
      ctx.beginPath();
      ctx.moveTo(size * 0.12, y - 22);
      for (let x = size * 0.12; x <= size * 0.88; x += 16) ctx.lineTo(x, y - 22 + Math.sin(x * 0.11) * 5);
      for (let x = size * 0.88; x >= size * 0.12; x -= 16) ctx.lineTo(x, y + 22 + Math.cos(x * 0.13) * 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#ff8a6a', 0.35);
      ctx.fillRect(size * 0.14, y - 12, size * 0.72, 5);
    }
  }
}

export const EXTRA_COUNTS: Partial<Record<Topping, number>> = {
  garlic: 16, artichoke: 8, prosciutto: 7, egg: 3, shrimp: 9, mussel: 7, squid: 9, lettuce: 12, nacho: 8, feta: 14,
  spinach: 10, marshmallow: 12, sprinkles: 30, potato: 13, rosemary: 9, cheddar: 22, beef: 26,
};

export const EXTRA_ORDER: Topping[] = [
  'potato', 'egg', 'prosciutto', 'beef', 'spinach', 'artichoke', 'shrimp', 'mussel', 'squid', 'garlic', 'feta',
  'marshmallow', 'cheddar', 'lettuce', 'nacho', 'rosemary', 'sprinkles',
];
