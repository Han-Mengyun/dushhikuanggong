/**
 * 挖矿游戏主场景 - 黄金矿工式操控钩爪抓取原石
 */
import { Scene } from 'phaser';
import { GAME_CONFIG, LEVEL_CONFIGS, HOOK_TYPES, calcPullSpeed } from '../data/stoneData.js';
import { Claw, CLAW_STATE } from '../entities/Claw.js';
import { Stone } from '../entities/Stone.js';
import { Miner } from '../entities/Miner.js';
import { StoneGenerator } from '../systems/StoneGenerator.js';

export class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.level = data.level || 1;
    this.totalScore = data.totalScore || 0;
    this.ownedHooks = data.ownedHooks || ['rustHook'];
    this.selectedHook = data.selectedHook || 'rustHook';
    this.hookType = HOOK_TYPES[this.selectedHook] || HOOK_TYPES.rustHook;
    this.collectedStones = [];
    this.stoneSprites = [];
    this.timeLeft = 0;
    this.gameOver = false;
    this.feePaid = false;
  }

  create() {
    const config = this._getLevelConfig();

    // 扣除手续费
    this.totalScore -= GAME_CONFIG.ENTRY_FEE;
    this.feePaid = true;

    // 背景
    this._drawBackground();

    // 矿工
    this.miner = new Miner(this);

    // 生成原石
    this._generateStones(config);

    // 钩爪（传入钩子类型）
    this.claw = new Claw(this, this.hookType);

    // HUD
    this._createHUD(config);

    // 计时器
    this.timeLeft = config.timeLimit;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => this._onTimerTick(),
      loop: true,
    });

    // 输入
    this.input.keyboard.on('keydown-SPACE', () => this.claw.fire());
    this.input.on('pointerdown', () => this.claw.fire());

    // 手续费扣除提示
    this._showFeeDeduction();

    // 提示文本
    this.tipText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 20,
      '按空格键或点击屏幕发射钩爪', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff88',
      }).setOrigin(0.5);
  }

  update(time, delta) {
    if (this.gameOver) return;
    this.claw.update(delta);
  }

  /** 显示手续费扣除提示 */
  _showFeeDeduction() {
    const feeText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
      `矿场手续费 -${GAME_CONFIG.ENTRY_FEE}`, {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);

    this.tweens.add({
      targets: feeText,
      y: GAME_CONFIG.HEIGHT / 2 - 40,
      alpha: 0,
      duration: 2000,
      delay: 800,
      ease: 'Cubic.easeOut',
    });
  }

  _getLevelConfig() {
    const idx = Math.min(this.level - 1, LEVEL_CONFIGS.length - 1);
    return LEVEL_CONFIGS[idx];
  }

  _drawBackground() {
    const g = this.add.graphics();

    // 天空渐变
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f0ff, 0xe0f0ff, 1);
    g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.GROUND_Y);

    // 地面
    g.fillStyle(0x8b7355, 1);
    g.fillRect(0, GAME_CONFIG.GROUND_Y - 5, GAME_CONFIG.WIDTH, 5);

    // 地下渐变（从浅到深）
    g.fillGradientStyle(0x6b5335, 0x6b5335, 0x2a1a0a, 0x2a1a0a, 1);
    g.fillRect(0, GAME_CONFIG.GROUND_Y, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT - GAME_CONFIG.GROUND_Y);

    // 地下纹理 - 随机点缀一些岩层纹理
    g.fillStyle(0x5a4328, 0.3);
    for (let i = 0; i < 15; i++) {
      const rx = Math.random() * GAME_CONFIG.WIDTH;
      const ry = GAME_CONFIG.GROUND_Y + 20 + Math.random() * (GAME_CONFIG.HEIGHT - GAME_CONFIG.GROUND_Y - 40);
      const rw = 30 + Math.random() * 60;
      g.fillRect(rx, ry, rw, 2);
    }

    // 小碎石点缀
    g.fillStyle(0x7a6348, 0.4);
    for (let i = 0; i < 20; i++) {
      const rx = Math.random() * GAME_CONFIG.WIDTH;
      const ry = GAME_CONFIG.GROUND_Y + 30 + Math.random() * (GAME_CONFIG.HEIGHT - GAME_CONFIG.GROUND_Y - 60);
      g.fillCircle(rx, ry, 2 + Math.random() * 3);
    }
  }

  _generateStones(config) {
    const stoneDataList = StoneGenerator.generate(config.stoneCount, this.level);

    for (const data of stoneDataList) {
      const stone = new Stone(this, data.x, data.y, data.type);
      stone.id = data.id;
      this.stoneSprites.push(stone);
    }
  }

  _createHUD(config) {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.5);
    hudBg.fillRect(0, 0, GAME_CONFIG.WIDTH, 35);

    this.levelText = this.add.text(10, 8, `第${this.level}关 - ${config.name}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
    });

    this.scoreText = this.add.text(220, 8, `金额: ${this.totalScore} (费-${GAME_CONFIG.ENTRY_FEE})`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: this.totalScore < 0 ? '#ff4444' : '#ffffff',
    });

    this.targetText = this.add.text(430, 8, `目标: ${config.targetScore}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ff6666',
    });

    this.timeText = this.add.text(620, 8, `时间: ${config.timeLimit}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#66ff66',
    });

    this.stoneCountText = this.add.text(740, 8, `石: 0`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaff',
    });

    // 钩子信息
    this.add.text(10, 24, `钩: ${this.hookType.name}`, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#88aacc',
    });
  }

  _onTimerTick() {
    if (this.gameOver) return;
    this.timeLeft--;
    this.timeText.setText(`时间: ${this.timeLeft}`);

    if (this.timeLeft <= 10) {
      this.timeText.setColor('#ff4444');
    }

    if (this.timeLeft <= 0) {
      this._endMining();
    }
  }

  /** 收集石头回调 */
  collectStone(stone) {
    if (stone.isCollected) return;
    stone.isCollected = true;

    // 从精灵列表移除
    const idx = this.stoneSprites.indexOf(stone);
    if (idx >= 0) {
      this.stoneSprites.splice(idx, 1);
    }

    // 添加到收集列表
    this.collectedStones.push({
      type: stone.stoneType,
      id: stone.id,
    });

    // 销毁精灵
    stone.destroy();

    // 更新UI
    this.stoneCountText.setText(`石: ${this.collectedStones.length}`);

    // 矿工收集动画
    this.miner.playCollectAnimation();
  }

  _endMining() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.timerEvent.remove();

    // 显示过渡文本
    const msg = this.collectedStones.length > 0
      ? `挖矿结束！收集了 ${this.collectedStones.length} 块原石\n准备赌石...`
      : '时间到！没有收集到原石...';

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    const endText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, msg, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 延时跳转到赌石场景
    this.time.delayedCall(2000, () => {
      this.scene.start('CutScene', {
        collectedStones: this.collectedStones,
        level: this.level,
        totalScore: this.totalScore,
        levelConfig: this._getLevelConfig(),
        ownedHooks: this.ownedHooks,
        selectedHook: this.selectedHook,
      });
    });
  }
}
