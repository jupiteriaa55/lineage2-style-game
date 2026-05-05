import * as THREE from "three";
import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { createWorld, isInsideObstacle } from "./world";
import {
  createBotPlayer,
  createMob,
  createPlayer,
  updateHpBar,
} from "./entities";
import { createHUD } from "./hud";
import { createSkillBook, tickSkills } from "./skills";
import {
  applyHeal,
  grantXP,
  newXPState,
  performAttack,
  tickEffects,
  tryUseSkill,
  type Effect,
} from "./combat";
import { tickEnemyAI } from "./ai";
import { bobAnimation, moveEntity } from "./movement";
import type {
  ClassId,
  Entity,
  PlacedBuilding,
  PlayerProfile,
  RaceId,
} from "./types";
import { RACES } from "./races";
import { CLASSES, ADVANCED_CLASS_LEVEL } from "./classes";
import { newInventory, addItem, equipmentBonuses } from "./inventory";
import { showCharacterCreate, showAdvancedClassChoice } from "./characterCreate";
import { createPanels } from "./panels";
import { loadProfile, saveProfile } from "./persistence";
import { CITIES, startCityForRace, CASTLES } from "./cities";
import { NPC_LIST, getNPC } from "./npcs";
import { biomeAt, BIOMES } from "./biomes";
import { MOBS } from "./mobs";
import { generateBots, BOT_COUNT } from "./bots";
import { newCastleState, tickCastle, captureCastle, SIEGE_INTERVAL_MS, CASTLE_HP_MAX } from "./castle";
import { progressKill, progressCollect, getQuest, QUESTS } from "./quests";
import { BUILDINGS, VILLAGE_TILE_WORLD, VILLAGE_UNLOCK_LEVEL } from "./buildings";
import { getItem } from "./items";
import {
  loadSettings,
  saveSettings,
  getQuality,
  applyRendererSettings,
  applySceneFog,
  applyLightShadows,
  type Settings,
} from "./settings";
import { createLoadingProgress } from "./loader";
import { createSettingsPanel } from "./settingsPanel";

registerSW({ immediate: true });

const loading = createLoadingProgress();
await loading.set(2, "Loading settings");
let settings: Settings = loadSettings();
let quality = getQuality(settings);
await loading.set(6, "Detecting hardware");

/* -------------------------------------------------------------------- */
/*                          Player profile                              */
/* -------------------------------------------------------------------- */

async function bootProfile(): Promise<PlayerProfile> {
  const saved = loadProfile();
  if (saved) {
    return saved;
  }
  const sel = await showCharacterCreate();
  return makeFreshProfile(sel.name, sel.race as RaceId, sel.cls as ClassId);
}

function makeFreshProfile(
  name: string,
  race: RaceId,
  cls: ClassId,
): PlayerProfile {
  const inv = newInventory();
  // Starter mats / consumables.
  addItem(inv, "pot_minor_heal", 5);
  addItem(inv, "pot_minor_mana", 3);
  addItem(inv, "mat_wood_log", 8);
  addItem(inv, "mat_stone_block", 4);
  addItem(inv, "mat_iron_ore", 3);
  addItem(inv, "lootbox_common", 1);
  // Class starter weapon.
  if (cls === "warrior") addItem(inv, "weapon_iron_sword", 1);
  if (cls === "rogue") addItem(inv, "weapon_dagger", 1);
  if (cls === "mage") addItem(inv, "weapon_oak_staff", 1);
  return {
    name,
    race,
    class: cls,
    advanced: null,
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 80,
    inventory: inv,
    quests: [],
    village: null,
    pos: [
      CITIES[startCityForRace(race)].center[0],
      CITIES[startCityForRace(race)].center[1] + 8,
    ],
    spiritChargeLeft: 0,
    manaChargeLeft: 0,
    castle: null,
  };
}

/* -------------------------------------------------------------------- */
/*                              Boot                                    */
/* -------------------------------------------------------------------- */

await loading.set(10, "Loading hero profile");
const profile = await bootProfile();
// Character-creation overlay hides the loading screen; restore it for world build.
loading.show();
await loading.set(20, "Forging the realm");

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
applyRendererSettings(renderer, quality);

const world = createWorld({
  treeCount: quality.treeCount,
  rockCount: quality.rockCount,
  groundNoiseParticles: quality.groundNoiseParticles,
});
const scene = world.scene;
applySceneFog(scene, quality);
applyLightShadows(world.sun, quality);
await loading.set(45, "Carving cities and castle");

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1200,
);
const cameraOffset = new THREE.Vector3(0, 28, 22);
const cameraLookAhead = new THREE.Vector3();

const player = createPlayer(scene, {
  race: RACES[profile.race],
  name: profile.name,
  baseStats: {
    hp: 200,
    hpMax: 200,
    mp: 100,
    mpMax: 100,
    attack: 18,
    defense: 6,
    attackRange: 2.0,
    attackSpeed: 1.6,
  },
});
player.position.set(profile.pos[0], 0, profile.pos[1]);
player.level = profile.level;

// Apply race stat bonuses.
const raceBonus = RACES[profile.race].statBonus;
for (const k of Object.keys(raceBonus) as (keyof typeof raceBonus)[]) {
  const v = raceBonus[k];
  if (typeof v === "number") {
    (player.stats as unknown as Record<string, number>)[k] =
      ((player.stats as unknown as Record<string, number>)[k] || 0) + v;
  }
}
player.stats.hp = player.stats.hpMax;
player.stats.mp = player.stats.mpMax;

const skills = createSkillBook();
const xpState = newXPState();
xpState.xp = profile.xp;
xpState.toNext = profile.xpToNext;

// Initialize castle state.
if (!profile.castle) {
  profile.castle = newCastleState();
}

/* -------------------------------------------------------------------- */
/*                              Mobs                                    */
/* -------------------------------------------------------------------- */

const enemies: Entity[] = [];

function spawnMobsForBiome(biomeId: keyof typeof BIOMES) {
  const biome = BIOMES[biomeId];
  for (const mobId of biome.mobs) {
    const count = quality.mobsPerBiome;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * (biome.radius - 8);
      const x = biome.center[0] + Math.cos(ang) * r;
      const z = biome.center[1] + Math.sin(ang) * r;
      const e = createMob(scene, mobId, new THREE.Vector3(x, 0, z));
      if (e) enemies.push(e);
    }
  }
}

for (const id of Object.keys(BIOMES) as (keyof typeof BIOMES)[]) {
  spawnMobsForBiome(id);
}
await loading.set(60, "Summoning monsters");

/* -------------------------------------------------------------------- */
/*                              Bot players                             */
/* -------------------------------------------------------------------- */

const botDefs = generateBots(7331).slice(0, quality.botCount);
const bots: { entity: Entity; def: (typeof botDefs)[number]; nextWanderAt: number }[] = [];
for (const def of botDefs) {
  const city = CITIES[def.homeCity];
  const ang = Math.random() * Math.PI * 2;
  const r = (city.radius ?? 30) + Math.random() * 30;
  const pos = new THREE.Vector3(
    city.center[0] + Math.cos(ang) * r,
    0,
    city.center[1] + Math.sin(ang) * r,
  );
  const e = createBotPlayer(scene, pos, def.color, def.name, def.level);
  bots.push({ entity: e, def, nextWanderAt: 0 });
}
await loading.set(75, "Bringing players online");

/* -------------------------------------------------------------------- */
/*                              NPCs                                    */
/* -------------------------------------------------------------------- */

interface NPCEntity {
  id: string;
  group: THREE.Group;
  pos: THREE.Vector3;
}
const npcEntities: NPCEntity[] = [];
for (const npc of NPC_LIST) {
  const grp = buildNpcMarker(npc.kind);
  grp.position.set(npc.pos[0], 0, npc.pos[1]);
  scene.add(grp);
  npcEntities.push({ id: npc.id, group: grp, pos: grp.position });
}

function buildNpcMarker(kind: string): THREE.Group {
  const g = new THREE.Group();
  const colorMap: Record<string, number> = {
    merchant: 0xffd76a,
    quest: 0x8ad6ff,
    trainer: 0xff9a6a,
    crafting: 0x9aff8a,
    guard: 0xc0c0d0,
  };
  const c = colorMap[kind] ?? 0xefe6c8;
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3a26 }),
  );
  post.position.y = 0.8;
  post.castShadow = true;
  g.add(post);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 8),
    new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }),
  );
  top.position.y = 1.8;
  g.add(top);
  return g;
}

/* -------------------------------------------------------------------- */
/*                              HUD                                     */
/* -------------------------------------------------------------------- */

const hud = createHUD();
hud.setPlayer(player);
hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
hud.updateSkills(skills, player.stats.mp);

const panels = createPanels(profile, {
  log: (m, k) => hud.log(m, k),
  refresh: () => {
    hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
  },
});

const settingsPanel = createSettingsPanel(settings, {
  log: (m, k) => hud.log(m, k),
  onApply(next, requiresReload) {
    settings = next;
    quality = getQuality(next);
    saveSettings(next);
    if (requiresReload) {
      // Reload to rebuild world with new density/shadows.
      setTimeout(() => window.location.reload(), 600);
      return;
    }
    // Live runtime tweaks (no reload needed).
    applyRendererSettings(renderer, quality);
    applySceneFog(scene, quality);
    applyLightShadows(world.sun, quality);
  },
});

const effects: Effect[] = [];

const hooks = {
  onDamage(target: Entity, amount: number, isCrit: boolean) {
    hud.spawnFloat(
      {
        worldPos: target.position,
        text: String(amount),
        type: isCrit ? "crit" : "dmg",
      },
      camera,
    );
    if (target === player) {
      hud.log(`You take ${amount} damage`, "dmg");
    }
  },
  onHeal(target: Entity, amount: number) {
    hud.spawnFloat(
      { worldPos: target.position, text: `+${amount}`, type: "heal" },
      camera,
    );
    if (target === player) hud.log(`You are healed for ${amount}`, "heal");
  },
  onKill(killer: Entity, victim: Entity) {
    if (killer === player) {
      const r = grantXP(player, xpState, victim);
      hud.log(`Defeated ${victim.name} (+${r.xpGained} XP)`, "xp");
      if (r.leveledUp) {
        hud.log(`Level up! You are now Lv. ${player.level}`, "system");
        if (player.level === ADVANCED_CLASS_LEVEL && !profile.advanced) {
          void showAdvancedClassChoice(profile.class).then((id) => {
            profile.advanced = id as PlayerProfile["advanced"];
            hud.log(`Mastered ${id}!`, "system");
          });
        }
        if (player.level === VILLAGE_UNLOCK_LEVEL && !profile.village) {
          hud.log(
            `Village Builder unlocked. Press B to start your village.`,
            "system",
          );
        }
      }
      // Drops.
      if (victim.mobKind) {
        rollMobDrops(victim.mobKind);
      }
      // Quest progress.
      if (victim.mobKind) {
        const completed = progressKill(profile.quests, victim.mobKind);
        for (const def of completed) {
          hud.log(`Quest ready: ${def.name}`, "xp");
        }
      }
      if (player.attackTarget === victim) player.attackTarget = null;
    } else if (victim === player) {
      hud.log(`You were defeated by ${killer.name}`, "system");
      respawnPlayer();
    }
    if (victim !== player) {
      victim.group.visible = false;
    }
  },
};

function rollMobDrops(mobKind: string) {
  const t = MOBS[mobKind];
  if (!t) return;
  const droppedGold = Math.floor(5 + Math.random() * 25 * t.level);
  profile.gold += droppedGold;
  hud.log(`+${droppedGold} gold`, "xp");
  for (const drop of t.drops) {
    if (Math.random() < drop.chance) {
      const count = drop.count
        ? Math.floor(drop.count[0] + Math.random() * (drop.count[1] - drop.count[0] + 1))
        : 1;
      const def = getItem(drop.itemId);
      if (!def) continue;
      const leftover = addItem(profile.inventory, drop.itemId, count);
      const got = count - leftover;
      if (got > 0) {
        hud.log(`+${got}× ${def.name}`, "xp");
      }
    }
  }
  if (t.lootboxChance && Math.random() < t.lootboxChance.chance) {
    const def = getItem(t.lootboxChance.id);
    if (def) {
      addItem(profile.inventory, t.lootboxChance.id, 1);
      hud.log(`Found a ${def.name}!`, "xp");
    }
  }
  // Quest collect progress.
  const completed = progressCollect(profile.quests, (id) => {
    let n = 0;
    for (const s of profile.inventory.bag) if (s && s.itemId === id) n += s.count;
    return n;
  });
  for (const def of completed) {
    hud.log(`Quest ready: ${def.name}`, "xp");
  }
}
function respawnPlayer() {
  const home = CITIES[startCityForRace(profile.race)];
  player.position.set(home.center[0], 0, home.center[1] + 8);
  player.stats.hp = player.stats.hpMax;
  player.stats.mp = player.stats.mpMax;
  player.alive = true;
  player.attackTarget = null;
  player.moveTarget = null;
  hud.log(`You respawned in ${home.name}.`, "system");
}

/* -------------------------------------------------------------------- */
/*                          Pointer / input                             */
/* -------------------------------------------------------------------- */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

interface PointerHit {
  point: THREE.Vector3 | null;
  enemy: Entity | null;
  npcId: string | null;
  bot: Entity | null;
}

function pointerToWorld(clientX: number, clientY: number): PointerHit {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const enemyMeshes: THREE.Object3D[] = [];
  for (const e of enemies) if (e.alive) enemyMeshes.push(e.group);
  const enemyHits = raycaster.intersectObjects(enemyMeshes, true);
  if (enemyHits.length > 0) {
    let g: THREE.Object3D | null = enemyHits[0].object;
    while (g && g.parent && !enemies.find((e) => e.group === g)) {
      g = g.parent;
    }
    const found = enemies.find((e) => e.group === g) ?? null;
    if (found && found.alive) {
      return {
        point: enemyHits[0].point,
        enemy: found,
        npcId: null,
        bot: null,
      };
    }
  }

  const npcGroups = npcEntities.map((n) => n.group);
  const npcHits = raycaster.intersectObjects(npcGroups, true);
  if (npcHits.length > 0) {
    let g: THREE.Object3D | null = npcHits[0].object;
    while (g && g.parent && !npcEntities.find((n) => n.group === g)) {
      g = g.parent;
    }
    const npc = npcEntities.find((n) => n.group === g) ?? null;
    if (npc) {
      return {
        point: npcHits[0].point,
        enemy: null,
        npcId: npc.id,
        bot: null,
      };
    }
  }

  const botGroups = bots.map((b) => b.entity.group);
  const botHits = raycaster.intersectObjects(botGroups, true);
  if (botHits.length > 0) {
    let g: THREE.Object3D | null = botHits[0].object;
    while (g && g.parent && !bots.find((b) => b.entity.group === g)) {
      g = g.parent;
    }
    const bot = bots.find((b) => b.entity.group === g) ?? null;
    if (bot) {
      return {
        point: botHits[0].point,
        enemy: null,
        npcId: null,
        bot: bot.entity,
      };
    }
  }

  const groundHit = raycaster.intersectObject(world.ground, false);
  if (groundHit.length > 0) {
    return { point: groundHit[0].point, enemy: null, npcId: null, bot: null };
  }
  return { point: null, enemy: null, npcId: null, bot: null };
}

function tryUseSkillByIndex(i: number) {
  const skill = skills[i];
  if (!skill) return;
  const result = tryUseSkill(player, skill, hooks, scene, effects);
  if (!result.used && result.reason) {
    hud.log(`${skill.name}: ${result.reason}`, "system");
  } else if (result.used) {
    hud.log(`Used ${skill.name}`, "system");
  }
}

hud.onSkillClick(tryUseSkillByIndex);
hud.onMenuAction((action) => {
  if (action === "reset") {
    player.level = 1;
    player.stats.hpMax = 200;
    player.stats.mpMax = 100;
    player.stats.attack = 18;
    player.stats.defense = 6;
    player.stats.hp = player.stats.hpMax;
    player.stats.mp = player.stats.mpMax;
    xpState.xp = 0;
    xpState.toNext = 100;
    for (const s of skills) s.cooldownLeft = 0;
    respawnPlayer();
    hud.log("Character reset.", "system");
  } else if (action === "save") {
    syncProfileFromState();
    saveProfile(profile);
    hud.log("Game saved.", "system");
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.panel;
    panels.closeAll();
    if (id === "inventory") panels.showInventory();
    else if (id === "crafting") panels.showCrafting();
    else if (id === "quests") panels.showQuests();
    else if (id === "settings") settingsPanel.toggle();
    else if (id === "building") {
      if (profile.level < VILLAGE_UNLOCK_LEVEL) {
        hud.log(`Village builder unlocks at Lv.${VILLAGE_UNLOCK_LEVEL}`, "system");
        return;
      }
      panels.showBuilding();
      buildModeActive = true;
      canvas.classList.add("build-cursor");
    }
  });
});

let buildModeActive = false;

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 2) {
    player.attackTarget = null;
    return;
  }
  const hit = pointerToWorld(e.clientX, e.clientY);
  if (buildModeActive && hit.point) {
    placeBuildingAt(hit.point);
    return;
  }
  if (hit.npcId) {
    handleNpcInteract(hit.npcId);
    return;
  }
  if (hit.enemy) {
    player.attackTarget = hit.enemy;
    player.moveTarget = hit.enemy.position.clone();
    hud.log(`Targeted ${hit.enemy.name}`, "system");
  } else if (hit.bot) {
    hud.log(`${hit.bot.name} (Lv.${hit.bot.level}) — fellow adventurer.`, "system");
  } else if (hit.point) {
    player.attackTarget = null;
    player.moveTarget = hit.point.clone();
  }
});

function handleNpcInteract(npcId: string) {
  const npc = getNPC(npcId);
  if (!npc) return;
  const dist = Math.hypot(
    player.position.x - npc.pos[0],
    player.position.z - npc.pos[1],
  );
  if (dist > 4.5) {
    player.moveTarget = new THREE.Vector3(npc.pos[0], 0, npc.pos[1]);
    hud.log(`Walking to ${npc.name}...`, "system");
    return;
  }
  if (npc.kind === "merchant" && npc.shop) {
    panels.closeAll();
    panels.showShop(npc.name, npc.shop);
  } else if (npc.kind === "quest" && npc.questIds) {
    for (const qid of npc.questIds) {
      const def = getQuest(qid);
      if (!def) continue;
      const known = profile.quests.find((q) => q.questId === qid);
      if (known) {
        if (known.status === "complete") {
          // Turn in.
          known.status = "turnedIn";
          xpState.xp += def.rewards.xp;
          profile.gold += def.rewards.gold;
          for (const r of def.rewards.items ?? []) {
            addItem(profile.inventory, r.itemId, r.count);
          }
          hud.log(`Turned in: ${def.name} (+${def.rewards.xp} XP, +${def.rewards.gold} gold)`, "xp");
          // Apply XP level-ups now.
          while (xpState.xp >= xpState.toNext) {
            xpState.xp -= xpState.toNext;
            player.level += 1;
            xpState.toNext = Math.round(xpState.toNext * 1.55);
            player.stats.hpMax += 30;
            player.stats.mpMax += 12;
            player.stats.attack += 3;
            player.stats.defense += 1;
            player.stats.hp = player.stats.hpMax;
            player.stats.mp = player.stats.mpMax;
            hud.log(`Level up! You are now Lv. ${player.level}`, "system");
          }
          continue;
        }
      } else if (profile.level >= def.levelReq) {
        profile.quests.push({ questId: qid, status: "active", progress: 0 });
        hud.log(`Accepted: ${def.name}`, "system");
      }
    }
    panels.showQuests();
  } else if (npc.kind === "crafting") {
    panels.closeAll();
    panels.showCrafting();
  } else if (npc.kind === "trainer") {
    hud.log(`${npc.name} hones your form. (+1 atk, +1 def)`, "xp");
    player.stats.attack += 1;
    player.stats.defense += 1;
  } else if (npc.kind === "guard") {
    hud.log(`${npc.name}: "Stand vigilant. Sieges come every 7 minutes."`, "system");
  }
}

function placeBuildingAt(point: THREE.Vector3) {
  if (!profile.village) {
    profile.village = {
      origin: [profile.pos[0] - 24, profile.pos[1] - 24],
      buildings: [],
    };
  }
  // Snap to grid.
  const tx = Math.round((point.x - profile.village.origin[0]) / VILLAGE_TILE_WORLD);
  const tz = Math.round((point.z - profile.village.origin[1]) / VILLAGE_TILE_WORLD);
  const sel = (panels as unknown as { _selected?: string })._selected;
  void sel;
  // Read selected from DOM via window state — we stored it in panels. As a
  // fallback, place "house" if nothing selected.
  const buildingId =
    (document.querySelector(".build-row.selected") as HTMLElement | null)?.querySelector(
      ".build-name",
    )?.textContent || "Cottage";
  const kind =
    Object.values(BUILDINGS).find((b) => b.name === buildingId)?.id || "house";
  const def = BUILDINGS[kind];
  // Check costs.
  for (const c of def.cost) {
    let have = 0;
    for (const s of profile.inventory.bag) if (s && s.itemId === c.itemId) have += s.count;
    if (have < c.count) {
      hud.log(`Need more ${c.itemId} for ${def.name}`, "system");
      return;
    }
  }
  for (const c of def.cost) {
    let remaining = c.count;
    for (let i = 0; i < profile.inventory.bag.length && remaining > 0; i++) {
      const s = profile.inventory.bag[i];
      if (!s || s.itemId !== c.itemId) continue;
      const take = Math.min(s.count, remaining);
      s.count -= take;
      remaining -= take;
      if (s.count <= 0) profile.inventory.bag[i] = null;
    }
  }
  const pb: PlacedBuilding = { kind, x: tx, z: tz, rot: 0 };
  profile.village.buildings.push(pb);
  spawnPlacedBuilding(pb);
  hud.log(`Built ${def.name}`, "xp");
}

function spawnPlacedBuilding(pb: PlacedBuilding) {
  if (!profile.village) return;
  const wx = profile.village.origin[0] + pb.x * VILLAGE_TILE_WORLD;
  const wz = profile.village.origin[1] + pb.z * VILLAGE_TILE_WORLD;
  const colors: Record<string, number> = {
    house: 0xc8b08c,
    wall: 0x8c8c8c,
    tower: 0x9a8866,
    farm: 0x6e8a3e,
    workshop: 0x6c4220,
    well: 0x707070,
    lamp: 0xffd76a,
  };
  const c = colors[pb.kind] ?? 0xc0c0c0;
  const def = BUILDINGS[pb.kind];
  const sx = def.tile[0] * VILLAGE_TILE_WORLD * 0.85;
  const sz = def.tile[1] * VILLAGE_TILE_WORLD * 0.85;
  const sy = pb.kind === "tower" ? 6 : pb.kind === "lamp" ? 2.5 : pb.kind === "wall" ? 2 : 2.4;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshLambertMaterial({ color: c }),
  );
  m.position.set(wx, sy / 2, wz);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

if (profile.village) {
  for (const pb of profile.village.buildings) {
    spawnPlacedBuilding(pb);
  }
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key >= "1" && e.key <= "5") {
    tryUseSkillByIndex(parseInt(e.key, 10) - 1);
  } else if (e.key === "Escape") {
    if (buildModeActive) {
      buildModeActive = false;
      canvas.classList.remove("build-cursor");
    }
    player.attackTarget = null;
    player.moveTarget = null;
    panels.closeAll();
  } else if (e.key === "i" || e.key === "I") {
    panels.closeAll();
    panels.showInventory();
  } else if (e.key === "c" || e.key === "C") {
    panels.closeAll();
    panels.showCrafting();
  } else if (e.key === "q" || e.key === "Q") {
    panels.closeAll();
    panels.showQuests();
  } else if (e.key === "b" || e.key === "B") {
    if (profile.level >= VILLAGE_UNLOCK_LEVEL) {
      panels.closeAll();
      panels.showBuilding();
      buildModeActive = true;
      canvas.classList.add("build-cursor");
    } else {
      hud.log(`Village builder unlocks at Lv.${VILLAGE_UNLOCK_LEVEL}`, "system");
    }
  } else if (e.key === "s" || e.key === "S") {
    panels.closeAll();
    settingsPanel.toggle();
  }
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

/* -------------------------------------------------------------------- */
/*                          Game loop                                   */
/* -------------------------------------------------------------------- */

let lastTime = performance.now() / 1000;
let lastSaveAt = performance.now();
const _vec = new THREE.Vector3();

function syncProfileFromState() {
  profile.level = player.level;
  profile.xp = xpState.xp;
  profile.xpToNext = xpState.toNext;
  profile.pos = [player.position.x, player.position.z];
}

function updateChargeUI(dt: number) {
  if (profile.spiritChargeLeft > 0) {
    profile.spiritChargeLeft = Math.max(0, profile.spiritChargeLeft - dt);
  }
  if (profile.manaChargeLeft > 0) {
    profile.manaChargeLeft = Math.max(0, profile.manaChargeLeft - dt);
  }
  const sEl = document.getElementById("spirit-charge");
  const mEl = document.getElementById("mana-charge");
  const sT = document.getElementById("spirit-time");
  const mT = document.getElementById("mana-time");
  if (sEl && sT) {
    if (profile.spiritChargeLeft > 0) {
      sEl.classList.remove("hidden");
      sT.textContent = profile.spiritChargeLeft.toFixed(0);
    } else {
      sEl.classList.add("hidden");
    }
  }
  if (mEl && mT) {
    if (profile.manaChargeLeft > 0) {
      mEl.classList.remove("hidden");
      mT.textContent = profile.manaChargeLeft.toFixed(0);
    } else {
      mEl.classList.add("hidden");
    }
  }
  const goldEl = document.getElementById("player-gold");
  if (goldEl) goldEl.textContent = `⛀ ${profile.gold}`;
}

function updateBots(dt: number, now: number) {
  for (const b of bots) {
    if (now >= b.nextWanderAt) {
      b.nextWanderAt = now + 4 + Math.random() * 4;
      const home = CITIES[b.def.homeCity];
      const ang = Math.random() * Math.PI * 2;
      const r = (home.radius ?? 30) + Math.random() * 30;
      b.entity.moveTarget = new THREE.Vector3(
        home.center[0] + Math.cos(ang) * r,
        0,
        home.center[1] + Math.sin(ang) * r,
      );
    }
    if (b.entity.moveTarget) {
      const dir = _vec
        .subVectors(b.entity.moveTarget, b.entity.position)
        .setY(0);
      const dist = dir.length();
      if (dist < 0.5) {
        b.entity.moveTarget = null;
      } else {
        dir.normalize();
        b.entity.position.x += dir.x * 2.6 * dt;
        b.entity.position.z += dir.z * 2.6 * dt;
        b.entity.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
    bobAnimation(b.entity, now);
  }
}

function updateCastleUI() {
  const banner = document.getElementById("castle-banner");
  const ctrl = document.getElementById("castle-controller");
  const tmr = document.getElementById("castle-timer");
  if (!banner || !ctrl || !tmr || !profile.castle) return;
  banner.classList.remove("hidden");
  ctrl.textContent = profile.castle.controllerName;
  const remaining = Math.max(0, profile.castle.nextSiegeAt - Date.now());
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining / 1000) % 60);
  tmr.textContent = `Next siege: ${m}m ${s}s`;
}

function updateZoneLabel() {
  const el = document.getElementById("minimap-zone");
  if (!el) return;
  const b = biomeAt(player.position.x, player.position.z);
  if (b) el.textContent = b.name;
  else {
    // City label?
    let name: string | null = null;
    for (const c of Object.values(CITIES)) {
      const dx = player.position.x - c.center[0];
      const dz = player.position.z - c.center[1];
      if (dx * dx + dz * dz <= c.radius * c.radius) {
        name = c.name;
        break;
      }
    }
    el.textContent = name ?? "Wilderness";
  }
}

// Periodic siege event spawn.
let nextSiegeCheck = Date.now() + 10_000;
function maybeStartSiege() {
  if (!profile.castle) return;
  if (Date.now() < profile.castle.nextSiegeAt) return;
  // Spawn a wave of pvp bot enemies near the castle.
  const cd = CASTLES["castle.crown"];
  const center = new THREE.Vector3(cd.center[0], 0, cd.center[1] + 18);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const e = createMob(
      scene,
      profile.castle.control === "player" ? "skeleton" : "ash_imp",
      center.clone().add(new THREE.Vector3(Math.cos(ang) * 14, 0, Math.sin(ang) * 14)),
    );
    if (e) {
      e.name = profile.castle.control === "player" ? "Rival Knight" : "Garrison Knight";
      enemies.push(e);
    }
  }
  hud.log("A siege wave has spawned at the Crown of the Five!", "system");
  profile.castle.nextSiegeAt = Date.now() + SIEGE_INTERVAL_MS;
}

function tickCastleZone() {
  if (!profile.castle) return;
  const cd = CASTLES["castle.crown"];
  const dx = player.position.x - cd.center[0];
  const dz = player.position.z - cd.center[1] - 18;
  const inside = dx * dx + dz * dz < 14 * 14;
  if (!inside) return;
  // If there are no hostile enemies near castle, reduce castle hp (player conquering).
  let hostile = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    const ddx = e.position.x - cd.center[0];
    const ddz = e.position.z - (cd.center[1] + 18);
    if (ddx * ddx + ddz * ddz < 16 * 16) hostile++;
  }
  if (hostile === 0 && profile.castle.control !== "player") {
    profile.castle.hp = Math.max(0, profile.castle.hp - 60 * 0.016);
    if (profile.castle.hp <= 0) {
      captureCastle(profile.castle, profile.name);
      hud.log("You captured the Crown of the Five!", "xp");
    }
  }
}

function tick() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - lastTime);
  lastTime = now;

  tickSkills(skills, dt);
  tickEffects(scene, effects, dt);
  updateChargeUI(dt);
  updateBots(dt, now);
  updateCastleUI();
  updateZoneLabel();
  if (Date.now() > nextSiegeCheck) {
    nextSiegeCheck = Date.now() + 5_000;
    maybeStartSiege();
  }
  tickCastleZone();

  if (player.attackTarget && !player.attackTarget.alive) {
    player.attackTarget = null;
  }

  if (player.alive) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    const t = player.attackTarget;
    if (t && t.alive) {
      const d = player.position.distanceTo(t.position);
      if (d <= player.stats.attackRange) {
        player.moveTarget = null;
        if (player.attackCooldown <= 0) {
          // Apply spirit charge buff.
          let baseDamage: number | undefined;
          if (profile.spiritChargeLeft > 0) {
            baseDamage = Math.max(
              1,
              (player.stats.attack - t.stats.defense * 0.5) * 1.5,
            );
            profile.spiritChargeLeft = 0;
          }
          // Apply equipment bonuses on the fly so stat changes persist.
          performAttack(player, t, hooks, baseDamage);
          player.attackCooldown = player.stats.attackSpeed;
          const dir = new THREE.Vector3()
            .subVectors(t.position, player.position)
            .normalize();
          player.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      } else {
        player.moveTarget = t.position.clone();
      }
    }
    if (player.stats.mp < player.stats.mpMax) {
      player.stats.mp = Math.min(
        player.stats.mpMax,
        player.stats.mp + 2 * dt,
      );
    }
    if (player.stats.hp < player.stats.hpMax && !t) {
      player.stats.hp = Math.min(
        player.stats.hpMax,
        player.stats.hp + 1.5 * dt,
      );
    }
    moveEntity(player, 6, dt, world.obstacleBoxes);
    bobAnimation(player, now);
  }

  for (const enemy of enemies) {
    if (!enemy.alive) {
      if (enemy.respawn && now >= enemy.respawn.at && enemy.respawn.at > 0) {
        enemy.alive = true;
        enemy.stats.hp = enemy.stats.hpMax;
        enemy.position.copy(enemy.respawn.spawn);
        enemy.group.visible = true;
        enemy.attackTarget = null;
        enemy.moveTarget = null;
        updateHpBar(enemy);
      }
      continue;
    }
    tickEnemyAI(enemy, player, dt, hooks);
    moveEntity(enemy, 3.2, dt, world.obstacleBoxes);
    bobAnimation(enemy, now * (0.7 + (enemy.id.length % 3) * 0.1));
  }

  if (player.stats.hp <= 0 && player.alive) {
    player.alive = false;
    hooks.onKill(
      enemies.find((e) => e.attackTarget === player) ?? player,
      player,
    );
    applyHeal(player, player.stats.hpMax, hooks);
  }

  cameraLookAhead.copy(player.position);
  const camTarget = cameraLookAhead.clone().add(cameraOffset);
  camera.position.lerp(camTarget, 0.12);
  camera.lookAt(cameraLookAhead);
  world.sun.position.copy(player.position).add(new THREE.Vector3(40, 60, 25));
  world.sun.target.position.copy(player.position);

  hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
  hud.updateTargetStats(player.attackTarget);
  hud.updateSkills(skills, player.stats.mp);
  hud.drawMinimap(player, enemies);
  panels.refreshAll();

  // Castle daily tax.
  if (profile.castle) {
    const out = tickCastle(profile.castle, CASTLES["castle.crown"].dailyTax);
    if (out.taxPaid > 0) {
      profile.gold += out.taxPaid;
      hud.log(`+${out.taxPaid} gold from castle taxes!`, "xp");
    }
  }

  // Auto save every 20 seconds.
  if (performance.now() - lastSaveAt > 20_000) {
    lastSaveAt = performance.now();
    syncProfileFromState();
    saveProfile(profile);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

async function start() {
  await loading.set(95, "Preparing your hero");
  hud.show();
  await loading.set(100, "Ready");
  await loading.hide();
  hud.log(`Welcome, ${profile.name} the ${RACES[profile.race].name} ${CLASSES[profile.class].name}.`, "system");
  hud.log("Click to move. Click an NPC (gold = merchant, blue = quest, orange = trainer).", "system");
  hud.log("Hotkeys: I bag · C craft · Q quests · B build · 1-5 skills · S settings.", "system");
  hud.log(`Graphics: ${quality.name.toUpperCase()} (auto-detected). Press S to change.`, "system");
  // Auto-grant quests at level zero list.
  void QUESTS;
  // Apply equipment bonuses to player stats once.
  const eqBonus = equipmentBonuses(profile.inventory);
  for (const k of Object.keys(eqBonus) as (keyof typeof eqBonus)[]) {
    const v = eqBonus[k];
    if (typeof v === "number") {
      (player.stats as unknown as Record<string, number>)[k] =
        ((player.stats as unknown as Record<string, number>)[k] || 0) + v;
    }
  }
  player.stats.hp = player.stats.hpMax;
  player.stats.mp = player.stats.mpMax;
  void BOT_COUNT;
  void CASTLE_HP_MAX;
  requestAnimationFrame(tick);
}

camera.position.copy(player.position).add(cameraOffset);
camera.lookAt(player.position);

// Ensure obstacles ignore non-collidable areas.
void isInsideObstacle;

void start();
