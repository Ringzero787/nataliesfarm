import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { getSoundManager } from '../SoundManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Sky gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.sky, COLORS.sky, 0xB8E6B8, 0xB8E6B8);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Ground
    bg.fillStyle(COLORS.hay, 1);
    bg.fillRect(0, GAME_HEIGHT - 180, GAME_WIDTH, 180);

    // Barn silhouette in background
    bg.fillStyle(COLORS.barnWall, 1);
    bg.fillRect(GAME_WIDTH / 2 - 300, GAME_HEIGHT - 480, 600, 300);
    // Roof
    bg.fillStyle(COLORS.barnRoof, 1);
    bg.fillTriangle(
      GAME_WIDTH / 2 - 345, GAME_HEIGHT - 480,
      GAME_WIDTH / 2, GAME_HEIGHT - 660,
      GAME_WIDTH / 2 + 345, GAME_HEIGHT - 480,
    );
    // Barn door
    bg.fillStyle(COLORS.wood, 1);
    bg.fillRoundedRect(GAME_WIDTH / 2 - 75, GAME_HEIGHT - 360, 150, 180, { tl: 75, tr: 75, bl: 0, br: 0 });

    // Sun
    bg.fillStyle(0xFFEB3B, 1);
    bg.fillCircle(270, 150, 75);
    bg.lineStyle(6, 0xFFEB3B, 0.5);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      bg.lineBetween(
        270 + Math.cos(angle) * 90, 150 + Math.sin(angle) * 90,
        270 + Math.cos(angle) * 120, 150 + Math.sin(angle) * 120,
      );
    }

    // Fence
    bg.fillStyle(COLORS.woodLight, 1);
    for (let x = 0; x < GAME_WIDTH; x += 105) {
      bg.fillRect(x + 10, GAME_HEIGHT - 240, 12, 75);
    }
    bg.fillRect(0, GAME_HEIGHT - 225, GAME_WIDTH, 9);
    bg.fillRect(0, GAME_HEIGHT - 195, GAME_WIDTH, 9);

    // Title — use logo image if available, otherwise text
    if (this.textures.exists('ui-logo') && this.textures.get('ui-logo').key !== '__MISSING') {
      const logo = this.add.image(GAME_WIDTH / 2, 112, 'ui-logo').setScale(0.42);
      this.tweens.add({
        targets: logo,
        y: 123,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      const title = this.add.text(GAME_WIDTH / 2, 112, "🐴 Natalie's Farm 🌾", {
        fontSize: '96px',
        fontFamily: 'Fredoka, Arial Rounded MT Bold, sans-serif',
        color: '#5D4037',
        stroke: '#FFFFFF',
        strokeThickness: 12,
      }).setOrigin(0.5);
      this.tweens.add({
        targets: title,
        y: 123,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Hero horse — centered in front of the barn, sized to not block title
    const horse = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, 'horse-happy')
      .setScale(0.70);
    this.tweens.add({
      targets: horse,
      scaleY: 0.72,
      scaleX: 0.68,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle below horse
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, 'Farm Animal Friends!', {
      fontSize: '39px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#795548',
      stroke: '#FFFFFF',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Play button — polished with shadow, gradient bands, border
    const playBtn = this.add.graphics();
    const btnX = GAME_WIDTH / 2 - 195;
    const btnY = GAME_HEIGHT * 0.78;
    const drawPlayBtn = (hover = false) => {
      playBtn.clear();
      // Drop shadow
      playBtn.fillStyle(0x1B5E20, 0.5);
      playBtn.fillRoundedRect(btnX + 4, btnY + 7, 390, 105, 27);
      // Dark base
      playBtn.fillStyle(hover ? 0x43A047 : 0x388E3C, 1);
      playBtn.fillRoundedRect(btnX, btnY, 390, 105, 27);
      // Main body gradient
      playBtn.fillStyle(hover ? 0x66BB6A : 0x4CAF50, 1);
      playBtn.fillRoundedRect(btnX + 3, btnY + 3, 384, 78, 24);
      // Top highlight
      playBtn.fillStyle(hover ? 0xA5D6A7 : 0x81C784, 1);
      playBtn.fillRoundedRect(btnX + 9, btnY + 6, 372, 33, 18);
      // Inner glow
      playBtn.fillStyle(0xC8E6C9, 0.3);
      playBtn.fillRoundedRect(btnX + 15, btnY + 9, 360, 18, 12);
      // Border
      playBtn.lineStyle(2, 0x2E7D32, 1);
      playBtn.strokeRoundedRect(btnX, btnY, 390, 105, 27);
    };
    drawPlayBtn();

    const playText = this.add.text(GAME_WIDTH / 2, btnY + 52, 'PLAY!', {
      fontSize: '60px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#2E7D32',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 2, color: '#1B5E20', blur: 4, fill: true, stroke: false },
    }).setOrigin(0.5);

    const hitZone = this.add.zone(GAME_WIDTH / 2, btnY + 52, 390, 105).setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => drawPlayBtn(true));
    hitZone.on('pointerout', () => drawPlayBtn(false));

    hitZone.on('pointerdown', () => {
      const sfx = getSoundManager(this);
      sfx.resume();
      sfx.playClick();
      this.tweens.add({
        targets: [playBtn, playText, horse],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('BarnScene', { animal: 'horse' });
          });
        },
      });
    });

    // Other animal friends flanking the sides
    const sideAnimals = [
      { key: 'pig', x: 180, y: GAME_HEIGHT - 98, scale: 0.16 },
      { key: 'sheep', x: GAME_WIDTH - 200, y: GAME_HEIGHT - 98, scale: 0.16 },
      { key: 'bunny', x: GAME_WIDTH - 80, y: GAME_HEIGHT - 90, scale: 0.135 },
    ];
    sideAnimals.forEach((a, i) => {
      const sprite = this.add.image(a.x, a.y, `${a.key}-idle`).setScale(a.scale);
      this.tweens.add({
        targets: sprite,
        y: a.y - 9,
        duration: 1500 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    this.cameras.main.fadeIn(500);
  }
}
