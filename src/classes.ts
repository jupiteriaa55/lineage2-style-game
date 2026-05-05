import type { ClassDef, ClassId, AdvancedClassId, Stats } from "./types";

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description:
      "Front-line melee combatant. High HP, strong defense, hits hard.",
    primaryStat: "attack",
    baseStats: {
      hpMax: 220,
      mpMax: 60,
      attack: 22,
      defense: 8,
      attackRange: 2.0,
      attackSpeed: 1.6,
    },
    startWeapon: "weapon_iron_sword",
    advanced: [
      {
        id: "knight",
        name: "Knight",
        description: "Defensive warrior. Higher armor and HP.",
      },
      {
        id: "berserker",
        name: "Berserker",
        description: "Aggressive damage-dealer. Higher attack and speed.",
      },
    ],
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "Wields elemental magic. Glass cannon with strong AoE.",
    primaryStat: "magic",
    baseStats: {
      hpMax: 140,
      mpMax: 180,
      attack: 12,
      defense: 3,
      attackRange: 6.0,
      attackSpeed: 1.4,
    },
    startWeapon: "weapon_oak_staff",
    advanced: [
      {
        id: "archmage",
        name: "Archmage",
        description: "Elemental specialist with raw magic damage.",
      },
      {
        id: "warlock",
        name: "Warlock",
        description: "Curses, debuffs, and shadow magic.",
      },
    ],
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description:
      "Agile striker. Crit damage, evasion, and ranged or stealth combat.",
    primaryStat: "attack",
    baseStats: {
      hpMax: 170,
      mpMax: 90,
      attack: 18,
      defense: 4,
      attackRange: 2.4,
      attackSpeed: 1.2,
    },
    startWeapon: "weapon_dagger",
    advanced: [
      {
        id: "shadowblade",
        name: "Shadowblade",
        description: "Dual-wield assassin with bleed and crit synergy.",
      },
      {
        id: "ranger",
        name: "Ranger",
        description: "Ranged bowman, traps, and beast lore.",
      },
    ],
  },
};

export const CLASS_LIST: ClassDef[] = Object.values(CLASSES);

export const ADVANCED_CLASS_LEVEL = 20;

/** Returns the bonus stats for choosing a particular advanced class. */
export function advancedClassBonus(
  id: AdvancedClassId,
): Partial<Stats> {
  switch (id) {
    case "knight":
      return { hpMax: 80, defense: 6 };
    case "berserker":
      return { attack: 12, attackSpeed: -0.1 };
    case "archmage":
      return { mpMax: 80, attack: 8, attackRange: 2 };
    case "warlock":
      return { mpMax: 60, attack: 10, attackRange: 1 };
    case "shadowblade":
      return { attack: 10, attackSpeed: -0.15 };
    case "ranger":
      return { attack: 8, attackRange: 4 };
    default:
      return {};
  }
}
