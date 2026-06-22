/**
 * 赌石切石场景 - 多次自选切面 + 切面展示 + 首饰/摆件选择
 * 石头放大横截面展示，玩家可多次切割，每次切开展示切面
 * 玩家选择保留哪一半继续切，最终取含玉肉最多的块
 */
import { Scene } from 'phaser';
import { GAME_CONFIG, GEM_TYPES, CRAFT_TYPES, calcCraftValue, checkBuyerAppears } from '../data/stoneData.js';
import { CutSystem, CUT_LAYERS } from '../systems/CutSystem.js';
import { StoneShape } from '../systems/StoneShape.js';

const STATE = {
  SELECT: 'select',       // 选择石头
  DRAW_LINE: 'drawLine',  // 画切割线
  CUTTING: 'cutting',     // 切开动画
  CHOOSE_HALF: 'chooseHalf', // 选择保留哪一半
  CRAFT: 'craft',         // 选择首饰/摆件
  ALL_DONE: 'done',
};

const SECTION_RADIUS = 130;

export class CutScene extends Scene {
  constructor() {
    super({ key: 'CutScene' });
  }

  init(data) {
    this.collectedStones = data.collectedStones || [];
    this.level = data.level || 1;
    this.totalScore = data.totalScore || 0;
    this.levelConfig = data.levelConfig;
    this.ownedHooks = data.ownedHooks || ['rustHook'];
    this.selectedHook = data.selectedHook || 'rustHook';
    this.state = STATE.SELECT;
    this.currentStoneIndex = 0;
    this.levelScore = 0;
    this.craftChoices = {};
    this.stoneCutResults = {};

    // 切割线
    this.cutLineStart = null;
    this.cutLineEnd = null;
    this.isDrawingLine = false;

    // 截面数据
    this.sectionData = {};

    // 当前石头的切割状态
    this.currentPiece = null;   // 当前正在切的块 { points, centerX, centerY, radius }
    this.cutCount = 0;          // 当前石头已切次数
    this.bestPrecision = 0;     // 最佳精度

    // 3D旋转状态
    this._rotX = 0;
    this._rotY = 0;
    this._velX = 0;
    this._velY = 0;
    this._isDragging3D = false;
    this._lastDragX = 0;
    this._lastDragY = 0;
    this._autoRotSpeed = 0.004;
    this._stoneMesh = null;
    this._viewMode = 'cut';    // 'cut' 切石模式 | 'view' 观赏模式
    this._lastInteractTime = 0;
  }

  create() {
    this.cutResults = CutSystem.judgeAll(this.collectedStones);

    for (let i = 0; i < this.collectedStones.length; i++) {
      this.craftChoices[i] = null;
      this.stoneCutResults[i] = null;
      this.sectionData[i] = this._generateSectionData(this.cutResults[i].cutResult, i);
    }

    this._drawBackground();

    this.add.text(GAME_CONFIG.WIDTH / 2, 25, '赌 石 时 刻', {
      fontSize: '28px', fontFamily: 'Arial', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.scoreText = this.add.text(GAME_CONFIG.WIDTH / 2, 60, '本关收益: 0', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5);

    this._drawStoneList();

    const areaX = GAME_CONFIG.WIDTH / 2 + 60;
    const areaY = GAME_CONFIG.HEIGHT / 2 + 5;
    this.cutAreaX = areaX;
    this.cutAreaY = areaY;

    // 横截面图形
    this.sectionGfx = this.add.graphics();
    this.sectionGfx.x = areaX;
    this.sectionGfx.y = areaY;

    // 切割线图形
    this.cutLineGfx = this.add.graphics();

    // 切面展示图形（两半 + 切面）
    this.halfLeftGfx = this.add.graphics();
    this.halfRightGfx = this.add.graphics();

    // 3D石头渲染
    this.stone3dGfx = this.add.graphics();
    this.stone3dGfx.x = areaX;
    this.stone3dGfx.y = areaY;
    this.stone3dGfx.setVisible(false);

    // 模式切换按钮（切石/观赏）
    this.modeBtn = this.add.text(areaX + SECTION_RADIUS + 15, areaY - SECTION_RADIUS - 5, '观赏3D', {
      fontSize: '12px', fontFamily: 'Arial', color: '#88aaff',
      backgroundColor: '#22334488', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.modeBtn.on('pointerdown', () => {
      this._viewMode = this._viewMode === 'cut' ? 'view' : 'cut';
      this.modeBtn.setText(this._viewMode === 'cut' ? '观赏3D' : '切石模式');
      this.modeBtn.setStyle({ color: this._viewMode === 'cut' ? '#88aaff' : '#ffaa44' });
      this._updateViewMode();
    });

    // 3D拖拽旋转提示
    this.rotateHint = this.add.text(areaX, areaY + SECTION_RADIUS + 18, '拖拽旋转查看', {
      fontSize: '11px', fontFamily: 'Arial', color: '#6688aa88',
    }).setOrigin(0.5).setVisible(false);

    // 操作提示
    this.actionHint = this.add.text(areaX, areaY + 125, '在石头上拖动画切割线', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff88',
      align: 'center',
    }).setOrigin(0.5);

    this.precisionText = this.add.text(areaX, areaY + 143, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffcc00',
      align: 'center',
    }).setOrigin(0.5);

    // 切割次数提示
    this.cutCountText = this.add.text(areaX, areaY - 125, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#aaaaff',
      align: 'center',
    }).setOrigin(0.5);

    // 结果文字
    this.resultText = this.add.text(areaX, areaY - 105, '', {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setVisible(false);

    this.valueText = this.add.text(areaX, areaY - 80, '', {
      fontSize: '16px', fontFamily: 'Arial', color: '#66ff66',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setVisible(false);

    // 宝石图形
    this.gemGfx = this.add.graphics();
    this.gemGfx.x = areaX;
    this.gemGfx.y = areaY - 30;
    this.gemGfx.setVisible(false);

    // 加工选择面板
    this.craftPanel = this.add.container(areaX, areaY + 40);
    this.craftPanel.setVisible(false);

    // 确认切割按钮
    this.confirmCutBtn = this.add.text(areaX - 60, areaY + 110, '确认切割', {
      fontSize: '16px', fontFamily: 'Arial', color: '#888888',
      backgroundColor: '#33333366', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.confirmCutBtn.on('pointerdown', () => {
      if (this.state === STATE.DRAW_LINE && this.cutLineStart && this.cutLineEnd) {
        this._executeCut();
      }
    });

    // 取料按钮（不再切了，直接取料）
    this.takeBtn = this.add.text(areaX + 60, areaY + 110, '取料', {
      fontSize: '16px', fontFamily: 'Arial', color: '#888888',
      backgroundColor: '#33333366', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.takeBtn.on('pointerdown', () => {
      if (this.state === STATE.DRAW_LINE) {
        this._finishCutting();
      }
    });

    // 选择左半按钮
    this.chooseLeftBtn = this.add.text(areaX - 90, areaY + 110, '保留左边', {
      fontSize: '14px', fontFamily: 'Arial', color: '#66aaff',
      backgroundColor: '#33446688', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.chooseLeftBtn.on('pointerdown', () => {
      if (this.state === STATE.CHOOSE_HALF) this._chooseHalf('left');
    });

    // 选择右半按钮
    this.chooseRightBtn = this.add.text(areaX + 90, areaY + 110, '保留右边', {
      fontSize: '14px', fontFamily: 'Arial', color: '#66aaff',
      backgroundColor: '#33446688', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.chooseRightBtn.on('pointerdown', () => {
      if (this.state === STATE.CHOOSE_HALF) this._chooseHalf('right');
    });

    // 下一块/查看结果按钮
    this.nextStoneBtn = this.add.text(areaX - 50, GAME_CONFIG.HEIGHT - 35, '下一块', {
      fontSize: '18px', fontFamily: 'Arial', color: '#888888',
      backgroundColor: '#33333366', padding: { x: 15, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.nextStoneBtn.on('pointerdown', () => {
      if (this.state === STATE.CRAFT) this._selectNextStone();
    });

    this.finishBtn = this.add.text(areaX + 50, GAME_CONFIG.HEIGHT - 35, '查看结果', {
      fontSize: '18px', fontFamily: 'Arial', color: '#888888',
      backgroundColor: '#33333366', padding: { x: 15, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.finishBtn.on('pointerdown', () => {
      if (this.state === STATE.ALL_DONE) this._goToResult();
    });

    // 画线 / 3D旋转 交互
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x <= 140) return;

      // 观赏模式 → 拖拽旋转
      if (this._viewMode === 'view' && this._stoneMesh) {
        this._isDragging3D = true;
        this._lastDragX = pointer.x;
        this._lastDragY = pointer.y;
        this._velX = 0;
        this._velY = 0;
        this._lastInteractTime = this.time.now;
        return;
      }

      // 切石模式 → 画切割线
      if (this.state === STATE.DRAW_LINE) {
        this.isDrawingLine = true;
        this.cutLineStart = {
          x: pointer.x - this.cutAreaX,
          y: pointer.y - this.cutAreaY,
        };
        this.cutLineEnd = { ...this.cutLineStart };
      }
    });
    this.input.on('pointermove', (pointer) => {
      // 3D旋转拖拽
      if (this._isDragging3D) {
        const dx = pointer.x - this._lastDragX;
        const dy = pointer.y - this._lastDragY;
        this._velY = dx * 0.008;
        this._velX = dy * 0.008;
        this._rotY += this._velY;
        this._rotX += this._velX;
        // 限制X轴旋转范围
        this._rotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this._rotX));
        this._lastDragX = pointer.x;
        this._lastDragY = pointer.y;
        return;
      }

      // 画切割线
      if (this.isDrawingLine && this.state === STATE.DRAW_LINE) {
        this.cutLineEnd = {
          x: pointer.x - this.cutAreaX,
          y: pointer.y - this.cutAreaY,
        };
        this._drawCutLine();
        this._updatePrecisionHint();
      }
    });
    this.input.on('pointerup', () => {
      this._isDragging3D = false;

      if (this.isDrawingLine && this.state === STATE.DRAW_LINE) {
        this.isDrawingLine = false;
        if (this.cutLineStart && this.cutLineEnd) {
          const dist = Math.hypot(
            this.cutLineEnd.x - this.cutLineStart.x,
            this.cutLineEnd.y - this.cutLineStart.y
          );
          if (dist > 15) {
            this.confirmCutBtn.setVisible(true);
            this.confirmCutBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
          } else {
            this.cutLineStart = null;
            this.cutLineEnd = null;
            this.cutLineGfx.clear();
            this.confirmCutBtn.setVisible(false);
          }
        }
      }
    });

    if (this.collectedStones.length === 0) {
      this._showNoStonesMessage();
    } else {
      this._selectStone(0);
    }
  }

  // ==================== 截面数据生成 ====================

  _generateSectionData(cutResult, index) {
    const quality = cutResult.quality;
    const gem = cutResult.gemResult;

    let jadeRadius, jadeOpacity;
    switch (quality) {
      case 'great': jadeRadius = SECTION_RADIUS * 0.55; jadeOpacity = 0.9; break;
      case 'good': jadeRadius = SECTION_RADIUS * 0.45; jadeOpacity = 0.75; break;
      case 'medium': jadeRadius = SECTION_RADIUS * 0.35; jadeOpacity = 0.5; break;
      default: jadeRadius = SECTION_RADIUS * 0.2; jadeOpacity = 0.3; break;
    }

    const rng = StoneShape._seededRandom(index * 251 + 77);
    const jadeOffsetX = (rng() - 0.5) * SECTION_RADIUS * 0.5;
    const jadeOffsetY = (rng() - 0.5) * SECTION_RADIUS * 0.5;

    return {
      jadeCenterX: jadeOffsetX,
      jadeCenterY: jadeOffsetY,
      jadeRadius,
      jadeOpacity,
      jadeColor: gem.color,
      outerColor: cutResult.layers[CUT_LAYERS.OUTER].color,
      middleHint: cutResult.middleHint,
      quality,
      gemResult: gem,
      shapeSeed: index * 137 + 42,
    };
  }

  // ==================== 横截面绘制 ====================

  _drawSection(index, piece) {
    const gfx = this.sectionGfx;
    gfx.clear();

    const data = this.sectionData[index];
    const R = piece ? piece.radius : SECTION_RADIUS;

    // 外皮形状
    const shapePts = StoneShape.generate(0, 0, R, data.shapeSeed, 0.35);
    StoneShape.drawPolygon(gfx, shapePts, data.outerColor, 1, 0x000000, 2);

    // 过渡层
    const innerPts1 = StoneShape.carveByProgress(shapePts, 0.3, 0, 0);
    StoneShape.drawPolygon(gfx, innerPts1, data.middleHint, 0.4);

    // 玉肉暗示（切割前很淡）
    const jx = data.jadeCenterX;
    const jy = data.jadeCenterY;
    const jr = data.jadeRadius;

    for (let ring = 3; ring >= 0; ring--) {
      const ratio = (ring + 1) / 4;
      const ringR = jr * ratio;
      gfx.fillStyle(data.jadeColor, data.jadeOpacity * 0.25);
      gfx.fillCircle(jx, jy, ringR);
    }

    // 表面纹理
    const rng = StoneShape._seededRandom(data.shapeSeed * 33 + 11);
    gfx.lineStyle(1, data.middleHint, 0.4);
    for (let i = 0; i < 6; i++) {
      const sx = (rng() - 0.5) * R * 1.2;
      const sy = (rng() - 0.5) * R * 1.2;
      gfx.beginPath();
      gfx.moveTo(sx, sy);
      gfx.lineTo(sx + (rng() - 0.5) * 30, sy + (rng() - 0.5) * 30);
      gfx.strokePath();
    }

    // 参考圈
    gfx.lineStyle(1, 0xffffff, 0.1);
    gfx.strokeCircle(0, 0, R * 0.3);
    gfx.strokeCircle(0, 0, R * 0.6);
    gfx.strokeCircle(0, 0, R * 0.9);
  }

  // ==================== 切割线绘制 ====================

  _drawCutLine() {
    const gfx = this.cutLineGfx;
    gfx.clear();
    if (!this.cutLineStart || !this.cutLineEnd) return;

    const sx = this.cutLineStart.x + this.cutAreaX;
    const sy = this.cutLineStart.y + this.cutAreaY;
    const ex = this.cutLineEnd.x + this.cutAreaX;
    const ey = this.cutLineEnd.y + this.cutAreaY;

    // 主线
    gfx.lineStyle(3, 0xff4444, 0.9);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(ex, ey);
    gfx.strokePath();

    // 延长虚线
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy);
    if (len > 5) {
      const nx = dx / len;
      const ny = dy / len;
      gfx.lineStyle(1, 0xff4444, 0.4);
      gfx.beginPath(); gfx.moveTo(sx - nx * 200, sy - ny * 200); gfx.lineTo(sx, sy); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(ex, ey); gfx.lineTo(ex + nx * 200, ey + ny * 200); gfx.strokePath();
    }

    // 端点
    gfx.fillStyle(0xff4444, 1);
    gfx.fillCircle(sx, sy, 4);
    gfx.fillCircle(ex, ey, 4);

    // 锯片图标
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    gfx.fillStyle(0xcccccc, 0.8);
    gfx.fillCircle(mx, my - 15, 6);
    gfx.fillStyle(0x888888, 0.8);
    gfx.fillRect(mx - 1, my - 9, 2, 8);
  }

  _updatePrecisionHint() {
    if (!this.cutLineStart || !this.cutLineEnd) return;
    const index = this.currentStoneIndex;
    const data = this.sectionData[index];
    const dist = this._pointLineDistance(
      data.jadeCenterX, data.jadeCenterY,
      this.cutLineStart.x, this.cutLineStart.y,
      this.cutLineEnd.x, this.cutLineEnd.y
    );
    const precision = 1 - Math.min(1, dist / SECTION_RADIUS);

    let hint, color;
    if (precision > 0.8) { hint = '极佳切位！直穿玉心！'; color = '#44ff44'; }
    else if (precision > 0.6) { hint = '不错的位置，靠近玉肉'; color = '#88ff44'; }
    else if (precision > 0.4) { hint = '一般位置，有些偏了'; color = '#ffcc44'; }
    else if (precision > 0.2) { hint = '切偏了，不太理想'; color = '#ff8844'; }
    else { hint = '严重偏离！可能切不到料'; color = '#ff4444'; }

    this.precisionText.setText(hint);
    this.precisionText.setColor(color);
  }

  // ==================== 执行切割 ====================

  _executeCut() {
    this.state = STATE.CUTTING;

    // 如果正在观赏模式，切回切石模式
    if (this._viewMode === 'view') {
      this._viewMode = 'cut';
      this._updateViewMode();
    }

    this.confirmCutBtn.setVisible(false);
    this.takeBtn.setVisible(false);
    this.modeBtn.setVisible(false);
    this.cutLineGfx.clear();
    this.stone3dGfx.setVisible(false);
    this.rotateHint.setVisible(false);
    this.actionHint.setText('切割中...');
    this.precisionText.setText('');

    const index = this.currentStoneIndex;
    const data = this.sectionData[index];
    const R = this.currentPiece ? this.currentPiece.radius : SECTION_RADIUS;

    // 计算精度
    const dist = this._pointLineDistance(
      data.jadeCenterX, data.jadeCenterY,
      this.cutLineStart.x, this.cutLineStart.y,
      this.cutLineEnd.x, this.cutLineEnd.y
    );
    const precision = 1 - Math.min(1, dist / R);
    this.bestPrecision = Math.max(this.bestPrecision, precision);

    // 切割线角度
    const cutAngle = Math.atan2(
      this.cutLineEnd.y - this.cutLineStart.y,
      this.cutLineEnd.x - this.cutLineStart.x
    );

    // 切开动画
    this._playCutAnimation(cutAngle, () => {
      this._showCutFaces(index, cutAngle, precision);
    });
  }

  // ==================== 切开动画 ====================

  _playCutAnimation(cutAngle, onComplete) {
    // 闪光
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillCircle(this.cutAreaX, this.cutAreaY, SECTION_RADIUS + 20);
    this.tweens.add({ targets: flash, alpha: 0, duration: 300 });

    // 裂缝
    const crackGfx = this.add.graphics();
    crackGfx.x = this.cutAreaX;
    crackGfx.y = this.cutAreaY;
    const perpAngle = cutAngle + Math.PI / 2;
    crackGfx.lineStyle(3, 0xffcc00, 1);
    crackGfx.beginPath();
    crackGfx.moveTo(Math.cos(perpAngle) * -SECTION_RADIUS * 1.2, Math.sin(perpAngle) * -SECTION_RADIUS * 1.2);
    crackGfx.lineTo(Math.cos(perpAngle) * SECTION_RADIUS * 1.2, Math.sin(perpAngle) * SECTION_RADIUS * 1.2);
    crackGfx.strokePath();

    // 分裂动画
    const splitDist = 60;
    const splitX = Math.cos(cutAngle) * splitDist;
    const splitY = Math.sin(cutAngle) * splitDist;

    this.tweens.add({
      targets: this.sectionGfx,
      x: this.cutAreaX - splitX * 0.3,
      y: this.cutAreaY - splitY * 0.3,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
    });

    this.time.delayedCall(500, () => {
      crackGfx.destroy();
      if (onComplete) onComplete();
    });
  }

  // ==================== 切面展示 ====================

  _colorComponents(hex) {
    return {
      r: (hex >> 16) & 0xff,
      g: (hex >> 8) & 0xff,
      b: hex & 0xff,
    };
  }

  /** 混合两个颜色 */
  _mixColor(hexA, hexB, t) {
    const a = this._colorComponents(hexA);
    const b = this._colorComponents(hexB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return (r << 16) | (g << 8) | bl;
  }

  /** 让颜色变亮 */
  _brightenColor(hex, factor) {
    const c = this._colorComponents(hex);
    const r = Math.min(255, Math.round(c.r * factor));
    const g = Math.min(255, Math.round(c.g * factor));
    const b = Math.min(255, Math.round(c.b * factor));
    return (r << 16) | (g << 8) | b;
  }

  /** 让颜色变暗 */
  _darkenColor(hex, factor) {
    return this._brightenColor(hex, factor);
  }

  /**
   * 展示切开后的两半——正视图，左半向左飞开、右半向右飞开
   * 左半：左半轮廓外皮 + 正中底部切面启口
   * 右半：右半轮廓外皮 + 正中底部切面启口
   */
  _showCutFaces(index, cutAngle, precision) {
    this.state = STATE.CHOOSE_HALF;
    const data  = this.sectionData[index];
    const R     = this.currentPiece ? this.currentPiece.radius : SECTION_RADIUS;

    // 切割方向单位向量
    const cdx = Math.cos(cutAngle);
    const cdy = Math.sin(cutAngle);
    // 切割线法线（垂直方向）
    const ndx = -cdy;
    const ndy =  cdx;

    // 判断玉肉在哪侧（法线方向点积）
    const jadeDot = data.jadeCenterX * ndx + data.jadeCenterY * ndy;
    this._leftHasJade  = jadeDot <= 0;
    this._rightHasJade = jadeDot >= 0;
    this._cutAngle     = cutAngle;

    // 清除旧的
    this.halfLeftGfx.clear();
    this.halfRightGfx.clear();
    if (this._leftFaceGfx)   { this._leftFaceGfx.destroy();   this._leftFaceGfx   = null; }
    if (this._rightFaceGfx)  { this._rightFaceGfx.destroy();  this._rightFaceGfx  = null; }
    if (this._leftFaceGfx2)  { this._leftFaceGfx2.destroy();  this._leftFaceGfx2  = null; }
    if (this._rightFaceGfx2) { this._rightFaceGfx2.destroy(); this._rightFaceGfx2 = null; }

    // 生成完整石头轮廓
    const shapePts = StoneShape.generate(0, 0, R, data.shapeSeed, 0.35);

    // 分离距离：两半沿切割线法线方向飞开
    const sepDist = 75;

    // 初始位置都在中心
    this.halfLeftGfx.x  = this.cutAreaX;
    this.halfLeftGfx.y  = this.cutAreaY;
    this.halfRightGfx.x = this.cutAreaX;
    this.halfRightGfx.y = this.cutAreaY;

    // 绘制左半（法线负方向）
    this._drawHalfStone(this.halfLeftGfx,  shapePts, data, R, cdx, cdy, ndx, ndy, 'left',  this._leftHasJade);
    // 绘制右半（法线正方向）
    this._drawHalfStone(this.halfRightGfx, shapePts, data, R, cdx, cdy, ndx, ndy, 'right', this._rightHasJade);

    // 飞开动画
    this.halfLeftGfx.setAlpha(0);
    this.halfRightGfx.setAlpha(0);

    this.tweens.add({
      targets: this.halfLeftGfx,
      x: this.cutAreaX - ndx * sepDist,
      y: this.cutAreaY - ndy * sepDist,
      alpha: 1,
      duration: 450,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.halfRightGfx,
      x: this.cutAreaX + ndx * sepDist,
      y: this.cutAreaY + ndy * sepDist,
      alpha: 1,
      duration: 450,
      ease: 'Back.easeOut',
      delay: 60,
    });

    this.actionHint.setText('自动保留较好的一边...');
    this.cutCountText.setText('已切 ' + (this.cutCount + 1) + ' 刀');

    // 不显示选半按钮，1.2秒后自动保留较好的一边
    this.time.delayedCall(1200, () => {
      // 判断哪边更好（有玉肉的一边优先）
      let betterSide;
      if (this._leftHasJade && !this._rightHasJade) {
        betterSide = 'left';
      } else if (this._rightHasJade && !this._leftHasJade) {
        betterSide = 'right';
      } else {
        // 两边都有或都没有玉肉，随机选一边
        betterSide = Math.random() > 0.5 ? 'left' : 'right';
      }
      this._chooseHalf(betterSide);
    });
  }

  /**
   * 绘制半块石头——简洁正视
   *
   * 效果：
   *   - 対应那半的不规则轮廓（外皮颜色）
   *   - 底部中心有一条切面显录（横向椭圆，显示层次色圈）
   *   - 石头背面有轻微阴影模拟厉度
   */
  _drawHalfStone(gfx, allPts, data, R, cdx, cdy, ndx, ndy, side, hasJade) {
    const sign = side === 'left' ? -1 : 1;
    const THICK = 18;   // 背面厕度层，偏移方向（右下方少许）
    const tdx = 8;
    const tdy = 10;

    // 过滤出属于这半的点
    const halfPts = allPts.filter(p => {
      const dot = p.x * ndx + p.y * ndy;
      return sign < 0 ? dot <= 0.5 : dot >= -0.5;
    });
    if (halfPts.length < 2) return;

    // 构造闭合山形：加上切割线两个端点闭合
    const closed = [...halfPts,
      { x:  cdx * R * 1.05, y:  cdy * R * 1.05 },
      { x: -cdx * R * 1.05, y: -cdy * R * 1.05 },
    ];

    // 1. 背面阴影层（模拟厚度感）
    const darkColor = this._darkenColor(data.outerColor, 0.55);
    gfx.fillStyle(darkColor, 0.9);
    gfx.beginPath();
    gfx.moveTo(closed[0].x + tdx, closed[0].y + tdy);
    for (let i = 1; i < closed.length; i++) {
      gfx.lineTo(closed[i].x + tdx, closed[i].y + tdy);
    }
    gfx.closePath();
    gfx.fillPath();

    // 2. 正面外皮（主体颜色）
    StoneShape.drawPolygon(gfx, closed, data.outerColor, 1, 0x000000, 1.5);

    // 3. 左上角高光
    const hlColor = this._brightenColor(data.outerColor, 1.65);
    gfx.fillStyle(hlColor, 0.28);
    const hlPts = closed.map(p => ({ x: p.x * 0.4 - R * 0.2, y: p.y * 0.4 - R * 0.25 }));
    gfx.beginPath();
    if (hlPts.length > 0) {
      gfx.moveTo(hlPts[0].x, hlPts[0].y);
      for (let i = 1; i < hlPts.length; i++) gfx.lineTo(hlPts[i].x, hlPts[i].y);
      gfx.closePath(); gfx.fillPath();
    }

    // 4. 切面——一个向内凹进的焯圆，显示石头内部层次
    //    位于切割线正中間（切面中心）
    //    大小 = R * 0.9 × 平扇
    const faceRx = R * 0.88;       // 沿切割线方向
    const faceRy = R * 0.28;       // 垂直切割线方向（吸简为水平那就是上下）
    const faceCX = 0;
    const faceCY = 0;

    // 切面方向角（切割线方向）
    const faceAngle = this._cutAngle || 0;

    gfx.save();
    gfx.translateCanvas(faceCX, faceCY);
    gfx.rotateCanvas(faceAngle);

    // 层 1: 外皮圆（最外）
    gfx.fillStyle(data.outerColor, 1);
    gfx.fillEllipse(0, 0, faceRx * 2, faceRy * 2);
    gfx.lineStyle(2, this._brightenColor(data.outerColor, 1.4), 0.8);
    gfx.strokeEllipse(0, 0, faceRx * 2, faceRy * 2);

    // 层 2: 过渡层
    const midRx = faceRx * 0.72;
    const midRy = faceRy * 0.72;
    gfx.fillStyle(data.middleHint, 1);
    gfx.fillEllipse(0, 0, midRx * 2, midRy * 2);
    gfx.lineStyle(1.5, this._brightenColor(data.middleHint, 1.35), 0.6);
    gfx.strokeEllipse(0, 0, midRx * 2, midRy * 2);

    if (hasJade) {
      const jColor = data.jadeColor;
      const jRatio = data.jadeRadius / R;
      const jRx = faceRx * jRatio * 1.0;
      const jRy = faceRy * jRatio * 1.0;

      // 层 3: 玉肉底色
      gfx.fillStyle(jColor, 1);
      gfx.fillEllipse(0, 0, jRx * 2, jRy * 2);

      // 层 4: 玉肉亮色圈
      const brightJ = this._brightenColor(jColor, 1.7);
      gfx.fillStyle(brightJ, 0.55);
      gfx.fillEllipse(0, 0, jRx * 1.25, jRy * 1.25);

      // 层 5: 玉心白色高光
      gfx.fillStyle(0xffffff, 0.5);
      gfx.fillEllipse(-jRx * 0.2, -jRy * 0.3, jRx * 0.55, jRy * 0.55);

      // 玉肉轮廓亮线
      gfx.lineStyle(2, this._brightenColor(jColor, 2.1), 0.85);
      gfx.strokeEllipse(0, 0, jRx * 2, jRy * 2);

      // 内部亝维纹理
      const texC = this._brightenColor(jColor, 1.25);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * i) / 6;
        gfx.lineStyle(0.8, texC, 0.22);
        gfx.beginPath();
        gfx.moveTo(-Math.cos(a) * jRx * 0.85, -Math.sin(a) * jRy * 0.85);
        gfx.lineTo( Math.cos(a) * jRx * 0.85,  Math.sin(a) * jRy * 0.85);
        gfx.strokePath();
      }
    } else {
      // 无玉肉：展示暗高废料内心
      const wasteRx = faceRx * 0.5;
      const wasteRy = faceRy * 0.5;
      gfx.fillStyle(this._darkenColor(data.outerColor, 0.6), 0.85);
      gfx.fillEllipse(0, 0, wasteRx * 2, wasteRy * 2);
      // 裂纹
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + 0.5;
        gfx.lineStyle(1, 0x555555, 0.3);
        gfx.beginPath();
        gfx.moveTo(0, 0);
        gfx.lineTo(Math.cos(a) * wasteRx * 0.8, Math.sin(a) * wasteRy * 0.8);
        gfx.strokePath();
      }
    }

    // 切面外圈描边
    gfx.lineStyle(2, 0x000000, 0.45);
    gfx.strokeEllipse(0, 0, faceRx * 2, faceRy * 2);

    gfx.restore();
  }

  // ==================== 选择保留哪一半 ====================

  _chooseHalf(side) {
    const index = this.currentStoneIndex;
    const data = this.sectionData[index];
    const R = this.currentPiece ? this.currentPiece.radius : SECTION_RADIUS;

    this.cutCount++;

    // 退出观赏模式
    if (this._viewMode === 'view') {
      this._viewMode = 'cut';
      this.stone3dGfx.setVisible(false);
      this.sectionGfx.setVisible(true);
      this.cutLineGfx.setVisible(true);
      this.rotateHint.setVisible(false);
      this._rotX = 0; this._rotY = 0; this._velX = 0; this._velY = 0;
    }

    // 清除两半显示
    this.halfLeftGfx.clear();
    this.halfRightGfx.clear();

    // 更新当前块（保留的一半更小了）
    const newR = R * 0.75; // 每切一次，保留块缩小
    this.currentPiece = {
      radius: newR,
      hasJade: side === 'left' ? this._leftHasJade : this._rightHasJade,
    };

    // 重新进入画线状态
    this.state = STATE.DRAW_LINE;
    this.cutLineStart = null;
    this.cutLineEnd = null;
    this.isDrawingLine = false;
    this.cutLineGfx.clear();
    this.confirmCutBtn.setVisible(false);

    // 重绘截面（更小的块）
    this.sectionGfx.x = this.cutAreaX;
    this.sectionGfx.y = this.cutAreaY;
    this.sectionGfx.setAlpha(1);
    this.sectionGfx.setVisible(true);
    this._drawSection(index, this.currentPiece);

    // 重建3D网格（新尺寸）
    this._build3DMesh();
    this.modeBtn.setVisible(true);
    this.modeBtn.setText('观赏3D');
    this.modeBtn.setStyle({ color: '#88aaff' });

    this.actionHint.setText('继续切割，或取料');
    this.takeBtn.setVisible(true);
    this.takeBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });

    // 最多切5刀
    if (this.cutCount >= 5) {
      this.actionHint.setText('已达最大切割次数，请取料');
      this.takeBtn.setStyle({ color: '#ff6666', backgroundColor: '#55330088' });
    }
  }

  // ==================== 取料（结束当前石头） ====================

  _finishCutting() {
    const index = this.currentStoneIndex;
    const data = this.sectionData[index];

    // 退出观赏模式
    if (this._viewMode === 'view') {
      this._viewMode = 'cut';
      this.stone3dGfx.setVisible(false);
      this.sectionGfx.setVisible(true);
      this.cutLineGfx.setVisible(true);
      this.rotateHint.setVisible(false);
    }

    // 清除切面显示
    this.halfLeftGfx.clear();
    this.halfRightGfx.clear();
    this.chooseLeftBtn.setVisible(false);
    this.chooseRightBtn.setVisible(false);
    this.takeBtn.setVisible(false);
    this.confirmCutBtn.setVisible(false);
    this.modeBtn.setVisible(false);
    this.cutLineGfx.clear();
    this.sectionGfx.clear();

    // 计算最终结果
    const cutData = this._calculateFinalResult(data, this.bestPrecision, this.cutCount);

    // 闪光
    const burst = this.add.graphics();
    burst.fillStyle(0xffffff, 0.6);
    burst.fillCircle(this.cutAreaX, this.cutAreaY, SECTION_RADIUS + 30);
    this.tweens.add({ targets: burst, alpha: 0, duration: 500 });

    // 结果展示——不透露具体玉种，只显示价值
    this.resultText.setText(cutData.isGood ? '开出好料！' : '料子一般...');
    this.resultText.setColor(cutData.isGood ? '#ffcc00' : '#888888');
    this.resultText.setVisible(true);

    this.valueText.setText(`切割${this.cutCount}刀 | 精度${Math.round(this.bestPrecision * 100)}% | 价值${cutData.baseValue}`);
    this.valueText.setColor(cutData.isGood ? '#66ff66' : '#ff4444');
    this.valueText.setVisible(true);

    this.actionHint.setText(cutData.isGood ? '选择加工方式' : '可惜了...');

    // 宝石
    this.gemGfx.setVisible(true);
    this.gemGfx.clear();
    this.gemGfx.setAlpha(0);
    this.gemGfx.setScale(0);

    if (cutData.isGood) {
      this._drawGoodGem(cutData.gemColor);
      this._playGemSparkle();
      this.tweens.add({ targets: this.gemGfx, alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.gemGfx, scaleX: 1.3, scaleY: 1.3, duration: 400, ease: 'Back.easeOut' });
    } else {
      this._drawBadGem(cutData.gemColor);
      this.tweens.add({ targets: this.gemGfx, alpha: 1, scaleX: 1, scaleY: 1, duration: 300 });
    }

    // 保存结果
    this.stoneCutResults[index] = cutData;

    // 设置状态为加工选择
    this.state = STATE.CRAFT;

    // 检测收购商（好料才有收购商出现）
    if (cutData.isGood) {
      const jadeExposed = this.currentPiece ? this.currentPiece.hasJade : false;
      const buyerData = checkBuyerAppears(cutData.gemResult, jadeExposed, this.cutCount);
      if (buyerData) {
        // 延迟一点显示，让宝石展示动画先播完
        this.time.delayedCall(700, () => {
          this._showBuyerOffer(buyerData, cutData);
        });
        return; // 先不显示加工选择，等玩家决定是否卖
      }
    }

    // 显示加工选择
    this._showCraftPanel(cutData);
  }

  // ==================== 结果计算 ====================

  _calculateFinalResult(data, precision, cutCount) {
    let resultGem = data.gemResult;
    let modifier = '';

    // 精度影响：精度高保持或提升，精度低降级
    if (precision > 0.8) {
      modifier = '精准切割！';
    } else if (precision > 0.6) {
      modifier = '切位不错';
    } else if (precision > 0.4) {
      resultGem = this._downgradeGem(resultGem);
      modifier = '切偏了，品质降低';
    } else if (precision > 0.2) {
      resultGem = this._downgradeGem(this._downgradeGem(resultGem));
      modifier = '严重偏切！';
    } else {
      resultGem = this._downgradeGem(this._downgradeGem(this._downgradeGem(resultGem)));
      modifier = '完全切歪了！';
    }

    // 切割次数影响：每多切一刀，料子损耗 10%，但可以更精准
    const sizePenalty = Math.pow(0.9, cutCount); // 每刀损耗10%
    const finalValue = Math.round(resultGem.value * sizePenalty);

    return {
      gemResult: resultGem,
      gemName: resultGem.name,
      gemColor: resultGem.color,
      baseValue: finalValue,
      isGood: resultGem.isGood,
      precision,
      cutCount,
      modifier,
    };
  }

  _downgradeGem(gem) {
    const order = [
      GEM_TYPES.diwanglv, GEM_TYPES.feicui, GEM_TYPES.hetianyu,
      GEM_TYPES.manao, GEM_TYPES.putongliao, GEM_TYPES.feishi,
    ];
    const idx = order.findIndex(g => g.key === gem.key);
    if (idx < order.length - 1) return order[idx + 1];
    return GEM_TYPES.feishi;
  }

  // ==================== 宝石绘制 ====================

  _drawGoodGem(color) {
    const g = this.gemGfx;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, -35); g.lineTo(30, 0); g.lineTo(0, 35); g.lineTo(-30, 0);
    g.closePath(); g.fillPath();
    g.lineStyle(2, 0xffffff, 0.6); g.strokePath();
    g.fillStyle(0xffffff, 0.4);
    g.fillTriangle(-5, -18, 7, -7, -2, -3);
  }

  _drawBadGem(color) {
    const g = this.gemGfx;
    g.fillStyle(color, 0.8);
    for (let i = 0; i < 5; i++) {
      g.fillRect((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 35, 8, 5);
    }
  }

  _playGemSparkle() {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const dist = 40 + Math.random() * 25;
      const spark = this.add.graphics();
      spark.fillStyle(0xffffff, 0.9);
      spark.fillCircle(this.cutAreaX + Math.cos(angle) * dist, this.cutAreaY - 30 + Math.sin(angle) * dist, 2);
      this.tweens.add({ targets: spark, alpha: 0, duration: 600 + Math.random() * 400, onComplete: () => spark.destroy() });
    }
  }

  // ==================== 收购商弹窗 ====================

  _showBuyerOffer(buyerData, cutData) {
    // 背景遮暗
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });

    const panelW = 290;
    const panelH = 240;
    const panelX = this.cutAreaX - panelW / 2;
    const panelY = this.cutAreaY - panelH / 2 - 20;
    const cx = this.cutAreaX;
    const baseY = panelY;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a0a00, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panel.lineStyle(2, 0xffcc00, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
    panel.lineStyle(1, 0xffcc00, 0.4);
    panel.strokeRoundedRect(panelX + 8, panelY + 8, panelW - 16, 40, 6);
    panel.setAlpha(0);

    const buyerNameTxt = this.add.text(cx, baseY + 22, '\u{1F4B0} ' + buyerData.buyerName, {
      fontSize: '15px', fontFamily: 'Arial', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    const lineTxt = this.add.text(cx, baseY + 62, '\u201c' + buyerData.buyerLine + '\u201d', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
      align: 'center', wordWrap: { width: panelW - 30 },
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    const offerTxt = this.add.text(cx, baseY + 118, '\u51fa\u4ef7: ' + buyerData.offer, {
      fontSize: '26px', fontFamily: 'Arial', color: '#66ff66',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const jewelryVal = calcCraftValue(cutData.gemResult, 'jewelry');
    const ornamentVal = calcCraftValue(cutData.gemResult, 'ornament');
    const refTxt = this.add.text(cx, baseY + 148,
      '\u52a0\u5de5\u53c2\u8003\uff1a\u9996\u9970 ' + jewelryVal + ' / \u6446\u4ef6 ' + ornamentVal,
      { fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa' }
    ).setOrigin(0.5).setAlpha(0);

    const sellBtn = this.add.text(cx - 75, baseY + 187, '\u51fa\u552e  \u00bb', {
      fontSize: '16px', fontFamily: 'Arial', color: '#66ff66',
      fontStyle: 'bold', backgroundColor: '#224422bb',
      padding: { x: 18, y: 7 }, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    const rejectBtn = this.add.text(cx + 75, baseY + 187, '\u4e0d\u5356', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ff6666',
      backgroundColor: '#44222288',
      padding: { x: 18, y: 7 }, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    const allItems = [panel, buyerNameTxt, lineTxt, offerTxt, refTxt, sellBtn, rejectBtn];
    this.tweens.add({ targets: allItems, alpha: 1, duration: 350, delay: 50 });

    // 金币粒子入场
    for (let i = 0; i < 15; i++) {
      const spark = this.add.graphics();
      const sx = panelX + Math.random() * panelW;
      const sy = panelY + panelH * 0.5;
      spark.fillStyle(0xffcc00, 0.9);
      spark.fillCircle(sx, sy, 2 + Math.random() * 2);
      this.tweens.add({
        targets: spark,
        y: sy - 40 - Math.random() * 40,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        delay: Math.random() * 300,
        onComplete: () => spark.destroy(),
      });
    }

    sellBtn.on('pointerover', () => sellBtn.setStyle({ color: '#ffffff' }));
    sellBtn.on('pointerout', () => sellBtn.setStyle({ color: '#66ff66' }));
    rejectBtn.on('pointerover', () => rejectBtn.setStyle({ color: '#ffffff' }));
    rejectBtn.on('pointerout', () => rejectBtn.setStyle({ color: '#ff6666' }));

    const closePanel = () => {
      this.tweens.add({
        targets: [overlay, panel, buyerNameTxt, lineTxt, offerTxt, refTxt, sellBtn, rejectBtn],
        alpha: 0,
        duration: 250,
        onComplete: () => {
          overlay.destroy(); panel.destroy();
          buyerNameTxt.destroy(); lineTxt.destroy();
          offerTxt.destroy(); refTxt.destroy();
          sellBtn.destroy(); rejectBtn.destroy();
        },
      });
    };

    sellBtn.on('pointerdown', () => {
      closePanel();
      this._sellToBuyer(buyerData, cutData);
    });

    rejectBtn.on('pointerdown', () => {
      closePanel();
      this.actionHint.setText('\u7ee7\u7eed\u52a0\u5de5\u6216\u5207\u5272...');
      this._showCraftPanel(cutData);
    });
  }

  _sellToBuyer(buyerData, cutData) {
    const index = this.currentStoneIndex;

    this.stoneCutResults[index].finalValue = buyerData.offer;
    this.stoneCutResults[index].craftType = 'sold';
    this.craftChoices[index] = 'sold';
    this.craftPanel.setVisible(false);

    // 金币雨动画
    for (let i = 0; i < 25; i++) {
      const coin = this.add.graphics();
      const cx = this.cutAreaX + (Math.random() - 0.5) * 160;
      const cy = this.cutAreaY - 60;
      coin.fillStyle(0xffcc00, 1);
      coin.fillCircle(cx, cy, 5 + Math.random() * 4);
      this.tweens.add({
        targets: coin,
        y: cy + 80 + Math.random() * 60,
        alpha: 0,
        duration: 700 + Math.random() * 500,
        delay: Math.random() * 400,
        ease: 'Cubic.easeIn',
        onComplete: () => coin.destroy(),
      });
    }

    const soldTxt = this.add.text(this.cutAreaX, this.cutAreaY - 85,
      '\u6210\u4ea4\uff01+' + buyerData.offer,
      {
        fontSize: '28px', fontFamily: 'Arial', color: '#ffcc00',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
      }
    ).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: soldTxt, alpha: 1, y: this.cutAreaY - 100, duration: 400 });
    this.tweens.add({
      targets: soldTxt, alpha: 0, duration: 400, delay: 1200,
      onComplete: () => soldTxt.destroy(),
    });

    this.valueText.setText('\u5df2\u51fa\u552e\u7ed9\u300a' + buyerData.buyerName + '\u300b: ' + buyerData.offer);
    this.valueText.setColor('#ffcc00');

    this.levelScore += buyerData.offer;
    this.scoreText.setText('\u672c\u5173\u6536\u76ca: ' + this.levelScore);

    this._updateListStatus(index, 'done');

    const hasMore = this._hasUnfinishedStones();
    if (hasMore) {
      this.nextStoneBtn.setVisible(true);
      this.nextStoneBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
    } else {
      this.state = STATE.ALL_DONE;
      this.finishBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
      this.finishBtn.setVisible(true);
    }
  }

  // ==================== 加工选择面板 ====================

  _showCraftPanel(cutData) {
    this.craftPanel.removeAll(true);
    this.craftPanel.setVisible(true);

    const gem = cutData.gemResult;

    const title = this.add.text(0, -75, '选择加工方式', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.craftPanel.add(title);

    // 首饰卡片
    const jewelryValue = calcCraftValue(gem, 'jewelry');
    const jCard = this.add.graphics();
    jCard.fillStyle(0x442244, 0.7);
    jCard.fillRoundedRect(-150, -60, 115, 85, 8);
    jCard.lineStyle(1, 0xcc88cc, 0.6);
    jCard.strokeRoundedRect(-150, -60, 115, 85, 8);
    jCard.fillStyle(0xffcc44, 1); jCard.fillCircle(-92, -38, 8);
    jCard.lineStyle(2, 0xffcc44, 1); jCard.strokeCircle(-92, -38, 12);
    jCard.fillStyle(0xdd88ff, 1); jCard.fillRect(-94, -28, 4, 10);

    const jName = this.add.text(-92, -12, '首饰', { fontSize: '14px', fontFamily: 'Arial', color: '#ff88ff', fontStyle: 'bold' }).setOrigin(0.5);
    const jValue = this.add.text(-92, 7, `${jewelryValue}`, { fontSize: '18px', fontFamily: 'Arial', color: jewelryValue > gem.value ? '#66ff66' : '#ff6666', fontStyle: 'bold' }).setOrigin(0.5);
    const jHint = this.add.text(-92, 24, jewelryValue > gem.value ? `x${(jewelryValue / gem.value).toFixed(1)}` : '亏损', { fontSize: '10px', fontFamily: 'Arial', color: jewelryValue > gem.value ? '#88ff88' : '#ff4444' }).setOrigin(0.5);

    this.craftPanel.add([jCard, jName, jValue, jHint]);
    const jZone = this.add.zone(-92, -18, 115, 85);
    jZone.setInteractive({ useHandCursor: true });
    jZone.on('pointerdown', () => this._chooseCraft('jewelry', cutData));
    this.craftPanel.add(jZone);

    // 摆件卡片
    const ornamentValue = calcCraftValue(gem, 'ornament');
    const oCard = this.add.graphics();
    oCard.fillStyle(0x224422, 0.7);
    oCard.fillRoundedRect(35, -60, 115, 85, 8);
    oCard.lineStyle(1, 0x88cc88, 0.6);
    oCard.strokeRoundedRect(35, -60, 115, 85, 8);
    oCard.fillStyle(0x88dd88, 1); oCard.fillCircle(92, -38, 10);
    oCard.fillStyle(0xaaffaa, 1); oCard.fillCircle(92, -40, 5);
    oCard.fillStyle(0x66bb66, 1); oCard.fillRect(85, -30, 14, 8);

    const oName = this.add.text(92, -12, '摆件', { fontSize: '14px', fontFamily: 'Arial', color: '#88ff88', fontStyle: 'bold' }).setOrigin(0.5);
    const oValue = this.add.text(92, 7, `${ornamentValue}`, { fontSize: '18px', fontFamily: 'Arial', color: ornamentValue > gem.value ? '#66ff66' : '#ff6666', fontStyle: 'bold' }).setOrigin(0.5);
    const oHint = this.add.text(92, 24, ornamentValue > gem.value ? `x${(ornamentValue / gem.value).toFixed(1)}` : '亏损', { fontSize: '10px', fontFamily: 'Arial', color: ornamentValue > gem.value ? '#88ff88' : '#ff4444' }).setOrigin(0.5);

    this.craftPanel.add([oCard, oName, oValue, oHint]);
    const oZone = this.add.zone(92, -18, 115, 85);
    oZone.setInteractive({ useHandCursor: true });
    oZone.on('pointerdown', () => this._chooseCraft('ornament', cutData));
    this.craftPanel.add(oZone);
  }

  _chooseCraft(craftKey, cutData) {
    const index = this.currentStoneIndex;
    this.craftChoices[index] = craftKey;

    const gem = cutData.gemResult;
    const finalValue = calcCraftValue(gem, craftKey);
    const craftName = CRAFT_TYPES[craftKey].name;

    this.craftPanel.setVisible(false);

    this.valueText.setText(`${craftName}: ${finalValue} (${gem.value}x${(finalValue / gem.value).toFixed(1)})`);
    this.valueText.setColor(finalValue > gem.value ? '#66ff66' : '#ff6666');

    const flash = this.add.graphics();
    flash.fillStyle(finalValue > gem.value ? 0x66ff66 : 0xff4444, 0.3);
    flash.fillCircle(this.cutAreaX, this.cutAreaY, 100);
    this.tweens.add({ targets: flash, alpha: 0, duration: 500 });

    this.levelScore += finalValue;
    this.scoreText.setText(`本关收益: ${this.levelScore}`);

    this.stoneCutResults[index].finalValue = finalValue;
    this.stoneCutResults[index].craftType = craftKey;

    this._updateListStatus(index, 'done');

    const hasMore = this._hasUnfinishedStones();
    if (hasMore) {
      this.nextStoneBtn.setVisible(true);
      this.nextStoneBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
    }
    if (!hasMore) {
      this.state = STATE.ALL_DONE;
      this.finishBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
      this.finishBtn.setVisible(true);
    }
  }

  // ==================== 石头列表 ====================

  _drawStoneList() {
    const listX = 65;
    const startY = 95;
    const rowH = 52;
    this.listItems = [];

    for (let i = 0; i < this.collectedStones.length; i++) {
      const stone = this.collectedStones[i];
      const y = startY + i * rowH;
      if (y > GAME_CONFIG.HEIGHT - 70) break;

      const container = this.add.container(listX, y);
      const iconGfx = this.add.graphics();
      const miniPts = StoneShape.generate(0, 0, 12, i * 137 + 42, 0.4);
      StoneShape.drawPolygon(iconGfx, miniPts, stone.type.color, 1, 0x000000, 1);

      const nameText = this.add.text(20, -6, stone.type.name, { fontSize: '12px', fontFamily: 'Arial', color: '#ffffff' });
      const rateText = this.add.text(20, 8, `好石率${Math.round(stone.type.goodRate * 100)}%`, { fontSize: '9px', fontFamily: 'Arial', color: '#ffcc00' });
      const statusText = this.add.text(80, 0, '待切', { fontSize: '10px', fontFamily: 'Arial', color: '#aaaaaa' }).setOrigin(0, 0.5);

      container.add([iconGfx, nameText, rateText, statusText]);
      container.setSize(110, rowH - 4);
      container.setInteractive({ useHandCursor: true });
      container.stoneIndex = i;
      container.on('pointerdown', () => {
        if (this.state === STATE.SELECT) this._selectStone(i);
      });

      this.listItems.push({ container, statusText, iconGfx });
    }
  }

  _updateListStatus(index, status) {
    if (index >= this.listItems.length) return;
    const item = this.listItems[index];
    switch (status) {
      case 'selected':
        item.statusText.setText('<<');
        item.statusText.setColor('#ffcc00');
        break;
      case 'done':
        const craft = this.craftChoices[index];
        const craftName = craft === 'sold' ? '已出售' : craft ? CRAFT_TYPES[craft].name : '已切';
        item.statusText.setText(craftName);
        item.statusText.setColor('#66ff66');
        item.iconGfx.clear();
        const miniPts = StoneShape.generate(0, 0, 12, index * 137 + 42, 0.3);
        const doneColor = craft === 'jewelry' ? 0xcc88cc : craft === 'ornament' ? 0x88cc88 : 0x44aa66;
        StoneShape.drawPolygon(item.iconGfx, miniPts, doneColor, 0.8);
        break;
    }
  }

  _clearListSelection() {
    for (let i = 0; i < this.listItems.length; i++) {
      const item = this.listItems[i];
      if (this.stoneCutResults[i]) {
        const craft = this.craftChoices[i];
        item.statusText.setText(craft ? CRAFT_TYPES[craft].name : '已切');
        item.statusText.setColor('#66ff66');
      } else {
        item.statusText.setText('待切');
        item.statusText.setColor('#aaaaaa');
      }
    }
  }

  // ==================== 选择石头 ====================

  _selectStone(index) {
    this.currentStoneIndex = index;
    this.state = STATE.DRAW_LINE;
    this.cutLineStart = null;
    this.cutLineEnd = null;
    this.isDrawingLine = false;
    this.cutCount = 0;
    this.bestPrecision = 0;
    this.currentPiece = null;

    this._clearListSelection();
    this._updateListStatus(index, 'selected');

    // 重置显示
    this.resultText.setVisible(false);
    this.valueText.setVisible(false);
    this.gemGfx.setVisible(false);
    this.nextStoneBtn.setVisible(false);
    this.craftPanel.setVisible(false);
    this.confirmCutBtn.setVisible(false);
    this.takeBtn.setVisible(false);
    this.chooseLeftBtn.setVisible(false);
    this.chooseRightBtn.setVisible(false);
    this.cutLineGfx.clear();
    this.halfLeftGfx.clear();
    this.halfRightGfx.clear();
    this.cutCountText.setText('已切 0 刀');

    // 重置3D状态
    this._viewMode = 'cut';
    this._rotX = 0;
    this._rotY = 0;
    this._velX = 0;
    this._velY = 0;
    this.stone3dGfx.clear();
    this.stone3dGfx.setVisible(false);
    this.rotateHint.setVisible(false);
    this.modeBtn.setText('观赏3D');
    this.modeBtn.setStyle({ color: '#88aaff' });
    this.modeBtn.setVisible(true);

    // 重置截面位置
    this.sectionGfx.x = this.cutAreaX;
    this.sectionGfx.y = this.cutAreaY;
    this.sectionGfx.setAlpha(1);
    this.sectionGfx.setVisible(true);

    this._drawSection(index, null);

    // 预构建3D网格（切换观赏模式时使用）
    this._build3DMesh();

    this.actionHint.setText('在石头上拖动画切割线');
    this.precisionText.setText('');
    this.takeBtn.setVisible(true);
    this.takeBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
  }

  _selectNextStone() {
    for (let i = 0; i < this.collectedStones.length; i++) {
      const idx = (this.currentStoneIndex + 1 + i) % this.collectedStones.length;
      if (!this.stoneCutResults[idx]) {
        this._selectStone(idx);
        return;
      }
    }
    this.state = STATE.ALL_DONE;
    this.finishBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
    this.finishBtn.setVisible(true);
  }

  _hasUnfinishedStones() {
    for (let i = 0; i < this.collectedStones.length; i++) {
      if (!this.stoneCutResults[i]) return true;
    }
    return false;
  }

  _showNoStonesMessage() {
    this.add.text(this.cutAreaX, this.cutAreaY, '没有收集到原石...', {
      fontSize: '24px', fontFamily: 'Arial', color: '#ff6666',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.state = STATE.ALL_DONE;
    this.finishBtn.setStyle({ color: '#ffcc00', backgroundColor: '#55330088' });
    this.finishBtn.setVisible(true);
    this.modeBtn.setVisible(false);
  }

  // ==================== 数学工具 ====================

  _pointLineDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ==================== 跳转结果 ====================

  _goToResult() {
    const compatResults = this.cutResults.map((r, i) => {
      const cutData = this.stoneCutResults[i];
      return {
        ...r,
        gemResult: cutData ? cutData.gemResult : r.cutResult.gemResult,
        finalValue: cutData ? cutData.finalValue : r.cutResult.gemResult.value,
        craftType: cutData ? cutData.craftType : null,
        precision: cutData ? cutData.precision : 0,
        cutCount: cutData ? cutData.cutCount : 0,
        modifier: cutData ? cutData.modifier : '',
      };
    });
    this.scene.start('MenuScene', {
      phase: 'result', level: this.level,
      totalScore: this.totalScore + this.levelScore,
      levelScore: this.levelScore,
      levelConfig: this.levelConfig,
      cutResults: compatResults,
      ownedHooks: this.ownedHooks,
      selectedHook: this.selectedHook,
    });
  }

  // ==================== 3D 石头渲染 ====================

  /** 每帧更新：旋转惯性 + 自动旋转 */
  update() {
    if (!this._stoneMesh) return;

    // 惯性衰减
    if (!this._isDragging3D) {
      this._velX *= 0.92;
      this._velY *= 0.92;
      this._rotX += this._velX;
      this._rotY += this._velY;

      // 松手后自动回正X轴
      if (this.time.now - this._lastInteractTime > 600) {
        this._rotX *= 0.97;
        this._velX *= 0.9;
      }

      // 自动缓慢旋转Y
      if (this.time.now - this._lastInteractTime > 1200) {
        this._rotY += this._autoRotSpeed;
      }
    }

    // 观赏模式时实时渲染
    if (this._viewMode === 'view') {
      this._renderStone3D();
    }
  }

  /** 构建3D网格 */
  _build3DMesh() {
    const index = this.currentStoneIndex;
    const data = this.sectionData[index];
    const R = this.currentPiece ? this.currentPiece.radius : SECTION_RADIUS;
    const outlinePts = StoneShape.generate(0, 0, R, data.shapeSeed, 0.35);
    this._stoneMesh = StoneShape.generate3DMesh(outlinePts, R);
    this._stoneMesh.R = R;
    this._stoneMesh.outline = outlinePts;

    // 为每个面赋予石头颜色
    for (const face of this._stoneMesh.faces) {
      switch (face.type) {
        case 'front': face.color = data.outerColor; break;
        case 'side':  face.color = data.outerColor; break;
        case 'back':  face.color = this._darkenColor(data.outerColor, 0.6); break;
      }
    }
  }

  /** 渲染3D石头 */
  _renderStone3D() {
    const gfx = this.stone3dGfx;
    const mesh = this._stoneMesh;
    if (!mesh) return;

    gfx.clear();

    // 旋转所有顶点
    const rotated = mesh.vertices.map(v => StoneShape.rotate3D(v, this._rotX, this._rotY));
    // 透视投影
    const projected = rotated.map(v => StoneShape.project3D(v));

    // 准备面数据（计算深度和法线）
    const renderFaces = [];
    for (const face of mesh.faces) {
      const verts3D = face.vi.map(i => rotated[i]);
      const verts2D = face.vi.map(i => projected[i]);

      // 面中心深度
      const avgZ = verts3D.reduce((s, v) => s + v.z, 0) / verts3D.length;

      // 法线
      const normal = StoneShape.faceNormal(verts3D[0], verts3D[1], verts3D[2]);

      // 背面剔除（法线朝后不显示）
      if (normal.z < -0.05) continue;

      renderFaces.push({ verts2D, verts3D, avgZ, normal, face });
    }

    // 按深度从远到近排序（远的先画）
    renderFaces.sort((a, b) => a.avgZ - b.avgZ);

    // 光源方向（左上前方）
    const lx = 0.3, ly = -0.4, lz = 0.87;
    const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const lnx = lx / lLen, lny = ly / lLen, lnz = lz / lLen;

    // 绘制每个面
    for (const rf of renderFaces) {
      const { verts2D, normal, face } = rf;
      const baseColor = face.color;

      // 漫反射光照
      const diffuse = Math.max(0, normal.x * lnx + normal.y * lny + normal.z * lnz);
      const ambient = 0.38;
      const brightness = ambient + 0.62 * diffuse;

      // 边缘高光（面向观察者时微微发亮）
      const facing = Math.max(0, normal.z);
      const spec = facing > 0.8 ? (facing - 0.8) * 2.5 : 0;

      const litColor = this._brightenColor(baseColor, brightness);
      const finalColor = spec > 0 ? this._mixColor(litColor, 0xffffff, spec * 0.3) : litColor;

      gfx.fillStyle(finalColor, 1);
      gfx.beginPath();
      gfx.moveTo(verts2D[0].x, verts2D[0].y);
      for (let i = 1; i < verts2D.length; i++) {
        gfx.lineTo(verts2D[i].x, verts2D[i].y);
      }
      gfx.closePath();
      gfx.fillPath();

      // 描边增加立体感
      const edgeColor = this._brightenColor(baseColor, brightness * 0.75);
      gfx.lineStyle(0.6, edgeColor, 0.7);
      gfx.strokePath();
    }

    // 正面时绘制截面提示（淡色圆圈暗示内部玉肉位置）
    if (this._rotX < 0.2 && this._rotX > -0.2 && Math.abs(this._rotY % (Math.PI * 2)) < 0.3) {
      const data = this.sectionData[this.currentStoneIndex];
      const R = mesh.R;
      const frontZ = R * 0.55;
      const fPt = StoneShape.rotate3D({ x: 0, y: 0, z: frontZ }, this._rotX, this._rotY);
      const fProj = StoneShape.project3D(fPt);

      // 玉肉暗示圈
      gfx.fillStyle(data.jadeColor, 0.12);
      gfx.fillCircle(fProj.x, fProj.y, data.jadeRadius * 0.6);
      gfx.lineStyle(1, data.jadeColor, 0.2);
      gfx.strokeCircle(fProj.x, fProj.y, data.jadeRadius * 0.6);
    }
  }

  /** 切换观赏/切石模式 */
  _updateViewMode() {
    if (this._viewMode === 'view') {
      // 进入观赏模式：隐藏2D截面，显示3D
      this.sectionGfx.setVisible(false);
      this.stone3dGfx.setVisible(true);
      this.cutLineGfx.setVisible(false);
      this.confirmCutBtn.setVisible(false);
      this.rotateHint.setVisible(true);
      this.actionHint.setText('拖拽旋转石头，查看全方位');

      // 构建网格
      if (this.state === STATE.DRAW_LINE) {
        this._build3DMesh();
        this._renderStone3D();
      }
    } else {
      // 回到切石模式：显示2D截面，隐藏3D
      this.sectionGfx.setVisible(true);
      this.stone3dGfx.setVisible(false);
      this.cutLineGfx.setVisible(true);
      this.rotateHint.setVisible(false);
      this._rotX = 0;
      this._rotY = 0;
      this._velX = 0;
      this._velY = 0;

      if (this.state === STATE.DRAW_LINE) {
        this.actionHint.setText('在石头上拖动画切割线');
        this.takeBtn.setVisible(true);
      }
    }
  }

  _drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x5a3a1a, 0x5a3a1a, 0x3a2210, 0x3a2210, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    g.lineStyle(1, 0x6a4a2a, 0.3);
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 20) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(GAME_CONFIG.WIDTH, y + (Math.random() - 0.5) * 4); g.strokePath();
    }

    g.fillStyle(0x0a1a10, 0.7);
    g.fillRoundedRect(5, 85, 120, GAME_CONFIG.HEIGHT - 130, 8);
    g.lineStyle(1, 0xffcc00, 0.3);
    g.strokeRoundedRect(5, 85, 120, GAME_CONFIG.HEIGHT - 130, 8);

    g.fillStyle(0x1a3320, 0.6);
    g.fillRoundedRect(140, 85, GAME_CONFIG.WIDTH - 155, GAME_CONFIG.HEIGHT - 130, 10);
    g.lineStyle(2, 0xffcc00, 0.3);
    g.strokeRoundedRect(140, 85, GAME_CONFIG.WIDTH - 155, GAME_CONFIG.HEIGHT - 130, 10);

    g.fillStyle(0x444455, 0.5);
    g.fillRoundedRect(this.cutAreaX - SECTION_RADIUS - 15, this.cutAreaY + SECTION_RADIUS + 10,
      (SECTION_RADIUS + 15) * 2, 20, 5);
  }
}