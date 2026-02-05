export const RANK_THRESHOLDS = {
    BRONZE: { min: 0, max: 8999 },
    SILVER: { min: 9000, max: 20999 },
    GOLD: { min: 21000, max: 35999 },
    PLATINUM: { min: 36000, max: 53999 },
    DIAMOND: { min: 54000, max: Infinity }
};

export const getRankTitle = (xp) => {
    const val = xp || 0;
    // Bronze
    if (val < 3000) return 'Bronze ⭐';
    if (val < 6000) return 'Bronze ⭐⭐';
    if (val < 9000) return 'Bronze ⭐⭐⭐';
    // Silver
    if (val < 13000) return 'Prata ⭐';
    if (val < 17000) return 'Prata ⭐⭐';
    if (val < 21000) return 'Prata ⭐⭐⭐';
    // Gold
    if (val < 26000) return 'Ouro ⭐';
    if (val < 31000) return 'Ouro ⭐⭐';
    if (val < 36000) return 'Ouro ⭐⭐⭐';
    // Platinum
    if (val < 42000) return 'Platina ⭐';
    if (val < 48000) return 'Platina ⭐⭐';
    if (val < 54000) return 'Platina ⭐⭐⭐';

    return 'Diamante 💎';
};

export const calculateSeasonReset = (currentXp) => {
    // Demotion Rules Table
    // Diamond (54k+) -> Platinum III (48k)
    if (currentXp >= 54000) return 48000;

    // Platinum III (48k-54k) -> Platinum I (36k)
    if (currentXp >= 48000) return 36000;
    // Platinum II (42k-48k) -> Gold III (31k)
    if (currentXp >= 42000) return 31000;
    // Platinum I (36k-42k) -> Gold II (26k)
    if (currentXp >= 36000) return 26000;

    // Gold III (31k-36k) -> Gold I (21k)
    if (currentXp >= 31000) return 21000;
    // Gold II (26k-31k) -> Silver III (17k)
    if (currentXp >= 26000) return 17000;
    // Gold I (21k-26k) -> Silver II (13k)
    if (currentXp >= 21000) return 13000;

    // Silver III (17k-21k) -> Silver I (9k)
    if (currentXp >= 17000) return 9000;
    // Silver II (13k-17k) -> Bronze III (6k)
    if (currentXp >= 13000) return 6000;
    // Silver I (9k-13k) -> Bronze II (3k)
    if (currentXp >= 9000) return 3000;

    // Bronze -> No Change
    return currentXp;
};

/**
 * Calculates Level based on XP.
 * Level 0: 0 - 1000
 * Level 1: 1001 - 2000
 * Level 2: 2001 - 3000
 * Formula: floor((XP - 1) / 1000) (min 0)
 */
export const calculateLevel = (xp) => {
    if (!xp || xp <= 1000) return 0;
    return Math.floor((xp - 1) / 1000);
};

export const getXpForNextLevel = (level) => {
    // Level 0 -> needs 1001 for Level 1
    // Level 1 -> needs 2001 for Level 2
    return (level + 1) * 1000 + 1;
};
