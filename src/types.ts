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

export type EntityKind = "player" | "enemy";

export interface EntityRig {
  body: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weapon?: THREE.Object3D;
  weaponPivot?: THREE.Group;
  cape?: THREE.Mesh;
  bodyMaterials: THREE.MeshLambertMaterial[];
}

export type AnimState = "idle" | "walk" | "attack" | "cast" | "hit" | "death";

export interface AnimController {
  state: AnimState;
  stateTime: number;
  attackProgress: number;
  castProgress: number;
  hitFlash: number;
  swingDir: 1 | -1;
}

export interface PlayerProgress {
  classId: string;
  learned: Set<string>;
  skillPoints: number;
  /** active timed buffs (id -> {until, mult, type}) */
  buffs: Record<string, { until: number; data: Record<string, number> }>;
}

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
  rig?: EntityRig;
  anim?: AnimController;
  bobTime?: number;
  progress?: PlayerProgress;
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
