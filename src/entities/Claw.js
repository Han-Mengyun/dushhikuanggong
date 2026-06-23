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
    this.clawHead.rotation = -this.angle;  // 钩爪本地Y轴与绳子伸出方向一致

    this._drawHookShape(this.clawHead, h);
  }

  /**
   * 根据钩子类型绘制不同形状的钩爪
   * 本地Y轴朝下为钩爪朝向，绘制时整体旋转到绳子方向。
   */
  _drawHookShape(g, h) {
    const s = h.size || 8;
    const c = h.color;
    const dark  = this._darken(c, 0.6);
    const light = this._brighten(c, 1.7);
    const strokeW = Math.max(3, s * 0.34);
    const bodyLen = s * 1.25;
    const armLen = s * 1.55;
    const spread = s * 1.1;
    const jawLift = s * 0.45;
    const barbSize = s * 0.45;

    const drawPath = (color, width, alpha, offsetX = 0, offsetY = 0) => {
      g.lineStyle(width, color, alpha);

      // 主钩身：从绳子末端沿绳子方向伸出。
      g.beginPath();
      g.moveTo(offsetX, offsetY);
      g.lineTo(offsetX, bodyLen + offsetY);
      g.strokePath();

      // 左弯爪。
      g.beginPath();
      g.moveTo(offsetX, bodyLen + offsetY);
      g.lineTo(-spread * 0.45 + offsetX, bodyLen + armLen * 0.18 + offsetY);
      g.lineTo(-spread + offsetX, bodyLen + armLen * 0.62 + offsetY);
      g.lineTo(-spread * 0.72 + offsetX, bodyLen + armLen + offsetY);
      g.lineTo(-spread * 0.24 + offsetX, bodyLen + armLen - jawLift + offsetY);
      g.strokePath();

      // 右弯爪。
      g.beginPath();
      g.moveTo(offsetX, bodyLen + offsetY);
      g.lineTo(spread * 0.45 + offsetX, bodyLen + armLen * 0.18 + offsetY);
      g.lineTo(spread + offsetX, bodyLen + armLen * 0.62 + offsetY);
      g.lineTo(spread * 0.72 + offsetX, bodyLen + armLen + offsetY);
      g.lineTo(spread * 0.24 + offsetX, bodyLen + armLen - jawLift + offsetY);
      g.strokePath();
    };

    drawPath(0x000000, strokeW + 3, 0.22, 1, 1);
    drawPath(dark, strokeW + 2, 1);
    drawPath(c, strokeW, 1);

    // 顶部绳环和钩身关节，让绳子与钩爪衔接自然。
    g.fillStyle(dark, 1);
    g.fillCircle(0, 0, strokeW * 0.9);
    g.fillCircle(0, bodyLen, strokeW * 0.9);
    g.fillStyle(c, 1);
    g.fillCircle(0, 0, strokeW * 0.62);
    g.fillCircle(0, bodyLen, strokeW * 0.62);
    g.fillStyle(light, 0.55);
    g.fillCircle(-strokeW * 0.18, -strokeW * 0.18, strokeW * 0.22);

    // 爪尖朝内，能一眼看出是抓取用的双爪钩。
    g.fillStyle(dark, 1);
    g.fillTriangle(
      -spread * 0.24, bodyLen + armLen - jawLift,
      -spread * 0.24 - barbSize, bodyLen + armLen - jawLift * 0.25,
      -spread * 0.24 + barbSize * 0.2, bodyLen + armLen - jawLift * 0.05,
    );
    g.fillTriangle(
      spread * 0.24, bodyLen + armLen - jawLift,
      spread * 0.24 + barbSize, bodyLen + armLen - jawLift * 0.25,
      spread * 0.24 - barbSize * 0.2, bodyLen + armLen - jawLift * 0.05,
    );

    if (h.key === 'diamondHook' || h.key === 'alloyHook') {
      g.lineStyle(1, light, 0.72);
      g.beginPath();
      g.moveTo(-strokeW * 0.35, strokeW * 0.25);
      g.lineTo(-strokeW * 0.35, bodyLen + armLen * 0.45);
      g.strokePath();
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
