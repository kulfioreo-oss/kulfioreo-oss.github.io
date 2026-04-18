import { playSceneMusic } from '../audio/musicManager.js';

export class DuniaGelap extends Phaser.Scene {

    constructor() {
        super('DuniaGelap');

        this._dialogs = [
            {
                speaker: 'Ahmad',
                text: 'Di mana aku...?',
                portrait: { key: 'spriteout', frame: 4 }
            },
            {
                speaker: 'Ahmad',
                text: 'Siapa kamu?',
                portrait: { key: 'spriteout', frame: 5 }
            },
            {
                speaker: 'Bayangan',
                text: 'Aku adalah bayangan dari keraguanmu.',
                portrait: { key: 'spritebayangan', frame: 0 },
                isShadow: true
            },
            {
                speaker: 'Ahmad',
                text: 'Keraguanku?',
                portrait: { key: 'spriteout', frame: 2 }
            },
            {
                speaker: 'Bayangan',
                text: 'Kamu tahu yang benar, tapi kamu masih ingin menundanya.',
                portrait: { key: 'spritebayangan', frame: 6 },
                isShadow: true
            },
            {
                speaker: 'Ahmad',
                text: 'Aku hanya... belum yakin.',
                portrait: { key: 'spriteout', frame: 13 }
            },
            {
                speaker: 'Bayangan',
                text: 'Kalau begitu, kejarlah aku. Kita lihat apakah keyakinanmu cukup kuat.',
                portrait: { key: 'spritebayangan', frame: 10 },
                isShadow: true,
                isLast: true
            }
        ];

        this._dialogIndex = 0;
        this._dialogOpen = false;
        this._shadowEscaping = false;
        this._playerControlEnabled = false;
        this._holeActive = false;
        this._transitioningToBoss = false;
        this._lastDirection = 'up';
    }

    preload() {
        this.load.tilemapTiledJSON('cave', 'assets/map/cave.json');
        this.load.image('caveTiles', 'assets/map/cave.png');

        this.load.spritesheet('ahmadout', 'assets/char/ahmadout.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        this.load.spritesheet('bayangan', 'assets/char/bayangan.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        this.load.spritesheet('spritebayangan', 'assets/char/spritebayangan.png', {
            frameWidth: 421,
            frameHeight: 632
        });

        this.load.spritesheet('spriteout', 'assets/char/spriteout.png', {
            frameWidth: 421,
            frameHeight: 632
        });
        this.load.audio('into-the-caves', 'assets/audio/into-the-caves.mp3');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        playSceneMusic(this, 'into-the-caves');

        this.cameras.main.setBackgroundColor('#020205');

        const map = this.make.tilemap({ key: 'cave' });
        const tiles = map.addTilesetImage('cave', 'caveTiles');

        this._layerGround = map.createLayer('ground', tiles, 0, 0);
        this._layerCollision = map.createLayer('solid', tiles, 0, 0);
        this._layerObject = map.createLayer('object', tiles, 0, 0);

        const mapW = map.widthInPixels;
        const mapH = map.heightInPixels;
        const mapScale = Math.min(W / mapW, H / mapH) * 0.9;
        const offsetX = (W - mapW * mapScale) / 2;
        const offsetY = (H - mapH * mapScale) / 2 - 10;

        [this._layerGround, this._layerCollision, this._layerObject].forEach((layer) => {
            if (layer) {
                layer.setScale(mapScale);
                layer.setPosition(offsetX, offsetY);
            }
        });

        this._mapScale = mapScale;
        this._offsetX = offsetX;
        this._offsetY = offsetY;
        this._tileSize = 16 * mapScale;

        this._addDarkWorldEffects(W, H);
        this._createCharacterAnims();
        this._placeCharacters();
        this._buildDialogUI(W, H);

        this._cursors = this.input.keyboard.createCursorKeys();
        this._wasd = this.input.keyboard.addKeys('W,A,S,D');

        this.cameras.main.fadeIn(900, 0, 0, 0);
        this.cameras.main.once('camerafadeincomplete', () => {
            this.time.delayedCall(450, () => this._showDialog(0));
        });

        this.input.keyboard.on('keydown-ENTER', () => this._nextDialog());
        this.input.keyboard.on('keydown-SPACE', () => this._nextDialog());
        this.input.on('pointerdown', () => this._nextDialog());
    }

    update(time, delta) {
        if (this._shadow && !this._shadowEscaping) {
            this._shadow.setAlpha(0.82 + Math.sin(this.time.now / 240) * 0.12);
        }

        if (this._playerControlEnabled) {
            this._updatePlayerMovement(delta);
        }
    }

    _tileToWorld(tileX, tileY) {
        return {
            x: this._offsetX + tileX * this._tileSize,
            y: this._offsetY + tileY * this._tileSize
        };
    }

    _placeCharacters() {
        const ahmadPos = this._tileToWorld(12.5, 16);
        const shadowPos = this._tileToWorld(12.5, 10);
        const charScale = (16 * this._mapScale * 1.9) / 632;

        this._ahmad = this.add.sprite(ahmadPos.x, ahmadPos.y, 'ahmadout', 4);
        this._ahmad.setScale(charScale);
        this._ahmad.setOrigin(0.5, 0.82);
        this._ahmad.play('dunia_ahmad_idle_up');

        this._shadow = this.add.sprite(shadowPos.x, shadowPos.y, 'bayangan', 0);
        this._shadow.setScale(charScale * 1.12);
        this._shadow.setOrigin(0.5, 0.82);
        this._shadow.setTint(0x4a254f);
        this._shadow.play('dunia_shadow_idle_down');

        this.tweens.add({
            targets: this._shadow,
            scaleX: this._shadow.scaleX * 1.06,
            scaleY: this._shadow.scaleY * 1.06,
            duration: 900,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });
    }

    _createCharacterAnims() {
        if (!this.anims.exists('dunia_ahmad_idle_up')) {
            this.anims.create({
                key: 'dunia_ahmad_idle_up',
                frames: this.anims.generateFrameNumbers('ahmadout', { frames: [4, 5, 6, 7] }),
                frameRate: 4,
                repeat: -1
            });
        }

        if (!this.anims.exists('dunia_ahmad_walk_down')) {
            this.anims.create({ key: 'dunia_ahmad_walk_down', frames: this.anims.generateFrameNumbers('ahmadout', { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'dunia_ahmad_walk_up', frames: this.anims.generateFrameNumbers('ahmadout', { start: 4, end: 7 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'dunia_ahmad_walk_left', frames: this.anims.generateFrameNumbers('ahmadout', { start: 8, end: 11 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'dunia_ahmad_walk_right', frames: this.anims.generateFrameNumbers('ahmadout', { start: 12, end: 15 }), frameRate: 7, repeat: -1 });
        }

        if (!this.anims.exists('dunia_shadow_idle_down')) {
            this.anims.create({
                key: 'dunia_shadow_idle_down',
                frames: this.anims.generateFrameNumbers('bayangan', { frames: [0, 1, 2, 3] }),
                frameRate: 4,
                repeat: -1
            });
        }
    }

    _addDarkWorldEffects(W, H) {
        const darkness = this.add.graphics();
        darkness.fillStyle(0x000000, 0.34);
        darkness.fillRect(0, 0, W, H);
        darkness.setDepth(10);

        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.72);
        vignette.fillRect(0, 0, 90, H);
        vignette.fillRect(W - 90, 0, 90, H);
        vignette.fillRect(0, 0, W, 65);
        vignette.fillRect(0, H - 65, W, 65);
        vignette.setDepth(11);

        const particles = this.add.graphics();
        particles.setDepth(12);
        for (let i = 0; i < 46; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H);
            const size = Phaser.Math.Between(1, 3);
            particles.fillStyle(0x3b2345, Phaser.Math.FloatBetween(0.25, 0.65));
            particles.fillRect(x, y, size, size);
        }
    }

    _buildDialogUI(W, H) {
        const panelH = 150;
        const panelY = H - panelH - 10;
        const pad = 14;

        this._dlgBg = this.add.graphics();
        this._dlgBg.setDepth(50);
        this._dlgBg.setVisible(false);

        this._dlgPortrait = this.add.sprite(68, panelY + panelH / 2, 'spriteout', 0);
        this._dlgPortrait.setScale(110 / 632);
        this._dlgPortrait.setDepth(51);
        this._dlgPortrait.setVisible(false);

        this._dlgSpeaker = this.add.text(120, panelY + pad, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '17px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 3
        });
        this._dlgSpeaker.setDepth(52);

        this._dlgText = this.add.text(120, panelY + pad + 26, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2,
            lineSpacing: 6,
            wordWrap: { width: W - 180 }
        });
        this._dlgText.setDepth(52);

        this._dlgHint = this.add.text(W - 60, H - 22, 'v lanjut', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5);
        this._dlgHint.setDepth(52);
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
            this._closeDialog();
            this._startShadowEscape();
            return;
        }

        this._dialogIndex = index;
        const dialog = this._dialogs[index];
        this._dialogOpen = true;
        this._isLastDialog = !!dialog.isLast;

        const W = this.scale.width;
        const H = this.scale.height;
        const panelH = 150;
        const panelY = H - panelH - 10;

        this._dlgBg.clear();
        this._dlgBg.fillStyle(dialog.isShadow ? 0x120816 : 0x050510, 0.94);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, dialog.isShadow ? 0x7b3c8c : 0xAAAAAA, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.setVisible(true);

        if (dialog.portrait) {
            this._dlgPortrait.setTexture(dialog.portrait.key, dialog.portrait.frame);
            this._dlgPortrait.setTint(dialog.isShadow ? 0x6d4075 : 0xffffff);
            this._dlgPortrait.setVisible(true);
        } else {
            this._dlgPortrait.setVisible(false);
        }

        this._dlgHint.setVisible(true);
        this._dlgSpeaker.setColor(dialog.isShadow ? '#B46AD4' : '#FFD700');
        this._dlgSpeaker.setText(dialog.speaker);
        this._dlgText.setText('');

        this._typewriterIndex = 0;
        this._fullText = dialog.text;
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
        if (!this._dialogOpen || this._shadowEscaping) {
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

    _closeDialog() {
        this._dlgBg.setVisible(false);
        this._dlgPortrait.setVisible(false);
        this._dlgSpeaker.setText('');
        this._dlgText.setText('');
        this._dlgHint.setVisible(false);
        this._dialogOpen = false;
    }

    _startShadowEscape() {
        this._shadowEscaping = true;
        const holeTileX = 12.5;
        const holeTileY = 1.5;
        const holePos = this._tileToWorld(holeTileX, holeTileY);

        if (this._shadow) {
            this._shadow.play('dunia_shadow_idle_down');
        }

        this.tweens.add({
            targets: this._shadow,
            x: holePos.x,
            y: holePos.y,
            alpha: 0.45,
            duration: 1700,
            ease: 'Sine.inOut',
            onComplete: () => this._shadowEnterHole()
        });
    }

    _shadowEnterHole() {
        this.tweens.add({
            targets: this._shadow,
            scaleX: 0.02,
            scaleY: 0.02,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.in',
            onComplete: () => {
                this._shadow.setVisible(false);
                this._showEndingText();
            }
        });
    }

    _showEndingText() {
        const W = this.scale.width;
        const H = this.scale.height;
        this._playerControlEnabled = true;
        this._holeActive = true;

        const message = this.add.text(W / 2, H - 125, 'Bayangan menghilang ke dalam lubang gelap...', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#D8C7FF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        message.setDepth(60);

        const next = this.add.text(W / 2, H - 82, 'Ikuti bayangan ke lubang gelap.', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        next.setDepth(60);

        this.tweens.add({
            targets: next,
            alpha: 0.25,
            duration: 700,
            yoyo: true,
            loop: -1
        });
    }

    _updatePlayerMovement(delta) {
        if (!this._ahmad || this._transitioningToBoss) {
            return;
        }

        let moveX = 0;
        let moveY = 0;

        if (this._cursors.left.isDown || this._wasd.A.isDown) moveX -= 1;
        if (this._cursors.right.isDown || this._wasd.D.isDown) moveX += 1;
        if (this._cursors.up.isDown || this._wasd.W.isDown) moveY -= 1;
        if (this._cursors.down.isDown || this._wasd.S.isDown) moveY += 1;

        if (moveX === 0 && moveY === 0) {
            this._setAhmadIdleFrame();
            this._checkHoleEntry();
            return;
        }

        const length = Math.hypot(moveX, moveY);
        moveX /= length;
        moveY /= length;

        const speed = 70 * this._mapScale;
        const distance = speed * (delta / 1000);
        const nextX = this._ahmad.x + moveX * distance;
        const nextY = this._ahmad.y + moveY * distance;

        if (this._canMoveTo(nextX, this._ahmad.y)) {
            this._ahmad.x = nextX;
        }

        if (this._canMoveTo(this._ahmad.x, nextY)) {
            this._ahmad.y = nextY;
        }

        if (Math.abs(moveX) > Math.abs(moveY)) {
            this._lastDirection = moveX < 0 ? 'left' : 'right';
        } else {
            this._lastDirection = moveY < 0 ? 'up' : 'down';
        }

        this._ahmad.play(`dunia_ahmad_walk_${this._lastDirection}`, true);
        this._checkHoleEntry();
    }

    _canMoveTo(worldX, worldY) {
        const mapLeft = this._offsetX;
        const mapTop = this._offsetY;
        const mapRight = this._offsetX + 25 * this._tileSize;
        const mapBottom = this._offsetY + 20 * this._tileSize;

        if (worldX < mapLeft || worldX > mapRight || worldY < mapTop || worldY > mapBottom) {
            return false;
        }

        if (!this._layerCollision) {
            return true;
        }

        const tile = this._layerCollision.getTileAtWorldXY(worldX, worldY, false);
        return !tile;
    }

    _setAhmadIdleFrame() {
        if (!this._ahmad) return;

        const idleFrames = {
            down: 0,
            up: 4,
            left: 8,
            right: 12
        };

        this._ahmad.stop();
        this._ahmad.setFrame(idleFrames[this._lastDirection] ?? 4);
    }

    _checkHoleEntry() {
        if (!this._holeActive || this._transitioningToBoss) {
            return;
        }

        const holePos = this._tileToWorld(12.5, 1.5);
        const distance = Phaser.Math.Distance.Between(this._ahmad.x, this._ahmad.y, holePos.x, holePos.y);

        if (distance <= this._tileSize * 1.35) {
            this._transitionToBossCave();
        }
    }

    _transitionToBossCave() {
        this._transitioningToBoss = true;
        this._playerControlEnabled = false;
        this._ahmad.stop();

        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('BossCave');
        });
    }
}
