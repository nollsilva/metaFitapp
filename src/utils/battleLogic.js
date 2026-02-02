
// Helper Functions

export const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

export const calculateTurnLogic = (playerEffort, enemyEffort, pProfile, eProfile, fatigue) => {
    // Helper: Get Effective Stat (Base * Fatigue * Effort)
    const getStat = (p, attr, eff, fatigueVal) => {
        const base = 10 + ((p.level || 1) * 2) + ((p.attributes && p.attributes[attr]) || 0);
        const fatigueMultiplier = fatigueVal / 100;
        const effortMultiplier = eff / 100;
        return Math.floor(base * fatigueMultiplier * effortMultiplier * 3);
    };

    // Current Stats (incorporating Fatigue)
    const pStats = {
        speed: getStat(pProfile, 'speed', playerEffort.speed, fatigue.player.speed),
        strength: getStat(pProfile, 'strength', playerEffort.strength, fatigue.player.strength),
        defense: getStat(pProfile, 'defense', playerEffort.defense, fatigue.player.defense)
    };

    const eStats = {
        speed: getStat(eProfile, 'speed', enemyEffort.speed, fatigue.enemy.speed),
        strength: getStat(eProfile, 'strength', enemyEffort.strength, fatigue.enemy.strength),
        defense: getStat(eProfile, 'defense', enemyEffort.defense, fatigue.enemy.defense)
    };

    let log = [];
    let pDamage = 0;
    let eDamage = 0;

    // --- Phase 1: Initiative ---
    const playerSpeed = pStats.speed;
    const enemySpeed = eStats.speed;
    const playerGoesFirst = playerSpeed >= enemySpeed;

    // Bonus Calculation (+10% for winner)
    const atkBonus = 1.1;

    log.push(playerGoesFirst
        ? `⚡ Você foi mais rápido! (+10% de Dano)`
        : `⚡ Inimigo foi mais rápido! (+10% de Dano)`);

    // --- Damage Formula ---
    const calculateDamage = (atkVal, defVal, isBonus, isCounter) => {
        // Apply bonus if Initiative Winner
        let finalAtk = atkVal * (isBonus ? atkBonus : 1.0);

        // Counter-attack is weaker (50% power)
        if (isCounter) finalAtk = finalAtk * 0.5;

        // New Formula: Dmg = Atk * (1 - (Def / (Def + Atk)))
        const denominator = defVal + finalAtk;
        const reduction = denominator === 0 ? 0 : defVal / denominator;
        const damage = Math.floor(finalAtk * (1 - reduction));

        return Math.max(0, damage);
    };

    const resolvePhase = (attackerName, atkStat, defStat, isPlayer, isBonus, isCounter) => {
        const dmg = calculateDamage(atkStat, defStat, isBonus, isCounter);
        const typeText = isCounter ? " (Contra-Ataque)" : "";
        const icon = isPlayer ? "⚔️" : "🛡️";
        log.push(`${icon} ${attackerName} causou ${dmg} dano!${typeText}`);
        return dmg;
    };

    // --- Turn Execution ---
    // We only calculate DAMAGE here, not state updates directly to keep function pure-ish
    // But we need to simulate the state flow for Counter Attack check
    // We will return the total damage to apply at the end

    if (playerGoesFirst) {
        // 1. Player Attacks
        eDamage += resolvePhase("Você", pStats.strength, eStats.defense, true, true, false);

        // 2. Counter-Attack Check (using logic based on stats, not remaining HP yet)
        if (eStats.defense > pStats.strength) {
            log.push("🛡️ Inimigo bloqueou e contra-atacou!");
            pDamage += resolvePhase("Inimigo", eStats.strength, pStats.defense, false, false, true);
        } else {
            log.push("💫 Inimigo não conseguiu contra-atacar (Defesa baixa).");
        }
    } else {
        // 1. Enemy Attacks
        pDamage += resolvePhase("Inimigo", eStats.strength, pStats.defense, false, true, false);

        // 2. Counter-Attack Check
        if (pStats.defense > eStats.strength) {
            log.push("🛡️ Você bloqueou e contra-atacou!");
            eDamage += resolvePhase("Você", pStats.strength, eStats.defense, true, false, true);
        } else {
            log.push("💫 Você não conseguiu contra-atacar (Defesa baixa).");
        }
    }

    // --- 4. Fatigue System ---
    const calcNextFatigue = (effVal) => {
        if (effVal === 100) return 80; // -20%
        if (effVal === 75) return 90; // -10%
        return 100; // Reset
    };

    const newFatigue = {
        player: {
            speed: calcNextFatigue(playerEffort.speed),
            strength: calcNextFatigue(playerEffort.strength),
            defense: calcNextFatigue(playerEffort.defense)
        },
        enemy: {
            speed: calcNextFatigue(enemyEffort.speed),
            strength: calcNextFatigue(enemyEffort.strength),
            defense: calcNextFatigue(enemyEffort.defense)
        }
    };

    return {
        log,
        pDamage,
        eDamage,
        newFatigue,
        turnSummary: {
            winner: playerGoesFirst ? 'player' : 'enemy', // Who won initiative
            playerDamageDealt: eDamage,
            playerDamageTaken: pDamage,
            initiativeMsg: playerGoesFirst ? "Você venceu a disputa!" : "Oponente venceu a disputa!"
        }
    };
};
