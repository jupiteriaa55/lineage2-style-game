import * as THREE from "three";

export interface Stats {
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  attack: number;
  defense: number;
  attackRange: number;
  attackSpeed: number;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  hotkey: string;
  cooldown: number;
  cooldownLeft: number;
  manaCost: number;
  range: number;
  damage: number;
  heal?: number;
  description: string;
}

export type EntityKind = "player" | "enemy" | "npc";

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  level: number;
  stats: Stats;
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target: Entity | null;
  moveTarget: THREE.Vector3 | null;
  attackTarget: Entity | null;
  attackCooldown: number;
  alive: boolean;
  respawn?: { at: number; spawn: THREE.Vector3 };
  hpBar?: { bg: THREE.Sprite; fill: THREE.Sprite };
  ai?: AIState;
  mobKind?: string;
  npcKind?: NPCKind;
  npcDialogId?: string;
}

export interface AIState {
  spawn: THREE.Vector3;
  aggroRange: number;
  leashRange: number;
  patrolRadius: number;
  nextPatrolAt: number;
}

export interface FloatingTextRequest {
  worldPos: THREE.Vector3;
  text: string;
  type: "dmg" | "crit" | "heal";
}

/* ---------- Race / Class ---------- */

export type RaceId = "human" | "elf" | "darkelf" | "dwarf" | "orc";
export type ClassId = "warrior" | "mage" | "rogue";
export type AdvancedClassId =
  | "knight"
  | "berserker"
  | "archmage"
  | "warlock"
  | "shadowblade"
  | "ranger";

export interface RaceDef {
  id: RaceId;
  name: string;
  description: string;
  startCity: string;
  scale: number;
  palette: {
    skin: number;
    hair: number;
    body: number;
    accent: number;
  };
  ears: "round" | "long" | "short" | "tusks";
  beard: boolean;
  statBonus: Partial<Stats>;
  heightMul: number;
  bodyMul: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  description: string;
  primaryStat: "attack" | "defense" | "magic";
  baseStats: Partial<Stats>;
  startWeapon: string;
  advanced: { id: AdvancedClassId; name: string; description: string }[];
}

/* ---------- Items / Inventory ---------- */

export type ItemRarity = "common" | "uncommon" | "rare" | "epic";
export type ItemKind =
  | "weapon"
  | "armor"
  | "helmet"
  | "gloves"
  | "boots"
  | "ring"
  | "amulet"
  | "material"
  | "consumable"
  | "lootbox";

export type EquipSlot =
  | "weapon"
  | "armor"
  | "helmet"
  | "gloves"
  | "boots"
  | "ring"
  | "amulet";

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: ItemRarity;
  icon: string;
  stack: number;
  description: string;
  equip?: {
    slot: EquipSlot;
    bonus: Partial<Stats>;
  };
  consume?: {
    healHp?: number;
    healMp?: number;
  };
  lootboxId?: string;
  classRestriction?: ClassId[];
  raceRestriction?: RaceId[];
  levelReq?: number;
}

export interface InventoryStack {
  itemId: string;
  count: number;
}

export interface Equipment {
  weapon: string | null;
  armor: string | null;
  helmet: string | null;
  gloves: string | null;
  boots: string | null;
  ring: string | null;
  amulet: string | null;
}

export interface InventoryState {
  bag: (InventoryStack | null)[];
  equipment: Equipment;
  size: number;
}

/* ---------- Crafting ---------- */

export interface RecipeDef {
  id: string;
  name: string;
  result: { itemId: string; count: number };
  inputs: { itemId: string; count: number }[];
  levelReq: number;
  classRestriction?: ClassId[];
}

/* ---------- Lootbox ---------- */

export interface LootboxDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  description: string;
  /** Each entry: an item id with a relative weight. */
  drops: { itemId: string; weight: number; count?: [number, number] }[];
  /** Number of rolls per opening. */
  rolls: number;
}

/* ---------- Mobs ---------- */

export type MobMeshKind = "humanoid" | "quadruped";

export interface MobTemplate {
  id: string;
  name: string;
  level: number;
  /** Biome id this mob spawns in. */
  biome: BiomeId;
  /** Procedural mesh archetype to use when no specific GLB is bound. */
  mesh: MobMeshKind;
  scale: number;
  palette: { primary: number; accent: number; cloth?: number };
  stats: Partial<Stats>;
  xp: number;
  drops: { itemId: string; chance: number; count?: [number, number] }[];
  /** Optional single lootbox drop chance. */
  lootboxChance?: { id: string; chance: number };
}

/* ---------- NPCs ---------- */

export type NPCKind = "merchant" | "quest" | "trainer" | "crafting" | "guard";

export interface NPCDef {
  id: string;
  name: string;
  kind: NPCKind;
  city: string;
  pos: [number, number];
  raceLook: RaceId;
  /** For merchants: items they sell. */
  shop?: { itemId: string; price: number }[];
  /** For merchants: which materials they buy and their price. */
  buys?: { itemId: string; price: number }[];
  questIds?: string[];
  trainsClass?: ClassId;
}

/* ---------- Quests ---------- */

export interface QuestDef {
  id: string;
  name: string;
  giver: string;
  city: string;
  description: string;
  levelReq: number;
  objective:
    | { kind: "kill"; mobId: string; count: number }
    | { kind: "collect"; itemId: string; count: number };
  rewards: {
    xp: number;
    gold: number;
    items?: { itemId: string; count: number }[];
  };
}

export type QuestStatus = "available" | "active" | "complete" | "turnedIn";

export interface QuestState {
  questId: string;
  status: QuestStatus;
  progress: number;
}

/* ---------- Cities / Buildings ---------- */

export interface CityDef {
  id: string;
  name: string;
  /** Center position in world coords */
  center: [number, number];
  /** Race that primarily inhabits the city. */
  race: RaceId | "common";
  /** City radius for placement / zone awareness. */
  radius: number;
  /** Visual palette for buildings. */
  palette: {
    wall: number;
    roof: number;
    accent: number;
    ground: number;
  };
}

export type BuildingKind =
  | "house"
  | "wall"
  | "tower"
  | "farm"
  | "workshop"
  | "well"
  | "lamp";

export interface BuildingDef {
  id: BuildingKind;
  name: string;
  icon: string;
  cost: { itemId: string; count: number }[];
  description: string;
  /** Tile size on the build grid (in tiles). */
  tile: [number, number];
}

/** A placed building in the player's village. */
export interface PlacedBuilding {
  kind: BuildingKind;
  /** Tile coordinate (top-left). */
  x: number;
  z: number;
  /** Y rotation in 90deg steps. */
  rot: number;
}

export interface VillageState {
  /** World-space tile origin (south-west corner). */
  origin: [number, number];
  buildings: PlacedBuilding[];
}

/* ---------- Biomes / Zones ---------- */

export type BiomeId = "forest" | "wasteland" | "mountains" | "graveyard";

export interface BiomeDef {
  id: BiomeId;
  name: string;
  /** World-space center. */
  center: [number, number];
  /** Radius the biome covers. */
  radius: number;
  /** Ground tint and decoration colors. */
  palette: {
    ground: number;
    accent: number;
    fog: number;
  };
  /** Mob ids that spawn in this biome. */
  mobs: string[];
  /** Average mob level here. */
  level: number;
}

/* ---------- Castle / Siege ---------- */

export type CastleControl = "garrison" | "player" | "rival";

export interface CastleDef {
  id: string;
  name: string;
  center: [number, number];
  /** Daily tax in gold paid to the controlling faction. */
  dailyTax: number;
}

export interface CastleState {
  control: CastleControl;
  controllerName: string;
  hp: number;
  hpMax: number;
  /** Unix ms of next siege start. */
  nextSiegeAt: number;
  lastTaxAt: number;
  unpaidTax: number;
}

export type SiegeStatus = "idle" | "active" | "won" | "lost";

export interface SiegeState {
  status: SiegeStatus;
  /** Unix ms when current siege started. */
  startedAt: number;
  /** Wave index in the active siege. */
  wave: number;
  /** Defender HP at start of current wave. */
  defenderHp: number;
}

/* ---------- MMO Bot Players ---------- */

export interface BotPlayerDef {
  id: string;
  name: string;
  race: RaceId;
  class: ClassId;
  level: number;
  /** Home city / spawn point. */
  homeCity: string;
  /** Color tag for minimap. */
  color: number;
}

/* ---------- Save / Player ---------- */

export interface PlayerProfile {
  name: string;
  race: RaceId;
  class: ClassId;
  advanced: AdvancedClassId | null;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  inventory: InventoryState;
  quests: QuestState[];
  village: VillageState | null;
  pos: [number, number];
  /** Number of seconds left on a Spirit Charge buff. */
  spiritChargeLeft: number;
  manaChargeLeft: number;
  castle: CastleState | null;
}
