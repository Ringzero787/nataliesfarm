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
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [BootScene, MenuScene, BarnScene, FeedingScene, BrushingScene, WashingScene, PlayScene, CleaningScene, WardrobeScene],
};

new Phaser.Game(config);
