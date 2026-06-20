/**
 * 原石随机生成系统
 */
import { STONE_TYPES, GAME_CONFIG } from '../data/stoneData.js';

export class StoneGenerator {
  /**
   * 根据关卡配置生成一批原石数据
   * @param {number} count - 原石数量
   * @param {number} level - 当前关卡
   * @returns {Array} 原石数据数组
   */
  static generate(count, level) {
    const stones = [];
    const stoneTypeList = Object.values(STONE_TYPES);

    // 计算稀有原石的权重修正（关卡越高稀有石越多）
    const rarityBonus = Math.min(level * 0.02, 0.1);

    for (let i = 0; i < count; i++) {
      // 按稀有度加权随机选择原石类型
      const roll = Math.random();
      let cumulative = 0;
      let selectedType = stoneTypeList[0];

      // 构建权重
      const weights = stoneTypeList.map(type => {
        let w = type.rarity;
        // 高关卡提升稀有原石出现率
        if (type.goodRate >= 0.5) {
          w += rarityBonus;
        }
        return w;
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      for (let j = 0; j < stoneTypeList.length; j++) {
        cumulative += weights[j] / totalWeight;
        if (roll <= cumulative) {
          selectedType = stoneTypeList[j];
          break;
        }
      }

      // 随机位置（在地面以下区域）
      const margin = 50;
      const x = margin + Math.random() * (GAME_CONFIG.WIDTH - margin * 2);
      const y = GAME_CONFIG.GROUND_Y + 40 + Math.random() * (GAME_CONFIG.HEIGHT - GAME_CONFIG.GROUND_Y - 80);

      stones.push({
        type: selectedType,
        x,
        y,
        id: `stone_${level}_${i}`,
      });
    }

    // 防止原石重叠，简单散开
    StoneGenerator.spreadStones(stones);

    return stones;
  }

  /**
   * 简单的原石防重叠散开
   */
  static spreadStones(stones) {
    const minDist = 60;
    for (let i = 0; i < stones.length; i++) {
      for (let j = i + 1; j < stones.length; j++) {
        const dx = stones[j].x - stones[i].x;
        const dy = stones[j].y - stones[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          const angle = Math.atan2(dy, dx);
          const push = (minDist - dist) / 2 + 5;
          stones[i].x -= Math.cos(angle) * push;
          stones[i].y -= Math.sin(angle) * push;
          stones[j].x += Math.cos(angle) * push;
          stones[j].y += Math.sin(angle) * push;
        }
      }
      // 边界约束
      stones[i].x = Math.max(50, Math.min(GAME_CONFIG.WIDTH - 50, stones[i].x));
      stones[i].y = Math.max(GAME_CONFIG.GROUND_Y + 40, Math.min(GAME_CONFIG.HEIGHT - 40, stones[i].y));
    }
  }
}
