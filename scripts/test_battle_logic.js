
import { calculateTurnLogic, getMaxHp } from '../src/utils/battleLogic.js';

// Mock Profiles
const pProfile = { level: 10, attributes: { strength: 10, speed: 10, defense: 10 } };
const eProfile = { level: 10, attributes: { strength: 10, speed: 10, defense: 10 } };
const maxHp = getMaxHp(pProfile);

// Helper to run a turn and print result
const runTest = (name, pBid, eBid, pHistory, eHistory, pHp = maxHp, eHp = maxHp) => {
    console.log(`\n--- Test: ${name} ---`);
    console.log(`Player Bid: Str ${pBid.strength} (Hist: ${pHistory?.strength || 0})`);

    const pContext = { profile: pProfile, hp: pHp, maxHp, history: pHistory };
    const eContext = { profile: eProfile, hp: eHp, maxHp, history: eHistory };

    const result = calculateTurnLogic(pBid, eBid, pContext, eContext);

    console.log("Log:", result.log);
    console.log(`Damage: P dealt ${result.eDamage}, P took ${result.pDamage}`);
    return result;
};

// 1. Efficiency Test (Diminishing Returns)
// 8 points -> should be effectively ~5 (6*0.85 + 2*0.65? No, formula is floor(8 * 0.65) = 5)
runTest("Efficiency Check (8 pts)",
    { strength: 8, speed: 0, defense: 0 },
    { strength: 0, speed: 0, defense: 0 },
    null, null
);

// 2. Fatigue Test (-30% if prev >= 4)
// Prev: 5 Str. Curr: 5 Str. 
// Base 5. Eff(5) = 0.85 -> 4. Fatigue(Prev>=4) = 0.7.
// Total Mult = 0.85 * 0.7 = 0.595. 
// 5 * 0.595 = 2.97 -> 2. 
runTest("Fatigue Check (5 pts with History)",
    { strength: 5, speed: 0, defense: 0 },
    { strength: 0, speed: 0, defense: 0 },
    { strength: 5, speed: 0, defense: 0 }, // History of high strength
    null
);

// 3. Defense Nerf (Counter Cap)
// Player Def 10 vs Enemy Atk 2.
// Block = 8. Counter = 2.4 -> 2. Cap check?
runTest("Defense Counter Check",
    { strength: 0, speed: 0, defense: 10 },
    { strength: 2, speed: 0, defense: 0 },
    null, null
);

// 4. Low HP Scaling
// 40% HP -> 0.85 or 0.7 mult? 
// 300 Max. 100 Current (33%). Mult should be 0.7.
runTest("Low HP Resilience",
    { strength: 0, speed: 0, defense: 0 },
    { strength: 10, speed: 0, defense: 0 },
    null, null,
    100, // Player Low HP
    300
);
