import * as THREE from "three";

interface NoiseFn {
  (x: number, y: number): number;
}

function makeNoise(seed: number): NoiseFn {
  const grad: number[][] = [];
  let s = seed | 0;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 256; i++) {
    const a = rng() * Math.PI * 2;
    grad[i] = [Math.cos(a), Math.sin(a)];
  }
  const perm: number[] = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = (i: number) => perm[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (g: number[], dx: number, dy: number) => g[0] * dx + g[1] * dy;
  return (x, y) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = grad[p(xi + p(yi))];
    const ab = grad[p(xi + p(yi + 1))];
    const ba = grad[p(xi + 1 + p(yi))];
    const bb = grad[p(xi + 1 + p(yi + 1))];
    const x1 = dot(aa, xf, yf) * (1 - u) + dot(ba, xf - 1, yf) * u;
    const x2 = dot(ab, xf, yf - 1) * (1 - u) + dot(bb, xf - 1, yf - 1) * u;
    return x1 * (1 - v) + x2 * v;
  };
}

function fbm(noise: NoiseFn, x: number, y: number, octaves = 4): number {
  let v = 0;
  let amp = 1;
  let freq = 1;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    v += noise(x * freq, y * freq) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / total;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function buildNormalFromHeight(
  heightCanvas: HTMLCanvasElement,
  strength = 1.5,
): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const src = heightCanvas.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const dst = ctx.createImageData(w, h);
  const sample = (x: number, y: number) => {
    const xi = ((x % w) + w) % w;
    const yi = ((y % h) + h) % h;
    return src[(yi * w + xi) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const i = (y * w + x) * 4;
      dst.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      dst.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      dst.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      dst.data[i + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return out;
}

function canvasToTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  isData = false,
): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isData ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ---------- GRASS (rich, with clumps, flowers, fallen leaves, baked AO) ----------
export function makeGrassTexture(size = 1024): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n1 = makeNoise(42);
  const n2 = makeNoise(91);

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const big = fbm(n1, u * 3, v * 3, 5) * 0.5 + 0.5;
      const med = fbm(n1, u * 12 + 5, v * 12 + 5, 4) * 0.5 + 0.5;
      const fine = fbm(n2, u * 60, v * 60, 2) * 0.5 + 0.5;
      const dirtMask = Math.max(0, fbm(n2, u * 2 + 100, v * 2 + 100, 3) - 0.05);
      const dryMask = Math.max(0, fbm(n1, u * 5 + 200, v * 5 + 200, 3));

      const lush = 0.55 + big * 0.45 + med * 0.15;
      // base dark green
      let r = 38 + lush * 35 + fine * 18;
      let g = 78 + lush * 65 + fine * 22;
      let b = 28 + lush * 24 + fine * 10;

      // dry yellowish patches
      r += dryMask * 50;
      g += dryMask * 35;
      b -= dryMask * 10;

      // dirt patches (warm brown)
      r = r * (1 - dirtMask * 0.7) + 105 * dirtMask * 0.7;
      g = g * (1 - dirtMask * 0.7) + 78 * dirtMask * 0.7;
      b = b * (1 - dirtMask * 0.7) + 50 * dirtMask * 0.7;

      // baked AO: darker in noise valleys
      const ao = 0.7 + big * 0.3;
      r *= ao;
      g *= ao;
      b *= ao;

      const i = (y * size + x) * 4;
      img.data[i] = clamp255(r);
      img.data[i + 1] = clamp255(g);
      img.data[i + 2] = clamp255(b);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // grass blade strokes
  const blades = (size * size) / 80;
  for (let i = 0; i < blades; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 1.5 + Math.random() * 4;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
    const c = 60 + Math.random() * 90;
    const dark = Math.random() < 0.4;
    const r = dark ? c * 0.45 : c * 0.7;
    const gg = dark ? c * 0.7 : c;
    const bb = dark ? c * 0.3 : c * 0.45;
    ctx.strokeStyle = `rgba(${r | 0},${gg | 0},${bb | 0},${0.5 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.7 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // tiny flowers
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const palette = [
      [255, 230, 150],
      [220, 200, 240],
      [240, 200, 200],
      [220, 220, 230],
    ];
    const c = palette[(Math.random() * palette.length) | 0];
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.85)`;
    const r = 1.2 + Math.random() * 1.6;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(220,180,60,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // fallen leaves
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const c = [
      [120, 90, 30],
      [140, 80, 40],
      [90, 70, 30],
    ][(Math.random() * 3) | 0];
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.7)`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 + Math.random() * 4, 1.5 + Math.random() * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // very fine grain noise pass for texture
  const finePass = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < finePass.data.length; i += 4) {
    const j = (Math.random() - 0.5) * 12;
    finePass.data[i] = clamp255(finePass.data[i] + j);
    finePass.data[i + 1] = clamp255(finePass.data[i + 1] + j);
    finePass.data[i + 2] = clamp255(finePass.data[i + 2] + j);
  }
  ctx.putImageData(finePass, 0, 0);

  return canvasToTexture(canvas, 16, 16);
}

// ---------- COBBLESTONE PATH (rounded river stones with mortar) ----------
export function makeCobblestoneTexture(size = 1024): {
  map: THREE.Texture;
  normalMap: THREE.Texture;
} {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(33);

  // mortar base
  ctx.fillStyle = "#3a342a";
  ctx.fillRect(0, 0, size, size);
  const baseImg = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = fbm(n, x * 0.04, y * 0.04, 3) * 12;
      baseImg.data[i] = clamp255(60 + v);
      baseImg.data[i + 1] = clamp255(54 + v);
      baseImg.data[i + 2] = clamp255(44 + v);
    }
  }
  ctx.putImageData(baseImg, 0, 0);

  // height canvas for normal map
  const heightCv = document.createElement("canvas");
  heightCv.width = size;
  heightCv.height = size;
  const hctx = heightCv.getContext("2d")!;
  hctx.fillStyle = "#202020"; // mortar = low
  hctx.fillRect(0, 0, size, size);

  // Poisson-ish disc placement of stones via grid jitter
  const cell = 64;
  const cols = Math.ceil(size / cell) + 1;
  const rows = Math.ceil(size / cell) + 1;
  const stones: Array<{ x: number; y: number; rx: number; ry: number; rot: number; tone: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = c * cell + (Math.random() - 0.5) * cell * 0.7;
      const oy = r * cell + (Math.random() - 0.5) * cell * 0.7;
      const rx = cell * (0.36 + Math.random() * 0.16);
      const ry = cell * (0.30 + Math.random() * 0.18);
      const rot = Math.random() * Math.PI;
      const tone = 130 + Math.random() * 70;
      stones.push({ x: ox, y: oy, rx, ry, rot, tone });
    }
  }

  for (const st of stones) {
    // base stone color with subtle gradient (pseudo-shading)
    const grad = ctx.createRadialGradient(
      st.x - st.rx * 0.3,
      st.y - st.ry * 0.3,
      st.rx * 0.1,
      st.x,
      st.y,
      Math.max(st.rx, st.ry),
    );
    const t = st.tone | 0;
    grad.addColorStop(0, `rgb(${t + 35},${t + 30},${t + 20})`);
    grad.addColorStop(0.6, `rgb(${t},${t - 5},${t - 18})`);
    grad.addColorStop(1, `rgb(${(t * 0.55) | 0},${(t * 0.5) | 0},${(t * 0.4) | 0})`);
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, st.rx, st.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // texture noise overlay per stone
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, st.rx, st.ry, 0, 0, Math.PI * 2);
    ctx.clip();
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(${(st.tone * 0.4) | 0},${(st.tone * 0.4) | 0},${(st.tone * 0.4) | 0},${Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.arc(
        (Math.random() - 0.5) * st.rx * 1.6,
        (Math.random() - 0.5) * st.ry * 1.6,
        Math.random() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();

    // height: bright in middle, dark at edges
    hctx.save();
    hctx.translate(st.x, st.y);
    hctx.rotate(st.rot);
    const hgrad = hctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(st.rx, st.ry));
    hgrad.addColorStop(0, "#f0f0f0");
    hgrad.addColorStop(0.7, "#909090");
    hgrad.addColorStop(1, "#202020");
    hctx.fillStyle = hgrad;
    hctx.beginPath();
    hctx.ellipse(0, 0, st.rx, st.ry, 0, 0, Math.PI * 2);
    hctx.fill();
    hctx.restore();
  }

  // moss in cracks
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 30 | 0},${90 + Math.random() * 40 | 0},${40 + Math.random() * 25 | 0},${0.45 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      4 + Math.random() * 10,
      2 + Math.random() * 5,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const normalCv = buildNormalFromHeight(heightCv, 2.5);
  return {
    map: canvasToTexture(canvas, 4, 4),
    normalMap: canvasToTexture(normalCv, 4, 4, true),
  };
}

// ---------- DIRT PATH ----------
export function makeDirtTexture(size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(77);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const a = fbm(n, u * 4, v * 4, 5) * 0.5 + 0.5;
      const b = fbm(n, u * 30, v * 30, 3) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      const base = 95 + a * 50 + b * 12;
      img.data[i] = clamp255(base);
      img.data[i + 1] = clamp255(base * 0.8);
      img.data[i + 2] = clamp255(base * 0.55);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // pebbles
  for (let i = 0; i < 600; i++) {
    const c = 90 + Math.random() * 80;
    ctx.fillStyle = `rgba(${c | 0},${(c * 0.85) | 0},${(c * 0.7) | 0},0.85)`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 0.6 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // tracks
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(40,30,20,${0.12 + Math.random() * 0.1})`;
    ctx.lineWidth = 6 + Math.random() * 8;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.04) * 6 + (Math.random() - 0.5) * 2);
    }
    ctx.stroke();
  }
  return canvasToTexture(canvas, 4, 4);
}

// ---------- HEWN STONE / MASONRY (with normal map) ----------
export function makeStoneTexture(size = 512): THREE.Texture {
  return makeStoneTextureSet(size).map;
}

export function makeStoneTextureSet(size = 1024): {
  map: THREE.Texture;
  normalMap: THREE.Texture;
} {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(7);

  // base color fill
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const a = fbm(n, u * 5, v * 5, 5) * 0.5 + 0.5;
      const stain = Math.max(0, fbm(n, u * 2 + 300, v * 2 + 300, 3));
      const i = (y * size + x) * 4;
      const base = 150 + a * 60;
      img.data[i] = clamp255(base * 0.96 - stain * 28);
      img.data[i + 1] = clamp255(base * 0.92 - stain * 32);
      img.data[i + 2] = clamp255(base * 0.78 - stain * 22);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // height canvas
  const heightCv = document.createElement("canvas");
  heightCv.width = size;
  heightCv.height = size;
  const hctx = heightCv.getContext("2d")!;
  hctx.fillStyle = "#a8a8a8";
  hctx.fillRect(0, 0, size, size);

  // brick layout with running bond
  const blockW = size / 4;
  const blockH = size / 8;
  for (let y = 0; y < size; y += blockH) {
    const rowOffset = ((y / blockH) | 0) % 2 === 0 ? 0 : blockW / 2;
    for (let x = -blockW; x < size + blockW; x += blockW) {
      const px = x + rowOffset + (Math.random() - 0.5) * 4;
      const py = y + (Math.random() - 0.5) * 3;
      const w = blockW - 4 + (Math.random() - 0.5) * 4;
      const h = blockH - 4 + (Math.random() - 0.5) * 3;

      // bevel highlight inside block (top-left bright)
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 2, py + 2, w, h);
      ctx.clip();
      const grad = ctx.createLinearGradient(px, py, px + w, py + h);
      grad.addColorStop(0, "rgba(255,250,230,0.18)");
      grad.addColorStop(0.5, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.fillStyle = grad;
      ctx.fillRect(px + 2, py + 2, w, h);
      // small chips
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = `rgba(60,50,35,${0.2 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          px + 2 + Math.random() * w,
          py + 2 + Math.random() * h,
          0.6 + Math.random() * 1.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();

      // mortar (dark line around block)
      ctx.strokeStyle = "rgba(28,22,16,0.85)";
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 2, py + 2, w, h);

      // height: block raised, mortar low
      hctx.fillStyle = "#b0b0b0";
      hctx.fillRect(px + 4, py + 4, w - 4, h - 4);
      // mortar groove (lower)
      hctx.strokeStyle = "#404040";
      hctx.lineWidth = 4;
      hctx.strokeRect(px + 2, py + 2, w, h);
    }
  }

  // moss patches scattered
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 25 | 0},${85 + Math.random() * 30 | 0},${30 + Math.random() * 25 | 0},${0.32 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      10 + Math.random() * 30,
      6 + Math.random() * 16,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // weather streaks
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(40,30,20,${0.1 + Math.random() * 0.15})`;
    ctx.lineWidth = 4 + Math.random() * 8;
    const x = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 60, size);
    ctx.stroke();
  }

  const normalCv = buildNormalFromHeight(heightCv, 1.8);
  return {
    map: canvasToTexture(canvas, 2, 2),
    normalMap: canvasToTexture(normalCv, 2, 2, true),
  };
}

// ---------- MARBLE FLAGSTONE (for ruins caps / pillar tops) ----------
export function makeMarbleTexture(size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(19);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const turb = fbm(n, u * 4, v * 4, 5);
      const veinNoise = fbm(n, u * 8 + 100, v * 8, 3);
      const vein = Math.abs(Math.sin(u * 6 + turb * 8 + veinNoise * 4));
      const base = 215 + turb * 30;
      const i = (y * size + x) * 4;
      const isVein = vein < 0.06;
      img.data[i] = clamp255(base - (isVein ? 80 : 0));
      img.data[i + 1] = clamp255(base - (isVein ? 70 : 0));
      img.data[i + 2] = clamp255(base * 0.95 - (isVein ? 60 : 0));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // subtle gold flecks
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(212,180,90,${0.3 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 0.6 + Math.random() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasToTexture(canvas, 1, 1);
}

// ---------- BARK (with cracks, lichen) ----------
export function makeBarkTexture(size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(13);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const grain = fbm(n, u * 4, v * 24, 4);
      const ridge = Math.abs(n(u * 12, v * 5)) * 0.6;
      const fine = fbm(n, u * 80, v * 80, 2) * 0.15;
      const i = (y * size + x) * 4;
      const r = 70 + grain * 36 - ridge * 32 + fine * 18;
      const g = 46 + grain * 22 - ridge * 22 + fine * 12;
      const b = 26 + grain * 14 - ridge * 12 + fine * 6;
      img.data[i] = clamp255(r);
      img.data[i + 1] = clamp255(g);
      img.data[i + 2] = clamp255(b);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // vertical cracks
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(20,12,6,${0.5 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.4;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = -2;
    ctx.moveTo(x, y);
    while (y < size + 2) {
      x += (Math.random() - 0.5) * 4;
      y += 4 + Math.random() * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // lichen patches
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(${130 + Math.random() * 30 | 0},${150 + Math.random() * 40 | 0},${110 + Math.random() * 30 | 0},${0.18 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      8 + Math.random() * 18,
      4 + Math.random() * 10,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  return canvasToTexture(canvas, 1, 4);
}

// ---------- METAL (basic brushed with rust) ----------
export function makeMetalTexture(
  size = 256,
  base: number[] = [120, 130, 150],
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(91);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const a = fbm(n, u * 3, v * 8, 4) * 0.5 + 0.5;
      const fine = fbm(n, u * 60, v * 200, 2) * 0.5 + 0.5;
      const brushed = (a * 0.7 + fine * 0.3 - 0.5) * 80;
      const i = (y * size + x) * 4;
      img.data[i] = clamp255(base[0] + brushed);
      img.data[i + 1] = clamp255(base[1] + brushed);
      img.data[i + 2] = clamp255(base[2] + brushed);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // rust spots
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = `rgba(${110 + Math.random() * 40 | 0},${60 + Math.random() * 30 | 0},${30 + Math.random() * 20 | 0},${0.2 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      3 + Math.random() * 9,
      2 + Math.random() * 6,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // highlight streaks (specular bake)
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.06})`;
    ctx.fillRect(0, Math.random() * size, size, 1 + Math.random() * 2);
  }
  return canvasToTexture(canvas, 1, 1);
}

// ---------- ORNATE METAL (engraved scroll patterns, gold trim) ----------
export function makeOrnateMetalTexture(
  size = 512,
  base: number[] = [110, 118, 138],
  trimColor = "#d4b76a",
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(67);

  // base brushed metal
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = fbm(n, x * 0.012, y * 0.05, 4) * 0.5 + 0.5;
      const fine = fbm(n, x * 0.5, y * 1.5, 2) * 0.3;
      const brushed = (a * 0.7 + fine - 0.5) * 70;
      const i = (y * size + x) * 4;
      img.data[i] = clamp255(base[0] + brushed);
      img.data[i + 1] = clamp255(base[1] + brushed);
      img.data[i + 2] = clamp255(base[2] + brushed);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // gradient sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, size);
  sheen.addColorStop(0, "rgba(255,255,255,0.18)");
  sheen.addColorStop(0.5, "rgba(0,0,0,0.18)");
  sheen.addColorStop(1, "rgba(255,255,255,0.08)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  // engraved scroll pattern around border
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;

  const margin = size * 0.12;
  ctx.strokeRect(margin, margin, size - margin * 2, size - margin * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin + 8, margin + 8, size - margin * 2 - 16, size - margin * 2 - 16);

  // corner curls
  function curl(cx: number, cy: number, dirX: number, dirY: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(
      cx + dirX * 30,
      cy,
      cx + dirX * 30,
      cy + dirY * 30,
      cx,
      cy + dirY * 30,
    );
    ctx.bezierCurveTo(
      cx - dirX * 10,
      cy + dirY * 30,
      cx - dirX * 10,
      cy + dirY * 18,
      cx + dirX * 8,
      cy + dirY * 18,
    );
    ctx.stroke();
  }
  curl(margin + 4, margin + 4, 1, 1);
  curl(size - margin - 4, margin + 4, -1, 1);
  curl(margin + 4, size - margin - 4, 1, -1);
  curl(size - margin - 4, size - margin - 4, -1, -1);

  // central sigil (stylized leaf for elven theme)
  ctx.shadowBlur = 0;
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.bezierCurveTo(cx + 18, cy - 14, cx + 14, cy + 14, cx, cy + 22);
  ctx.bezierCurveTo(cx - 14, cy + 14, cx - 18, cy - 14, cx, cy - 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx, cy + 22);
  ctx.stroke();

  // rivets
  ctx.fillStyle = "#888a90";
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rx = cx + Math.cos(a) * (size * 0.28);
    const ry = cy + Math.sin(a) * (size * 0.28);
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  return canvasToTexture(canvas, 1, 1);
}

// ---------- FABRIC (woven base + embroidered hem trim) ----------
export function makeFabricTexture(
  size = 512,
  base: number[] = [140, 30, 30],
  trim = "#d4b76a",
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(53);

  // weave base
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x;
      const v = y;
      const weave = (Math.sin(u * 1.4) + Math.sin(v * 1.4)) * 8;
      const macro = fbm(n, x * 0.01, y * 0.01, 4) * 30;
      const fine = fbm(n, x * 0.2, y * 0.2, 2) * 8;
      const i = (y * size + x) * 4;
      img.data[i] = clamp255(base[0] + weave + macro * 0.2 + fine);
      img.data[i + 1] = clamp255(base[1] + weave + macro * 0.2 + fine);
      img.data[i + 2] = clamp255(base[2] + weave + macro * 0.2 + fine);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // soft vertical drape gradient
  const drape = ctx.createLinearGradient(0, 0, size, 0);
  drape.addColorStop(0, "rgba(0,0,0,0.25)");
  drape.addColorStop(0.5, "rgba(255,255,255,0.06)");
  drape.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = drape;
  ctx.fillRect(0, 0, size, size);

  // embroidered hem (gold double line + diamond pattern)
  const hemH = Math.max(20, size * 0.1);
  ctx.fillStyle = trim;
  ctx.fillRect(0, size - hemH, size, 4);
  ctx.fillRect(0, size - 8, size, 4);

  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.8;
  for (let x = 0; x < size; x += hemH * 0.8) {
    ctx.beginPath();
    ctx.moveTo(x, size - hemH + 6);
    ctx.lineTo(x + hemH * 0.4, size - hemH / 2);
    ctx.lineTo(x + hemH * 0.8, size - hemH + 6);
    ctx.lineTo(x + hemH * 0.4, size - 12);
    ctx.closePath();
    ctx.stroke();
  }

  // top trim
  ctx.fillRect(0, 0, size, 3);
  ctx.fillRect(0, 8, size, 2);

  return canvasToTexture(canvas, 1, 1);
}

// ---------- LEATHER (tooled, rough surface with creases) ----------
export function makeLeatherTexture(
  size = 256,
  base: number[] = [95, 60, 35],
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(101);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const cell = fbm(n, u * 14, v * 14, 4);
      const fine = fbm(n, u * 50, v * 50, 2);
      const i = (y * size + x) * 4;
      const t = (cell * 0.7 + fine * 0.3 - 0.5) * 60;
      img.data[i] = clamp255(base[0] + t);
      img.data[i + 1] = clamp255(base[1] + t * 0.8);
      img.data[i + 2] = clamp255(base[2] + t * 0.6);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // creases
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = `rgba(20,12,6,${0.25 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.8 + Math.random() * 0.8;
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + (Math.random() - 0.5) * 60,
      y + (Math.random() - 0.5) * 60,
    );
    ctx.stroke();
  }
  return canvasToTexture(canvas, 1, 1);
}

// ---------- SKIN ----------
export function makeSkinTexture(
  size = 256,
  base: number[] = [220, 195, 165],
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = makeNoise(11);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const macro = fbm(n, u * 4, v * 4, 3) * 0.25;
      const pores = fbm(n, u * 60, v * 60, 2) * 0.08;
      const i = (y * size + x) * 4;
      img.data[i] = clamp255(base[0] + macro * 80 + pores * 30);
      img.data[i + 1] = clamp255(base[1] + macro * 70 + pores * 20);
      img.data[i + 2] = clamp255(base[2] + macro * 50 + pores * 10);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // subtle blush
  const blush = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.45);
  blush.addColorStop(0, "rgba(220,140,120,0.18)");
  blush.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = blush;
  ctx.fillRect(0, 0, size, size);
  return canvasToTexture(canvas, 1, 1);
}
