import type { BotPlayerDef, RaceId, ClassId } from "./types";

const FIRST_NAMES = [
  "Aric", "Borin", "Cailin", "Dren", "Elya", "Fenris", "Galin", "Halia",
  "Ivor", "Jora", "Kael", "Lirien", "Mara", "Nyra", "Orin", "Pova",
  "Quor", "Ralia", "Suren", "Tova", "Ulric", "Vaela", "Wren", "Xuri",
  "Yuren", "Zara", "Bronwyn", "Caelis", "Daren", "Eira", "Fyron", "Gren",
];

const SUFFIXES = [
  "the Bold", "Stormblade", "of Lirialae", "the Quick", "Ironheart",
  "the Hunter", "Shadowfoot", "Silvermane", "the Patient", "Bloodfang",
  "Stonebrow", "the Wise", "of the Crags", "Frostborn", "the Reckless",
];

export const BOT_COUNT = 12;

export function generateBots(seed = 1): BotPlayerDef[] {
  const rng = makeRng(seed);
  const races: RaceId[] = ["human", "elf", "darkelf", "dwarf", "orc"];
  const classes: ClassId[] = ["warrior", "mage", "rogue"];
  const cities = [
    "city.aldenfeld",
    "city.lirialae",
    "city.morvanthel",
    "city.kaelgard",
    "city.gru.tor",
    "city.crossroad",
  ];
  const colors = [
    0xf0c674, 0x9ec072, 0xb088d6, 0xe0a868, 0xd06868, 0x70c0d0,
    0xc8c8c8, 0xa6c0e0, 0xe7d8a8, 0xa07ad0, 0xd0a070, 0xa0d0a0,
  ];
  const bots: BotPlayerDef[] = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    const race = races[Math.floor(rng() * races.length)];
    const cls = classes[Math.floor(rng() * classes.length)];
    const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
    bots.push({
      id: `bot.${i + 1}`,
      name: `${first} ${suffix}`,
      race,
      class: cls,
      level: 1 + Math.floor(rng() * 22),
      homeCity: cities[Math.floor(rng() * cities.length)],
      color: colors[i % colors.length],
    });
  }
  return bots;
}

function makeRng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
