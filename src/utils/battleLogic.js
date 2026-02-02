// Helper Functions
export const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

export const calculateTurnLogic = (playerBid, enemyBid, pProfile, eProfile) => {
    let log = [];
    let pDamage = 0;
    let eDamage = 0;

    const pSpeed = playerBid.speed;
    const eSpeed = enemyBid.speed;

    let winner = 'draw';
    if (pSpeed > eSpeed) winner = 'player';
    else if (eSpeed > pSpeed) winner = 'enemy';

    // Helper: Logic for standard output (Ataque vs Defesa)
    // Returns { dmgDealt: number, counterTaken: number }
    const resolveClash = (attackerName, defenderName, atkVal, defVal, isPlayerAttacker) => {
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

    if (winner === 'player') {
        log.push(`⚡ Você venceu a iniciativa! (+${pSpeed} vol)`);

        // Player Attacks
        const res = resolveClash("Você", "Oponente", playerBid.strength, enemyBid.defense, true);
        eDamage += res.dmgDealt;
        pDamage += res.counterTaken;

    } else if (winner === 'enemy') {
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

        const resE = resolveClash("Oponente", "Você", enemyBid.strength, enemyBid.defense, false); // Fixed: should be playerBid.defense for player's defense
        pDamage += resE.dmgDealt;
        eDamage += resE.counterTaken;
    }

    return {
        log,
        pDamage,
        eDamage,
        turnSummary: {
            winner: winner,
            playerDamageDealt: eDamage,
            playerDamageTaken: pDamage,
            initiativeMsg: winner === 'player' ? "Iniciativa: VOCÊ" : winner === 'enemy' ? "Iniciativa: OPONENTE" : "Iniciativa: EMPATE"
        }
    };
};
