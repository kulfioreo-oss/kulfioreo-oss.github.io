import { playSceneMusic } from '../audio/musicManager.js';

export class BangunAhmad extends Phaser.Scene {

    constructor() {
        super('BangunAhmad');

        this._dialogs = [
            {
                speaker: 'Ahmad',
                text: 'Itu hanya mimpi... tapi rasanya nyata.',
                portrait: { key: 'sprite', frame: 6 }
            },
            {
                speaker: 'Ahmad',
                text: 'Aku tidak mau menunda lagi.',
                portrait: { key: 'sprite', frame: 2 }
            },
            {
                speaker: 'Ahmad',
                text: 'Kalau hartaku sudah mencapai nisab dan haul, aku harus menunaikan zakat.',
                portrait: { key: 'sprite', frame: 14 }
            },
            {
                speaker: 'Ahmad',
                text: 'Aku akan bertanya kepada Ayah dan belajar menghitung zakat dengan benar.',
                portrait: { key: 'sprite', frame: 1 }
            },
            {
                speaker: 'Ahmad',
                text: 'Insya Allah, aku akan membayar zakat.',
                portrait: { key: 'sprite', frame: 14 },
                isLast: true
            }
        ];

        this._dialogIndex = 0;
        this._dialogOpen = false;
        this._endingScore = {};
    }

    init(data) {
        this._endingScore = data || {};
    }

    preload() {
        this.load.tilemapTiledJSON('kamar', 'assets/map/kamar.json');
        this.load.image('interior', 'assets/map/interior.png');
        this.load.spritesheet('tidur', 'assets/char/tidur.png', {
            frameWidth: 421,
            frameHeight: 632
        });
        this.load.spritesheet('sprite', 'assets/char/sprite.png', {
            frameWidth: 421,
            frameHeight: 632
        });
        this.load.audio('contemplation', 'assets/audio/contemplation.mp3');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        playSceneMusic(this, 'contemplation');

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

        [this._layerGround, this._layerSolid, this._layerObject].forEach((layer) => {
            if (layer) {
                layer.setScale(mapScale);
                layer.setPosition(offsetX, offsetY);
            }
        });

        const bedX = offsetX + 9 * 16 * mapScale;
        const bedY = offsetY + 8 * 16 * mapScale;
        const charScale = (16 * mapScale * 1.8) / 632;

        this._ahmad = this.add.sprite(bedX, bedY, 'tidur', 3);
        this._ahmad.setOrigin(0.5, 0.82);
        this._ahmad.setScale(charScale);

        this._addMorningOverlay(W, H);
        this._buildDialogUI(W, H);

        this.cameras.main.fadeIn(900, 0, 0, 0);
        this.cameras.main.once('camerafadeincomplete', () => {
            this.time.delayedCall(500, () => this._showDialog(0));
        });

        this.input.keyboard.on('keydown-ENTER', () => this._nextDialog());
        this.input.keyboard.on('keydown-SPACE', () => this._nextDialog());
        this.input.on('pointerdown', () => this._nextDialog());
    }

    _addMorningOverlay(W, H) {
        const light = this.add.graphics();
        light.fillStyle(0xFFE7A5, 0.12);
        light.fillRect(0, 0, W, H);

        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.32);
        vignette.fillRect(0, 0, 45, H);
        vignette.fillRect(W - 45, 0, 45, H);
        vignette.fillRect(0, 0, W, 35);
        vignette.fillRect(0, H - 35, W, 35);
    }

    _buildDialogUI(W, H) {
        const panelH = 150;
        const panelY = H - panelH - 10;
        const pad = 14;

        this._dlgBg = this.add.graphics();
        this._dlgBg.setVisible(false);

        this._dlgPortrait = this.add.sprite(68, panelY + panelH / 2, 'sprite', 0);
        this._dlgPortrait.setScale(110 / 632);
        this._dlgPortrait.setVisible(false);

        this._dlgSpeaker = this.add.text(120, panelY + pad, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '17px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        });

        this._dlgText = this.add.text(120, panelY + pad + 26, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
            lineSpacing: 6,
            wordWrap: { width: W - 180 }
        });

        this._dlgHint = this.add.text(W - 60, H - 22, 'v lanjut', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5);
        this._dlgHint.setVisible(false);

        this.tweens.add({
            targets: this._dlgHint,
            alpha: 0.25,
            duration: 500,
            yoyo: true,
            loop: -1
        });
    }

    _showDialog(index) {
        if (index >= this._dialogs.length) {
            this._endScene();
            return;
        }

        this._dialogIndex = index;
        const dialog = this._dialogs[index];
        this._dialogOpen = true;

        const W = this.scale.width;
        const H = this.scale.height;
        const panelH = 150;
        const panelY = H - panelH - 10;

        this._dlgBg.clear();
        this._dlgBg.fillStyle(0x050510, 0.94);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, 0xFFD700, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.setVisible(true);
        this._dlgHint.setVisible(true);

        this._dlgPortrait.setTexture(dialog.portrait.key, dialog.portrait.frame);
        this._dlgPortrait.setVisible(true);
        this._dlgSpeaker.setText(dialog.speaker);
        this._dlgText.setText('');

        this._fullText = dialog.text;
        this._typewriterIndex = 0;
        this._isTyping = true;

        if (this._typewriterEvent) {
            this._typewriterEvent.remove();
        }

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
        if (!this._dialogOpen) {
            return;
        }

        if (this._isTyping) {
            if (this._typewriterEvent) {
                this._typewriterEvent.remove();
            }
            this._dlgText.setText(this._fullText);
            this._isTyping = false;
            return;
        }

        this._showDialog(this._dialogIndex + 1);
    }

    _endScene() {
        this._dlgBg.setVisible(false);
        this._dlgPortrait.setVisible(false);
        this._dlgSpeaker.setText('');
        this._dlgText.setText('');
        this._dlgHint.setVisible(false);
        this._dialogOpen = false;

        const W = this.scale.width;
        const H = this.scale.height;

        this.add.text(W / 2, H / 2 + 120, 'Ahmad bertekad menunaikan zakat.', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        this.time.delayedCall(1800, () => {
            this.cameras.main.fadeOut(700, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('EndingScreen', this._endingScore);
            });
        });
    }
}
