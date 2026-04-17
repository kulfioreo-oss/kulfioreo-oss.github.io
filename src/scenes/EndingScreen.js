import { playSceneMusic } from '../audio/musicManager.js';

export class EndingScreen extends Phaser.Scene {

    constructor() {
        super('EndingScreen');
    }

    preload() {
        this.load.image('title_bg', 'assets/title_bg.png');
        this.load.image('title_logo', 'assets/title_logo.png');
        this.load.audio('contemplation', 'assets/audio/contemplation.mp3');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        playSceneMusic(this, 'contemplation');

        const bg = this.add.tileSprite(W / 2, H / 2, W, H, 'title_bg');
        bg.setAlpha(0.32);

        const warm = this.add.graphics();
        warm.fillStyle(0x120b1f, 0.78);
        warm.fillRect(0, 0, W, H);
        warm.fillStyle(0xffd978, 0.08);
        warm.fillRect(0, 0, W, H);

        this._buildStarfield(W, H);

        const logo = this.add.image(W / 2, 96, 'title_logo');
        logo.setOrigin(0.5);
        logo.setScale(Math.min(520 / logo.width, 130 / logo.height));

        this.add.text(W / 2, 205, 'Alhamdulillah', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '34px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(W / 2, 260, 'Ahmad memilih untuk tidak menunda zakat.', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        const lessons = [
            'Zakat membersihkan harta.',
            'Zakat membantu orang yang berhak.',
            'Jika sudah mencapai nisab dan haul, zakat harus ditunaikan.'
        ];

        lessons.forEach((line, index) => {
            this.add.text(W / 2, 330 + index * 42, line, {
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '18px',
                color: '#FFE9A8',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5);
        });

        this.add.text(W / 2, 485, 'Terima kasih sudah bermain.', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        this._createButton(W / 2 - 135, 575, 'MAIN LAGI', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('TitleScreen');
            });
        });

        this._createButton(W / 2 + 135, 575, 'SELESAI', () => {
            this._showDoneMessage(W, H);
        });

        this.cameras.main.fadeIn(900, 0, 0, 0);
    }

    update() {
        if (this.children && this.children.list) {
            const bg = this.children.list.find((child) => child.type === 'TileSprite');
            if (bg) {
                bg.tilePositionX += 0.12;
            }
        }
    }

    _createButton(x, y, label, onClick) {
        const button = this.add.text(x, y, label, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '18px',
            color: '#000000',
            backgroundColor: '#FFD700',
            padding: { x: 18, y: 10 },
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setAlpha(0.78));
        button.on('pointerout', () => button.setAlpha(1));
        button.on('pointerdown', onClick);

        return button;
    }

    _showDoneMessage(W, H) {
        if (this._doneText) {
            return;
        }

        this._doneText = this.add.text(W / 2, H - 58, 'Semoga ilmu zakat ini bermanfaat.', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '15px',
            color: '#CCCCCC',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
    }

    _buildStarfield(W, H) {
        const gfx = this.add.graphics();
        const colors = [0xffffff, 0xfff2aa, 0xaaddff];

        for (let i = 0; i < 70; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H);
            const size = Phaser.Math.Between(1, 3);
            gfx.fillStyle(Phaser.Utils.Array.GetRandom(colors), Phaser.Math.FloatBetween(0.28, 0.9));
            gfx.fillRect(x, y, size, size);
        }
    }
}
