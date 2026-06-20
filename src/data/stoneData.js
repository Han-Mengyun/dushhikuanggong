/**
 * 原石种类、赌石结果、钩子、关卡数据配置
 */

// ==================== 原石种类 ====================
// 密度(density) kg/m3  体积(volume) m3  质量 = density * volume
// pullSpeed 已移除，拉回速度由石头质量和钩子拉力共同决定

export const STONE_TYPES = {
  huipishi: {
    key: 'huipishi',
    name: '灰皮石',
    density: 2.2,     // 密度（轻）
    volume: 0.3,      // 体积
    goodRate: 0.20,
    color: 0x888888,
    highlight: 0xaaaaaa,
    size: 28,
    description: '灰色粗糙外表，常见，轻',
    rarity: 0.35,
  },
  huangshapi: {
    key: 'huangshapi',
    name: '黄沙皮',
    density: 2.5,
    volume: 0.4,
    goodRate: 0.35,
    color: 0xc8a832,
    highlight: 0xe0c050,
    size: 32,
    description: '黄色沙粒表面，中等重量',
    rarity: 0.28,
  },
  heiWusha: {
    key: 'heiWusha',
    name: '黑乌砂',
    density: 3.5,     // 密度大
    volume: 0.5,      // 体积大
    goodRate: 0.50,
    color: 0x333333,
    highlight: 0x555555,
    size: 38,
    description: '黑色沉重，密度大',
    rarity: 0.18,
  },
  baiyansha: {
    key: 'baiyansha',
    name: '白盐沙',
    density: 2.0,     // 轻
    volume: 0.25,     // 体积小
    goodRate: 0.15,
    color: 0xe8e0d0,
    highlight: 0xf5f0e8,
    size: 26,
    description: '白色结晶表面，轻但风险大',
    rarity: 0.12,
  },
  moxisha: {
    key: 'moxisha',
    name: '莫西沙',
    density: 3.8,     // 密度最大
    volume: 0.6,      // 体积最大
    goodRate: 0.65,
    color: 0x5a4a3a,
    highlight: 0x8a7a6a,
    size: 42,
    description: '名场口料，又重又大',
    rarity: 0.07,
  },
};

/**
 * 计算石头质量
 * @param {Object} stoneType - 原石类型
 * @returns {number} 质量 (kg)
 */
export function getStoneMass(stoneType) {
  return stoneType.density * stoneType.volume;
}

/**
 * 计算拉回速度
 * 拉回速度 = 钩子拉力 / 石头质量 * 基础速度系数
 * 质量越大越慢，钩子拉力越大越快
 * @param {Object} stoneType - 原石类型
 * @param {Object} hookType - 钩子类型
 * @returns {number} 拉回速度
 */
export function calcPullSpeed(stoneType, hookType) {
  const mass = getStoneMass(stoneType);
  const pullForce = hookType.pullForce;
  const baseFactor = 2.0; // 基础速度系数
  const speed = (pullForce / mass) * baseFactor;
  // 限制在合理范围内
  return Math.max(0.5, Math.min(5, speed));
}

// ==================== 钩子种类 ====================

export const HOOK_TYPES = {
  rustHook: {
    key: 'rustHook',
    name: '铁锈钩',
    pullForce: 2.0,
    extendSpeed: 4,        // 伸出慢
    swingSpeed: 0.018,     // 摆动速度（弧度/帧）
    swingRange: 1.1,       // 摆动范围（弧度）~63°
    price: 0,
    description: '破旧铁钩，拉力有限，伸出慢',
    color: 0x886644,
    ropeColor: 0x8b7355,
    owned: true,
    size: 8,               // 钩爪头大小
  },
  steelHook: {
    key: 'steelHook',
    name: '精钢钩',
    pullForce: 3.5,
    extendSpeed: 7,        // 伸出明显更快
    swingSpeed: 0.022,     // 摆动更快
    swingRange: 1.2,
    price: 300,
    description: '精钢打造，拉力和速度均提升',
    color: 0xaaaacc,
    ropeColor: 0x9999aa,
    owned: false,
    size: 9,
  },
  alloyHook: {
    key: 'alloyHook',
    name: '合金钩',
    pullForce: 5.5,
    extendSpeed: 11,       // 伸出很快
    swingSpeed: 0.027,     // 摆动较快
    swingRange: 1.25,
    price: 800,
    description: '钛合金钩，高速强力',
    color: 0xccddff,
    ropeColor: 0xbbccdd,
    owned: false,
    size: 10,
  },
  diamondHook: {
    key: 'diamondHook',
    name: '钻石钩',
    pullForce: 8.0,
    extendSpeed: 16,       // 伸出极快
    swingSpeed: 0.032,     // 摆动最快
    swingRange: 1.3,
    price: 2000,
    description: '顶级装备，极速出击',
    color: 0x88ffcc,
    ropeColor: 0x66ddaa,
    owned: false,
    size: 12,
  },
};

// ==================== 赌石结果 ====================

export const GEM_TYPES = {
  feishi: {
    key: 'feishi',
    name: '废石',
    value: 10,
    color: 0x666666,
    description: '毫无价值的碎石',
    isGood: false,
  },
  putongliao: {
    key: 'putongliao',
    name: '普通料',
    value: 50,
    color: 0x997766,
    description: '低品质矿石',
    isGood: false,
  },
  manao: {
    key: 'manao',
    name: '玛瑙',
    value: 100,
    color: 0xcc4466,
    description: '有一定价值',
    isGood: true,
  },
  hetianyu: {
    key: 'hetianyu',
    name: '和田玉',
    value: 200,
    color: 0xf0e8d0,
    description: '品质不错',
    isGood: true,
  },
  feicui: {
    key: 'feicui',
    name: '翡翠',
    value: 500,
    color: 0x33cc66,
    description: '高价值宝石',
    isGood: true,
  },
  diwanglv: {
    key: 'diwanglv',
    name: '帝王绿',
    value: 1000,
    color: 0x00aa44,
    description: '极品，极稀有',
    isGood: true,
  },
};

// ==================== 收购商系统 ====================
// 切面出现特殊颜色时，收购商可能出现出价收购
// 收购价 = 宝石原价 × 倍率，通常比加工后价值低但有保障
// 品质越好，出现概率越高，收购价倍率越高

export const BUYER_DATA = {
  // 收购商出现的品质阈值：只有 good 及以上品质的切面才会触发
  triggerQuality: ['good', 'great'],

  // 各宝石的收购配置
  gems: {
    manao: {
      chance: 0.35,          // 35%概率出现收购商
      offerMultiplier: 1.3,  // 收购价 = 100 * 1.3 = 130（比原价高，比首饰加工150低）
      buyerName: '玉石商老张',
      buyerLine: '这块玛瑙色不错，我出{price}收了！',
    },
    hetianyu: {
      chance: 0.50,
      offerMultiplier: 1.6,  // 200 * 1.6 = 320（首饰400，摆件300）
      buyerName: '珠宝商李姐',
      buyerLine: '和田玉！我出{price}，现钱！',
    },
    feicui: {
      chance: 0.65,
      offerMultiplier: 1.8,  // 500 * 1.8 = 900（首饰1250，摆件900）
      buyerName: '翡翠行王老板',
      buyerLine: '好翡翠！{price}，一口价！',
    },
    diwanglv: {
      chance: 0.80,
      offerMultiplier: 2.0,  // 1000 * 2.0 = 2000（首饰3000，摆件2000）
      buyerName: '收藏家赵先生',
      buyerLine: '帝王绿！！{price}，我全包了！',
    },
    // 废石和普通料：不出收购商
    feishi: { chance: 0 },
    putongliao: { chance: 0 },
  },

  // 切面特殊颜色触发：切到玉肉区域时额外加概率
  jadeExposedBonus: 0.3,  // 切到玉肉 +30%概率
};

/**
 * 检查收购商是否出现
 * @param {Object} gemResult - 当前揭示的宝石结果
 * @param {boolean} jadeExposed - 切面是否暴露了玉肉
 * @param {number} cutCount - 已切割次数（切的越多越可能出收购商）
 * @returns {Object|null} 收购商数据，或 null
 */
export function checkBuyerAppears(gemResult, jadeExposed, cutCount) {
  const gemConfig = BUYER_DATA.gems[gemResult.key];
  if (!gemConfig || gemConfig.chance <= 0) return null;

  // 计算出现概率
  let chance = gemConfig.chance;
  if (jadeExposed) chance += BUYER_DATA.jadeExposedBonus;
  chance += cutCount * 0.05; // 每多切一刀 +5%
  chance = Math.min(0.95, chance); // 上限95%

  if (Math.random() > chance) return null;

  const offer = Math.round(gemResult.value * gemConfig.offerMultiplier);
  return {
    buyerName: gemConfig.buyerName,
    buyerLine: gemConfig.buyerLine.replace('{price}', offer),
    offer,
    gemKey: gemResult.key,
  };
}

// ==================== 加工类型 ====================
// 开出的料子可以选择加工成首饰或摆件
// 首饰：价值倍率高，但只适合高品质宝石（废石/普通料做首饰价值低）
// 摆件：价值稳定，适合所有品质，但高品质宝石倍率不如首饰

export const CRAFT_TYPES = {
  jewelry: {
    key: 'jewelry',
    name: '首饰',
    icon: 'ring',
    description: '精细加工，高品质宝石首选',
    // 价值倍率按宝石品质：[废石, 普通料, 玛瑙, 和田玉, 翡翠, 帝王绿]
    multipliers: {
      feishi: 0.5,      // 废料做首饰更不值钱
      putongliao: 0.8,  // 普通料做首饰打折
      manao: 1.5,       // 玛瑙做首饰增值
      hetianyu: 2.0,    // 和田玉做首饰翻倍
      feicui: 2.5,      // 翡翠做首饰大增值
      diwanglv: 3.0,    // 帝王绿做首饰暴涨
    },
  },
  ornament: {
    key: 'ornament',
    name: '摆件',
    icon: 'buddha',
    description: '稳重保值，什么料都能做',
    multipliers: {
      feishi: 1.2,      // 废石做摆件反而稍好
      putongliao: 1.3,  // 普通料做摆件稳
      manao: 1.2,       // 玛瑙做摆件略增
      hetianyu: 1.5,    // 和田玉做摆件不错
      feicui: 1.8,      // 翡翠做摆件增值
      diwanglv: 2.0,    // 帝王绿做摆件翻倍
    },
  },
};

/**
 * 计算加工后价值
 * @param {Object} gemResult - 宝石结果
 * @param {string} craftKey - 加工类型 key
 * @returns {number} 加工后价值
 */
export function calcCraftValue(gemResult, craftKey) {
  const craft = CRAFT_TYPES[craftKey];
  if (!craft) return gemResult.value;
  const mult = craft.multipliers[gemResult.key] || 1;
  return Math.round(gemResult.value * mult);
}

// ==================== 关卡配置 ====================

export const LEVEL_CONFIGS = [
  { level: 1, targetScore: 200, timeLimit: 45, stoneCount: 10, name: '初入矿场' },
  { level: 2, targetScore: 400, timeLimit: 40, stoneCount: 12, name: '深入矿洞' },
  { level: 3, targetScore: 700, timeLimit: 38, stoneCount: 14, name: '老矿工道' },
  { level: 4, targetScore: 1000, timeLimit: 35, stoneCount: 16, name: '翡翠秘道' },
  { level: 5, targetScore: 1500, timeLimit: 32, stoneCount: 18, name: '帝王矿脉' },
];

// ==================== 游戏常量 ====================

export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  CLAB_ORIGIN_X: 400,
  CLAB_ORIGIN_Y: 80,
  CLAB_LENGTH: 50,
  CLAB_SWING_SPEED: 0.015,
  CLAB_SWING_RANGE: 1.4,
  CLAB_EXTEND_SPEED: 5,
  CLAB_MIN_LENGTH: 50,
  CLAB_MAX_LENGTH: 550,
  MINER_Y: 60,
  GROUND_Y: 130,
  ENTRY_FEE: 500,
  INITIAL_MONEY: 500,
};