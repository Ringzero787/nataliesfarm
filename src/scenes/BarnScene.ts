import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ANIMALS, AnimalType,
  ANIMAL_ORDER, NeedType, TAP_HAPPINESS_BOOST, COSMETICS,
} from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager } from '../SaveManager';

/**
 * BarnScene — the hub screen. Shows the current animal in the barn
 * with activity buttons, need bars, and wardrobe access.
 */
export class BarnScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';
  private animalContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'BarnScene' });
  }

  init(data: { animal?: AnimalType }): void {
    this.currentAnimal = data.animal ?? 'horse';
    // If selected animal somehow got locked, fall back to horse
    if (!SaveManager.isUnlocked(this.currentAnimal)) {
      this.currentAnimal = 'horse';
    }
  }

  create(): void {
    // Update needs on every barn entry
    SaveManager.updateNeeds();

    this.drawBarn();
    this.placeAnimal();
    this.createActivityButtons();
    this.createAnimalSwitcher();
    this.createNeedBars();
    this.createThoughtBubbles();
    this.createTopBar();
    this.createDirtBucket();
    this.cameras.main.fadeIn(400);

    this.events.on('shutdown', () => this.tweens.killAll());
  }

  private drawBarn(): void {
    if (this.textures.exists('bg-barn') && this.textures.get('bg-barn').key !== '__MISSING') {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-barn')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      const g = this.add.graphics();
      g.fillStyle(COLORS.barnWall, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.fillStyle(COLORS.barnFloor, 1);
      g.fillRect(0, GAME_HEIGHT - 150, GAME_WIDTH, 150);
    }
  }

  private createTopBar(): void {
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.5);
    topBar.fillRect(0, 0, GAME_WIDTH, 75);
    topBar.fillStyle(0xFFFFFF, 0.06);
    topBar.fillRect(0, 0, GAME_WIDTH, 2);
    topBar.fillStyle(0x000000, 0.3);
    topBar.fillRect(0, 75, GAME_WIDTH, 3);

    // Back button
    const backBtn = this.add.text(30, 38, '< Menu', {
      fontSize: '30px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    // Title (clickable to rename)
    const nameText = SaveManager.getAnimalName(this.currentAnimal);
    const title = this.add.text(GAME_WIDTH / 2, 38, `${nameText}'s Barn`, {
      fontSize: '39px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 6,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    title.on('pointerdown', () => {
      const current = SaveManager.getAnimalName(this.currentAnimal);
      const input = prompt(`Rename your ${ANIMALS[this.currentAnimal].name}:`, current);
      if (input !== null && input.trim().length > 0) {
        SaveManager.setAnimalName(this.currentAnimal, input.trim());
        title.setText(`${input.trim()}'s Barn`);
      }
    });

    // Star counter
    const totalStars = SaveManager.getTotalStars();
    this.add.image(GAME_WIDTH - 135, 38, 'ui-star').setScale(0.0375);
    this.add.text(GAME_WIDTH - 108, 38, `${totalStars}`, {
      fontSize: '30px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
    }).setOrigin(0, 0.5);

  }

  private placeAnimal(): void {
    const needs = SaveManager.getNeeds(this.currentAnimal);

    // Pick texture based on needs
    const recentActivity = (Date.now() - SaveManager.getLastActivityTime(this.currentAnimal)) < 10 * 60 * 1000;
    let textureKey = `${this.currentAnimal}-idle`;
    if (needs.cleanliness < 30) {
      textureKey = `${this.currentAnimal}-dirty`;
    } else if (recentActivity || (needs.hunger > 50 && needs.cleanliness > 50 && needs.happiness > 50)) {
      textureKey = `${this.currentAnimal}-happy`;
    }

    const animalX = GAME_WIDTH / 2;
    const animalY = GAME_HEIGHT * 0.50;

    // Create container for animal + cosmetic
    this.animalContainer = this.add.container(animalX, animalY);

    const animal = this.add.image(0, 0, textureKey).setScale(0.78);
    this.animalContainer.add(animal);

    // Add equipped cosmetic overlay (draggable)
    const cosmeticId = SaveManager.getEquippedCosmetic(this.currentAnimal);
    if (cosmeticId) {
      const cosmeticDef = COSMETICS.find(c => c.id === cosmeticId);
      if (cosmeticDef) {
        const cosmeticKey = `cosmetic-${cosmeticId}`;
        if (this.textures.exists(cosmeticKey)) {
          const savedPos = SaveManager.getCosmeticPosition(this.currentAnimal);
          const cx = savedPos ? savedPos.x : 0;
          const cy = savedPos ? savedPos.y : cosmeticDef.offsetY;
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(cosmeticDef.scale ?? 0.3);
          if (cosmeticDef.renderBehind) {
            this.animalContainer.addAt(cosmetic, 0);
          } else {
            this.animalContainer.add(cosmetic);
          }

          // Make cosmetic draggable within the container
          cosmetic.setInteractive({ useHandCursor: true, draggable: true });
          this.input.setDraggable(cosmetic);

          let dragOffsetX = 0;
          let dragOffsetY = 0;

          cosmetic.on('dragstart', (pointer: Phaser.Input.Pointer) => {
            // Remember offset between pointer and cosmetic's world position
            const container = this.animalContainer;
            const worldX = container.x + cosmetic.x * container.scaleX;
            const worldY = container.y + cosmetic.y * container.scaleY;
            dragOffsetX = worldX - pointer.x;
            dragOffsetY = worldY - pointer.y;
          });

          cosmetic.on('drag', (pointer: Phaser.Input.Pointer) => {
            // Convert pointer world coords to container-local, preserving grab offset
            const container = this.animalContainer;
            cosmetic.x = (pointer.x + dragOffsetX - container.x) / container.scaleX;
            cosmetic.y = (pointer.y + dragOffsetY - container.y) / container.scaleY;
          });

          cosmetic.on('dragend', () => {
            SaveManager.setCosmeticPosition(this.currentAnimal, cosmetic.x, cosmetic.y);
          });
        }
      }
    }

    // Idle breathing animation on the container
    this.tweens.add({
      targets: this.animalContainer,
      scaleY: 1.02,
      scaleX: 0.98,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Make animal interactive
    animal.setInteractive({ useHandCursor: true });

    // Tap reaction: small jump + heart + happiness boost
    animal.on('pointerdown', () => {
      this.tweens.add({
        targets: this.animalContainer,
        y: animalY - 23,
        duration: 200,
        yoyo: true,
        ease: 'Back.easeOut',
      });
      getSoundManager(this).playPop();

      // Boost happiness
      SaveManager.restoreNeed(this.currentAnimal, 'happiness', TAP_HAPPINESS_BOOST);

      const heart = this.add.image(
        animalX + Phaser.Math.Between(-45, 45),
        animalY - 120,
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
    });
  }

  private createNeedBars(): void {
    const needs = SaveManager.getNeeds(this.currentAnimal);
    const needList: { key: NeedType; label: string; icon: string }[] = [
      { key: 'hunger', label: 'Hunger', icon: '🍎' },
      { key: 'cleanliness', label: 'Clean', icon: '🫧' },
      { key: 'happiness', label: 'Happy', icon: '😊' },
    ];

    const startX = 38;
    const startY = 113;
    const barW = 135;
    const barH = 18;
    const spacing = 48;

    // Background panel
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.35);
    panel.fillRoundedRect(startX - 15, startY - 18, barW + 75, needList.length * spacing + 18, 15);

    needList.forEach((need, i) => {
      const y = startY + i * spacing;
      const value = needs[need.key];

      // Icon
      this.add.text(startX, y, need.icon, { fontSize: '21px' }).setOrigin(0, 0.5);

      // Bar background
      const bg = this.add.graphics();
      bg.fillStyle(0x333333, 0.8);
      bg.fillRoundedRect(startX + 33, y - barH / 2, barW, barH, 6);

      // Bar fill
      const fill = this.add.graphics();
      let color = 0x4CAF50; // green
      if (value <= 30) color = 0xF44336; // red
      else if (value <= 60) color = 0xFFEB3B; // yellow

      fill.fillStyle(color, 1);
      const fillW = Math.max(0, (barW - 3) * (value / 100));
      if (fillW > 0) {
        fill.fillRoundedRect(startX + 35, y - barH / 2 + 1, fillW, barH - 3, 5);
      }

      // Border
      bg.lineStyle(1, 0x555555, 0.6);
      bg.strokeRoundedRect(startX + 33, y - barH / 2, barW, barH, 6);
    });
  }

  private createThoughtBubbles(): void {
    const needs = SaveManager.getNeeds(this.currentAnimal);
    const animalX = GAME_WIDTH / 2;
    const animalY = GAME_HEIGHT * 0.50;

    const lowNeeds: { key: NeedType; icon: string }[] = [];
    if (needs.hunger < 30) lowNeeds.push({ key: 'hunger', icon: '🍎' });
    if (needs.cleanliness < 30) lowNeeds.push({ key: 'cleanliness', icon: '🫧' });
    if (needs.happiness < 30) lowNeeds.push({ key: 'happiness', icon: '💔' });

    if (lowNeeds.length === 0) return;

    // Show the most urgent need as a floating thought bubble
    const urgent = lowNeeds[0];
    const bubbleX = animalX + 120;
    const bubbleY = animalY - 180;

    // Bubble background
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.9);
    bg.fillCircle(bubbleX, bubbleY, 38);
    // Small circles leading to animal
    bg.fillCircle(bubbleX - 20, bubbleY + 45, 12);
    bg.fillCircle(bubbleX - 30, bubbleY + 68, 8);

    const icon = this.add.text(bubbleX, bubbleY, urgent.icon, {
      fontSize: '33px',
    }).setOrigin(0.5);

    // Float animation
    this.tweens.add({
      targets: [bg, icon],
      y: '-=12',
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createActivityButtons(): void {
    const activities = [
      { key: 'feeding', label: 'Feed', icon: 'icon-feed', color: 0xFF9800, scene: 'FeedingScene' },
      { key: 'brushing', label: 'Brush', icon: 'icon-brush', color: 0x9C27B0, scene: 'BrushingScene' },
      { key: 'washing', label: 'Wash', icon: 'icon-wash', color: 0x2196F3, scene: 'WashingScene' },
      { key: 'playing', label: 'Play', icon: 'icon-play', color: 0xFF69B4, scene: 'PlayScene' },
      { key: 'cleaning', label: 'Barn', icon: 'icon-barn', color: 0x795548, scene: 'CleaningScene' },
    ];

    const btnW = 150;
    const totalW = activities.length * btnW;
    const startX = (GAME_WIDTH - totalW) / 2 + btnW / 2;
    const y = GAME_HEIGHT - 83;

    // Bottom bar background
    const barBg = this.add.graphics();
    const barLeft = startX - btnW / 2 - 23;
    const barTop = y - 68;
    const barWidth = totalW + 45;
    const barHeight = 143;
    barBg.fillStyle(0x1A0E0A, 0.5);
    barBg.fillRoundedRect(barLeft + 5, barTop + 6, barWidth, barHeight, 27);
    barBg.fillStyle(0x3E2723, 0.9);
    barBg.fillRoundedRect(barLeft, barTop, barWidth, barHeight, 27);
    barBg.fillStyle(0x5D4037, 0.6);
    barBg.fillRoundedRect(barLeft + 3, barTop + 3, barWidth - 6, 18, 21);
    barBg.lineStyle(3, 0x4E342E, 0.8);
    barBg.strokeRoundedRect(barLeft, barTop, barWidth, barHeight, 27);

    const darken = (c: number, f: number) => {
      const r = Math.floor(((c >> 16) & 0xFF) * f);
      const g = Math.floor(((c >> 8) & 0xFF) * f);
      const b = Math.floor((c & 0xFF) * f);
      return (r << 16) | (g << 8) | b;
    };
    const lighten = (c: number, f: number) => {
      const r = Math.min(255, Math.floor(((c >> 16) & 0xFF) * f));
      const g = Math.min(255, Math.floor(((c >> 8) & 0xFF) * f));
      const b = Math.min(255, Math.floor((c & 0xFF) * f));
      return (r << 16) | (g << 8) | b;
    };

    const drawCircleBtn = (gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, radius: number, hover = false) => {
      gfx.clear();
      gfx.fillStyle(darken(color, 0.4), 0.5);
      gfx.fillCircle(cx + 3, cy + 5, radius);
      gfx.fillStyle(darken(color, 0.7), 1);
      gfx.fillCircle(cx, cy, radius);
      gfx.fillStyle(hover ? lighten(color, 1.15) : color, 1);
      gfx.fillCircle(cx, cy, radius - 5);
      gfx.fillStyle(lighten(color, 1.3), 0.5);
      gfx.fillCircle(cx, cy - 3, radius - 11);
      gfx.fillStyle(0xFFFFFF, hover ? 0.4 : 0.3);
      gfx.fillEllipse(cx, cy - radius * 0.35, radius * 1.2, radius * 0.55);
      gfx.lineStyle(3, darken(color, 0.5), 1);
      gfx.strokeCircle(cx, cy, radius);
    };

    activities.forEach((act, i) => {
      const x = startX + i * btnW;
      const btnGfx = this.add.graphics();
      drawCircleBtn(btnGfx, x, y - 15, act.color, 42);
      this.add.image(x, y - 15, act.icon).setScale(0.0675);
      this.add.text(x, y + 39, act.label, {
        fontSize: '20px',
        fontFamily: 'Fredoka, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#FFFFFF',
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, fill: true, stroke: false },
      }).setOrigin(0.5);

      const hitZone = this.add.zone(x, y, btnW - 15, 135).setInteractive({ useHandCursor: true });
      hitZone.on('pointerover', () => drawCircleBtn(btnGfx, x, y - 15, act.color, 47, true));
      hitZone.on('pointerout', () => drawCircleBtn(btnGfx, x, y - 15, act.color, 42));
      hitZone.on('pointerdown', () => {
        getSoundManager(this).playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(act.scene, { animal: this.currentAnimal });
        });
      });
    });
  }

  private createDirtBucket(): void {
    const bucketX = 90;
    const bucketY = GAME_HEIGHT * 0.45;

    const bucket = this.add.image(bucketX, bucketY, 'tool-dirt-bucket')
      .setScale(0.25)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(bucket);

    this.add.text(bucketX, bucketY + 55, 'Mud!', {
      fontSize: '24px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#8B4513',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    bucket.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      bucket.x = dragX;
      bucket.y = dragY;
    });

    bucket.on('dragend', () => {
      const dist = Phaser.Math.Distance.Between(
        bucket.x, bucket.y,
        this.animalContainer.x, this.animalContainer.y,
      );

      if (dist < 200) {
        // Make animal dirty
        SaveManager.restoreNeed(this.currentAnimal, 'cleanliness', -100);
        getSoundManager(this).playSplash();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.restart({ animal: this.currentAnimal });
        });
      } else {
        // Snap back
        this.tweens.add({
          targets: bucket,
          x: bucketX,
          y: bucketY,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });
  }

  private createAnimalSwitcher(): void {
    const animals = ANIMAL_ORDER;
    const x = GAME_WIDTH - 68;
    const totalStars = SaveManager.getTotalStars();

    // Sidebar background
    const sidebarBg = this.add.graphics();
    // Extra height for wardrobe button at bottom
    const sidebarH = animals.length * 105 + 90;
    sidebarBg.fillStyle(0x000000, 0.15);
    sidebarBg.fillRoundedRect(x - 42, 96, 90, sidebarH, 21);
    sidebarBg.fillStyle(0x000000, 0.35);
    sidebarBg.fillRoundedRect(x - 45, 90, 90, sidebarH, 21);
    sidebarBg.lineStyle(1, 0xFFFFFF, 0.1);
    sidebarBg.strokeRoundedRect(x - 45, 90, 90, sidebarH, 21);

    animals.forEach((key, i) => {
      const y = 143 + i * 105;
      const info = ANIMALS[key];
      const isUnlocked = SaveManager.isUnlocked(key);

      // Circle background
      const circleBg = this.add.graphics();
      if (key === this.currentAnimal) {
        circleBg.fillStyle(0xFFD700, 0.4);
        circleBg.fillCircle(x, y, 42);
        circleBg.lineStyle(3, 0xFFD700);
        circleBg.strokeCircle(x, y, 42);
      } else {
        circleBg.fillStyle(0x000000, 0.2);
        circleBg.fillCircle(x, y, 39);
      }

      const textureKey = `${key}-idle`;
      const sprite = this.add.image(x, y, textureKey).setScale(0.125);

      if (!isUnlocked) {
        sprite.setTint(0x555555);

        // Star progress text below circle
        const starsNeeded = info.starsToUnlock;
        const progressText = `${totalStars}/${starsNeeded}`;
        this.add.text(x, y + 33, progressText, {
          fontSize: '15px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          fontStyle: 'bold',
          color: '#FFD700',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5);

        // Small star icon
        this.add.image(x, y + 50, 'ui-star').setScale(0.018);

        // Lock overlay
        const lock = this.add.image(x, y - 8, 'ui-lock').setScale(0.045);
        lock.setInteractive({ useHandCursor: true });
        lock.on('pointerdown', () => {
          const remaining = starsNeeded - totalStars;
          const msg = remaining > 0
            ? `${info.name} unlocks at ${starsNeeded} stars!\n${remaining} more to go!`
            : `${info.name} is unlocked!`;
          const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
            fontSize: '36px',
            fontFamily: 'Fredoka, Arial, sans-serif',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
            backgroundColor: '#00000088',
            padding: { x: 24, y: 12 },
            align: 'center',
          }).setOrigin(0.5);
          this.time.delayedCall(2000, () => txt.destroy());
        });
      } else if (key !== this.currentAnimal) {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => {
          getSoundManager(this).playClick();
          this.cameras.main.fadeOut(300);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.restart({ animal: key });
          });
        });
      }
    });

    // Wardrobe button below animal switcher
    const wardrobeY = 143 + animals.length * 105;
    const wardGfx = this.add.graphics();
    wardGfx.fillStyle(0x9C27B0, 0.8);
    wardGfx.fillCircle(x, wardrobeY, 33);
    wardGfx.lineStyle(3, 0x7B1FA2, 1);
    wardGfx.strokeCircle(x, wardrobeY, 33);
    wardGfx.fillStyle(0xFFFFFF, 0.2);
    wardGfx.fillEllipse(x, wardrobeY - 9, 45, 21);

    const wardrobeIcon = this.textures.exists('ui-wardrobe')
      ? this.add.image(x, wardrobeY, 'ui-wardrobe').setScale(0.053)
      : this.add.text(x, wardrobeY, '👗', { fontSize: '27px' }).setOrigin(0.5);

    const wardZone = this.add.zone(x, wardrobeY, 75, 75).setInteractive({ useHandCursor: true });
    wardZone.on('pointerdown', () => {
      getSoundManager(this).playClick();
      this.scene.launch('WardrobeScene', { animal: this.currentAnimal });
      this.scene.pause();
    });
  }
}
