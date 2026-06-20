/**
 * 商店场景 - 购买钩子装备
 */
import { Scene } from 'phaser';
import { GAME_CONFIG, HOOK_TYPES } from '../data/stoneData.js';

export class ShopScene extends Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data) {
    this.totalScore = data.totalScore || 0;
    this.ownedHooks = data.ownedHooks || ['rustHook'];
    this.selectedHook = data.selectedHook || 'rustHook';
    this.level = data.level || 1;
  }

  create() {
    // 背景
    const g = this.add.graphics();
    g.fillGradientStyle(0x2a1a0a, 0x2a1a0a, 0x1a0f05, 0x1a0f05, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // 木纹
    g.lineStyle(1, 0x4a3020, 0.3);
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 18) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(GAME_CONFIG.WIDTH, y); g.strokePath();
    }

    // 标题
    this.add.text(GAME_CONFIG.WIDTH / 2, 30, '装 备 商 店', {
      fontSize: '32px', fontFamily: 'Arial', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_CONFIG.WIDTH / 2, 65, '选择你的钩子再下矿', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff88',
    }).setOrigin(0.5);

    // 余额
    this.moneyText = this.add.text(GAME_CONFIG.WIDTH / 2, 90, `余额: ${this.totalScore}`, {
      fontSize: '18px', fontFamily: 'Arial', color: this.totalScore < GAME_CONFIG.ENTRY_FEE ? '#ff4444' : '#66ff66',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 手续费提示
    this.add.text(GAME_CONFIG.WIDTH / 2, 112, `下矿手续费: ${GAME_CONFIG.ENTRY_FEE}`, {
      fontSize: '12px', fontFamily: 'Arial', color: '#ff8888',
    }).setOrigin(0.5);

    // 钩子列表
    this._drawHookItems();

    // 底部按钮
    const goMineBtn = this.add.text(GAME_CONFIG.WIDTH / 2 - 100, GAME_CONFIG.HEIGHT - 45,
      `下矿 (-${GAME_CONFIG.ENTRY_FEE})`, {
        fontSize: '20px', fontFamily: 'Arial',
        color: this.totalScore >= GAME_CONFIG.ENTRY_FEE ? '#ffcc00' : '#666666',
        backgroundColor: this.totalScore >= GAME_CONFIG.ENTRY_FEE ? '#55330088' : '#33333388',
        padding: { x: 15, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    goMineBtn.on('pointerdown', () => {
      if (this.totalScore >= GAME_CONFIG.ENTRY_FEE) {
        this.scene.start('GameScene', {
          level: this.level,
          totalScore: this.totalScore,
          ownedHooks: this.ownedHooks,
          selectedHook: this.selectedHook,
        });
      }
    });

    const backBtn = this.add.text(GAME_CONFIG.WIDTH / 2 + 100, GAME_CONFIG.HEIGHT - 45,
      '返回', {
        fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
        backgroundColor: '#33333388', padding: { x: 15, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', {
        totalScore: this.totalScore,
        ownedHooks: this.ownedHooks,
        selectedHook: this.selectedHook,
      });
    });
  }

  _drawHookItems() {
    const hookList = Object.values(HOOK_TYPES);
    const startY = 140;
    const itemH = 100;

    this.hookItems = [];

    for (let i = 0; i < hookList.length; i++) {
      const hook = hookList[i];
      const y = startY + i * itemH;
      const isOwned = this.ownedHooks.includes(hook.key);
      const isSelected = this.selectedHook === hook.key;

      // 卡片背景
      const card = this.add.graphics();
      const cardX = 80;
      const cardW = GAME_CONFIG.WIDTH - 160;
      const cardH = itemH - 8;

      if (isSelected) {
        card.fillStyle(0x554400, 0.6);
        card.lineStyle(2, 0xffcc00, 0.8);
      } else if (isOwned) {
        card.fillStyle(0x333322, 0.5);
        card.lineStyle(1, 0x66aa66, 0.5);
      } else {
        card.fillStyle(0x222211, 0.4);
        card.lineStyle(1, 0x555555, 0.3);
      }
      card.fillRoundedRect(cardX, y, cardW, cardH, 8);
      card.strokeRoundedRect(cardX, y, cardW, cardH, 8);

      // 钩子图标
      const iconGfx = this.add.graphics();
      iconGfx.fillStyle(hook.color, 1);
      // 简易钩子形状
      iconGfx.fillRect(cardX + 20, y + 15, 3, 25);
      iconGfx.fillTriangle(cardX + 17, y + 40, cardX + 26, y + 40, cardX + 21, y + 50);
      // 绳索
      iconGfx.lineStyle(2, hook.ropeColor, 1);
      iconGfx.beginPath();
      iconGfx.moveTo(cardX + 21, y + 15);
      iconGfx.lineTo(cardX + 21, y + 8);
      iconGfx.strokePath();

      // 名称
      this.add.text(cardX + 45, y + 10, hook.name, {
        fontSize: '18px', fontFamily: 'Arial', color: isSelected ? '#ffcc00' : '#ffffff',
        fontStyle: 'bold',
      });

      // 描述
      this.add.text(cardX + 45, y + 32, hook.description, {
        fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
      });

      // 属性
      const mass = 3.0; // 参考石头质量
      const refSpeed = (hook.pullForce / mass) * 2.0;
      this.add.text(cardX + 45, y + 50, `拉力: ${hook.pullForce}  |  拉参考石速度: ${refSpeed.toFixed(1)}`, {
        fontSize: '11px', fontFamily: 'Arial', color: '#88aacc',
      });

      // 状态按钮
      const btnX = cardX + cardW - 80;
      const btnY = y + cardH / 2;

      if (isOwned && !isSelected) {
        const selectBtn = this.add.text(btnX, btnY, '装备', {
          fontSize: '14px', fontFamily: 'Arial', color: '#66ff66',
          backgroundColor: '#33553388', padding: { x: 10, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        selectBtn.on('pointerdown', () => {
          this.selectedHook = hook.key;
          this.scene.restart({
            totalScore: this.totalScore,
            ownedHooks: this.ownedHooks,
            selectedHook: this.selectedHook,
            level: this.level,
          });
        });
      } else if (isSelected) {
        this.add.text(btnX, btnY, '使用中', {
          fontSize: '14px', fontFamily: 'Arial', color: '#ffcc00',
          backgroundColor: '#55440088', padding: { x: 10, y: 4 },
        }).setOrigin(0.5);
      } else if (!isOwned) {
        const canBuy = this.totalScore >= hook.price;
        const buyBtn = this.add.text(btnX, btnY, `${hook.price}购买`, {
          fontSize: '14px', fontFamily: 'Arial',
          color: canBuy ? '#ffcc00' : '#666666',
          backgroundColor: canBuy ? '#55330088' : '#33333366',
          padding: { x: 10, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        buyBtn.on('pointerdown', () => {
          if (canBuy) {
            this.totalScore -= hook.price;
            this.ownedHooks.push(hook.key);
            this.selectedHook = hook.key;
            this.scene.restart({
              totalScore: this.totalScore,
              ownedHooks: this.ownedHooks,
              selectedHook: this.selectedHook,
              level: this.level,
            });
          }
        });
      }

      this.hookItems.push({ hook, card, isOwned, isSelected });
    }
  }
}