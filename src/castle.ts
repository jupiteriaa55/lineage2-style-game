import type { CastleState } from "./types";

export const SIEGE_INTERVAL_MS = 7 * 60 * 1000;
export const SIEGE_DURATION_MS = 90 * 1000;
export const TAX_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const CASTLE_HP_MAX = 1500;

export function newCastleState(): CastleState {
  return {
    control: "garrison",
    controllerName: "Garrison of the Crown",
    hp: CASTLE_HP_MAX,
    hpMax: CASTLE_HP_MAX,
    nextSiegeAt: Date.now() + 90 * 1000,
    lastTaxAt: Date.now(),
    unpaidTax: 0,
  };
}

/** Per-frame castle bookkeeping. Returns gold paid out (if any). */
export function tickCastle(
  state: CastleState,
  dailyTax: number,
  now: number = Date.now(),
): { taxPaid: number } {
  let taxPaid = 0;
  if (state.control === "player") {
    const elapsed = now - state.lastTaxAt;
    if (elapsed >= TAX_INTERVAL_MS) {
      const cycles = Math.floor(elapsed / TAX_INTERVAL_MS);
      taxPaid = cycles * dailyTax;
      state.lastTaxAt += cycles * TAX_INTERVAL_MS;
    }
  }
  return { taxPaid };
}

export function startSiege(state: CastleState, now: number = Date.now()): void {
  state.hp = state.hpMax;
  state.nextSiegeAt = now + SIEGE_DURATION_MS;
}

export function captureCastle(state: CastleState, name: string): void {
  state.control = "player";
  state.controllerName = name;
  state.hp = state.hpMax;
  state.lastTaxAt = Date.now();
  state.nextSiegeAt = Date.now() + SIEGE_INTERVAL_MS;
  state.unpaidTax = 0;
}

export function damageCastle(state: CastleState, amount: number): boolean {
  state.hp = Math.max(0, state.hp - amount);
  return state.hp <= 0;
}
