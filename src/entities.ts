import * as THREE from "three";
import type { AIState, Entity, Stats } from "./types";

let nextId = 1;

function makeHpBarSprite(): { bg: THREE.Sprite; fill: THREE.Sprite } {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 64;
  bgCanvas.height = 8;
  const bgCtx = bgCanvas.getContext("2d")!;
  bgCtx.fillStyle = "rgba(0,0,0,0.85)";
  bgCtx.fillRect(0, 0, 64, 8);
  bgCtx.strokeStyle = "#2a2418";
  bgCtx.lineWidth = 1;
  bgCtx.strokeRect(0.5, 0.5, 63, 7);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: bgTex, depthTest: false, transparent: true }),
  );
  bg.scale.set(2.0, 0.25, 1);
  bg.renderOrder = 999;

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = 62;
  fillCanvas.height = 6;
  const fctx = fillCanvas.getContext("2d")!;
  const grad = fctx.createLinearGradient(0, 0, 0, 6);
  grad.addColorStop(0, "#ff7070");
  grad.addColorStop(1, "#a82525");
  fctx.fillStyle = grad;
  fctx.fillRect(0, 0, 62, 6);
  const fillTex = new THREE.CanvasTexture(fillCanvas);
  fillTex.colorSpace = THREE.SRGBColorSpace;
  const fillMat = new THREE.SpriteMaterial({
    map: fillTex,
    depthTest: false,
    transparent: true,
  });
  const fill = new THREE.Sprite(fillMat);
  fill.scale.set(1.94, 0.18, 1);
  fill.center.set(0, 0.5);
  fill.position.x = -0.97;
  fill.renderOrder = 1000;

  return { bg, fill };
}

function buildHumanoidMesh(palette: {
  body: number;
  accent: number;
  head: number;
}): THREE.Group {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: palette.body });
  const accentMat = new THREE.MeshLambertMaterial({ color: palette.accent });
  const headMat = new THREE.MeshLambertMaterial({ color: palette.head });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), bodyMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  g.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.55), accentMat);
  belt.position.y = 0.75;
  belt.castShadow = true;
  g.add(belt);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.4), accentMat);
  legL.position.set(-0.22, 0.43, 0);
  legL.castShadow = true;
  g.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.22;
  g.add(legR);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.85, 0.3), bodyMat);
  armL.position.set(-0.55, 1.2, 0);
  armL.castShadow = true;
  g.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.55;
  g.add(armR);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), headMat);
  head.position.y = 2.0;
  head.castShadow = true;
  g.add(head);

  const facing = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  facing.position.set(0, 2.05, 0.3);
  g.add(facing);

  return g;
}

function defaultStats(): Stats {
  return {
    hp: 100,
    hpMax: 100,
    mp: 50,
    mpMax: 50,
    attack: 14,
    defense: 4,
    attackRange: 2.0,
    attackSpeed: 1.6,
  };
}

export function createPlayer(scene: THREE.Scene): Entity {
  const group = buildHumanoidMesh({
    body: 0x3a5e9e,
    accent: 0x6e4a1e,
    head: 0xddc7a8,
  });

  const cape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 1.1),
    new THREE.MeshLambertMaterial({
      color: 0x9a2828,
      side: THREE.DoubleSide,
    }),
  );
  cape.position.set(0, 1.25, -0.3);
  cape.rotation.x = -0.05;
  cape.castShadow = true;
  group.add(cape);

  const sword = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.2, 0.04),
    new THREE.MeshLambertMaterial({ color: 0xc0c0d0 }),
  );
  sword.position.set(0.65, 1.4, 0.25);
  sword.rotation.x = -0.6;
  sword.castShadow = true;
  group.add(sword);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.06, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x8a6a1e }),
  );
  guard.position.copy(sword.position);
  guard.position.y -= 0.55;
  guard.rotation.copy(sword.rotation);
  group.add(guard);

  scene.add(group);

  const stats = defaultStats();
  stats.hp = 200;
  stats.hpMax = 200;
  stats.mp = 100;
  stats.mpMax = 100;
  stats.attack = 18;
  stats.defense = 6;

  const e: Entity = {
    id: `player-${nextId++}`,
    kind: "player",
    name: "Adventurer",
    level: 1,
    stats,
    group,
    position: group.position,
    velocity: new THREE.Vector3(),
    target: null,
    moveTarget: null,
    attackTarget: null,
    attackCooldown: 0,
    alive: true,
  };
  return e;
}

export interface EnemyTemplate {
  name: string;
  level: number;
  palette: { body: number; accent: number; head: number };
  scale: number;
  stats: Stats;
  xpReward: number;
}

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  goblin: {
    name: "Goblin Scout",
    level: 2,
    palette: { body: 0x5a7a32, accent: 0x382818, head: 0x6b8a3a },
    scale: 0.85,
    stats: {
      hp: 45,
      hpMax: 45,
      mp: 0,
      mpMax: 0,
      attack: 8,
      defense: 2,
      attackRange: 1.6,
      attackSpeed: 1.4,
    },
    xpReward: 30,
  },
  orc: {
    name: "Orc Warrior",
    level: 5,
    palette: { body: 0x4a3a28, accent: 0x2a1a0a, head: 0x8a6a3a },
    scale: 1.1,
    stats: {
      hp: 110,
      hpMax: 110,
      mp: 0,
      mpMax: 0,
      attack: 16,
      defense: 5,
      attackRange: 1.9,
      attackSpeed: 2.0,
    },
    xpReward: 80,
  },
  wolf: {
    name: "Dire Wolf",
    level: 3,
    palette: { body: 0x40342a, accent: 0x281e16, head: 0x40342a },
    scale: 0.9,
    stats: {
      hp: 65,
      hpMax: 65,
      mp: 0,
      mpMax: 0,
      attack: 12,
      defense: 2,
      attackRange: 1.6,
      attackSpeed: 1.1,
    },
    xpReward: 45,
  },
};

export function createEnemy(
  scene: THREE.Scene,
  templateKey: keyof typeof ENEMY_TEMPLATES,
  spawn: THREE.Vector3,
): Entity {
  const template = ENEMY_TEMPLATES[templateKey];
  const group = buildHumanoidMesh(template.palette);
  group.scale.setScalar(template.scale);
  group.position.copy(spawn);
  scene.add(group);

  const hpBar = makeHpBarSprite();
  hpBar.bg.position.set(0, 2.8 * template.scale, 0);
  hpBar.fill.position.set(-0.97, 2.8 * template.scale, 0);
  group.add(hpBar.bg);
  group.add(hpBar.fill);

  const ai: AIState = {
    spawn: spawn.clone(),
    aggroRange: 8,
    leashRange: 18,
    patrolRadius: 5,
    nextPatrolAt: 0,
  };

  const e: Entity = {
    id: `${templateKey}-${nextId++}`,
    kind: "enemy",
    name: template.name,
    level: template.level,
    stats: { ...template.stats },
    group,
    position: group.position,
    velocity: new THREE.Vector3(),
    target: null,
    moveTarget: null,
    attackTarget: null,
    attackCooldown: 0,
    alive: true,
    hpBar,
    ai,
    respawn: { at: 0, spawn: spawn.clone() },
  };
  return e;
}

export function getXpReward(e: Entity): number {
  for (const key in ENEMY_TEMPLATES) {
    if (e.name === ENEMY_TEMPLATES[key].name) return ENEMY_TEMPLATES[key].xpReward;
  }
  return 20;
}

export function updateHpBar(e: Entity): void {
  if (!e.hpBar) return;
  const pct = Math.max(0, Math.min(1, e.stats.hp / e.stats.hpMax));
  e.hpBar.fill.scale.x = 1.94 * pct;
}
