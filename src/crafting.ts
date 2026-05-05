import type { RecipeDef } from "./types";
import { addItem, countItem, removeItem } from "./inventory";
import type { InventoryState } from "./types";

export const RECIPES: Record<string, RecipeDef> = {
  /* ---------- Smelting (ore -> ingot) ---------- */
  smelt_iron_ingot: {
    id: "smelt_iron_ingot",
    name: "Smelt Iron Ingot",
    result: { itemId: "mat_iron_ingot", count: 1 },
    inputs: [{ itemId: "mat_iron_ore", count: 2 }],
    levelReq: 1,
  },
  smelt_steel_ingot: {
    id: "smelt_steel_ingot",
    name: "Smelt Steel Ingot",
    result: { itemId: "mat_steel_ingot", count: 1 },
    inputs: [
      { itemId: "mat_iron_ingot", count: 2 },
      { itemId: "mat_coal", count: 1 },
    ],
    levelReq: 5,
  },
  smelt_gold_ingot: {
    id: "smelt_gold_ingot",
    name: "Smelt Gold Ingot",
    result: { itemId: "mat_gold_ingot", count: 1 },
    inputs: [{ itemId: "mat_gold_ore", count: 2 }],
    levelReq: 5,
  },
  /* ---------- Parts (ingot -> part) ---------- */
  forge_iron_blade: {
    id: "forge_iron_blade",
    name: "Forge Iron Blade",
    result: { itemId: "part_iron_blade", count: 1 },
    inputs: [{ itemId: "mat_iron_ingot", count: 2 }],
    levelReq: 1,
  },
  forge_steel_blade: {
    id: "forge_steel_blade",
    name: "Forge Steel Blade",
    result: { itemId: "part_steel_blade", count: 1 },
    inputs: [{ itemId: "mat_steel_ingot", count: 2 }],
    levelReq: 5,
  },
  carve_wood_hilt: {
    id: "carve_wood_hilt",
    name: "Carve Wooden Hilt",
    result: { itemId: "part_hilt_wood", count: 1 },
    inputs: [{ itemId: "mat_wood_log", count: 1 }],
    levelReq: 1,
  },
  forge_steel_hilt: {
    id: "forge_steel_hilt",
    name: "Forge Steel Hilt",
    result: { itemId: "part_hilt_steel", count: 1 },
    inputs: [
      { itemId: "mat_steel_ingot", count: 1 },
      { itemId: "mat_wood_log", count: 1 },
    ],
    levelReq: 5,
  },
  forge_axe_head: {
    id: "forge_axe_head",
    name: "Forge Axe Head",
    result: { itemId: "part_axe_head", count: 1 },
    inputs: [{ itemId: "mat_steel_ingot", count: 2 }],
    levelReq: 5,
  },
  inscribe_staff_core: {
    id: "inscribe_staff_core",
    name: "Inscribe Runestone Core",
    result: { itemId: "part_staff_core", count: 1 },
    inputs: [
      { itemId: "mat_stone_block", count: 1 },
      { itemId: "mat_arcane_dust", count: 3 },
    ],
    levelReq: 4,
  },
  /* ---------- Weapons (parts -> weapon) ---------- */
  craft_iron_sword: {
    id: "craft_iron_sword",
    name: "Assemble Iron Sword",
    result: { itemId: "weapon_iron_sword", count: 1 },
    inputs: [
      { itemId: "part_iron_blade", count: 1 },
      { itemId: "part_hilt_wood", count: 1 },
    ],
    levelReq: 1,
    classRestriction: ["warrior", "rogue"],
  },
  craft_dagger: {
    id: "craft_dagger",
    name: "Assemble Steel Dagger",
    result: { itemId: "weapon_dagger", count: 1 },
    inputs: [
      { itemId: "part_iron_blade", count: 1 },
      { itemId: "part_hilt_wood", count: 1 },
    ],
    levelReq: 1,
    classRestriction: ["rogue", "warrior"],
  },
  craft_steel_axe: {
    id: "craft_steel_axe",
    name: "Assemble Steel Battleaxe",
    result: { itemId: "weapon_steel_axe", count: 1 },
    inputs: [
      { itemId: "part_axe_head", count: 1 },
      { itemId: "part_hilt_wood", count: 2 },
    ],
    levelReq: 5,
    classRestriction: ["warrior"],
  },
  craft_oak_staff: {
    id: "craft_oak_staff",
    name: "Assemble Oak Staff",
    result: { itemId: "weapon_oak_staff", count: 1 },
    inputs: [
      { itemId: "mat_wood_log", count: 4 },
      { itemId: "mat_arcane_dust", count: 2 },
    ],
    levelReq: 1,
    classRestriction: ["mage"],
  },
  craft_runic_staff: {
    id: "craft_runic_staff",
    name: "Assemble Runic Staff",
    result: { itemId: "weapon_runic_staff", count: 1 },
    inputs: [
      { itemId: "part_staff_core", count: 1 },
      { itemId: "mat_steel_ingot", count: 1 },
      { itemId: "mat_arcane_dust", count: 4 },
    ],
    levelReq: 12,
    classRestriction: ["mage"],
  },
  craft_shadow_blade: {
    id: "craft_shadow_blade",
    name: "Assemble Shadow Blade",
    result: { itemId: "weapon_shadow_blade", count: 1 },
    inputs: [
      { itemId: "part_steel_blade", count: 1 },
      { itemId: "part_hilt_steel", count: 1 },
      { itemId: "mat_shadow_essence", count: 2 },
    ],
    levelReq: 12,
    classRestriction: ["rogue"],
  },
  craft_titan_greatsword: {
    id: "craft_titan_greatsword",
    name: "Assemble Titan Greatsword",
    result: { itemId: "weapon_titan_greatsword", count: 1 },
    inputs: [
      { itemId: "part_steel_blade", count: 2 },
      { itemId: "part_hilt_steel", count: 1 },
      { itemId: "mat_dragon_scale", count: 1 },
    ],
    levelReq: 20,
    classRestriction: ["warrior"],
  },
  craft_chainmail: {
    id: "craft_chainmail",
    name: "Craft Chainmail",
    result: { itemId: "armor_chainmail", count: 1 },
    inputs: [
      { itemId: "mat_iron_ingot", count: 6 },
      { itemId: "mat_wolf_pelt", count: 2 },
    ],
    levelReq: 5,
  },
  craft_plate_armor: {
    id: "craft_plate_armor",
    name: "Craft Plate Armor",
    result: { itemId: "armor_plate", count: 1 },
    inputs: [
      { itemId: "mat_steel_ingot", count: 6 },
      { itemId: "mat_orc_tusk", count: 1 },
    ],
    levelReq: 12,
  },
  craft_leather_vest: {
    id: "craft_leather_vest",
    name: "Craft Leather Vest",
    result: { itemId: "armor_leather_vest", count: 1 },
    inputs: [{ itemId: "mat_wolf_pelt", count: 3 }],
    levelReq: 1,
  },
  craft_spirit_charge: {
    id: "craft_spirit_charge",
    name: "Brew Spirit Charge",
    result: { itemId: "charge_spirit", count: 5 },
    inputs: [
      { itemId: "mat_arcane_dust", count: 1 },
      { itemId: "mat_iron_ore", count: 1 },
    ],
    levelReq: 3,
  },
  craft_mana_charge: {
    id: "craft_mana_charge",
    name: "Brew Mana Charge",
    result: { itemId: "charge_mana", count: 5 },
    inputs: [
      { itemId: "mat_arcane_dust", count: 2 },
    ],
    levelReq: 3,
  },
  craft_minor_heal: {
    id: "craft_minor_heal",
    name: "Brew Minor Health Potion",
    result: { itemId: "pot_minor_heal", count: 2 },
    inputs: [
      { itemId: "mat_arcane_dust", count: 1 },
      { itemId: "mat_wolf_pelt", count: 1 },
    ],
    levelReq: 1,
  },
  craft_lootbox_common: {
    id: "craft_lootbox_common",
    name: "Assemble Wooden Cache",
    result: { itemId: "lootbox_common", count: 1 },
    inputs: [
      { itemId: "mat_wood_log", count: 4 },
      { itemId: "mat_iron_ingot", count: 1 },
    ],
    levelReq: 3,
  },
  craft_lootbox_rare: {
    id: "craft_lootbox_rare",
    name: "Assemble Iron Cache",
    result: { itemId: "lootbox_rare", count: 1 },
    inputs: [
      { itemId: "mat_iron_ingot", count: 5 },
      { itemId: "mat_arcane_dust", count: 3 },
    ],
    levelReq: 8,
  },
  craft_lootbox_epic: {
    id: "craft_lootbox_epic",
    name: "Assemble Gilded Cache",
    result: { itemId: "lootbox_epic", count: 1 },
    inputs: [
      { itemId: "mat_steel_ingot", count: 4 },
      { itemId: "mat_shadow_essence", count: 2 },
      { itemId: "mat_dragon_scale", count: 1 },
    ],
    levelReq: 15,
  },
};

export const RECIPE_LIST: RecipeDef[] = Object.values(RECIPES);

export function canCraft(
  inv: InventoryState,
  recipe: RecipeDef,
  level: number,
  classId: string,
): { ok: boolean; reason?: string } {
  if (level < recipe.levelReq) {
    return { ok: false, reason: `Requires Lv. ${recipe.levelReq}` };
  }
  if (
    recipe.classRestriction &&
    !recipe.classRestriction.includes(classId as never)
  ) {
    return { ok: false, reason: "Wrong class" };
  }
  for (const input of recipe.inputs) {
    if (countItem(inv, input.itemId) < input.count) {
      return { ok: false, reason: "Missing materials" };
    }
  }
  return { ok: true };
}

export function performCraft(
  inv: InventoryState,
  recipe: RecipeDef,
  level: number,
  classId: string,
): { ok: boolean; reason?: string } {
  const check = canCraft(inv, recipe, level, classId);
  if (!check.ok) return check;
  for (const input of recipe.inputs) {
    removeItem(inv, input.itemId, input.count);
  }
  const leftover = addItem(inv, recipe.result.itemId, recipe.result.count);
  if (leftover > 0) {
    // Inventory was full — refund.
    for (const input of recipe.inputs) {
      addItem(inv, input.itemId, input.count);
    }
    return { ok: false, reason: "Inventory full" };
  }
  return { ok: true };
}
