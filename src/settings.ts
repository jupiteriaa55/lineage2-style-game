/**
 * Game graphics / performance settings.
 *
 * - QualityPreset names: "low" | "medium" | "high" | "ultra"
 * - autoDetectQuality() picks a sensible default based on device capabilities.
 * - loadSettings() / saveSettings() persist to localStorage.
 * - applySettings(renderer, scene) applies renderer-side settings (pixelRatio,
 *   shadowMap, fog distance). World density (mob/bot/tree counts, view distance)
 *   is read from the active preset by main.ts when spawning entities.
 */

import * as THREE from "three";

export type QualityPreset = "low" | "medium" | "high" | "ultra";

export interface Quality {
  name: QualityPreset;
  // Renderer
  pixelRatio: number; // 0.5 .. 2
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number; // px (0 if shadows off)
  toneMapping: boolean;
  // Scene
  fogNear: number;
  fogFar: number;
  // World density / counts
  treeCount: number;
  rockCount: number;
  groundNoiseParticles: number;
  mobsPerBiome: number;
  botCount: number;
  // Misc
  drawDistance: number;
  particles: boolean;
}

export const QUALITY_PRESETS: Record<QualityPreset, Quality> = {
  low: {
    name: "low",
    pixelRatio: 0.75,
    antialias: false,
    shadows: false,
    shadowMapSize: 0,
    toneMapping: false,
    fogNear: 30,
    fogFar: 110,
    treeCount: 60,
    rockCount: 40,
    groundNoiseParticles: 3000,
    mobsPerBiome: 4,
    botCount: 4,
    drawDistance: 130,
    particles: false,
  },
  medium: {
    name: "medium",
    pixelRatio: 1.0,
    antialias: false,
    shadows: true,
    shadowMapSize: 1024,
    toneMapping: true,
    fogNear: 50,
    fogFar: 180,
    treeCount: 140,
    rockCount: 100,
    groundNoiseParticles: 7000,
    mobsPerBiome: 6,
    botCount: 8,
    drawDistance: 200,
    particles: true,
  },
  high: {
    name: "high",
    pixelRatio: 1.25,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    toneMapping: true,
    fogNear: 70,
    fogFar: 260,
    treeCount: 240,
    rockCount: 180,
    groundNoiseParticles: 14000,
    mobsPerBiome: 8,
    botCount: 12,
    drawDistance: 300,
    particles: true,
  },
  ultra: {
    name: "ultra",
    pixelRatio: 1.75,
    antialias: true,
    shadows: true,
    shadowMapSize: 4096,
    toneMapping: true,
    fogNear: 90,
    fogFar: 360,
    treeCount: 360,
    rockCount: 260,
    groundNoiseParticles: 22000,
    mobsPerBiome: 10,
    botCount: 16,
    drawDistance: 420,
    particles: true,
  },
};

const STORAGE_KEY = "cdg.settings.v1";

export interface Settings {
  preset: QualityPreset;
  auto: boolean; // true => preset is recomputed each boot
  master: number; // 0..1 audio (reserved)
}

export function defaultSettings(): Settings {
  return { preset: autoDetectQuality(), auto: true, master: 0.7 };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const preset =
      parsed.preset && parsed.preset in QUALITY_PRESETS
        ? (parsed.preset as QualityPreset)
        : autoDetectQuality();
    return {
      preset,
      auto: parsed.auto ?? true,
      master: typeof parsed.master === "number" ? parsed.master : 0.7,
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function getQuality(s: Settings): Quality {
  return QUALITY_PRESETS[s.preset];
}

/* ---------- Capability detection ---------- */

interface Caps {
  isMobile: boolean;
  cores: number;
  memoryGB: number;
  pixelRatio: number;
  screenPixels: number;
  gpuTier: 0 | 1 | 2 | 3; // 0=potato, 3=desktop
  reduceMotion: boolean;
}

function detectCaps(): Caps {
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  const cores = Math.max(1, navigator.hardwareConcurrency || 2);
  // deviceMemory is in GB on Chromium; fallback 4 if absent.
  const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const memoryGB = typeof dm === "number" ? dm : isMobile ? 3 : 8;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const screenPixels = window.screen.width * window.screen.height;
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Probe WebGL renderer string for a GPU hint (best-effort).
  let gpuTier: Caps["gpuTier"] = 1;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ||
      c.getContext("webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = ext
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : "";
      const vendor = ext
        ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL))
        : "";
      const s = (renderer + " " + vendor).toLowerCase();
      if (
        /rtx|radeon rx [6-9]|radeon pro|m1|m2|m3|m4|apple gpu|adreno 7|mali-g7/.test(
          s,
        )
      ) {
        gpuTier = 3;
      } else if (/gtx|radeon rx [3-5]|adreno 6|mali-g5|intel iris/.test(s)) {
        gpuTier = 2;
      } else if (/intel hd|intel uhd|adreno 5|mali-g3|mali-t/.test(s)) {
        gpuTier = 1;
      } else if (/swiftshader|software/.test(s)) {
        gpuTier = 0;
      }
    } else {
      gpuTier = 0;
    }
  } catch {
    gpuTier = 1;
  }

  return {
    isMobile,
    cores,
    memoryGB,
    pixelRatio,
    screenPixels,
    gpuTier,
    reduceMotion,
  };
}

export function autoDetectQuality(): QualityPreset {
  const c = detectCaps();
  if (c.gpuTier === 0 || c.cores <= 2 || c.memoryGB < 2) return "low";
  if (c.reduceMotion) return "low";
  if (c.isMobile) {
    if (c.gpuTier >= 3 && c.cores >= 6 && c.memoryGB >= 6) return "high";
    if (c.gpuTier >= 2 && c.cores >= 4 && c.memoryGB >= 3) return "medium";
    return "low";
  }
  // Desktop / laptop
  if (c.gpuTier >= 3 && c.cores >= 8 && c.memoryGB >= 8) return "ultra";
  if (c.gpuTier >= 2 && c.cores >= 4 && c.memoryGB >= 4) return "high";
  if (c.gpuTier >= 1) return "medium";
  return "low";
}

/* ---------- Apply ---------- */

export function applyRendererSettings(
  renderer: THREE.WebGLRenderer,
  q: Quality,
): void {
  renderer.setPixelRatio(q.pixelRatio);
  renderer.shadowMap.enabled = q.shadows;
  if (q.shadows) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = q.toneMapping
    ? THREE.ACESFilmicToneMapping
    : THREE.NoToneMapping;
}

export function applySceneFog(scene: THREE.Scene, q: Quality): void {
  if (!scene.fog) {
    scene.fog = new THREE.Fog(0x0a0a14, q.fogNear, q.fogFar);
  } else if (scene.fog instanceof THREE.Fog) {
    scene.fog.near = q.fogNear;
    scene.fog.far = q.fogFar;
  }
}

export function applyLightShadows(
  light: THREE.DirectionalLight,
  q: Quality,
): void {
  light.castShadow = q.shadows;
  if (q.shadows) {
    light.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 600;
    const d = 200;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.updateProjectionMatrix();
  }
}
