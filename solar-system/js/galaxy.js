// 深空背景:恒星星空 + 远处的旋涡星系(粒子系统)
import * as THREE from 'three';
import { glowSpriteTexture } from './textures.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 星空球壳 ---------- */

export function createStarfield(count = 7000, radius = 3200) {
  const rand = mulberry32(20260703);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const star = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // 球面均匀分布
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = radius * (0.75 + rand() * 0.25);
    positions[i * 3] = s * Math.cos(phi) * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = s * Math.sin(phi) * r;

    // 恒星色温:偏蓝 / 白 / 偏黄 / 偏红
    const t = rand();
    if (t < 0.12) star.setHSL(0.62, 0.6, 0.75);
    else if (t < 0.55) star.setHSL(0.15, 0.05, 0.9);
    else if (t < 0.85) star.setHSL(0.12, 0.5, 0.75);
    else star.setHSL(0.05, 0.7, 0.65);
    const brightness = 0.4 + rand() * 0.6;
    colors[i * 3] = star.r * brightness;
    colors[i * 3 + 1] = star.g * brightness;
    colors[i * 3 + 2] = star.b * brightness;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    map: glowSpriteTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

/* ---------- 旋涡星系 ---------- */

export function createSpiralGalaxy({
  seed = 1,
  count = 5200,
  radius = 260,
  arms = 4,
  twist = 2.4,
  coreColor = 0xffe6c0,
  armColor = 0x7f9fff,
  dustColor = 0xd08bd6,
} = {}) {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cCore = new THREE.Color(coreColor);
  const cArm = new THREE.Color(armColor);
  const cDust = new THREE.Color(dustColor);
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const rNorm = Math.pow(rand(), 1.7); // 向核心聚集
    const r = rNorm * radius;
    const armIndex = Math.floor(rand() * arms);
    const armAngle = (armIndex / arms) * Math.PI * 2;
    const spin = rNorm * twist * Math.PI;
    // 沿旋臂散布,离核心越远越松散
    const spread = (rand() + rand() + rand() - 1.5) * 0.28 * (0.3 + rNorm);
    const angle = armAngle + spin + spread;
    const thickness = (rand() + rand() - 1) * radius * 0.035 * (1.4 - rNorm);

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = thickness;
    positions[i * 3 + 2] = Math.sin(angle) * r;

    if (rNorm < 0.18) tmp.copy(cCore);
    else if (rand() < 0.12) tmp.copy(cDust);
    else tmp.copy(cCore).lerp(cArm, Math.min(1, rNorm * 1.25));
    const brightness = rNorm < 0.18 ? 1.0 : 0.4 + rand() * 0.5;
    colors[i * 3] = tmp.r * brightness;
    colors[i * 3 + 1] = tmp.g * brightness;
    colors[i * 3 + 2] = tmp.b * brightness;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 3.2,
    sizeAttenuation: true,
    map: glowSpriteTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);

  // 核心额外加一团光晕
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSpriteTexture('rgba(255,236,200,1)', 'rgba(255,200,120,0)'),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8,
  }));
  coreGlow.scale.setScalar(radius * 0.55);
  points.add(coreGlow);

  return points;
}

/* ---------- 组装深空 ---------- */

export function buildDeepSpace(scene) {
  const starfield = createStarfield();
  scene.add(starfield);

  const galaxies = [];

  const andromeda = createSpiralGalaxy({
    seed: 42, arms: 2, twist: 3.0, radius: 300,
    coreColor: 0xffe0b8, armColor: 0x8fa8ff, dustColor: 0xc890d8,
  });
  andromeda.position.set(1500, 620, -2100);
  andromeda.rotation.set(1.05, 0.2, 0.55);
  scene.add(andromeda);
  galaxies.push({ points: andromeda, speed: 0.006 });

  const whirlpool = createSpiralGalaxy({
    seed: 77, arms: 4, twist: 2.2, radius: 200, count: 4200,
    coreColor: 0xfff0d0, armColor: 0x70d8e8, dustColor: 0xb090e0,
  });
  whirlpool.position.set(-2200, -420, 1400);
  whirlpool.rotation.set(0.5, 0.9, -0.3);
  scene.add(whirlpool);
  galaxies.push({ points: whirlpool, speed: -0.005 });

  const distant = createSpiralGalaxy({
    seed: 133, arms: 3, twist: 2.8, radius: 130, count: 2600,
    coreColor: 0xffe8d8, armColor: 0xd8a0ff, dustColor: 0x90b0ff,
  });
  distant.position.set(600, -1500, 2400);
  distant.rotation.set(-0.8, 0.3, 0.9);
  scene.add(distant);
  galaxies.push({ points: distant, speed: 0.008 });

  function update(dt) {
    for (const g of galaxies) g.points.rotation.y += g.speed * dt;
  }

  return { starfield, galaxies, update };
}
