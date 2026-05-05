import { getItem } from "./items";
import type {
  EquipSlot,
  Equipment,
  InventoryState,
  ItemDef,
  Stats,
} from "./types";

export const INVENTORY_SIZE = 30;

export function newInventory(): InventoryState {
  return {
    bag: Array(INVENTORY_SIZE).fill(null),
    equipment: emptyEquipment(),
    size: INVENTORY_SIZE,
  };
}

export function emptyEquipment(): Equipment {
  return {
    weapon: null,
    armor: null,
    helmet: null,
    gloves: null,
    boots: null,
    ring: null,
    amulet: null,
  };
}

export function countItem(inv: InventoryState, itemId: string): number {
  let total = 0;
  for (const s of inv.bag) {
    if (s && s.itemId === itemId) total += s.count;
  }
  return total;
}

/**
 * Add `count` of an item. Stacks where possible. Returns leftover count
 * that did not fit (0 if everything fit).
 */
export function addItem(
  inv: InventoryState,
  itemId: string,
  count = 1,
): number {
  const def = getItem(itemId);
  if (!def) return count;
  let remaining = count;

  if (def.stack > 1) {
    for (const stack of inv.bag) {
      if (!stack || stack.itemId !== itemId) continue;
      const room = def.stack - stack.count;
      if (room <= 0) continue;
      const add = Math.min(room, remaining);
      stack.count += add;
      remaining -= add;
      if (remaining <= 0) return 0;
    }
  }

  for (let i = 0; i < inv.bag.length && remaining > 0; i++) {
    if (inv.bag[i]) continue;
    const add = Math.min(def.stack, remaining);
    inv.bag[i] = { itemId, count: add };
    remaining -= add;
  }

  return remaining;
}

/**
 * Remove `count` of itemId from the bag (no equipment). Returns true if
 * the full count was removed.
 */
export function removeItem(
  inv: InventoryState,
  itemId: string,
  count = 1,
): boolean {
  if (countItem(inv, itemId) < count) return false;
  let remaining = count;
  for (let i = 0; i < inv.bag.length && remaining > 0; i++) {
    const s = inv.bag[i];
    if (!s || s.itemId !== itemId) continue;
    const take = Math.min(s.count, remaining);
    s.count -= take;
    remaining -= take;
    if (s.count <= 0) inv.bag[i] = null;
  }
  return true;
}

/**
 * Equip the item from a bag slot. Swaps out any item currently in that
 * equipment slot. Returns true if equipped.
 */
export function equipFromBag(
  inv: InventoryState,
  bagIndex: number,
): boolean {
  const stack = inv.bag[bagIndex];
  if (!stack) return false;
  const def = getItem(stack.itemId);
  if (!def || !def.equip) return false;
  const slot = def.equip.slot;
  const previous = inv.equipment[slot];
  inv.equipment[slot] = stack.itemId;
  // Consume one from the bag stack.
  stack.count -= 1;
  if (stack.count <= 0) inv.bag[bagIndex] = null;
  if (previous) {
    addItem(inv, previous, 1);
  }
  return true;
}

/** Move equipped item back into the bag. */
export function unequip(
  inv: InventoryState,
  slot: EquipSlot,
): boolean {
  const id = inv.equipment[slot];
  if (!id) return false;
  inv.equipment[slot] = null;
  const leftover = addItem(inv, id, 1);
  if (leftover > 0) {
    // No room — re-equip.
    inv.equipment[slot] = id;
    return false;
  }
  return true;
}

/** Sum up the stat bonuses from currently-equipped items. */
export function equipmentBonuses(inv: InventoryState): Partial<Stats> {
  const bonus: Partial<Stats> = {};
  for (const slot of Object.keys(inv.equipment) as EquipSlot[]) {
    const id = inv.equipment[slot];
    if (!id) continue;
    const def = getItem(id);
    if (!def?.equip) continue;
    for (const k of Object.keys(def.equip.bonus) as (keyof Stats)[]) {
      const v = def.equip.bonus[k];
      if (typeof v !== "number") continue;
      bonus[k] = (bonus[k] ?? 0) + v;
    }
  }
  return bonus;
}

export function canEquip(
  def: ItemDef,
  classId: string,
  raceId: string,
  level: number,
): { ok: boolean; reason?: string } {
  if (!def.equip) return { ok: false, reason: "Not equippable" };
  if (def.levelReq && level < def.levelReq) {
    return { ok: false, reason: `Requires Lv. ${def.levelReq}` };
  }
  if (def.classRestriction && !def.classRestriction.includes(classId as never)) {
    return { ok: false, reason: "Wrong class" };
  }
  if (def.raceRestriction && !def.raceRestriction.includes(raceId as never)) {
    return { ok: false, reason: "Wrong race" };
  }
  return { ok: true };
}
