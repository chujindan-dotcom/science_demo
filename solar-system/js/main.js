// 主入口:场景、相机、渲染循环、泛光后期、标签、拾取与镜头跟随
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { buildSolarSystem } from './bodies.js';
import { buildDeepSpace } from './galaxy.js';
import { buildUI } from './ui.js';

/* ---------- 渲染器与场景 ---------- */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 12000);
camera.position.set(0, 160, 320);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.getElementById('app').appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'label-layer';
document.getElementById('app').appendChild(labelRenderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.7, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 2800;

/* ---------- 场景内容 ---------- */

const solar = buildSolarSystem(scene);
const deepSpace = buildDeepSpace(scene);

// 天体标签
const labels = [];
for (const [key, body] of solar.registry) {
  const div = document.createElement('div');
  div.className = 'body-label';
  div.textContent = body.data.name;
  div.addEventListener('pointerdown', (e) => e.stopPropagation());
  div.addEventListener('click', () => selectBody(key));
  const label = new CSS2DObject(div);
  label.position.set(0, body.data.displayRadius * 1.7 + 1.2, 0);
  (body.anchor ?? body.mesh).add(label);
  labels.push(label);
}

/* ---------- 状态 ---------- */

let daysPerSec = 0;
let paused = false;
let elapsedDays = 0;
let followKey = null;      // 正在跟随的天体
let followDist = 0;        // 跟随距离
const tmpV = new THREE.Vector3();
const desired = new THREE.Vector3();

function bodyWorldPos(key, out) {
  const body = solar.registry.get(key);
  return (body.anchor ?? body.mesh).getWorldPosition(out);
}

function selectBody(key) {
  followKey = key;
  const body = solar.registry.get(key);
  followDist = Math.max(body.data.displayRadius * 5.5, 10);
  ui.showInfo(key);
  ui.setActiveButton(key);
}

function resetView() {
  followKey = null;
  ui.setActiveButton(null);
  // 平滑飞回全景由 lerp 完成
  overviewTarget = true;
}
let overviewTarget = false;

/* ---------- UI ---------- */

const ui = buildUI({
  onSpeedChange: (v) => { daysPerSec = v; },
  onTogglePause: (p) => { paused = p; },
  onToggleOrbits: (show) => solar.orbitLines.forEach((l) => (l.visible = show)),
  onToggleLabels: (show) => labels.forEach((l) => (l.visible = show)),
  onSelectBody: selectBody,
  onResetView: resetView,
});

/* ---------- 点击拾取 ---------- */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pickables = [...solar.registry.values()].map((b) => b.mesh);
let downX = 0, downY = 0;

labelRenderer.domElement.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY;
});
labelRenderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // 拖拽不算点击
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  if (hits.length > 0) selectBody(hits[0].object.name);
});

/* ---------- 渲染循环 ---------- */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (!paused) {
    elapsedDays += daysPerSec * dt;
    solar.update(elapsedDays, dt);
    deepSpace.update(dt);
    ui.updateClock(elapsedDays);
  }

  // 镜头跟随选中天体
  if (followKey) {
    bodyWorldPos(followKey, tmpV);
    controls.target.lerp(tmpV, 0.12);
    // 保持视线方向,收敛到目标距离
    desired.copy(camera.position).sub(controls.target);
    const len = desired.length();
    if (Math.abs(len - followDist) > 0.5) {
      desired.setLength(len + (followDist - len) * 0.08);
      camera.position.copy(controls.target).add(desired);
    }
  } else if (overviewTarget) {
    controls.target.lerp(tmpV.set(0, 0, 0), 0.08);
    camera.position.lerp(desired.set(0, 160, 320), 0.06);
    if (camera.position.distanceTo(desired) < 2) overviewTarget = false;
  }

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// 隐藏加载提示
document.getElementById('loading')?.remove();

animate();
