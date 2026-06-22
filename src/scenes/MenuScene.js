/**
 * 主菜单场景 - 处理主菜单、关卡结果、游戏结束等界面
 */
import { Scene } from 'phaser';
import { GAME_CONFIG, LEVEL_CONFIGS, STONE_TYPES, GEM_TYPES } from '../data/stoneData.js';
import { StoneShape } from '../systems/StoneShape.js';

export class MenuScene extends Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.phase = data.phase || 'menu'; // menu | result | gameover
    this.level = data.level || 1;
    this.totalScore = data.totalScore || 0;
    this.levelScore = data.levelScore || 0;
    this.levelConfig = data.levelConfig || LEVEL_CONFIGS[0];
    this.cutResults = data.cutResults || [];
    this.ownedHooks = data.ownedHooks || ['rustHook'];
    this.selectedHook = data.selectedHook || 'rustHook';
  }

  create() {
    switch (this.phase) {
      case 'menu':
        this._showMainMenu();
        break;
      case 'result':
        this._showResult();
        break;
      case 'gameover':
        this._showGameOver();
        break;
    }
  }

  _showMainMenu() {
    // 背景
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2a1a0a, 0x2a1a0a, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // 装饰 - 随机石头
    const stoneKeys = Object.values(STONE_TYPES);
    for (let i = 0; i < 12; i++) {
      const type = stoneKeys[Math.floor(Math.random() * stoneKeys.length)];
      const sx = Math.random() * GAME_CONFIG.WIDTH;
      const sy = 200 + Math.random() * 350;
      const sg = this.add.graphics();
      const pts = StoneShape.generate(sx, sy, 15 + Math.random() * 20, i * 73 + 11, 0.45);
      StoneShape.drawPolygon(sg, pts, type.color, 0.3);
    }

    // 标题
    this.add.text(GAME_CONFIG.WIDTH / 2, 100, '赌 石 矿 工', {
      fontSize: '52px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // 副标题
    this.add.text(GAME_CONFIG.WIDTH / 2, 155, '钩爪抓石，赌石鉴宝', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffffaa',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // 矿工装饰
    this._drawMenuMiner();

    // 开始按钮
    const startBtn = this.add.text(GAME_CONFIG.WIDTH / 2, 280, `下矿 (-${GAME_CONFIG.ENTRY_FEE}手续费)`, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
      backgroundColor: '#55330088',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => {
      startBtn.setStyle({ backgroundColor: '#77440088' });
      this.tweens.add({ targets: startBtn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    startBtn.on('pointerout', () => {
      startBtn.setStyle({ backgroundColor: '#55330088' });
      this.tweens.add({ targets: startBtn, scaleX: 1, scaleY: 1, duration: 100 });
    });
    startBtn.on('pointerdown', () => {
      this.scene.start('ShopScene', {
        level: 1,
        totalScore: GAME_CONFIG.INITIAL_MONEY,
        ownedHooks: ['rustHook'],
        selectedHook: 'rustHook',
      });
    });

    // 回顾剧情按钮
    const storyBtn = this.add.text(GAME_CONFIG.WIDTH / 2, 330, '回顾剧情', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff88',
      backgroundColor: '#33333366',
      padding: { x: 15, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    storyBtn.on('pointerover', () => {
      storyBtn.setStyle({ color: '#ffcc00' });
    });
    storyBtn.on('pointerout', () => {
      storyBtn.setStyle({ color: '#ffffff88' });
    });
    storyBtn.on('pointerdown', () => {
      this.scene.start('PrologueScene');
    });

    // 玩法说明
    const rules = [
      '操作说明：',
      '每次下矿需交500手续费',
      '空格键/点击 - 发射钩爪',
      '石头越重拉回越慢，好钩子拉力更大',
      '钩爪左右摆动，抓住原石拉回',
      '收集原石后进行赌石切石',
      '不同原石出好石的概率不同',
      '达到目标金额即可进入下一关',
    ];

    let ry = 350;
    for (const line of rules) {
      this.add.text(GAME_CONFIG.WIDTH / 2, ry, line, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: line === '操作说明：' ? '#ffcc00' : '#ffffffaa',
        fontStyle: line === '操作说明：' ? 'bold' : 'normal',
      }).setOrigin(0.5);
      ry += 22;
    }

    // 原石图例
    this._drawStoneLegend(ry + 15);
  }

  _drawMenuMiner() {
    const g = this.add.graphics();
    const x = 160;
    const y = 220;

    // 身体
    g.fillStyle(0xd4a574, 1);
    g.fillRect(x - 12, y - 5, 24, 25);
    // 头
    g.fillStyle(0xf0c8a0, 1);
    g.fillCircle(x, y - 15, 12);
    // 安全帽
    g.fillStyle(0xffcc00, 1);
    g.fillRect(x - 14, y - 28, 28, 10);
    g.fillRect(x - 10, y - 32, 20, 6);
    // 帽灯
    g.fillStyle(0xffff00, 0.8);
    g.fillCircle(x, y - 32, 3);
    // 眼睛
    g.fillStyle(0x333333, 1);
    g.fillCircle(x - 4, y - 16, 2);
    g.fillCircle(x + 4, y - 16, 2);
    // 笑嘴
    g.lineStyle(1, 0x333333, 1);
    g.beginPath();
    g.moveTo(x - 4, y - 9);
    g.lineTo(x, y - 7);
    g.lineTo(x + 4, y - 9);
    g.strokePath();
  }

  _drawStoneLegend(startY) {
    const stoneList = Object.values(STONE_TYPES);
    const startX = 80;
    const spacing = 140;

    for (let i = 0; i < stoneList.length; i++) {
      const type = stoneList[i];
      const x = startX + (i % 5) * spacing;
      const y = startY + Math.floor(i / 5) * 50;

      const sg = this.add.graphics();
      const miniPts = StoneShape.generate(x, y, 12, i * 137 + 42, 0.4);
      StoneShape.drawPolygon(sg, miniPts, type.color, 1, 0x000000, 1);

      this.add.text(x + 18, y - 6, type.name, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#ffffff',
      });
      this.add.text(x + 18, y + 6, `好石${Math.round(type.goodRate * 100)}%`, {
        fontSize: '9px',
        fontFamily: 'Arial',
        color: type.goodRate >= 0.5 ? '#66ff66' : '#ff6666',
      });
    }
  }

  _showResult() {
    // 背景
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2a1a0a, 0x2a1a0a, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    const passed = this.levelScore >= this.levelConfig.targetScore;

    // 结果标题
    this.add.text(GAME_CONFIG.WIDTH / 2, 50, passed ? '恭喜过关！' : '未能达标...', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: passed ? '#ffcc00' : '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 统计
    this.add.text(GAME_CONFIG.WIDTH / 2, 110, `第${this.level}关 - ${this.levelConfig.name}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(GAME_CONFIG.WIDTH / 2, 145, `本关收益: ${this.levelScore} / 目标: ${this.levelConfig.targetScore}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: passed ? '#66ff66' : '#ff6666',
    }).setOrigin(0.5);

    this.add.text(GAME_CONFIG.WIDTH / 2, 170, `矿场手续费: -${GAME_CONFIG.ENTRY_FEE}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ff8888',
    }).setOrigin(0.5);

    const moneyColor = this.totalScore < GAME_CONFIG.ENTRY_FEE ? '#ff4444' : '#66ff66';
    this.add.text(GAME_CONFIG.WIDTH / 2, 195, `累计余额: ${this.totalScore}${this.totalScore < GAME_CONFIG.ENTRY_FEE ? ' (不够下次下矿费!)' : ''}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: moneyColor,
      fontStyle: this.totalScore < GAME_CONFIG.ENTRY_FEE ? 'bold' : 'normal',
    }).setOrigin(0.5);

    // 赌石结果列表
    if (this.cutResults.length > 0) {
      this.add.text(GAME_CONFIG.WIDTH / 2, 215, '赌石结果', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffcc00',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const startY = 245;
      const cols = 3;
      const spacingX = 240;
      const spacingY = 50;

      for (let i = 0; i < this.cutResults.length; i++) {
        const result = this.cutResults[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 60 + col * spacingX;
        const y = startY + row * spacingY;

        // 原石名
        this.add.text(x, y, result.type.name, {
          fontSize: '12px',
          fontFamily: 'Arial',
          color: '#aaaaaa',
        });
        // 结果 + 加工类型
        const craftLabel = result.craftType === 'jewelry' ? ' [\u9996\u9970]' : result.craftType === 'ornament' ? ' [\u6446\u4ef6]' : result.craftType === 'sold' ? ' [\u51fa\u552e]' : '';
        const finalVal = result.finalValue || result.gemResult.value;
        this.add.text(x, y + 16, `料子${craftLabel} +${finalVal}`, {
          fontSize: '13px',
          fontFamily: 'Arial',
          color: result.gemResult.isGood ? '#66ff66' : '#ff6666',
          fontStyle: 'bold',
        });
      }
    }

    // 按钮
    const canAfford = this.totalScore >= GAME_CONFIG.ENTRY_FEE;

    if (passed) {
      const nextLevel = this.level + 1;
      const isLast = nextLevel > LEVEL_CONFIGS.length;

      if (canAfford && !isLast) {
        const btn = this.add.text(GAME_CONFIG.WIDTH / 2 - 60, GAME_CONFIG.HEIGHT - 60, '去商店→下一关', {
          fontSize: '18px', fontFamily: 'Arial', color: '#ffcc00',
          fontStyle: 'bold', backgroundColor: '#55330088', padding: { x: 15, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.scene.start('ShopScene', {
            level: nextLevel,
            totalScore: this.totalScore,
            ownedHooks: this.ownedHooks,
            selectedHook: this.selectedHook,
          });
        });
      }

      if (!canAfford) {
        const brokeText = this.add.text(GAME_CONFIG.WIDTH / 2 - 40, GAME_CONFIG.HEIGHT - 60, '余额不足，无法继续下矿!', {
          fontSize: '18px', fontFamily: 'Arial', color: '#ff4444',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
      }

      const restartBtn = this.add.text(GAME_CONFIG.WIDTH / 2 + 100, GAME_CONFIG.HEIGHT - 60, '重新开始', {
        fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
        backgroundColor: '#33333388', padding: { x: 15, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      restartBtn.on('pointerdown', () => {
        this.scene.start('MenuScene', { phase: 'menu' });
      });
    } else {
      // 未过关
      if (canAfford) {
        const retryBtn = this.add.text(GAME_CONFIG.WIDTH / 2 - 80, GAME_CONFIG.HEIGHT - 60, '去商店→重试', {
          fontSize: '18px', fontFamily: 'Arial', color: '#ffcc00',
          backgroundColor: '#55330088', padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        retryBtn.on('pointerdown', () => {
          this.scene.start('ShopScene', {
            level: this.level,
            totalScore: this.totalScore,
            ownedHooks: this.ownedHooks,
            selectedHook: this.selectedHook,
          });
        });
      } else {
        const brokeText = this.add.text(GAME_CONFIG.WIDTH / 2 - 40, GAME_CONFIG.HEIGHT - 90, '余额不足，无法继续下矿!', {
          fontSize: '18px', fontFamily: 'Arial', color: '#ff4444',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
      }

      const menuBtn = this.add.text(GAME_CONFIG.WIDTH / 2 + 80, GAME_CONFIG.HEIGHT - 60, '返回菜单', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#33333388',
        padding: { x: 15, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      menuBtn.on('pointerdown', () => {
        this.scene.start('MenuScene');
      });
    }
  }

  _showGameOver() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2a1a0a, 0x2a1a0a, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    this.add.text(GAME_CONFIG.WIDTH / 2, 200, '游戏结束', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_CONFIG.WIDTH / 2, 280, `最终金额: ${this.totalScore}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    const btn = this.add.text(GAME_CONFIG.WIDTH / 2, 370, '重新开始', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
      backgroundColor: '#55330088',
      padding: { x: 25, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
