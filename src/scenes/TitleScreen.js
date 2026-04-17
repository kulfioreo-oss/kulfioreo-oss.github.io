import { playSceneMusic } from '../audio/musicManager.js';

export class TitleScreen extends Phaser.Scene {

    constructor() {
        super('TitleScreen');
    }

    preload() {
        this.load.image('title_bg', 'assets/title_bg.png');
        this.load.image('title_logo', 'assets/title_logo.png');
        this.load.image('hero', 'assets/hero.png');
        this.load.audio('mainmenu-music', 'assets/audio/mainmenu-music.mp3');
    }

    create() {
        const W = this.scale.width;   // 1280
        const H = this.scale.height;  // 720

        playSceneMusic(this, 'mainmenu-music');

        // ── BACKGROUND ────────────────────────────────────────────────────────
        this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'title_bg');
        this.bg.setAlpha(0.7);

        // ── SKY OVERLAY (solid dark retro sky) ────────────────────────────────
        const sky = this.add.graphics();
        sky.fillStyle(0x0d0d2b, 1);
        sky.fillRect(0, 0, W, H * 0.62);

        // ── PIXEL STARFIELD ───────────────────────────────────────────────────
        this._buildStarfield(W, H);

        // ── CRESCENT MOON ─────────────────────────────────────────────────────
        const moon = this.add.graphics();
        moon.fillStyle(0xFFF8DC, 1);
        moon.fillCircle(W - 130, 80, 38);
        moon.fillStyle(0x0d0d2b, 1);
        moon.fillCircle(W - 112, 70, 30);

        // ── FLOOR ─────────────────────────────────────────────────────────────
        this._buildFloor(W, H);

        // ── PANEL behind logo ─────────────────────────────────────────────────
        const panelX = W / 2 - 500;
        const panelY = 90;
        const panelW = 1000;
        const panelH = 300;
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.6);
        panel.fillRect(panelX, panelY, panelW, panelH);
        panel.lineStyle(4, 0xFFD700, 1);
        panel.strokeRect(panelX, panelY, panelW, panelH);
        panel.lineStyle(2, 0xB8860B, 1);
        panel.strokeRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12);

        // corner pixels (retro style)
        panel.fillStyle(0xFFD700, 1);
        [[panelX, panelY], [panelX + panelW - 8, panelY], [panelX, panelY + panelH - 8], [panelX + panelW - 8, panelY + panelH - 8]].forEach(([cx, cy]) => {
            panel.fillRect(cx, cy, 8, 8);
        });

        // ── LOGO ──────────────────────────────────────────────────────────────
        const logo = this.add.image(W / 2, panelY + 130, 'title_logo');
        logo.setOrigin(0.5, 0.5);
        const maxW = 860, maxH = 210;
        logo.setScale(Math.min(maxW / logo.width, maxH / logo.height));

        this.tweens.add({
            targets: logo,
            y: panelY + 140,
            duration: 1400,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });

        // ── SUB-TITLE ─────────────────────────────────────────────────────────
        this.add.text(W / 2, panelY + panelH - 40, '✦  GAME EDUKASI ZAKAT  ✦', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '19px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            letterSpacing: 5
        }).setOrigin(0.5);

        // ── HERO CHARACTER (right side) ────────────────────────────────────────
        const heroBaseY = H - 82;
        const hero = this.add.image(W - 140, heroBaseY, 'hero');
        hero.setOrigin(0.5, 1);
        // scale hero to max 150px tall
        const heroMaxH = 160;
        hero.setScale(heroMaxH / hero.height);
        this.tweens.add({
            targets: hero,
            y: heroBaseY - 10,
            duration: 900,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });

        // ── COINS ─────────────────────────────────────────────────────────────
        this._addPixelCoins(W, H);

        // ── "PRESS ENTER" BUTTON ──────────────────────────────────────────────
        const btnY = H - 128;
        const startText = this.add.text(W / 2, btnY, '►  TEKAN ENTER ATAU KLIK UNTUK MULAI  ◄', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '22px',
            color: '#000000',
            stroke: '#000000',
            strokeThickness: 1,
            letterSpacing: 2,
            backgroundColor: '#FFD700',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: 0.15,
            duration: 480,
            ease: 'Stepped',
            easeParams: [2],
            yoyo: true,
            loop: -1
        });

        // ── CREDIT ────────────────────────────────────────────────────────────
        this.add.text(W / 2, H - 50, '© 2025  PETUALANGAN ZAKAT  •  EDU GAME  v1.0', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '13px',
            color: '#777777',
            stroke: '#000000',
            strokeThickness: 3,
            letterSpacing: 2
        }).setOrigin(0.5);

        // ── SCANLINES & CRT ────────────────────────────────────────────────────
        this._buildScanlines(W, H);

        // ── INPUT ─────────────────────────────────────────────────────────────
        const onStart = () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Masuk ke scene kamar Ahmad
                this.scene.start('KamarAhmad');
            });
        };
        this.input.keyboard.once('keydown-ENTER', onStart);
        this.input.keyboard.once('keydown-SPACE', onStart);
        this.input.once('pointerdown', onStart);

        // ── FADE IN ────────────────────────────────────────────────────────────
        this.cameras.main.fadeIn(900, 0, 0, 0);
    }

    update() {
        this.bg.tilePositionX += 0.25;
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    _buildStarfield(W, H) {
        const gfx = this.add.graphics();
        const colors = [0xffffff, 0xffffcc, 0xaaddff, 0xffccaa];
        for (let i = 0; i < 90; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H * 0.58);
            const sz = Phaser.Math.Between(1, 3);
            gfx.fillStyle(Phaser.Utils.Array.GetRandom(colors), Phaser.Math.FloatBetween(0.3, 1.0));
            gfx.fillRect(x, y, sz, sz);
        }
    }

    _buildFloor(W, H) {
        const gfx = this.add.graphics();
        const floorY = H - 80;
        const tileW = 32;

        gfx.fillStyle(0x3b2314, 1);
        gfx.fillRect(0, floorY + 18, W, H - floorY);

        for (let x = 0; x < W; x += tileW) {
            gfx.fillStyle(0x2d7d1a, 1);
            gfx.fillRect(x, floorY, tileW - 1, 18);
            gfx.fillStyle(0x3ea821, 1);
            gfx.fillRect(x + 2, floorY + 2, tileW - 6, 5);
            gfx.fillStyle(0x1a5e0d, 1);
            gfx.fillRect(x, floorY, tileW - 1, 2);
        }

        for (let x = 0; x < W; x += tileW) {
            gfx.fillStyle(0x4a2e18, 1);
            gfx.fillRect(x, floorY + 18, tileW - 1, H - floorY);
            gfx.fillStyle(0x5a3920, 1);
            gfx.fillRect(x + 4, floorY + 22, 6, 4);
            gfx.fillRect(x + 18, floorY + 32, 6, 4);
        }
    }

    _addPixelCoins(W, H) {
        const gfx = this.add.graphics();
        const floorY = H - 80;

        const positions = [
            140, 180, 220,
            W / 2 - 200, W / 2 - 160, W / 2 - 120,
            W / 2 + 50, W / 2 + 90,
        ];

        positions.forEach(px => {
            gfx.fillStyle(0xFFD700, 1);
            gfx.fillRect(px - 6, floorY - 14, 12, 14);
            gfx.fillStyle(0xFFEE55, 1);
            gfx.fillRect(px - 4, floorY - 12, 4, 5);
            gfx.fillStyle(0xB8860B, 1);
            gfx.fillRect(px + 2, floorY - 7, 4, 7);
        });
    }

    _buildScanlines(W, H) {
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.07);
        for (let y = 0; y < H; y += 4) {
            g.fillRect(0, y, W, 2);
        }
        const v = this.add.graphics();
        v.fillStyle(0x000000, 0.35);
        v.fillRect(0, 0, 55, H);
        v.fillRect(W - 55, 0, 55, H);
        v.fillRect(0, 0, W, 30);
        v.fillRect(0, H - 30, W, 30);
    }
}
