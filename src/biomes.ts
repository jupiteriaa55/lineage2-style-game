import type { BiomeDef, BiomeId } from "./types";
import { getLocale } from "./i18n";

/**
 * Four world biomes. Each defines a circular world region with its own
 * palette, mob roster and average level.
 */
export const BIOMES: Record<BiomeId, BiomeDef> = {
  forest: {
    id: "forest",
    name: "Greenleaf Woods",
    center: [0, -120],
    radius: 110,
    palette: { ground: 0x4a6e3a, accent: 0x356025, fog: 0xb6cf8f },
    mobs: ["wolf", "goblin"],
    level: 3,
  },
  wasteland: {
    id: "wasteland",
    name: "Ashen Wastes",
    center: [180, 0],
    radius: 110,
    palette: { ground: 0x8e7a55, accent: 0x6b5a3e, fog: 0xd6c598 },
    mobs: ["goblin_raider", "ash_imp"],
    level: 8,
  },
  mountains: {
    id: "mountains",
    name: "Ironpeak Crags",
    center: [-160, 80],
    radius: 110,
    palette: { ground: 0x807c7a, accent: 0x4a4948, fog: 0xb6b6c0 },
    mobs: ["stone_troll", "frost_bear"],
    level: 14,
  },
  graveyard: {
    id: "graveyard",
    name: "Hollowmoor Graveyard",
    center: [60, 200],
    radius: 100,
    palette: { ground: 0x4a4a55, accent: 0x2a2a30, fog: 0x6f6f80 },
    mobs: ["skeleton", "wraith"],
    level: 18,
  },
};

export const BIOME_LIST: BiomeDef[] = Object.values(BIOMES);

export function biomeAt(x: number, z: number): BiomeDef | null {
  for (const b of BIOME_LIST) {
    const dx = x - b.center[0];
    const dz = z - b.center[1];
    if (dx * dx + dz * dz <= b.radius * b.radius) return b;
  }
  return null;
}

const RU_BIOME: Record<string, string> = {
  forest: "Зеленолистные леса",
  wasteland: "Пепельные пустоши",
  mountains: "Железные пики",
  graveyard: "Кладбище Пустошей",
};

export function getBiomeName(id: string): string {
  if (getLocale() === "ru") return RU_BIOME[id] ?? BIOMES[id as BiomeId]?.name ?? id;
  return BIOMES[id as BiomeId]?.name ?? id;
}
