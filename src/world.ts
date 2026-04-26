import * as THREE from "three";

export const WORLD_SIZE = 200;

export interface World {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  obstacles: THREE.Object3D[];
  obstacleBoxes: THREE.Box3[];
  sun: THREE.DirectionalLight;
}

function makeGroundTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#3d5a2a");
  grad.addColorStop(1, "#2a4020");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.5 + 0.3;
    const v = Math.random();
    if (v < 0.55) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40},${100 + Math.random() * 60},${40 + Math.random() * 30},${0.4 + Math.random() * 0.4})`;
    } else if (v < 0.8) {
      ctx.fillStyle = `rgba(${80 + Math.random() * 40},${60 + Math.random() * 30},${30 + Math.random() * 20},0.5)`;
    } else {
      ctx.fillStyle = `rgba(${30 + Math.random() * 30},${50 + Math.random() * 30},${20 + Math.random() * 20},0.6)`;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 12; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(${110 + Math.random() * 30},${100 + Math.random() * 20},${80},0.4)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + Math.random() * 60, 20 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildTree(): THREE.Group {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.45, 2.2, 8),
    new THREE.MeshLambertMaterial({ color: 0x5b3a1d }),
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  group.add(trunk);

  const leafColors = [0x2c5018, 0x35621e, 0x244218];
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0 + Math.random() * 0.4, 0),
      new THREE.MeshLambertMaterial({
        color: leafColors[i % leafColors.length],
        flatShading: true,
      }),
    );
    leaf.position.set(
      (Math.random() - 0.5) * 0.6,
      2.1 + i * 0.6,
      (Math.random() - 0.5) * 0.6,
    );
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function buildRock(): THREE.Mesh {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.5, 0),
    new THREE.MeshLambertMaterial({
      color: 0x6b6b6b,
      flatShading: true,
    }),
  );
  rock.position.y = 0.3;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  return rock;
}

function buildRuinPillar(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xb8b09a });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), mat);
  base.position.y = 0.2;
  base.castShadow = true;
  group.add(base);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.45, 2.6, 12),
    mat,
  );
  shaft.position.y = 1.7;
  shaft.castShadow = true;
  group.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), mat);
  cap.position.y = 3.15;
  cap.castShadow = true;
  group.add(cap);
  return group;
}

export function createWorld(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4a6f9c);
  scene.fog = new THREE.Fog(0x4a6f9c, 60, 180);

  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 64, 64);
  const positions = groundGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const h =
      Math.sin(x * 0.05) * 0.4 +
      Math.cos(y * 0.07) * 0.3 +
      (Math.random() - 0.5) * 0.15;
    positions.setZ(i, h);
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshLambertMaterial({
    map: makeGroundTexture(),
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ambient = new THREE.AmbientLight(0xb8c8e0, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe7b8, 1.05);
  sun.position.set(40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 50;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0x9fb9d9, 0x3a2818, 0.35);
  scene.add(hemi);

  const obstacles: THREE.Object3D[] = [];
  const obstacleBoxes: THREE.Box3[] = [];

  const half = WORLD_SIZE / 2 - 5;
  const rng = mulberry32(1337);

  for (let i = 0; i < 80; i++) {
    const tree = buildTree();
    tree.position.set((rng() * 2 - 1) * half, 0, (rng() * 2 - 1) * half);
    if (tree.position.length() < 12) {
      tree.position.normalize().multiplyScalar(12 + rng() * 5);
    }
    tree.scale.setScalar(0.8 + rng() * 0.7);
    tree.rotation.y = rng() * Math.PI * 2;
    scene.add(tree);
    obstacles.push(tree);
    const box = new THREE.Box3().setFromCenterAndSize(
      tree.position.clone().add(new THREE.Vector3(0, 1, 0)),
      new THREE.Vector3(0.9, 2, 0.9),
    );
    obstacleBoxes.push(box);
  }

  for (let i = 0; i < 60; i++) {
    const rock = buildRock();
    rock.position.set((rng() * 2 - 1) * half, 0.3, (rng() * 2 - 1) * half);
    rock.scale.setScalar(0.6 + rng() * 1.4);
    scene.add(rock);
    obstacles.push(rock);
    const box = new THREE.Box3().setFromCenterAndSize(
      rock.position.clone(),
      new THREE.Vector3(1.2, 1, 1.2).multiplyScalar(rock.scale.x),
    );
    obstacleBoxes.push(box);
  }

  for (let i = 0; i < 8; i++) {
    const pillar = buildRuinPillar();
    pillar.position.set((rng() * 2 - 1) * half * 0.7, 0, (rng() * 2 - 1) * half * 0.7);
    scene.add(pillar);
    obstacles.push(pillar);
    const box = new THREE.Box3().setFromCenterAndSize(
      pillar.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      new THREE.Vector3(1.3, 3.4, 1.3),
    );
    obstacleBoxes.push(box);
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
