import type { Skill } from "./types";

export function createSkillBook(): Skill[] {
  return [
    {
      id: "power_strike",
      name: "Power Strike",
      icon: "⚔",
      hotkey: "1",
      cooldown: 4,
      cooldownLeft: 0,
      manaCost: 8,
      range: 2.2,
      damage: 35,
      description: "A heavy melee strike.",
    },
    {
      id: "iron_will",
      name: "Iron Will",
      icon: "✦",
      hotkey: "2",
      cooldown: 18,
      cooldownLeft: 0,
      manaCost: 20,
      range: 0,
      damage: 0,
      heal: 60,
      description: "Restore 60 HP instantly.",
    },
    {
      id: "wind_slash",
      name: "Wind Slash",
      icon: "≋",
      hotkey: "3",
      cooldown: 7,
      cooldownLeft: 0,
      manaCost: 14,
      range: 6,
      damage: 28,
      description: "Ranged wind blade.",
    },
    {
      id: "fireball",
      name: "Fireball",
      icon: "✺",
      hotkey: "4",
      cooldown: 10,
      cooldownLeft: 0,
      manaCost: 25,
      range: 8,
      damage: 55,
      description: "A blast of fire.",
    },
    {
      id: "battle_roar",
      name: "Battle Roar",
      icon: "❂",
      hotkey: "5",
      cooldown: 30,
      cooldownLeft: 0,
      manaCost: 30,
      range: 0,
      damage: 0,
      description: "Recover MP and steady stance (full MP).",
    },
  ];
}

export function tickSkills(skills: Skill[], dt: number): void {
  for (const s of skills) {
    if (s.cooldownLeft > 0) s.cooldownLeft = Math.max(0, s.cooldownLeft - dt);
  }
}
