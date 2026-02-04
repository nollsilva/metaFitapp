// src/utils/audio.js

// Initialize Audio Context lazily
let audioCtx = null;

const getAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
};

// Play a single tone
// types: 'sine', 'square', 'sawtooth', 'triangle'
const playTone = (frequency = 440, type = 'sine', duration = 0.5, volume = 0.1, startTime = 0) => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
    } catch (e) {
        console.error("Audio Error:", e);
    }
};

// SFX Presets
export const playSfx = (type) => {
    const ctx = getAudioContext();
    const now = 0; // Relative start time handling in playTone handles ctx.currentTime

    switch (type) {
        case 'success': // High pitched 'ding'
            playTone(880, 'sine', 0.1, 0.1, 0);
            playTone(1760, 'sine', 0.3, 0.1, 0.1);
            break;

        case 'coin': // Mario-like coin sound
            playTone(987, 'square', 0.08, 0.1, 0);
            playTone(1318, 'square', 0.2, 0.1, 0.08);
            break;

        case 'levelup': // Rising fanfare
            playTone(440, 'triangle', 0.1, 0.1, 0);
            playTone(554, 'triangle', 0.1, 0.1, 0.1);
            playTone(659, 'triangle', 0.1, 0.1, 0.2);
            playTone(880, 'triangle', 0.4, 0.1, 0.3);
            break;

        case 'error': // Low buzz
            playTone(150, 'sawtooth', 0.3, 0.2, 0);
            break;

        case 'click': // Short click
            playTone(600, 'sine', 0.05, 0.05, 0);
            break;

        case 'countdown': // Woodblock-ish tick
            playTone(800, 'sine', 0.05, 0.1, 0);
            break;

        case 'go': // High whistle
            playTone(1200, 'square', 0.4, 0.1, 0);
            break;

        case 'clash': // Metallic Clang (Swords)
            console.log("🔊 Playing CLASH SFX");
            // Three discordant tones to simulate noise/impact
            playTone(100, 'sawtooth', 0.5, 0.3, 0);   // Low punch louder
            playTone(1200, 'square', 0.4, 0.1, 0);    // High metallic ping louder
            playTone(1250, 'square', 0.4, 0.1, 0.05); // Dissonance louder
            break;

        default:
            console.warn("Unknown SFX type:", type);
    }
};

// Text-to-Speech
let voices = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
    };
}

export const speak = (text, rate = 1.0, pitch = 1.0) => {
    if (!window.speechSynthesis) return;

    // Cancel current speech to avoid queue buildup for countdowns
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Attempt to find a Portuguese voice
    if (voices.length === 0) voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR')) || voices.find(v => v.lang.includes('pt'));

    if (ptVoice) {
        utterance.voice = ptVoice;
    }

    utterance.lang = 'pt-BR';
    utterance.rate = rate; // 0.1 to 10
    utterance.pitch = pitch; // 0 to 2
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
};
