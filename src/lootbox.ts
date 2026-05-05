import type { LootboxDef, ItemDef } from "./types";
import { addItem } from "./inventory";
import type { InventoryState } from "./types";
import { getItem } from "./items";

export const LOOTBOXES: Record<string, LootboxDef> = {
  lootbox_common: {
    id: "lootbox_common",
    name: "Wooden Cache",
    rarity: "common",
    description: "Mostly common gear and crafting materials.",
    rolls: 2,
    drops: [
      { itemId: "mat_iron_ingot", weight: 25, count: [1, 3] },
      { itemId: "mat_wood_log", weight: 25, count: [1, 3] },
      { itemId: "mat_stone_block", weight: 25, count: [1, 3] },
      { itemId: "mat_wolf_pelt", weight: 14, count: [1, 2] },
      { itemId: "pot_minor_heal", weight: 8, count: [1, 2] },
      { itemId: "armor_leather_vest", weight: 2 },
      { itemId: "helmet_iron_cap", weight: 2 },
      { itemId: "ring_strength", weight: 1 },
    ],
  },
  lootbox_rare: {
    id: "lootbox_rare",
    name: "Iron Cache",
    rarity: "rare",
    description: "Better materials, frequent uncommons, occasional rares.",
    rolls: 3,
    drops: [
      { itemId: "mat_steel_ingot", weight: 22, count: [1, 3] },
      { itemId: "mat_arcane_dust", weight: 18, count: [1, 3] },
      { itemId: "mat_orc_tusk", weight: 12, count: [1, 2] },
      { itemId: "pot_greater_heal", weight: 12, count: [1, 2] },
      { itemId: "ring_mana", weight: 8 },
      { itemId: "ring_strength", weight: 8 },
      { itemId: "amulet_warding", weight: 8 },
      { itemId: "weapon_steel_axe", weight: 4 },
      { itemId: "armor_chainmail", weight: 4 },
      { itemId: "ring_vitality", weight: 2 },
      { itemId: "amulet_focus", weight: 2 },
    ],
  },
  lootbox_epic: {
    id: "lootbox_epic",
    name: "Gilded Cache",
    rarity: "epic",
    description: "Heroic spoils. Rare and epic loot guaranteed.",
    rolls: 3,
    drops: [
      { itemId: "mat_dragon_scale", weight: 12, count: [1, 1] },
      { itemId: "mat_shadow_essence", weight: 18, count: [1, 2] },
      { itemId: "mat_steel_ingot", weight: 16, count: [3, 6] },
      { itemId: "weapon_runic_staff", weight: 9 },
      { itemId: "weapon_shadow_blade", weight: 9 },
      { itemId: "armor_plate", weight: 9 },
      { itemId: "helmet_great_helm", weight: 9 },
      { itemId: "ring_vitality", weight: 7 },
      { itemId: "amulet_focus", weight: 7 },
      { itemId: "weapon_titan_greatsword", weight: 4 },
    ],
  },
};

export const LOOTBOX_LIST: LootboxDef[] = Object.values(LOOTBOXES);

export function getLootbox(id: string): LootboxDef | null {
  return LOOTBOXES[id] ?? null;
}

function rollOne(
  drops: LootboxDef["drops"],
  rng: () => number,
): { itemId: string; count: number } {
  const totalWeight = drops.reduce((s, d) => s + d.weight, 0);
  let r = rng() * totalWeight;
  for (const d of drops) {
    r -= d.weight;
    if (r <= 0) {
      const min = d.count?.[0] ?? 1;
      const max = d.count?.[1] ?? 1;
      const count = Math.floor(rng() * (max - min + 1)) + min;
      return { itemId: d.itemId, count };
    }
  }
  // Fallback (shouldn't happen).
  const last = drops[drops.length - 1];
  return { itemId: last.itemId, count: last.count?.[0] ?? 1 };
}

export function openLootbox(
  inv: InventoryState,
  lootboxId: string,
  rng: () => number = Math.random,
): { rewards: { def: ItemDef; count: number }[]; reason?: string } {
  const box = getLootbox(lootboxId);
  if (!box) return { rewards: [], reason: "Unknown lootbox" };
  const rewards: { def: ItemDef; count: number }[] = [];
  for (let i = 0; i < box.rolls; i++) {
    const roll = rollOne(box.drops, rng);
    const def = getItem(roll.itemId);
    if (!def) continue;
    const leftover = addItem(inv, roll.itemId, roll.count);
    rewards.push({ def, count: roll.count - leftover });
    if (leftover > 0) {
      return { rewards, reason: "Inventory full" };
    }
  }
  return { rewards };
}
