import { playSceneMusic } from '../audio/musicManager.js';

export class BossCave extends Phaser.Scene {

    constructor() {
        super('BossCave');

        this._dialogs = [
            {
                speaker: 'Bayangan',
                text: 'Untuk keluar dari sini, kamu harus bisa mengalahkanku...',
                portrait: { key: 'spritebayangan', frame: 0 },
                isShadow: true
            },
            {
                speaker: 'Ahmad',
                text: 'Mengalahkanmu?',
                portrait: { key: 'spriteout', frame: 5 }
            },
            {
                speaker: 'Bayangan',
                text: 'Keraguan tidak hilang hanya dengan berlari.',
                portrait: { key: 'spritebayangan', frame: 6 },
                isShadow: true
            },
            {
                speaker: 'Bayangan',
                text: 'Buktikan bahwa keyakinanmu lebih kuat dari rasa takutmu.',
                portrait: { key: 'spritebayangan', frame: 10 },
                isShadow: true
            },
            {
                speaker: 'Ahmad',
                text: 'Aku akan mencoba.',
                portrait: { key: 'spriteout', frame: 2 }
            },
            {
                speaker: 'Bayangan',
                text: 'Tiga menara akan menjadi ujianmu.',
                portrait: { key: 'spritebayangan', frame: 13 },
                isShadow: true
            }
        ];

        this._dialogIndex = 0;
        this._dialogOpen = false;
        this._maxHealth = 5;
        this._health = this._maxHealth;
        this._towerSolved = {
            leftTower: false,
            centerTower: false,
            rightTower: false
        };
        this._towerStageIndex = {
            leftTower: 0,
            centerTower: 0,
            rightTower: 0
        };
        this._activePuzzle = null;
        this._quizIndex = 0;
        this._quizTimeLimit = 30;
        this._quizTimeRemaining = 0;
        this._quizTimerEvent = null;
        this._quizTimerText = null;
        this._puzzlesEnabled = false;
        this._battleEnded = false;
        this._puzzlePanelObjects = [];
        this._puzzleData = this._buildPuzzleData();
        this._playerControlEnabled = false;
        this._lastDirection = 'up';
        this._nearestTowerId = null;
    }

    preload() {
        this.load.tilemapTiledJSON('bosscave', 'assets/map/bosscave.json');
        this.load.image('caveTiles', 'assets/map/cave.png');
        this.load.image('dungeonTiles', 'assets/map/tilesetdungeon.png');
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
        this.load.spritesheet('towerMachine', 'assets/tower/Untitled (460 x 96 px).png', {
            frameWidth: 92,
            frameHeight: 96
        });
        this.load.audio('determined-pursuit', 'assets/audio/determined-pursuit.wav');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        playSceneMusic(this, 'determined-pursuit');

        this.cameras.main.setBackgroundColor('#050007');

        const map = this.make.tilemap({ key: 'bosscave' });
        const caveTiles = map.addTilesetImage('cave', 'caveTiles');
        const dungeonTiles = map.addTilesetImage('tilesetdungeon', 'dungeonTiles');
        const tilesets = [caveTiles, dungeonTiles].filter(Boolean);

        const layers = [
            map.createLayer('lava', tilesets, 0, 0),
            map.createLayer('ground', tilesets, 0, 0),
            map.createLayer('solid', tilesets, 0, 0),
            map.createLayer('land', tilesets, 0, 0)
        ];

        const mapW = map.widthInPixels;
        const mapH = map.heightInPixels;
        const mapScale = Math.min(W / mapW, H / mapH) * 0.9;
        const offsetX = (W - mapW * mapScale) / 2;
        const offsetY = (H - mapH * mapScale) / 2 - 10;

        this._mapScale = mapScale;
        this._offsetX = offsetX;
        this._offsetY = offsetY;
        this._tileSize = 16 * mapScale;

        layers.forEach((layer) => {
            if (layer) {
                layer.setScale(mapScale);
                layer.setPosition(offsetX, offsetY);
            }
        });

        const entry = {
            x: offsetX + 12.5 * 16 * mapScale,
            y: offsetY + 17 * 16 * mapScale
        };

        this._createAhmadAnims();

        this._ahmad = this.add.sprite(entry.x, entry.y, 'ahmadout', 4);
        this._ahmad.setOrigin(0.5, 0.82);
        this._ahmad.setScale((16 * mapScale * 1.9) / 632);

        this._placeTowerSetup();
        this._placeShadow();

        this._addAtmosphere(W, H);
        this._buildHealthUI();
        this._buildInteractionPrompt(W, H);
        this._buildDialogUI(W, H);

        const label = this.add.text(W / 2, H - 70, 'Area bayangan...', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        label.setDepth(50);

        this.cameras.main.fadeIn(700, 0, 0, 0);
        this.cameras.main.once('camerafadeincomplete', () => {
            this.time.delayedCall(400, () => this._showDialog(0));
        });

        this._cursors = this.input.keyboard.createCursorKeys();
        this._wasd = this.input.keyboard.addKeys('W,A,S,D');
        this._interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.input.keyboard.on('keydown-ENTER', () => this._nextDialog());
        this.input.keyboard.on('keydown-SPACE', () => this._nextDialog());
        this.input.keyboard.on('keydown-E', () => this._interactWithNearestTower());
        this.input.keyboard.on('keydown-ENTER', () => this._interactWithNearestTower());
        this.input.keyboard.on('keydown-SPACE', () => this._interactWithNearestTower());
        this.input.on('pointerdown', () => this._nextDialog());
    }

    update(time, delta) {
        if (this._playerControlEnabled && !this._dialogOpen) {
            this._updatePlayerMovement(delta);
            this._updateTowerProximity();
        }
    }

    _tileToWorld(tileX, tileY) {
        return {
            x: this._offsetX + tileX * this._tileSize,
            y: this._offsetY + tileY * this._tileSize
        };
    }

    _placeTowerSetup() {
        const towerScale = this._tileSize * 4.8 / 96;
        const towers = [
            { id: 'leftTower', tileX: 5.6, tileY: 11.5, frame: 0 },
            { id: 'centerTower', tileX: 12.5, tileY: 9.2, frame: 1 },
            { id: 'rightTower', tileX: 19.4, tileY: 11.5, frame: 2 }
        ];

        this._towers = towers.map((tower) => {
            const towerPos = this._tileToWorld(tower.tileX, tower.tileY);
            const sprite = this.add.sprite(towerPos.x, towerPos.y, 'towerMachine', tower.frame);
            sprite.setName(tower.id);
            sprite.setOrigin(0.5, 1);
            sprite.setScale(towerScale);
            sprite.setDepth(18);
            sprite.towerId = tower.id;
            tower.activeFrame = tower.frame;
            sprite.activeFrame = tower.frame;
            return sprite;
        });
    }

    _createAhmadAnims() {
        if (!this.anims.exists('boss_ahmad_walk_down')) {
            this.anims.create({ key: 'boss_ahmad_walk_down', frames: this.anims.generateFrameNumbers('ahmadout', { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'boss_ahmad_walk_up', frames: this.anims.generateFrameNumbers('ahmadout', { start: 4, end: 7 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'boss_ahmad_walk_left', frames: this.anims.generateFrameNumbers('ahmadout', { start: 8, end: 11 }), frameRate: 7, repeat: -1 });
            this.anims.create({ key: 'boss_ahmad_walk_right', frames: this.anims.generateFrameNumbers('ahmadout', { start: 12, end: 15 }), frameRate: 7, repeat: -1 });
        }
    }

    _buildPuzzleData() {
        return {
            leftTower: {
                type: 'caseStudy',
                title: 'Menara Kiri: Studi Kasus Zakat Rupiah',
                stages: [
                    {
                        prompt: 'Nisab game ini adalah Rp85.000.000. Ahmad memiliki Rp40.000.000 selama 1 tahun. Apakah sudah wajib zakat maal?',
                        answer: 'Belum, karena belum mencapai nisab',
                        options: [
                            'Belum, karena belum mencapai nisab',
                            'Sudah, karena harta apa pun wajib dizakati',
                            'Sudah, karena sudah lewat 1 bulan',
                            'Tidak perlu menghitung nisab'
                        ]
                    },
                    {
                        prompt: 'Nisab game ini adalah Rp85.000.000. Ahmad memiliki Rp100.000.000 selama 1 tahun. Apakah sudah wajib zakat maal?',
                        answer: 'Sudah, karena melebihi nisab',
                        options: [
                            'Belum, karena belum satu bulan',
                            'Sudah, karena melebihi nisab',
                            'Tidak, karena zakat hanya untuk pedagang',
                            'Belum, karena harus Rp200.000.000'
                        ]
                    },
                    {
                        prompt: 'Jika harta Ahmad Rp100.000.000, berapa zakat maal 2,5% yang harus dibayar?',
                        answer: 'Rp2.500.000',
                        options: ['Rp250.000', 'Rp2.500.000', 'Rp5.000.000', 'Rp25.000.000']
                    },
                    {
                        prompt: 'Jika harta Ahmad Rp85.000.000 selama 1 tahun, apakah wajib zakat?',
                        answer: 'Ya, karena sudah mencapai nisab',
                        options: [
                            'Tidak, karena nisab harus lebih dari Rp85.000.000',
                            'Ya, karena sudah mencapai nisab',
                            'Tidak, karena zakat hanya untuk usaha',
                            'Tidak, karena harus menunggu 10 tahun'
                        ]
                    },
                    {
                        prompt: 'Jika harta Ahmad Rp120.000.000, berapa zakat maal 2,5% yang dibayar?',
                        answer: 'Rp3.000.000',
                        options: ['Rp300.000', 'Rp3.000.000', 'Rp12.000.000', 'Rp30.000.000']
                    }
                ]
            },
            centerTower: {
                type: 'blankSequence',
                title: 'Menara Tengah: Lengkapi Zakat',
                stages: [
                    {
                        prompt: 'Batas minimal harta wajib zakat disebut ____.',
                        answer: 'nisab',
                        options: ['nisab', 'hadiah', 'utang', 'tabungan biasa']
                    },
                    {
                        prompt: 'Harta yang dimiliki selama satu tahun disebut telah mencapai ____.',
                        answer: 'haul',
                        options: ['haul', 'hibah', 'hadiah', 'amal']
                    },
                    {
                        prompt: 'Orang yang membayar zakat disebut ____.',
                        answer: 'muzakki',
                        options: ['mustahik', 'muzakki', 'amil', 'haul']
                    },
                    {
                        prompt: 'Orang yang menerima zakat disebut ____.',
                        answer: 'mustahik',
                        options: ['muzakki', 'mustahik', 'nisab', 'zakat']
                    },
                    {
                        prompt: 'Zakat wajib bagi muslim yang sudah ____.',
                        answer: 'baligh dan berakal',
                        options: ['baligh dan berakal', 'berusia 30 tahun', 'selalu kaya', 'selalu bepergian']
                    }
                ]
            },
            rightTower: {
                type: 'timedQuiz',
                title: 'Menara Kanan: Kuis Cepat Zakat',
                timeLimit: 30,
                questions: [
                    {
                        prompt: 'Zakat termasuk rukun Islam nomor berapa?',
                        answer: '3',
                        options: ['1', '2', '3', '5']
                    },
                    {
                        prompt: 'Zakat diberikan kepada siapa?',
                        answer: 'Orang yang berhak menerima zakat',
                        options: ['Orang yang berhak menerima zakat', 'Hanya orang kaya', 'Hanya teman dekat', 'Siapa saja tanpa aturan']
                    },
                    {
                        prompt: 'Zakat membersihkan apa?',
                        answer: 'Harta',
                        options: ['Harta', 'Rumah', 'Pakaian', 'Makanan']
                    },
                    {
                        prompt: 'Haul berarti harta tersimpan selama berapa lama?',
                        answer: '1 tahun',
                        options: ['1 hari', '1 bulan', '1 tahun', '10 tahun']
                    },
                    {
                        prompt: 'Orang wajib zakat harus memiliki harta mencapai apa?',
                        answer: 'Nisab',
                        options: ['Nisab', 'Hadiah', 'Upah', 'Pinjaman']
                    }
                ]
            }
        };
    }

    _placeShadow() {
        const shadowLand = this._tileToWorld(13, 3);
        const shadow = this.add.sprite(shadowLand.x, shadowLand.y, 'bayangan', 0);
        shadow.setOrigin(0.5, 0.82);
        shadow.setScale((16 * this._mapScale * 2.1) / 632);
        shadow.setTint(0x2b0f35);
        shadow.setAlpha(0.88);
        shadow.setDepth(19);

        this.tweens.add({
            targets: shadow,
            alpha: 0.58,
            duration: 700,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });

        this._shadow = shadow;
    }

    _addAtmosphere(W, H) {
        const shade = this.add.graphics();
        shade.fillStyle(0x220011, 0.18);
        shade.fillRect(0, 0, W, H);
        shade.setDepth(20);

        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.5);
        vignette.fillRect(0, 0, 70, H);
        vignette.fillRect(W - 70, 0, 70, H);
        vignette.fillRect(0, 0, W, 45);
        vignette.fillRect(0, H - 45, W, 45);
        vignette.setDepth(21);
    }

    _buildHealthUI() {
        this._healthText = this.add.text(24, 20, `Health Ahmad: ${this._getHealthHeartsText()}`, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        });
        this._healthText.setDepth(70);
    }

    _buildInteractionPrompt(W, H) {
        this._interactionText = this.add.text(W / 2, H - 140, '', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this._interactionText.setDepth(70);
        this._interactionText.setVisible(false);
    }

    _getHealthHeartsText() {
        const filled = '\u2764 '.repeat(this._health);
        const empty = '\u2661 '.repeat(this._maxHealth - this._health);
        return `${filled}${empty}`.trim();
    }

    _updateHealthText() {
        if (this._healthText) {
            this._healthText.setText(`Health Ahmad: ${this._getHealthHeartsText()}`);
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
            this._showPuzzlePrompt();
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
        this._dlgBg.fillStyle(dialog.isShadow ? 0x120816 : 0x050510, 0.94);
        this._dlgBg.fillRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.lineStyle(2, dialog.isShadow ? 0x7b3c8c : 0xAAAAAA, 1);
        this._dlgBg.strokeRoundedRect(20, panelY, W - 40, panelH, 10);
        this._dlgBg.setVisible(true);

        this._dlgPortrait.setTexture(dialog.portrait.key, dialog.portrait.frame);
        this._dlgPortrait.setTint(dialog.isShadow ? 0x6d4075 : 0xffffff);
        this._dlgPortrait.setVisible(true);
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

    _closeDialog() {
        this._dlgBg.setVisible(false);
        this._dlgPortrait.setVisible(false);
        this._dlgSpeaker.setText('');
        this._dlgText.setText('');
        this._dlgHint.setVisible(false);
        this._dialogOpen = false;
    }

    _showPuzzlePrompt() {
        const W = this.scale.width;
        const H = this.scale.height;
        this._puzzlesEnabled = true;
        this._playerControlEnabled = true;

        this._statusText = this.add.text(W / 2, H - 105, 'Klik menara untuk memulai ujian zakat.', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this._statusText.setDepth(60);

        this.tweens.add({
            targets: this._statusText,
            alpha: 0.35,
            duration: 700,
            yoyo: true,
            loop: -1
        });
    }

    _updatePlayerMovement(delta) {
        if (!this._ahmad || this._battleEnded || this._puzzlePanelObjects.length > 0) {
            this._setAhmadIdleFrame();
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
            return;
        }

        const length = Math.hypot(moveX, moveY);
        moveX /= length;
        moveY /= length;

        const speed = 74 * this._mapScale;
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

        this._ahmad.play(`boss_ahmad_walk_${this._lastDirection}`, true);
    }

    _canMoveTo(worldX, worldY) {
        const mapLeft = this._offsetX;
        const mapTop = this._offsetY;
        const mapRight = this._offsetX + 25 * this._tileSize;
        const mapBottom = this._offsetY + 20 * this._tileSize;

        return worldX >= mapLeft && worldX <= mapRight && worldY >= mapTop && worldY <= mapBottom;
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

    _updateTowerProximity() {
        if (!this._puzzlesEnabled || !this._towers || !this._ahmad || this._battleEnded) {
            this._nearestTowerId = null;
            if (this._interactionText) this._interactionText.setVisible(false);
            return;
        }

        const interactionRadius = this._tileSize * 2.5;
        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        this._towers.forEach((tower) => {
            if (this._towerSolved[tower.towerId]) return;
            const distance = Phaser.Math.Distance.Between(this._ahmad.x, this._ahmad.y, tower.x, tower.y);
            if (distance < nearestDistance) {
                nearest = tower;
                nearestDistance = distance;
            }
        });

        if (nearest && nearestDistance <= interactionRadius) {
            this._nearestTowerId = nearest.towerId;
            if (this._interactionText) {
                this._interactionText.setText('Tekan E untuk membuka menara');
                this._interactionText.setVisible(true);
            }
        } else {
            this._nearestTowerId = null;
            if (this._interactionText) this._interactionText.setVisible(false);
        }
    }

    _interactWithNearestTower() {
        if (!this._puzzlesEnabled || this._dialogOpen || this._puzzlePanelObjects.length > 0 || !this._nearestTowerId) {
            return;
        }

        this._openTowerPuzzle(this._nearestTowerId);
    }

    _openTowerPuzzle(towerId) {
        if (!this._puzzlesEnabled || this._battleEnded) {
            return;
        }

        if (this._towerSolved[towerId]) {
            this._showStatusMessage('Menara ini sudah menyala.');
            return;
        }

        this._clearPuzzlePanel();
        this._activePuzzle = towerId;
        const puzzle = this._puzzleData[towerId];

        if (puzzle.type === 'caseStudy') {
            this._renderCaseStudyStage();
            return;
        }

        if (puzzle.type === 'blankSequence') {
            this._renderBlankStage();
            return;
        }

        if (puzzle.type === 'timedQuiz') {
            this._towerStageIndex.rightTower = 0;
            this._quizIndex = 0;
            this._startQuizTimer();
            this._renderQuizQuestion();
            return;
        }
    }

    _renderCaseStudyStage() {
        const puzzle = this._puzzleData.leftTower;
        const stageIndex = this._towerStageIndex.leftTower;
        const stage = puzzle.stages[stageIndex];

        this._renderPuzzlePanel(
            `${puzzle.title} (${stageIndex + 1}/${puzzle.stages.length})`,
            stage.prompt,
            stage.options
        );
    }

    _renderBlankStage() {
        const puzzle = this._puzzleData.centerTower;
        const stageIndex = this._towerStageIndex.centerTower;
        const stage = puzzle.stages[stageIndex];

        this._renderPuzzlePanel(
            `${puzzle.title} (${stageIndex + 1}/${puzzle.stages.length})`,
            stage.prompt,
            stage.options
        );
    }

    _renderQuizQuestion() {
        const puzzle = this._puzzleData.rightTower;
        const question = puzzle.questions[this._quizIndex];
        this._renderPuzzlePanel(
            `${puzzle.title} (${this._quizIndex + 1}/${puzzle.questions.length})`,
            question.prompt,
            question.options,
            { showTimer: true }
        );
    }

    _renderPuzzlePanel(title, prompt, options, config = {}) {
        const W = this.scale.width;
        const H = this.scale.height;
        const panelX = W / 2 - 380;
        const panelY = H / 2 - 175;
        const panelW = 760;
        const panelH = 350;
        const showTimer = !!config.showTimer;

        const bg = this.add.graphics();
        bg.fillStyle(0x080812, 0.96);
        bg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
        bg.lineStyle(2, 0xFFD700, 1);
        bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
        bg.setDepth(80);
        this._puzzlePanelObjects.push(bg);

        const titleText = this.add.text(W / 2, panelY + 32, title, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '19px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        titleText.setDepth(81);
        this._puzzlePanelObjects.push(titleText);

        const promptText = this.add.text(W / 2, panelY + 82, prompt, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            wordWrap: { width: panelW - 80 },
            lineSpacing: 5
        }).setOrigin(0.5);
        promptText.setDepth(81);
        this._puzzlePanelObjects.push(promptText);

        if (showTimer) {
            this._quizTimerText = this.add.text(W / 2, panelY + 118, `Waktu: ${this._quizTimeRemaining} detik`, {
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '15px',
                color: '#FF7777',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }).setOrigin(0.5);
            this._quizTimerText.setDepth(82);
            this._puzzlePanelObjects.push(this._quizTimerText);
        }

        const optionsStartY = showTimer ? panelY + 175 : panelY + 145;

        options.forEach((option, index) => {
            const optionY = optionsStartY + index * 45;
            const optionText = this.add.text(W / 2, optionY, option, {
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '14px',
                color: '#000000',
                backgroundColor: '#FFD700',
                padding: { x: 14, y: 8 },
                align: 'center',
                wordWrap: { width: panelW - 120 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            optionText.setDepth(82);
            optionText.on('pointerdown', () => this._answerCurrentPuzzle(option));
            optionText.on('pointerover', () => optionText.setAlpha(0.75));
            optionText.on('pointerout', () => optionText.setAlpha(1));
            this._puzzlePanelObjects.push(optionText);
        });

        const closeText = this.add.text(panelX + panelW - 28, panelY + 24, 'X', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeText.setDepth(82);
        closeText.on('pointerdown', () => this._cancelActivePuzzle());
        this._puzzlePanelObjects.push(closeText);
    }

    _answerCurrentPuzzle(answer) {
        if (!this._activePuzzle || this._battleEnded) {
            return;
        }

        const puzzle = this._puzzleData[this._activePuzzle];

        if (puzzle.type === 'caseStudy') {
            const stage = puzzle.stages[this._towerStageIndex.leftTower];

            if (answer === stage.answer) {
                this._advanceTowerStage('leftTower');
            } else {
                this._loseHealth();
                if (this._health > 0) {
                    this._clearPuzzlePanel();
                    this._renderCaseStudyStage();
                }
            }
            return;
        }

        if (puzzle.type === 'blankSequence') {
            const stage = puzzle.stages[this._towerStageIndex.centerTower];

            if (answer === stage.answer) {
                this._advanceTowerStage('centerTower');
            } else {
                this._loseHealth();
                if (this._health > 0) {
                    this._clearPuzzlePanel();
                    this._renderBlankStage();
                }
            }
            return;
        }

        if (puzzle.type === 'timedQuiz') {
            const question = puzzle.questions[this._quizIndex];
            if (answer !== question.answer) {
                this._loseHealth();
                return;
            }

            this._quizIndex++;
            this._towerStageIndex.rightTower = this._quizIndex;
            if (this._quizIndex >= puzzle.questions.length) {
                this._completeTower(this._activePuzzle);
                return;
            }

            this._clearPuzzlePanel();
            this._renderQuizQuestion();
            return;
        }
    }

    _advanceTowerStage(towerId) {
        const puzzle = this._puzzleData[towerId];
        this._towerStageIndex[towerId]++;
        this._clearPuzzlePanel();

        if (this._towerStageIndex[towerId] >= puzzle.stages.length) {
            this._completeTower(towerId);
            return;
        }

        this._showStatusMessage('Tahap benar. Lanjutkan ujian menara.');

        if (puzzle.type === 'caseStudy') {
            this._renderCaseStudyStage();
        } else if (puzzle.type === 'blankSequence') {
            this._renderBlankStage();
        }
    }

    _startQuizTimer() {
        this._stopQuizTimer();
        const puzzle = this._puzzleData.rightTower;
        this._quizTimeRemaining = puzzle.timeLimit;

        this._quizTimerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this._quizTimeRemaining--;
                if (this._quizTimerText) {
                    this._quizTimerText.setText(`Waktu: ${this._quizTimeRemaining} detik`);
                }

                if (this._quizTimeRemaining <= 0) {
                    this._handleQuizTimeout();
                }
            },
            loop: true
        });
    }

    _stopQuizTimer() {
        if (this._quizTimerEvent) {
            this._quizTimerEvent.remove();
            this._quizTimerEvent = null;
        }
        this._quizTimerText = null;
    }

    _handleQuizTimeout() {
        this._stopQuizTimer();
        this._loseHealth();

        if (this._health <= 0 || this._battleEnded) {
            return;
        }

        this._quizIndex = 0;
        this._towerStageIndex.rightTower = 0;
        this._clearPuzzlePanel();
        this._showStatusMessage('Waktu habis. Kuis dimulai dari awal.');
        this._startQuizTimer();
        this._renderQuizQuestion();
    }

    _loseHealth() {
        this._health = Math.max(0, this._health - 1);
        this._updateHealthText();
        this._showStatusMessage('Jawaban salah. Health Ahmad berkurang.');

        if (this._health <= 0) {
            this._stopQuizTimer();
            this._clearPuzzlePanel();
            this._showStatusMessage('Keraguan menguasai Ahmad... coba lagi.');
            this.time.delayedCall(1500, () => this._resetPuzzleProgress());
        }
    }

    _completeTower(towerId) {
        if (towerId === 'rightTower') {
            this._stopQuizTimer();
        }

        this._towerSolved[towerId] = true;
        this._activePuzzle = null;
        this._clearPuzzlePanel();
        this._showStatusMessage('Menara menyala.');

        const towerSprite = this._towers.find((tower) => tower.name === towerId);
        if (towerSprite) {
            towerSprite.clearTint();
            towerSprite.setFrame(4);
        }

        if (Object.values(this._towerSolved).every(Boolean)) {
            this._defeatShadow();
        }
    }

    _defeatShadow() {
        this._stopQuizTimer();
        this._battleEnded = true;
        this._puzzlesEnabled = false;
        this._showFinalShadowDialog();
    }

    _showFinalShadowDialog() {
        this._clearPuzzlePanel();

        const lines = [
            'Tidak... keraguan ini mulai hancur...',
            'Kamu memilih yakin, bukan menunda.',
            'Harta yang bersih membuat hati lebih tenang...',
            'Aku... tidak bisa menahanmu lagi...'
        ];

        let index = 0;
        const showLine = () => {
            if (index >= lines.length) {
                this._showStatusMessage('Bayangan berhasil dikalahkan.');
                this._fadeShadowAndWake();
                return;
            }

            this._showStatusMessage(lines[index]);
            index++;
            this.time.delayedCall(1700, showLine);
        };

        showLine();
    }

    _fadeShadowAndWake() {
        if (this._shadow) {
            this.tweens.add({
                targets: this._shadow,
                alpha: 0,
                scaleX: this._shadow.scaleX * 0.4,
                scaleY: this._shadow.scaleY * 0.4,
                duration: 1200,
                ease: 'Cubic.in',
                onComplete: () => this._fadeToWakeScene()
            });
            return;
        }

        this._fadeToWakeScene();
    }

    _fadeToWakeScene() {
        this.time.delayedCall(600, () => {
            this.cameras.main.fadeOut(900, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('BangunAhmad');
            });
        });
    }

    _resetPuzzleProgress() {
        this._health = this._maxHealth;
        this._towerSolved = {
            leftTower: false,
            centerTower: false,
            rightTower: false
        };
        this._towerStageIndex = {
            leftTower: 0,
            centerTower: 0,
            rightTower: 0
        };
        this._activePuzzle = null;
        this._quizIndex = 0;
        this._stopQuizTimer();
        this._battleEnded = false;
        this._puzzlesEnabled = true;
        this._updateHealthText();
        this._clearPuzzlePanel();

        if (this._towers) {
            this._towers.forEach((tower) => {
                tower.clearTint();
                tower.setFrame(tower.activeFrame);
            });
        }

        if (this._shadow) {
            this._shadow.setAlpha(0.88);
            this._shadow.setVisible(true);
        }

        this._showStatusMessage('Coba lagi. Klik menara untuk memulai ujian zakat.');
    }

    _showStatusMessage(message) {
        if (this._statusText) {
            this._statusText.setText(message);
        }
    }

    _cancelActivePuzzle() {
        if (this._activePuzzle === 'rightTower') {
            this._stopQuizTimer();
        }
        this._activePuzzle = null;
        this._clearPuzzlePanel();
    }

    _clearPuzzlePanel() {
        this._puzzlePanelObjects.forEach((object) => object.destroy());
        this._puzzlePanelObjects = [];
    }
}
