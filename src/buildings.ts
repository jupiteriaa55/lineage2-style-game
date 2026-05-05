import type { BuildingDef, BuildingKind } from "./types";
import { getLocale } from "./i18n";

export const BUILDINGS: Record<BuildingKind, BuildingDef> = {
  house: {
    id: "house",
    name: "Cottage",
    icon: "⌂",
    cost: [
      { itemId: "mat_wood_log", count: 8 },
      { itemId: "mat_stone_block", count: 4 },
    ],
    description: "A simple cottage. Increases village population cap.",
    tile: [2, 2],
  },
  wall: {
    id: "wall",
    name: "Stone Wall",
    icon: "▦",
    cost: [{ itemId: "mat_stone_block", count: 3 }],
    description: "A stone wall segment. Defends the village.",
    tile: [1, 1],
  },
  tower: {
    id: "tower",
    name: "Watchtower",
    icon: "♜",
    cost: [
      { itemId: "mat_stone_block", count: 12 },
      { itemId: "mat_wood_log", count: 6 },
      { itemId: "mat_iron_ingot", count: 4 },
    ],
    description: "A tall watchtower. Spots enemies further away.",
    tile: [2, 2],
  },
  farm: {
    id: "farm",
    name: "Farm Plot",
    icon: "◇",
    cost: [{ itemId: "mat_wood_log", count: 6 }],
    description: "A farm plot. Generates food income over time.",
    tile: [3, 2],
  },
  workshop: {
    id: "workshop",
    name: "Workshop",
    icon: "⚒",
    cost: [
      { itemId: "mat_wood_log", count: 10 },
      { itemId: "mat_iron_ingot", count: 6 },
    ],
    description: "Unlocks advanced crafting recipes.",
    tile: [3, 3],
  },
  well: {
    id: "well",
    name: "Stone Well",
    icon: "◯",
    cost: [{ itemId: "mat_stone_block", count: 8 }],
    description: "Provides water and a small heal-on-rest bonus.",
    tile: [1, 1],
  },
  lamp: {
    id: "lamp",
    name: "Lamp Post",
    icon: "❉",
    cost: [
      { itemId: "mat_wood_log", count: 1 },
      { itemId: "mat_iron_ingot", count: 1 },
    ],
    description: "Lights the surrounding tiles at night.",
    tile: [1, 1],
  },
};

export const BUILDING_LIST: BuildingDef[] = Object.values(BUILDINGS);

export const VILLAGE_GRID_SIZE = 24;
export const VILLAGE_TILE_WORLD = 2.5;
export const VILLAGE_UNLOCK_LEVEL = 10;

const RU_BUILDING_NAME: Record<string, string> = {
  house: "Дом",
  wall: "Каменная стена",
  tower: "Сторожевая башня",
  farm: "Ферма",
  workshop: "Мастерская",
  well: "Каменный колодец",
  lamp: "Фонарь",
};
const RU_BUILDING_DESC: Record<string, string> = {
  house: "Простой дом. Увеличивает население деревни.",
  wall: "Сегмент стены. Защищает деревню.",
  tower: "Высокая башня. Замечает врагов издалека.",
  farm: "Поле. Производит еду со временем.",
  workshop: "Открывает продвинутые рецепты крафта.",
  well: "Даёт воду и небольшой бонус регенерации.",
  lamp: "Освещает окружающие клетки ночью.",
};

export function getBuildingName(def: BuildingDef): string {
  if (getLocale() === "ru") return RU_BUILDING_NAME[def.id] ?? def.name;
  return def.name;
}
export function getBuildingDesc(def: BuildingDef): string {
  if (getLocale() === "ru") return RU_BUILDING_DESC[def.id] ?? def.description;
  return def.description;
}
