import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ACTIVITY_NEED_EFFECTS, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager, StarAwardResult } from '../SaveManager';

/**
 * BrushingScene — move the brush back and forth over the animal.
 * Sparkles appear where you brush. Progress bar fills up.
 */
export class BrushingScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private progress = 0;
  private progressFill!: Phaser.GameObjects.Graphics;
  private animalContainer!: Phaser.GameObjects.Container;
  private animalSprite!: Phaser.GameObjects.Image;
  private brush!: Phaser.GameObjects.Image;
  private completed = false;
  private lastBrushX = 0;
  private lastBrushY = 0;

  constructor() {
    super({ key: 'BrushingScene' });
  }

  init(data: { animal?: AnimalType }): void {
    this.currentAnimal = data.animal ?? 'horse';
    this.progress = 0;
    this.completed = false;
  }

  create(): void {
    this.drawBackground();
    this.placeAnimal();
    this.createProgressBar();
    this.createBrush();
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

    this.add.text(GAME_WIDTH / 2, 30, 'Brushing Time!', {
      fontSize: '54px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Move the brush over the animal!', {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFE082',
      stroke: '#5D4037',
      strokeThickness: 5,
    }).setOrigin(0.5);
  }

  private placeAnimal(): void {
    const ax = GAME_WIDTH / 2;
    const ay = GAME_HEIGHT * 0.50;

    this.animalContainer = this.add.container(ax, ay);
    this.animalSprite = this.add.image(0, 0, `${this.currentAnimal}-dirty`).setScale(0.78);
    this.animalContainer.add(this.animalSprite);

    // Add cosmetic overlay (using saved position)
    const cosmeticId = SaveManager.getEquippedCosmetic(this.currentAnimal);
    if (cosmeticId) {
      const cosmeticDef = COSMETICS.find(c => c.id === cosmeticId);
      if (cosmeticDef) {
        const cosmeticKey = `cosmetic-${cosmeticId}`;
        if (this.textures.exists(cosmeticKey)) {
          const savedPos = SaveManager.getCosmeticPosition(this.currentAnimal);
          const cx = savedPos ? savedPos.x : 0;
          const cy = savedPos ? savedPos.y : cosmeticDef.offsetY;
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(0.3);
          if (cosmeticDef.renderBehind) {
            this.animalContainer.addAt(cosmetic, 0);
          } else {
            this.animalContainer.add(cosmetic);
          }
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
    this.add.text(barX - 15, barY + 12, '✨', { fontSize: '30px' }).setOrigin(1, 0.5);
  }

  private updateProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    this.progressFill.clear();
    this.progressFill.fillStyle(0x9C27B0, 1);
    const fillW = Math.min(barW * this.progress, barW);
    if (fillW > 0) {
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 9);
    }
  }

  private createBrush(): void {
    this.brush = this.add.image(GAME_WIDTH - 240, GAME_HEIGHT / 2, 'tool-brush')
      .setScale(0.4)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(this.brush);
    this.lastBrushX = this.brush.x;
    this.lastBrushY = this.brush.y;

    this.brush.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.brush.x = dragX;
      this.brush.y = dragY;

      const dist = Phaser.Math.Distance.Between(
        this.brush.x, this.brush.y,
        this.animalContainer.x, this.animalContainer.y,
      );

      if (dist < 250 && !this.completed) {
        const moved = Math.abs(this.brush.x - this.lastBrushX) + Math.abs(this.brush.y - this.lastBrushY);
        if (moved > 3) {
          this.progress += 0.02;
          this.updateProgressBar();
          this.spawnSparkle(dragX, dragY);
          if (Math.random() < 0.15) getSoundManager(this).playBrush();

          if (this.progress > 0.5 && this.progress < 0.52) {
            this.animalSprite.setTexture(`${this.currentAnimal}-idle`);
          }

          if (this.progress >= 1 && !this.completed) {
            this.completed = true;
            this.animalSprite.setTexture(`${this.currentAnimal}-brushed`);
            getSoundManager(this).playSuccess();

            const effects = ACTIVITY_NEED_EFFECTS.brushing;
            SaveManager.restoreNeeds(this.currentAnimal, effects);
            const result = SaveManager.awardStar(this.currentAnimal, 'brushing');
            this.showCompletion(result);
          }
        }
      }
      this.lastBrushX = this.brush.x;
      this.lastBrushY = this.brush.y;
    });
  }

  private spawnSparkle(x: number, y: number): void {
    if (Math.random() > 0.4) return;
    const sparkle = this.add.image(
      x + Phaser.Math.Between(-30, 30),
      y + Phaser.Math.Between(-30, 30),
      'ui-sparkle',
    ).setScale(Phaser.Math.FloatBetween(0.023, 0.045));

    this.tweens.add({
      targets: sparkle,
      y: sparkle.y - 45,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 500,
      onComplete: () => sparkle.destroy(),
    });
  }

  private showCompletion(result: StarAwardResult): void {
    for (let i = 0; i < 8; i++) {
      const star = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-star').setScale(0);
      this.tweens.add({
        targets: star,
        x: GAME_WIDTH / 2 + Math.cos((i / 8) * Math.PI * 2) * 225,
        y: GAME_HEIGHT / 2 + Math.sin((i / 8) * Math.PI * 2) * 150,
        scaleX: 0.06,
        scaleY: 0.06,
        alpha: 0,
        duration: 1000,
        delay: i * 80,
        ease: 'Sine.easeOut',
      });
    }

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'So Shiny!', {
      fontSize: '84px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 9,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });

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
