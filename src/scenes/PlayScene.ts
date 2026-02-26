import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ACTIVITY_NEED_EFFECTS, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager, StarAwardResult } from '../SaveManager';

/**
 * PlayScene — dangle a yarn ball toy in front of the animal.
 * The animal chases the toy. Keep it near (but moving) to fill the progress bar.
 */
export class PlayScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private progress = 0;
  private progressFill!: Phaser.GameObjects.Graphics;
  private animalContainer!: Phaser.GameObjects.Container;
  private animalSprite!: Phaser.GameObjects.Image;
  private toy!: Phaser.GameObjects.Image;
  private completed = false;
  private lastToyX = 0;
  private lastToyY = 0;
  private bounceTimer = 0;

  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data: { animal?: AnimalType }): void {
    this.currentAnimal = data.animal ?? 'horse';
    this.progress = 0;
    this.completed = false;
    this.bounceTimer = 0;
  }

  create(): void {
    this.drawBackground();
    this.placeAnimal();
    this.createProgressBar();
    this.createToy();
    this.createUI();
    this.cameras.main.fadeIn(300);
  }

  private drawBackground(): void {
    if (this.textures.exists('bg-barn') && this.textures.get('bg-barn').key !== '__MISSING') {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-barn')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x81C784, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.fillStyle(0x66BB6A, 1);
      g.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    }

    this.add.text(GAME_WIDTH / 2, 30, 'Playtime!', {
      fontSize: '54px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#D81B60',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Dangle the toy near your animal!', {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFF9C4',
      stroke: '#5D4037',
      strokeThickness: 5,
    }).setOrigin(0.5);
  }

  private placeAnimal(): void {
    const ax = GAME_WIDTH * 0.35;
    const ay = GAME_HEIGHT * 0.50;

    this.animalContainer = this.add.container(ax, ay);
    this.animalSprite = this.add.image(0, 0, `${this.currentAnimal}-idle`).setScale(0.675);
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
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(0.3);
          this.animalContainer.add(cosmetic);
        }
      }
    }

    // Idle breathing animation
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
    bg.fillStyle(0x880E4F, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 9);
    bg.lineStyle(3, 0x4A0027);
    bg.strokeRoundedRect(barX, barY, barW, barH, 9);
    this.progressFill = this.add.graphics();
    this.add.text(barX - 15, barY + 12, '🧶', { fontSize: '30px' }).setOrigin(1, 0.5);
  }

  private updateProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    this.progressFill.clear();
    this.progressFill.fillStyle(0xFF69B4, 1);
    const fillW = Math.min(barW * this.progress, barW);
    if (fillW > 0) {
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 9);
    }
  }

  private createToy(): void {
    this.toy = this.add.image(GAME_WIDTH - 270, GAME_HEIGHT / 2, 'tool-toy')
      .setScale(0.4)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(this.toy);
    this.lastToyX = this.toy.x;
    this.lastToyY = this.toy.y;

    this.toy.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.toy.x = dragX;
      this.toy.y = dragY;

      const dist = Phaser.Math.Distance.Between(
        this.toy.x, this.toy.y,
        this.animalContainer.x, this.animalContainer.y,
      );

      if (dist < 200 && !this.completed) {
        const moved = Math.abs(this.toy.x - this.lastToyX) + Math.abs(this.toy.y - this.lastToyY);
        if (moved > 5) {
          this.progress += 0.005;
          this.updateProgressBar();

          // Animal chases the toy — move toward it
          const angle = Phaser.Math.Angle.Between(
            this.animalContainer.x, this.animalContainer.y,
            this.toy.x, this.toy.y,
          );
          const chaseSpeed = 2.25;
          this.animalContainer.x += Math.cos(angle) * chaseSpeed;
          this.animalContainer.y += Math.sin(angle) * chaseSpeed;

          // Bounce the animal excitedly
          this.bounceTimer += moved;
          if (this.bounceTimer > 40) {
            this.bounceTimer = 0;
            this.tweens.add({
              targets: this.animalContainer,
              y: this.animalContainer.y - 18,
              duration: 150,
              yoyo: true,
              ease: 'Back.easeOut',
            });
            if (Math.random() < 0.3) {
              getSoundManager(this).playPop();
            }
          }

          // Squeak when moving the toy
          if (Math.random() < 0.08) {
            getSoundManager(this).playSqueak();
          }

          // Spawn hearts near the animal
          this.spawnHeart();

          // At 50%: switch to happy texture
          if (this.progress > 0.5 && this.progress < 0.52) {
            this.animalSprite.setTexture(`${this.currentAnimal}-happy`);
          }

          // Complete!
          if (this.progress >= 1 && !this.completed) {
            this.completed = true;
            this.animalSprite.setTexture(`${this.currentAnimal}-happy`);
            getSoundManager(this).playSuccess();

            const effects = ACTIVITY_NEED_EFFECTS.playing;
            SaveManager.restoreNeeds(this.currentAnimal, effects);
            const result = SaveManager.awardStar(this.currentAnimal, 'playing');
            this.showCompletion(result);
          }
        }
      }
      this.lastToyX = this.toy.x;
      this.lastToyY = this.toy.y;
    });
  }

  private spawnHeart(): void {
    if (Math.random() > 0.15) return;
    const heart = this.add.image(
      this.animalContainer.x + Phaser.Math.Between(-60, 60),
      this.animalContainer.y - 105,
      'ui-heart',
    ).setScale(0.038);

    this.tweens.add({
      targets: heart,
      y: heart.y - 75,
      alpha: 0,
      duration: 700,
      ease: 'Sine.easeOut',
      onComplete: () => heart.destroy(),
    });
  }

  private showCompletion(result: StarAwardResult): void {
    for (let i = 0; i < 12; i++) {
      const sparkle = this.add.image(
        this.animalContainer.x + Phaser.Math.Between(-120, 120),
        this.animalContainer.y + Phaser.Math.Between(-90, 90),
        'ui-sparkle',
      ).setScale(0).setTint(0xFF69B4);
      this.tweens.add({
        targets: sparkle,
        scaleX: 0.03,
        scaleY: 0.03,
        alpha: 0,
        duration: 800,
        delay: i * 60,
        ease: 'Sine.easeOut',
      });
      if (i % 3 === 0) getSoundManager(this).playSparkle();
    }

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'So Much Fun!', {
      fontSize: '78px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FF69B4',
      stroke: '#880E4F',
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
