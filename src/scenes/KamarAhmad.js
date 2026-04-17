import { playSceneMusic } from '../audio/musicManager.js';

export class KamarAhmad extends Phaser.Scene {

    constructor() {
        super('KamarAhmad');

        // Dialog cutscene Ahmad — portrait = { key, frame } dari sprite.png
        // Frame mapping (4x4 grid, baris kiri-ke-kanan):
        //  0=netral  1=senang   2=sedih    3=khawatir
        //  4=marah   5=kaget    6=bingung  7=lelah
        //  8=panik   9=nangis  10=malu    11=girang
        // 12=pusing 13=ngantuk 14=senyum  15=nakal
        this._dialogs = [
            {
                speaker: 'Narasi',
                text: 'Malam itu, Ahmad duduk sendiri di kamarnya...\nIa menghitung uang hasil jerih payahnya dengan teliti.',
                portrait: null
            },
            {
                speaker: 'Narasi',
                text: 'Di usianya yang baru 14 tahun, ia sudah bisa\nmengumpulkan uang dari membantu ayah berjualan.',
                portrait: null
            },
            {
                speaker: 'Ahmad',
                text: '"Sepuluh... dua puluh... seratus ribu...\nDua ratus lima puluh ribu! Alhamdulillah..."',
                portrait: { key: 'sprite', frame: 1 }   // senang
            },
            {
                speaker: 'Narasi',
                text: 'Namun, bersama rasa senang itu,\nmuncul sesuatu yang berbeda dalam dirinya.',
                portrait: null
            },
            {
                speaker: 'Ahmad',
                text: '"Hmm... aku sudah baligh...\nBerarti aku sudah dewasa dalam agama."',
                portrait: { key: 'sprite', frame: 6 }   // bingung
            },
            {
                speaker: 'Ahmad',
                text: '"Tapi... aku masih kecil...\nBelum wajib zakat, kan?"',
                portrait: { key: 'sprite', frame: 3 }   // khawatir
            },
            {
                speaker: 'Suara Hati',
                text: '💭 "Aku masih kecil… belum wajib, kan?"',
                portrait: { key: 'sprite', frame: 7 },  // lelah/termenung
                isThought: true
            },
            {
                speaker: 'Narasi',
                text: 'Suara kecil itu terus bergema di dalam hatinya...\nAhmad termenung memandangi uang di tangannya.',
                portrait: null
            }
        ];

        this._dialogIndex = 0;
        this._dialogOpen = false;
    }

    preload() {
        // Tilemap & tileset
        this.load.tilemapTiledJSON('kamar', 'assets/map/kamar.json');
        this.load.image('interior', 'assets/map/interior.png');

        // Spritesheet ekspresi wajah Ahmad: 4 cols x 4 rows, gunakan 421x632 agar terbaca 4 kolom
        this.load.spritesheet('sprite', 'assets/char/sprite.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        // Spritesheet badan Ahmad (tidak dipakai portrait, boleh dipakai tujuan lain)
        this.load.spritesheet('ahmad', 'assets/char/ahmad.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        // Animasi menghitung uang (menghadap pemain): 1684x2528px -> 421x632 per frame
        this.load.spritesheet('menghitung', 'assets/char/menghitunguang.png', {
            frameWidth: 421,
            frameHeight: 632
        });
        this.load.audio('contemplation', 'assets/audio/contemplation.mp3');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        playSceneMusic(this, 'contemplation');

        // ── TILEMAP ────────────────────────────────────────────────────────────
        const map = this.make.tilemap({ key: 'kamar' });
        const tiles = map.addTilesetImage('interior', 'interior');

        // Layer render (3 layer: ground, solid, object)
        this._layerGround = map.createLayer('ground', tiles, 0, 0);
        this._layerSolid = map.createLayer('solid', tiles, 0, 0);
        this._layerObject = map.createLayer('object', tiles, 0, 0);

        // Skala semua layer
        const mapW = map.widthInPixels;
        const mapH = map.heightInPixels;
        const scaleX = W / mapW;
        const scaleY = H / mapH;
        const mapScale = Math.min(scaleX, scaleY) * 0.88;

        const offsetX = (W - mapW * mapScale) / 2;
        const offsetY = (H - mapH * mapScale) / 2 - 30;

        [this._layerGround, this._layerSolid, this._layerObject].forEach(l => {
            if (l) { l.setScale(mapScale); l.setPosition(offsetX, offsetY); }
        });

        // ── AHMAD SPRITE ──────────────────────────────────────────────────────
        // Posisi Ahmad: tengah-bawah peta (di dalam kamar, dekat meja)
        // Tile 13,13 kira-kira di tengah kamar
        const ahmadTileX = 12;
        const ahmadTileY = 13;
        const ahmadX = offsetX + (ahmadTileX + 0.5) * 16 * mapScale;
        const ahmadY = offsetY + (ahmadTileY + 0.5) * 16 * mapScale;

        // Gunakan sprite menghitung uang (menghadap pemain, frame 0-3)
        this._ahmad = this.add.sprite(ahmadX, ahmadY, 'menghitung', 0);
        // Scale: frame asli 421x632px, target ~1.8 tile tinggi di layar
        const targetCharH = 16 * mapScale * 1.8;
        const charScale = targetCharH / 632;
        this._ahmad.setScale(charScale);
        this._ahmad.setOrigin(0.5, 0.8);

        // ── ANIMASI ─────────────────────────────────────────────────────────
        this._createAhmadAnims();

        // Play animasi menghitung uang menghadap pemain (baris 0: frame 0-3)
        this._ahmad.play('count_front');

        // ── OVERLAY GELAP di pinggir (vignette) ───────────────────────────────
        this._addVignette(W, H);

        // ── LIGHTING: lampu kamar warm overlay ───────────────────────────────
        const light = this.add.graphics();
        light.fillStyle(0xFFEEAA, 0.06);
        light.fillRect(0, 0, W, H);

        // ── UI PANEL DIALOG ───────────────────────────────────────────────────
        this._buildDialogUI(W, H);

        // ── EFEK COUNTING COINS (animasi tangan + koin) ─────────────────────
        this._startCountingEffect(ahmadX, ahmadY, mapScale);

        // ── MULAI CUTSCENE setelah delay pendek ──────────────────────────────
        this.time.delayedCall(1200, () => {
            this._showDialog(0);
        });

        // Input: klik / spasi / enter untuk lanjut dialog
        this.input.keyboard.on('keydown-ENTER', () => this._nextDialog());
        this.input.keyboard.on('keydown-SPACE', () => this._nextDialog());
        this.input.on('pointerdown', () => this._nextDialog());

        // ── FADE IN ────────────────────────────────────────────────────────────
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    // ── DIALOG SYSTEM ─────────────────────────────────────────────────────────

    _buildDialogUI(W, H) {
        const panelH = 165;
        const panelY = H - panelH - 10;
        const pad = 16;

        // Panel background
        this._dlgBg = this.add.graphics();
        this._dlgBg.fillStyle(0x0a0a1a, 0.88);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, 0xFFD700, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.setVisible(false);

        // Portrait ekspresi wajah Ahmad dari sprite.png (421x632px per frame, scale ke ~110px tinggi)
        this._dlgPortrait = this.add.sprite(72, panelY + panelH / 2, 'sprite', 0);
        this._dlgPortrait.setScale(110 / 632);
        this._dlgPortrait.setVisible(false);

        // Speaker name
        this._dlgSpeaker = this.add.text(130, panelY + pad, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '17px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 3
        });

        // Dialog text
        this._dlgText = this.add.text(130, panelY + pad + 28, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3,
            lineSpacing: 6,
            wordWrap: { width: W - 200 }
        });

        // Hint "lanjut"
        this._dlgHint = this.add.text(W - 60, H - 24, '▼ lanjut', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        this._dlgHint.setVisible(false);

        this.tweens.add({
            targets: this._dlgHint,
            alpha: 0.2,
            duration: 500,
            yoyo: true,
            loop: -1
        });

        // Thought bubble style (overrides saat isThought)
        this._isThought = false;
    }

    _showDialog(index) {
        if (index >= this._dialogs.length) {
            this._endCutscene();
            return;
        }

        this._dialogIndex = index;
        const d = this._dialogs[index];
        this._dialogOpen = true;

        // Update panel style tergantung tipe
        this._dlgBg.setVisible(true);
        this._dlgHint.setVisible(true);

        // Thought bubble: biru gelap
        this._dlgBg.clear();
        const W = this.scale.width;
        const H = this.scale.height;
        const panelH = 165;
        const panelY = H - panelH - 10;

        const bgColor = d.isThought ? 0x0a1a2e : 0x0a0a1a;
        const borderColor = d.isThought ? 0x6699FF : 0xFFD700;

        this._dlgBg.fillStyle(bgColor, 0.92);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, borderColor, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);

        // Portrait: d.portrait bisa null atau {key, frame}
        if (d.portrait && typeof d.portrait === 'object') {
            this._dlgPortrait.setTexture(d.portrait.key, d.portrait.frame);
            this._dlgPortrait.setVisible(true);
        } else {
            this._dlgPortrait.setVisible(false);
        }

        // Speaker
        const speakerColor = d.isThought ? '#99BBFF' : (d.speaker === 'Ahmad' ? '#FFD700' : (d.speaker === 'Suara Hati' ? '#AADDFF' : '#CCCCCC'));
        this._dlgSpeaker.setColor(speakerColor);
        this._dlgSpeaker.setText(d.speaker);

        // Typewriter effect untuk text
        this._dlgText.setText('');
        this._typewriterIndex = 0;
        this._fullText = d.text;
        this._isTyping = true;

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

        // Tetap putar animasi menghitung uang selama cutscene
        if (this._ahmad.anims.currentAnim?.key !== 'count_front') {
            this._ahmad.play('count_front');
        }
    }

    _nextDialog() {
        if (!this._dialogOpen) return;

        // Jika masih mengetik, tampilkan teks penuh dulu
        if (this._isTyping) {
            if (this._typewriterEvent) this._typewriterEvent.remove();
            this._dlgText.setText(this._fullText);
            this._isTyping = false;
            return;
        }

        // Lanjut ke dialog berikutnya
        this._showDialog(this._dialogIndex + 1);
    }

    _endCutscene() {
        // Sembunyikan dialog
        this._dlgBg.setVisible(false);
        this._dlgPortrait.setVisible(false);
        this._dlgSpeaker.setText('');
        this._dlgText.setText('');
        this._dlgHint.setVisible(false);
        this._dialogOpen = false;

        // Tampilkan pilihan / lanjut ke scene berikutnya
        this.time.delayedCall(800, () => {
            this._showEndChoice();
        });
    }

    _showEndChoice() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Pertanyaan refleksi
        const refleksiPanel = this.add.graphics();
        refleksiPanel.fillStyle(0x0a0a1a, 0.93);
        refleksiPanel.fillRoundedRect(W / 2 - 380, H / 2 - 100, 760, 200, 12);
        refleksiPanel.lineStyle(2, 0xFFD700, 1);
        refleksiPanel.strokeRoundedRect(W / 2 - 380, H / 2 - 100, 760, 200, 12);

        this.add.text(W / 2, H / 2 - 65, '🤔 Menurut kamu, apakah Ahmad sudah wajib zakat?', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);

        // Tombol Ya
        const btnYa = this.add.text(W / 2 - 140, H / 2, '  ✅  SUDAH WAJIB  ', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '16px',
            color: '#000000',
            backgroundColor: '#55DD55',
            padding: { x: 16, y: 10 },
            stroke: '#000',
            strokeThickness: 1
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Tombol Belum
        const btnBelum = this.add.text(W / 2 + 140, H / 2, '  ❌  BELUM WAJIB  ', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '16px',
            color: '#000000',
            backgroundColor: '#DD5555',
            padding: { x: 16, y: 10 },
            stroke: '#000',
            strokeThickness: 1
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnYa.on('pointerover', () => btnYa.setStyle({ color: '#ffffff' }));
        btnYa.on('pointerout', () => btnYa.setStyle({ color: '#000000' }));
        btnBelum.on('pointerover', () => btnBelum.setStyle({ color: '#ffffff' }));
        btnBelum.on('pointerout', () => btnBelum.setStyle({ color: '#000000' }));

        btnYa.on('pointerdown', () => this._answerChoice(true, refleksiPanel, btnYa, btnBelum));
        btnBelum.on('pointerdown', () => this._answerChoice(false, refleksiPanel, btnYa, btnBelum));
    }

    _answerChoice(isCorrect, panel, btnYa, btnBelum) {
        panel.destroy();
        btnYa.destroy();
        btnBelum.destroy();

        const W = this.scale.width;
        const H = this.scale.height;

        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(0x0a0a1a, 0.95);
        feedbackBg.fillRoundedRect(W / 2 - 400, H / 2 - 120, 800, 240, 12);
        feedbackBg.lineStyle(2, isCorrect ? 0x55FF55 : 0xFF5555, 1);
        feedbackBg.strokeRoundedRect(W / 2 - 400, H / 2 - 120, 800, 240, 12);

        const icon = isCorrect ? '✅' : '❌';
        const title = isCorrect ? 'Tepat sekali!' : 'Belum tepat...';
        const explanation = isCorrect
            ? 'Ahmad sudah BALIGH dan sudah memiliki harta.\nJika hartanya mencapai nisab dan haul,\nmaka ia WAJIB mengeluarkan zakat!\n\n"Setiap Muslim yang memiliki harta senilai nisab\ndan telah berlalu satu tahun, wajib berzakat."'
            : 'Ternyata, karena Ahmad sudah BALIGH\ndan memiliki harta sendiri yang mencukupi nisab,\nAhmad SUDAH WAJIB mengeluarkan zakat!\n\nBaligh = dewasa secara agama = mulai terkena kewajiban syariat.';

        this.add.text(W / 2, H / 2 - 85, `${icon}  ${title}`, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            color: isCorrect ? '#55FF55' : '#FF7777',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(W / 2, H / 2 - 18, explanation, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            align: 'center',
            lineSpacing: 5
        }).setOrigin(0.5);

        const continueBtn = this.add.text(W / 2, H / 2 + 90, '► Lanjutkan petualangan', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '16px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 3,
            backgroundColor: '#222244',
            padding: { x: 18, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        continueBtn.on('pointerover', () => continueBtn.setAlpha(0.7));
        continueBtn.on('pointerout', () => continueBtn.setAlpha(1));
        continueBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(700, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Lanjut ke scene Ahmad pergi tidur
                this.scene.start('TidurAhmad');
            });
        });
    }

    // ── ANIMASI ───────────────────────────────────────────────────────────────

    _createAhmadAnims() {
        // ── Animasi menghitung uang (menghitunguang.png, 4 cols x 4 rows) ──
        // Baris 0 (frame 0-3)  : menghadap ke pemain/depan  ← DIPAKAI
        // Baris 1 (frame 4-7)  : membelakangi pemain
        // Baris 2 (frame 8-11) : menghadap kiri
        // Baris 3 (frame 12-15): menghadap kanan
        if (!this.anims.exists('count_front')) {
            this.anims.create({
                key: 'count_front',
                frames: this.anims.generateFrameNumbers('menghitung', { start: 0, end: 3 }),
                frameRate: 5,
                repeat: -1
            });
            this.anims.create({
                key: 'count_back',
                frames: this.anims.generateFrameNumbers('menghitung', { start: 4, end: 7 }),
                frameRate: 5,
                repeat: -1
            });
        }

        // ── Animasi ahmad.png (untuk portrait dialog saja) ──
        if (!this.anims.exists('ahmad_idle_down')) {
            this.anims.create({ key: 'ahmad_idle_down', frames: [{ key: 'ahmad', frame: 0 }], frameRate: 1, repeat: -1 });
            this.anims.create({ key: 'ahmad_idle_up', frames: [{ key: 'ahmad', frame: 4 }], frameRate: 1, repeat: -1 });
            this.anims.create({ key: 'ahmad_idle_left', frames: [{ key: 'ahmad', frame: 8 }], frameRate: 1, repeat: -1 });
            this.anims.create({ key: 'ahmad_idle_right', frames: [{ key: 'ahmad', frame: 12 }], frameRate: 1, repeat: -1 });
        }
    }

    // ── EFEK KOIN MENGHITUNG ───────────────────────────────────────────────────
    _startCountingEffect(ahmadX, ahmadY, mapScale) {
        // floating number "+Rp" sesekali (kotak warna dihapus)
        this.time.addEvent({
            delay: 1800,
            callback: () => {
                const floatNum = this.add.text(
                    ahmadX + Phaser.Math.Between(-20, 20),
                    ahmadY - 50,
                    '+Rp10.000',
                    {
                        fontFamily: '"Courier New", Courier, monospace',
                        fontSize: '12px',
                        color: '#FFD700',
                        stroke: '#000',
                        strokeThickness: 3
                    }
                ).setOrigin(0.5);

                this.tweens.add({
                    targets: floatNum,
                    y: ahmadY - 90,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Cubic.Out',
                    onComplete: () => floatNum.destroy()
                });
            },
            loop: true
        });
    }

    _addVignette(W, H) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 0.5);
        gfx.fillRect(0, 0, 55, H);
        gfx.fillRect(W - 55, 0, 55, H);
        gfx.fillRect(0, 0, W, 40);
        gfx.fillRect(0, H - 40, W, 40);
    }
}
