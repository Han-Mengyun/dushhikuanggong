/**
 * 钩爪实体 - 控制摆动、发射、抓取、拉回逻辑
 *
 * 摆动采用正弦钟摆曲线（两端慢、中间快），更接近真实物理
 * 不同钩子：伸出速度/摆动速度/摆动范围/外形 均不同
 */
import { Math as PhaserMath } from 'phaser';
import { GAME_CONFIG, HOOK_TYPES, calcPullSpeed } from '../data/stoneData.js';

export const CLAW_STATE = {
  SWINGING:  'swinging',
  EXTENDING: 'extending',
  PULLING:   'pulling',
  GRABBED:   'grabbed',
};

export class Claw {
  constructor(scene, hookType) {
    this.scene   = scene;
    this.hookType = hookType || HOOK_TYPES.rustHook;

    this.originX = GAME_CONFIG.CLAB_ORIGIN_X;
    this.originY = GAME_CONFIG.CLAB_ORIGIN_Y;

    // 摆动使用正弦相位（0 → 2π 一个完整周期）
    // angle = swingRange * sin(phase)
    this._swingPhase   = 0;
    this._swingDir     = 1;   // 相位推进方向
    this.angle         = 0;   // 当前实际弧度（−range ~ +range）

    this.length  = GAME_CONFIG.CLAB_MIN_LENGTH;
    this.state   = CLAW_STATE.SWINGING;
    this.grabbedStone       = null;
    this._currentPullSpeed  = 0;

    // 钩爪绘图对象
    this.ropeGraphics = null;
    this.clawHead     = null;

    this._build();
  }

  _build() {
    this.ropeGraphics = this.scene.add.graphics();
    this.clawHead     = this.scene.add.graphics();
    this._draw();
  }

  getTipPosition() {
    return {
      x: this.originX + Math.sin(this.angle) * this.length,
      y: this.originY + Math.cos(this.angle) * this.length,
    };
  }

  update(delta) {
    switch (this.state) {
      case CLAW_STATE.SWINGING:  this._updateSwing();   break;
      case CLAW_STATE.EXTENDING: this._updateExtend();  break;
      case CLAW_STATE.PULLING:
      case CLAW_STATE.GRABBED:   this._updatePull();    break;
    }
    this._draw();
  }

  // ==================== 摆动（正弦钟摆） ====================

  _updateSwing() {
    const h = this.hookType;
    const swingSpeed = h.swingSpeed || GAME_CONFIG.CLAB_SWING_SPEED;
    const swingRange = h.swingRange || GAME_CONFIG.CLAB_SWING_RANGE;

    // 推进相位
    this._swingPhase += swingSpeed * this._swingDir;

    // 相位到达半周期端点时反向
    if (this._swingPhase >= Math.PI / 2) {
      this._swingPhase = Math.PI / 2;
      this._swingDir   = -1;
    } else if (this._swingPhase <= -Math.PI / 2) {
      this._swingPhase = -Math.PI / 2;
      this._swingDir   = 1;
    }

    // 正弦映射：两端慢（cos ≈ 0），中间快（cos = 1）
    // angle = range × sin(phase)
    this.angle = swingRange * Math.sin(this._swingPhase);
  }

  // ==================== 伸出 ====================

  _updateExtend() {
    this.length += this.hookType.extendSpeed;
    const tip = this.getTipPosition();

    // 碰撞检测
    const stones = this.scene.stoneSprites;
    for (const stone of stones) {
      if (stone.isCollected || stone.isGrabbed) continue;
      const dist = PhaserMath.Distance.Between(tip.x, tip.y, stone.x, stone.y);
      if (dist < stone.stoneSize * 1.1) {
        this.grabbedStone = stone;
        this.state        = CLAW_STATE.GRABBED;
        stone.isGrabbed   = true;
        this._currentPullSpeed = calcPullSpeed(stone.stoneType, this.hookType);
        this._showWeightHint(stone);
        return;
      }
    }

    // 超出边界回收
    const maxLen = GAME_CONFIG.CLAB_MAX_LENGTH;
    if (this.length >= maxLen || tip.x < 0 || tip.x > GAME_CONFIG.WIDTH || tip.y > GAME_CONFIG.HEIGHT) {
      this.state = CLAW_STATE.PULLING;
      this._currentPullSpeed = this.hookType.extendSpeed * 1.6;
    }
  }

  // ==================== 拉回 ====================

  _updatePull() {
    const pullSpeed = this._currentPullSpeed || this.hookType.extendSpeed * 1.6;
    this.length -= pullSpeed;

    if (this.grabbedStone) {
      const tip = this.getTipPosition();
      this.grabbedStone.x = tip.x;
      this.grabbedStone.y = tip.y;
    }

    if (this.length <= GAME_CONFIG.CLAB_MIN_LENGTH) {
      this.length = GAME_CONFIG.CLAB_MIN_LENGTH;
      if (this.grabbedStone) {
        this.scene.collectStone(this.grabbedStone);
        this.grabbedStone = null;
      }
      this.state = CLAW_STATE.SWINGING;
      this._currentPullSpeed = 0;
    }
  }

  // ==================== 辅助 ====================

  _showWeightHint(stone) {
    const mass = stone.stoneType.density * stone.stoneType.volume;
    const text = mass > 1.5 ? '重! 速度↓' : mass > 1.0 ? '有点重' : '轻巧';
    const color = mass > 1.5 ? '#ff4444' : mass > 1.0 ? '#ffaa44' : '#66ff66';

    const t = this.scene.add.text(stone.x, stone.y - 30, text, {
      fontSize: '12px', fontFamily: 'Arial', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: t, y: t.y - 30, alpha: 0,
      duration: 1200, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  fire() {
    if (this.state !== CLAW_STATE.SWINGING) return;
    this.state = CLAW_STATE.EXTENDING;
  }

  // ==================== 绘制 ====================

  _draw() {
    const tip = this.getTipPosition();
    const ox  = this.originX;
    const oy  = this.originY;
    const h   = this.hookType;

    // ---------- 绳索 ----------
    this.ropeGraphics.clear();

    // 绳索阴影（粗一点的黑色在下面）
    this.ropeGraphics.lineStyle(3, 0x000000, 0.2);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(ox + 1, oy + 1);
    this.ropeGraphics.lineTo(tip.x + 1, tip.y + 1);
    this.ropeGraphics.strokePath();

    // 绳索主体 - 与钩爪连成一条直线
    this.ropeGraphics.lineStyle(3, h.ropeColor, 1);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(ox, oy);
    this.ropeGraphics.lineTo(tip.x, tip.y);
    this.ropeGraphics.strokePath();

    // ---------- 钩爪头 ----------
    this.clawHead.clear();
    this.clawHead.x        = tip.x;
    this.clawHead.y        = tip.y;
    this.clawHead.rotation = this.angle;   // 钩爪始终朝向伸出方向（与绳子同向）

    this._drawHookShape(this.clawHead, h);
  }

  /**
   * 根据钩子类型绘制不同形状的钩爪
   * 全部简化为沿绳子方向的直线造型，钩爪与绳子呈一条直线
   */
  _drawHookShape(g, h) {
    const s = h.size || 8;
    const c = h.color;
    const dark  = this._darken(c, 0.6);
    const light = this._brighten(c, 1.7);
    const half = s * 0.35;

    // 所有钩子统一结构：绳头连接块 + 沿Y轴方向的钩齿
    // 钩齿朝下（Y正方向），与绳子伸出方向一致

    // ---- 连接块（绳子末端的小接头） ----
    g.fillStyle(dark, 1);
    g.fillRect(-half, -s * 0.15, half * 2, s * 0.3);
    g.fillStyle(c, 1);
    g.fillRect(-half * 0.8, -s * 0.1, half * 1.6, s * 0.2);

    switch (h.key) {
      // ---- 铁锈钩：2根短齿 ----
      case 'rustHook': {
        const toothLen = s * 0.9;
        const toothW = half * 0.7;
        // 左齿
        g.fillStyle(dark, 1);
        g.fillRect(-half * 1.1, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(-half, 0, toothW * 0.8, toothLen * 0.9);
        // 右齿
        g.fillStyle(dark, 1);
        g.fillRect(half * 0.4, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(half * 0.5, 0, toothW * 0.8, toothLen * 0.9);
        break;
      }

      // ---- 精钢钩：2根中等长度齿 ----
      case 'steelHook': {
        const toothLen = s * 1.2;
        const toothW = half * 0.6;
        // 左齿
        g.fillStyle(dark, 1);
        g.fillRect(-half * 1.0, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(-half * 0.9, 0, toothW * 0.8, toothLen * 0.9);
        // 右齿
        g.fillStyle(dark, 1);
        g.fillRect(half * 0.4, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(half * 0.5, 0, toothW * 0.8, toothLen * 0.9);
        // 高光
        g.fillStyle(light, 0.5);
        g.fillCircle(0, toothLen * 0.3, half * 0.3);
        break;
      }

      // ---- 合金钩：3根长齿，流线型 ----
      case 'alloyHook': {
        const toothLen = s * 1.4;
        const toothW = half * 0.5;
        // 左齿
        g.fillStyle(dark, 1);
        g.fillRect(-half * 1.2, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(-half * 1.1, 0, toothW * 0.8, toothLen * 0.9);
        // 中齿
        g.fillStyle(dark, 1);
        g.fillRect(-toothW * 0.5, 0, toothW, toothLen * 1.1);
        g.fillStyle(c, 1);
        g.fillRect(-toothW * 0.4, 0, toothW * 0.8, toothLen * 1.0);
        // 右齿
        g.fillStyle(dark, 1);
        g.fillRect(half * 0.7, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(half * 0.8, 0, toothW * 0.8, toothLen * 0.9);
        // 高光线
        g.lineStyle(1, light, 0.5);
        g.beginPath(); g.moveTo(0, -half); g.lineTo(0, toothLen * 0.8); g.strokePath();
        break;
      }

      // ---- 钻石钩：3根长齿，带倒刺 ----
      case 'diamondHook': {
        const toothLen = s * 1.6;
        const toothW = half * 0.5;
        // 左齿（带倒刺）
        g.fillStyle(dark, 1);
        g.fillRect(-half * 1.3, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(-half * 1.2, 0, toothW * 0.8, toothLen * 0.9);
        // 倒刺
        g.fillStyle(c, 1);
        g.fillTriangle(-half * 1.3, toothLen * 0.5, -half * 1.7, toothLen * 0.5, -half * 1.3, toothLen * 0.7);
        // 中齿
        g.fillStyle(dark, 1);
        g.fillRect(-toothW * 0.5, 0, toothW, toothLen * 1.2);
        g.fillStyle(c, 1);
        g.fillRect(-toothW * 0.4, 0, toothW * 0.8, toothLen * 1.1);
        // 右齿（带倒刺）
        g.fillStyle(dark, 1);
        g.fillRect(half * 0.8, 0, toothW, toothLen);
        g.fillStyle(c, 1);
        g.fillRect(half * 0.9, 0, toothW * 0.8, toothLen * 0.9);
        // 倒刺
        g.fillStyle(c, 1);
        g.fillTriangle(half * 1.0, toothLen * 0.5, half * 1.4, toothLen * 0.5, half * 1.0, toothLen * 0.7);
        // 高光
        g.fillStyle(light, 0.6);
        g.fillCircle(0, 0, half * 0.5);
        break;
      }

      // 默认：2根简单齿
      default: {
        const toothLen = s * 1.0;
        const toothW = half * 0.6;
        g.fillStyle(c, 1);
        g.fillRect(-half * 1.0, 0, toothW, toothLen);
        g.fillRect(half * 0.4, 0, toothW, toothLen);
      }
    }
  }

  // ==================== 颜色工具 ====================

  _brighten(hex, factor) {
    const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * factor));
    const g = Math.min(255, Math.round(((hex >> 8)  & 0xff) * factor));
    const b = Math.min(255, Math.round((hex         & 0xff) * factor));
    return (r << 16) | (g << 8) | b;
  }

  _darken(hex, factor) { return this._brighten(hex, factor); }

  // ==================== 公共 ====================

  reset() {
    this.length         = GAME_CONFIG.CLAB_MIN_LENGTH;
    this._swingPhase    = 0;
    this._swingDir      = 1;
    this.angle          = 0;
    this.state          = CLAW_STATE.SWINGING;
    this.grabbedStone   = null;
    this._currentPullSpeed = 0;
    this._draw();
  }

  destroy() {
    this.ropeGraphics.destroy();
    this.clawHead.destroy();
  }
}
