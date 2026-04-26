import * as THREE from "three";
import { ITEMS } from "./items";

export interface GroundItem {
  id: string;
  amount: number;
  position: THREE.Vector3;
  group: THREE.Group;
  spawnTime: number;
}

const ITEM_COLOR: Record<string, number> = {
  goblin_tooth: 0xfff0a0,
  wolf_pelt: 0xc89a6a,
  orc_horn: 0xa07033,
  iron_ore: 0x9aa3a8,
  rune_dust: 0xc890ff,
  potion_hp: 0xff5050,
  potion_mp: 0x4080ff,
  amulet_attack: 0xffa030,
  amulet_defense: 0x80c0ff,
  amulet_vitality: 0x40ff70,
};

function buildItemMesh(id: string): THREE.Group {
  const grp = new THREE.Group();
  const color = ITEM_COLOR[id] ?? 0xffffff;
  const def = ITEMS[id];
  // small sparkle gem
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.4),
      emissiveIntensity: 1.0,
      metalness: 0.3,
      roughness: 0.4,
    }),
  );
  gem.position.y = 0.4;
  gem.castShadow = true;
  grp.add(gem);

  // pedestal disc
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.04;
  grp.add(disc);

  // label sprite (icon)
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "32px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText(def?.icon ?? "?", 24, 26);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  sprite.scale.set(0.6, 0.6, 1);
  sprite.position.y = 1.0;
  sprite.renderOrder = 800;
  grp.add(sprite);

  grp.userData.gem = gem;
  return grp;
}

export function spawnGroundItem(
  scene: THREE.Scene,
  id: string,
  amount: number,
  pos: THREE.Vector3,
): GroundItem {
  const group = buildItemMesh(id);
  // jitter so multiple drops don't stack
  group.position.set(
    pos.x + (Math.random() - 0.5) * 1.2,
    0,
    pos.z + (Math.random() - 0.5) * 1.2,
  );
  scene.add(group);
  return {
    id,
    amount,
    position: group.position,
    group,
    spawnTime: performance.now() / 1000,
  };
}

export function tickGroundItems(items: GroundItem[], time: number): void {
  for (const it of items) {
    const gem = it.group.userData.gem as THREE.Mesh;
    if (gem) {
      gem.rotation.y = time * 1.5;
      gem.position.y = 0.4 + Math.sin(time * 2 + it.position.x) * 0.08;
    }
  }
}

export function despawnGroundItem(
  scene: THREE.Scene,
  items: GroundItem[],
  item: GroundItem,
): void {
  scene.remove(item.group);
  item.group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mat = o.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else (mat as THREE.Material).dispose();
    }
  });
  const idx = items.indexOf(item);
  if (idx >= 0) items.splice(idx, 1);
}
