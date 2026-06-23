/**
 * 赌石矿工 - 游戏入口
 * Phaser 游戏配置与启动
 */
import { AUTO, Scale, Game } from 'phaser';
import { GAME_CONFIG } from './data/stoneData.js';
import { BootScene } from './scenes/BootScene.js';
import { PrologueScene } from './scenes/PrologueScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { GameScene } from './scenes/GameScene.js';
import { CutScene } from './scenes/CutScene.js';

const config = {
  type: AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PrologueScene, MenuScene, ShopScene, GameScene, CutScene],
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
    touch: {
      capture: true,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

const game = new Game(config);

const rotateButton = document.getElementById('rotate-lock-button');
const rotateStatus = document.getElementById('rotate-status');

async function requestLandscapeMode() {
  if (!rotateStatus) return;

  rotateStatus.textContent = '正在请求横屏...';

  try {
    const root = document.documentElement;

    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen();
    }

    if (screen.orientation?.lock) {
      await screen.orientation.lock('landscape');
      rotateStatus.textContent = '已进入横屏模式。';
      game.scale.refresh();
      return;
    }

    rotateStatus.textContent = '当前浏览器不支持自动横屏，请手动旋转手机。';
  } catch (error) {
    rotateStatus.textContent = '无法自动横屏，请关闭竖屏锁定后手动旋转手机。';
  }
}

function refreshGameScale() {
  game.scale.refresh();
}

rotateButton?.addEventListener('click', requestLandscapeMode);
window.addEventListener('orientationchange', refreshGameScale);
window.addEventListener('resize', refreshGameScale);
