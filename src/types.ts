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
