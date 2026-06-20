/**
 * 赌石判定系统 - 支持逐层切剥
 * 大部分石头都有料（70%+），只是料的品质不同
 * 每块石头分3层：外皮 → 过渡层 → 内核
 */

import { GEM_TYPES } from '../data/stoneData.js';

// 切剥层级
export const CUT_LAYERS = {
  OUTER: 0,   // 外皮 - 灰暗粗糙
  MIDDLE: 1,  // 过渡层 - 开始显色
  INNER: 2,   // 内核 - 揭示真相
};

// 每层切剥需要的点击次数
export const LAYER_CLICKS = [3, 3, 2]; // 外皮3下, 过渡层3下, 内核2下

// 每层揭示时的线索颜色
export const LAYER_COLORS = {
  [CUT_LAYERS.OUTER]: 0x666666,   // 灰暗
  [CUT_LAYERS.MIDDLE]: 0x887766,  // 微微显色
  [CUT_LAYERS.INNER]: null,        // 由gemResult决定
};

// 过渡层线索：根据内核品质给出不同暗示
export const MIDDLE_HINTS = {
  bad: [0x887766, 0x776655, 0x998877],       // 暗淡色
  medium: [0x996644, 0xaa7755, 0xbb8866],    // 微微有色
  good: [0x559966, 0x44aa77, 0x88bb66],       // 绿意浮现
  great: [0x33bb66, 0x22cc55, 0x44dd88],     // 浓郁绿光
};

export class CutSystem {
  /**
   * 判定原石结果 - 大部分石头都有料
   * @param {Object} stoneType - 原石类型数据
   * @returns {Object} { gemResult, layers, middleHint }
   */
  static judge(stoneType) {
    const goodRate = stoneType.goodRate;

    // 判定是否有好料（大部分都有料，只是品质不同）
    const roll = Math.random();
    let gemResult;
    let quality; // bad, medium, good, great

    if (roll <= goodRate) {
      // 出好料！
      gemResult = CutSystem.randomGoodGem();
      quality = gemResult.value >= 500 ? 'great' : 'good';
    } else if (roll <= goodRate + 0.35) {
      // 普通料 - 大部分石头至少有普通料
      gemResult = CutSystem.randomMediumGem();
      quality = 'medium';
    } else {
      // 真正的废料（概率很低）
      gemResult = CutSystem.randomBadGem();
      quality = 'bad';
    }

    // 生成过渡层暗示
    const hintColors = MIDDLE_HINTS[quality];
    const middleHint = hintColors[Math.floor(Math.random() * hintColors.length)];

    // 生成每层的视觉数据
    const layers = CutSystem.generateLayers(stoneType, quality, middleHint);

    return {
      gemResult,
      quality,
      middleHint,
      layers,
    };
  }

  /**
   * 生成每层的视觉数据
   */
  static generateLayers(stoneType, quality, middleHint) {
    const outerColor = stoneType.color;
    const innerColor = (() => {
      switch (quality) {
        case 'great': return 0x22aa55;
        case 'good': return 0x55aa77;
        case 'medium': return 0xaa8866;
        case 'bad': return 0x665555;
        default: return 0x666666;
      }
    })();

    return {
      [CUT_LAYERS.OUTER]: {
        color: outerColor,
        highlight: stoneType.highlight,
        cracks: CutSystem._generateCracks(3, 'outer'),
        description: '外皮粗糙，看不出什么...',
      },
      [CUT_LAYERS.MIDDLE]: {
        color: middleHint,
        highlight: stoneType.highlight,
        cracks: CutSystem._generateCracks(4, 'middle'),
        description: quality === 'bad'
          ? '颜色暗淡，感觉不妙...'
          : quality === 'medium'
            ? '隐约有些色根...'
            : quality === 'good'
              ? '有绿意浮现！有戏！'
              : '浓郁绿光透出！！是好料！！',
      },
      [CUT_LAYERS.INNER]: {
        color: innerColor,
        highlight: 0xffffff,
        cracks: [],
        description: null, // 最终揭示时用 gemResult 的描述
      },
    };
  }

  /**
   * 生成裂纹数据
   */
  static _generateCracks(count, layer) {
    const cracks = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const length = 15 + Math.random() * 25;
      const width = layer === 'outer' ? 1.5 : 1;
      cracks.push({ angle, length, width });
    }
    return cracks;
  }

  /**
   * 随机好宝石
   */
  static randomGoodGem() {
    const goodGems = [
      { gem: GEM_TYPES.manao, weight: 35 },
      { gem: GEM_TYPES.hetianyu, weight: 30 },
      { gem: GEM_TYPES.feicui, weight: 25 },
      { gem: GEM_TYPES.diwanglv, weight: 10 },
    ];
    return CutSystem.weightedPick(goodGems);
  }

  /**
   * 随机普通料（大部分石头至少有这个）
   */
  static randomMediumGem() {
    const mediumGems = [
      { gem: GEM_TYPES.putongliao, weight: 50 },
      { gem: GEM_TYPES.manao, weight: 35 },
      { gem: GEM_TYPES.hetianyu, weight: 15 },
    ];
    return CutSystem.weightedPick(mediumGems);
  }

  /**
   * 随机废料（概率低）
   */
  static randomBadGem() {
    const badGems = [
      { gem: GEM_TYPES.feishi, weight: 80 },
      { gem: GEM_TYPES.putongliao, weight: 20 },
    ];
    return CutSystem.weightedPick(badGems);
  }

  /**
   * 加权随机选择
   */
  static weightedPick(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.gem;
    }
    return items[items.length - 1].gem;
  }

  /**
   * 批量判定一组原石
   * @param {Array} stones - 原石数组
   * @returns {Array} 带 cutResult 的原石数组
   */
  static judgeAll(stones) {
    return stones.map(stone => ({
      ...stone,
      cutResult: CutSystem.judge(stone.type),
    }));
  }
}
