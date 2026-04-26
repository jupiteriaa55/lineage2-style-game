import * as THREE from "three";
import {
  makeBarkTexture,
  makeStoneTextureSet,
  makeMarbleTexture,
  makeFabricTexture,
  makeMetalTexture,
} from "./textures";

export interface Settlement {
  id: string;
  name: string;
  description: string;
  /** centre of the settlement on the ground */
  position: THREE.Vector3;
  /** location where the obelisk stands */
  obeliskPosition: THREE.Vector3;
  /** is this the starting town? */
  starter?: boolean;
}

export interface ObeliskHandle {
  settlement: Settlement;
  group: THREE.Group;
}

const STONE_SET = makeStoneTextureSet(512);
const MARBLE = makeMarbleTexture(512);
const BARK = makeBarkTexture(256);
const ROOF_TEX = makeFabricTexture(256, [110, 50, 30]);
const METAL = makeMetalTexture(256, [180, 160, 110]);

export const SETTLEMENTS: Settlement[] = [
  {
    id: "eldoria",
    name: "Eldoria",
    description: "Capital city — main hub with crafter and shops.",
    position: new THREE.Vector3(0, 0, 0),
    obeliskPosition: new THREE.Vector3(0, 0, -7),
    starter: true,
  },
  {
    id: "frosthaven",
    name: "Frosthaven",
    description: "Snowy outpost in the northern wilds.",
    position: new THREE.Vector3(0, 0, -150),
    obeliskPosition: new THREE.Vector3(0, 0, -150),
  },
  {
    id: "sunmeadow",
    name: "Sunmeadow",
    description: "Eastern farming village with orchards.",
    position: new THREE.Vector3(150, 0, 0),
    obeliskPosition: new THREE.Vector3(150, 0, 0),
  },
  {
    id: "stoneholm",
    name: "Stoneholm",
    description: "Western mining hold carved into the cliffs.",
    position: new THREE.Vector3(-150, 0, 0),
    obeliskPosition: new THREE.Vector3(-150, 0, 0),
  },
];

export interface BuiltSettlement {
  obstacles: Array<{ obj: THREE.Object3D; box: THREE.Box3 }>;
  obelisk: ObeliskHandle;
  /** crafter NPC location, only present in starter town */
  crafterPosition?: THREE.Vector3;
}

function buildHouse(rng: () => number): THREE.Group {
  const grp = new THREE.Group();
  const w = 3 + rng() * 1.5;
  const d = 3 + rng() * 1.5;
  const h = 1.8 + rng() * 0.6;
  const wallMat = new THREE.MeshLambertMaterial({ map: BARK });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  grp.add(body);

  // sloped roof: two boxes
  const roofMat = new THREE.MeshLambertMaterial({ map: ROOF_TEX });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.85, 1.4, 4), roofMat);
  roof.position.y = h + 0.7;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  grp.add(roof);

  // door
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x4a2a14 }),
  );
  door.position.set(0, 0.6, d / 2 + 0.01);
  grp.add(door);

  // windows
  const winMat = new THREE.MeshLambertMaterial({ color: 0xa8d4ff, transparent: true, opacity: 0.75 });
  for (const side of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), winMat);
    win.position.set(side * (w / 2 + 0.01), h * 0.65, 0);
    win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    grp.add(win);
  }
  return grp;
}

function buildFenceSegment(): THREE.Group {
  const grp = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: BARK });
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat);
    post.position.set(i * 0.7 - 1.05, 0.45, 0);
    post.castShadow = true;
    grp.add(post);
  }
  const beamTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.08), mat);
  beamTop.position.set(0, 0.7, 0);
  grp.add(beamTop);
  const beamMid = beamTop.clone();
  beamMid.position.y = 0.4;
  grp.add(beamMid);
  return grp;
}

export function buildObelisk(settlement: Settlement): ObeliskHandle {
  const grp = new THREE.Group();
  grp.position.copy(settlement.obeliskPosition);

  // base disc
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 0.4, 24),
    new THREE.MeshStandardMaterial({
      map: STONE_SET.map,
      normalMap: STONE_SET.normalMap,
      roughness: 0.9,
    }),
  );
  base.position.y = 0.2;
  base.receiveShadow = true;
  grp.add(base);

  // tall obelisk
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.5, 4.2, 8),
    new THREE.MeshStandardMaterial({
      map: MARBLE,
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color(0x1a3a6a),
      emissiveIntensity: 0.25,
    }),
  );
  stem.position.y = 2.5;
  stem.castShadow = true;
  grp.add(stem);

  // glowing crystal at top
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 0),
    new THREE.MeshStandardMaterial({
      color: 0x88e0ff,
      emissive: 0x4488ff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
    }),
  );
  crystal.position.y = 5.0;
  grp.add(crystal);

  // light
  const light = new THREE.PointLight(0x88c8ff, 1.6, 12);
  light.position.y = 5.0;
  grp.add(light);

  // ring on the ground that pulses
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 2.0, 36),
    new THREE.MeshBasicMaterial({
      color: 0x88c8ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  grp.add(ring);

  // user data so we can tag this handle
  grp.userData.obelisk = settlement.id;
  grp.userData.crystal = crystal;
  grp.userData.ring = ring;

  return { settlement, group: grp };
}

export function tickObelisk(o: ObeliskHandle, time: number): void {
  const crystal = o.group.userData.crystal as THREE.Mesh;
  const ring = o.group.userData.ring as THREE.Mesh;
  if (crystal) {
    crystal.rotation.y = time * 0.6;
    crystal.position.y = 5.0 + Math.sin(time * 1.5) * 0.15;
  }
  if (ring) {
    const s = 1 + Math.sin(time * 2.0) * 0.06;
    ring.scale.setScalar(s);
    (ring.material as THREE.MeshBasicMaterial).opacity =
      0.35 + Math.sin(time * 2.0) * 0.15;
  }
}

export function buildSettlement(
  scene: THREE.Scene,
  settlement: Settlement,
  rng: () => number,
): BuiltSettlement {
  const obstacles: Array<{ obj: THREE.Object3D; box: THREE.Box3 }> = [];
  const center = settlement.position;

  // central plaza paving
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(8, 48),
    new THREE.MeshStandardMaterial({
      map: settlement.starter ? MARBLE : STONE_SET.map,
      normalMap: settlement.starter ? null : STONE_SET.normalMap,
      roughness: settlement.starter ? 0.4 : 0.85,
      metalness: settlement.starter ? 0.08 : 0.04,
    }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(center.x, 0.025, center.z);
  plaza.receiveShadow = true;
  scene.add(plaza);

  // obelisk
  const obelisk = buildObelisk(settlement);
  scene.add(obelisk.group);
  obstacles.push({
    obj: obelisk.group,
    box: new THREE.Box3().setFromCenterAndSize(
      settlement.obeliskPosition.clone().add(new THREE.Vector3(0, 2.5, 0)),
      new THREE.Vector3(1.5, 5, 1.5),
    ),
  });

  // houses around plaza
  const houseCount = settlement.starter ? 6 : 4;
  for (let i = 0; i < houseCount; i++) {
    const a = (i / houseCount) * Math.PI * 2 + 0.3;
    const r = 14 + rng() * 3;
    const house = buildHouse(rng);
    house.position.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
    house.rotation.y = -a + Math.PI;
    scene.add(house);
    const w = 4.2;
    obstacles.push({
      obj: house,
      box: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(house.position.x, 1, house.position.z),
        new THREE.Vector3(w, 2.4, w),
      ),
    });
  }

  // perimeter fence (gaps for entry)
  const fenceR = 22;
  for (let i = 0; i < 16; i++) {
    if (i === 0 || i === 4 || i === 8 || i === 12) continue; // gaps
    const a = (i / 16) * Math.PI * 2;
    const seg = buildFenceSegment();
    seg.position.set(
      center.x + Math.cos(a) * fenceR,
      0,
      center.z + Math.sin(a) * fenceR,
    );
    seg.rotation.y = -a + Math.PI / 2;
    scene.add(seg);
  }

  let crafterPosition: THREE.Vector3 | undefined;
  if (settlement.starter) {
    // crafter NPC anvil station
    const anvil = new THREE.Group();
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ map: STONE_SET.map, roughness: 0.85 }),
    );
    stand.position.y = 0.3;
    anvil.add(stand);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.18, 0.45),
      new THREE.MeshStandardMaterial({ map: METAL, roughness: 0.5, metalness: 0.7 }),
    );
    top.position.y = 0.7;
    anvil.add(top);
    const anvilPos = new THREE.Vector3(center.x + 6, 0, center.z + 4);
    anvil.position.copy(anvilPos);
    anvil.castShadow = true;
    scene.add(anvil);

    // simple NPC
    const npc = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.9, 6, 8),
      new THREE.MeshLambertMaterial({ map: ROOF_TEX, color: 0xcfa566 }),
    );
    body.position.y = 1.0;
    npc.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshLambertMaterial({ color: 0xe8c89a }),
    );
    head.position.y = 1.7;
    npc.add(head);
    npc.position.set(anvilPos.x + 1, 0, anvilPos.z);
    npc.castShadow = true;
    scene.add(npc);

    crafterPosition = anvilPos;
    obstacles.push({
      obj: anvil,
      box: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(anvilPos.x, 0.5, anvilPos.z),
        new THREE.Vector3(1.4, 1.2, 1.0),
      ),
    });
  }

  return { obstacles, obelisk, crafterPosition };
}
