/**
 * 不规则石头形状生成器
 * 用多边形+随机扰动生成奇形怪状的石头轮廓
 */

export class StoneShape {
  /**
   * 生成不规则石头轮廓点
   * @param {number} cx - 中心x
   * @param {number} cy - 中心y
   * @param {number} baseRadius - 基础半径
   * @param {number} seed - 随机种子（同种子生成同样形状）
   * @param {number} irregularity - 不规则度 0~1, 越大越不规则
   * @returns {Array<{x:number, y:number}>} 轮廓顶点数组
   */
  static generate(cx, cy, baseRadius, seed, irregularity = 0.4) {
    const rng = StoneShape._seededRandom(seed);
    const points = [];
    const numVertices = 8 + Math.floor(rng() * 5); // 8~12个顶点

    for (let i = 0; i < numVertices; i++) {
      const angle = (Math.PI * 2 * i) / numVertices;
      // 随机扰动半径
      const radiusVariation = 1 + (rng() - 0.5) * 2 * irregularity;
      const r = baseRadius * Math.max(0.5, radiusVariation);
      // 随机扰动角度
      const angleVariation = (rng() - 0.5) * 0.3 * irregularity;

      points.push({
        x: cx + Math.cos(angle + angleVariation) * r,
        y: cy + Math.sin(angle + angleVariation) * r,
      });
    }

    return points;
  }

  /**
   * 生成更细致的石头轮廓（带中间插值点，用于大石头展示）
   */
  static generateDetailed(cx, cy, baseRadius, seed, irregularity = 0.45) {
    const rng = StoneShape._seededRandom(seed);
    const basePoints = [];
    const numVertices = 10 + Math.floor(rng() * 4); // 10~14个主顶点

    for (let i = 0; i < numVertices; i++) {
      const angle = (Math.PI * 2 * i) / numVertices;
      const radiusVariation = 1 + (rng() - 0.5) * 2 * irregularity;
      const r = baseRadius * Math.max(0.55, radiusVariation);
      const angleVariation = (rng() - 0.5) * 0.25 * irregularity;

      basePoints.push({
        x: cx + Math.cos(angle + angleVariation) * r,
        y: cy + Math.sin(angle + angleVariation) * r,
      });
    }

    // 在每两个主顶点之间插入1~2个微扰点
    const detailedPoints = [];
    for (let i = 0; i < basePoints.length; i++) {
      const curr = basePoints[i];
      const next = basePoints[(i + 1) % basePoints.length];
      detailedPoints.push(curr);

      // 插入1个中间点
      const midX = (curr.x + next.x) / 2 + (rng() - 0.5) * baseRadius * 0.15;
      const midY = (curr.y + next.y) / 2 + (rng() - 0.5) * baseRadius * 0.15;
      detailedPoints.push({ x: midX, y: midY });
    }

    return detailedPoints;
  }

  /**
   * 根据打磨进度裁剪石头轮廓
   * @param {Array} points - 原始轮廓点
   * @param {number} progress - 打磨进度 0~1
   * @param {number} cx - 中心x
   * @param {number} cy - 中心y
   * @returns {Array} 裁剪后的轮廓点
   */
  static carveByProgress(points, progress, cx, cy) {
    // 打磨使石头逐渐变圆润、变小
    if (progress <= 0) return points;

    return points.map(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // 打磨越深，半径越接近基础值（越圆润）
      const shrink = 1 - progress * 0.3; // 最多缩小30%
      const roundFactor = progress * 0.6; // 逐渐变圆

      // 原始偏移量
      const baseDist = dist * shrink;
      // 圆的平均半径
      const avgDist = points.reduce((sum, pt) => {
        return sum + Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
      }, 0) / points.length * shrink;

      // 插值：越打磨越接近圆形
      const newDist = baseDist * (1 - roundFactor) + avgDist * roundFactor;

      return {
        x: cx + Math.cos(angle) * newDist,
        y: cy + Math.sin(angle) * newDist,
      };
    });
  }

  /**
   * 在Graphics上绘制不规则多边形
   * @param {Phaser.GameObjects.Graphics} g - 图形对象
   * @param {Array} points - 轮廓点
   * @param {number} fillColor - 填充颜色
   * @param {number} fillAlpha - 填充透明度
   * @param {number} [strokeColor] - 边框颜色
   * @param {number} [strokeWidth] - 边框宽度
   */
  static drawPolygon(g, points, fillColor, fillAlpha = 1, strokeColor, strokeWidth = 2) {
    if (points.length < 3) return;

    g.fillStyle(fillColor, fillAlpha);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();

    if (strokeColor !== undefined) {
      g.lineStyle(strokeWidth, strokeColor, 0.5);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        g.lineTo(points[i].x, points[i].y);
      }
      g.closePath();
      g.strokePath();
    }
  }

  /**
   * 绘制石头纹理（斑点、纹理线）
   */
  static drawStoneTexture(g, points, cx, cy, baseRadius, seed, color, highlight) {
    const rng = StoneShape._seededRandom(seed + 100);

    // 斑点纹理
    g.fillStyle(highlight, 0.4);
    for (let i = 0; i < 4; i++) {
      const px = cx + (rng() - 0.5) * baseRadius * 0.8;
      const py = cy + (rng() - 0.5) * baseRadius * 0.8;
      const r = 3 + rng() * 6;
      // 检查是否在石头内（简单距离检查）
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (dist < baseRadius * 0.7) {
        g.fillCircle(px, py, r);
      }
    }

    // 高光
    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(cx - baseRadius * 0.2, cy - baseRadius * 0.2, baseRadius * 0.25);
  }

  /**
   * 简易种子随机数生成器
   */
  static _seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
