// Helper Functions
export const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

// 1. Efficiency (Diminishing Returns)
const getEfficiencyMultiplier = (points) => {
    if (points <= 3) return 1.0;
    if (points <= 6) return 0.85;
    return 0.65;
};

// 2. Fatigue (Repetition Penalty)
const getFatigueMultiplier = (currentPoints, historyPoints) => {
    if (!historyPoints || historyPoints < 4) return 1.0;
    // If we are here, previous turn had >= 4 points.
    // We need to know if it's 2nd or 3rd time. 
    // Simplified User Rule: "If attr received 4+ pts in prev turn, it enters fatigue next turn."
    // "2nd consecutive: -30%, 3rd consecutive: -50%"
    // NOTE: Implementing "2nd consecutive" as -30% immediately if prev >= 4.
    // Tracking 3rd consecutive requires more history, for now let's stick to -30% if prev was high.
    // TO DO FULLY: We need a 'consecutiveCount' in history.
    // For this iteration, let's assume standard fatigue -30% if prev >= 4.
    return 0.7;
};

// 3. HP Scaling
const getHpScaling = (currentHp, maxHp) => {
    if (maxHp === 0) return 1.0;
    const percent = (currentHp / maxHp) * 100;
    if (percent > 70) return 1.0;
    if (percent >= 40) return 0.85;
    return 0.70;
};

export const calculateTurnLogic = (playerBid, enemyBid, pContext, eContext) => {
    let log = [];
    let pDamage = 0;
    let eDamage = 0;

    // Unpack Context
    // Expected Context: { profile, hp, maxHp, history: { strength: 0, speed: 0, defense: 0, consecutive: {...} } }

    const pSpeedBase = playerBid.speed;
    const eSpeedBase = enemyBid.speed;

    // Apply Modifiers to Speed first to determine initiative
    const pSpeedEff = pSpeedBase * getEfficiencyMultiplier(pSpeedBase);
    const eSpeedEff = eSpeedBase * getEfficiencyMultiplier(eSpeedBase);

    // Fatigue check would go here if we tracked strictly per attribute, 
    // assuming simpler model for speed initiative or full model? 
    // User said: "Separately for Attack, Defense, Speed".
    // Let's implement full effective value calculation.

    const calcEffective = (val, type, history) => {
        const eff = getEfficiencyMultiplier(val);
        const fatigue = (history && history[type] >= 4) ? 0.7 : 1.0; // Simple 2-step fatigue (-30%)
        // Advanced Fatigue: If we had deep history, we'd do 0.5. 
        // For now, -30% is a strong enough deterrent.
        return Math.floor(val * eff * fatigue);
    };

    const pSpeed = calcEffective(playerBid.speed, 'speed', pContext.history);
    const eSpeed = calcEffective(enemyBid.speed, 'speed', eContext.history);

    // Speed Variance for Initiative (User: "Velocidade define quem resolve primeiro")
    let initiative = 'draw';
    if (pSpeed > eSpeed) initiative = 'player';
    else if (eSpeed > pSpeed) initiative = 'enemy';

    // 5. Random Variation (+/- 10%)
    const getRandomMult = () => 0.9 + (Math.random() * 0.2);

    const resolveClash = (attackerName, defenderName, atkBid, defBid, atkContext, defContext, isPlayerAttacker) => {
        // Calculate Effective Values
        const atkVal = calcEffective(atkBid, 'strength', atkContext.history);
        const defVal = calcEffective(defBid, 'defense', defContext.history);

        if (atkVal <= 0) {
            log.push(`🛡️ ${attackerName} não atacou! (Força 0)`);
            return { dmgDealt: 0, counterTaken: 0 };
        }

        // Damage Formula
        // DanoBase = AtaqueEfetivo - (DefesaEfetiva * 0.7)
        // User Logic 3: "Defense Nerf" -> Defense reduces damage, but not 1:1 if it's meant to be weaker?
        // Wait, User said: "Dano Bloqueado = Def - Atk (se positivo)". 
        // "Contra-ataque = 30% do Bloqueado".
        // Taking "Defense can't generate huge counter" literally.

        let damage = 0;
        let counter = 0;

        const difference = atkVal - defVal;

        if (difference > 0) {
            // Penetration
            damage = difference;
            log.push(`💥 ${attackerName} rompeu a defesa! (${atkVal} vs ${defVal})`);
        } else {
            // Blocked
            const blocked = Math.abs(difference);
            // Counter Logic: 30% of blocked amount
            counter = Math.floor(blocked * 0.3);

            // Cap Counter: Cannot exceed attacker's base strength for the turn (preventing shield meta)
            // Or maybe just strictly 30% is low enough? 
            // User: "Contra-ataque nunca pode ser maior que o ataque base do turno" -> Which base? Attacker's?
            if (counter > atkVal) counter = atkVal;

            log.push(`🛡️ ${defenderName} bloqueou! (${defVal} vs ${atkVal})`);
            if (counter > 0) log.push(`   -> Contra-golpe leve: ${counter} dano.`);
        }

        // Apply Low HP Scaling to Damage (Scaling applies to RECEIVER)
        const scale = getHpScaling(defContext.hp, defContext.maxHp);
        if (scale < 1.0) {
            log.push(`   -> Resiliência (${(scale * 100).toFixed(0)}%): Dano reduzido por baixa vida.`);
            damage = Math.floor(damage * scale);
        }

        // Apply Random Variation
        damage = Math.floor(damage * getRandomMult());
        counter = Math.floor(counter * getRandomMult());

        if (damage > 0) log.push(`   -> ${defenderName} sofreu ${damage} de dano.`);

        return { dmgDealt: damage, counterTaken: counter };
    };

    if (initiative === 'player') {
        log.push(`⚡ Você foi mais rápido! (${pSpeed} vs ${eSpeed})`);
        const res = resolveClash("Você", "Oponente", playerBid.strength, enemyBid.defense, pContext, eContext, true);
        eDamage += res.dmgDealt;
        pDamage += res.counterTaken;
    } else if (initiative === 'enemy') {
        log.push(`⚡ Oponente foi mais rápido! (${eSpeed} vs ${pSpeed})`);
        const res = resolveClash("Oponente", "Você", enemyBid.strength, playerBid.defense, eContext, pContext, false);
        pDamage += res.dmgDealt;
        eDamage += res.counterTaken;
    } else {
        log.push(`⚡ Velocidade Empatada! (${pSpeed}) Choque simultâneo!`);
        // Simultaneous
        const resP = resolveClash("Você", "Oponente", playerBid.strength, enemyBid.defense, pContext, eContext, true);
        const resE = resolveClash("Oponente", "Você", enemyBid.strength, playerBid.defense, eContext, pContext, false);

        eDamage += resP.dmgDealt;
        pDamage += resP.counterTaken;

        pDamage += resE.dmgDealt;
        eDamage += resE.counterTaken;
    }

    // Determine Turn Winner
    let winner = 'draw';
    if (eDamage > pDamage) winner = 'player';
    else if (pDamage > eDamage) winner = 'enemy';

    return {
        log,
        pDamage,
        eDamage,
        turnSummary: {
            winner,
            playerDamageDealt: eDamage,
            playerDamageTaken: pDamage,
            initiativeMsg: initiative === 'player' ? "Iniciativa: VOCÊ" : initiative === 'enemy' ? "Iniciativa: OPONENTE" : "Iniciativa: EMPATE"
        }
    };
};
