import * as THREE from "three";
import type {
  AIState,
  AnimController,
  Entity,
  EntityRig,
  Stats,
} from "./types";
import {
  makeFabricTexture,
  makeMetalTexture,
  makeSkinTexture,
} from "./textures";

let nextId = 1;

function makeHpBarSprite(): { bg: THREE.Sprite; fill: THREE.Sprite } {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 64;
  bgCanvas.height = 8;
  const bgCtx = bgCanvas.getContext("2d")!;
  bgCtx.fillStyle = "rgba(0,0,0,0.85)";
  bgCtx.fillRect(0, 0, 64, 8);
  bgCtx.strokeStyle = "#3a2818";
  bgCtx.lineWidth = 1;
  bgCtx.strokeRect(0.5, 0.5, 63, 7);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: bgTex,
      depthTest: false,
      transparent: true,
    }),
  );
  bg.scale.set(2.0, 0.25, 1);
  bg.renderOrder = 999;

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = 62;
  fillCanvas.height = 6;
  const fctx = fillCanvas.getContext("2d")!;
  const grad = fctx.createLinearGradient(0, 0, 0, 6);
  grad.addColorStop(0, "#ff7878");
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

interface HumanoidPalette {
  body: number;
  accent: number;
  head: number;
  bodyTex?: THREE.Texture;
  accentTex?: THREE.Texture;
  headTex?: THREE.Texture;
}

function buildHumanoidRig(palette: HumanoidPalette): {
  group: THREE.Group;
  rig: EntityRig;
} {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial(
    palette.bodyTex
      ? { color: palette.body, map: palette.bodyTex }
      : { color: palette.body },
  );
  const accentMat = new THREE.MeshLambertMaterial(
    palette.accentTex
      ? { color: palette.accent, map: palette.accentTex }
      : { color: palette.accent },
  );
  const headMat = new THREE.MeshLambertMaterial(
    palette.headTex
      ? { color: palette.head, map: palette.headTex }
      : { color: palette.head },
  );

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), bodyMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.6, 0.08),
    accentMat,
  );
  chestPlate.position.set(0, 1.4, 0.32);
  chestPlate.castShadow = true;
  bodyGroup.add(chestPlate);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.6), accentMat);
  belt.position.y = 0.78;
  belt.castShadow = true;
  bodyGroup.add(belt);

  const beltBuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xd4b76a }),
  );
  beltBuckle.position.set(0, 0.78, 0.32);
  bodyGroup.add(beltBuckle);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.55, 0.55),
    headMat,
  );
  head.position.y = 2.05;
  head.castShadow = true;
  head.receiveShadow = true;
  bodyGroup.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x202020 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), eyeMat);
  eyeL.position.set(-0.13, 2.1, 0.28);
  bodyGroup.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.13;
  bodyGroup.add(eyeR);

  // arms (pivot at shoulder, mesh hangs down)
  const armL = new THREE.Group();
  armL.position.set(-0.55, 1.7, 0);
  bodyGroup.add(armL);
  const armLMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.85, 0.3),
    bodyMat,
  );
  armLMesh.position.y = -0.42;
  armLMesh.castShadow = true;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.position.set(0.55, 1.7, 0);
  bodyGroup.add(armR);
  const armRMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.85, 0.3),
    bodyMat,
  );
  armRMesh.position.y = -0.42;
  armRMesh.castShadow = true;
  armR.add(armRMesh);

  // legs (pivot at hip)
  const legL = new THREE.Group();
  legL.position.set(-0.22, 0.85, 0);
  bodyGroup.add(legL);
  const legLMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.85, 0.4),
    accentMat,
  );
  legLMesh.position.y = -0.42;
  legLMesh.castShadow = true;
  legL.add(legLMesh);
  const bootL = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.18, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x3a2615 }),
  );
  bootL.position.y = -0.9;
  legL.add(bootL);

  const legR = new THREE.Group();
  legR.position.set(0.22, 0.85, 0);
  bodyGroup.add(legR);
  const legRMesh = legLMesh.clone();
  legR.add(legRMesh);
  const bootR = bootL.clone();
  legR.add(bootR);

  return {
    group: root,
    rig: {
      body: bodyGroup,
      armL,
      armR,
      legL,
      legR,
      bodyMaterials: [bodyMat, accentMat, headMat],
    },
  };
}

function makeAnimController(): AnimController {
  return {
    state: "idle",
    stateTime: 0,
    attackProgress: 0,
    castProgress: 0,
    hitFlash: 0,
    swingDir: 1,
  };
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

const PLAYER_SKIN = makeSkinTexture(128, [232, 200, 170]);
const PLAYER_BODY = makeMetalTexture(256, [70, 90, 140]);
const PLAYER_ACCENT = makeMetalTexture(256, [100, 70, 32]);
const PLAYER_CAPE = makeFabricTexture(256, [140, 25, 30]);

export function createPlayer(scene: THREE.Scene): Entity {
  const { group, rig } = buildHumanoidRig({
    body: 0xffffff,
    accent: 0xffffff,
    head: 0xffffff,
    bodyTex: PLAYER_BODY,
    accentTex: PLAYER_ACCENT,
    headTex: PLAYER_SKIN,
  });

  const cape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 1.2, 1, 4),
    new THREE.MeshLambertMaterial({
      map: PLAYER_CAPE,
      side: THREE.DoubleSide,
    }),
  );
  cape.position.set(0, 1.3, -0.32);
  cape.rotation.x = -0.05;
  cape.castShadow = true;
  rig.body.add(cape);
  rig.cape = cape;

  // sword on right hand: pivot at handle, blade hangs down so swing is natural
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0, -0.85, 0);
  rig.armR.add(weaponPivot);

  const sword = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.1, 0.05),
    new THREE.MeshLambertMaterial({
      color: 0xe0e0e8,
      emissive: 0x202028,
    }),
  );
  blade.position.y = -0.55;
  blade.castShadow = true;
  sword.add(blade);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.18, 4),
    blade.material,
  );
  tip.position.y = -1.18;
  tip.rotation.x = Math.PI;
  sword.add(tip);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.06, 0.12),
    new THREE.MeshLambertMaterial({ color: 0xd4b76a }),
  );
  guard.position.y = 0;
  sword.add(guard);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8),
    new THREE.MeshLambertMaterial({ color: 0x4a2818 }),
  );
  handle.position.y = 0.13;
  sword.add(handle);

  const pommel = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.07, 0),
    new THREE.MeshLambertMaterial({ color: 0xd4b76a }),
  );
  pommel.position.y = 0.26;
  sword.add(pommel);

  weaponPivot.add(sword);
  rig.weapon = sword;
  rig.weaponPivot = weaponPivot;

  // resting weapon orientation: tip forward, slightly raised
  weaponPivot.rotation.set(-0.5, 0, 0);

  // resting arm orientation: arms slightly forward
  rig.armL.rotation.set(0.1, 0, -0.05);
  rig.armR.rotation.set(0.1, 0, 0.05);

  scene.add(group);

  const stats = defaultStats();
  stats.hp = 200;
  stats.hpMax = 200;
  stats.mp = 100;
  stats.mpMax = 100;
  stats.attack = 18;
  stats.defense = 6;
  stats.attackRange = 2.2;

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
    rig,
    anim: makeAnimController(),
    bobTime: 0,
  };
  return e;
}

export interface EnemyTemplate {
  name: string;
  level: number;
  palette: HumanoidPalette;
  scale: number;
  stats: Stats;
  xpReward: number;
}

const GOBLIN_BODY = makeFabricTexture(128, [70, 100, 40]);
const GOBLIN_ACCENT = makeFabricTexture(128, [50, 35, 22]);
const GOBLIN_HEAD = makeSkinTexture(128, [110, 145, 60]);

const ORC_BODY = makeMetalTexture(128, [60, 50, 35]);
const ORC_ACCENT = makeMetalTexture(128, [40, 28, 18]);
const ORC_HEAD = makeSkinTexture(128, [120, 100, 60]);

const WOLF_BODY = makeFabricTexture(128, [60, 50, 38]);
const WOLF_HEAD = makeSkinTexture(128, [80, 70, 55]);

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  goblin: {
    name: "Goblin Scout",
    level: 2,
    palette: {
      body: 0xffffff,
      accent: 0xffffff,
      head: 0xffffff,
      bodyTex: GOBLIN_BODY,
      accentTex: GOBLIN_ACCENT,
      headTex: GOBLIN_HEAD,
    },
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
    palette: {
      body: 0xffffff,
      accent: 0xffffff,
      head: 0xffffff,
      bodyTex: ORC_BODY,
      accentTex: ORC_ACCENT,
      headTex: ORC_HEAD,
    },
    scale: 1.15,
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
    palette: {
      body: 0xffffff,
      accent: 0x281e16,
      head: 0xffffff,
      bodyTex: WOLF_BODY,
      headTex: WOLF_HEAD,
    },
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
  const { group, rig } = buildHumanoidRig(template.palette);
  group.scale.setScalar(template.scale);
  group.position.copy(spawn);

  // Goblins have a small dagger
  if (templateKey === "goblin") {
    const dagger = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.5, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xa0a0a8 }),
    );
    dagger.position.y = -0.6;
    const pivot = new THREE.Group();
    pivot.position.set(0, -0.85, 0);
    pivot.rotation.x = -0.4;
    pivot.add(dagger);
    rig.armR.add(pivot);
    rig.weapon = dagger;
    rig.weaponPivot = pivot;
  } else if (templateKey === "orc") {
    const club = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.95, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x6b4a28 }),
    );
    club.position.y = -0.5;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshLambertMaterial({ color: 0x5b3a1d }),
    );
    head.position.y = -1.0;
    const pivot = new THREE.Group();
    pivot.position.set(0, -0.85, 0);
    pivot.rotation.x = -0.5;
    pivot.add(club);
    pivot.add(head);
    rig.armR.add(pivot);
    rig.weapon = club;
    rig.weaponPivot = pivot;
  }

  scene.add(group);

  const hpBar = makeHpBarSprite();
  hpBar.bg.position.set(0, 2.9, 0);
  hpBar.fill.position.set(-0.97, 2.9, 0);
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
    rig,
    anim: makeAnimController(),
    bobTime: Math.random() * Math.PI * 2,
  };
  return e;
}

export function getXpReward(e: Entity): number {
  for (const key in ENEMY_TEMPLATES) {
    if (e.name === ENEMY_TEMPLATES[key].name)
      return ENEMY_TEMPLATES[key].xpReward;
  }
  return 20;
}

export function updateHpBar(e: Entity): void {
  if (!e.hpBar) return;
  const pct = Math.max(0, Math.min(1, e.stats.hp / e.stats.hpMax));
  e.hpBar.fill.scale.x = 1.94 * pct;
}
