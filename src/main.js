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
  render: {
    antialias: true,
  },
};

const game = new Game(config);
