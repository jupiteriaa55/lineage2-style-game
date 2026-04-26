import { ITEMS } from "./items";

export interface RecipeIngredient {
  id: string;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  output: { id: string; amount: number };
  inputs: RecipeIngredient[];
}

export const RECIPES: Recipe[] = [
  {
    id: "potion_hp",
    name: "Health Potion (x2)",
    output: { id: "potion_hp", amount: 2 },
    inputs: [
      { id: "rune_dust", amount: 2 },
      { id: "wolf_pelt", amount: 1 },
    ],
  },
  {
    id: "potion_mp",
    name: "Mana Potion (x2)",
    output: { id: "potion_mp", amount: 2 },
    inputs: [
      { id: "rune_dust", amount: 3 },
    ],
  },
  {
    id: "amulet_attack",
    name: "Amulet of Strength",
    output: { id: "amulet_attack", amount: 1 },
    inputs: [
      { id: "iron_ore", amount: 3 },
      { id: "rune_dust", amount: 2 },
      { id: "orc_horn", amount: 1 },
    ],
  },
  {
    id: "amulet_defense",
    name: "Aegis Amulet",
    output: { id: "amulet_defense", amount: 1 },
    inputs: [
      { id: "iron_ore", amount: 4 },
      { id: "rune_dust", amount: 1 },
      { id: "wolf_pelt", amount: 2 },
    ],
  },
  {
    id: "amulet_vitality",
    name: "Heart of the Wilds",
    output: { id: "amulet_vitality", amount: 1 },
    inputs: [
      { id: "wolf_pelt", amount: 4 },
      { id: "goblin_tooth", amount: 4 },
      { id: "rune_dust", amount: 3 },
    ],
  },
];

export function describeRecipe(r: Recipe): string {
  return r.inputs
    .map((i) => `${ITEMS[i.id]?.icon ?? "?"} ${ITEMS[i.id]?.name ?? i.id} x${i.amount}`)
    .join(", ");
}
