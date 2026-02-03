// Helper Functions
export const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

export const calculateTurnLogic = (playerBid, enemyBid, pProfile, eProfile) => {
    let log = [];
    let pDamage = 0;
    let eDamage = 0;

    const pSpeed = playerBid.speed;
    const eSpeed = enemyBid.speed;

    let initiative = 'draw';
    if (pSpeed > eSpeed) initiative = 'player';
    else if (eSpeed > pSpeed) initiative = 'enemy';

    // Helper: Logic for standard output (Ataque vs Defesa)
    // Returns { dmgDealt: number, counterTaken: number }
    const resolveClash = (attackerName, defenderName, atkVal, defVal, isPlayerAttacker) => {
        // Revision: If attacker uses only shield (atkVal === 0), no damage or counter
        if (atkVal === 0) {
            log.push(`🛡️ ${attackerName} focou totalmente na Defesa! Nenhum dano sofrido ou causado.`);
            return { dmgDealt: 0, counterTaken: 0 };
        }

        const diff = atkVal - defVal;

        if (diff > 0) {
            // Penetration
            const dmg = diff;
            log.push(`💥 ${attackerName}: Ataque (${atkVal}) rompeu a Defesa (${defVal})!`);
            log.push(`   -> ${defenderName} sofreu ${dmg} de dano.`);
            return { dmgDealt: dmg, counterTaken: 0 };
        } else if (diff < 0) {
            // Counter Attack
            const counter = Math.abs(diff);
            log.push(`🛡️ ${defenderName}: Defesa (${defVal}) bloqueou Ataque (${atkVal})!`);
            log.push(`   -> Contra-ataque! ${attackerName} sofreu ${counter} de dano.`);
            return { dmgDealt: 0, counterTaken: counter };
        } else {
            // Exact Block
            log.push(`⚔️ Bloqueio Exato! (${atkVal} vs ${defVal}) Nenhum dano.`);
            return { dmgDealt: 0, counterTaken: 0 };
        }
    };

    if (initiative === 'player') {
        log.push(`⚡ Você venceu a iniciativa! (+${pSpeed} vol)`);

        // Player Attacks
        const res = resolveClash("Você", "Oponente", playerBid.strength, enemyBid.defense, true);
        eDamage += res.dmgDealt;
        pDamage += res.counterTaken;

    } else if (initiative === 'enemy') {
        log.push(`⚡ Oponente venceu a iniciativa! (+${eSpeed} vol)`);

        // Enemy Attacks
        const res = resolveClash("Oponente", "Você", enemyBid.strength, playerBid.defense, false);
        pDamage += res.dmgDealt; // Enemy deals dmg to Player
        eDamage += res.counterTaken; // Enemy takes counter dmg

    } else {
        log.push(`⚡ Empate na velocidade! (+${pSpeed}) CHOQUE DUPLO!`);

        // Both Attack
        const resP = resolveClash("Você", "Oponente", playerBid.strength, enemyBid.defense, true);
        eDamage += resP.dmgDealt;
        pDamage += resP.counterTaken;

        const resE = resolveClash("Oponente", "Você", enemyBid.strength, playerBid.defense, false);
        pDamage += resE.dmgDealt;
        eDamage += resE.counterTaken;
    }

    // Determine Turn Winner based on Damage (User request: Winner is who caused damage)
    let winner = 'draw';
    if (eDamage > pDamage) winner = 'player';
    else if (pDamage > eDamage) winner = 'enemy';

    return {
        log,
        pDamage,
        eDamage,
        turnSummary: {
            winner: winner,
            playerDamageDealt: eDamage,
            playerDamageTaken: pDamage,
            initiativeMsg: initiative === 'player' ? "Iniciativa: VOCÊ" : initiative === 'enemy' ? "Iniciativa: OPONENTE" : "Iniciativa: EMPATE"
        }
    };
};
