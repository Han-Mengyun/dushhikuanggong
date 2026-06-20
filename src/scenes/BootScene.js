/**
 * 启动场景 - 资源预加载（本游戏全部程序化绘制，无需加载外部资源）
 */
import { Scene } from 'phaser';
import { GAME_CONFIG } from '../data/stoneData.js';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // 显示加载文字
    const g = this.add.graphics();
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, '赌石矿工', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 40, '加载中...', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff88',
    }).setOrigin(0.5);

    // 短暂延时后进入剧情序幕
    this.time.delayedCall(800, () => {
      this.scene.start('PrologueScene');
    });
  }
}
