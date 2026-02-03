// Helper Functions
export const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

// 1. Efficiency (Diminishing Returns - % of Total Pool)
// Rules: 0-40% -> 100%, 40-75% -> 80%, >75% -> 50%
const getEfficiencyMultiplier = (points, maxPool) => {
    if (maxPool === 0) return 1.0;
    const usage = (points / maxPool) * 100;
    if (usage <= 40) return 1.0; // Efficient
    if (usage <= 75) return 0.8; // Moderate Strain
    return 0.5; // Inefficient (All-in penalty)
};

// 2. Fatigue (Repetition Penalty)
// Rule: If >50% of attribute used in prev turn, -15% efficiency next turn.
const getFatigueMultiplier = (prevPoints, maxPool) => {
    if (!prevPoints || maxPool === 0) return 1.0;
    const prevUsage = (prevPoints / maxPool) * 100;

    // User: "se usar mais de 50% no memso atributo ele fica cansado"
    // "no proximo turno ele fica 15% menos eficiente" -> 0.85
    if (prevUsage > 50) return 0.85;
    return 1.0;
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

    // Context: { profile, hp, maxHp, history: { ... }, pool: { strength, speed, defense } (Available), maxPool: { strength, speed, defense } (Total Capacity) }
    // We need Max Pool capacity to calculate percentages.
    // Assuming context has `maxPool` object (Total Capacity of the attribute).

    const calcEffective = (val, type, context) => {
        const maxCapacity = context.maxPool ? context.maxPool[type] : 100; // Fallback 100
        const prevVal = context.history ? context.history[type] : 0;

        const eff = getEfficiencyMultiplier(val, maxCapacity);
        const fatigue = getFatigueMultiplier(prevVal, maxCapacity);

        return Math.floor(val * eff * fatigue);
    };

    const pSpeed = calcEffective(playerBid.speed, 'speed', pContext);
    const eSpeed = calcEffective(enemyBid.speed, 'speed', eContext);

    // Speed Variance for Initiative (User: "Velocidade define quem resolve primeiro")
    let initiative = 'draw';
    if (pSpeed > eSpeed) initiative = 'player';
    else if (eSpeed > pSpeed) initiative = 'enemy';

    // 5. Random Variation (+/- 10%)
    const getRandomMult = () => 0.9 + (Math.random() * 0.2);

    const resolveClash = (attackerName, defenderName, atkBid, defBid, atkContext, defContext, isPlayerAttacker) => {
        // Calculate Effective Values
        const atkVal = calcEffective(atkBid, 'strength', atkContext);
        const defVal = calcEffective(defBid, 'defense', defContext);

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
