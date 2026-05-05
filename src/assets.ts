import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Asset paths use Vite's static `public/` root. Paths must be relative
 * to the deployed base URL (vite.config.ts uses `base: "./"`).
 */
const BASE = "assets/";

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group>>();

export const ASSET_PATHS = {
  // Characters
  charHuman: `${BASE}characters/human.glb`,
  charOrc: `${BASE}characters/orc.glb`,
  charSoldier: `${BASE}characters/soldier.glb`,
  charMerchant: `${BASE}characters/merchant.glb`,
  charQuest: `${BASE}characters/quest.glb`,
  charTrainer: `${BASE}characters/trainer.glb`,

  // Dungeon props
  chest: `${BASE}dungeon/chest.glb`,
  barrel: `${BASE}dungeon/barrel.glb`,
  banner: `${BASE}dungeon/banner.glb`,
  coin: `${BASE}dungeon/coin.glb`,
  column: `${BASE}dungeon/column.glb`,
  stones: `${BASE}dungeon/stones.glb`,
  rocks: `${BASE}dungeon/rocks.glb`,
  weaponSword: `${BASE}dungeon/weapon-sword.glb`,
  weaponSpear: `${BASE}dungeon/weapon-spear.glb`,
  shield: `${BASE}dungeon/shield.glb`,

  // Town buildings (curated quick-access list — full set under public/assets/town).
  wallWood: `${BASE}town/wall-wood.glb`,
  wallWoodHalf: `${BASE}town/wall-wood-half.glb`,
  wallWoodCorner: `${BASE}town/wall-wood-corner.glb`,
  wallWoodDoor: `${BASE}town/wall-wood-door.glb`,
  wallWoodWindow: `${BASE}town/wall-wood-window-shutters.glb`,
  wallStone: `${BASE}town/wall.glb`,
  wallStoneHalf: `${BASE}town/wall-half.glb`,
  wallStoneCorner: `${BASE}town/wall-corner.glb`,
  wallStoneDoor: `${BASE}town/wall-door.glb`,
  wallStoneWindow: `${BASE}town/wall-window-shutters.glb`,
  roofGable: `${BASE}town/roof-gable.glb`,
  roofGableEnd: `${BASE}town/roof-gable-end.glb`,
  roofHigh: `${BASE}town/roof-high.glb`,
  roofHighGable: `${BASE}town/roof-high-gable.glb`,
  roofHighGableEnd: `${BASE}town/roof-high-gable-end.glb`,
  roofPoint: `${BASE}town/roof-point.glb`,
  roofFlat: `${BASE}town/roof-flat.glb`,
  chimney: `${BASE}town/chimney.glb`,
  fountain: `${BASE}town/fountain-round.glb`,
  fountainCenter: `${BASE}town/fountain-center.glb`,
  lantern: `${BASE}town/lantern.glb`,
  cart: `${BASE}town/cart.glb`,
  fence: `${BASE}town/fence.glb`,
  fenceGate: `${BASE}town/fence-gate.glb`,
  pillarWood: `${BASE}town/pillar-wood.glb`,
  pillarStone: `${BASE}town/pillar-stone.glb`,
  stallGreen: `${BASE}town/stall-green.glb`,
  stallRed: `${BASE}town/stall-red.glb`,
  stairsWood: `${BASE}town/stairs-wood.glb`,
  stairsStone: `${BASE}town/stairs-stone.glb`,
  treeRound: `${BASE}town/tree.glb`,
  treeHigh: `${BASE}town/tree-high.glb`,
  treeCrooked: `${BASE}town/tree-crooked.glb`,
  treeHighRound: `${BASE}town/tree-high-round.glb`,
  rockSmall: `${BASE}town/rock-small.glb`,
  rockWide: `${BASE}town/rock-wide.glb`,
  rockLarge: `${BASE}town/rock-large.glb`,
  bannerGreen: `${BASE}town/banner-green.glb`,
  bannerRed: `${BASE}town/banner-red.glb`,
  windmill: `${BASE}town/windmill.glb`,
  watermill: `${BASE}town/watermill.glb`,
  wheel: `${BASE}town/wheel.glb`,
  hedge: `${BASE}town/hedge.glb`,
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;

/**
 * Load a single GLB file. Cached after first load; cloned on every
 * subsequent call so callers can manipulate without affecting siblings.
 */
export async function loadAsset(key: AssetKey): Promise<THREE.Group> {
  const path = ASSET_PATHS[key];
  if (cache.has(path)) {
    return cloneScene(cache.get(path)!);
  }
  if (inflight.has(path)) {
    const root = await inflight.get(path)!;
    return cloneScene(root);
  }
  const promise = loadGLB(path);
  inflight.set(path, promise);
  try {
    const root = await promise;
    cache.set(path, root);
    return cloneScene(root);
  } catch (err) {
    inflight.delete(path);
    throw err;
  }
}

/** Synchronous variant: returns a clone if cached, otherwise null. */
export function getAsset(key: AssetKey): THREE.Group | null {
  const path = ASSET_PATHS[key];
  const root = cache.get(path);
  if (!root) return null;
  return cloneScene(root);
}

export async function preloadAssets(
  keys: AssetKey[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0;
  await Promise.all(
    keys.map(async (k) => {
      try {
        await loadAsset(k);
      } catch (err) {
        console.warn(`Failed to preload ${k}`, err);
      } finally {
        done += 1;
        onProgress?.(done, keys.length);
      }
    }),
  );
}

/** All asset keys, ordered for predictable preload progress UI. */
export function allAssetKeys(): AssetKey[] {
  return Object.keys(ASSET_PATHS) as AssetKey[];
}

function loadGLB(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            // Improve appearance under directional lighting.
            const m = obj.material as THREE.Material | THREE.Material[];
            if (Array.isArray(m)) {
              for (const mm of m) tuneMaterial(mm);
            } else {
              tuneMaterial(m);
            }
          }
        });
        resolve(gltf.scene);
      },
      undefined,
      (err) => reject(err),
    );
  });
}

function tuneMaterial(m: THREE.Material): void {
  if (m instanceof THREE.MeshStandardMaterial) {
    m.metalness = 0.05;
    m.roughness = 0.85;
  }
}

function cloneScene(root: THREE.Group): THREE.Group {
  const clone = root.clone(true);
  // Make sure cloned meshes have unique material instances when tinted,
  // but share when untouched. We clone materials lazily via tintMesh().
  clone.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return clone;
}

/**
 * Recursively recolor all meshes whose hex color is close to `srcHex`
 * (within a small distance). Useful for making race variants from a
 * single base mesh by replacing skin / cloth color.
 */
export function recolorMesh(
  group: THREE.Object3D,
  src: number,
  dst: number,
  threshold = 0.18,
): void {
  const srcCol = new THREE.Color(src);
  const dstCol = new THREE.Color(dst);
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    const apply = (m: THREE.Material) => {
      const c = (m as THREE.MeshStandardMaterial).color;
      if (!c) return;
      if (colorDistance(c, srcCol) < threshold) {
        const cloned = m.clone();
        (cloned as THREE.MeshStandardMaterial).color = dstCol.clone();
        return cloned;
      }
      return m;
    };
    if (Array.isArray(mat)) {
      obj.material = mat.map((m) => apply(m) ?? m);
    } else if (mat) {
      const r = apply(mat);
      if (r && r !== mat) obj.material = r;
    }
  });
}

/**
 * Tint every mesh in the group toward the target color by `amount`.
 * Multiplies existing color toward `tint`.
 */
export function tintGroup(
  group: THREE.Object3D,
  tint: number,
  amount = 0.4,
): void {
  const t = new THREE.Color(tint);
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    const apply = (m: THREE.Material): THREE.Material => {
      const c = (m as THREE.MeshStandardMaterial).color;
      if (!c) return m;
      const cloned = m.clone();
      const cc = (cloned as THREE.MeshStandardMaterial).color;
      cc.lerp(t, amount);
      return cloned;
    };
    if (Array.isArray(mat)) {
      obj.material = mat.map(apply);
    } else if (mat) {
      obj.material = apply(mat);
    }
  });
}

function colorDistance(a: THREE.Color, b: THREE.Color): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
