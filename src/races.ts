import * as THREE from "three";
import type { RaceDef, RaceId } from "./types";

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: "human",
    name: "Human",
    description:
      "Versatile and well-balanced. Adaptable to any path of combat or magic.",
    startCity: "city_human",
    scale: 1.0,
    palette: { skin: 0xddc7a8, hair: 0x6b4a26, body: 0x3a5e9e, accent: 0x6e4a1e },
    ears: "round",
    beard: false,
    statBonus: { hpMax: 0, mpMax: 0, attack: 1, defense: 1 },
    heightMul: 1.0,
    bodyMul: 1.0,
  },
  elf: {
    id: "elf",
    name: "High Elf",
    description:
      "Graceful, swift, attuned to mana. Strong in magic and ranged combat.",
    startCity: "city_elf",
    scale: 1.0,
    palette: { skin: 0xf2dec1, hair: 0xf2e3a8, body: 0x4a8a52, accent: 0xc1a04a },
    ears: "long",
    beard: false,
    statBonus: { mpMax: 20, attack: 1, defense: 0, attackSpeed: -0.05 },
    heightMul: 1.04,
    bodyMul: 0.92,
  },
  darkelf: {
    id: "darkelf",
    name: "Shade Elf",
    description:
      "Reclusive elves of the underdeeps. Deadly precision, cold resolve.",
    startCity: "city_darkelf",
    scale: 1.0,
    palette: { skin: 0x6e6480, hair: 0xe8e0e0, body: 0x402a4a, accent: 0x8a3a8a },
    ears: "long",
    beard: false,
    statBonus: { mpMax: 14, attack: 2, defense: 0, attackSpeed: -0.06 },
    heightMul: 1.02,
    bodyMul: 0.92,
  },
  dwarf: {
    id: "dwarf",
    name: "Dwarf",
    description:
      "Hardy mountain folk. Master smiths, stout fighters, and stalwart defenders.",
    startCity: "city_dwarf",
    scale: 0.85,
    palette: { skin: 0xe2b687, hair: 0xb86c1a, body: 0x6c4220, accent: 0xd4a64a },
    ears: "short",
    beard: true,
    statBonus: { hpMax: 30, defense: 2, attack: 1, attackSpeed: 0.08 },
    heightMul: 0.78,
    bodyMul: 1.18,
  },
  orc: {
    id: "orc",
    name: "Orc",
    description:
      "Savage and powerful warriors of the steppes. Few rivals at melee.",
    startCity: "city_orc",
    scale: 1.1,
    palette: { skin: 0x6a8a4a, hair: 0x2a1a0a, body: 0x4a3a28, accent: 0x8a3a1a },
    ears: "tusks",
    beard: false,
    statBonus: { hpMax: 35, attack: 3, defense: 1, attackSpeed: 0.1 },
    heightMul: 1.12,
    bodyMul: 1.1,
  },
};

export const RACE_LIST: RaceDef[] = Object.values(RACES);

export interface RaceMeshOptions {
  /** Override clothing colors (e.g. by class). */
  bodyColor?: number;
  accentColor?: number;
}

/**
 * Build a procedural low-poly humanoid mesh for the given race.
 * No external assets required.
 */
export function buildRaceMesh(
  race: RaceDef,
  opts: RaceMeshOptions = {},
): THREE.Group {
  const g = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: race.palette.skin });
  const hairMat = new THREE.MeshLambertMaterial({ color: race.palette.hair });
  const bodyMat = new THREE.MeshLambertMaterial({
    color: opts.bodyColor ?? race.palette.body,
  });
  const accentMat = new THREE.MeshLambertMaterial({
    color: opts.accentColor ?? race.palette.accent,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x101418 });

  const hMul = race.heightMul;
  const bMul = race.bodyMul;

  const torsoH = 1.0 * hMul;
  const torsoW = 0.8 * bMul;
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(torsoW, torsoH, 0.5 * bMul),
    bodyMat,
  );
  torso.position.y = 1.2 * hMul;
  torso.castShadow = true;
  g.add(torso);

  const beltH = 0.15 * hMul;
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(torsoW + 0.05, beltH, 0.55 * bMul),
    accentMat,
  );
  belt.position.y = 0.75 * hMul;
  belt.castShadow = true;
  g.add(belt);

  const legH = 0.85 * hMul;
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32 * bMul, legH, 0.4 * bMul),
    accentMat,
  );
  legL.position.set(-0.22 * bMul, legH * 0.5, 0);
  legL.castShadow = true;
  g.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.22 * bMul;
  g.add(legR);

  const armW = 0.25 * bMul;
  const armH = 0.85 * hMul;
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(armW, armH, 0.3 * bMul),
    bodyMat,
  );
  armL.position.set(-(torsoW * 0.5 + armW * 0.55), 1.2 * hMul, 0);
  armL.castShadow = true;
  g.add(armL);

  const armR = armL.clone();
  armR.position.x = torsoW * 0.5 + armW * 0.55;
  g.add(armR);

  const headSize = 0.55 * Math.min(hMul, 1.05);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(headSize, headSize, headSize),
    skinMat,
  );
  head.position.y = 1.2 * hMul + torsoH * 0.5 + headSize * 0.5;
  head.castShadow = true;
  g.add(head);

  // Eyes - small black blocks on the front face.
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.04);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.11, head.position.y + 0.03, headSize * 0.5);
  g.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.11, head.position.y + 0.03, headSize * 0.5);
  g.add(eyeR);

  // Hair / hood (top slab).
  if (race.id !== "dwarf" || true) {
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(headSize + 0.04, 0.18, headSize + 0.04),
      hairMat,
    );
    hair.position.y = head.position.y + headSize * 0.5 + 0.05;
    hair.castShadow = true;
    g.add(hair);
  }

  // Long hair sides for elves.
  if (race.ears === "long") {
    const sideHair = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.5, headSize + 0.04),
      hairMat,
    );
    sideHair.position.set(
      -(headSize * 0.5 + 0.03),
      head.position.y - 0.1,
      0,
    );
    g.add(sideHair);
    const sideHairR = sideHair.clone();
    sideHairR.position.x = headSize * 0.5 + 0.03;
    g.add(sideHairR);
  }

  // Ears.
  if (race.ears === "long") {
    const earGeo = new THREE.ConeGeometry(0.06, 0.32, 4);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-(headSize * 0.5 + 0.06), head.position.y + 0.1, 0);
    earL.rotation.z = Math.PI * 0.5;
    earL.rotation.y = -0.4;
    g.add(earL);
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(headSize * 0.5 + 0.06, head.position.y + 0.1, 0);
    earR.rotation.z = -Math.PI * 0.5;
    earR.rotation.y = 0.4;
    g.add(earR);
  } else if (race.ears === "tusks") {
    const tuskGeo = new THREE.ConeGeometry(0.04, 0.14, 4);
    const tuskMat = new THREE.MeshLambertMaterial({ color: 0xf0e9c8 });
    const tuskL = new THREE.Mesh(tuskGeo, tuskMat);
    tuskL.position.set(-0.08, head.position.y - 0.16, headSize * 0.5);
    tuskL.rotation.x = Math.PI;
    g.add(tuskL);
    const tuskR = new THREE.Mesh(tuskGeo, tuskMat);
    tuskR.position.set(0.08, head.position.y - 0.16, headSize * 0.5);
    tuskR.rotation.x = Math.PI;
    g.add(tuskR);
  }

  // Beard for dwarves.
  if (race.beard) {
    const beard = new THREE.Mesh(
      new THREE.BoxGeometry(headSize - 0.02, 0.34, 0.12),
      hairMat,
    );
    beard.position.set(0, head.position.y - 0.28, headSize * 0.5 - 0.01);
    g.add(beard);
  }

  return g;
}

export function attachRaceWeaponSlot(
  group: THREE.Group,
  race: RaceDef,
): THREE.Object3D {
  // Anchor used for attaching weapons procedurally. Right-shoulder.
  const anchor = new THREE.Object3D();
  anchor.position.set(
    0.55 * race.bodyMul,
    1.2 * race.heightMul,
    0.05,
  );
  anchor.name = "weapon_anchor";
  group.add(anchor);
  return anchor;
}
