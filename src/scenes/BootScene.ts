import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COSMETICS } from '../config';

/**
 * BootScene — loads all image assets and shows a progress bar.
 * Falls back to generated placeholders for any missing images.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // ── Loading bar ──────────────────────────────────────────
    const barW = 600;
    const barH = 45;
    const barX = (GAME_WIDTH - barW) / 2;
    const barY = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#3E2723');

    const bg = this.add.graphics();
    bg.fillStyle(0x5D4037, 1);
    bg.fillRect(barX - 6, barY - 6, barW + 12, barH + 12);

    const bar = this.add.graphics();

    const loadingText = this.add.text(GAME_WIDTH / 2, barY - 45, "Loading Natalie's Farm...", {
      fontSize: '36px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFE082',
    }).setOrigin(0.5);

    const pctText = this.add.text(GAME_WIDTH / 2, barY + barH + 30, '0%', {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Failed to load: ${file.key}`);
    });

    // Safety timeout: if loading hangs (e.g. large images on slow WebView),
    // stop the loader and proceed with generated fallback textures.
    let loadComplete = false;
    this.load.on('complete', () => { loadComplete = true; });
    setTimeout(() => {
      if (!loadComplete) {
        console.warn('Loading timed out — proceeding with fallbacks');
        (this.load as any).reset();
        this.generateFallbacks();
        this.scene.start('MenuScene');
      }
    }, 10000);

    this.load.on('progress', (pct: number) => {
      bar.clear();
      bar.fillStyle(COLORS.green, 1);
      bar.fillRect(barX, barY, barW * pct, barH);
      pctText.setText(`${Math.round(pct * 100)}%`);
    });

    // ── Load real image assets ───────────────────────────────

    const sprites = 'assets/sprites';

    // Animals
    const animals = ['horse', 'pig', 'chicken', 'goat', 'sheep', 'bunny', 'cow'];
    const poses = ['idle', 'eating', 'happy', 'dirty', 'clean', 'wet', 'brushed'];
    for (const animal of animals) {
      for (const pose of poses) {
        this.load.image(`${animal}-${pose}`, `${sprites}/${animal}/${animal}-${pose}.png`);
      }
    }

    // Tools
    const tools = ['brush', 'sponge', 'towel', 'broom', 'bucket', 'hose', 'toy', 'rubber-duck', 'worm', 'cowbell', 'shiny-button', 'pompom', 'teddy-bear', 'soft-brush', 'dirt-bucket'];
    for (const tool of tools) {
      this.load.image(`tool-${tool}`, `${sprites}/tools/${tool}.png`);
    }

    // Food
    const foods = ['hay', 'apple', 'carrot', 'slop', 'grass', 'lettuce', 'grain', 'corn', 'water-bucket'];
    for (const food of foods) {
      this.load.image(`food-${food}`, `${sprites}/food/${food}.png`);
    }

    // Environment
    this.load.image('bg-barn', `${sprites}/environment/barn-interior.png`);
    this.load.image('bg-wash', `${sprites}/environment/wash-station.png`);
    this.load.image('bg-feed', `${sprites}/environment/feeding-area.png`);
    this.load.image('env-haybale', `${sprites}/environment/hay-bale.png`);
    this.load.image('env-trough', `${sprites}/environment/water-trough.png`);
    this.load.image('env-lantern', `${sprites}/environment/lantern.png`);
    this.load.image('env-spider-web', `${sprites}/environment/spider-web.png`);

    // Activity icons
    const icons = ['feed', 'brush', 'wash', 'dry', 'barn', 'play'];
    for (const icon of icons) {
      this.load.image(`icon-${icon}`, `${sprites}/ui/icon-${icon}.png`);
    }

    // UI
    this.load.image('ui-star', `${sprites}/ui/star.png`);
    this.load.image('ui-heart', `${sprites}/ui/heart.png`);
    this.load.image('ui-lock', `${sprites}/ui/lock.png`);
    this.load.image('ui-sparkle', `${sprites}/ui/sparkle.png`);
    this.load.image('ui-bubble', `${sprites}/ui/bubble.png`);
    this.load.image('ui-waterdrop', `${sprites}/ui/waterdrop.png`);
    this.load.image('ui-logo', `${sprites}/ui/title-logo.png`);
    this.load.image('ui-wardrobe', `${sprites}/ui/wardrobe.png`);

    // Cosmetics
    for (const cosmetic of COSMETICS) {
      this.load.image(`cosmetic-${cosmetic.id}`, `${sprites}/cosmetics/${cosmetic.id}.png`);
    }
  }

  create(): void {
    this.generateFallbacks();

    // Explicitly trigger font loads — Android WebView won't load @font-face
    // fonts that aren't referenced by HTML/CSS elements, so document.fonts.ready
    // can hang forever. Race against a timeout as a safety net.
    const fontsLoaded = Promise.all([
      document.fonts.load('400 16px Fredoka'),
      document.fonts.load('700 16px Fredoka'),
    ]).catch(() => {});
    const timeout = new Promise(resolve => setTimeout(resolve, 3000));

    Promise.race([fontsLoaded, timeout]).then(() => {
      this.scene.start('MenuScene');
    });
  }

  private generateFallbacks(): void {
    const animals = ['horse', 'pig', 'chicken', 'goat', 'sheep', 'bunny', 'cow'];
    const poses = ['idle', 'eating', 'happy', 'dirty', 'clean', 'wet', 'brushed'];
    const animalColors: Record<string, number> = {
      horse: 0x8B6914, pig: 0xFFB6C1, chicken: 0xFFD700, goat: 0x9E9E9E, sheep: 0xF5F5DC, bunny: 0xD2B48C, cow: 0xF5F5F5,
    };

    for (const animal of animals) {
      for (const pose of poses) {
        const key = `${animal}-${pose}`;
        if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
          this.createFallbackTexture(key, 225, 225, animalColors[animal]);
        }
      }
    }

    // Tool fallbacks
    const tools = ['brush', 'sponge', 'towel', 'broom', 'bucket', 'hose', 'toy', 'rubber-duck', 'worm', 'cowbell', 'shiny-button', 'pompom', 'teddy-bear', 'soft-brush', 'dirt-bucket'];
    for (const tool of tools) {
      const key = `tool-${tool}`;
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
        this.createFallbackTexture(key, 90, 90, 0x8B4513);
      }
    }

    // Food fallbacks
    const foods = ['hay', 'apple', 'carrot', 'slop', 'grass', 'lettuce', 'grain', 'corn', 'water-bucket'];
    for (const food of foods) {
      const key = `food-${food}`;
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
        this.createFallbackTexture(key, 75, 75, 0xFF9800);
      }
    }

    // Activity icon fallbacks
    const iconKeys = ['icon-feed', 'icon-brush', 'icon-wash', 'icon-dry', 'icon-barn', 'icon-play'];
    for (const key of iconKeys) {
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
        this.createFallbackTexture(key, 90, 90, 0xFF9800);
      }
    }

    // UI fallbacks
    const uiKeys = ['ui-star', 'ui-heart', 'ui-lock', 'ui-sparkle', 'ui-bubble', 'ui-waterdrop', 'ui-logo', 'ui-wardrobe'];
    for (const key of uiKeys) {
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
        this.createFallbackTexture(key, 60, 60, 0xFFD700);
      }
    }

    // Environment fallbacks
    const envKeys = ['bg-barn', 'bg-wash', 'bg-feed', 'env-haybale', 'env-trough', 'env-lantern', 'env-spider-web'];
    for (const key of envKeys) {
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
        this.createFallbackTexture(key, 300, 180, 0x8B4513);
      }
    }

    // Cosmetic fallbacks
    for (const cosmetic of COSMETICS) {
      const key = `cosmetic-${cosmetic.id}`;
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') {
        this.createFallbackTexture(key, 90, 90, 0xE91E63);
      }
    }
  }

  private createFallbackTexture(key: string, w: number, h: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 12);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
