import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ACTIVITY_NEED_EFFECTS, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager, StarAwardResult } from '../SaveManager';

/**
 * DryingScene — drag the towel back and forth over the wet animal.
 * Water drops fall off as you dry. Animal transitions from wet → clean.
 */
export class DryingScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private progress = 0;
  private progressFill!: Phaser.GameObjects.Graphics;
  private animalContainer!: Phaser.GameObjects.Container;
  private animalSprite!: Phaser.GameObjects.Image;
  private towel!: Phaser.GameObjects.Image;
  private completed = false;
  private lastTowelX = 0;
  private lastTowelY = 0;

  constructor() {
    super({ key: 'DryingScene' });
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
    this.createTowel();
    this.createUI();
    this.cameras.main.fadeIn(300);
  }

  private drawBackground(): void {
    if (this.textures.exists('bg-wash') && this.textures.get('bg-wash').key !== '__MISSING') {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-wash')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x81D4FA, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.fillStyle(0x546E7A, 1);
      g.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    }

    this.add.text(GAME_WIDTH / 2, 30, 'Drying Time!', {
      fontSize: '36px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Rub the towel to dry off!', {
      fontSize: '18px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFE082',
      stroke: '#5D4037',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private placeAnimal(): void {
    const ax = GAME_WIDTH / 2;
    const ay = GAME_HEIGHT * 0.50;

    this.animalContainer = this.add.container(ax, ay);
    this.animalSprite = this.add.image(0, 0, `${this.currentAnimal}-wet`).setScale(0.45);
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
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(0.18);
          this.animalContainer.add(cosmetic);
        }
      }
    }

    // Shivering animation
    this.tweens.add({
      targets: this.animalContainer,
      x: ax + 3,
      duration: 80,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 150;
    const barY = 75;
    const barW = 300;
    const barH = 25;
    const bg = this.add.graphics();
    bg.fillStyle(0x5D4037, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 6);
    bg.lineStyle(2, 0x3E2723);
    bg.strokeRoundedRect(barX, barY, barW, barH, 6);
    this.progressFill = this.add.graphics();
    this.add.text(barX - 10, barY + 12, '☀️', { fontSize: '20px' }).setOrigin(1, 0.5);
  }

  private updateProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 150;
    const barY = 75;
    const barW = 300;
    const barH = 25;
    this.progressFill.clear();
    this.progressFill.fillStyle(0xFFEB3B, 1);
    const fillW = Math.min(barW * this.progress, barW);
    if (fillW > 0) {
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 6);
    }
  }

  private createTowel(): void {
    this.towel = this.add.image(GAME_WIDTH - 160, GAME_HEIGHT / 2, 'tool-towel')
      .setScale(0.18)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(this.towel);
    this.lastTowelX = this.towel.x;
    this.lastTowelY = this.towel.y;

    this.towel.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.towel.x = dragX;
      this.towel.y = dragY;

      const dist = Phaser.Math.Distance.Between(
        this.towel.x, this.towel.y,
        this.animalContainer.x, this.animalContainer.y,
      );

      if (dist < 150 && !this.completed) {
        const moved = Math.abs(this.towel.x - this.lastTowelX) + Math.abs(this.towel.y - this.lastTowelY);
        if (moved > 5) {
          this.progress += 0.007;
          this.updateProgressBar();
          if (Math.random() < 0.12) getSoundManager(this).playRub();

          this.spawnWaterDrop(dragX, dragY);

          if (this.progress > 0.5 && this.progress < 0.52) {
            this.animalSprite.setTexture(`${this.currentAnimal}-idle`);
            this.tweens.killTweensOf(this.animalContainer);
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

          if (this.progress >= 1 && !this.completed) {
            this.completed = true;
            this.animalSprite.setTexture(`${this.currentAnimal}-clean`);
            getSoundManager(this).playSuccess();

            const effects = ACTIVITY_NEED_EFFECTS.drying;
            SaveManager.restoreNeeds(this.currentAnimal, effects);
            const result = SaveManager.awardStar(this.currentAnimal, 'drying');
            this.showCompletion(result);
          }
        }
      }
      this.lastTowelX = this.towel.x;
      this.lastTowelY = this.towel.y;
    });
  }

  private spawnWaterDrop(x: number, y: number): void {
    if (Math.random() > 0.35) return;
    const drop = this.add.image(
      x + Phaser.Math.Between(-30, 30),
      y + Phaser.Math.Between(-10, 10),
      'ui-waterdrop',
    ).setScale(Phaser.Math.FloatBetween(0.01, 0.025));

    this.tweens.add({
      targets: drop,
      y: drop.y + 80 + Math.random() * 60,
      x: drop.x + Phaser.Math.Between(-15, 15),
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 600 + Math.random() * 300,
      ease: 'Quad.easeIn',
      onComplete: () => drop.destroy(),
    });
  }

  private showCompletion(result: StarAwardResult): void {
    for (let i = 0; i < 10; i++) {
      const sparkle = this.add.image(
        this.animalContainer.x + Phaser.Math.Between(-80, 80),
        this.animalContainer.y + Phaser.Math.Between(-60, 60),
        'ui-sparkle',
      ).setScale(0).setTint(0xFFD700);
      this.tweens.add({
        targets: sparkle,
        scaleX: 0.03,
        scaleY: 0.03,
        alpha: 0,
        duration: 800,
        delay: i * 70,
        ease: 'Sine.easeOut',
      });
    }

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'Warm & Fluffy!', {
      fontSize: '52px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 6,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });

    this.time.delayedCall(800, () => {
      const star = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'ui-star').setScale(0);
      this.tweens.add({ targets: star, scaleX: 0.06, scaleY: 0.06, duration: 500, ease: 'Back.easeOut' });
    });

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
    banner.fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 + 30, 400, 80, 16);

    this.add.image(GAME_WIDTH / 2 - 140, GAME_HEIGHT / 2 + 70, `${animal}-idle`)
      .setScale(0.12);
    this.add.text(GAME_WIDTH / 2 + 20, GAME_HEIGHT / 2 + 60, `NEW FRIEND!\n${name} unlocked!`, {
      fontSize: '22px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5);
  }

  private createUI(): void {
    const backGfx = this.add.graphics();
    backGfx.fillStyle(0x000000, 0.4);
    backGfx.fillRoundedRect(12, 8, 100, 36, 12);
    backGfx.fillStyle(0xFFFFFF, 0.08);
    backGfx.fillRoundedRect(14, 10, 96, 16, 10);
    backGfx.lineStyle(1, 0xFFFFFF, 0.15);
    backGfx.strokeRoundedRect(12, 8, 100, 36, 12);

    const backBtn = this.add.text(62, 26, '< Back', {
      fontSize: '20px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 3,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BarnScene', { animal: this.currentAnimal });
      });
    });
  }
}
