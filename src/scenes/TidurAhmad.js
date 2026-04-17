import { playSceneMusic } from '../audio/musicManager.js';

export class TidurAhmad extends Phaser.Scene {

    constructor() {
        super('TidurAhmad');

        // Dialog singkat sebelum Ahmad tidur
        // portrait = { key: 'sprite', frame: N }
        // frame 7  = lelah/mengantuk
        // frame 13 = ngantuk (mata setengah tutup)
        this._dialogs = [
            {
                speaker: 'Narasi',
                text: 'Malam semakin larut...\nMata Ahmad mulai terasa berat.',
                portrait: null
            },
            {
                speaker: 'Ahmad',
                text: '"Hah... ngantuk sekali.\nBesok saja aku pikirkan soal zakat..."',
                portrait: { key: 'sprite', frame: 13 }  // ngantuk
            },
            {
                speaker: 'Narasi',
                text: 'Ahmad pun berjalan menuju kasurnya...',
                portrait: null,
                isLast: true   // setelah ini trigger animasi jalan
            }
        ];

        this._dialogIndex = 0;
        this._dialogOpen = false;
        this._walkStarted = false;
    }

    preload() {
        this.load.tilemapTiledJSON('kamar', 'assets/map/kamar.json');
        this.load.image('interior', 'assets/map/interior.png');

        // Spritesheet berjalan (ahmad.png, 4x4, 421x632 per frame)
        // Baris 0: bawah, Baris 1: atas, Baris 2: kiri, Baris 3: kanan
        this.load.spritesheet('ahmad_walk', 'assets/char/ahmad.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        // Spritesheet tidur/mengantuk (tidur.png, 4x4, 421x632 per frame)
        // Beberapa frame berisi arah berbeda, jadi animasi awal memilih frame depan saja.
        this.load.spritesheet('tidur', 'assets/char/tidur.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        // Ekspresi wajah
        this.load.spritesheet('sprite', 'assets/char/sprite.png', {
            frameWidth: 421,
            frameHeight: 632
        });
        this.load.audio('dream-ambience', 'assets/audio/dream-ambience.mp3');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        playSceneMusic(this, 'dream-ambience');

        // ── TILEMAP ─────────────────────────────────────────────────────────────
        const map = this.make.tilemap({ key: 'kamar' });
        const tiles = map.addTilesetImage('interior', 'interior');

        this._layerGround = map.createLayer('ground', tiles, 0, 0);
        this._layerSolid = map.createLayer('solid', tiles, 0, 0);
        this._layerObject = map.createLayer('object', tiles, 0, 0);

        const mapW = map.widthInPixels;
        const mapH = map.heightInPixels;
        const mapScale = Math.min(W / mapW, H / mapH) * 0.88;
        const offsetX = (W - mapW * mapScale) / 2;
        const offsetY = (H - mapH * mapScale) / 2 - 30;

        [this._layerGround, this._layerSolid, this._layerObject].forEach(l => {
            if (l) { l.setScale(mapScale); l.setPosition(offsetX, offsetY); }
        });

        // ── POSISI ──────────────────────────────────────────────────────────────
        // Ahmad mulai di posisi menghitung (sama seperti scene sebelumnya)
        const startTileX = 12, startTileY = 13;
        const startX = offsetX + (startTileX + 0.5) * 16 * mapScale;
        const startY = offsetY + (startTileY + 0.5) * 16 * mapScale;

        // Dua kasur ada di kolom 6-9, baris 5-10. Ahmad tidur di kasur kanan.
        const kasurTileX = 9, kasurTileY = 8;
        const kasurX = offsetX + kasurTileX * 16 * mapScale;
        const kasurY = offsetY + kasurTileY * 16 * mapScale;

        // ── SPRITE KARAKTER ──────────────────────────────────────────────────────
        const targetCharH = 16 * mapScale * 1.8;
        const charScale = targetCharH / 632;

        this._ahmad = this.add.sprite(startX, startY, 'ahmad_walk', 0);
        this._ahmad.setScale(charScale);
        this._ahmad.setOrigin(0.5, 0.8);

        // ── BUAT ANIMASI ─────────────────────────────────────────────────────────
        this._createAnims();

        // Idle menghadap bawah sambil menunggu dialog
        this._ahmad.play('tidur_idle_down');

        // ── VIGNETTE & CAHAYA MALAM ──────────────────────────────────────────────
        this._addVignette(W, H);

        // Overlay malam sedikit lebih gelap dari scene sebelumnya
        const nightOverlay = this.add.graphics();
        nightOverlay.fillStyle(0x000011, 0.25);
        nightOverlay.fillRect(0, 0, W, H);

        // ── UI DIALOG ────────────────────────────────────────────────────────────
        this._buildDialogUI(W, H);

        // ── MULAI DIALOG setelah fade in ─────────────────────────────────────────
        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.cameras.main.once('camerafadeincomplete', () => {
            this.time.delayedCall(400, () => this._showDialog(0));
        });

        // Input
        this.input.keyboard.on('keydown-ENTER', () => this._nextDialog());
        this.input.keyboard.on('keydown-SPACE', () => this._nextDialog());
        this.input.on('pointerdown', () => this._nextDialog());

        // Simpan referensi untuk walking
        this._kasurX = kasurX;
        this._kasurY = kasurY;
        this._charScale = charScale;
        this._mapScale = mapScale;
        this._offsetX = offsetX;
        this._offsetY = offsetY;
    }

    // ── DIALOG SYSTEM ─────────────────────────────────────────────────────────

    _buildDialogUI(W, H) {
        const panelH = 150;
        const panelY = H - panelH - 10;
        const pad = 14;

        this._dlgBg = this.add.graphics();
        this._dlgBg.fillStyle(0x050510, 0.92);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, 0xFFD700, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.setVisible(false);

        // Portrait ekspresi
        this._dlgPortrait = this.add.sprite(68, panelY + panelH / 2, 'sprite', 0);
        this._dlgPortrait.setScale(110 / 632);
        this._dlgPortrait.setVisible(false);

        this._dlgSpeaker = this.add.text(120, panelY + pad, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '17px', color: '#FFD700',
            stroke: '#000', strokeThickness: 3
        });

        this._dlgText = this.add.text(120, panelY + pad + 26, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px', color: '#ffffff',
            stroke: '#000', strokeThickness: 2,
            lineSpacing: 6, wordWrap: { width: W - 180 }
        });

        this._dlgHint = this.add.text(W - 60, H - 22, '▼ lanjut', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px', color: '#888888'
        }).setOrigin(0.5).setVisible(false);

        this.tweens.add({ targets: this._dlgHint, alpha: 0.2, duration: 500, yoyo: true, loop: -1 });
    }

    _showDialog(index) {
        if (index >= this._dialogs.length) return;

        this._dialogIndex = index;
        const d = this._dialogs[index];
        this._dialogOpen = true;

        this._dlgBg.setVisible(true);
        this._dlgHint.setVisible(true);

        // Redraw panel
        this._dlgBg.clear();
        const W = this.scale.width, H = this.scale.height;
        const panelH = 150, panelY = H - panelH - 10;
        this._dlgBg.fillStyle(0x050510, 0.94);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, 0xAAAAAA, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);

        // Portrait
        if (d.portrait && typeof d.portrait === 'object') {
            this._dlgPortrait.setTexture(d.portrait.key, d.portrait.frame);
            this._dlgPortrait.setVisible(true);
        } else {
            this._dlgPortrait.setVisible(false);
        }

        const speakerColor = d.speaker === 'Ahmad' ? '#FFD700' : '#CCCCCC';
        this._dlgSpeaker.setColor(speakerColor).setText(d.speaker);

        // Typewriter
        this._dlgText.setText('');
        this._typewriterIndex = 0;
        this._fullText = d.text;
        this._isTyping = true;
        this._isLastDialog = !!d.isLast;

        if (this._typewriterEvent) this._typewriterEvent.remove();
        this._typewriterEvent = this.time.addEvent({
            delay: 28,
            callback: () => {
                this._typewriterIndex++;
                this._dlgText.setText(this._fullText.substring(0, this._typewriterIndex));
                if (this._typewriterIndex >= this._fullText.length) {
                    this._isTyping = false;
                    this._typewriterEvent.remove();
                }
            },
            loop: true
        });
    }

    _nextDialog() {
        if (!this._dialogOpen) return;

        if (this._isTyping) {
            if (this._typewriterEvent) this._typewriterEvent.remove();
            this._dlgText.setText(this._fullText);
            this._isTyping = false;
            return;
        }

        if (this._isLastDialog && !this._walkStarted) {
            // Tutup dialog dan mulai animasi jalan
            this._closeDialog();
            this.time.delayedCall(300, () => this._startWalkToBed());
            return;
        }

        this._showDialog(this._dialogIndex + 1);
    }

    _closeDialog() {
        this._dlgBg.setVisible(false);
        this._dlgPortrait.setVisible(false);
        this._dlgSpeaker.setText('');
        this._dlgText.setText('');
        this._dlgHint.setVisible(false);
        this._dialogOpen = false;
    }

    // ── ANIMASI BERJALAN & TIDUR ──────────────────────────────────────────────

    _startWalkToBed() {
        this._walkStarted = true;

        const mapScale = this._mapScale;
        const offsetX = this._offsetX;
        const offsetY = this._offsetY;
        const tileSize = 16 * mapScale;

        // Ahmad mulai di tile (12, 13). Dua kasur ada di kolom 6-9, baris 5-10.
        // Rute: NAIK dulu (ke baris 9) → KIRI (ke kolom 11 = kanan kasur)
        //       → SNAP ke pusat kasur kanan → TIDUR
        const walkToY = offsetY + (9 + 0.5) * tileSize;   // baris 9, sejajar kasur
        const walkToX = offsetX + (11 + 0.5) * tileSize;  // kolom 11, di kanan kasur
        const snapX = offsetX + 9 * tileSize;    // pusat kasur kanan (kolom 8-9)
        const snapY = offsetY + 8.0 * tileSize;  // tengah kasur secara vertikal

        const SPEED = 55 * mapScale;  // piksel/detik

        // Langkah 1 — jalan ke ATAS
        const durUp = (Math.abs(this._ahmad.y - walkToY) / SPEED) * 1000;
        this._ahmad.play('walk_up');

        this.tweens.add({
            targets: this._ahmad,
            y: walkToY,
            duration: Math.max(durUp, 400),
            ease: 'Linear',
            onComplete: () => {

                // Langkah 2 — jalan ke KIRI
                const durLeft = (Math.abs(this._ahmad.x - walkToX) / SPEED) * 1000;
                this._ahmad.play('walk_left');

                this.tweens.add({
                    targets: this._ahmad,
                    x: walkToX,
                    duration: Math.max(durLeft, 300),
                    ease: 'Linear',
                    onComplete: () => {
                        // Tiba di tepi kasur → SNAP langsung ke tengah kasur
                        this._ahmad.setPosition(snapX, snapY);
                        this._arriveAtBed();
                    }
                });
            }
        });
    }

    _arriveAtBed() {
        // Ganti ke sprite tidur — baris 0 = menghadap ke pemain (frame 0-3)
        this._ahmad.stop();
        this._ahmad.setTexture('tidur', 0);
        this._ahmad.play('sleep_front');

        // Efek ZZZ
        this._startZzzEffect();

        // Fade out setelah 3.5 detik
        this.time.delayedCall(3500, () => {
            this.cameras.main.fadeOut(1200, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DuniaGelap');
            });
        });
    }

    _startZzzEffect() {
        const sizes = ['z', 'Z', 'Z Z', 'z z Z'];
        let idx = 0;

        this.time.addEvent({
            delay: 900,
            callback: () => {
                const zzz = this.add.text(
                    this._ahmad.x + Phaser.Math.Between(5, 25),
                    this._ahmad.y - 20,
                    sizes[idx % sizes.length],
                    {
                        fontFamily: '"Courier New", Courier, monospace',
                        fontSize: '16px',
                        color: '#88CCFF',
                        stroke: '#000033',
                        strokeThickness: 3
                    }
                ).setOrigin(0.5);

                this.tweens.add({
                    targets: zzz,
                    y: zzz.y - 45,
                    alpha: 0,
                    scaleX: 1.4,
                    scaleY: 1.4,
                    duration: 1800,
                    ease: 'Cubic.Out',
                    onComplete: () => zzz.destroy()
                });

                idx++;
            },
            loop: true
        });
    }

    // ── ANIMASI ───────────────────────────────────────────────────────────────

    _createAnims() {
        // ── ahmad_walk (ahmad.png) ──
        // Baris 0 = jalan bawah (0-3), Baris 1 = jalan atas (4-7)
        // Baris 2 = jalan kiri (8-11), Baris 3 = jalan kanan (12-15)
        if (!this.anims.exists('walk_down')) {
            this.anims.create({ key: 'walk_down', frames: this.anims.generateFrameNumbers('ahmad_walk', { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'walk_up', frames: this.anims.generateFrameNumbers('ahmad_walk', { start: 4, end: 7 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'walk_left', frames: this.anims.generateFrameNumbers('ahmad_walk', { start: 8, end: 11 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('ahmad_walk', { start: 12, end: 15 }), frameRate: 7, repeat: -1 });
        }

        // ── tidur.png ── mengantuk/tidur dari beberapa pose
        if (!this.anims.exists('tidur_idle_down')) {
            this.anims.create({ key: 'tidur_idle_down', frames: this.anims.generateFrameNumbers('tidur', { frames: [0, 3] }), frameRate: 3, repeat: -1 });
            this.anims.create({ key: 'sleep_front', frames: this.anims.generateFrameNumbers('tidur', { start: 0, end: 3 }), frameRate: 2, repeat: -1 });
            this.anims.create({ key: 'sleep_back', frames: this.anims.generateFrameNumbers('tidur', { start: 4, end: 7 }), frameRate: 2, repeat: -1 });
            this.anims.create({ key: 'sleep_left', frames: this.anims.generateFrameNumbers('tidur', { start: 8, end: 11 }), frameRate: 2, repeat: -1 });
            this.anims.create({ key: 'sleep_right', frames: this.anims.generateFrameNumbers('tidur', { start: 12, end: 15 }), frameRate: 2, repeat: -1 });
        }
    }

    _addVignette(W, H) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 0.55);
        gfx.fillRect(0, 0, 60, H);
        gfx.fillRect(W - 60, 0, 60, H);
        gfx.fillRect(0, 0, W, 45);
        gfx.fillRect(0, H - 45, W, 45);
    }
}
