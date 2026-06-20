/**
 * 原石实体 - 不规则形状程序化绘制
 */
import { GameObjects } from 'phaser';
import { STONE_TYPES } from '../data/stoneData.js';
import { StoneShape } from '../systems/StoneShape.js';

let _stoneIdCounter = 1;

export class Stone extends GameObjects.Container {
  constructor(scene, x, y, stoneType) {
    super(scene, x, y);

    this.stoneType = stoneType;
    this.stoneSize = stoneType.size;
    this.isGrabbed = false;
    this.isCollected = false;

    // 每块石头用唯一种子生成独特形状
    this.shapeSeed = _stoneIdCounter++;

    // 生成不规则轮廓
    this.shapePoints = StoneShape.generate(0, 0, this.stoneSize, this.shapeSeed, 0.45);

    // 原石图形（作为Container子元素）
    this.stoneGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    this._drawStone();

    // 名称标签（挖矿时不显示）
    this.nameLabel = scene.make.text({
      x: 0, y: -this.stoneSize - 8, text: stoneType.name, add: false,
      style: {
        fontSize: '10px', fontFamily: 'Arial', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 3, y: 1 },
      }
    }).setOrigin(0.5).setVisible(false);

    this.add([this.stoneGraphics, this.nameLabel]);
    scene.add.existing(this);
  }

  _drawStone() {
    const g = this.stoneGraphics;
    const s = this.stoneSize;
    const color = this.stoneType.color;
    const highlight = this.stoneType.highlight;

    g.clear();

    // 阴影
    const shadowPoints = this.shapePoints.map(p => ({ x: p.x + 3, y: p.y + 3 }));
    StoneShape.drawPolygon(g, shadowPoints, 0x000000, 0.3);

    // 主体 - 不规则多边形
    StoneShape.drawPolygon(g, this.shapePoints, color, 1, 0x000000, 2);

    // 纹理
    StoneShape.drawStoneTexture(g, this.shapePoints, 0, 0, s, this.shapeSeed, color, highlight);

    // 类型特殊纹理
    this._drawTypeSpecificTexture(g);
  }

  _drawTypeSpecificTexture(g) {
    const s = this.stoneSize;
    const rng = StoneShape._seededRandom(this.shapeSeed + 50);

    switch (this.stoneType.key) {
      case 'huipishi': // 灰皮石 - 粗糙斑点
        g.fillStyle(this.stoneType.highlight, 0.5);
        for (let i = 0; i < 4; i++) {
          const px = (rng() - 0.5) * s * 0.8;
          const py = (rng() - 0.5) * s * 0.8;
          g.fillCircle(px, py, 3 + rng() * 4);
        }
        break;
      case 'huangshapi': // 黄沙皮 - 沙粒
        g.fillStyle(this.stoneType.highlight, 0.5);
        for (let i = 0; i < 6; i++) {
          const px = (rng() - 0.5) * s * 0.8;
          const py = (rng() - 0.5) * s * 0.8;
          g.fillCircle(px, py, 1.5 + rng() * 2.5);
        }
        break;
      case 'heiWusha': // 黑乌砂 - 暗纹线
        g.lineStyle(1.5, 0x555555, 0.4);
        for (let i = 0; i < 3; i++) {
          const y = -s * 0.4 + (i + 1) * s * 0.3;
          g.beginPath();
          g.moveTo(-s * 0.5, y);
          g.lineTo(s * 0.5, y + (rng() - 0.5) * 5);
          g.strokePath();
        }
        break;
      case 'baiyansha': // 白盐沙 - 闪烁点
        g.fillStyle(0xffffff, 0.6);
        for (let i = 0; i < 5; i++) {
          const px = (rng() - 0.5) * s * 0.7;
          const py = (rng() - 0.5) * s * 0.7;
          g.fillCircle(px, py, 1.5);
        }
        break;
      case 'moxisha': // 莫西沙 - 场口标记带
        g.fillStyle(0x887766, 0.5);
        g.fillRect(-s * 0.35, -s * 0.12, s * 0.7, s * 0.24);
        g.lineStyle(1.5, 0xaa9988, 0.6);
        g.strokeRect(-s * 0.35, -s * 0.12, s * 0.7, s * 0.24);
        break;
    }
  }

  showLabel() {
    this.nameLabel.setVisible(true);
  }

  playGrabEffect() {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.9, scaleY: 0.9,
      duration: 100, yoyo: true,
    });
  }
}
