/**
 * 故事序幕场景 - 展示破产继承矿场的剧情
 * 打字机效果逐字显示故事文本，配合场景画面
 */
import { Scene } from 'phaser';
import { GAME_CONFIG } from '../data/stoneData.js';

// 剧情段落
const STORY_PARAGRAPHS = [
  {
    bg: 'city',  // 城市背景
    lines: [
      '我叫林石，曾是个风光无限的商人。',
      '投资失败，负债累累，一夜之间倾家荡产。',
      '债主逼上门来，我几乎走投无路......',
    ],
  },
  {
    bg: 'letter', // 信件背景
    lines: [
      '就在绝望之际，一封招工信寄到了我手上——',
      '远在云南的一座矿场，正在招募赌石工。',
      '每进一次矿场，得先交500块手续费。',
    ],
  },
  {
    bg: 'mine', // 矿场背景
    lines: [
      '矿场老把头告诉我：',
      '"这里面的石头，谁也说不准。"',
      '"一刀穷一刀富，全凭眼力和胆识。"',
      '"交了钱就能下矿，挖到什么全看命。"',
    ],
  },
  {
    bg: 'resolve', // 决心背景
    lines: [
      '我东拼西凑，勉强凑够了手续费。',
      '交钱下矿，背水一战！',
      '赌石矿工，开工！',
    ],
  },
];

export class PrologueScene extends Scene {
  constructor() {
    super({ key: 'PrologueScene' });
  }

  create() {
    this.currentParagraph = 0;
    this.currentLine = 0;
    this.currentChar = 0;
    this.isTyping = false;
    this.typingComplete = false;
    this.allComplete = false;

    // 故事文本容器
    this.textLines = [];
    this.textObjects = [];

    // 创建背景
    this.bgGraphics = this.add.graphics();
    this._drawBackground('city');

    // 黑色半透明遮罩（让文字更清晰）
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.55);
    this.overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // 文本区域
    this.textContainer = this.add.container(0, 0);

    // 提示文字
    this.hintText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 40,
      '点击继续', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff66',
      }).setOrigin(0.5).setVisible(false);

    // 闪烁提示
    this.tweens.add({
      targets: this.hintText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // 输入：点击加速或跳过
    this.input.on('pointerdown', () => this._onTap());
    this.input.keyboard.on('keydown-SPACE', () => this._onTap());

    // 开始第一段
    this._startParagraph(0);
  }

  _onTap() {
    if (this.allComplete) {
      // 剧情全部结束，进入主菜单
      this.scene.start('MenuScene');
      return;
    }

    if (this.isTyping) {
      // 正在打字，点击则完成当前行
      this._completeCurrentLine();
    } else if (this.typingComplete) {
      // 当前段落完成，进入下一段
      this._nextParagraph();
    }
  }

  _startParagraph(index) {
    if (index >= STORY_PARAGRAPHS.length) {
      this._finishPrologue();
      return;
    }

    this.currentParagraph = index;
    this.currentLine = 0;
    this.currentChar = 0;
    this.isTyping = false;
    this.typingComplete = false;
    this.hintText.setVisible(false);

    // 淡出旧文本
    const oldTexts = [...this.textObjects];
    if (oldTexts.length > 0) {
      this.tweens.add({
        targets: oldTexts,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          for (const obj of oldTexts) obj.destroy();
        },
      });
    }
    this.textObjects = [];
    this.textLines = [];

    // 淡入新背景
    this._drawBackground(STORY_PARAGRAPHS[index].bg);
    this.overlay.clear();
    this.overlay.fillStyle(0x000000, 0.55);
    this.overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    this.overlay.setAlpha(0);
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 500,
    });

    // 延时后开始打字
    this.time.delayedCall(600, () => this._typeNextLine());
  }

  _typeNextLine() {
    const para = STORY_PARAGRAPHS[this.currentParagraph];
    if (this.currentLine >= para.lines.length) {
      // 段落结束
      this.isTyping = false;
      this.typingComplete = true;
      this.hintText.setVisible(true);
      return;
    }

    this.isTyping = true;
    this.currentChar = 0;

    const lineText = para.lines[this.currentLine];
    const yPos = 200 + this.currentLine * 55;

    const textObj = this.add.text(80, yPos, '', {
      fontSize: '22px',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      lineSpacing: 8,
    });
    textObj.setAlpha(0);
    this.tweens.add({
      targets: textObj,
      alpha: 1,
      duration: 300,
    });

    this.textObjects.push(textObj);
    this._typeLine(textObj, lineText);
  }

  _typeLine(textObj, fullText) {
    if (this.currentChar >= fullText.length) {
      this.isTyping = false;
      this.currentLine++;
      // 短暂停顿后开始下一行
      this.time.delayedCall(300, () => this._typeNextLine());
      return;
    }

    this.currentChar++;
    textObj.setText(fullText.substring(0, this.currentChar));

    // 打字速度：普通字符40ms，标点80ms
    const char = fullText[this.currentChar - 1];
    const delay = '，。！？、；：'.includes(char) ? 80 : 40;

    this.time.delayedCall(delay, () => this._typeLine(textObj, fullText));
  }

  _completeCurrentLine() {
    // 立即显示当前行的全部文字
    const para = STORY_PARAGRAPHS[this.currentParagraph];
    if (this.currentLine < para.lines.length) {
      const textObj = this.textObjects[this.textObjects.length - 1];
      if (textObj) {
        textObj.setText(para.lines[this.currentLine]);
      }
      this.isTyping = false;
      this.currentLine++;
      this.time.delayedCall(100, () => this._typeNextLine());
    }
  }

  _nextParagraph() {
    this._startParagraph(this.currentParagraph + 1);
  }

  _finishPrologue() {
    this.allComplete = true;
    this.hintText.setVisible(false);

    // 所有文本淡出
    this.tweens.add({
      targets: this.textObjects,
      alpha: 0,
      duration: 800,
    });

    // 遮罩淡出
    this.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration: 800,
    });

    // 黑屏淡入后跳转
    const fadeOverlay = this.add.graphics();
    fadeOverlay.fillStyle(0x000000, 1);
    fadeOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    fadeOverlay.setAlpha(0);
    this.tweens.add({
      targets: fadeOverlay,
      alpha: 1,
      duration: 1500,
      onComplete: () => {
        this.scene.start('MenuScene');
      },
    });
  }

  _drawBackground(type) {
    const g = this.bgGraphics;
    g.clear();

    switch (type) {
      case 'city':
        // 城市夜景 - 暗蓝色调
        g.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a1a3a, 0x1a1a3a, 1);
        g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        // 建筑剪影
        g.fillStyle(0x111122, 1);
        g.fillRect(50, 250, 60, 200);
        g.fillRect(130, 200, 50, 250);
        g.fillRect(200, 280, 70, 170);
        g.fillRect(290, 220, 45, 230);
        g.fillRect(360, 260, 80, 190);
        g.fillRect(460, 190, 55, 260);
        g.fillRect(540, 240, 65, 210);
        g.fillRect(630, 210, 50, 240);
        g.fillRect(700, 270, 60, 180);
        // 窗户灯光
        g.fillStyle(0xffcc44, 0.6);
        const buildings = [[60,270],[140,220],[210,300],[300,240],[370,280],[470,210],[550,260],[640,230],[710,290]];
        for (const [bx, by] of buildings) {
          for (let wy = 0; wy < 5; wy++) {
            if (Math.random() > 0.3) {
              g.fillRect(bx + 5 + Math.random()*20, by + wy * 35, 8, 6);
            }
          }
        }
        // 月亮
        g.fillStyle(0xeeeecc, 0.8);
        g.fillCircle(680, 60, 25);
        g.fillStyle(0x0a0a2a, 0.8);
        g.fillCircle(690, 55, 22);
        break;

      case 'letter':
        // 桌面上的信件
        g.fillGradientStyle(0x2a1a0a, 0x2a1a0a, 0x1a0f05, 0x1a0f05, 1);
        g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        // 桌面
        g.fillStyle(0x4a3020, 1);
        g.fillRect(0, 300, GAME_CONFIG.WIDTH, 300);
        g.lineStyle(1, 0x5a4030, 0.5);
        for (let y = 300; y < 600; y += 15) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(GAME_CONFIG.WIDTH, y);
          g.strokePath();
        }
        // 信纸
        g.fillStyle(0xf5e8c8, 1);
        g.fillRoundedRect(200, 150, 400, 180, 5);
        g.lineStyle(2, 0xccbbaa, 0.5);
        g.strokeRoundedRect(200, 150, 400, 180, 5);
        // 信纸横线
        g.lineStyle(1, 0xccccbb, 0.3);
        for (let y = 175; y < 320; y += 12) {
          g.beginPath();
          g.moveTo(215, y);
          g.lineTo(585, y);
          g.strokePath();
        }
        // 信纸上的模糊文字（装饰）
        g.fillStyle(0x888877, 0.2);
        g.fillRect(215, 180, 200, 3);
        g.fillRect(215, 200, 340, 3);
        g.fillRect(215, 220, 300, 3);
        g.fillRect(215, 240, 360, 3);
        // 印章
        g.fillStyle(0xcc3333, 0.7);
        g.fillCircle(520, 280, 20);
        g.fillStyle(0xf5e8c8, 0.8);
        g.fillCircle(520, 280, 16);
        g.fillStyle(0xcc3333, 0.7);
        g.fillRect(512, 272, 16, 16);
        break;

      case 'mine':
        // 矿场
        g.fillGradientStyle(0x3a5a3a, 0x3a5a3a, 0x2a1a0a, 0x2a1a0a, 1);
        g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        // 山脉
        g.fillStyle(0x2a4a2a, 1);
        g.beginPath();
        g.moveTo(0, 300);
        g.lineTo(150, 150);
        g.lineTo(300, 280);
        g.lineTo(400, 120);
        g.lineTo(550, 250);
        g.lineTo(650, 160);
        g.lineTo(800, 220);
        g.lineTo(800, 300);
        g.closePath();
        g.fillPath();
        // 矿洞入口
        g.fillStyle(0x1a0a00, 1);
        g.beginPath();
        g.moveTo(350, 350);
        g.lineTo(370, 280);
        g.arc(400, 280, 30, Math.PI, 0, false);
        g.lineTo(450, 350);
        g.closePath();
        g.fillPath();
        // 矿洞木架
        g.fillStyle(0x8b6914, 1);
        g.fillRect(348, 278, 6, 75);
        g.fillRect(446, 278, 6, 75);
        g.fillRect(348, 275, 104, 6);
        // 地面
        g.fillStyle(0x5a4a30, 1);
        g.fillRect(0, 350, GAME_CONFIG.WIDTH, 250);
        // 小石头
        g.fillStyle(0x777777, 0.6);
        g.fillCircle(200, 380, 8);
        g.fillCircle(500, 400, 10);
        g.fillCircle(650, 370, 6);
        g.fillCircle(150, 420, 7);
        break;

      case 'resolve':
        // 决心 - 朝阳下的背影
        g.fillGradientStyle(0x1a0a00, 0x1a0a00, 0xff8844, 0xff8844, 1);
        g.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        // 朝阳
        g.fillStyle(0xffcc66, 0.8);
        g.fillCircle(400, 350, 80);
        g.fillStyle(0xffaa33, 0.5);
        g.fillCircle(400, 350, 120);
        g.fillStyle(0xff8844, 0.3);
        g.fillCircle(400, 350, 180);
        // 人影剪影
        g.fillStyle(0x0a0500, 1);
        // 头
        g.fillCircle(400, 260, 14);
        // 身体
        g.fillRect(390, 274, 20, 40);
        // 腿
        g.fillRect(388, 314, 10, 30);
        g.fillRect(402, 314, 10, 30);
        // 手臂（一手叉腰，一手前伸指远方）
        g.fillRect(378, 280, 14, 6);
        g.fillRect(408, 278, 6, 4);
        g.fillRect(414, 276, 20, 4);
        // 地面
        g.fillStyle(0x1a0a00, 0.8);
        g.fillRect(0, 350, GAME_CONFIG.WIDTH, 250);
        // 远处的矿场轮廓
        g.fillStyle(0x2a1a0a, 0.5);
        g.beginPath();
        g.moveTo(550, 350);
        g.lineTo(580, 300);
        g.lineTo(620, 330);
        g.lineTo(650, 280);
        g.lineTo(700, 320);
        g.lineTo(750, 300);
        g.lineTo(800, 330);
        g.lineTo(800, 350);
        g.closePath();
        g.fillPath();
        break;
    }
  }
}
