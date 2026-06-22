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

  // ==================== 3D 网格与渲染工具 ====================

  /**
   * 从2D轮廓生成3D石头网格（顶点 + 面）
   * 结构：前盖 + 多层环带侧面 + 后盖，模拟椭球体深度
   */
  static generate3DMesh(outlinePoints, R) {
    const N = outlinePoints.length;
    const LAYERS = 7;
    const vertices = [];
    const faces = [];

    // 辅助：计算角度对应的轮廓半径（射线-多边形交点）
    const radii = outlinePoints.map(p => Math.hypot(p.x, p.y));
    const angles = outlinePoints.map(p => Math.atan2(p.y, p.x));

    function radiusAtAngle(theta) {
      let best = R;
      for (let j = 0; j < N; j++) {
        const k = (j + 1) % N;
        let a1 = angles[j], a2 = angles[k];
        let t = theta;
        // 规范化角度差
        let d1 = ((a2 - a1) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        let d0 = ((t - a1) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        if (d1 === 0) continue;
        const f = d0 / d1;
        if (f >= -0.01 && f <= 1.01) {
          const r = radii[j] * (1 - f) + radii[k] * f;
          best = Math.min(best, r);
        }
      }
      return best;
    }

    // 生成层环顶点
    const rings = [];
    for (let layer = 0; layer <= LAYERS; layer++) {
      const phi = (Math.PI * layer) / LAYERS; // 0(前) → π(后)
      const zFactor = Math.cos(phi);
      const shrink = Math.sin(phi); // 赤道=1，极点=0
      const ring = [];
      for (let i = 0; i < N; i++) {
        const baseR = radii[i];
        const r = baseR * Math.max(0.08, shrink);
        ring.push({
          x: outlinePoints[i].x * Math.max(0.08, shrink),
          y: outlinePoints[i].y * Math.max(0.08, shrink),
          z: R * zFactor * 0.55,
        });
      }
      rings.push(ring);
    }

    // 前极点
    const frontCenterIdx = vertices.length;
    vertices.push({ x: 0, y: 0, z: R * 0.55 });

    // 添加所有环顶点
    for (const ring of rings) {
      const baseIdx = vertices.length;
      for (const v of ring) {
        vertices.push({ x: v.x, y: v.y, z: v.z });
      }
    }

    // 前盖扇面（法线朝 +Z）
    const r0Base = 1; // 第0环的顶点起始索引
    for (let i = 0; i < N; i++) {
      faces.push({
        vi: [frontCenterIdx, r0Base + i, r0Base + (i + 1) % N],
        type: 'front', color: 0x888888,
      });
    }

    // 侧面环带
    for (let layer = 0; layer < LAYERS; layer++) {
      const aBase = 1 + layer * N;
      const bBase = 1 + (layer + 1) * N;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        faces.push({
          vi: [aBase + i, aBase + j, bBase + j, bBase + i],
          type: 'side', color: 0x888888,
        });
      }
    }

    // 后盖扇面（法线朝 -Z）
    const rLastBase = 1 + LAYERS * N;
    const backCenterIdx = vertices.length;
    vertices.push({ x: 0, y: 0, z: -R * 0.55 });

    for (let i = 0; i < N; i++) {
      faces.push({
        vi: [backCenterIdx, rLastBase + (i + 1) % N, rLastBase + i],
        type: 'back', color: 0x555555,
      });
    }

    return { vertices, faces };
  }

  /** 3D点旋转（先X后Y） */
  static rotate3D(p, rx, ry) {
    const cx1 = Math.cos(rx), sx1 = Math.sin(rx);
    const y1 = p.y * cx1 - p.z * sx1;
    const z1 = p.y * sx1 + p.z * cx1;
    const cy2 = Math.cos(ry), sy2 = Math.sin(ry);
    return {
      x: p.x * cy2 + z1 * sy2,
      y: y1,
      z: -p.x * sy2 + z1 * cy2,
    };
  }

  /** 透视投影 */
  static project3D(p, scale = 1, focal = 500) {
    const f = focal / (focal + p.z);
    return { x: p.x * f * scale, y: p.y * f * scale, z: p.z };
  }

  /** 计算面法线（用于光照和背面剔除） */
  static faceNormal(p0, p1, p2) {
    const ax = p1.x - p0.x, ay = p1.y - p0.y, az = p1.z - p0.z;
    const bx = p2.x - p0.x, by = p2.y - p0.y, bz = p2.z - p0.z;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  }
}
