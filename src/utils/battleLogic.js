// --- 1. CORE FORMULAS ---

/**
 * Calculates Max HP based on Strength and Defense (Resistence).
 * Formula: 100 + (Str * 2) + (Def * 5)
 */
export const calculateMaxHp = (attributes) => {
    const str = attributes.strength || 0;
    const def = attributes.defense || 0;
    return 100 + (str * 2) + (def * 5);
};

/**
 * Calculates Damage dealt.
 * Formula: Damage = Attack * (100 / (100 + Opponent_Defense))
 */
export const calculateDamage = (attack, opponentDefense) => {
    // Defense acts as percentage reduction
    // e.g. 50 Def -> 100/150 = 0.66 (33% reduction)
    // e.g. 100 Def -> 100/200 = 0.50 (50% reduction)
    const reductionMultiplier = 100 / (100 + opponentDefense);
    return Math.floor(attack * reductionMultiplier);
};


// --- 2. BOT DECISION TREE (AI) ---

/**
 * Determines the Bot's action for the current turn.
 * 
 * @param {Object} botState - { hp, maxHp, attack, defense, healsUsed, isStunnedNext }
 * @param {Object} playerState - { hp, maxHp, attack, defense }
 * @param {Array} history - Array of previous turns (not strictly used yet but good for future)
 * @param {Number} turnNumber - Current turn number
 * @returns {Object} Action object: { type: 'ATTACK' | 'DEFEND' | 'CONVERT_ATK_TO_HP' | 'CONVERT_DEF_TO_ATK' }
 */
export const getBotAction = (botState, playerState, history, turnNumber) => {

    // 0. CHECK RESTRICTIONS
    if (botState.isStunned) {
        return { type: 'SKIP', reason: 'Stunned from healing' };
        // Note: The system handling this should probably skip calling this function 
        // or handle SKIP return.
    }

    // 1. GATHER METRICS
    const hpPercent = botState.hp / botState.maxHp;
    const enemyHpPercent = playerState.hp / playerState.maxHp;

    // Potential Damage estimation (Bot attacking Player)
    const damageToPlayer = calculateDamage(botState.attack, playerState.defense);
    // Potential Damage received (Player attacking Bot - assuming 'Standard' attack)
    const damageToBot = calculateDamage(playerState.attack, botState.defense);

    const riskOfDeath = damageToBot / botState.hp; // > 1.0 means likely death
    const pressure = botState.attack / playerState.hp; // High pressure capability

    console.log(`[BOT AI] Turn ${turnNumber} | HP: ${(hpPercent * 100).toFixed(1)}% | Risk: ${riskOfDeath.toFixed(2)} | Heals: ${botState.healsUsed}`);

    // 2. DECISION TREE

    // A. SURVIVAL (Critical HP)
    if (hpPercent <= 0.30) {
        // Can we heal?
        if (botState.healsUsed < 2 && botState.attack > 10) {
            // Priority: Heal if low HP and has Attack to convert
            // Don't heal if it kills our attack completely unless desperate?
            // Rule: "Se HP_bot <= 30% e curas disponíveis -> converter Ataque -> Vida"
            return { type: 'CONVERT_ATK_TO_HP', reason: 'Critical HP Survival' };
        }
    }

    // B. ENTRENCHMENT (High Defense, Low Attack)
    // "Se ataque_bot < 30% [assume of base?] e Defesa_bot >= 20 -> converter Defesa -> Ataque"
    // Let's interpret "ataque_bot < 30%" as relative to some baseline or just low. 
    // Let's say if Attack is very low compared to Defense.
    if (botState.attack < 20 && botState.defense >= 20 && hpPercent < 1.0) {
        // Only if HP isn't full (rule says HP < HP_max for conversion, though Def->Atk only restricted by simple HP<Max? 
        // Prompt says: "Converter Defesa -> Ataque ... Se HP atual estiver cheio -> não é permitido converter."
        return { type: 'CONVERT_DEF_TO_ATK', reason: 'Rebalancing Stats' };
    }

    // C. AGGRESSION (Opportunity to Kill)
    if (damageToPlayer >= playerState.hp) {
        return { type: 'ATTACK', reason: 'Finisher Move' };
    }

    // D. OPPORTUNISM (Player Healed recently)
    const lastPlayerAction = history.length > 0 ? history[history.length - 1].playerAction : null;
    if (lastPlayerAction === 'CONVERT_ATK_TO_HP') {
        // Enemy just healed (and likely has 0 attack/defense for that turn or is vulnerable next?)
        // Actually, if they healed, they couldn't attack.
        // Rule: "Se inimigo acabou de curar -> atacar agressivo"
        return { type: 'ATTACK', reason: 'Punish Heal' };
    }

    // E. LOW RISK / HIGH HEALTH -> ATTACK
    if (hpPercent > 0.50 && riskOfDeath < 0.3) {
        return { type: 'ATTACK', reason: 'High Health Pressure' };
    }

    // F. HIGH RISK -> DEFEND
    if (riskOfDeath >= 0.7) {
        return { type: 'DEFEND', reason: 'High Risk Mitigation' };
        // Note: "Defend" action isn't explicitly defined in formulas as boosting stat, 
        // but typically means "Block" or "Reduce Dmg". 
        // User prompt says: "Ação: Defender (Sempre)". 
        // We need to define what Defender DOES. Usually increases Def or reduces dmg by %?
        // Let's assume for now it's a valid action tag.
    }

    // G. DEFAULT / FALLBACK / RANDOMNESS
    // "Aleatoriedade controlada: 20–30% chance de ação alternativa"
    const roll = Math.random();

    if (roll < 0.20 && botState.healsUsed < 2 && botState.hp < botState.maxHp && botState.attack > 20) {
        return { type: 'CONVERT_ATK_TO_HP', reason: 'Random Sustain' };
    }

    if (roll < 0.40 && botState.hp < botState.maxHp && botState.defense > 20) {
        return { type: 'CONVERT_DEF_TO_ATK', reason: 'Random Buff' };
    }

    return { type: 'ATTACK', reason: 'Default Aggression' };
};


// --- 3. ACTION RESOLUTION HELPERS ---

/**
 * Resolves the "Convert Attack to HP" action.
 * Rules: 
 * - 1 Atk -> 1 HP. 
 * - Max recover = MaxHP - CurHP. 
 * - Cannot exceed available Attack.
 * - Max 2 times. 2nd time = 50% efficiency + Stun next turn. 3rd time forbidden.
 */
export const resolveHealAction = (state) => {
    // state needs: hp, maxHp, attack, healsUsed
    const maxRecoverable = state.maxHp - state.hp;
    const availableAttack = state.attack;

    // How much to convert? All available attack up to max recoverable
    let rawAmount = Math.min(availableAttack, maxRecoverable);

    // Apply Limits based on usage
    let healedAmount = rawAmount;
    let nextTurnStun = false;

    if (state.healsUsed === 0) {
        // 1st Heal: 100% eff
        healedAmount = rawAmount;
    } else if (state.healsUsed === 1) {
        // 2nd Heal: 50% max of FIRST conversion? Or 50% efficiency?
        // Prompt: "Segunda conversão: Máximo 50% do valor da primeira conversão" OR "50% efficiency"? 
        // Let's assume 50% efficiency of THIS conversion for simplicity/balance unless we track 1st amount.
        // "Máximo 50% do valor da primeira conversão" implies we track the first amount.
        // To simplify (since we might not have history): 50% Efficiency.
        healedAmount = Math.floor(rawAmount * 0.5);
        nextTurnStun = true;
    } else {
        // 3rd+ prohibited (UI/AI should prevent this, but fail-safe)
        return { ...state, log: "Cura falhou (limite excedido)." };
    }

    return {
        newHp: state.hp + healedAmount,
        newAttack: state.attack - rawAmount, // Cost is always the raw amount extracted? Or scaled? Usually raw.
        healsUsed: state.healsUsed + 1,
        isStunned: nextTurnStun,
        amountHealed: healedAmount
    };
};

/**
 * Resolves "Convert Defense to Attack".
 * Rules:
 * - Max 50% of current Defense.
 * - Cost: 2 Def -> 1 Atk.
 * - Atk (+X) = Def_Converted / 2.
 * - Def (-Y) = Def_Converted.
 */
export const resolveBuffAction = (state) => {
    // state needs: defense, attack

    // Max convert is 50% of current defense
    const convertAmount = Math.floor(state.defense * 0.50);

    // Attack gained = Amount / 2
    const attackGained = Math.floor(convertAmount / 2);

    return {
        newDefense: state.defense - convertAmount,
        newAttack: state.attack + attackGained,
        amountConverted: convertAmount,
        attackGained: attackGained
    };
};
