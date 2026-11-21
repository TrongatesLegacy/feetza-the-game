// Run state for the event, mixed, shop and wildcard toppings: saved with the run (RunSnapshot.kit),
// so a resumed run keeps its crumbs, once-per-run uses and the shop's deals.

import type { EventId } from './events';

/** One shop's deals: reset whenever a new shop opens. */
export interface KitShop {
  /** Toppings bought in this shop (Bulk Buy, Haggler). */
  bought: number;
  /** Clearance Rack's half-price card. */
  clearance: string | null;
  /** Stockroom Key: the restock is spent. */
  restocked: boolean;
}

export interface KitState {
  /** Crust Crumbs towards the next Golden Crust. */
  crumbs: number;
  /** Ten-wave block (Math.floor(wave / 10)) Free Lunch and Bottomless Pizza were last used in; -1 never. */
  freeLunchAt: number;
  bottomlessAt: number;
  freeDeliveryUsed: boolean;
  /** Buy One Get One: waiting for the next topping that levels up, then spent. */
  bogo: 'none' | 'ready' | 'used';
  secondOvenUsed: boolean;
  /** A bought Pick or Peel Roulette whose choice hasn't been made (Next Wave waits for it), and what it cost. */
  pendingPick: { id: string; paid: number } | null;
  /** Golden Crusts Shiny Hunter has paid this run. */
  shinyCrusts: number;
  /** Rainbow Road's guaranteed shiny has turned up. */
  rainbowDone: boolean;
  /** Second Look: a missed event to bring back next wave (each one comes back once). */
  retry: EventId | null;
  shop: KitShop;
}

export function freshKitShop(): KitShop {
  return { bought: 0, clearance: null, restocked: false };
}

export function freshKitState(): KitState {
  return { crumbs: 0, freeLunchAt: -1, bottomlessAt: -1, freeDeliveryUsed: false, bogo: 'none', secondOvenUsed: false, pendingPick: null, shinyCrusts: 0, rainbowDone: false, retry: null, shop: freshKitShop() };
}

/** Old saves (and dev scenarios) have no kit: fill in what's missing. */
export function loadKitState(s: Partial<KitState> | undefined): KitState {
  const k = { ...freshKitState(), ...(s ?? {}) };
  k.shop = { ...freshKitShop(), ...(s?.shop ?? {}) };
  return k;
}

/** Free Lunch and Bottomless Pizza work once in every ten waves (an act of the 100-wave journey). */
export const DEAL_BLOCK = 10;
