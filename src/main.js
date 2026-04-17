import { TitleScreen } from './scenes/TitleScreen.js';
import { KamarAhmad } from './scenes/KamarAhmad.js';
import { TidurAhmad } from './scenes/TidurAhmad.js';
import { DuniaGelap } from './scenes/DuniaGelap.js';
import { BossCave } from './scenes/BossCave.js';
import { Start } from './scenes/Start.js';

const config = {
    type: Phaser.AUTO,
    title: 'Petualangan Zakat',
    description: 'Game edukasi zakat untuk anak-anak',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#0d0d2b',
    pixelArt: true,
    scene: [
        TitleScreen,
        KamarAhmad,
        TidurAhmad,
        DuniaGelap,
        BossCave,
        Start
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
