import * as THREE from "three";
import {
  makeGrassTexture,
  makeStoneTexture,
  makeBarkTexture,
} from "./textures";

export const WORLD_SIZE = 200;

export interface World {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  obstacles: THREE.Object3D[];
  obstacleBoxes: THREE.Box3[];
  sun: THREE.DirectionalLight;
}

const SHARED_BARK = makeBarkTexture(256);
const SHARED_STONE = makeStoneTexture(512);

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
  const mat = new THREE.MeshLambertMaterial({ map: SHARED_STONE });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), mat);
  base.position.y = 0.2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.45, 2.6, 12),
    mat,
  );
  shaft.position.y = 1.7;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.1), mat);
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
  const mat = new THREE.MeshLambertMaterial({ map: SHARED_STONE });
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
  scene.fog = new THREE.Fog(0x6b8db8, 70, 200);

  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 96, 96);
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

  const groundMat = new THREE.MeshLambertMaterial({
    map: makeGrassTexture(1024),
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stonePathTex = makeStoneTexture(512);
  stonePathTex.repeat.set(4, 0.7);
  const pathMat = new THREE.MeshLambertMaterial({
    map: stonePathTex,
    transparent: true,
    opacity: 0.92,
  });

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 3.5, 1, 1),
      pathMat,
    );
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = angle;
    path.position.set(Math.cos(angle) * 16, 0.02, Math.sin(angle) * 16);
    path.receiveShadow = true;
    scene.add(path);
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

  for (let i = 0; i < 90; i++) {
    const tree = buildTree(rng);
    tree.position.set((rng() * 2 - 1) * half, 0, (rng() * 2 - 1) * half);
    if (tree.position.length() < 14) {
      tree.position.normalize().multiplyScalar(14 + rng() * 6);
    }
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

  for (let i = 0; i < 70; i++) {
    const rock = buildRock(rng);
    rock.position.set((rng() * 2 - 1) * half, 0.3, (rng() * 2 - 1) * half);
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

  for (let i = 0; i < 50; i++) {
    const bush = buildBush(rng);
    bush.position.set((rng() * 2 - 1) * half, 0, (rng() * 2 - 1) * half);
    bush.scale.setScalar(0.7 + rng() * 0.6);
    scene.add(bush);
  }

  for (let i = 0; i < 10; i++) {
    const pillar = buildRuinPillar(rng);
    pillar.position.set(
      (rng() * 2 - 1) * half * 0.7,
      0,
      (rng() * 2 - 1) * half * 0.7,
    );
    scene.add(pillar);
    obstacles.push(pillar);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        pillar.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        new THREE.Vector3(1.4, 3.4, 1.4),
      ),
    );
  }

  for (let i = 0; i < 6; i++) {
    const wall = buildBrokenWall(rng);
    wall.position.set(
      (rng() * 2 - 1) * half * 0.6,
      0,
      (rng() * 2 - 1) * half * 0.6,
    );
    scene.add(wall);
    obstacles.push(wall);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        wall.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
        new THREE.Vector3(4, 1.2, 1),
      ),
    );
  }

  return { scene, ground, obstacles, obstacleBoxes, sun };
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
