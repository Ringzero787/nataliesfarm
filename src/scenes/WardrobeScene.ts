import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, AnimalType, ANIMALS, COSMETICS, CosmeticItem } from '../config';
import { getSoundManager } from '../SoundManager';
import { SaveManager } from '../SaveManager';

/**
 * WardrobeScene — overlay scene for equipping cosmetics on the current animal.
 * Launched on top of BarnScene (not a full scene transition).
 */
export class WardrobeScene extends Phaser.Scene {
  private currentAnimal: AnimalType = 'horse';

  constructor() {
    super({ key: 'WardrobeScene' });
  }

  init(data: { animal?: AnimalType }): void {
    this.currentAnimal = data.animal ?? 'horse';
  }

  create(): void {
    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    // Panel
    const panelW = 700;
    const panelH = 420;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panel = this.add.graphics();
    // Shadow
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(panelX + 4, panelY + 4, panelW, panelH, 20);
    // Main bg
    panel.fillStyle(0x3E2723, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
    // Top highlight
    panel.fillStyle(0x5D4037, 0.5);
    panel.fillRoundedRect(panelX + 4, panelY + 4, panelW - 8, 16, 16);
    // Border
    panel.lineStyle(2, 0x4E342E, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

    // Title
    this.add.text(GAME_WIDTH / 2, panelY + 30, 'Wardrobe', {
      fontSize: '30px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Animal preview (left side)
    this.createAnimalPreview(panelX + 30, panelY + 70);

    // Cosmetic grid (right side)
    this.createCosmeticGrid(panelX + 280, panelY + 70);

    // Close button
    this.createCloseButton(panelX + panelW - 40, panelY + 15);
  }

  private createAnimalPreview(x: number, y: number): void {
    // Preview background
    const bg = this.add.graphics();
    bg.fillStyle(0x5D4037, 0.6);
    bg.fillRoundedRect(x, y, 220, 300, 14);
    bg.lineStyle(1, 0x8D6E63, 0.5);
    bg.strokeRoundedRect(x, y, 220, 300, 14);

    const centerX = x + 110;
    const centerY = y + 140;

    // Animal name
    this.add.text(centerX, y + 15, ANIMALS[this.currentAnimal].name, {
      fontSize: '18px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Animal sprite
    const animalImg = this.add.image(centerX, centerY, `${this.currentAnimal}-idle`).setScale(0.3);

    // Cosmetic overlay on preview (uses saved position if available)
    const equippedId = SaveManager.getEquippedCosmetic(this.currentAnimal);
    if (equippedId) {
      const cosmeticDef = COSMETICS.find(c => c.id === equippedId);
      if (cosmeticDef) {
        const cosmeticKey = `cosmetic-${equippedId}`;
        if (this.textures.exists(cosmeticKey)) {
          const savedPos = SaveManager.getCosmeticPosition(this.currentAnimal);
          const cosX = savedPos ? savedPos.x * 0.3 : 0;
          const cosY = savedPos ? savedPos.y * 0.3 : cosmeticDef.offsetY * 0.3;
          this.add.image(centerX + cosX, centerY + cosY, cosmeticKey).setScale(0.13);
        }
      }
    }

    // Breathing tween
    this.tweens.add({
      targets: animalImg,
      scaleY: 0.31,
      scaleX: 0.29,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // "Tap to unequip" hint
    if (equippedId) {
      this.add.text(centerX, y + 270, 'Equipped: ' + (COSMETICS.find(c => c.id === equippedId)?.name ?? ''), {
        fontSize: '12px',
        fontFamily: 'Fredoka, Arial, sans-serif',
        color: '#FFE082',
      }).setOrigin(0.5);
    }
  }

  private createCosmeticGrid(x: number, y: number): void {
    const cols = 3;
    const cellW = 120;
    const cellH = 135;
    const totalStars = SaveManager.getTotalStars();
    const equippedId = SaveManager.getEquippedCosmetic(this.currentAnimal);

    COSMETICS.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x + col * cellW + cellW / 2;
      const cy = y + row * cellH + cellH / 2;
      const isUnlocked = SaveManager.isCosmeticUnlocked(item.id);
      const isEquipped = equippedId === item.id;

      // Cell background
      const cellBg = this.add.graphics();
      if (isEquipped) {
        cellBg.fillStyle(0xFFD700, 0.3);
        cellBg.fillRoundedRect(cx - cellW / 2 + 4, cy - cellH / 2 + 4, cellW - 8, cellH - 8, 10);
        cellBg.lineStyle(2, 0xFFD700, 0.8);
        cellBg.strokeRoundedRect(cx - cellW / 2 + 4, cy - cellH / 2 + 4, cellW - 8, cellH - 8, 10);
      } else {
        cellBg.fillStyle(0x000000, 0.2);
        cellBg.fillRoundedRect(cx - cellW / 2 + 4, cy - cellH / 2 + 4, cellW - 8, cellH - 8, 10);
      }

      // Cosmetic image
      const cosmeticKey = `cosmetic-${item.id}`;
      const hasTexture = this.textures.exists(cosmeticKey);

      if (isUnlocked) {
        if (hasTexture) {
          this.add.image(cx, cy - 15, cosmeticKey).setScale(0.12);
        } else {
          // Fallback colored circle
          const fb = this.add.graphics();
          fb.fillStyle(0xFFD700, 0.5);
          fb.fillCircle(cx, cy - 15, 25);
        }

        // Name
        this.add.text(cx, cy + 30, item.name, {
          fontSize: '11px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          fontStyle: 'bold',
          color: '#FFFFFF',
        }).setOrigin(0.5);

        if (isEquipped) {
          this.add.text(cx, cy + 45, 'Equipped', {
            fontSize: '10px',
            fontFamily: 'Fredoka, Arial, sans-serif',
            color: '#FFD700',
          }).setOrigin(0.5);
        }

        // Hit zone for equip/unequip
        const zone = this.add.zone(cx, cy, cellW - 8, cellH - 8)
          .setInteractive({ useHandCursor: true });

        zone.on('pointerdown', () => {
          getSoundManager(this).playClick();
          if (isEquipped) {
            SaveManager.equipCosmetic(this.currentAnimal, null);
          } else {
            SaveManager.equipCosmetic(this.currentAnimal, item.id);
            // Reset position to default when equipping a new cosmetic
            SaveManager.resetCosmeticPosition(this.currentAnimal);
          }
          // Refresh the scene
          this.scene.restart({ animal: this.currentAnimal });
        });
      } else {
        // Locked state
        if (hasTexture) {
          const lockedImg = this.add.image(cx, cy - 15, cosmeticKey).setScale(0.12);
          lockedImg.setTint(0x444444);
        } else {
          const fb = this.add.graphics();
          fb.fillStyle(0x444444, 0.5);
          fb.fillCircle(cx, cy - 15, 25);
        }

        // Lock icon
        this.add.image(cx, cy - 15, 'ui-lock').setScale(0.025);

        // Star cost
        this.add.image(cx - 12, cy + 32, 'ui-star').setScale(0.015);
        this.add.text(cx + 5, cy + 32, `${item.starsToUnlock}`, {
          fontSize: '12px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          fontStyle: 'bold',
          color: totalStars >= item.starsToUnlock ? '#FFD700' : '#888888',
        }).setOrigin(0, 0.5);

        // Name (greyed)
        this.add.text(cx, cy + 48, item.name, {
          fontSize: '10px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          color: '#888888',
        }).setOrigin(0.5);
      }
    });
  }

  private createCloseButton(x: number, y: number): void {
    const btn = this.add.text(x, y, 'X', {
      fontSize: '24px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      getSoundManager(this).playClick();
      this.scene.stop();
      this.scene.resume('BarnScene');
      // Restart BarnScene to reflect any cosmetic changes
      this.scene.get('BarnScene').scene.restart({ animal: this.currentAnimal });
    });
  }
}
