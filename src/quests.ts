import type { QuestDef, QuestState, QuestStatus } from "./types";

export const QUESTS: Record<string, QuestDef> = {
  "quest.wolves_of_greenleaf": {
    id: "quest.wolves_of_greenleaf",
    name: "Wolves of Greenleaf",
    giver: "npc.alden.quest",
    city: "city.aldenfeld",
    description:
      "Greenleaf wolves keep slaughtering the cattle. Bring me 6 pelts.",
    levelReq: 1,
    objective: { kind: "collect", itemId: "mat_wolf_pelt", count: 6 },
    rewards: {
      xp: 120,
      gold: 80,
      items: [{ itemId: "pot_minor_heal", count: 4 }],
    },
  },
  "quest.goblin_problem": {
    id: "quest.goblin_problem",
    name: "Goblin Problem",
    giver: "npc.alden.quest",
    city: "city.aldenfeld",
    description: "Slay 8 forest goblins along the road.",
    levelReq: 3,
    objective: { kind: "kill", mobId: "goblin", count: 8 },
    rewards: {
      xp: 220,
      gold: 140,
      items: [{ itemId: "lootbox_common", count: 1 }],
    },
  },
  "quest.arcane_essence": {
    id: "quest.arcane_essence",
    name: "Arcane Residue",
    giver: "npc.lirial.quest",
    city: "city.lirialae",
    description: "Collect 8 arcane dust from imps and forest creatures.",
    levelReq: 5,
    objective: { kind: "collect", itemId: "mat_arcane_dust", count: 8 },
    rewards: {
      xp: 280,
      gold: 160,
      items: [
        { itemId: "charge_mana", count: 8 },
        { itemId: "ring_mana", count: 1 },
      ],
    },
  },
  "quest.wraith_hunt": {
    id: "quest.wraith_hunt",
    name: "Hollow Wraiths",
    giver: "npc.lirial.quest",
    city: "city.lirialae",
    description: "Lay to rest 4 wraiths in the Hollowmoor.",
    levelReq: 18,
    objective: { kind: "kill", mobId: "wraith", count: 4 },
    rewards: {
      xp: 1200,
      gold: 800,
      items: [{ itemId: "lootbox_epic", count: 1 }],
    },
  },
  "quest.skeleton_purge": {
    id: "quest.skeleton_purge",
    name: "Purge the Restless",
    giver: "npc.morvan.quest",
    city: "city.morvanthel",
    description: "Destroy 12 risen skeletons.",
    levelReq: 14,
    objective: { kind: "kill", mobId: "skeleton", count: 12 },
    rewards: {
      xp: 800,
      gold: 480,
      items: [{ itemId: "lootbox_rare", count: 1 }],
    },
  },
  "quest.shadow_market": {
    id: "quest.shadow_market",
    name: "Shadow Market",
    giver: "npc.morvan.quest",
    city: "city.morvanthel",
    description: "Recover 4 shadow essences from the dead lands.",
    levelReq: 16,
    objective: { kind: "collect", itemId: "mat_shadow_essence", count: 4 },
    rewards: {
      xp: 800,
      gold: 480,
      items: [{ itemId: "amulet_focus", count: 1 }],
    },
  },
  "quest.troll_hunt": {
    id: "quest.troll_hunt",
    name: "The Troll Above the Pass",
    giver: "npc.kael.quest",
    city: "city.kaelgard",
    description: "Stone trolls block the pass. Slay 5.",
    levelReq: 11,
    objective: { kind: "kill", mobId: "stone_troll", count: 5 },
    rewards: {
      xp: 600,
      gold: 320,
      items: [{ itemId: "lootbox_rare", count: 1 }],
    },
  },
  "quest.frostbear_pelt": {
    id: "quest.frostbear_pelt",
    name: "Frostbear Pelts",
    giver: "npc.kael.quest",
    city: "city.kaelgard",
    description: "Bring 6 pelts from frost bears in the high crags.",
    levelReq: 13,
    objective: { kind: "collect", itemId: "mat_wolf_pelt", count: 12 },
    rewards: {
      xp: 700,
      gold: 380,
      items: [{ itemId: "armor_plate", count: 1 }],
    },
  },
  "quest.imp_burn": {
    id: "quest.imp_burn",
    name: "Burn the Imps",
    giver: "npc.grutor.quest",
    city: "city.gru.tor",
    description: "Char-meat is good meat. Slay 10 ash imps.",
    levelReq: 8,
    objective: { kind: "kill", mobId: "ash_imp", count: 10 },
    rewards: {
      xp: 480,
      gold: 240,
      items: [{ itemId: "weapon_steel_axe", count: 1 }],
    },
  },
  "quest.castle_call": {
    id: "quest.castle_call",
    name: "Call to the Crown",
    giver: "npc.cross.quest",
    city: "city.crossroad",
    description:
      "Defeat the garrison of the Crown of the Five and claim it as your own.",
    levelReq: 20,
    objective: { kind: "kill", mobId: "wraith", count: 1 },
    rewards: {
      xp: 2000,
      gold: 1500,
      items: [{ itemId: "lootbox_epic", count: 1 }],
    },
  },
};

export const QUEST_LIST: QuestDef[] = Object.values(QUESTS);

export function getQuest(id: string): QuestDef | null {
  return QUESTS[id] ?? null;
}

/* ---------- Quest state helpers ---------- */

export function getOrInitQuestState(
  quests: QuestState[],
  questId: string,
): QuestState {
  let q = quests.find((x) => x.questId === questId);
  if (!q) {
    q = { questId, status: "available", progress: 0 };
    quests.push(q);
  }
  return q;
}

export function setQuestStatus(
  quests: QuestState[],
  questId: string,
  status: QuestStatus,
): void {
  const q = getOrInitQuestState(quests, questId);
  q.status = status;
}

export function progressKill(
  quests: QuestState[],
  mobId: string,
): QuestDef[] {
  const completed: QuestDef[] = [];
  for (const state of quests) {
    if (state.status !== "active") continue;
    const def = getQuest(state.questId);
    if (!def) continue;
    if (def.objective.kind !== "kill") continue;
    if (def.objective.mobId !== mobId) continue;
    state.progress = Math.min(state.progress + 1, def.objective.count);
    if (state.progress >= def.objective.count) {
      state.status = "complete";
      completed.push(def);
    }
  }
  return completed;
}

export function progressCollect(
  quests: QuestState[],
  itemCounter: (id: string) => number,
): QuestDef[] {
  const completed: QuestDef[] = [];
  for (const state of quests) {
    if (state.status !== "active") continue;
    const def = getQuest(state.questId);
    if (!def) continue;
    if (def.objective.kind !== "collect") continue;
    const have = itemCounter(def.objective.itemId);
    state.progress = Math.min(have, def.objective.count);
    if (state.progress >= def.objective.count) {
      state.status = "complete";
      completed.push(def);
    }
  }
  return completed;
}
