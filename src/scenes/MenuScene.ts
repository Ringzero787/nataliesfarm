import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { getSoundManager, TRACK_NAMES } from '../SoundManager';

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
    bg.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);

    // Barn silhouette in background
    bg.fillStyle(COLORS.barnWall, 1);
    bg.fillRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 320, 400, 200);
    // Roof
    bg.fillStyle(COLORS.barnRoof, 1);
    bg.fillTriangle(
      GAME_WIDTH / 2 - 230, GAME_HEIGHT - 320,
      GAME_WIDTH / 2, GAME_HEIGHT - 440,
      GAME_WIDTH / 2 + 230, GAME_HEIGHT - 320,
    );
    // Barn door
    bg.fillStyle(COLORS.wood, 1);
    bg.fillRoundedRect(GAME_WIDTH / 2 - 50, GAME_HEIGHT - 240, 100, 120, { tl: 50, tr: 50, bl: 0, br: 0 });

    // Sun
    bg.fillStyle(0xFFEB3B, 1);
    bg.fillCircle(180, 100, 50);
    bg.lineStyle(4, 0xFFEB3B, 0.5);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      bg.lineBetween(
        180 + Math.cos(angle) * 60, 100 + Math.sin(angle) * 60,
        180 + Math.cos(angle) * 80, 100 + Math.sin(angle) * 80,
      );
    }

    // Fence
    bg.fillStyle(COLORS.woodLight, 1);
    for (let x = 0; x < GAME_WIDTH; x += 70) {
      bg.fillRect(x + 10, GAME_HEIGHT - 160, 8, 50);
    }
    bg.fillRect(0, GAME_HEIGHT - 150, GAME_WIDTH, 6);
    bg.fillRect(0, GAME_HEIGHT - 130, GAME_WIDTH, 6);

    // Title — use logo image if available, otherwise text
    if (this.textures.exists('ui-logo') && this.textures.get('ui-logo').key !== '__MISSING') {
      const logo = this.add.image(GAME_WIDTH / 2, 75, 'ui-logo').setScale(0.28);
      this.tweens.add({
        targets: logo,
        y: 82,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      const title = this.add.text(GAME_WIDTH / 2, 75, "🐴 Natalie's Farm 🌾", {
        fontSize: '64px',
        fontFamily: 'Fredoka, Arial Rounded MT Bold, sans-serif',
        color: '#5D4037',
        stroke: '#FFFFFF',
        strokeThickness: 8,
      }).setOrigin(0.5);
      this.tweens.add({
        targets: title,
        y: 82,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Hero horse — big and centered in front of the barn
    const horse = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.48, 'horse-happy')
      .setScale(0.40);
    this.tweens.add({
      targets: horse,
      scaleY: 0.41,
      scaleX: 0.39,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle below horse
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, 'Farm Animal Friends!', {
      fontSize: '26px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      color: '#795548',
      stroke: '#FFFFFF',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Play button — polished with shadow, gradient bands, border
    const playBtn = this.add.graphics();
    const btnX = GAME_WIDTH / 2 - 130;
    const btnY = GAME_HEIGHT * 0.78;
    const drawPlayBtn = (hover = false) => {
      playBtn.clear();
      // Drop shadow
      playBtn.fillStyle(0x1B5E20, 0.5);
      playBtn.fillRoundedRect(btnX + 3, btnY + 5, 260, 70, 18);
      // Dark base
      playBtn.fillStyle(hover ? 0x43A047 : 0x388E3C, 1);
      playBtn.fillRoundedRect(btnX, btnY, 260, 70, 18);
      // Main body gradient
      playBtn.fillStyle(hover ? 0x66BB6A : 0x4CAF50, 1);
      playBtn.fillRoundedRect(btnX + 2, btnY + 2, 256, 52, 16);
      // Top highlight
      playBtn.fillStyle(hover ? 0xA5D6A7 : 0x81C784, 1);
      playBtn.fillRoundedRect(btnX + 6, btnY + 4, 248, 22, 12);
      // Inner glow
      playBtn.fillStyle(0xC8E6C9, 0.3);
      playBtn.fillRoundedRect(btnX + 10, btnY + 6, 240, 12, 8);
      // Border
      playBtn.lineStyle(2, 0x2E7D32, 1);
      playBtn.strokeRoundedRect(btnX, btnY, 260, 70, 18);
    };
    drawPlayBtn();

    const playText = this.add.text(GAME_WIDTH / 2, btnY + 35, 'PLAY!', {
      fontSize: '40px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#2E7D32',
      strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#1B5E20', blur: 4, fill: true, stroke: false },
    }).setOrigin(0.5);

    const hitZone = this.add.zone(GAME_WIDTH / 2, btnY + 35, 260, 70).setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => drawPlayBtn(true));
    hitZone.on('pointerout', () => drawPlayBtn(false));

    hitZone.on('pointerdown', () => {
      const sfx = getSoundManager(this);
      sfx.resume();
      sfx.playClick();
      sfx.startBGM();
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
      { key: 'pig', x: 120, y: GAME_HEIGHT - 65, scale: 0.07 },
      { key: 'sheep', x: GAME_WIDTH - 200, y: GAME_HEIGHT - 65, scale: 0.07 },
      { key: 'bunny', x: GAME_WIDTH - 80, y: GAME_HEIGHT - 60, scale: 0.06 },
    ];
    sideAnimals.forEach((a, i) => {
      const sprite = this.add.image(a.x, a.y, `${a.key}-idle`).setScale(a.scale);
      this.tweens.add({
        targets: sprite,
        y: a.y - 6,
        duration: 1500 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // ── Music Selector (big kid-friendly toggle) ──
    this.createMusicSelector();

    this.cameras.main.fadeIn(500);
  }

  private createMusicSelector(): void {
    const sfx = getSoundManager(this);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 28;
    const pillW = 240;
    const pillH = 50;

    // Background pill — polished with shadow, gradient, border
    const musicBg = this.add.graphics();
    const drawMusicBg = (hover = false) => {
      musicBg.clear();
      // Drop shadow
      musicBg.fillStyle(0x311B92, 0.4);
      musicBg.fillRoundedRect(cx - pillW / 2 + 2, cy - pillH / 2 + 3, pillW, pillH, 25);
      // Dark base
      musicBg.fillStyle(hover ? 0x673AB7 : 0x512DA8, 1);
      musicBg.fillRoundedRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 25);
      // Lighter body
      musicBg.fillStyle(hover ? 0x9575CD : 0x7E57C2, 1);
      musicBg.fillRoundedRect(cx - pillW / 2 + 2, cy - pillH / 2 + 2, pillW - 4, pillH * 0.6, 22);
      // Top shine
      musicBg.fillStyle(0xD1C4E9, 0.3);
      musicBg.fillRoundedRect(cx - pillW / 2 + 6, cy - pillH / 2 + 4, pillW - 12, pillH * 0.3, 16);
      // Border
      musicBg.lineStyle(2, 0x4527A0, 1);
      musicBg.strokeRoundedRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 25);
    };
    drawMusicBg();

    // Note icon on the left
    const noteIcon = this.add.text(cx - pillW / 2 + 32, cy, '🎵', {
      fontSize: '26px',
    }).setOrigin(0.5);

    // Track name label — centered in the pill
    const trackLabel = this.add.text(cx + 14, cy, sfx.currentTrackName, {
      fontSize: '20px',
      fontFamily: 'Fredoka, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#4A148C',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Hit zone
    const musicHit = this.add.zone(cx, cy, pillW, pillH).setInteractive({ useHandCursor: true });

    musicHit.on('pointerover', () => drawMusicBg(true));
    musicHit.on('pointerout', () => drawMusicBg(false));

    musicHit.on('pointerdown', () => {
      sfx.resume();
      sfx.switchTrack();
      trackLabel.setText(sfx.currentTrackName);
      sfx.playClick();

      // Bounce the note icon
      this.tweens.add({
        targets: noteIcon,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    });
  }
}
