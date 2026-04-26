import type { Stats } from "./types";

export type ClassId = "knight" | "scout" | "sorcerer" | "bishop" | "raider";

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  /** body palette tint (RGB 0..255) */
  bodyTint: [number, number, number];
  /** starting skill ids */
  startingSkills: string[];
  /** base stats */
  baseStats: Stats;
  /** per-level stat growth */
  growth: {
    hpMax: number;
    mpMax: number;
    attack: number;
    defense: number;
  };
}

export const CLASSES: Record<ClassId, ClassDef> = {
  knight: {
    id: "knight",
    name: "Knight",
    tagline: "Sword & Shield",
    description:
      "Heavy melee defender. High HP and defense, charges into the fray with shield and longsword.",
    icon: "⚔",
    bodyTint: [70, 90, 140],
    startingSkills: ["power_strike"],
    baseStats: {
      hp: 240,
      hpMax: 240,
      mp: 60,
      mpMax: 60,
      attack: 20,
      defense: 10,
      attackRange: 2.2,
      attackSpeed: 1.7,
    },
    growth: { hpMax: 36, mpMax: 7, attack: 3, defense: 2 },
  },
  scout: {
    id: "scout",
    name: "Elven Scout",
    tagline: "Bow & Blade",
    description:
      "Agile ranger. Low HP but quick attacks and ranged shots, finishes wounded foes with grace.",
    icon: "➶",
    bodyTint: [60, 110, 80],
    startingSkills: ["arrow_shot"],
    baseStats: {
      hp: 160,
      hpMax: 160,
      mp: 90,
      mpMax: 90,
      attack: 17,
      defense: 4,
      attackRange: 5.0,
      attackSpeed: 1.2,
    },
    growth: { hpMax: 24, mpMax: 12, attack: 4, defense: 1 },
  },
  sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    tagline: "Fire & Frost",
    description:
      "Glass-cannon mage. Devastating elemental spells, vulnerable in melee.",
    icon: "✺",
    bodyTint: [85, 50, 130],
    startingSkills: ["fireball"],
    baseStats: {
      hp: 140,
      hpMax: 140,
      mp: 160,
      mpMax: 160,
      attack: 12,
      defense: 3,
      attackRange: 2.0,
      attackSpeed: 1.8,
    },
    growth: { hpMax: 20, mpMax: 22, attack: 1, defense: 1 },
  },
  bishop: {
    id: "bishop",
    name: "Bishop",
    tagline: "Light & Mercy",
    description:
      "Holy support. Heals allies and smites foes with divine light.",
    icon: "✦",
    bodyTint: [220, 200, 140],
    startingSkills: ["iron_will"],
    baseStats: {
      hp: 180,
      hpMax: 180,
      mp: 140,
      mpMax: 140,
      attack: 11,
      defense: 5,
      attackRange: 2.0,
      attackSpeed: 1.7,
    },
    growth: { hpMax: 26, mpMax: 18, attack: 1, defense: 2 },
  },
  raider: {
    id: "raider",
    name: "Orc Raider",
    tagline: "Fury & Iron",
    description:
      "Berserker melee. Massive damage and battle cries, sacrifices defense for aggression.",
    icon: "❂",
    bodyTint: [130, 60, 35],
    startingSkills: ["battle_roar"],
    baseStats: {
      hp: 220,
      hpMax: 220,
      mp: 70,
      mpMax: 70,
      attack: 22,
      defense: 6,
      attackRange: 2.2,
      attackSpeed: 1.8,
    },
    growth: { hpMax: 32, mpMax: 6, attack: 4, defense: 1 },
  },
};
