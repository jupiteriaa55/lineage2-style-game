import type { ClassId } from "./classes";
import type { Skill } from "./types";

/**
 * A node in a class's skill tree. Includes the runtime Skill plus tree
 * metadata: tier, prerequisites, and minimum character level.
 */
export interface SkillNode {
  skill: Skill;
  classId: ClassId;
  /** 1 = basic, 2 = adept, 3 = master */
  tier: 1 | 2 | 3;
  /** ids of skills required to be learned first */
  parents: string[];
  /** minimum character level */
  minLevel: number;
  /** column hint for UI layout (0..N) */
  column: number;
}

function s(
  id: string,
  name: string,
  icon: string,
  cooldown: number,
  manaCost: number,
  range: number,
  damage: number,
  description: string,
  extras: Partial<Skill> = {},
): Skill {
  return {
    id,
    name,
    icon,
    hotkey: "",
    cooldown,
    cooldownLeft: 0,
    manaCost,
    range,
    damage,
    description,
    ...extras,
  };
}

export const SKILL_NODES: Record<string, SkillNode> = {
  // ================= KNIGHT =================
  power_strike: {
    skill: s(
      "power_strike",
      "Power Strike",
      "⚔",
      4,
      8,
      2.2,
      35,
      "A heavy melee strike (+35 dmg).",
    ),
    classId: "knight",
    tier: 1,
    parents: [],
    minLevel: 1,
    column: 0,
  },
  shield_wall: {
    skill: s(
      "shield_wall",
      "Shield Wall",
      "▣",
      18,
      14,
      0,
      0,
      "Brace: +50% defense for 6s and full HP heal of 25%.",
      { heal: 0 },
    ),
    classId: "knight",
    tier: 1,
    parents: [],
    minLevel: 2,
    column: 1,
  },
  charge: {
    skill: s(
      "charge",
      "Charge",
      "↯",
      10,
      18,
      8,
      28,
      "Dash to target and strike for 28 dmg with stun.",
    ),
    classId: "knight",
    tier: 2,
    parents: ["power_strike"],
    minLevel: 5,
    column: 0,
  },
  shield_bash: {
    skill: s(
      "shield_bash",
      "Shield Bash",
      "⛨",
      6,
      12,
      2.2,
      40,
      "Bash with shield for 40 dmg + brief stun.",
    ),
    classId: "knight",
    tier: 2,
    parents: ["shield_wall"],
    minLevel: 6,
    column: 1,
  },
  earth_quake: {
    skill: s(
      "earth_quake",
      "Earthquake",
      "⛰",
      24,
      40,
      4,
      70,
      "Slam ground in AoE around you, 70 dmg to all in range.",
    ),
    classId: "knight",
    tier: 3,
    parents: ["charge", "shield_bash"],
    minLevel: 10,
    column: 0,
  },

  // ================= SCOUT =================
  arrow_shot: {
    skill: s(
      "arrow_shot",
      "Arrow Shot",
      "➶",
      3,
      6,
      9,
      26,
      "Quick arrow at range (26 dmg).",
    ),
    classId: "scout",
    tier: 1,
    parents: [],
    minLevel: 1,
    column: 0,
  },
  dash: {
    skill: s(
      "dash",
      "Evasive Dash",
      "≫",
      8,
      10,
      0,
      0,
      "Quickly reposition + restore 30 HP.",
      { heal: 30 },
    ),
    classId: "scout",
    tier: 1,
    parents: [],
    minLevel: 2,
    column: 1,
  },
  double_shot: {
    skill: s(
      "double_shot",
      "Double Shot",
      "⇉",
      6,
      14,
      9,
      40,
      "Fire two arrows in quick succession.",
    ),
    classId: "scout",
    tier: 2,
    parents: ["arrow_shot"],
    minLevel: 5,
    column: 0,
  },
  poison_arrow: {
    skill: s(
      "poison_arrow",
      "Poison Arrow",
      "☣",
      9,
      18,
      9,
      24,
      "Poisoned arrow: 24 dmg + 24 dmg over 4s.",
    ),
    classId: "scout",
    tier: 2,
    parents: ["arrow_shot"],
    minLevel: 7,
    column: 1,
  },
  rain_of_arrows: {
    skill: s(
      "rain_of_arrows",
      "Rain of Arrows",
      "☂",
      28,
      45,
      10,
      90,
      "Volley of arrows on target area, 90 dmg AoE.",
    ),
    classId: "scout",
    tier: 3,
    parents: ["double_shot", "poison_arrow"],
    minLevel: 10,
    column: 0,
  },

  // ================= SORCERER =================
  fireball: {
    skill: s(
      "fireball",
      "Fireball",
      "✺",
      8,
      22,
      9,
      55,
      "Hurl a flaming sphere (55 dmg + screen shake).",
    ),
    classId: "sorcerer",
    tier: 1,
    parents: [],
    minLevel: 1,
    column: 0,
  },
  ice_lance: {
    skill: s(
      "ice_lance",
      "Ice Lance",
      "❄",
      6,
      18,
      9,
      40,
      "Frozen spear pierces target (40 dmg + slow).",
    ),
    classId: "sorcerer",
    tier: 1,
    parents: [],
    minLevel: 3,
    column: 1,
  },
  flame_burst: {
    skill: s(
      "flame_burst",
      "Flame Burst",
      "✸",
      12,
      30,
      9,
      90,
      "Massive fireball, 90 dmg + screen shake.",
    ),
    classId: "sorcerer",
    tier: 2,
    parents: ["fireball"],
    minLevel: 6,
    column: 0,
  },
  blizzard: {
    skill: s(
      "blizzard",
      "Blizzard",
      "❅",
      18,
      40,
      10,
      75,
      "Storm of ice shards on a target zone, 75 dmg AoE.",
    ),
    classId: "sorcerer",
    tier: 2,
    parents: ["ice_lance"],
    minLevel: 8,
    column: 1,
  },
  meteor: {
    skill: s(
      "meteor",
      "Meteor",
      "☄",
      45,
      80,
      12,
      180,
      "Call a meteor — 180 dmg + huge explosion.",
    ),
    classId: "sorcerer",
    tier: 3,
    parents: ["flame_burst", "blizzard"],
    minLevel: 10,
    column: 0,
  },

  // ================= BISHOP =================
  iron_will: {
    skill: s(
      "iron_will",
      "Heal",
      "✚",
      14,
      18,
      0,
      0,
      "Restore 60 HP instantly.",
      { heal: 60 },
    ),
    classId: "bishop",
    tier: 1,
    parents: [],
    minLevel: 1,
    column: 0,
  },
  bless: {
    skill: s(
      "bless",
      "Bless",
      "✦",
      30,
      25,
      0,
      0,
      "Restore full MP and bless: +20% atk for 12s.",
    ),
    classId: "bishop",
    tier: 1,
    parents: [],
    minLevel: 3,
    column: 1,
  },
  greater_heal: {
    skill: s(
      "greater_heal",
      "Greater Heal",
      "✛",
      12,
      35,
      0,
      0,
      "Restore 140 HP instantly.",
      { heal: 140 },
    ),
    classId: "bishop",
    tier: 2,
    parents: ["iron_will"],
    minLevel: 6,
    column: 0,
  },
  holy_smite: {
    skill: s(
      "holy_smite",
      "Holy Smite",
      "☀",
      10,
      28,
      8,
      60,
      "Pillar of light strikes target, 60 dmg.",
    ),
    classId: "bishop",
    tier: 2,
    parents: ["bless"],
    minLevel: 6,
    column: 1,
  },
  resurrection: {
    skill: s(
      "resurrection",
      "Last Stand",
      "♰",
      90,
      60,
      0,
      0,
      "Full HP + invulnerable 4s on next death.",
      { heal: 9999 },
    ),
    classId: "bishop",
    tier: 3,
    parents: ["greater_heal", "holy_smite"],
    minLevel: 10,
    column: 0,
  },

  // ================= RAIDER =================
  battle_roar: {
    skill: s(
      "battle_roar",
      "Battle Roar",
      "❂",
      24,
      20,
      0,
      0,
      "Restore full MP + intimidate enemies.",
    ),
    classId: "raider",
    tier: 1,
    parents: [],
    minLevel: 1,
    column: 0,
  },
  rage: {
    skill: s(
      "rage",
      "Rage",
      "☢",
      30,
      30,
      0,
      0,
      "+50% attack for 8s, costs 10% HP to activate.",
    ),
    classId: "raider",
    tier: 1,
    parents: [],
    minLevel: 3,
    column: 1,
  },
  cleave: {
    skill: s(
      "cleave",
      "Cleave",
      "⚒",
      6,
      14,
      2.6,
      55,
      "Wide swing in front, 55 dmg to all near.",
    ),
    classId: "raider",
    tier: 2,
    parents: ["battle_roar"],
    minLevel: 5,
    column: 0,
  },
  whirlwind: {
    skill: s(
      "whirlwind",
      "Whirlwind",
      "✷",
      14,
      26,
      3.0,
      85,
      "Spin attack, 85 dmg to all enemies near.",
    ),
    classId: "raider",
    tier: 2,
    parents: ["rage"],
    minLevel: 8,
    column: 1,
  },
  berserker: {
    skill: s(
      "berserker",
      "Berserker",
      "☠",
      60,
      50,
      0,
      0,
      "+100% attack speed and lifesteal for 10s.",
    ),
    classId: "raider",
    tier: 3,
    parents: ["cleave", "whirlwind"],
    minLevel: 10,
    column: 0,
  },

  // ================= UNIVERSAL (anyone can buy at level 4) =================
  wind_slash: {
    skill: s(
      "wind_slash",
      "Wind Slash",
      "≋",
      7,
      14,
      6,
      28,
      "Ranged blade of wind (universal, 28 dmg).",
    ),
    classId: "scout", // shown under scout column 2 visually
    tier: 1,
    parents: [],
    minLevel: 4,
    column: 2,
  },
};

export function getNodesForClass(classId: ClassId): SkillNode[] {
  return Object.values(SKILL_NODES).filter(
    (n) => n.classId === classId || n.skill.id === "wind_slash",
  );
}

export function canLearn(
  node: SkillNode,
  learnedIds: Set<string>,
  charLevel: number,
  pointsAvailable: number,
): { ok: boolean; reason?: string } {
  if (learnedIds.has(node.skill.id)) return { ok: false, reason: "Already learned" };
  if (charLevel < node.minLevel)
    return { ok: false, reason: `Requires Lv. ${node.minLevel}` };
  if (pointsAvailable < 1) return { ok: false, reason: "No skill points" };
  for (const p of node.parents) {
    if (!learnedIds.has(p)) {
      const parent = SKILL_NODES[p];
      return {
        ok: false,
        reason: `Requires ${parent ? parent.skill.name : p}`,
      };
    }
  }
  return { ok: true };
}
