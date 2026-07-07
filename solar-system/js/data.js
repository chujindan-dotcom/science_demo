// 天体数据:物理数据为真实值,displayRadius / displayDist 为演示用压缩比例
// (真实比例下行星只有像素大小,无法观赏)

export const BODIES = {
  sun: {
    name: '太阳', en: 'Sun', type: '恒星(G2V 黄矮星)',
    displayRadius: 20,
    rotationDays: 25.4,
    diameterKm: 1392700,
    facts: [
      '太阳占太阳系总质量的 99.86%',
      '核心温度约 1500 万 ℃,表面约 5500 ℃',
      '光从太阳到地球需要约 8 分 20 秒',
    ],
  },
  mercury: {
    name: '水星', en: 'Mercury', type: '岩质行星',
    displayRadius: 1.4, displayDist: 42,
    orbitDays: 88, rotationDays: 58.6, tiltDeg: 0.03,
    diameterKm: 4879,
    facts: [
      '离太阳最近,昼夜温差可达 600 ℃',
      '一个水星日(日出到日出)约等于 176 个地球日',
      '表面布满陨石坑,酷似月球',
    ],
  },
  venus: {
    name: '金星', en: 'Venus', type: '岩质行星',
    displayRadius: 2.4, displayDist: 60,
    orbitDays: 224.7, rotationDays: -243, tiltDeg: 177.4,
    diameterKm: 12104,
    facts: [
      '自转方向与其他行星相反(逆行自转)',
      '浓厚二氧化碳大气造成极端温室效应,表面约 465 ℃,是最热的行星',
      '在地球上看是最亮的行星,即「启明星 / 长庚星」',
    ],
  },
  earth: {
    name: '地球', en: 'Earth', type: '岩质行星',
    displayRadius: 2.5, displayDist: 80,
    orbitDays: 365.25, rotationDays: 0.997, tiltDeg: 23.4,
    diameterKm: 12742,
    facts: [
      '目前已知唯一存在生命的星球',
      '表面 71% 被海洋覆盖,因此被称为「蓝色弹珠」',
      '23.4° 的自转轴倾角造就了四季变化',
    ],
  },
  moon: {
    name: '月球', en: 'Moon', type: '卫星(地球)',
    displayRadius: 0.7, displayDist: 6.5,
    orbitDays: 27.3, rotationDays: 27.3, tiltDeg: 6.7,
    diameterKm: 3474,
    facts: [
      '被地球潮汐锁定,永远以同一面朝向地球',
      '正以每年约 3.8 厘米的速度远离地球',
      '月球引力是地球潮汐的主要成因',
    ],
  },
  mars: {
    name: '火星', en: 'Mars', type: '岩质行星',
    displayRadius: 1.7, displayDist: 102,
    orbitDays: 687, rotationDays: 1.026, tiltDeg: 25.2,
    diameterKm: 6779,
    facts: [
      '表面富含氧化铁(铁锈),因此呈红色',
      '拥有太阳系最高的火山——奥林帕斯山,高约 22 公里',
      '两极有干冰与水冰组成的极冠,随季节消长',
    ],
  },
  jupiter: {
    name: '木星', en: 'Jupiter', type: '气态巨行星',
    displayRadius: 9, displayDist: 165,
    orbitDays: 4333, rotationDays: 0.414, tiltDeg: 3.1,
    diameterKm: 139820,
    facts: [
      '太阳系最大行星,质量是其他行星总和的 2.5 倍',
      '大红斑是持续了至少 300 多年的巨型风暴,可装下整个地球',
      '自转最快,一天不到 10 小时',
    ],
  },
  saturn: {
    name: '土星', en: 'Saturn', type: '气态巨行星',
    displayRadius: 7.6, displayDist: 218,
    orbitDays: 10759, rotationDays: 0.444, tiltDeg: 26.7,
    diameterKm: 116460,
    facts: [
      '壮观的光环主要由水冰颗粒构成,厚度平均仅约 10 米',
      '密度比水还小,理论上能浮在水面上',
      '已确认卫星超过 140 颗,是卫星最多的行星',
    ],
  },
  uranus: {
    name: '天王星', en: 'Uranus', type: '冰巨星',
    displayRadius: 4.6, displayDist: 268,
    orbitDays: 30687, rotationDays: -0.718, tiltDeg: 97.8,
    diameterKm: 50724,
    facts: [
      '自转轴几乎「躺」在轨道面上,像滚动着绕太阳公转',
      '大气中的甲烷吸收红光,使其呈淡青色',
      '是太阳系温度最低的行星,约 -224 ℃',
    ],
  },
  neptune: {
    name: '海王星', en: 'Neptune', type: '冰巨星',
    displayRadius: 4.4, displayDist: 312,
    orbitDays: 60190, rotationDays: 0.671, tiltDeg: 28.3,
    diameterKm: 49244,
    facts: [
      '通过数学计算预言后才被发现的行星,被称为「笔尖上的行星」',
      '风速可达每小时 2100 公里,是太阳系最强风暴',
      '绕太阳一圈需要约 165 个地球年',
    ],
  },
};

// 行星在场景中的初始相位(弧度),错开摆放更好看
export const INITIAL_PHASE = {
  mercury: 0.8, venus: 2.4, earth: 4.4, mars: 1.6,
  jupiter: 5.5, saturn: 3.4, uranus: 0.4, neptune: 2.0, moon: 1.2,
};

export const PLANET_ORDER = [
  'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
];

// 轨道真实参数:incl=轨道倾角(相对黄道,°),node=升交点黄经(°)
// 地球轨道即黄道面,倾角为 0
export const ORBIT = {
  mercury: { incl: 7.00, node: 48.3 },
  venus: { incl: 3.39, node: 76.7 },
  earth: { incl: 0.0, node: 0 },
  mars: { incl: 1.85, node: 49.6 },
  jupiter: { incl: 1.30, node: 100.5 },
  saturn: { incl: 2.49, node: 113.7 },
  uranus: { incl: 0.77, node: 74.0 },
  neptune: { incl: 1.77, node: 131.8 },
  moon: { incl: 5.14, node: 125.0 },
};

export const BELT = { inner: 118, outer: 145, count: 900 };
