/**
 * 矿工角色 - 程序化绘制矿工形象
 */
import { GAME_CONFIG } from '../data/stoneData.js';

export class Miner {
  constructor(scene) {
    this.scene = scene;
    this.x = GAME_CONFIG.CLAB_ORIGIN_X;
    this.y = GAME_CONFIG.MINER_Y;
    this.graphics = scene.add.graphics();
    this._draw();
  }

  _draw() {
    const g = this.graphics;
    const x = this.x;
    const y = this.y;

    g.clear();

    // 身体
    g.fillStyle(0xd4a574, 1); // 肤色
    g.fillRect(x - 12, y - 5, 24, 25);

    // 头
    g.fillStyle(0xf0c8a0, 1);
    g.fillCircle(x, y - 15, 12);

    // 安全帽
    g.fillStyle(0xffcc00, 1);
    g.fillRect(x - 14, y - 28, 28, 10);
    g.fillRect(x - 10, y - 32, 20, 6);

    // 帽灯
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x, y - 32, 3);
    g.fillStyle(0xffff00, 0.8);
    g.fillCircle(x, y - 32, 2);

    // 眼睛
    g.fillStyle(0x333333, 1);
    g.fillCircle(x - 4, y - 16, 2);
    g.fillCircle(x + 4, y - 16, 2);

    // 嘴
    g.lineStyle(1, 0x333333, 1);
    g.beginPath();
    g.moveTo(x - 3, y - 10);
    g.lineTo(x + 3, y - 10);
    g.strokePath();

    // 手臂
    g.fillStyle(0xd4a574, 1);
    g.fillRect(x - 20, y - 2, 10, 5);
    g.fillRect(x + 10, y - 2, 10, 5);

    // 腿
    g.fillStyle(0x556677, 1);
    g.fillRect(x - 10, y + 20, 8, 12);
    g.fillRect(x + 2, y + 20, 8, 12);

    // 靴子
    g.fillStyle(0x443322, 1);
    g.fillRect(x - 12, y + 30, 12, 5);
    g.fillRect(x, y + 30, 12, 5);
  }

  /** 播放拉石头的吃力动画 */
  playPullAnimation() {
    this.scene.tweens.add({
      targets: this.graphics,
      y: 3,
      duration: 150,
      yoyo: true,
      repeat: 0,
    });
  }

  /** 播放收集成功的开心动画 */
  playCollectAnimation() {
    this.scene.tweens.add({
      targets: this.graphics,
      y: -5,
      duration: 100,
      yoyo: true,
      repeat: 1,
    });
  }

  destroy() {
    this.graphics.destroy();
  }
}
