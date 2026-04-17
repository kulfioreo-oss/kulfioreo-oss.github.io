let currentTrackKey = null;
let currentSound = null;

export function playSceneMusic(scene, key, config = {}) {
    if (!scene || !scene.sound || !key) {
        return;
    }

    if (!scene.cache.audio.exists(key)) {
        console.warn(`Audio key "${key}" not found in cache.`);
        return;
    }

    if (currentTrackKey === key && currentSound && currentSound.isPlaying) {
        return;
    }

    if (currentSound) {
        currentSound.stop();
        currentSound.destroy();
        currentSound = null;
    }

    currentTrackKey = key;
    currentSound = scene.sound.add(key, {
        loop: true,
        volume: 0.35,
        ...config
    });
    currentSound.play();
}

export function stopSceneMusic() {
    if (currentSound) {
        currentSound.stop();
        currentSound.destroy();
        currentSound = null;
    }

    currentTrackKey = null;
}
