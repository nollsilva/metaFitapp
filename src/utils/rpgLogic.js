// Core formulas and constants for RPG Academy

export const ATTRIBUTES = {
    STR: 'força',
    SPD: 'velocidade',
    RES: 'resistência',
    HP: 'vida'
};

export const ZONES = {
    WEIGHTS: { id: 'weights', label: 'Musculação', attr: ATTRIBUTES.STR, color: '#ff4444' }, // Red
    TREADMILL: { id: 'treadmill', label: 'Esteira', attr: ATTRIBUTES.SPD, color: '#4444ff' }, // Blue
    MATS: { id: 'mats', label: 'Resistência', attr: ATTRIBUTES.RES, color: '#44ff44' } // Green
};

export const XP_COST_PER_UNIT = 100;
export const TRAINING_DURATION_MS = 4 * 60 * 60 * 1000; // 4 Hours

// Gain per 100 XP
export const GAINS = {
    [ATTRIBUTES.STR]: 4,
    [ATTRIBUTES.SPD]: 2,
    [ATTRIBUTES.RES]: 2
};

export const calculateMaxHp = (str, res) => {
    return 100 + (str * 2) + (res * 5);
};

export const calculateTrainingEndTime = () => {
    return Date.now() + TRAINING_DURATION_MS;
};

// Formatting helper
export const formatTimeRemaining = (endTime) => {
    const now = Date.now();
    const diff = endTime - now;
    if (diff <= 0) return null;

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}min`;
};

// Cycle Logic
export const getCycleDay = () => {
    // 1 = Monday, 7 = Sunday
    // For Prototype, this will be controlled by local state or a debug flag
    const day = new Date().getDay(); // 0 (Sun) - 6 (Sat)
    // Map to 1-7 (Mon=1 ... Sun=7)
    return day === 0 ? 7 : day;
};
