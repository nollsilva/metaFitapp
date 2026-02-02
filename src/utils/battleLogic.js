
// Helper Functions
export const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

export const calculateTurnLogic = (playerBid, enemyBid, pProfile, eProfile) => {
    // Inputs are now the BID amounts (absolute values), not percentages.

    let log = [];
    let pDamage = 0;
    let eDamage = 0;

    // --- Phase 1: Initiative Check (Speed Bid) ---
    // User Requirement: "se eu tenho 120... selecionar 40... e o oponente 50. ele ataca e eu defendo."
    const pSpeed = playerBid.speed;
    const eSpeed = enemyBid.speed;

    let winner = 'draw'; // player, enemy, draw

    if (pSpeed > eSpeed) winner = 'player';
    else if (eSpeed > pSpeed) winner = 'enemy';
    else winner = 'draw';

    // --- Phase 2: Combat Resolution ---
    const resolveAttack = (attackerName, atkStr, defDef, isPlayerAttacker) => {
        // Simple subtraction logic: Damage = Strength - Defense
        const rawDmg = atkStr - defDef;
        const finalDmg = Math.max(0, rawDmg); // No negative damage

        const icon = isPlayerAttacker ? "⚔️" : "🛡️";
        // log.push(`${icon} ${attackerName} Ataca: ${atkStr} Força vs ${defDef} Defesa => ${finalDmg} Dano`);
        return finalDmg;
    };

    if (winner === 'player') {
        log.push(`⚡ Você foi mais rápido! (+${pSpeed} vs +${eSpeed})`);
        log.push(`⚔️ Você ATACA e o oponente DEFENDE.`);

        // Player Attacks (Str), Enemy Defends (Def)
        // Enemy's Strength is wasted? Or unused? "Ele ataca e eu defendo" implies active roles.
        // We use P_Str vs E_Def. 
        eDamage = resolveAttack("Você", playerBid.strength, enemyBid.defense, true);

        if (eDamage === 0) log.push("🛡️ Oponente bloqueou todo o dano!");
        else log.push(`💥 Você casou ${eDamage} de dano!`);

    } else if (winner === 'enemy') {
        log.push(`⚡ Oponente foi mais rápido! (+${pSpeed} vs +${eSpeed})`);
        log.push(`🛡️ Oponente ATACA e você DEFENDE.`);

        // Enemy Attacks (Str), Player Defends (Def)
        pDamage = resolveAttack("Oponente", enemyBid.strength, playerBid.defense, false);

        if (pDamage === 0) log.push("🛡️ Você bloqueou todo o dano!");
        else log.push(`💥 Oponente causou ${pDamage} de dano!`);

    } else {
        // Draw Scenario: Simultaneous Clash? Or No one attacks?
        // Let's make it a Simultaneous Clash for excitement.
        log.push(`⚡ Empate na velocidade! (+${pSpeed})`);
        log.push(`⚔️ CHOQUE! Ambos atacam simultaneamente.`);

        eDamage = resolveAttack("Você", playerBid.strength, enemyBid.defense, true);
        pDamage = resolveAttack("Oponente", enemyBid.strength, playerBid.defense, false);
    }

    // --- Summary for UI ---
    return {
        log,
        pDamage,
        eDamage,
        turnSummary: {
            winner: winner === 'draw' ? 'draw' : winner,
            playerDamageDealt: eDamage,
            playerDamageTaken: pDamage,
            initiativeMsg: winner === 'player' ? "Iniciativa: VOCÊ" : winner === 'enemy' ? "Iniciativa: OPONENTE" : "Iniciativa: EMPATE"
        }
    };
};
