export type ItemKind = "material" | "consumable" | "equipment";

export interface ItemEffect {
  hp?: number;
  mp?: number;
  /** flat permanent stat boost when used (equipment) */
  attackBonus?: number;
  defenseBonus?: number;
  hpMaxBonus?: number;
  mpMaxBonus?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  kind: ItemKind;
  /** max stack size (1 for unique items) */
  stack: number;
  description: string;
  effect?: ItemEffect;
  /** value in gold (used by future shops) */
  value?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  // --- materials ---
  goblin_tooth: {
    id: "goblin_tooth",
    name: "Goblin Tooth",
    icon: "🦷",
    kind: "material",
    stack: 99,
    description: "A sharp tooth pried from a goblin. Useful for trinkets.",
    value: 4,
  },
  wolf_pelt: {
    id: "wolf_pelt",
    name: "Wolf Pelt",
    icon: "🐺",
    kind: "material",
    stack: 99,
    description: "A coarse pelt. Good for leather goods.",
    value: 8,
  },
  orc_horn: {
    id: "orc_horn",
    name: "Orc Horn",
    icon: "🐂",
    kind: "material",
    stack: 99,
    description: "A heavy horn taken from an orc raider.",
    value: 14,
  },
  iron_ore: {
    id: "iron_ore",
    name: "Iron Ore",
    icon: "⛏",
    kind: "material",
    stack: 99,
    description: "Raw iron used in crafting.",
    value: 6,
  },
  rune_dust: {
    id: "rune_dust",
    name: "Rune Dust",
    icon: "✨",
    kind: "material",
    stack: 99,
    description: "Magical residue used by alchemists.",
    value: 10,
  },

  // --- consumables ---
  potion_hp: {
    id: "potion_hp",
    name: "Health Potion",
    icon: "🧪",
    kind: "consumable",
    stack: 20,
    description: "Restores 80 HP.",
    effect: { hp: 80 },
    value: 25,
  },
  potion_mp: {
    id: "potion_mp",
    name: "Mana Potion",
    icon: "💙",
    kind: "consumable",
    stack: 20,
    description: "Restores 60 MP.",
    effect: { mp: 60 },
    value: 25,
  },

  // --- crafted equipment (one-shot stat boost on use) ---
  amulet_attack: {
    id: "amulet_attack",
    name: "Amulet of Strength",
    icon: "🔱",
    kind: "equipment",
    stack: 1,
    description: "Permanently grants +5 Attack when used.",
    effect: { attackBonus: 5 },
    value: 200,
  },
  amulet_defense: {
    id: "amulet_defense",
    name: "Aegis Amulet",
    icon: "🛡",
    kind: "equipment",
    stack: 1,
    description: "Permanently grants +4 Defense when used.",
    effect: { defenseBonus: 4 },
    value: 200,
  },
  amulet_vitality: {
    id: "amulet_vitality",
    name: "Heart of the Wilds",
    icon: "💚",
    kind: "equipment",
    stack: 1,
    description: "Permanently grants +60 Max HP when used.",
    effect: { hpMaxBonus: 60 },
    value: 220,
  },
};

export interface DropEntry {
  id: string;
  /** chance per kill (0..1) */
  chance: number;
  min?: number;
  max?: number;
}

export const DROP_TABLES: Record<string, DropEntry[]> = {
  goblin: [
    { id: "goblin_tooth", chance: 0.7, min: 1, max: 2 },
    { id: "rune_dust", chance: 0.2 },
    { id: "potion_hp", chance: 0.1 },
  ],
  wolf: [
    { id: "wolf_pelt", chance: 0.75 },
    { id: "potion_hp", chance: 0.18 },
    { id: "rune_dust", chance: 0.12 },
  ],
  orc: [
    { id: "orc_horn", chance: 0.65 },
    { id: "iron_ore", chance: 0.5, min: 1, max: 2 },
    { id: "potion_mp", chance: 0.18 },
    { id: "rune_dust", chance: 0.15 },
  ],
};

export interface RolledDrop {
  id: string;
  amount: number;
}

export function rollDrops(enemyType: string): RolledDrop[] {
  const table = DROP_TABLES[enemyType];
  if (!table) return [];
  const drops: RolledDrop[] = [];
  for (const d of table) {
    if (Math.random() < d.chance) {
      const min = d.min ?? 1;
      const max = d.max ?? min;
      drops.push({
        id: d.id,
        amount: min + Math.floor(Math.random() * (max - min + 1)),
      });
    }
  }
  return drops;
}
