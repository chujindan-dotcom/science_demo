// 天球背景层:二十八宿(四象分组)、银河带、猎户座大星云 M42
// 这些天体相对太阳系是"无穷远的方向",只贴在一个大天球上,不参与太阳系缩放,
// 也不随时间滑块运动(周日/周年视运动属于地球,日心场景里忽略)。
// 整层按黄赤交角 23.44° 倾斜,使赤道坐标与黄道(行星轨道面)正确相关。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { glowSpriteTexture } from './textures.js';

const DEG = Math.PI / 180;
const OBLIQUITY = 23.44 * DEG;

// 赤道坐标(RA 小时, Dec 度)-> 天球方向向量(Y 为天北极),再乘半径
function equToVec(raHours, decDeg, radius) {
  const ra = raHours * 15 * DEG;
  const dec = decDeg * DEG;
  return new THREE.Vector3(
    Math.cos(dec) * Math.cos(ra),
    Math.sin(dec),
    Math.cos(dec) * Math.sin(ra),
  ).multiplyScalar(radius);
}

/* ============================================================
   二十八宿数据
   stars: 该宿主要恒星的 [RA(小时), Dec(度)] 折线(近似真实位置)
   注:为演示可读性,采用各宿代表星的近似坐标,非逐星精确星表。
   ============================================================ */

const XIANG = {
  qinglong: { name: '东方青龙', color: 0x53d8e8, dim: 0x1c5a63 },
  xuanwu:   { name: '北方玄武', color: 0x6f88ff, dim: 0x263566 },
  baihu:    { name: '西方白虎', color: 0xe6ecf5, dim: 0x5a6070 },
  zhuque:   { name: '南方朱雀', color: 0xff7a4d, dim: 0x6e2c1a },
};

const MANSIONS = [
  // 东方青龙七宿
  { n: '角', p: 'Jiǎo', x: 'qinglong', d: '苍龙之角,含室女座角宿一(全天第16亮星)', s: [[13.42, -11.16], [13.58, -0.6]] },
  { n: '亢', p: 'Kàng', x: 'qinglong', d: '龙之咽喉', s: [[13.79, -5.7], [14.22, -11.2], [14.77, 1.5]] },
  { n: '氐', p: 'Dī', x: 'qinglong', d: '龙之胸,天秤座', s: [[14.85, -16.0], [15.07, -25.3], [15.28, -9.4], [14.85, -16.0]] },
  { n: '房', p: 'Fáng', x: 'qinglong', d: '龙之腹,天蝎头部', s: [[16.09, -19.8], [16.00, -22.6], [15.98, -26.1], [15.90, -29.2]] },
  { n: '心', p: 'Xīn', x: 'qinglong', d: '龙之心,含天蝎座心宿二(大火/Antares)', s: [[16.35, -25.6], [16.49, -26.43], [16.60, -28.2]] },
  { n: '尾', p: 'Wěi', x: 'qinglong', d: '龙之尾,天蝎座尾钩', s: [[16.84, -34.3], [16.87, -38.0], [16.90, -42.4], [17.20, -43.2], [17.62, -43.0], [17.56, -37.1]] },
  { n: '箕', p: 'Jī', x: 'qinglong', d: '簸箕,人马座', s: [[18.10, -29.8], [18.35, -29.9], [18.23, -25.4], [18.10, -29.8]] },
  // 北方玄武七宿
  { n: '斗', p: 'Dǒu', x: 'xuanwu', d: '南斗,人马座"茶壶"', s: [[18.35, -29.9], [18.40, -25.4], [18.92, -26.3], [19.04, -27.7], [18.77, -26.99]] },
  { n: '牛', p: 'Niú', x: 'xuanwu', d: '牵牛,摩羯座头部', s: [[20.29, -12.5], [20.35, -14.8]] },
  { n: '女', p: 'Nǚ', x: 'xuanwu', d: '婺女/织女之外,宝瓶座', s: [[20.79, -9.5], [20.88, -8.98], [21.02, -5.3]] },
  { n: '虚', p: 'Xū', x: 'xuanwu', d: '虚空,宝瓶/小马座', s: [[21.53, -5.57], [21.24, 4.28]] },
  { n: '危', p: 'Wēi', x: 'xuanwu', d: '危墙,宝瓶/飞马座', s: [[22.10, -0.32], [22.72, 10.83], [21.74, 9.88]] },
  { n: '室', p: 'Shì', x: 'xuanwu', d: '营室,飞马座大四方西边', s: [[23.08, 15.21], [23.06, 28.08]] },
  { n: '壁', p: 'Bì', x: 'xuanwu', d: '东壁,飞马-仙女座大四方东边', s: [[0.22, 15.18], [0.14, 29.09]] },
  // 西方白虎七宿
  { n: '奎', p: 'Kuí', x: 'baihu', d: '天之府库,仙女座', s: [[0.66, 30.86], [0.95, 23.42], [1.16, 35.62], [0.61, 33.72]] },
  { n: '娄', p: 'Lóu', x: 'baihu', d: '牧养,白羊座', s: [[1.91, 19.29], [1.89, 20.81], [2.12, 27.26]] },
  { n: '胃', p: 'Wèi', x: 'baihu', d: '天之仓廪,白羊座尾', s: [[2.72, 27.71], [2.83, 27.26], [2.95, 29.0]] },
  { n: '昴', p: 'Mǎo', x: 'baihu', d: '昴星团(七姊妹星团/M45)', s: [[3.79, 24.1], [3.75, 24.4], [3.82, 23.9], [3.74, 23.6], [3.80, 24.6], [3.77, 24.05]] },
  { n: '毕', p: 'Bì', x: 'baihu', d: '毕宿五(金牛座毕宿五 Aldebaran)与毕星团', s: [[4.48, 15.63], [4.38, 17.54], [4.30, 15.87], [4.60, 18.6], [4.48, 19.18]] },
  { n: '觜', p: 'Zī', x: 'baihu', d: '虎之嘴,猎户座头部(最小的宿)', s: [[5.59, 9.93], [5.61, 9.65], [5.53, 9.29]] },
  { n: '参', p: 'Shēn', x: 'baihu', d: '猎户座:参宿四/七、腰带三星,M42 即在此', s: [[5.42, 6.35], [5.92, 7.41], [5.68, -1.94], [5.60, -1.20], [5.53, -0.30], [5.24, -8.20], [5.80, -9.67], [5.68, -1.94]] },
  // 南方朱雀七宿
  { n: '井', p: 'Jǐng', x: 'zhuque', d: '东井,双子座足部(黄道最北)', s: [[6.25, 22.51], [6.38, 12.9], [6.63, 16.4], [7.06, 20.57], [6.75, 25.13]] },
  { n: '鬼', p: 'Guǐ', x: 'zhuque', d: '舆鬼,巨蟹座,含鬼星团 M44', s: [[8.20, 21.47], [8.44, 21.47], [8.72, 18.15], [8.75, 28.76], [8.20, 21.47]] },
  { n: '柳', p: 'Liǔ', x: 'zhuque', d: '朱雀之嘴,长蛇座头部', s: [[8.72, 6.42], [8.78, 5.95], [8.92, 5.70], [9.06, 2.31], [8.65, 3.34]] },
  { n: '星', p: 'Xīng', x: 'zhuque', d: '七星,含长蛇座星宿一(Alphard)', s: [[9.46, -8.66], [9.24, -8.9], [9.68, -12.35]] },
  { n: '张', p: 'Zhāng', x: 'zhuque', d: '朱雀之嗉,长蛇座', s: [[9.85, -14.85], [10.03, -12.35], [10.13, -16.2]] },
  { n: '翼', p: 'Yì', x: 'zhuque', d: '朱雀之翼,巨爵座(酒杯)', s: [[10.99, -18.30], [11.19, -22.83], [11.41, -17.68], [11.32, -14.78], [10.99, -18.30]] },
  { n: '轸', p: 'Zhěn', x: 'zhuque', d: '朱雀之尾,乌鸦座四边形', s: [[12.26, -17.54], [12.50, -16.52], [12.57, -23.40], [12.14, -22.62], [12.26, -17.54]] },
];

// 各宿附加科普信息(点击标签弹出)
function mansionInfo(m) {
  return {
    name: `${m.n}宿`,
    en: `${m.p} · ${XIANG[m.x].name}`,
    type: '二十八宿之一',
    rows: [['四象', XIANG[m.x].name], ['大致位置', '黄道 / 天赤道带']],
    facts: [
      m.d,
      '二十八宿是中国古代沿黄道和天赤道划分的星区,用于标定日月五星的位置。',
      '每宿有一颗"距星"作为量度起点;各宿宽窄不一(觜宿最窄,井宿最宽)。',
    ],
    note: '* 星宿恒星位置为近似真实坐标,供科普示意。',
  };
}

/* ============================================================
   银河带:在天球上沿银道面(大圆)密集分布恒星 + 柔光
   银北极 NGP ≈ RA 12h51.4m, Dec +27.13°
   ============================================================ */

const NGP_RA = 12.857 * 15 * DEG;
const NGP_DEC = 27.13 * DEG;

function galacticLatitude(raHours, decDeg) {
  const ra = raHours * 15 * DEG;
  const dec = decDeg * DEG;
  const sinb = Math.sin(dec) * Math.sin(NGP_DEC) +
    Math.cos(dec) * Math.cos(NGP_DEC) * Math.cos(ra - NGP_RA);
  return Math.asin(Math.max(-1, Math.min(1, sinb))); // 弧度
}

function buildMilkyWayBand(radius) {
  const group = new THREE.Group();
  const count = 9000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  let s = 987654321;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 40) {
    guard++;
    // 均匀采样球面方向
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const sinT = Math.sqrt(1 - u * u);
    const dec = Math.asin(u) / DEG;
    let ra = Math.atan2(sinT * Math.sin(phi), sinT * Math.cos(phi)) / (15 * DEG);
    if (ra < 0) ra += 24;
    const b = galacticLatitude(ra, dec); // 银纬
    // 越靠近银道面(b≈0)保留概率越高
    const density = Math.exp(-(b * b) / (2 * (12 * DEG) * (12 * DEG)));
    if (rand() > density) continue;

    const v = equToVec(ra, dec, radius * (0.995 + rand() * 0.01));
    positions[placed * 3] = v.x;
    positions[placed * 3 + 1] = v.y;
    positions[placed * 3 + 2] = v.z;

    // 银河偏冷白,夹杂少量暖色(星云/尘埃)
    const warm = rand();
    if (warm < 0.12) c.setHSL(0.08, 0.5, 0.6);
    else if (warm < 0.2) c.setHSL(0.62, 0.4, 0.6);
    else c.setHSL(0.6, 0.05, 0.75);
    const br = 0.35 + rand() * 0.5;
    colors[placed * 3] = c.r * br;
    colors[placed * 3 + 1] = c.g * br;
    colors[placed * 3 + 2] = c.b * br;
    placed++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, placed * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors.subarray(0, placed * 3), 3));
  const mat = new THREE.PointsMaterial({
    size: 2.0, sizeAttenuation: false, map: glowSpriteTexture(),
    vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.9,
  });
  group.add(new THREE.Points(geo, mat));
  return group;
}

/* ============================================================
   M42 猎户座大星云(位于参宿 / 猎户腰带下方"佩剑")
   RA 5h35.4m, Dec −5.39°
   ============================================================ */

function buildM42(radius) {
  const group = new THREE.Group();
  const dir = equToVec(5.59, -5.39, radius);

  // 星云主体:叠加几层加色辉光
  const layers = [
    { s: radius * 0.055, color: 'rgba(255,120,150,0.5)', out: 'rgba(255,120,150,0)' },
    { s: radius * 0.04, color: 'rgba(120,220,210,0.55)', out: 'rgba(120,220,210,0)' },
    { s: radius * 0.025, color: 'rgba(230,230,255,0.7)', out: 'rgba(230,230,255,0)' },
  ];
  for (const L of layers) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSpriteTexture(L.color, L.out),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    sp.position.copy(dir);
    sp.scale.setScalar(L.s);
    group.add(sp);
  }

  // 星云内散布的年轻恒星(猎户四边形附近)
  const n = 300;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  let s = 424242;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const basis = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
  const t1 = new THREE.Vector3().crossVectors(basis, new THREE.Vector3(0, 1, 0)).normalize();
  const t2 = new THREE.Vector3().crossVectors(basis, t1).normalize();
  for (let i = 0; i < n; i++) {
    const rr = Math.pow(rand(), 0.6) * radius * 0.05;
    const a = rand() * Math.PI * 2;
    const p = dir.clone()
      .add(t1.clone().multiplyScalar(Math.cos(a) * rr))
      .add(t2.clone().multiplyScalar(Math.sin(a) * rr));
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    c.setHSL(0.55 + rand() * 0.1, 0.4, 0.7 + rand() * 0.2);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: false, map: glowSpriteTexture(),
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));

  const info = {
    name: 'M42 猎户座大星云', en: 'Orion Nebula',
    type: '弥漫星云(恒星摇篮)',
    rows: [['距离', '约 1344 光年'], ['视星等', '约 4.0(肉眼可见)'], ['所在', '参宿 / 猎户座佩剑']],
    facts: [
      '距地球最近的大质量恒星形成区之一,肉眼看去是猎户腰带下一团朦胧光斑。',
      '内部的"猎户四边形"年轻星团用强紫外辐射照亮周围气体,使星云发光。',
      '在中国星官中,此处属西方白虎的"参"宿,靠近伐三星。',
    ],
    note: '* 星云为示意渲染,位置对应真实赤道坐标。',
  };
  return { group, dir, info };
}

/* ============================================================
   组装天球层
   ============================================================ */

export function buildCelestialSphere(scene, onSelect) {
  const radius = 3300;
  const group = new THREE.Group();
  group.rotation.x = OBLIQUITY; // 赤道系相对黄道(行星面)倾斜 23.44°
  scene.add(group);

  // 银河带
  group.add(buildMilkyWayBand(radius));

  // 银河带中心方向(人马座)放一个标签
  const bandLabelDir = equToVec(17.76, -28.9, radius);

  // 二十八宿
  const mansionsGroup = new THREE.Group();
  group.add(mansionsGroup);
  const labels = []; // {el, info}

  for (const m of MANSIONS) {
    const xiang = XIANG[m.x];
    const pts = m.s.map(([ra, dec]) => equToVec(ra, dec, radius));

    // 连线
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    mansionsGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color: xiang.color, transparent: true, opacity: 0.55,
    })));

    // 星点
    const starGeo = new THREE.BufferGeometry().setFromPoints(pts);
    mansionsGroup.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: xiang.color, size: 6, sizeAttenuation: false,
      map: glowSpriteTexture(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })));

    // 宿名标签(取折线中点方向)
    const centroid = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const div = document.createElement('div');
    div.className = 'sky-label mansion';
    div.style.color = '#' + xiang.color.toString(16).padStart(6, '0');
    div.textContent = m.n;
    const info = mansionInfo(m);
    div.addEventListener('pointerdown', (e) => e.stopPropagation());
    div.addEventListener('click', () => onSelect(info));
    const label = new CSS2DObject(div);
    label.position.copy(centroid.setLength(radius));
    mansionsGroup.add(label);
    labels.push({ el: div, obj: label, info });
  }

  // 四象大标签(方位提示)
  const xiangCenters = {
    qinglong: [15.5, -22], xuanwu: [21.5, 5], baihu: [3.0, 20], zhuque: [10.0, -2],
  };
  for (const [key, [ra, dec]] of Object.entries(xiangCenters)) {
    const div = document.createElement('div');
    div.className = 'sky-label xiang';
    div.style.color = '#' + XIANG[key].color.toString(16).padStart(6, '0');
    div.textContent = XIANG[key].name;
    const label = new CSS2DObject(div);
    label.position.copy(equToVec(ra, dec, radius * 1.02));
    mansionsGroup.add(label);
    labels.push({ el: div, obj: label });
  }

  // M42
  const m42 = buildM42(radius);
  group.add(m42.group);
  const m42Div = document.createElement('div');
  m42Div.className = 'sky-label nebula';
  m42Div.textContent = 'M42 猎户座大星云';
  m42Div.addEventListener('pointerdown', (e) => e.stopPropagation());
  m42Div.addEventListener('click', () => onSelect(m42.info));
  const m42Label = new CSS2DObject(m42Div);
  m42Label.position.copy(m42.dir.clone().setLength(radius));
  group.add(m42Label);
  labels.push({ el: m42Div, obj: m42Label, info: m42.info });

  // 银河标签
  const bandDiv = document.createElement('div');
  bandDiv.className = 'sky-label band';
  bandDiv.textContent = '银河(人马座方向·银心)';
  const bandInfo = {
    name: '银河 / 银河系盘面', en: 'The Milky Way',
    type: '本星系(棒旋星系)在天球上的投影',
    rows: [['直径', '约 10 万光年'], ['太阳位置', '距银心约 2.6 万光年'], ['恒星数', '约 1000–4000 亿颗']],
    facts: [
      '夏夜横跨天空的乳白色光带,正是我们从盘内侧看到的银河系恒星与星云。',
      '最浓密、最亮的方向朝向人马座,那里是银河系的中心(银心)。',
      '想看银河系"全貌",点击下方"银河系"按钮,把镜头拉到盘外俯瞰。',
    ],
    note: '* 银河带按银道面(银北极 RA 12h51m / Dec +27°)真实分布生成。',
  };
  bandDiv.addEventListener('pointerdown', (e) => e.stopPropagation());
  bandDiv.addEventListener('click', () => onSelect(bandInfo));
  const bandLabel = new CSS2DObject(bandDiv);
  bandLabel.position.copy(bandLabelDir);
  group.add(bandLabel);
  labels.push({ el: bandDiv, obj: bandLabel, info: bandInfo });

  // 用 CSS2DObject.visible 控制标签(DOM 的 display 会被 CSS2DRenderer 每帧重置)
  function setVisible(v) { group.visible = v; labels.forEach((l) => { l.obj.visible = v; }); }
  function setLabelsVisible(v) { labels.forEach((l) => { l.obj.visible = v; }); }

  return { group, setVisible, setLabelsVisible };
}
