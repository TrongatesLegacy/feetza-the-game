// The small typed names on a topping (Upgrade, src/data/upgrades.ts): how it's held, what happens when it's picked,
// what meter it needs. A leaf module (it imports nothing), so every topping file can import it while upgrades.ts is
// still loading.

/** How a topping is held: permanent (the default) levels and stacks; unique is once per run; consumable is one use,
 *  back after a cooldown. */
export const UpgradeKind = { Permanent: 'permanent', Unique: 'unique', Consumable: 'consumable' } as const;
export type UpgradeKind = (typeof UpgradeKind)[keyof typeof UpgradeKind];

/** Waves a used consumable stays out of the shop. */
export const CONSUMABLE_COOLDOWN = 3;

/** What a kind is called on a card: its tag (top corner) and, for the ones that don't level, the level line. */
export const UPGRADE_KIND_DEFS: Record<UpgradeKind, { tag: string; line?: string }> = {
  permanent: { tag: 'PERMANENT' },
  unique: { tag: 'ONCE PER RUN', line: 'Once per run' },
  consumable: { tag: 'ONE USE', line: `One use, back in ${CONSUMABLE_COOLDOWN} waves` },
};

/** What happens the moment a topping is picked (src/scenes/GameScene.ts applyUpgrade). Arm: a consumable that waits
 *  to trigger. */
export const OnPick = {
  HealAll2: 'healAll2',
  ExtraPizza: 'extraPizza',
  Fridge: 'fridge',
  Arm: 'arm',
  Pick: 'pick',
  Roulette: 'roulette',
  Crispy: 'crispy',
  Bogo: 'bogo',
} as const;
export type OnPick = (typeof OnPick)[keyof typeof OnPick];

/** What else a topping needs to be offered: the Peel Slam itself (Freeze Frame changes the Slam), or freshness (it does
 *  nothing where freshness is off, on Mild). Run.offerable reads it. */
export const Needs = { Slam: 'slam', Freshness: 'freshness' } as const;
export type Needs = (typeof Needs)[keyof typeof Needs];

/** Meter: only offered when the peel's meter (or timer) can be sped up. Tank: only when the wave-start meter matters. */
export const NeedsMeter = { Meter: 'meter', Tank: 'tank' } as const;
export type NeedsMeter = (typeof NeedsMeter)[keyof typeof NeedsMeter];

