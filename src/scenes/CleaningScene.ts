import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ACTIVITY_NEED_EFFECTS, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager, StarAwardResult } from '../SaveManager';

/**
 * CleaningScene — sweep the barn floor with a broom.
 * Dirt piles and hay scatter across the floor. Drag the broom to sweep them
 * into a pile. Animal watches and reacts happily as the barn gets clean.
 */
export class CleaningScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private progress = 0;
  private progressFill!: Phaser.GameObjects.Graphics;
  private animalContainer!: Phaser.GameObjects.Container;
  private animalSprite!: Phaser.GameObjects.Image;
  private broom!: Phaser.GameObjects.Image;
  private completed = false;
  private dirtSpots: Phaser.GameObjects.Graphics[] = [];
  private totalDirt = 0;
  private cleanedDirt = 0;

  constructor() {
    super({ key: 'CleaningScene' });
  }

  init(data: { animal?: AnimalType }): void {
    this.currentAnimal = data.animal ?? 'horse';
    this.progress = 0;
    this.completed = false;
    this.dirtSpots = [];
    this.cleanedDirt = 0;
  }

  create(): void {
    this.drawBackground();
    this.placeAnimal();
    this.createDirtPiles();
    this.createProgressBar();
    this.createBroom();
    this.createUI();
    this.cameras.main.fadeIn(300);
  }

  private drawBackground(): void {
    if (this.textures.exists('bg-barn') && this.textures.get('bg-barn').key !== '__MISSING') {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-barn')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      const g = this.add.graphics();
      g.fillStyle(COLORS.barnWall, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.lineStyle(1, 0x7A3B10, 0.3);
      for (let y = 0; y < GAME_HEIGHT; y += 40) {
        g.lineBetween(0, y, GAME_WIDTH, y);
      }
      g.fillStyle(COLORS.barnFloor, 1);
      g.fillRect(0, GAME_HEIGHT - 150, GAME_WIDTH, 150);
    }

    this.add.text(GAME_WIDTH / 2, 30, 'Cleaning Time!', {
      fontSize: '54px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Sweep the barn floor clean!', {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFE082',
      stroke: '#5D4037',
      strokeThickness: 5,
    }).setOrigin(0.5);
  }

  private placeAnimal(): void {
    const ax = GAME_WIDTH - 270;
    const ay = GAME_HEIGHT * 0.45;

    this.animalContainer = this.add.container(ax, ay);
    this.animalSprite = this.add.image(0, 0, `${this.currentAnimal}-idle`).setScale(0.35);
    this.animalContainer.add(this.animalSprite);

    const cosmeticId = SaveManager.getEquippedCosmetic(this.currentAnimal);
    if (cosmeticId) {
      const cosmeticDef = COSMETICS.find(c => c.id === cosmeticId);
      if (cosmeticDef) {
        const cosmeticKey = `cosmetic-${cosmeticId}`;
        if (this.textures.exists(cosmeticKey)) {
          const savedPos = SaveManager.getCosmeticPosition(this.currentAnimal);
          const cx = savedPos ? savedPos.x : 0;
          const cy = savedPos ? savedPos.y : cosmeticDef.offsetY;
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(0.2);
          this.animalContainer.add(cosmetic);
        }
      }
    }

    this.tweens.add({
      targets: this.animalContainer,
      scaleY: 1.02,
      scaleX: 0.98,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createDirtPiles(): void {
    const floorY = GAME_HEIGHT - 150;
    const dirtPositions: { x: number; y: number; size: number; type: 'dirt' | 'hay' | 'mud' }[] = [];

    for (let i = 0; i < 12; i++) {
      dirtPositions.push({
        x: 120 + Math.random() * (GAME_WIDTH - 525),
        y: floorY + 30 + Math.random() * 150,
        size: 23 + Math.random() * 38,
        type: ['dirt', 'hay', 'mud'][Math.floor(Math.random() * 3)] as 'dirt' | 'hay' | 'mud',
      });
    }

    this.totalDirt = dirtPositions.length;

    dirtPositions.forEach((pos) => {
      const dirt = this.add.graphics();
      const colors = { dirt: 0x5D4037, hay: 0xDAA520, mud: 0x795548 };
      const color = colors[pos.type];

      dirt.fillStyle(color, 0.8);
      dirt.fillCircle(pos.x, pos.y, pos.size);
      dirt.fillCircle(pos.x + pos.size * 0.4, pos.y - pos.size * 0.2, pos.size * 0.7);
      dirt.fillCircle(pos.x - pos.size * 0.3, pos.y + pos.size * 0.3, pos.size * 0.6);

      if (pos.type === 'hay') {
        dirt.lineStyle(3, 0xB8860B, 0.6);
        for (let j = 0; j < 4; j++) {
          const angle = Math.random() * Math.PI * 2;
          dirt.lineBetween(
            pos.x, pos.y,
            pos.x + Math.cos(angle) * pos.size * 1.2,
            pos.y + Math.sin(angle) * pos.size * 0.8,
          );
        }
      }

      (dirt as any)._cx = pos.x;
      (dirt as any)._cy = pos.y;
      (dirt as any)._radius = pos.size + 15;
      (dirt as any)._cleaned = false;

      this.dirtSpots.push(dirt);
    });
  }

  private createProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    const bg = this.add.graphics();
    bg.fillStyle(0x5D4037, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 9);
    bg.lineStyle(3, 0x3E2723);
    bg.strokeRoundedRect(barX, barY, barW, barH, 9);
    this.progressFill = this.add.graphics();
    this.add.text(barX - 15, barY + 12, '🧹', { fontSize: '30px' }).setOrigin(1, 0.5);
  }

  private updateProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    this.progressFill.clear();
    this.progressFill.fillStyle(0x795548, 1);
    const fillW = Math.min(barW * this.progress, barW);
    if (fillW > 0) {
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 9);
    }
  }

  private createBroom(): void {
    this.broom = this.add.image(225, GAME_HEIGHT / 2 - 30, 'tool-broom')
      .setScale(0.30)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(this.broom);

    this.broom.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.broom.x = dragX;
      this.broom.y = dragY;

      if (this.completed) return;

      for (const dirt of this.dirtSpots) {
        if ((dirt as any)._cleaned) continue;

        const cx = (dirt as any)._cx;
        const cy = (dirt as any)._cy;
        const radius = (dirt as any)._radius;

        const dist = Phaser.Math.Distance.Between(dragX, dragY, cx, cy);
        if (dist < radius + 30) {
          this.cleanDirt(dirt);
        }
      }
    });
  }

  private cleanDirt(dirt: Phaser.GameObjects.Graphics): void {
    if ((dirt as any)._cleaned) return;
    (dirt as any)._cleaned = true;
    this.cleanedDirt++;

    const cx = (dirt as any)._cx;
    const cy = (dirt as any)._cy;

    this.tweens.add({
      targets: dirt,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
    });

    getSoundManager(this).playSweep();
    for (let i = 0; i < 5; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xBCAAA4, 0.6);
      particle.fillCircle(cx, cy, 6);

      this.tweens.add({
        targets: particle,
        x: Phaser.Math.Between(-60, 60),
        y: Phaser.Math.Between(-45, -90),
        alpha: 0,
        duration: 400 + i * 50,
        onComplete: () => particle.destroy(),
      });
    }

    this.progress = this.cleanedDirt / this.totalDirt;
    this.updateProgressBar();

    if (this.cleanedDirt === Math.floor(this.totalDirt / 2)) {
      this.animalSprite.setTexture(`${this.currentAnimal}-happy`);
      this.animalBounce();
    }

    if (this.progress >= 1 && !this.completed) {
      this.completed = true;
      this.animalSprite.setTexture(`${this.currentAnimal}-happy`);
      getSoundManager(this).playSuccess();

      const effects = ACTIVITY_NEED_EFFECTS.cleaning;
      SaveManager.restoreNeeds(this.currentAnimal, effects);
      const result = SaveManager.awardStar(this.currentAnimal, 'cleaning');
      this.showCompletion(result);
    }
  }

  private animalBounce(): void {
    this.tweens.add({
      targets: this.animalContainer,
      y: this.animalContainer.y - 23,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    const heart = this.add.image(
      this.animalContainer.x + Phaser.Math.Between(-30, 30),
      this.animalContainer.y - 90,
      'ui-heart',
    ).setScale(0.045);
    this.tweens.add({
      targets: heart,
      y: heart.y - 90,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => heart.destroy(),
    });
  }

  private showCompletion(result: StarAwardResult): void {
    for (let i = 0; i < 15; i++) {
      const sparkle = this.add.image(
        150 + Math.random() * (GAME_WIDTH - 450),
        GAME_HEIGHT - 150 + Math.random() * 180,
        'ui-sparkle',
      ).setScale(0).setTint(0xFFD700);
      this.tweens.add({
        targets: sparkle,
        scaleX: 0.03,
        scaleY: 0.03,
        alpha: 0,
        duration: 800,
        delay: i * 50,
        ease: 'Sine.easeOut',
      });
    }

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'Spotless!', {
      fontSize: '84px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 9,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });

    this.time.delayedCall(800, () => {
      const star = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'ui-star').setScale(0);
      this.tweens.add({ targets: star, scaleX: 0.09, scaleY: 0.09, duration: 500, ease: 'Back.easeOut' });
    });

    this.animalBounce();

    const delay = result.newAnimals.length > 0 ? 5000 : 3000;

    if (result.newAnimals.length > 0) {
      this.time.delayedCall(1500, () => {
        this.showUnlockBanner(result.newAnimals[0]);
      });
    }

    this.time.delayedCall(delay, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BarnScene', { animal: this.currentAnimal });
      });
    });
  }

  private showUnlockBanner(animal: AnimalType): void {
    const name = ANIMALS[animal].name;
    const banner = this.add.graphics();
    banner.fillStyle(0x000000, 0.7);
    banner.fillRoundedRect(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2 + 45, 600, 120, 24);

    this.add.image(GAME_WIDTH / 2 - 210, GAME_HEIGHT / 2 + 105, `${animal}-idle`)
      .setScale(0.18);
    this.add.text(GAME_WIDTH / 2 + 30, GAME_HEIGHT / 2 + 90, `NEW FRIEND!\n${name} unlocked!`, {
      fontSize: '33px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5);
  }

  private createUI(): void {
    const backGfx = this.add.graphics();
    backGfx.fillStyle(0x000000, 0.4);
    backGfx.fillRoundedRect(18, 12, 150, 54, 18);
    backGfx.fillStyle(0xFFFFFF, 0.08);
    backGfx.fillRoundedRect(21, 15, 144, 24, 15);
    backGfx.lineStyle(2, 0xFFFFFF, 0.15);
    backGfx.strokeRoundedRect(18, 12, 150, 54, 18);

    const backBtn = this.add.text(93, 39, '< Back', {
      fontSize: '30px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, fill: true, stroke: false },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BarnScene', { animal: this.currentAnimal });
      });
    });
  }
}
