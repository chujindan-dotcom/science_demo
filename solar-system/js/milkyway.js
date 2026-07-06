// 银河系"拉远"模式:把镜头拉到盘外俯瞰整个银河系模型。
// 比例处理:银盘可视半径 R,银心置于人马座方向、距原点 C≈0.52R 处,
// 于是"太阳系"(原点)恰好落在盘面约一半半径的旋臂上(真实约 2.6万/5万光年)。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { glowSpriteTexture } from './textures.js';

const DEG = Math.PI / 180;
const OBLIQUITY = 23.44 * DEG;

// 银心方向(人马座 Sgr A*):RA 17h45.6m, Dec −29.0°(赤道系)
function galacticCenterDir() {
  const ra = 17.76 * 15 * DEG;
  const dec = -29.0 * DEG;
  const v = new THREE.Vector3(
    Math.cos(dec) * Math.cos(ra),
    Math.sin(dec),
    Math.cos(dec) * Math.sin(ra),
  );
  // 与天球层一致地施加黄赤交角倾斜
  v.applyAxisAngle(new THREE.Vector3(1, 0, 0), OBLIQUITY);
  return v.normalize();
}

function buildDisk(radius, seed, center, normal) {
  // 在以 center 为心、normal 为法线的平面内生成棒旋星系粒子
  const u = new THREE.Vector3(0, 1, 0);
  if (Math.abs(normal.dot(u)) > 0.9) u.set(1, 0, 0);
  const e1 = new THREE.Vector3().crossVectors(normal, u).normalize();
  const e2 = new THREE.Vector3().crossVectors(normal, e1).normalize();

  const count = 16000;
  const arms = 2;
  const twist = 3.4;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cCore = new THREE.Color(0xffe6bd);
  const cArm = new THREE.Color(0x8fb0ff);
  const cDust = new THREE.Color(0xd58bd0);
  const tmp = new THREE.Color();
  let s = seed >>> 0;
  const rand = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  for (let i = 0; i < count; i++) {
    const rNorm = Math.pow(rand(), 1.6);
    const r = rNorm * radius;
    const armIndex = Math.floor(rand() * arms);
    const barBias = rNorm < 0.22 ? 0 : (armIndex / arms) * Math.PI * 2;
    const spin = rNorm * twist * Math.PI;
    const spread = (rand() + rand() + rand() - 1.5) * 0.30 * (0.35 + rNorm);
    const angle = barBias + spin + spread;
    const thick = (rand() + rand() - 1) * radius * 0.03 * (1.5 - rNorm);

    const p = center.clone()
      .add(e1.clone().multiplyScalar(Math.cos(angle) * r))
      .add(e2.clone().multiplyScalar(Math.sin(angle) * r))
      .add(normal.clone().multiplyScalar(thick));
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;

    if (rNorm < 0.16) tmp.copy(cCore);
    else if (rand() < 0.12) tmp.copy(cDust);
    else tmp.copy(cCore).lerp(cArm, Math.min(1, rNorm * 1.3));
    const br = rNorm < 0.16 ? 1.0 : 0.4 + rand() * 0.5;
    col[i * 3] = tmp.r * br; col[i * 3 + 1] = tmp.g * br; col[i * 3 + 2] = tmp.b * br;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 11, sizeAttenuation: true, map: glowSpriteTexture(),
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  return { points, e1, e2 };
}

export function buildMilkyWayScene(scene, onSelect) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const R = 5000;                       // 银盘可视半径
  const gcDir = galacticCenterDir();    // 银心方向(单位向量)
  const center = gcDir.clone().multiplyScalar(R * 0.52); // 银心位置
  const normal = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), OBLIQUITY).normalize();

  const disk = buildDisk(R, 20260706, center, normal);
  group.add(disk.points);

  // 银心光晕(核球)——保持克制,避免被泛光糊成白球
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSpriteTexture('rgba(255,228,180,0.85)', 'rgba(255,190,110,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
  }));
  coreGlow.position.copy(center);
  coreGlow.scale.setScalar(R * 0.16);
  group.add(coreGlow);

  const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSpriteTexture('rgba(255,240,210,0.5)', 'rgba(255,210,150,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35,
  }));
  coreHalo.position.copy(center);
  coreHalo.scale.setScalar(R * 0.42);
  group.add(coreHalo);

  // 太阳系标记(原点)
  const sunMark = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSpriteTexture('rgba(255,240,220,1)', 'rgba(255,220,150,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  sunMark.scale.setScalar(R * 0.05);
  group.add(sunMark);

  const sunDiv = document.createElement('div');
  sunDiv.className = 'sky-label sun-here';
  sunDiv.textContent = '☉ 太阳系(我们在这里)';
  const sunInfo = {
    name: '太阳系在银河系中的位置', en: 'Sun in the Milky Way',
    type: '猎户臂(本地臂)内侧',
    rows: [['距银心', '约 2.6 万光年'], ['银盘直径', '约 10 万光年'], ['绕银心一圈', '约 2.3 亿年(1 银河年)']],
    facts: [
      '太阳并不在银河系中心,而是位于一条名为"猎户臂"的旋臂上,约在半径一半处。',
      '太阳带着整个太阳系以约 220 km/s 绕银心公转,一圈要走约 2.3 亿年。',
      '我们平时看到的"银河",就是从盘内侧望向这个盘面时,层层叠叠的恒星之光。',
    ],
    note: '* 银盘为示意模型;太阳位置、银心方向按真实比例与方位放置。',
  };
  sunDiv.addEventListener('pointerdown', (e) => e.stopPropagation());
  sunDiv.addEventListener('click', () => onSelect && onSelect(sunInfo));
  const sunLabel = new CSS2DObject(sunDiv);
  sunLabel.position.set(0, R * 0.03, 0);
  group.add(sunLabel);

  // 银心标签
  const gcDiv = document.createElement('div');
  gcDiv.className = 'sky-label galactic-center';
  gcDiv.textContent = '银心(人马座 A*)';
  const gcLabel = new CSS2DObject(gcDiv);
  gcLabel.position.copy(center);
  group.add(gcLabel);

  // 相机取景点:从盘面斜上方俯瞰
  const viewPos = center.clone()
    .add(normal.clone().multiplyScalar(R * 1.15))
    .add(gcDir.clone().multiplyScalar(-R * 0.35));
  const focusTarget = center.clone().multiplyScalar(0.5); // 看向盘中部(介于太阳与银心之间)

  const labelObjs = [sunLabel, gcLabel];
  function setVisible(v) {
    group.visible = v;
    labelObjs.forEach((o) => { o.visible = v; });
  }
  setVisible(false);

  function update(dt) {
    if (!group.visible) return;
    disk.points.rotateOnAxis(normal.clone(), 0); // 预留:银盘可极缓慢转动
  }

  return { group, setVisible, update, viewPos, focusTarget, R };
}
