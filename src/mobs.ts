import type { MobTemplate } from "./types";

/**
 * 8 mob templates spread across 4 biomes (2 per biome). Each mob has its
 * own visual color, scale and drop table. `mesh` describes the
 * procedural body type used by entities.ts when there is no specific
 * GLB asset (the player + orc race already use real GLBs).
 */
export const MOBS: Record<string, MobTemplate> = {
  /* ---------------- Forest ---------------- */
  wolf: {
    id: "wolf",
    name: "Grey Wolf",
    biome: "forest",
    level: 2,
    mesh: "quadruped",
    palette: { primary: 0x807060, accent: 0x5a4a3a },
    scale: 0.85,
    stats: { hpMax: 60, attack: 10, defense: 1, attackRange: 1.6, attackSpeed: 1.0 },
    xp: 14,
    drops: [
      { itemId: "mat_wolf_pelt", chance: 0.7, count: [1, 2] },
      { itemId: "pot_minor_heal", chance: 0.1 },
    ],
    lootboxChance: { id: "lootbox_common", chance: 0.04 },
  },
  goblin: {
    id: "goblin",
    name: "Forest Goblin",
    biome: "forest",
    level: 4,
    mesh: "humanoid",
    palette: { primary: 0x6f9a5a, accent: 0x44603b, cloth: 0x884c2a },
    scale: 0.75,
    stats: { hpMax: 80, attack: 14, defense: 2, attackRange: 1.8, attackSpeed: 1.4 },
    xp: 22,
    drops: [
      { itemId: "mat_goblin_ear", chance: 0.85 },
      { itemId: "mat_iron_ore", chance: 0.4 },
      { itemId: "mat_wood_log", chance: 0.6 },
    ],
    lootboxChance: { id: "lootbox_common", chance: 0.07 },
  },

  /* ---------------- Wasteland ---------------- */
  goblin_raider: {
    id: "goblin_raider",
    name: "Wasteland Raider",
    biome: "wasteland",
    level: 7,
    mesh: "humanoid",
    palette: { primary: 0x8d6b4a, accent: 0x5a3f25, cloth: 0x55372a },
    scale: 0.85,
    stats: { hpMax: 130, attack: 22, defense: 4, attackRange: 1.8, attackSpeed: 1.3 },
    xp: 50,
    drops: [
      { itemId: "mat_iron_ore", chance: 0.7, count: [1, 3] },
      { itemId: "mat_coal", chance: 0.4 },
      { itemId: "mat_iron_ingot", chance: 0.15 },
      { itemId: "charge_spirit", chance: 0.1, count: [1, 2] },
    ],
    lootboxChance: { id: "lootbox_common", chance: 0.1 },
  },
  ash_imp: {
    id: "ash_imp",
    name: "Ash Imp",
    biome: "wasteland",
    level: 10,
    mesh: "humanoid",
    palette: { primary: 0xc05540, accent: 0x6a1e10, cloth: 0x000000 },
    scale: 0.7,
    stats: { hpMax: 110, attack: 28, defense: 3, attackRange: 5.5, attackSpeed: 1.6 },
    xp: 70,
    drops: [
      { itemId: "mat_arcane_dust", chance: 0.85, count: [1, 3] },
      { itemId: "charge_mana", chance: 0.2, count: [1, 2] },
    ],
    lootboxChance: { id: "lootbox_rare", chance: 0.05 },
  },

  /* ---------------- Mountains ---------------- */
  stone_troll: {
    id: "stone_troll",
    name: "Stone Troll",
    biome: "mountains",
    level: 13,
    mesh: "humanoid",
    palette: { primary: 0x7c7c80, accent: 0x4a4a4d },
    scale: 1.4,
    stats: { hpMax: 320, attack: 40, defense: 12, attackRange: 2.4, attackSpeed: 1.8 },
    xp: 130,
    drops: [
      { itemId: "mat_stone_block", chance: 0.95, count: [2, 5] },
      { itemId: "mat_iron_ore", chance: 0.6, count: [1, 4] },
      { itemId: "part_axe_head", chance: 0.07 },
      { itemId: "mat_orc_tusk", chance: 0.18 },
    ],
    lootboxChance: { id: "lootbox_rare", chance: 0.12 },
  },
  frost_bear: {
    id: "frost_bear",
    name: "Frost Bear",
    biome: "mountains",
    level: 16,
    mesh: "quadruped",
    palette: { primary: 0xd6e2ec, accent: 0x9aaab8 },
    scale: 1.3,
    stats: { hpMax: 360, attack: 46, defense: 8, attackRange: 1.8, attackSpeed: 1.4 },
    xp: 160,
    drops: [
      { itemId: "mat_wolf_pelt", chance: 0.95, count: [2, 4] },
      { itemId: "pot_greater_heal", chance: 0.3 },
      { itemId: "ring_vitality", chance: 0.04 },
    ],
    lootboxChance: { id: "lootbox_rare", chance: 0.18 },
  },

  /* ---------------- Graveyard ---------------- */
  skeleton: {
    id: "skeleton",
    name: "Risen Skeleton",
    biome: "graveyard",
    level: 17,
    mesh: "humanoid",
    palette: { primary: 0xe8e4d0, accent: 0x9a9482, cloth: 0x4a4544 },
    scale: 1.0,
    stats: { hpMax: 280, attack: 42, defense: 6, attackRange: 2.0, attackSpeed: 1.3 },
    xp: 165,
    drops: [
      { itemId: "mat_arcane_dust", chance: 0.6, count: [1, 3] },
      { itemId: "mat_shadow_essence", chance: 0.18 },
      { itemId: "part_iron_blade", chance: 0.2 },
      { itemId: "amulet_warding", chance: 0.05 },
    ],
    lootboxChance: { id: "lootbox_rare", chance: 0.16 },
  },
  wraith: {
    id: "wraith",
    name: "Hollowmoor Wraith",
    biome: "graveyard",
    level: 21,
    mesh: "humanoid",
    palette: { primary: 0x6a6f8a, accent: 0x2a2c3a, cloth: 0x111122 },
    scale: 1.05,
    stats: { hpMax: 460, attack: 58, defense: 10, attackRange: 6.0, attackSpeed: 1.5 },
    xp: 240,
    drops: [
      { itemId: "mat_shadow_essence", chance: 0.85, count: [1, 2] },
      { itemId: "mat_dragon_scale", chance: 0.05 },
      { itemId: "weapon_shadow_blade", chance: 0.02 },
      { itemId: "amulet_focus", chance: 0.05 },
    ],
    lootboxChance: { id: "lootbox_epic", chance: 0.08 },
  },
};

export const MOB_LIST: MobTemplate[] = Object.values(MOBS);

export function getMob(id: string): MobTemplate | null {
  return MOBS[id] ?? null;
}
