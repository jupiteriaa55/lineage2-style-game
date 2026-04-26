import * as THREE from "three";
import {
  makeGrassTexture,
  makeStoneTextureSet,
  makeBarkTexture,
  makeCobblestoneTexture,
  makeMarbleTexture,
} from "./textures";

export const WORLD_SIZE = 400;

import {
  SETTLEMENTS,
  buildSettlement,
  type ObeliskHandle,
  type Settlement,
} from "./settlements";

export interface World {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  obstacles: THREE.Object3D[];
  obstacleBoxes: THREE.Box3[];
  sun: THREE.DirectionalLight;
  obelisks: ObeliskHandle[];
  settlements: Settlement[];
  crafterPosition: THREE.Vector3;
  spawnZones: SpawnZone[];
}

export interface SpawnZone {
  center: THREE.Vector3;
  radius: number;
  /** weighted enemy types that may appear here */
  enemies: Array<"goblin" | "wolf" | "orc">;
  /** scaling: how dense */
  count: number;
}

const SHARED_BARK = makeBarkTexture(512);
const SHARED_STONE_SET = makeStoneTextureSet(1024);
const SHARED_STONE = SHARED_STONE_SET.map;
const SHARED_STONE_NRM = SHARED_STONE_SET.normalMap;
const SHARED_MARBLE = makeMarbleTexture(512);

function buildTree(rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const trunkH = 2.0 + rng() * 1.4;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.5, trunkH, 8),
    new THREE.MeshLambertMaterial({ map: SHARED_BARK }),
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const leafColors = [0x2c5018, 0x35621e, 0x244218, 0x3d6b22];
  const tiers = 3 + ((rng() * 2) | 0);
  for (let i = 0; i < tiers; i++) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9 + rng() * 0.5, 0),
      new THREE.MeshLambertMaterial({
        color: leafColors[(rng() * leafColors.length) | 0],
        flatShading: true,
      }),
    );
    leaf.position.set(
      (rng() - 0.5) * 0.7,
      trunkH + 0.1 + i * 0.55,
      (rng() - 0.5) * 0.7,
    );
    leaf.scale.setScalar(0.95 + rng() * 0.4);
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function buildRock(rng: () => number): THREE.Mesh {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6 + rng() * 0.5, 0),
    new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.08, 0.05, 0.36 + rng() * 0.12),
      flatShading: true,
    }),
  );
  rock.position.y = 0.3;
  rock.rotation.set(rng(), rng(), rng());
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function buildRuinPillar(rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: SHARED_STONE,
    normalMap: SHARED_STONE_NRM,
    roughness: 0.92,
    metalness: 0.03,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    map: SHARED_MARBLE,
    roughness: 0.4,
    metalness: 0.05,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), marbleMat);
  base.position.y = 0.2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.45, 2.6, 16),
    mat,
  );
  shaft.position.y = 1.7;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.1), marbleMat);
  cap.position.y = 3.15;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);
  if (rng() < 0.4) {
    shaft.scale.y = 0.45 + rng() * 0.4;
    shaft.position.y = (2.6 * shaft.scale.y) / 2 + 0.4;
    cap.visible = false;
    group.rotation.z = (rng() - 0.5) * 0.2;
  }
  return group;
}

function buildBush(rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color().setHSL(
    0.27 + rng() * 0.04,
    0.45,
    0.22 + rng() * 0.1,
  );
  for (let i = 0; i < 4; i++) {
    const ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4 + rng() * 0.2, 0),
      new THREE.MeshLambertMaterial({ color, flatShading: true }),
    );
    ball.position.set(
      (rng() - 0.5) * 0.6,
      0.35 + rng() * 0.2,
      (rng() - 0.5) * 0.6,
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
    group.add(ball);
  }
  return group;
}

function buildBrokenWall(rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: SHARED_STONE,
    normalMap: SHARED_STONE_NRM,
    roughness: 0.95,
    metalness: 0.02,
  });
  const len = 3 + rng() * 4;
  const blocks = (len / 0.7) | 0;
  for (let i = 0; i < blocks; i++) {
    if (rng() < 0.18) continue;
    const h = 0.6 + rng() * 1.2;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, h, 0.7),
      mat,
    );
    block.position.set(i * 0.72, h / 2, (rng() - 0.5) * 0.05);
    block.rotation.y = (rng() - 0.5) * 0.15;
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);
  }
  group.rotation.y = rng() * Math.PI * 2;
  return group;
}

export function createWorld(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6b8db8);
  scene.fog = new THREE.Fog(0x6b8db8, 90, 320);

  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 144, 144);
  const positions = groundGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const h =
      Math.sin(x * 0.05) * 0.5 +
      Math.cos(y * 0.07) * 0.4 +
      Math.sin(x * 0.18 + y * 0.12) * 0.18 +
      (Math.random() - 0.5) * 0.12;
    positions.setZ(i, h);
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: makeGrassTexture(1024),
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const cobble = makeCobblestoneTexture(1024);
  const pathMat = new THREE.MeshStandardMaterial({
    map: cobble.map,
    normalMap: cobble.normalMap,
    roughness: 0.85,
    metalness: 0.05,
    transparent: true,
    opacity: 0.96,
  });

  // paths between starter town (Eldoria) and the three villages
  function buildPath(from: THREE.Vector3, to: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length() - 24; // leave gaps near plazas
    if (length <= 4) return;
    dir.normalize();
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(length, 3.6, 1, 1),
      pathMat.clone(),
    );
    (path.material as THREE.MeshStandardMaterial).map!.repeat.set(length / 3, 1);
    (path.material as THREE.MeshStandardMaterial).normalMap!.repeat.set(length / 3, 1);
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = -Math.atan2(dir.z, dir.x);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    path.position.set(mid.x, 0.02, mid.z);
    path.receiveShadow = true;
    scene.add(path);
  }
  // Eldoria is at origin; connect to each other town
  for (const s of SETTLEMENTS) {
    if (s.starter) continue;
    buildPath(new THREE.Vector3(0, 0, 0), s.position.clone());
  }

  const ambient = new THREE.AmbientLight(0xc8d4e8, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0c8, 1.15);
  sun.position.set(40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 55;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xa5c4e0, 0x3a2818, 0.4);
  scene.add(hemi);

  const obstacles: THREE.Object3D[] = [];
  const obstacleBoxes: THREE.Box3[] = [];

  const half = WORLD_SIZE / 2 - 5;
  const rng = mulberry32(1337);

  // settlement footprints — keep clear of nature
  const settlementCenters = SETTLEMENTS.map((s) => s.position.clone());
  function nearAnySettlement(p: THREE.Vector3, dist: number): boolean {
    for (const c of settlementCenters) {
      if (c.distanceTo(p) < dist) return true;
    }
    return false;
  }
  // also keep paths clear (a thin corridor along each path)
  function nearAnyPath(p: THREE.Vector3, dist: number): boolean {
    for (const s of SETTLEMENTS) {
      if (s.starter) continue;
      const a = new THREE.Vector3(0, 0, 0);
      const b = s.position.clone();
      const ab = new THREE.Vector3().subVectors(b, a);
      const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      const proj = a.clone().add(ab.multiplyScalar(t));
      if (proj.distanceTo(p) < dist) return true;
    }
    return false;
  }

  for (let i = 0; i < 360; i++) {
    const tree = buildTree(rng);
    tree.position.set((rng() * 2 - 1) * half, 0, (rng() * 2 - 1) * half);
    if (nearAnySettlement(tree.position, 26) || nearAnyPath(tree.position, 4)) continue;
    tree.scale.setScalar(0.85 + rng() * 0.7);
    tree.rotation.y = rng() * Math.PI * 2;
    scene.add(tree);
    obstacles.push(tree);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        tree.position.clone().add(new THREE.Vector3(0, 1, 0)),
        new THREE.Vector3(0.95, 2, 0.95),
      ),
    );
  }

  for (let i = 0; i < 220; i++) {
    const rock = buildRock(rng);
    rock.position.set((rng() * 2 - 1) * half, 0.3, (rng() * 2 - 1) * half);
    if (nearAnySettlement(rock.position, 24) || nearAnyPath(rock.position, 3)) continue;
    rock.scale.setScalar(0.6 + rng() * 1.4);
    scene.add(rock);
    obstacles.push(rock);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        rock.position.clone(),
        new THREE.Vector3(1.2, 1, 1.2).multiplyScalar(rock.scale.x),
      ),
    );
  }

  for (let i = 0; i < 180; i++) {
    const bush = buildBush(rng);
    bush.position.set((rng() * 2 - 1) * half, 0, (rng() * 2 - 1) * half);
    if (nearAnySettlement(bush.position, 22)) continue;
    bush.scale.setScalar(0.7 + rng() * 0.6);
    scene.add(bush);
  }

  for (let i = 0; i < 26; i++) {
    const pillar = buildRuinPillar(rng);
    pillar.position.set(
      (rng() * 2 - 1) * half * 0.85,
      0,
      (rng() * 2 - 1) * half * 0.85,
    );
    if (nearAnySettlement(pillar.position, 28) || nearAnyPath(pillar.position, 4)) continue;
    scene.add(pillar);
    obstacles.push(pillar);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        pillar.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        new THREE.Vector3(1.4, 3.4, 1.4),
      ),
    );
  }

  for (let i = 0; i < 18; i++) {
    const wall = buildBrokenWall(rng);
    wall.position.set(
      (rng() * 2 - 1) * half * 0.85,
      0,
      (rng() * 2 - 1) * half * 0.85,
    );
    if (nearAnySettlement(wall.position, 28) || nearAnyPath(wall.position, 4)) continue;
    scene.add(wall);
    obstacles.push(wall);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        wall.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
        new THREE.Vector3(4, 1.2, 1),
      ),
    );
  }

  // ---------- Build settlements ----------
  const obelisks: ObeliskHandle[] = [];
  let crafterPosition = new THREE.Vector3(6, 0, 4);
  for (const s of SETTLEMENTS) {
    const built = buildSettlement(scene, s, rng);
    obelisks.push(built.obelisk);
    for (const o of built.obstacles) {
      obstacles.push(o.obj);
      obstacleBoxes.push(o.box);
    }
    if (built.crafterPosition) crafterPosition = built.crafterPosition;
  }

  // ---------- Spawn zones (away from settlements) ----------
  const spawnZones: SpawnZone[] = [
    // Around starter town: low-level goblins & wolves
    {
      center: new THREE.Vector3(40, 0, 40),
      radius: 30,
      enemies: ["goblin", "goblin", "wolf"],
      count: 8,
    },
    {
      center: new THREE.Vector3(-40, 0, 40),
      radius: 30,
      enemies: ["goblin", "wolf"],
      count: 6,
    },
    // Mid biomes
    {
      center: new THREE.Vector3(80, 0, -60),
      radius: 30,
      enemies: ["wolf", "orc"],
      count: 7,
    },
    {
      center: new THREE.Vector3(-80, 0, -60),
      radius: 30,
      enemies: ["goblin", "orc"],
      count: 7,
    },
    // Far zones near villages — tougher
    {
      center: new THREE.Vector3(0, 0, -100),
      radius: 35,
      enemies: ["orc", "wolf", "wolf"],
      count: 9,
    },
    {
      center: new THREE.Vector3(110, 0, -50),
      radius: 30,
      enemies: ["orc", "orc", "wolf"],
      count: 8,
    },
    {
      center: new THREE.Vector3(-110, 0, -50),
      radius: 30,
      enemies: ["orc", "goblin"],
      count: 7,
    },
  ];

  return {
    scene,
    ground,
    obstacles,
    obstacleBoxes,
    sun,
    obelisks,
    settlements: SETTLEMENTS,
    crafterPosition,
    spawnZones,
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isInsideObstacle(
  point: THREE.Vector3,
  boxes: THREE.Box3[],
  pad = 0.5,
): boolean {
  for (const box of boxes) {
    if (
      point.x >= box.min.x - pad &&
      point.x <= box.max.x + pad &&
      point.z >= box.min.z - pad &&
      point.z <= box.max.z + pad
    ) {
      return true;
    }
  }
  return false;
}
