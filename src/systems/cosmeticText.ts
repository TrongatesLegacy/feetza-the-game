// Phaser gives every Text and TileSprite a texture key of its own (Phaser.Utils.String.UUID), and the key draws 31
// numbers from Math.random: a damage number or a quip made when Fx's text pool happened to be empty took 31 numbers
// out of the game's seeded sequence, so a look moved every gameplay roll after it (docs/effects-plan.md, "The balance
// sim repeats itself"). Every way of making one (scene.add.text / tileSprite, scene.make.text / tileSprite) runs under
// cosmetic(): the key's numbers come from the cosmetic generator, and visual text never moves gameplay rolls.
// (No game code constructs a Text or TileSprite with `new`; the factories are the only way in.)

import Phaser from 'phaser';
import { cosmetic } from './cosmeticRandom';

type Maker = (this: unknown, ...args: unknown[]) => unknown;

function wrap(proto: object, name: string): void {
  const p = proto as Record<string, Maker>;
  const orig = p[name];
  if (typeof orig !== 'function' || (orig as { cosmeticKey?: boolean }).cosmeticKey) return;
  const wrapped: Maker = function (this: unknown, ...args: unknown[]) {
    return cosmetic(() => orig.apply(this, args));
  };
  (wrapped as { cosmeticKey?: boolean }).cosmeticKey = true;
  p[name] = wrapped;
}

/** Make every Text and TileSprite draw its texture key from the cosmetic generator. Called once, before the game boots. */
export function installCosmeticKeys(): void {
  for (const proto of [Phaser.GameObjects.GameObjectFactory.prototype, Phaser.GameObjects.GameObjectCreator.prototype]) {
    wrap(proto, 'text');
    wrap(proto, 'tileSprite');
  }
}
