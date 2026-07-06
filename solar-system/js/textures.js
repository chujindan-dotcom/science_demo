// 程序化纹理生成:全部用 canvas + 噪声算法绘制,不依赖任何外部图片
import * as THREE from 'three';

/* ---------- 噪声基础 ---------- */

function hash3(x, y, z, seed) {
  let h = seed + x * 374761393 + y * 668265263 + z * 2147483647;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t) { return t * t * (3 - 2 * t); }

// 3D 值噪声:在圆柱面上采样可保证经度方向无缝
function noise3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smooth(xf), v = smooth(yf), w = smooth(zf);
  let res = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const weight = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
        res += weight * hash3(xi + dx, yi + dy, zi + dz, seed);
      }
    }
  }
  return res;
}

function fbm3(x, y, z, seed, octaves = 5) {
  let f = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    f += amp * noise3(x * freq, y * freq, z * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return f / norm;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 绘制辅助 ---------- */

function lerp(a, b, t) { return a + (b - a) * t; }

function mixColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// palette: [[stop, [r,g,b]], ...] 按 stop 升序
function samplePalette(palette, t) {
  if (t <= palette[0][0]) return palette[0][1];
  for (let i = 1; i < palette.length; i++) {
    if (t <= palette[i][0]) {
      const [s0, c0] = palette[i - 1];
      const [s1, c1] = palette[i];
      return mixColor(c0, c1, (t - s0) / (s1 - s0));
    }
  }
  return palette[palette.length - 1][1];
}

// 通用等距圆柱投影绘制:callback(theta, lat) -> [r,g,b],lat ∈ [0,1] 北极到南极
function paintSphereTexture(w, h, pixelFn) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const lat = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const theta = (x / w) * Math.PI * 2;
      const [r, g, b] = pixelFn(theta, lat);
      const i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, canvas, ctx };
}

// 在等距圆柱纹理上叠加陨石坑(暗底 + 亮环)
function addCraters(ctx, w, h, count, seed, minR, maxR) {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const cx = rand() * w;
    // 避开极区,极区在球面上会被严重拉伸
    const cy = h * (0.12 + rand() * 0.76);
    const r = minR + rand() * (maxR - minR);
    // 纬度越高,横向被压缩得越厉害,需要横向拉伸补偿
    const stretch = 1 / Math.max(0.3, Math.sin((cy / h) * Math.PI));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(stretch, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,0.28)');
    g.addColorStop(0.72, 'rgba(0,0,0,0.14)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- 各天体纹理 ---------- */

function rockyTexture({ seed, palette, freq = 3, octaves = 5, craters = 0, craterSeed = 1, size = 1024 }) {
  const { tex, canvas, ctx } = paintSphereTexture(size, size / 2, (theta, lat) => {
    const cx = Math.cos(theta) * freq, cz = Math.sin(theta) * freq;
    const n = fbm3(cx, lat * freq * 2, cz, seed, octaves);
    return samplePalette(palette, n);
  });
  if (craters > 0) {
    addCraters(ctx, canvas.width, canvas.height, craters, craterSeed, 4, 26);
    tex.needsUpdate = true;
  }
  return tex;
}

export function mercuryTexture() {
  return rockyTexture({
    seed: 11, freq: 4, craters: 220, craterSeed: 7,
    palette: [
      [0.30, [82, 78, 74]], [0.45, [122, 117, 110]],
      [0.60, [150, 144, 136]], [0.75, [176, 170, 160]], [1.0, [200, 195, 186]],
    ],
  });
}

export function moonTexture() {
  return rockyTexture({
    seed: 23, freq: 3.5, craters: 160, craterSeed: 13,
    palette: [
      [0.30, [92, 92, 96]], [0.48, [128, 128, 132]],
      [0.62, [158, 158, 160]], [1.0, [196, 196, 198]],
    ],
  });
}

export function venusTexture() {
  // 浓密硫酸云:柔和的斜向条纹 + 涡旋
  return paintSphereTexture(1024, 512, (theta, lat) => {
    const cx = Math.cos(theta), cz = Math.sin(theta);
    const swirl = fbm3(cx * 2.2, lat * 5 - theta * 0.35, cz * 2.2, 31, 5);
    const band = Math.sin(lat * Math.PI * 5 + swirl * 6) * 0.5 + 0.5;
    const n = band * 0.55 + swirl * 0.45;
    return samplePalette([
      [0.20, [166, 124, 66]], [0.45, [205, 165, 100]],
      [0.68, [232, 200, 138]], [1.0, [248, 230, 180]],
    ], n);
  }).tex;
}

export function earthTexture() {
  return paintSphereTexture(1400, 700, (theta, lat) => {
    const f = 2.3;
    const cx = Math.cos(theta) * f, cz = Math.sin(theta) * f;
    const n = fbm3(cx, lat * f * 2, cz, 47, 6);
    const detail = fbm3(cx * 4, lat * f * 8, cz * 4, 91, 4);
    const polar = Math.abs(lat - 0.5) * 2; // 0 赤道 -> 1 极点
    // 极地冰盖
    if (polar > 0.86 + detail * 0.08) return [235, 240, 245];
    if (n > 0.545) {
      // 陆地:海拔越高越偏灰白,低处绿色,干旱区棕黄
      const height = (n - 0.545) / 0.2;
      const dry = fbm3(cx * 2 + 9, lat * 6, cz * 2, 133, 4);
      let c = dry > 0.55
        ? samplePalette([[0, [120, 108, 62]], [0.6, [168, 146, 88]], [1, [196, 178, 120]]], height + detail * 0.3)
        : samplePalette([[0, [44, 92, 42]], [0.5, [76, 118, 56]], [1, [130, 140, 90]]], height + detail * 0.3);
      // 高纬度陆地渐雪
      if (polar > 0.72) c = mixColor(c, [230, 235, 240], (polar - 0.72) / 0.14);
      return c;
    }
    // 海洋:接近海岸线的浅海更亮
    const depth = (0.545 - n) / 0.545;
    return samplePalette([
      [0.0, [64, 138, 180]], [0.08, [30, 92, 152]],
      [0.35, [16, 60, 118]], [1.0, [8, 32, 82]],
    ], depth);
  }).tex;
}

export function earthCloudTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size / 2;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size / 2);
  const d = img.data;
  for (let y = 0; y < size / 2; y++) {
    const lat = y / (size / 2 - 1);
    for (let x = 0; x < size; x++) {
      const theta = (x / size) * Math.PI * 2;
      const cx = Math.cos(theta) * 3, cz = Math.sin(theta) * 3;
      let n = fbm3(cx, lat * 6, cz, 71, 5);
      n = Math.max(0, (n - 0.52) / 0.24);
      const a = Math.min(1, n) * 235;
      const i = (y * size + x) * 4;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function marsTexture() {
  const { tex, canvas, ctx } = paintSphereTexture(1024, 512, (theta, lat) => {
    const f = 3;
    const cx = Math.cos(theta) * f, cz = Math.sin(theta) * f;
    const n = fbm3(cx, lat * f * 2, cz, 57, 6);
    const polar = Math.abs(lat - 0.5) * 2;
    const cap = fbm3(cx * 2, lat * 8, cz * 2, 58, 3);
    if (polar > 0.88 + cap * 0.06) return [240, 236, 230]; // 极冠
    return samplePalette([
      [0.25, [96, 48, 28]], [0.45, [146, 72, 38]],
      [0.62, [188, 100, 52]], [0.80, [214, 130, 74]], [1.0, [232, 164, 104]],
    ], n);
  });
  addCraters(ctx, canvas.width, canvas.height, 60, 21, 3, 14);
  tex.needsUpdate = true;
  return tex;
}

// 气态行星:纬向条纹 + 湍流扰动
function gasTexture({ seed, palette, bands, turbulence, spot }) {
  return paintSphereTexture(1024, 512, (theta, lat) => {
    const cx = Math.cos(theta), cz = Math.sin(theta);
    const turb = fbm3(cx * 3, lat * 10, cz * 3, seed, 5);
    const flow = fbm3(cx * 1.5 + 40, lat * 4, cz * 1.5, seed + 7, 4);
    let t = Math.sin(lat * Math.PI * bands + (turb - 0.5) * turbulence + (flow - 0.5) * 2) * 0.5 + 0.5;
    t = t * 0.8 + turb * 0.2;
    let c = samplePalette(palette, t);
    if (spot) {
      // 大红斑之类的椭圆风暴
      const dTheta = Math.atan2(Math.sin(theta - spot.theta), Math.cos(theta - spot.theta));
      const dx = dTheta / spot.w, dy = (lat - spot.lat) / spot.h;
      const dist = dx * dx + dy * dy;
      if (dist < 1) {
        const s = 1 - dist;
        const ring = Math.sin(Math.min(1, dist) * Math.PI);
        c = mixColor(c, spot.color, Math.min(1, s * 1.6));
        c = mixColor(c, [255, 240, 220], ring * 0.18);
      }
    }
    return c;
  }).tex;
}

export function jupiterTexture() {
  return gasTexture({
    seed: 63, bands: 11, turbulence: 3.2,
    palette: [
      [0.15, [140, 90, 60]], [0.34, [196, 148, 105]],
      [0.50, [232, 210, 178]], [0.66, [204, 160, 118]],
      [0.82, [172, 116, 78]], [1.0, [242, 226, 200]],
    ],
    spot: { theta: 1.9, lat: 0.66, w: 0.42, h: 0.062, color: [196, 84, 48] },
  });
}

export function saturnTexture() {
  return gasTexture({
    seed: 77, bands: 9, turbulence: 1.6,
    palette: [
      [0.20, [170, 140, 96]], [0.42, [206, 178, 128]],
      [0.60, [228, 204, 156]], [0.80, [240, 222, 180]], [1.0, [246, 234, 200]],
    ],
  });
}

export function uranusTexture() {
  return gasTexture({
    seed: 83, bands: 5, turbulence: 0.8,
    palette: [
      [0.25, [126, 196, 204]], [0.55, [156, 214, 220]],
      [0.80, [180, 226, 230]], [1.0, [200, 236, 238]],
    ],
  });
}

export function neptuneTexture() {
  return gasTexture({
    seed: 97, bands: 7, turbulence: 2.2,
    palette: [
      [0.18, [24, 52, 140]], [0.42, [40, 84, 176]],
      [0.62, [62, 112, 200]], [0.85, [92, 146, 220]], [1.0, [140, 186, 236]],
    ],
    spot: { theta: 4.2, lat: 0.6, w: 0.3, h: 0.05, color: [18, 36, 104] },
  });
}

// 土星环:径向一维条纹(含透明度),映射到 RingGeometry
export function saturnRingTexture() {
  const w = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = 8;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, 8);
  const d = img.data;
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    let a = fbm3(t * 40, 0.5, 0.5, 141, 5);
    a = Math.pow(a, 1.5) * 1.7;
    // 卡西尼缝及内外边缘淡出
    if (t < 0.06) a *= t / 0.06;
    if (t > 0.94) a *= (1 - t) / 0.06;
    const cassini = Math.exp(-Math.pow((t - 0.62) / 0.025, 2));
    a *= 1 - cassini * 0.92;
    const shade = 190 + fbm3(t * 60, 0.2, 0.8, 142, 3) * 60;
    for (let y = 0; y < 8; y++) {
      const i = (y * w + x) * 4;
      d[i] = shade; d[i + 1] = shade * 0.94; d[i + 2] = shade * 0.84;
      d[i + 3] = Math.max(0, Math.min(1, a)) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 软光点 sprite,用于星空/星系粒子与太阳光晕
export function glowSpriteTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function coronaTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,220,150,0.85)');
  g.addColorStop(0.25, 'rgba(255,170,70,0.38)');
  g.addColorStop(0.55, 'rgba(255,120,40,0.13)');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
