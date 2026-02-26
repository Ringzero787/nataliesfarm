import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ACTIVITY_NEED_EFFECTS, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager, StarAwardResult } from '../SaveManager';

/**
 * WashingScene — drag the sponge to wash the animal.
 * Bubbles and water drops appear. Animal transitions from dirty to clean.
 */
export class WashingScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private progress = 0;
  private progressFill!: Phaser.GameObjects.Graphics;
  private animalContainer!: Phaser.GameObjects.Container;
  private animalSprite!: Phaser.GameObjects.Image;
  private sponge!: Phaser.GameObjects.Image;
  private completed = false;

  constructor() {
    super({ key: 'WashingScene' });
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
    this.createSponge();
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
      g.lineStyle(1, 0x4FC3F7, 0.3);
      for (let y = 0; y < GAME_HEIGHT; y += 50) {
        g.lineBetween(0, y, GAME_WIDTH, y);
      }
      for (let x = 0; x < GAME_WIDTH; x += 50) {
        g.lineBetween(x, 0, x, GAME_HEIGHT);
      }
      g.fillStyle(0x546E7A, 1);
      g.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    }

    this.add.text(GAME_WIDTH / 2, 30, 'Bath Time!', {
      fontSize: '54px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#1565C0',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Scrub the animal with the sponge!', {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#E3F2FD',
      stroke: '#1565C0',
      strokeThickness: 5,
    }).setOrigin(0.5);
  }

  private placeAnimal(): void {
    const ax = GAME_WIDTH / 2;
    const ay = GAME_HEIGHT * 0.50;

    this.animalContainer = this.add.container(ax, ay);
    this.animalSprite = this.add.image(0, 0, `${this.currentAnimal}-dirty`).setScale(0.45);
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

  private createProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    const bg = this.add.graphics();
    bg.fillStyle(0x1565C0, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 9);
    bg.lineStyle(3, 0x0D47A1);
    bg.strokeRoundedRect(barX, barY, barW, barH, 9);
    this.progressFill = this.add.graphics();
    this.add.text(barX - 15, barY + 12, '🫧', { fontSize: '30px' }).setOrigin(1, 0.5);
  }

  private updateProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    this.progressFill.clear();
    this.progressFill.fillStyle(0x2196F3, 1);
    const fillW = Math.min(barW * this.progress, barW);
    if (fillW > 0) {
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 9);
    }
  }

  private createSponge(): void {
    this.sponge = this.add.image(GAME_WIDTH - 240, GAME_HEIGHT / 2, 'tool-sponge')
      .setScale(0.27)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(this.sponge);

    this.sponge.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.sponge.x = dragX;
      this.sponge.y = dragY;

      const dist = Phaser.Math.Distance.Between(
        this.sponge.x, this.sponge.y,
        this.animalContainer.x, this.animalContainer.y,
      );

      if (dist < 150 && !this.completed) {
        this.progress += 0.006;
        this.updateProgressBar();
        this.spawnBubble(dragX, dragY);
        if (Math.random() < 0.1) getSoundManager(this).playSplash();

        if (this.progress > 0.4 && this.progress < 0.42) {
          this.animalSprite.setTexture(`${this.currentAnimal}-wet`);
        }

        if (this.progress >= 1 && !this.completed) {
          this.completed = true;
          this.animalSprite.setTexture(`${this.currentAnimal}-clean`);
          getSoundManager(this).playSuccess();

          const effects = ACTIVITY_NEED_EFFECTS.washing;
          SaveManager.restoreNeeds(this.currentAnimal, effects);
          const result = SaveManager.awardStar(this.currentAnimal, 'washing');
          this.showCompletion(result);
        }
      }
    });
  }

  private spawnBubble(x: number, y: number): void {
    if (Math.random() > 0.3) return;
    const type = Math.random() > 0.5 ? 'ui-bubble' : 'ui-waterdrop';
    const particle = this.add.image(
      x + Phaser.Math.Between(-45, 45),
      y + Phaser.Math.Between(-45, 45),
      type,
    ).setScale(Phaser.Math.FloatBetween(0.023, 0.045));

    this.tweens.add({
      targets: particle,
      y: particle.y - 60 - Math.random() * 45,
      x: particle.x + Phaser.Math.Between(-30, 30),
      alpha: 0,
      duration: 600 + Math.random() * 400,
      onComplete: () => particle.destroy(),
    });
  }

  private showCompletion(result: StarAwardResult): void {
    for (let i = 0; i < 12; i++) {
      const sparkle = this.add.image(
        this.animalContainer.x + Phaser.Math.Between(-80, 80),
        this.animalContainer.y + Phaser.Math.Between(-60, 60),
        'ui-sparkle',
      ).setScale(0);
      this.tweens.add({
        targets: sparkle,
        scaleX: 0.03,
        scaleY: 0.03,
        alpha: 0,
        duration: 800,
        delay: i * 60,
        ease: 'Sine.easeOut',
      });
    }

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'Squeaky Clean!', {
      fontSize: '78px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#E3F2FD',
      stroke: '#1565C0',
      strokeThickness: 9,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });

    this.time.delayedCall(800, () => {
      const star = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'ui-star').setScale(0);
      this.tweens.add({ targets: star, scaleX: 0.09, scaleY: 0.09, duration: 500, ease: 'Back.easeOut' });
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
