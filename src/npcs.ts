import type { NPCDef } from "./types";
import { getLocale } from "./i18n";

/**
 * Each city is populated with a mix of merchants, quest-givers, class
 * trainers and crafting masters. Quest IDs reference quests.ts.
 */
export const NPCS: Record<string, NPCDef> = {
  /* ---------------- Aldenfeld (Human) ---------------- */
  "npc.alden.merchant": {
    id: "npc.alden.merchant",
    name: "Edran the Trader",
    kind: "merchant",
    city: "city.aldenfeld",
    pos: [-258, -250],
    raceLook: "human",
    shop: [
      { itemId: "pot_minor_heal", price: 15 },
      { itemId: "pot_minor_mana", price: 14 },
      { itemId: "weapon_iron_sword", price: 200 },
      { itemId: "armor_leather_vest", price: 180 },
      { itemId: "helmet_iron_cap", price: 120 },
      { itemId: "boots_leather", price: 80 },
      { itemId: "gloves_leather", price: 70 },
      { itemId: "lootbox_common", price: 320 },
    ],
    buys: [
      { itemId: "mat_wolf_pelt", price: 8 },
      { itemId: "mat_goblin_ear", price: 4 },
      { itemId: "mat_iron_ore", price: 6 },
      { itemId: "mat_coal", price: 5 },
      { itemId: "mat_wood_log", price: 3 },
      { itemId: "mat_stone_block", price: 3 },
    ],
  },
  "npc.alden.quest": {
    id: "npc.alden.quest",
    name: "Captain Veyra",
    kind: "quest",
    city: "city.aldenfeld",
    pos: [-262, -260],
    raceLook: "human",
    questIds: ["quest.wolves_of_greenleaf", "quest.goblin_problem"],
  },
  "npc.alden.warrior": {
    id: "npc.alden.warrior",
    name: "Master Gareth",
    kind: "trainer",
    city: "city.aldenfeld",
    pos: [-256, -266],
    raceLook: "human",
    trainsClass: "warrior",
  },
  "npc.alden.craft": {
    id: "npc.alden.craft",
    name: "Smith Ronvar",
    kind: "crafting",
    city: "city.aldenfeld",
    pos: [-264, -252],
    raceLook: "human",
  },

  /* ---------------- Lirialae (Elf) ---------------- */
  "npc.lirial.merchant": {
    id: "npc.lirial.merchant",
    name: "Aelynn of the Glade",
    kind: "merchant",
    city: "city.lirialae",
    pos: [258, -250],
    raceLook: "elf",
    shop: [
      { itemId: "pot_minor_heal", price: 15 },
      { itemId: "pot_minor_mana", price: 14 },
      { itemId: "weapon_oak_staff", price: 200 },
      { itemId: "armor_robe", price: 220 },
      { itemId: "ring_mana", price: 280 },
      { itemId: "amulet_focus", price: 480 },
      { itemId: "lootbox_common", price: 320 },
    ],
    buys: [
      { itemId: "mat_arcane_dust", price: 12 },
      { itemId: "mat_wood_log", price: 4 },
    ],
  },
  "npc.lirial.quest": {
    id: "npc.lirial.quest",
    name: "Elder Thelorin",
    kind: "quest",
    city: "city.lirialae",
    pos: [262, -262],
    raceLook: "elf",
    questIds: ["quest.arcane_essence", "quest.wraith_hunt"],
  },
  "npc.lirial.mage": {
    id: "npc.lirial.mage",
    name: "Archmage Selvae",
    kind: "trainer",
    city: "city.lirialae",
    pos: [256, -266],
    raceLook: "elf",
    trainsClass: "mage",
  },

  /* ---------------- Morvanthel (Dark Elf) ---------------- */
  "npc.morvan.merchant": {
    id: "npc.morvan.merchant",
    name: "Vaerin Nightblade",
    kind: "merchant",
    city: "city.morvanthel",
    pos: [258, 250],
    raceLook: "darkelf",
    shop: [
      { itemId: "weapon_dagger", price: 200 },
      { itemId: "armor_leather_vest", price: 180 },
      { itemId: "ring_strength", price: 280 },
      { itemId: "charge_spirit", price: 30 },
      { itemId: "charge_mana", price: 30 },
      { itemId: "lootbox_rare", price: 1200 },
    ],
    buys: [
      { itemId: "mat_shadow_essence", price: 60 },
      { itemId: "mat_arcane_dust", price: 12 },
    ],
  },
  "npc.morvan.quest": {
    id: "npc.morvan.quest",
    name: "Inquisitor Yssra",
    kind: "quest",
    city: "city.morvanthel",
    pos: [262, 262],
    raceLook: "darkelf",
    questIds: ["quest.skeleton_purge", "quest.shadow_market"],
  },
  "npc.morvan.rogue": {
    id: "npc.morvan.rogue",
    name: "Shadowmaster Dren",
    kind: "trainer",
    city: "city.morvanthel",
    pos: [256, 256],
    raceLook: "darkelf",
    trainsClass: "rogue",
  },

  /* ---------------- Kaelgard Hold (Dwarf) ---------------- */
  "npc.kael.merchant": {
    id: "npc.kael.merchant",
    name: "Borin Ironhand",
    kind: "merchant",
    city: "city.kaelgard",
    pos: [-258, 250],
    raceLook: "dwarf",
    shop: [
      { itemId: "weapon_steel_axe", price: 480 },
      { itemId: "armor_chainmail", price: 520 },
      { itemId: "armor_plate", price: 1200 },
      { itemId: "helmet_great_helm", price: 320 },
      { itemId: "gloves_gauntlets", price: 240 },
      { itemId: "boots_greaves", price: 220 },
      { itemId: "lootbox_rare", price: 1100 },
    ],
    buys: [
      { itemId: "mat_iron_ore", price: 7 },
      { itemId: "mat_iron_ingot", price: 18 },
      { itemId: "mat_steel_ingot", price: 42 },
      { itemId: "mat_stone_block", price: 4 },
    ],
  },
  "npc.kael.quest": {
    id: "npc.kael.quest",
    name: "Thane Durgan",
    kind: "quest",
    city: "city.kaelgard",
    pos: [-262, 262],
    raceLook: "dwarf",
    questIds: ["quest.troll_hunt", "quest.frostbear_pelt"],
  },
  "npc.kael.craft": {
    id: "npc.kael.craft",
    name: "Forge-Master Brokk",
    kind: "crafting",
    city: "city.kaelgard",
    pos: [-256, 256],
    raceLook: "dwarf",
  },

  /* ---------------- Gru'tor (Orc) ---------------- */
  "npc.grutor.quest": {
    id: "npc.grutor.quest",
    name: "Warchief Ku'rok",
    kind: "quest",
    city: "city.gru.tor",
    pos: [0, -298],
    raceLook: "orc",
    questIds: ["quest.imp_burn"],
  },
  "npc.grutor.merchant": {
    id: "npc.grutor.merchant",
    name: "Ghark the Trader",
    kind: "merchant",
    city: "city.gru.tor",
    pos: [4, -302],
    raceLook: "orc",
    shop: [
      { itemId: "weapon_iron_sword", price: 200 },
      { itemId: "weapon_steel_axe", price: 480 },
      { itemId: "charge_spirit", price: 28 },
      { itemId: "lootbox_common", price: 320 },
    ],
    buys: [{ itemId: "mat_orc_tusk", price: 22 }],
  },

  /* ---------------- Crossroad Bastion (Hub) ---------------- */
  "npc.cross.merchant": {
    id: "npc.cross.merchant",
    name: "Master Halric",
    kind: "merchant",
    city: "city.crossroad",
    pos: [-6, 56],
    raceLook: "human",
    shop: [
      { itemId: "pot_greater_heal", price: 60 },
      { itemId: "charge_spirit", price: 30 },
      { itemId: "charge_mana", price: 30 },
      { itemId: "lootbox_common", price: 320 },
      { itemId: "lootbox_rare", price: 1200 },
      { itemId: "lootbox_epic", price: 6000 },
    ],
    buys: [
      { itemId: "mat_dragon_scale", price: 800 },
      { itemId: "mat_shadow_essence", price: 80 },
    ],
  },
  "npc.cross.quest": {
    id: "npc.cross.quest",
    name: "Lord Marshal Velden",
    kind: "quest",
    city: "city.crossroad",
    pos: [6, 56],
    raceLook: "human",
    questIds: ["quest.castle_call"],
  },
  "npc.cross.guard": {
    id: "npc.cross.guard",
    name: "Captain of the Bastion",
    kind: "guard",
    city: "city.crossroad",
    pos: [0, 70],
    raceLook: "human",
  },
};

export const NPC_LIST: NPCDef[] = Object.values(NPCS);

export function getNPC(id: string): NPCDef | null {
  return NPCS[id] ?? null;
}

export function npcsForCity(cityId: string): NPCDef[] {
  return NPC_LIST.filter((n) => n.city === cityId);
}

const RU_NPC: Record<string, string> = {
  "npc.alden.merchant": "Эдран Торговец",
  "npc.alden.quest": "Капитан Вейра",
  "npc.alden.warrior": "Мастер Гарет",
  "npc.alden.craft": "Кузнец Ронвар",
  "npc.lirial.merchant": "Аэлинн с Поляны",
  "npc.lirial.quest": "Старейшина Телорин",
  "npc.lirial.mage": "Архимаг Сельвэ",
  "npc.morvan.merchant": "Вэрин Ночной Клинок",
  "npc.morvan.quest": "Инквизитор Иссра",
  "npc.morvan.rogue": "Тенемастер Дрен",
  "npc.kael.merchant": "Борин Железная Рука",
  "npc.kael.quest": "Тэн Дурган",
  "npc.kael.craft": "Мастер Кузни Брокк",
  "npc.grutor.quest": "Вождь Ку'рок",
  "npc.grutor.merchant": "Гарк Торговец",
  "npc.cross.merchant": "Мастер Халрик",
  "npc.cross.quest": "Лорд-маршал Велден",
  "npc.cross.guard": "Капитан Бастиона",
};

export function getNPCName(id: string): string {
  if (getLocale() === "ru") return RU_NPC[id] ?? NPCS[id]?.name ?? id;
  return NPCS[id]?.name ?? id;
}
