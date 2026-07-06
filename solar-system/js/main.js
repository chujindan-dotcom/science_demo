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
import { buildCelestialSphere } from './celestial.js';
import { buildMilkyWayScene } from './milkyway.js';
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

const OVERVIEW_POS = new THREE.Vector3(0, 160, 320);
const NORMAL_MAX_DIST = 2800;

let daysPerSec = 0;
let paused = false;
let elapsedDays = 0;
let followKey = null;       // 正在跟随的天体
let followDist = 0;         // 跟随距离
let galaxyMode = false;     // 是否处于银河系俯瞰模式
let flying = false;         // 是否正在飞向目标机位
let flyT = 0;               // 飞行进度 0..1(基于时间,与帧率无关)
const FLY_DUR = 1.8;        // 飞行时长(秒)
let restoreAfterFlight = false; // 飞行结束后退出银河系模式
const tmpV = new THREE.Vector3();
const desired = new THREE.Vector3();
const camStart = new THREE.Vector3();
const tgtStart = new THREE.Vector3();
const camGoal = new THREE.Vector3();
const tgtGoal = new THREE.Vector3();

function bodyWorldPos(key, out) {
  const body = solar.registry.get(key);
  return (body.anchor ?? body.mesh).getWorldPosition(out);
}

function flyTo(pos, tgt) {
  followKey = null;
  flying = true;
  flyT = 0;
  camStart.copy(camera.position);
  tgtStart.copy(controls.target);
  camGoal.copy(pos);
  tgtGoal.copy(tgt);
}

function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function setSolarVisible(v) {
  solar.sun.group.visible = v;
  solar.planets.forEach((p) => (p.orbitGroup.visible = v));
  solar.orbitLines.forEach((l) => (l.visible = v && orbitsOn));
  solar.belt.visible = v;
  labels.forEach((l) => (l.visible = v && bodyLabelsOn));
  deepSpace.starfield.visible = v;
  deepSpace.galaxies.forEach((g) => (g.points.visible = v));
}

let orbitsOn = true;
let bodyLabelsOn = true;

function finishGalaxyExit() {
  restoreAfterFlight = false;
  galaxyMode = false;
  milkyway.setVisible(false);
  setSolarVisible(true);
  celestial.setVisible(true);
  celestial.setLabelsVisible(true);
  controls.maxDistance = NORMAL_MAX_DIST;
}

function selectBody(key) {
  if (galaxyMode) {
    // 直接从银河系模式选天体:立即恢复太阳系,并把镜头拉回近处再跟随
    finishGalaxyExit();
    camera.position.copy(OVERVIEW_POS);
    controls.target.set(0, 0, 0);
  }
  followKey = key;
  flying = false;
  const body = solar.registry.get(key);
  followDist = Math.max(body.data.displayRadius * 5.5, 10);
  ui.showInfo(key);
  ui.setActiveButton(key);
}

function resetView() {
  ui.setActiveButton(null);
  ui.closePanel();
  if (galaxyMode) { enterGalaxyMode(false); return; }
  flyTo(OVERVIEW_POS, tmpV.set(0, 0, 0));
}

function enterGalaxyMode(on) {
  if (on === galaxyMode) return;
  if (on) {
    galaxyMode = true;
    ui.setActiveButton(null);
    controls.maxDistance = milkyway.R * 2.2;
    setSolarVisible(false);
    celestial.setVisible(false);
    celestial.setLabelsVisible(false);
    milkyway.setVisible(true);
    flyTo(milkyway.viewPos, milkyway.focusTarget);
  } else {
    restoreAfterFlight = true;      // 飞回后再清理
    flyTo(OVERVIEW_POS, tmpV.set(0, 0, 0));
  }
}

/* ---------- UI ---------- */

const ui = buildUI({
  onSpeedChange: (v) => { daysPerSec = v; },
  onTogglePause: (p) => { paused = p; },
  onToggleOrbits: (show) => { orbitsOn = show; if (!galaxyMode) solar.orbitLines.forEach((l) => (l.visible = show)); },
  onToggleLabels: (show) => { bodyLabelsOn = show; if (!galaxyMode) labels.forEach((l) => (l.visible = show)); },
  onToggleDeepSky: (show) => { if (!galaxyMode) { celestial.setVisible(show); celestial.setLabelsVisible(show); } },
  onSelectBody: selectBody,
  onResetView: resetView,
  onEnterGalaxy: enterGalaxyMode,
});

// 天球背景层(常驻)与银河系俯瞰模型(默认隐藏),点击标签走统一信息面板
const celestial = buildCelestialSphere(scene, (info) => ui.showInfoData(info));
const milkyway = buildMilkyWayScene(scene, (info) => ui.showInfoData(info));

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

  if (!paused && !galaxyMode) {
    elapsedDays += daysPerSec * dt;
    solar.update(elapsedDays, dt);
    deepSpace.update(dt);
    ui.updateClock(elapsedDays);
  }
  milkyway.update(dt);

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
  } else if (flying) {
    flyT = Math.min(1, flyT + dt / FLY_DUR);
    const k = easeInOut(flyT);
    camera.position.lerpVectors(camStart, camGoal, k);
    controls.target.lerpVectors(tgtStart, tgtGoal, k);
    if (flyT >= 1) {
      flying = false;
      if (restoreAfterFlight) finishGalaxyExit(); // 飞回全景后清理银河系模式
    }
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
