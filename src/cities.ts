import type { CityDef, CastleDef, RaceId } from "./types";

/**
 * Five settlements: 4 starter cities (one per race) + 1 central hub
 * that hosts the contested castle. Cities are placed inside relatively
 * peaceful areas, away from biome interiors which contain mobs.
 */
export const CITIES: Record<string, CityDef> = {
  "city.aldenfeld": {
    id: "city.aldenfeld",
    name: "Aldenfeld",
    center: [-260, -260],
    race: "human",
    radius: 36,
    palette: {
      wall: 0xd6c595,
      roof: 0x9c3a2c,
      accent: 0x8b6f43,
      ground: 0x7a8a5a,
    },
  },
  "city.lirialae": {
    id: "city.lirialae",
    name: "Lirialae",
    center: [260, -260],
    race: "elf",
    radius: 36,
    palette: {
      wall: 0xc6e2c0,
      roof: 0x4e7a3c,
      accent: 0xe6d77a,
      ground: 0x4a7a4d,
    },
  },
  "city.morvanthel": {
    id: "city.morvanthel",
    name: "Morvanthel",
    center: [260, 260],
    race: "darkelf",
    radius: 36,
    palette: {
      wall: 0x4a3f60,
      roof: 0x29213b,
      accent: 0x9a7adc,
      ground: 0x3a2f4a,
    },
  },
  "city.kaelgard": {
    id: "city.kaelgard",
    name: "Kaelgard Hold",
    center: [-260, 260],
    race: "dwarf",
    radius: 36,
    palette: {
      wall: 0x9a8866,
      roof: 0x6e3e2a,
      accent: 0xb4762a,
      ground: 0x6a5a48,
    },
  },
  "city.gru.tor": {
    id: "city.gru.tor",
    name: "Gru'tor War-Camp",
    center: [0, -300],
    race: "orc",
    radius: 30,
    palette: {
      wall: 0x7c5a3a,
      roof: 0x5a3a2a,
      accent: 0xa64a2a,
      ground: 0x6a4a30,
    },
  },
  "city.crossroad": {
    id: "city.crossroad",
    name: "Crossroad Bastion",
    center: [0, 60],
    race: "common",
    radius: 50,
    palette: {
      wall: 0xbcbcc4,
      roof: 0x4a5a78,
      accent: 0xd9b85a,
      ground: 0x70704a,
    },
  },
};

export const CITY_LIST: CityDef[] = Object.values(CITIES);

export function getCity(id: string): CityDef | null {
  return CITIES[id] ?? null;
}

export function startCityForRace(race: RaceId): string {
  switch (race) {
    case "human":
      return "city.aldenfeld";
    case "elf":
      return "city.lirialae";
    case "darkelf":
      return "city.morvanthel";
    case "dwarf":
      return "city.kaelgard";
    case "orc":
      return "city.gru.tor";
    default:
      return "city.crossroad";
  }
}

/* ---------- Castles ---------- */

export const CASTLES: Record<string, CastleDef> = {
  "castle.crown": {
    id: "castle.crown",
    name: "Crown of the Five",
    center: [0, 60],
    dailyTax: 5000,
  },
};

export const CASTLE_LIST: CastleDef[] = Object.values(CASTLES);
