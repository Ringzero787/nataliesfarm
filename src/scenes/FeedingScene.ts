import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ACTIVITY_NEED_EFFECTS, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager, StarAwardResult } from '../SaveManager';

/**
 * FeedingScene — drag food to the trough or directly to the animal's mouth.
 * Animal faces right toward the feeding trough. Progress bar fills up.
 */
export class FeedingScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private progress = 0;
  private progressFill!: Phaser.GameObjects.Graphics;
  private animalContainer!: Phaser.GameObjects.Container;
  private animalSprite!: Phaser.GameObjects.Image;
  private troughX = 810;
  private troughY = GAME_HEIGHT * 0.68;
  private completed = false;

  constructor() {
    super({ key: 'FeedingScene' });
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
    this.spawnFood();
    this.createUI();
    this.cameras.main.fadeIn(300);
  }

  private drawBackground(): void {
    if (this.textures.exists('bg-feed') && this.textures.get('bg-feed').key !== '__MISSING') {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-feed')
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

    this.add.text(GAME_WIDTH / 2, 30, 'Feeding Time!', {
      fontSize: '54px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Drop food in the trough or feed by hand!', {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#FFE082',
      stroke: '#5D4037',
      strokeThickness: 5,
    }).setOrigin(0.5);

  }

  private placeAnimal(): void {
    const ax = 420;
    const ay = GAME_HEIGHT * 0.48;

    this.animalContainer = this.add.container(ax, ay);
    this.animalSprite = this.add.image(0, 0, `${this.currentAnimal}-idle`)
      .setScale(0.63)
      .setFlipX(true);
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
          const cosmetic = this.add.image(-cx, cy, cosmeticKey).setScale(0.3).setFlipX(true);
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

    const bgBar = this.add.graphics();
    bgBar.fillStyle(0x5D4037, 1);
    bgBar.fillRoundedRect(barX, barY, barW, barH, 9);
    bgBar.lineStyle(3, 0x3E2723);
    bgBar.strokeRoundedRect(barX, barY, barW, barH, 9);

    this.progressFill = this.add.graphics();
    this.updateProgressBar();

    this.add.text(barX - 15, barY + 12, '🍽️', { fontSize: '30px' }).setOrigin(1, 0.5);
  }

  private updateProgressBar(): void {
    const barX = GAME_WIDTH / 2 - 225;
    const barY = 75;
    const barW = 450;
    const barH = 38;
    this.progressFill.clear();
    this.progressFill.fillStyle(0x4CAF50, 1);
    const fillW = Math.min(barW * this.progress, barW);
    if (fillW > 0) {
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 9);
    }
  }

  private getFoodList(): { key: string; label: string }[] {
    const foodMap: Record<AnimalType, { key: string; label: string }[]> = {
      horse: [
        { key: 'hay', label: 'Hay' },
        { key: 'apple', label: 'Apple' },
        { key: 'carrot', label: 'Carrot' },
      ],
      pig: [
        { key: 'slop', label: 'Slop' },
        { key: 'apple', label: 'Apple' },
        { key: 'carrot', label: 'Carrot' },
      ],
      chicken: [
        { key: 'grain', label: 'Grain' },
        { key: 'corn', label: 'Corn' },
        { key: 'apple', label: 'Apple' },
      ],
      goat: [
        { key: 'hay', label: 'Hay' },
        { key: 'grass', label: 'Grass' },
        { key: 'apple', label: 'Apple' },
      ],
      sheep: [
        { key: 'grass', label: 'Grass' },
        { key: 'hay', label: 'Hay' },
        { key: 'apple', label: 'Apple' },
      ],
      bunny: [
        { key: 'carrot', label: 'Carrot' },
        { key: 'lettuce', label: 'Cabbage' },
        { key: 'apple', label: 'Apple' },
      ],
    };
    return foodMap[this.currentAnimal];
  }

  private spawnFood(): void {
    const foods = this.getFoodList();
    const shelfX = GAME_WIDTH - 270;
    const startY = GAME_HEIGHT / 2 - 180;
    const spacing = 210;

    const g = this.add.graphics();
    g.fillStyle(COLORS.wood, 0.6);
    g.fillRoundedRect(shelfX - 105, startY - 75, 210, foods.length * spacing + 30, 15);

    foods.forEach((food, i) => {
      const slotY = startY + i * spacing;
      this.createFoodSlot(food.key, food.label, shelfX, slotY);
    });
  }

  private createFoodSlot(key: string, label: string, slotX: number, slotY: number): void {
    const textureKey = `food-${key}`;
    this.add.text(slotX, slotY + 68, label, {
      fontSize: '21px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.spawnFoodItem(key, textureKey, slotX, slotY);
  }

  private spawnFoodItem(key: string, textureKey: string, slotX: number, slotY: number): void {
    const food = this.add.image(slotX, slotY, textureKey)
      .setScale(0.32)
      .setInteractive({ useHandCursor: true, draggable: true });

    (food as any)._foodKey = key;
    (food as any)._slotX = slotX;
    (food as any)._slotY = slotY;

    this.input.setDraggable(food);

    food.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      food.x = dragX;
      food.y = dragY;
    });

    food.on('dragend', () => {
      if (this.completed) {
        this.snapBack(food, slotX, slotY);
        return;
      }

      const troughZone = new Phaser.Geom.Rectangle(
        this.troughX - 300, this.troughY - 240, 600, 480,
      );
      const mouthZone = new Phaser.Geom.Rectangle(
        this.animalContainer.x - 180, this.animalContainer.y - 225, 450, 450,
      );

      if (troughZone.contains(food.x, food.y)) {
        this.feedViaTrough(food);
        this.respawnAfterDelay(key, textureKey, slotX, slotY);
      } else if (mouthZone.contains(food.x, food.y)) {
        this.feedDirect(food);
        this.respawnAfterDelay(key, textureKey, slotX, slotY);
      } else {
        this.snapBack(food, slotX, slotY);
      }
    });
  }

  private respawnAfterDelay(key: string, textureKey: string, slotX: number, slotY: number): void {
    if (this.completed) return;
    this.time.delayedCall(600, () => {
      if (!this.completed) {
        this.spawnFoodItem(key, textureKey, slotX, slotY);
      }
    });
  }

  private snapBack(food: Phaser.GameObjects.Image, x: number, y: number): void {
    this.tweens.add({
      targets: food,
      x, y,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private feedViaTrough(food: Phaser.GameObjects.Image): void {
    const foodKey = (food as any)._foodKey as string;
    this.tweens.add({
      targets: food,
      x: this.troughX,
      y: this.troughY - 15,
      scaleX: 0.12,
      scaleY: 0.12,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        food.destroy();
        this.tweens.add({
          targets: this.animalContainer,
          y: this.animalContainer.y + 20,
          duration: 300,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
        this.doFeedReaction(foodKey);
      },
    });
  }

  private feedDirect(food: Phaser.GameObjects.Image): void {
    const foodKey = (food as any)._foodKey as string;
    this.tweens.add({
      targets: food,
      x: this.animalContainer.x + 90,
      y: this.animalContainer.y,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        food.destroy();
        this.doFeedReaction(foodKey);
      },
    });
  }

  private doFeedReaction(foodKey: string): void {
    getSoundManager(this).playMunch();

    const mouthX = this.animalContainer.x + 105;
    const mouthY = this.animalContainer.y - 30;
    const eatingFood = this.add.image(mouthX, mouthY, `food-${foodKey}`)
      .setScale(0.12);

    this.tweens.add({
      targets: eatingFood,
      scaleX: 0.075,
      scaleY: 0.075,
      duration: 250,
      delay: 200,
      onComplete: () => {
        this.tweens.add({
          targets: eatingFood,
          scaleX: 0.03,
          scaleY: 0.03,
          y: mouthY + 8,
          duration: 250,
          onComplete: () => {
            this.tweens.add({
              targets: eatingFood,
              scaleX: 0,
              scaleY: 0,
              alpha: 0,
              duration: 200,
              onComplete: () => eatingFood.destroy(),
            });
          },
        });
      },
    });

    // Swap to eating texture, then back to idle after chewing
    this.animalSprite.setTexture(`${this.currentAnimal}-eating`);
    this.animalSprite.setFlipX(true);

    // Chomping animation — bob forward and squash to simulate eating
    this.tweens.add({
      targets: this.animalContainer,
      angle: 8,
      duration: 120,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.animalSprite,
      scaleX: 0.54,
      scaleY: 0.72,
      duration: 120,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!this.completed) {
          this.animalSprite.setTexture(`${this.currentAnimal}-idle`);
          this.animalSprite.setFlipX(true);
        }
      },
    });

    this.tweens.add({
      targets: this.animalContainer,
      y: this.animalContainer.y - 15,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 3; i++) {
      const heart = this.add.image(
        this.animalContainer.x + Phaser.Math.Between(-60, 60),
        this.animalContainer.y - 120,
        'ui-heart',
      ).setScale(0.045);
      this.tweens.add({
        targets: heart,
        y: heart.y - 90 - i * 30,
        alpha: 0,
        duration: 700 + i * 200,
        ease: 'Sine.easeOut',
        onComplete: () => heart.destroy(),
      });
    }

    this.progress += 0.35;
    this.updateProgressBar();

    if (this.progress >= 1 && !this.completed) {
      this.completed = true;
      getSoundManager(this).playSuccess();

      // Restore needs
      const effects = ACTIVITY_NEED_EFFECTS.feeding;
      SaveManager.restoreNeeds(this.currentAnimal, effects);

      // Award star and check for unlocks
      const result = SaveManager.awardStar(this.currentAnimal, 'feeding');

      this.animalSprite.setTexture(`${this.currentAnimal}-happy`);
      this.animalSprite.setFlipX(true);
      this.showCompletion(result);
    }
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

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'Yummy!', {
      fontSize: '84px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 9,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.easeOut' });

    // Show unlock celebration if new animal unlocked
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

    const unlockSprite = this.add.image(GAME_WIDTH / 2 - 210, GAME_HEIGHT / 2 + 105, `${animal}-idle`)
      .setScale(0.18);
    const unlockText = this.add.text(GAME_WIDTH / 2 + 30, GAME_HEIGHT / 2 + 90, `NEW FRIEND!\n${name} unlocked!`, {
      fontSize: '33px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5);

    // Bounce in
    for (const obj of [banner, unlockSprite, unlockText]) {
      (obj as any).setScale?.(0);
      this.tweens.add({
        targets: obj,
        scaleX: obj === unlockSprite ? 0.18 : 1,
        scaleY: obj === unlockSprite ? 0.18 : 1,
        duration: 500,
        ease: 'Back.easeOut',
      });
    }
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
