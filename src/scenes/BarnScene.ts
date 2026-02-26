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
    this.cameras.main.fadeIn(400);
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
    topBar.fillRect(0, 0, GAME_WIDTH, 50);
    topBar.fillStyle(0xFFFFFF, 0.06);
    topBar.fillRect(0, 0, GAME_WIDTH, 1);
    topBar.fillStyle(0x000000, 0.3);
    topBar.fillRect(0, 50, GAME_WIDTH, 2);

    // Back button
    const backBtn = this.add.text(20, 25, '< Menu', {
      fontSize: '20px',
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

    // Title
    const nameText = ANIMALS[this.currentAnimal].name;
    this.add.text(GAME_WIDTH / 2, 25, `${nameText}'s Barn`, {
      fontSize: '26px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#5D4037',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Star counter
    const totalStars = SaveManager.getTotalStars();
    this.add.image(GAME_WIDTH - 90, 25, 'ui-star').setScale(0.025);
    this.add.text(GAME_WIDTH - 72, 25, `${totalStars}`, {
      fontSize: '20px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
    }).setOrigin(0, 0.5);

  }

  private placeAnimal(): void {
    const needs = SaveManager.getNeeds(this.currentAnimal);

    // Pick texture based on needs
    let textureKey = `${this.currentAnimal}-idle`;
    if (needs.cleanliness < 30) {
      textureKey = `${this.currentAnimal}-dirty`;
    } else if (needs.hunger > 80 && needs.cleanliness > 80 && needs.happiness > 80) {
      textureKey = `${this.currentAnimal}-happy`;
    }

    const animalX = GAME_WIDTH / 2;
    const animalY = GAME_HEIGHT * 0.50;

    // Create container for animal + cosmetic
    this.animalContainer = this.add.container(animalX, animalY);

    const animal = this.add.image(0, 0, textureKey).setScale(0.45);
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
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(0.2);
          this.animalContainer.add(cosmetic);

          // Make cosmetic draggable within the container
          cosmetic.setInteractive({ useHandCursor: true, draggable: true });
          this.input.setDraggable(cosmetic);

          cosmetic.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            // Convert screen drag coords to container-local coords
            const localX = dragX - animalX;
            const localY = dragY - animalY;
            // Constrain within ±100px of center
            cosmetic.x = Phaser.Math.Clamp(localX, -100, 100);
            cosmetic.y = Phaser.Math.Clamp(localY, -100, 100);
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
        y: animalY - 15,
        duration: 200,
        yoyo: true,
        ease: 'Back.easeOut',
      });
      getSoundManager(this).playPop();

      // Boost happiness
      SaveManager.restoreNeed(this.currentAnimal, 'happiness', TAP_HAPPINESS_BOOST);

      const heart = this.add.image(
        animalX + Phaser.Math.Between(-30, 30),
        animalY - 80,
        'ui-heart',
      ).setScale(0.03);
      this.tweens.add({
        targets: heart,
        y: heart.y - 60,
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

    const startX = 25;
    const startY = 75;
    const barW = 90;
    const barH = 12;
    const spacing = 32;

    // Background panel
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.35);
    panel.fillRoundedRect(startX - 10, startY - 18, barW + 50, needList.length * spacing + 12, 10);

    needList.forEach((need, i) => {
      const y = startY + i * spacing;
      const value = needs[need.key];

      // Icon
      this.add.text(startX, y, need.icon, { fontSize: '14px' }).setOrigin(0, 0.5);

      // Bar background
      const bg = this.add.graphics();
      bg.fillStyle(0x333333, 0.8);
      bg.fillRoundedRect(startX + 22, y - barH / 2, barW, barH, 4);

      // Bar fill
      const fill = this.add.graphics();
      let color = 0x4CAF50; // green
      if (value <= 30) color = 0xF44336; // red
      else if (value <= 60) color = 0xFFEB3B; // yellow

      fill.fillStyle(color, 1);
      const fillW = Math.max(0, (barW - 2) * (value / 100));
      if (fillW > 0) {
        fill.fillRoundedRect(startX + 23, y - barH / 2 + 1, fillW, barH - 2, 3);
      }

      // Border
      bg.lineStyle(1, 0x555555, 0.6);
      bg.strokeRoundedRect(startX + 22, y - barH / 2, barW, barH, 4);
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
    const bubbleX = animalX + 80;
    const bubbleY = animalY - 120;

    // Bubble background
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.9);
    bg.fillCircle(bubbleX, bubbleY, 25);
    // Small circles leading to animal
    bg.fillCircle(bubbleX - 20, bubbleY + 30, 8);
    bg.fillCircle(bubbleX - 30, bubbleY + 45, 5);

    const icon = this.add.text(bubbleX, bubbleY, urgent.icon, {
      fontSize: '22px',
    }).setOrigin(0.5);

    // Float animation
    this.tweens.add({
      targets: [bg, icon],
      y: '-=8',
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

    const btnW = 100;
    const totalW = activities.length * btnW;
    const startX = (GAME_WIDTH - totalW) / 2 + btnW / 2;
    const y = GAME_HEIGHT - 55;

    // Bottom bar background
    const barBg = this.add.graphics();
    const barLeft = startX - btnW / 2 - 15;
    const barTop = y - 45;
    const barWidth = totalW + 30;
    const barHeight = 95;
    barBg.fillStyle(0x1A0E0A, 0.5);
    barBg.fillRoundedRect(barLeft + 3, barTop + 4, barWidth, barHeight, 18);
    barBg.fillStyle(0x3E2723, 0.9);
    barBg.fillRoundedRect(barLeft, barTop, barWidth, barHeight, 18);
    barBg.fillStyle(0x5D4037, 0.6);
    barBg.fillRoundedRect(barLeft + 2, barTop + 2, barWidth - 4, 12, 14);
    barBg.lineStyle(2, 0x4E342E, 0.8);
    barBg.strokeRoundedRect(barLeft, barTop, barWidth, barHeight, 18);

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
      gfx.fillCircle(cx + 2, cy + 3, radius);
      gfx.fillStyle(darken(color, 0.7), 1);
      gfx.fillCircle(cx, cy, radius);
      gfx.fillStyle(hover ? lighten(color, 1.15) : color, 1);
      gfx.fillCircle(cx, cy, radius - 3);
      gfx.fillStyle(lighten(color, 1.3), 0.5);
      gfx.fillCircle(cx, cy - 2, radius - 7);
      gfx.fillStyle(0xFFFFFF, hover ? 0.4 : 0.3);
      gfx.fillEllipse(cx, cy - radius * 0.35, radius * 1.2, radius * 0.55);
      gfx.lineStyle(2, darken(color, 0.5), 1);
      gfx.strokeCircle(cx, cy, radius);
    };

    activities.forEach((act, i) => {
      const x = startX + i * btnW;
      const btnGfx = this.add.graphics();
      drawCircleBtn(btnGfx, x, y - 10, act.color, 28);
      this.add.image(x, y - 12, act.icon).setScale(0.045);
      this.add.text(x, y + 26, act.label, {
        fontSize: '13px',
        fontFamily: 'Fredoka, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#FFFFFF',
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
      }).setOrigin(0.5);

      const hitZone = this.add.zone(x, y, btnW - 10, 90).setInteractive({ useHandCursor: true });
      hitZone.on('pointerover', () => drawCircleBtn(btnGfx, x, y - 10, act.color, 31, true));
      hitZone.on('pointerout', () => drawCircleBtn(btnGfx, x, y - 10, act.color, 28));
      hitZone.on('pointerdown', () => {
        getSoundManager(this).playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(act.scene, { animal: this.currentAnimal });
        });
      });
    });
  }

  private createAnimalSwitcher(): void {
    const animals = ANIMAL_ORDER;
    const x = GAME_WIDTH - 45;
    const totalStars = SaveManager.getTotalStars();

    // Sidebar background
    const sidebarBg = this.add.graphics();
    // Extra height for wardrobe button at bottom
    const sidebarH = animals.length * 70 + 60;
    sidebarBg.fillStyle(0x000000, 0.15);
    sidebarBg.fillRoundedRect(x - 28, 64, 60, sidebarH, 14);
    sidebarBg.fillStyle(0x000000, 0.35);
    sidebarBg.fillRoundedRect(x - 30, 60, 60, sidebarH, 14);
    sidebarBg.lineStyle(1, 0xFFFFFF, 0.1);
    sidebarBg.strokeRoundedRect(x - 30, 60, 60, sidebarH, 14);

    animals.forEach((key, i) => {
      const y = 95 + i * 70;
      const info = ANIMALS[key];
      const isUnlocked = SaveManager.isUnlocked(key);

      // Circle background
      const circleBg = this.add.graphics();
      if (key === this.currentAnimal) {
        circleBg.fillStyle(0xFFD700, 0.4);
        circleBg.fillCircle(x, y, 28);
        circleBg.lineStyle(2, 0xFFD700);
        circleBg.strokeCircle(x, y, 28);
      } else {
        circleBg.fillStyle(0x000000, 0.2);
        circleBg.fillCircle(x, y, 26);
      }

      const textureKey = `${key}-idle`;
      const sprite = this.add.image(x, y, textureKey).setScale(0.055);

      if (!isUnlocked) {
        sprite.setTint(0x555555);

        // Star progress text below circle
        const starsNeeded = info.starsToUnlock;
        const progressText = `${totalStars}/${starsNeeded}`;
        this.add.text(x, y + 22, progressText, {
          fontSize: '10px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          fontStyle: 'bold',
          color: '#FFD700',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5);

        // Small star icon
        this.add.image(x, y + 33, 'ui-star').setScale(0.012);

        // Lock overlay
        const lock = this.add.image(x, y - 5, 'ui-lock').setScale(0.03);
        lock.setInteractive({ useHandCursor: true });
        lock.on('pointerdown', () => {
          const remaining = starsNeeded - totalStars;
          const msg = remaining > 0
            ? `${info.name} unlocks at ${starsNeeded} stars!\n${remaining} more to go!`
            : `${info.name} is unlocked!`;
          const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
            fontSize: '24px',
            fontFamily: 'Fredoka, Arial, sans-serif',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#00000088',
            padding: { x: 16, y: 8 },
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
    const wardrobeY = 95 + animals.length * 70;
    const wardGfx = this.add.graphics();
    wardGfx.fillStyle(0x9C27B0, 0.8);
    wardGfx.fillCircle(x, wardrobeY, 22);
    wardGfx.lineStyle(2, 0x7B1FA2, 1);
    wardGfx.strokeCircle(x, wardrobeY, 22);
    wardGfx.fillStyle(0xFFFFFF, 0.2);
    wardGfx.fillEllipse(x, wardrobeY - 6, 30, 14);

    const wardrobeIcon = this.textures.exists('ui-wardrobe')
      ? this.add.image(x, wardrobeY, 'ui-wardrobe').setScale(0.035)
      : this.add.text(x, wardrobeY, '👗', { fontSize: '18px' }).setOrigin(0.5);

    const wardZone = this.add.zone(x, wardrobeY, 50, 50).setInteractive({ useHandCursor: true });
    wardZone.on('pointerdown', () => {
      getSoundManager(this).playClick();
      this.scene.launch('WardrobeScene', { animal: this.currentAnimal });
      this.scene.pause();
    });
  }
}
