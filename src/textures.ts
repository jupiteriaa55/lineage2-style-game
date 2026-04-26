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

export function makeGrassTexture(size = 1024): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const noise = makeNoise(42);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(noise, u * 8, v * 8, 5) * 0.5 + 0.5;
      const m = fbm(noise, u * 32 + 100, v * 32 + 100, 3) * 0.5 + 0.5;
      const dirt = Math.max(0, fbm(noise, u * 3 + 200, v * 3 + 200, 3) - 0.1);
      let r = 60 + n * 60 + m * 30;
      let g = 95 + n * 70 + m * 30;
      let b = 35 + n * 30;
      r = r * (1 - dirt * 0.6) + 110 * dirt * 0.6;
      g = g * (1 - dirt * 0.6) + 88 * dirt * 0.6;
      b = b * (1 - dirt * 0.6) + 55 * dirt * 0.6;
      const i = (y * size + x) * 4;
      img.data[i] = r | 0;
      img.data[i + 1] = g | 0;
      img.data[i + 2] = b | 0;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 1 + Math.random() * 3;
    const a = Math.random() * Math.PI;
    const c = 60 + Math.random() * 80;
    ctx.strokeStyle = `rgba(${(c * 0.7) | 0},${c | 0},${(c * 0.4) | 0},0.6)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(${200 + Math.random() * 40 | 0},${200 + Math.random() * 40 | 0},${230 + Math.random() * 25 | 0},${0.4 + Math.random() * 0.4})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeStoneTexture(size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const noise = makeNoise(7);

  ctx.fillStyle = "#9b9385";
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(noise, u * 6, v * 6, 5) * 0.5 + 0.5;
      const stain = Math.max(0, fbm(noise, u * 2 + 300, v * 2 + 300, 3));
      const i = (y * size + x) * 4;
      const base = 145 + n * 60;
      img.data[i] = (base * 0.95 - stain * 25) | 0;
      img.data[i + 1] = (base * 0.92 - stain * 30) | 0;
      img.data[i + 2] = (base * 0.78 - stain * 20) | 0;
    }
  }
  ctx.putImageData(img, 0, 0);

  const blockW = 80;
  const blockH = 50;
  ctx.strokeStyle = "rgba(40,32,22,0.55)";
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += blockH) {
    const offset = ((y / blockH) | 0) % 2 === 0 ? 0 : blockW / 2;
    for (let x = -blockW; x < size + blockW; x += blockW) {
      const px = x + offset;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + blockH);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${30 + Math.random() * 30 | 0},${20 + Math.random() * 20 | 0},${10},${0.3 + Math.random() * 0.3})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 20 | 0},${85 + Math.random() * 30 | 0},${30 + Math.random() * 20 | 0},${0.25 + Math.random() * 0.25})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 8 + Math.random() * 24;
    const h = 4 + Math.random() * 12;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeBarkTexture(size = 256): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const noise = makeNoise(13);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(noise, u * 6, v * 24, 4);
      const ridge = Math.abs(noise(u * 12, v * 4)) * 0.5;
      const i = (y * size + x) * 4;
      const r = 70 + n * 40 - ridge * 30;
      const g = 45 + n * 25 - ridge * 20;
      const b = 25 + n * 15 - ridge * 10;
      img.data[i] = Math.max(20, Math.min(150, r)) | 0;
      img.data[i + 1] = Math.max(15, Math.min(100, g)) | 0;
      img.data[i + 2] = Math.max(10, Math.min(70, b)) | 0;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeMetalTexture(
  size = 256,
  base: number[] = [120, 130, 150],
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const noise = makeNoise(91);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(noise, u * 4, v * 8, 4) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, base[0] + (n - 0.5) * 80);
      img.data[i + 1] = Math.min(255, base[1] + (n - 0.5) * 80);
      img.data[i + 2] = Math.min(255, base[2] + (n - 0.5) * 80);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(120,80,40,${0.2 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      4 + Math.random() * 10,
      2 + Math.random() * 6,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeFabricTexture(
  size = 256,
  base: number[] = [140, 30, 30],
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const noise = makeNoise(53);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const weave =
        Math.sin(u * size * 0.6) * Math.sin(v * size * 0.6) * 0.15;
      const n = fbm(noise, u * 4, v * 4, 3) * 0.3;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, base[0] + (weave + n) * 120);
      img.data[i + 1] = Math.min(255, base[1] + (weave + n) * 120);
      img.data[i + 2] = Math.min(255, base[2] + (weave + n) * 120);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(220,180,80,0.6)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const y = ((i + 1) * size) / 6;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 4) {
      ctx.lineTo(x, y + Math.sin(x * 0.1) * 1.5);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSkinTexture(
  size = 128,
  base: number[] = [220, 195, 165],
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const noise = makeNoise(11);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(noise, u * 6, v * 6, 3) * 0.2;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, base[0] + n * 80);
      img.data[i + 1] = Math.min(255, base[1] + n * 80);
      img.data[i + 2] = Math.min(255, base[2] + n * 80);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
