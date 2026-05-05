import * as THREE from "three";
import { BIOME_LIST, biomeAt } from "./biomes";
import { CITY_LIST, CASTLE_LIST } from "./cities";
import type { CityDef } from "./types";

export const WORLD_SIZE = 800;

export interface WorldDensityOpts {
  treeCount?: number;
  rockCount?: number;
  groundNoiseParticles?: number;
}

export interface World {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  obstacles: THREE.Object3D[];
  obstacleBoxes: THREE.Box3[];
  sun: THREE.DirectionalLight;
  cityMarkers: { def: CityDef; group: THREE.Group }[];
  castleMarker: { id: string; group: THREE.Group; pos: THREE.Vector3 } | null;
}

function makeGroundTexture(noiseParticles = 14000): THREE.Texture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#3d5a2a");
  grad.addColorStop(1, "#2a4020");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (const biome of BIOME_LIST) {
    // Map world coords to texture coords. Texture covers WORLD_SIZE.
    const tx = ((biome.center[0] + WORLD_SIZE / 2) / WORLD_SIZE) * size;
    const ty = ((biome.center[1] + WORLD_SIZE / 2) / WORLD_SIZE) * size;
    const tr = (biome.radius / WORLD_SIZE) * size;
    const grd = ctx.createRadialGradient(tx, ty, tr * 0.2, tx, ty, tr);
    const c = biome.palette.ground.toString(16).padStart(6, "0");
    grd.addColorStop(0, `#${c}`);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < noiseParticles; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.4 + 0.3;
    const v = Math.random();
    if (v < 0.5) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40},${100 + Math.random() * 60},${40 + Math.random() * 30},${0.25 + Math.random() * 0.35})`;
    } else if (v < 0.8) {
      ctx.fillStyle = `rgba(${80 + Math.random() * 40},${60 + Math.random() * 30},${30 + Math.random() * 20},0.4)`;
    } else {
      ctx.fillStyle = `rgba(${30 + Math.random() * 30},${50 + Math.random() * 30},${20 + Math.random() * 20},0.45)`;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildTree(palette: number = 0x355c1e): THREE.Group {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.45, 2.2, 8),
    new THREE.MeshLambertMaterial({ color: 0x5b3a1d }),
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  group.add(trunk);

  const colors = [palette, palette - 0x102010, palette + 0x081008];
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0 + Math.random() * 0.4, 0),
      new THREE.MeshLambertMaterial({
        color: Math.max(0, colors[i % colors.length]),
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

function buildRock(color: number = 0x6b6b6b): THREE.Mesh {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.5, 0),
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
  );
  rock.position.y = 0.3;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  return rock;
}

function buildHouse(palette: CityDef["palette"]): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: palette.wall });
  const roofMat = new THREE.MeshLambertMaterial({ color: palette.roof });
  const accentMat = new THREE.MeshLambertMaterial({ color: palette.accent });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 3), wallMat);
  base.position.y = 1.2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Roof — pyramid using cone with 4 segments.
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 1.6, 4),
    roofMat,
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.2;
  roof.castShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.05), accentMat);
  door.position.set(0, 0.7, 1.52);
  group.add(door);

  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), accentMat);
  win1.position.set(-1.1, 1.6, 1.52);
  group.add(win1);
  const win2 = win1.clone();
  win2.position.x = 1.1;
  group.add(win2);

  return group;
}

function buildTower(palette: CityDef["palette"]): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: palette.wall });
  const roofMat = new THREE.MeshLambertMaterial({ color: palette.roof });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 6, 12),
    wallMat,
  );
  shaft.position.y = 3;
  shaft.castShadow = true;
  group.add(shaft);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 2.2, 12),
    roofMat,
  );
  roof.position.y = 7;
  roof.castShadow = true;
  group.add(roof);
  return group;
}

function buildCity(scene: THREE.Scene, c: CityDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(c.center[0], 0, c.center[1]);
  scene.add(group);

  const cobblestone = new THREE.Mesh(
    new THREE.CircleGeometry(c.radius - 4, 36),
    new THREE.MeshLambertMaterial({ color: 0x707068 }),
  );
  cobblestone.rotation.x = -Math.PI / 2;
  cobblestone.position.y = 0.02;
  cobblestone.receiveShadow = true;
  group.add(cobblestone);

  // 6 houses arranged around center.
  const houseCount = 7;
  for (let i = 0; i < houseCount; i++) {
    const ang = (i / houseCount) * Math.PI * 2;
    const r = c.radius * 0.55;
    const h = buildHouse(c.palette);
    h.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    h.rotation.y = -ang + Math.PI;
    group.add(h);
  }

  // 4 towers at the corners.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const r = c.radius - 4;
    const t = buildTower(c.palette);
    t.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    group.add(t);
  }

  // Banner pole near center.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0x444444 }),
  );
  pole.position.y = 3;
  group.add(pole);

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.2),
    new THREE.MeshLambertMaterial({
      color: c.palette.accent,
      side: THREE.DoubleSide,
    }),
  );
  banner.position.set(0.85, 4.6, 0);
  group.add(banner);

  return group;
}

function buildCastle(): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xc0bcb0 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x6a6a72 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });

  // Outer wall — square with crenellations.
  const w = 16;
  const h = 5;
  const t = 1;

  for (const dir of [-1, 1]) {
    const wallNS = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMat);
    wallNS.position.set(0, h / 2, dir * (w / 2));
    wallNS.castShadow = true;
    wallNS.receiveShadow = true;
    group.add(wallNS);
    const wallEW = new THREE.Mesh(new THREE.BoxGeometry(t, h, w), wallMat);
    wallEW.position.set(dir * (w / 2), h / 2, 0);
    wallEW.castShadow = true;
    wallEW.receiveShadow = true;
    group.add(wallEW);
  }

  // Corner towers.
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, h + 3, 2.5),
        wallMat,
      );
      tower.position.set(dx * (w / 2), (h + 3) / 2, dz * (w / 2));
      tower.castShadow = true;
      group.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 2.2, 6), roofMat);
      cap.position.set(dx * (w / 2), h + 3 + 1.1, dz * (w / 2));
      group.add(cap);
    }
  }

  // Inner keep.
  const keep = new THREE.Mesh(new THREE.BoxGeometry(8, 9, 8), darkMat);
  keep.position.y = 4.5;
  keep.castShadow = true;
  group.add(keep);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), roofMat);
  keepRoof.rotation.y = Math.PI / 4;
  keepRoof.position.y = 9 + 1.5;
  group.add(keepRoof);

  // Gate.
  const gate = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.5), darkMat);
  gate.position.set(0, 2, w / 2);
  group.add(gate);

  return group;
}

export function createWorld(opts: WorldDensityOpts = {}): World {
  const treeCount = opts.treeCount ?? 240;
  const rockCount = opts.rockCount ?? 180;
  const groundNoiseParticles = opts.groundNoiseParticles ?? 14000;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4a6f9c);
  scene.fog = new THREE.Fog(0x4a6f9c, 80, 380);

  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 128, 128);
  const positions = groundGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const biome = biomeAt(x, y);
    let h =
      Math.sin(x * 0.025) * 0.5 +
      Math.cos(y * 0.03) * 0.4 +
      (Math.random() - 0.5) * 0.15;
    if (biome?.id === "mountains") {
      h += 1.6 + Math.sin(x * 0.05) * 1.2 + Math.cos(y * 0.06) * 1.0;
    } else if (biome?.id === "graveyard") {
      h -= 0.4;
    }
    positions.setZ(i, h);
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshLambertMaterial({
    map: makeGroundTexture(groundNoiseParticles),
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
  const d = 60;
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
  const cityMarkers: { def: CityDef; group: THREE.Group }[] = [];

  // Cities.
  for (const c of CITY_LIST) {
    const group = buildCity(scene, c);
    cityMarkers.push({ def: c, group });
    // Block movement at the city center walls.
    const center = new THREE.Vector3(c.center[0], 1, c.center[1]);
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        center,
        new THREE.Vector3(c.radius * 1.4, 4, c.radius * 1.4),
      ),
    );
    obstacles.push(group);
    // Remove block — keep only outer walls. Use 4 wall boxes around the city.
    obstacleBoxes.pop();
    const wallPad = c.radius - 4;
    for (const dir of [-1, 1]) {
      obstacleBoxes.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(
            c.center[0],
            2,
            c.center[1] + dir * wallPad,
          ),
          new THREE.Vector3(c.radius * 2 - 8, 4, 1),
        ),
      );
      obstacleBoxes.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(
            c.center[0] + dir * wallPad,
            2,
            c.center[1],
          ),
          new THREE.Vector3(1, 4, c.radius * 2 - 8),
        ),
      );
    }
  }

  // Castle — placed at the central hub, one tile north of city center.
  let castleMarker: World["castleMarker"] = null;
  for (const cd of CASTLE_LIST) {
    const cg = buildCastle();
    cg.position.set(cd.center[0], 0, cd.center[1] + 18);
    scene.add(cg);
    obstacles.push(cg);
    castleMarker = {
      id: cd.id,
      group: cg,
      pos: cg.position.clone(),
    };
    obstacleBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        cg.position.clone().add(new THREE.Vector3(0, 4, 0)),
        new THREE.Vector3(20, 8, 20),
      ),
    );
  }

  // Trees, rocks, ruins distributed by biome.
  const half = WORLD_SIZE / 2 - 5;
  const rng = mulberry32(1337);

  for (let i = 0; i < treeCount; i++) {
    const x = (rng() * 2 - 1) * half;
    const z = (rng() * 2 - 1) * half;
    const biome = biomeAt(x, z);
    const closeToCity = CITY_LIST.some(
      (c) => Math.hypot(x - c.center[0], z - c.center[1]) < c.radius + 4,
    );
    if (closeToCity) continue;

    let palette = 0x355c1e;
    if (biome?.id === "wasteland") palette = 0x6e5a30;
    else if (biome?.id === "mountains") palette = 0x405a3a;
    else if (biome?.id === "graveyard") palette = 0x2a3a30;
    const tree = buildTree(palette);
    tree.position.set(x, 0, z);
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

  for (let i = 0; i < rockCount; i++) {
    const x = (rng() * 2 - 1) * half;
    const z = (rng() * 2 - 1) * half;
    const biome = biomeAt(x, z);
    let color = 0x6b6b6b;
    if (biome?.id === "mountains") color = 0x807c70;
    else if (biome?.id === "graveyard") color = 0x4a4548;
    else if (biome?.id === "wasteland") color = 0x8a7458;
    const rock = buildRock(color);
    rock.position.set(x, 0.3, z);
    rock.scale.setScalar(0.6 + rng() * 1.4);
    scene.add(rock);
    obstacles.push(rock);
    const box = new THREE.Box3().setFromCenterAndSize(
      rock.position.clone(),
      new THREE.Vector3(1.2, 1, 1.2).multiplyScalar(rock.scale.x),
    );
    obstacleBoxes.push(box);
  }

  return {
    scene,
    ground,
    obstacles,
    obstacleBoxes,
    sun,
    cityMarkers,
    castleMarker,
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
