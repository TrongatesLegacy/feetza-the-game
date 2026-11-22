// Graphics settings: a quality preset (Low, Medium, High) that sets the individual switches, which can also be set
// one by one (the preset then reads Custom). Each switch is read where its effect is made:
// - animFeet: the redrawn feet's live layers (src/game/liveKit.ts, the Immortals' in src/game/footLive.ts). Off, a
//   foot shows its still art (the same picture its peel and portrait use) and only moves as a whole.
// - animBackdrops: the stages' ambient life (src/game/liveBackdrop.ts).
// - animPeels: the peels' own animation (looks and moving foot peels).

import { save, updateSettings, type Settings } from './save';

export type GraphicsPreset = 'low' | 'medium' | 'high';
type Switches = Pick<Settings, 'animFeet' | 'animBackdrops' | 'animPeels'>;

export const PRESETS: Record<GraphicsPreset, Switches> = {
  low: { animFeet: false, animBackdrops: false, animPeels: false },
  medium: { animFeet: true, animBackdrops: false, animPeels: false },
  high: { animFeet: true, animBackdrops: true, animPeels: true },
};

/** The preset the current switches match, or 'custom'. */
export function currentPreset(): GraphicsPreset | 'custom' {
  const s = save.settings;
  for (const [k, p] of Object.entries(PRESETS) as [GraphicsPreset, Switches][]) if (p.animFeet === s.animFeet && p.animBackdrops === s.animBackdrops && p.animPeels === s.animPeels) return k;
  return 'custom';
}

export function applyPreset(p: GraphicsPreset): void {
  updateSettings({ ...PRESETS[p] });
}

/** A dev view can force the feet's animation on or off (null follows the setting). */
let feetOverride: boolean | null = null;
export function overrideFeetAnim(on: boolean | null): void {
  feetOverride = on;
}

export const feetAnimated = (): boolean => feetOverride ?? save.settings.animFeet !== false;
/** A dev view can force the stages' animation on or off too (null follows the setting). */
let backdropOverride: boolean | null = null;
export function overrideBackdropAnim(on: boolean | null): void {
  backdropOverride = on;
}

export const backdropsAnimated = (): boolean => backdropOverride ?? save.settings.animBackdrops !== false;
export const peelsAnimated = (): boolean => save.settings.animPeels !== false;
