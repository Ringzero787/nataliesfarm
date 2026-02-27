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
    const panelW = 1050;
    const panelH = 630;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panel = this.add.graphics();
    // Shadow
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(panelX + 6, panelY + 6, panelW, panelH, 30);
    // Main bg
    panel.fillStyle(0x3E2723, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 30);
    // Top highlight
    panel.fillStyle(0x5D4037, 0.5);
    panel.fillRoundedRect(panelX + 6, panelY + 6, panelW - 12, 24, 24);
    // Border
    panel.lineStyle(3, 0x4E342E, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 30);

    // Title
    this.add.text(GAME_WIDTH / 2, panelY + 45, 'Wardrobe', {
      fontSize: '45px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Animal preview (left side)
    this.createAnimalPreview(panelX + 45, panelY + 105);

    // Cosmetic grid (right side)
    this.createCosmeticGrid(panelX + 420, panelY + 105);

    // Close button
    this.createCloseButton(panelX + panelW - 60, panelY + 23);
  }

  private createAnimalPreview(x: number, y: number): void {
    // Preview background
    const bg = this.add.graphics();
    bg.fillStyle(0x5D4037, 0.6);
    bg.fillRoundedRect(x, y, 330, 450, 21);
    bg.lineStyle(2, 0x8D6E63, 0.5);
    bg.strokeRoundedRect(x, y, 330, 450, 21);

    const centerX = x + 165;
    const centerY = y + 210;

    // Preview uses the same scale ratio as barn (0.45/0.675 = 2/3)
    const previewScale = 2 / 3;

    // Animal name
    const animalName = SaveManager.getAnimalName(this.currentAnimal);
    this.add.text(centerX, y + 23, animalName, {
      fontSize: '27px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Use a container so cosmetic positions match the barn
    const container = this.add.container(centerX, centerY);

    // Animal sprite (scale relative to barn: 0.78 * 2/3 = 0.52)
    const animalImg = this.add.image(0, 0, `${this.currentAnimal}-idle`).setScale(0.78);
    container.add(animalImg);
    container.setScale(previewScale);

    // Cosmetic overlay — draggable, uses same container-local coords as barn
    const equippedId = SaveManager.getEquippedCosmetic(this.currentAnimal);
    if (equippedId) {
      const cosmeticDef = COSMETICS.find(c => c.id === equippedId);
      if (cosmeticDef) {
        const cosmeticKey = `cosmetic-${equippedId}`;
        if (this.textures.exists(cosmeticKey)) {
          const savedPos = SaveManager.getCosmeticPosition(this.currentAnimal);
          const cx = savedPos ? savedPos.x : 0;
          const cy = savedPos ? savedPos.y : cosmeticDef.offsetY;
          const cosmetic = this.add.image(cx, cy, cosmeticKey).setScale(0.3);
          if (cosmeticDef.renderBehind) {
            container.addAt(cosmetic, 0);
          } else {
            container.add(cosmetic);
          }

          // Make cosmetic draggable to reposition
          cosmetic.setInteractive({ useHandCursor: true, draggable: true });
          this.input.setDraggable(cosmetic);

          let dragOffsetX = 0;
          let dragOffsetY = 0;

          cosmetic.on('dragstart', (pointer: Phaser.Input.Pointer) => {
            const worldX = container.x + cosmetic.x * container.scaleX;
            const worldY = container.y + cosmetic.y * container.scaleY;
            dragOffsetX = worldX - pointer.x;
            dragOffsetY = worldY - pointer.y;
          });

          cosmetic.on('drag', (pointer: Phaser.Input.Pointer) => {
            cosmetic.x = (pointer.x + dragOffsetX - container.x) / container.scaleX;
            cosmetic.y = (pointer.y + dragOffsetY - container.y) / container.scaleY;
          });

          cosmetic.on('dragend', () => {
            SaveManager.setCosmeticPosition(this.currentAnimal, cosmetic.x, cosmetic.y);
          });
        }
      }
    }

    // Breathing tween on the container
    this.tweens.add({
      targets: container,
      scaleY: previewScale * 1.02,
      scaleX: previewScale * 0.98,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Equipped hint + drag instructions
    if (equippedId) {
      const name = COSMETICS.find(c => c.id === equippedId)?.name ?? '';
      this.add.text(centerX, y + 390, `Equipped: ${name}`, {
        fontSize: '18px',
        fontFamily: 'Fredoka, Arial, sans-serif',
        color: '#FFE082',
      }).setOrigin(0.5);
      this.add.text(centerX, y + 418, 'Drag to reposition!', {
        fontSize: '15px',
        fontFamily: 'Fredoka, Arial, sans-serif',
        color: '#BCAAA4',
      }).setOrigin(0.5);
    }
  }

  private createCosmeticGrid(x: number, y: number): void {
    const cols = 3;
    const cellW = 180;
    const cellH = 203;
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
        cellBg.fillRoundedRect(cx - cellW / 2 + 6, cy - cellH / 2 + 6, cellW - 12, cellH - 12, 15);
        cellBg.lineStyle(3, 0xFFD700, 0.8);
        cellBg.strokeRoundedRect(cx - cellW / 2 + 6, cy - cellH / 2 + 6, cellW - 12, cellH - 12, 15);
      } else {
        cellBg.fillStyle(0x000000, 0.2);
        cellBg.fillRoundedRect(cx - cellW / 2 + 6, cy - cellH / 2 + 6, cellW - 12, cellH - 12, 15);
      }

      // Cosmetic image
      const cosmeticKey = `cosmetic-${item.id}`;
      const hasTexture = this.textures.exists(cosmeticKey);

      if (isUnlocked) {
        if (hasTexture) {
          this.add.image(cx, cy - 23, cosmeticKey).setScale(0.27);
        } else {
          // Fallback colored circle
          const fb = this.add.graphics();
          fb.fillStyle(0xFFD700, 0.5);
          fb.fillCircle(cx, cy - 23, 38);
        }

        // Name
        this.add.text(cx, cy + 45, item.name, {
          fontSize: '17px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          fontStyle: 'bold',
          color: '#FFFFFF',
        }).setOrigin(0.5);

        if (isEquipped) {
          this.add.text(cx, cy + 68, 'Equipped', {
            fontSize: '15px',
            fontFamily: 'Fredoka, Arial, sans-serif',
            color: '#FFD700',
          }).setOrigin(0.5);
        }

        // Hit zone for equip/unequip
        const zone = this.add.zone(cx, cy, cellW - 12, cellH - 12)
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
          const lockedImg = this.add.image(cx, cy - 23, cosmeticKey).setScale(0.27);
          lockedImg.setTint(0x444444);
        } else {
          const fb = this.add.graphics();
          fb.fillStyle(0x444444, 0.5);
          fb.fillCircle(cx, cy - 23, 38);
        }

        // Lock icon
        this.add.image(cx, cy - 23, 'ui-lock').setScale(0.038);

        // Star cost
        this.add.image(cx - 18, cy + 48, 'ui-star').setScale(0.023);
        this.add.text(cx + 8, cy + 48, `${item.starsToUnlock}`, {
          fontSize: '18px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          fontStyle: 'bold',
          color: totalStars >= item.starsToUnlock ? '#FFD700' : '#888888',
        }).setOrigin(0, 0.5);

        // Name (greyed)
        this.add.text(cx, cy + 72, item.name, {
          fontSize: '15px',
          fontFamily: 'Fredoka, Arial, sans-serif',
          color: '#888888',
        }).setOrigin(0.5);
      }
    });
  }

  private createCloseButton(x: number, y: number): void {
    const btn = this.add.text(x, y, 'X', {
      fontSize: '36px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 5,
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
