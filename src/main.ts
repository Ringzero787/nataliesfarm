import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BarnScene } from './scenes/BarnScene';
import { FeedingScene } from './scenes/FeedingScene';
import { BrushingScene } from './scenes/BrushingScene';
import { WashingScene } from './scenes/WashingScene';
import { PlayScene } from './scenes/PlayScene';
import { CleaningScene } from './scenes/CleaningScene';
import { WardrobeScene } from './scenes/WardrobeScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: document.body,
  backgroundColor: '#000000',
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
  },
  scene: [BootScene, MenuScene, BarnScene, FeedingScene, BrushingScene, WashingScene, PlayScene, CleaningScene, WardrobeScene],
};

const game = new Phaser.Game(config);

// Render canvas at device pixel ratio for sharp display on high-DPI screens
game.events.on('ready', () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (dpr > 1) {
    const canvas = game.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    game.scale.resize(GAME_WIDTH, GAME_HEIGHT);
  }
});
