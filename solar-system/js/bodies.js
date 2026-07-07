// 天体构建:太阳(着色器动画)、行星、月球、土星环、大气辉光、轨道线、小行星带
import * as THREE from 'three';
import { BODIES, INITIAL_PHASE, PLANET_ORDER, BELT, ORBIT } from './data.js';
import * as TEX from './textures.js';

const DEG = Math.PI / 180;

/* ---------- 太阳:噪声火焰着色器 + 日冕光晕 ---------- */

const SUN_SHADER = {
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    varying vec3 vNormal;
    void main() {
      vPos = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z);
    }
    float fbm(vec3 p) {
      float f = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        f += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return f;
    }

    void main() {
      vec3 p = normalize(vPos) * 3.0;
      float t = uTime * 0.06;
      // 两层流动噪声叠加,模拟对流米粒组织
      float n = fbm(p * 2.0 + vec3(t, t * 0.7, -t));
      n += 0.5 * fbm(p * 5.0 - vec3(t * 1.6, -t, t * 0.5));
      n /= 1.5;

      vec3 deep = vec3(0.55, 0.12, 0.01);
      vec3 mid  = vec3(1.00, 0.45, 0.05);
      vec3 hot  = vec3(1.00, 0.85, 0.45);
      vec3 white= vec3(1.00, 0.98, 0.90);
      vec3 col = mix(deep, mid, smoothstep(0.15, 0.5, n));
      col = mix(col, hot, smoothstep(0.5, 0.72, n));
      col = mix(col, white, smoothstep(0.72, 0.92, n));

      // 临边昏暗:边缘略暗更有球体感
      float limb = dot(vNormal, vec3(0.0, 0.0, 1.0));
      col *= 0.72 + 0.28 * smoothstep(0.0, 0.7, limb);

      gl_FragColor = vec4(col * 1.12, 1.0); // 略高于 1 触发适度泛光,但保留表面米粒细节
    }
  `,
};

export function createSun() {
  const group = new THREE.Group();
  const data = BODIES.sun;

  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(SUN_SHADER.uniforms),
    vertexShader: SUN_SHADER.vertexShader,
    fragmentShader: SUN_SHADER.fragmentShader,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.displayRadius, 96, 48), mat);
  mesh.name = 'sun';
  group.add(mesh);

  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX.coronaTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }));
  corona.scale.setScalar(data.displayRadius * 4.2);
  group.add(corona);

  // 色球层:贴着表面的一层偏红辉光,给太阳一圈"活"的边缘
  const chromosphere = new THREE.Mesh(
    new THREE.SphereGeometry(data.displayRadius * 1.015, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xff5522) } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal; varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vNormal; varying vec3 vView;
        void main() {
          float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
          gl_FragColor = vec4(uColor, rim * 0.9);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  group.add(chromosphere);

  // 日珥:表面若干处向外喷发的等离子弧,缓慢脉动
  const proms = createSunProminences(data.displayRadius);
  group.add(proms.group);

  const light = new THREE.PointLight(0xfff4e2, 2.7, 0, 0);
  group.add(light);

  let promTime = 0;
  function updateProminences(dt) {
    promTime += dt;
    proms.update(promTime);
  }

  return { group, mesh, mat, data, updateProminences };
}

// 日珥:在太阳表面随机点上放置向外的加色"火舌"精灵,各自相位脉动
function createSunProminences(radius, count = 14) {
  const group = new THREE.Group();
  const tex = TEX.glowSpriteTexture('rgba(255,150,60,1)', 'rgba(255,90,20,0)');
  let s = 20260706;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const items = [];
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const sinT = Math.sqrt(1 - u * u);
    const dir = new THREE.Vector3(sinT * Math.cos(phi), u, sinT * Math.sin(phi));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      color: new THREE.Color().setHSL(0.03 + rand() * 0.05, 1, 0.6),
    }));
    const base = radius * (0.18 + rand() * 0.22);
    sprite.position.copy(dir).multiplyScalar(radius * 1.02);
    sprite.scale.setScalar(base);
    group.add(sprite);
    items.push({ sprite, dir, base, speed: 0.4 + rand() * 0.9, phase: rand() * Math.PI * 2, reach: radius * (0.06 + rand() * 0.12) });
  }
  function update(t) {
    for (const it of items) {
      const pulse = 0.5 + 0.5 * Math.sin(t * it.speed + it.phase);
      const sc = it.base * (0.7 + pulse * 0.6);
      it.sprite.scale.setScalar(sc);
      it.sprite.material.opacity = 0.35 + pulse * 0.5;
      // 随脉动略微向外抬升,像喷发
      it.sprite.position.copy(it.dir).multiplyScalar(radius * 1.02 + it.reach * pulse);
    }
  }
  return { group, update };
}

/* ---------- 大气辉光(菲涅尔边缘光) ---------- */

function createAtmosphere(radius, color, power = 3.2, intensity = 0.9) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vView)), uPower);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 48, 24), mat);
}

/* ---------- 行星 ---------- */

const TEXTURE_MAKERS = {
  mercury: TEX.mercuryTexture,
  venus: TEX.venusTexture,
  earth: TEX.earthTexture,
  moon: TEX.moonTexture,
  mars: TEX.marsTexture,
  jupiter: TEX.jupiterTexture,
  saturn: TEX.saturnTexture,
  uranus: TEX.uranusTexture,
  neptune: TEX.neptuneTexture,
};

const ATMOSPHERES = {
  venus: { color: 0xf0d8a0, intensity: 0.8 },
  earth: { color: 0x6fa8ff, intensity: 1.0 },
  mars: { color: 0xd08050, intensity: 0.35 },
  jupiter: { color: 0xd8b890, intensity: 0.55 },
  saturn: { color: 0xe8d8a8, intensity: 0.5 },
  uranus: { color: 0xa0e0e8, intensity: 0.6 },
  neptune: { color: 0x5080e0, intensity: 0.65 },
};

const MATERIAL_TWEAKS = {
  mercury: { roughness: 0.95, bump: 0.10 },
  venus: { roughness: 0.7 },
  earth: { roughness: 0.7, bump: 0.045 }, // roughness 由贴图控制,这里作基准
  moon: { roughness: 0.98, bump: 0.09 },
  mars: { roughness: 0.9, bump: 0.07 },
  jupiter: { roughness: 0.65 },
  saturn: { roughness: 0.65 },
  uranus: { roughness: 0.5 },
  neptune: { roughness: 0.5 },
};

// 返回 { key, data, orbitGroup, bodyGroup, mesh, spin..., 更新用参数 }
function createPlanet(key) {
  const data = BODIES[key];
  const r = data.displayRadius;

  // inclGroup 承载轨道倾角(相对黄道),orbitGroup 在其内绕太阳公转
  const orbit = ORBIT[key] || { incl: 0, node: 0 };
  const inclGroup = new THREE.Group();
  inclGroup.rotation.order = 'YXZ';
  inclGroup.rotation.y = orbit.node * DEG;  // 升交点黄经
  inclGroup.rotation.x = orbit.incl * DEG;  // 轨道倾角

  const orbitGroup = new THREE.Group();
  inclGroup.add(orbitGroup);
  const anchor = new THREE.Group();
  anchor.position.x = data.displayDist;
  orbitGroup.add(anchor);

  // 轨道线放在倾斜平面内,与实际轨道一致
  const orbitLine = createOrbitLine(data.displayDist);
  inclGroup.add(orbitLine);

  const bodyGroup = new THREE.Group();
  bodyGroup.rotation.z = -data.tiltDeg * DEG;
  anchor.add(bodyGroup);

  const tex = TEXTURE_MAKERS[key]();
  const tw = MATERIAL_TWEAKS[key];
  const mat = new THREE.MeshStandardMaterial({
    map: tex.map,
    bumpMap: tex.bump || null,
    bumpScale: tw.bump || 0,
    roughnessMap: tex.rough || null,
    roughness: tw.roughness,
    metalness: 0.0,
  });
  // 大行星用更高细分,近距离不露多边形棱角
  const seg = r >= 6 ? 96 : 64;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2), mat);
  mesh.name = key;
  bodyGroup.add(mesh);

  if (ATMOSPHERES[key]) {
    const a = ATMOSPHERES[key];
    bodyGroup.add(createAtmosphere(r, a.color, 3.2, a.intensity));
  }

  let clouds = null;
  if (key === 'earth') {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.018, 64, 32),
      new THREE.MeshStandardMaterial({
        map: TEX.earthCloudTexture(),
        transparent: true,
        depthWrite: false,
        roughness: 1,
      }),
    );
    bodyGroup.add(clouds);
  }

  let ringMesh = null, ringMat = null;
  if (key === 'saturn') {
    const ringGeo = new THREE.RingGeometry(r * 1.35, r * 2.4, 192, 1);
    // 重映射 UV:u = 半径比例,使一维环带纹理沿半径展开
    const pos = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    const inner = r * 1.35, outer = r * 2.4;
    for (let i = 0; i < pos.count; i++) {
      const len = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (len - inner) / (outer - inner), 0.5);
    }
    // 自定义着色器:行星本影投在环上(对每个环上点做球体遮挡测试)
    ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: TEX.saturnRingTexture() },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uPlanetR: { value: r },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vLocal;
        void main() {
          vUv = uv;
          vLocal = position.xyz; // 环几何局部坐标(planet 在原点)
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uSunDir;
        uniform float uPlanetR;
        varying vec2 vUv;
        varying vec3 vLocal;
        void main() {
          vec4 tex = texture2D(uMap, vec2(vUv.x, 0.5));
          if (tex.a < 0.01) discard;
          // 从环上点朝太阳方向,若被行星球体遮挡则处于本影中
          float t0 = dot(-vLocal, uSunDir);
          float shade = 1.0;
          if (t0 > 0.0) {
            vec3 closest = vLocal + uSunDir * t0;
            float d = length(closest);
            shade = mix(0.22, 1.0, smoothstep(uPlanetR * 0.98, uPlanetR * 1.12, d));
          }
          gl_FragColor = vec4(tex.rgb * shade, tex.a);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    bodyGroup.add(ringMesh);
  }

  return {
    key, data, inclGroup, orbitGroup, anchor, bodyGroup, mesh, clouds, orbitLine,
    ringMesh, ringMat,
    phase: INITIAL_PHASE[key] || 0,
  };
}

/* ---------- 轨道线 ---------- */

export function createOrbitLine(radius, color = 0x3a4a6a, opacity = 0.55) {
  const pts = [];
  const seg = 256;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
  }));
}

/* ---------- 小行星带 ---------- */

export function createAsteroidBelt() {
  const { inner, outer, count } = BELT;
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a8f80, roughness: 1 });
  const belt = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let s = 12345;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const rr = inner + Math.pow(rand(), 0.7) * (outer - inner);
    dummy.position.set(Math.cos(a) * rr, (rand() - 0.5) * 5, Math.sin(a) * rr);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.setScalar(0.08 + rand() * 0.35);
    dummy.updateMatrix();
    belt.setMatrixAt(i, dummy.matrix);
  }
  return belt;
}

/* ---------- 组装整个太阳系 ---------- */

export function buildSolarSystem(scene) {
  const registry = new Map(); // key -> { key, data, mesh, getWorldPos, ... }
  const planets = [];
  const orbitLines = [];

  const sun = createSun();
  scene.add(sun.group);
  registry.set('sun', {
    key: 'sun', data: BODIES.sun, mesh: sun.mesh,
    anchor: sun.group,
  });

  for (const key of PLANET_ORDER) {
    const p = createPlanet(key);
    scene.add(p.inclGroup);   // 含倾斜轨道面 + 轨道线
    planets.push(p);
    registry.set(key, p);
    orbitLines.push(p.orbitLine);
  }

  // 月球挂在地球 anchor 下(自带轨道倾角与轨道线)
  const earth = registry.get('earth');
  const moon = createPlanet('moon');
  earth.anchor.add(moon.inclGroup);
  moon.orbitLine.material.color.set(0x4a5a7a);
  moon.orbitLine.material.opacity = 0.4;
  planets.push(moon);
  registry.set('moon', moon);
  orbitLines.push(moon.orbitLine);

  const belt = createAsteroidBelt();
  scene.add(belt);

  // 极低环境光:夜半球接近漆黑,晨昏线更有戏剧性(纪录片式明暗)
  scene.add(new THREE.AmbientLight(0x141c2e, 0.22));

  const _sunLocal = new THREE.Vector3();

  // elapsedDays: 模拟经过的天数
  function update(elapsedDays, dtSeconds) {
    sun.mat.uniforms.uTime.value += dtSeconds;
    sun.mesh.rotation.y = (elapsedDays / BODIES.sun.rotationDays) * Math.PI * 2;
    sun.updateProminences(dtSeconds);

    for (const p of planets) {
      p.orbitGroup.rotation.y = -(p.phase + (elapsedDays / p.data.orbitDays) * Math.PI * 2);
      p.mesh.rotation.y = (elapsedDays / p.data.rotationDays) * Math.PI * 2;
      if (p.clouds) p.clouds.rotation.y = p.mesh.rotation.y * 1.15;
      // 土星环:更新太阳方向(环局部空间),使行星本影随公转移动
      if (p.ringMat) {
        p.ringMesh.updateWorldMatrix(true, false);
        p.ringMesh.worldToLocal(_sunLocal.set(0, 0, 0));
        p.ringMat.uniforms.uSunDir.value.copy(_sunLocal).normalize();
      }
    }
    belt.rotation.y = -(elapsedDays / 1800) * Math.PI * 2;
  }

  return { registry, planets, orbitLines, sun, belt, update };
}
