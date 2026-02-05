import React, { useState, useEffect } from 'react';
import { calculateMaxHp } from '../../utils/rpgLogic';

// Simple Turn-Based Battle Logic
const RingBattle = ({ profile, onBattleFinish }) => {
    const [turn, setTurn] = useState(1);
    const [playerLog, setPlayerLog] = useState(["Início do Combate!"]);

    // Player Stats
    const pAttr = profile?.rpg?.attributes || { str: 1, spd: 1, res: 1 };
    const pMaxHp = calculateMaxHp(pAttr.str, pAttr.res);
    const [pHp, setPHp] = useState(pMaxHp);

    // Enemy Stats (Scaled to Player)
    const eAttr = {
        str: Math.max(1, pAttr.str + Math.floor(Math.random() * 3) - 1),
        spd: Math.max(1, pAttr.spd + Math.floor(Math.random() * 3) - 1),
        res: Math.max(1, pAttr.res + Math.floor(Math.random() * 3) - 1)
    };
    const eMaxHp = calculateMaxHp(eAttr.str, eAttr.res);
    const [eHp, setEHp] = useState(eMaxHp);

    const [isPlayerTurn, setIsPlayerTurn] = useState(pAttr.spd >= eAttr.spd); // Speed check initialization
    const [gameStatus, setGameStatus] = useState('playing'); // playing, win, lose

    const log = (msg) => setPlayerLog(prev => [msg, ...prev].slice(0, 5));

    const executeTurn = (action) => {
        if (gameStatus !== 'playing') return;

        // Player Action
        let pDmg = 0;
        let pDef = false;

        if (action === 'attack') {
            // Dmg Formula: Str - (Res * 0.7)
            const rawDmg = pAttr.str + 5; // Base dmg
            const mitigation = eAttr.res * 0.7;
            pDmg = Math.max(1, Math.floor(rawDmg - mitigation));

            // Crit chance based on Speed difference?
            if (Math.random() < (pAttr.spd * 0.05)) {
                pDmg = Math.floor(pDmg * 1.5);
                log(`⚡ CRÍTICO! Você causou ${pDmg} de dano!`);
            } else {
                log(`👊 Você atacou e causou ${pDmg} de dano.`);
            }

            setEHp(prev => Math.max(0, prev - pDmg));
        } else if (action === 'defend') {
            pDef = true;
            log(`🛡️ Você assumiu postura defensiva.`);
        }

        // Check Enemy Death
        if (eHp - pDmg <= 0) {
            setGameStatus('win');
            log("🏆 VOCÊ VENCEU O DUELO!");
            return;
        }

        // Enemy Action (AI)
        setTimeout(() => {
            const enemyAction = Math.random() > 0.3 ? 'attack' : 'defend';

            if (enemyAction === 'attack') {
                const rawDmg = eAttr.str + 5;
                const mitigation = pAttr.res * 0.7;
                let eDmg = Math.max(1, Math.floor(rawDmg - mitigation));

                if (pDef) {
                    eDmg = Math.floor(eDmg * 0.5); // 50% reduction
                    log(`🛡️ Você bloqueou o ataque! Dano reduzido para ${eDmg}.`);
                } else {
                    log(`💢 Inimigo atacou e causou ${eDmg} de dano!`);
                }

                setPHp(prev => {
                    const newHp = Math.max(0, prev - eDmg);
                    if (newHp <= 0) setGameStatus('lose');
                    return newHp;
                });
            } else {
                log(`🛑 Inimigo está se defendendo.`);
            }

            setTurn(prev => prev + 1);
        }, 1000);
    };

    if (gameStatus !== 'playing') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
                <h1 style={{ fontSize: '3rem', color: gameStatus === 'win' ? '#00ff66' : '#ff0055' }}>
                    {gameStatus === 'win' ? 'VITÓRIA' : 'DERROTA'}
                </h1>
                <p>Combate finalizado!</p>
                <button className="btn-primary" onClick={() => onBattleFinish(gameStatus)} style={{ marginTop: '20px' }}>
                    Voltar para Academia
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* HUD Top */}
            <div style={{ padding: '10px', background: '#222', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333' }}>
                <div>
                    <div style={{ fontWeight: 'bold', color: '#ff0055' }}>VOCÊ (Nvl {profile.level})</div>
                    <div style={{ background: '#333', width: '100px', height: '10px', marginTop: '5px' }}>
                        <div style={{ width: `${(pHp / pMaxHp) * 100}%`, background: '#00ff66', height: '100%' }}></div>
                    </div>
                    <small>{pHp}/{pMaxHp}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#aaa' }}>RIVAL</div>
                    <div style={{ background: '#333', width: '100px', height: '10px', marginTop: '5px', marginLeft: 'auto' }}>
                        <div style={{ width: `${(eHp / eMaxHp) * 100}%`, background: '#ff4444', height: '100%' }}></div>
                    </div>
                    <small>{eHp}/{eMaxHp}</small>
                </div>
            </div>

            {/* Arena Visuals (Placeholder) */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '5rem', marginRight: '50px' }}>🥊</div>
                <div style={{ fontSize: '5rem', transform: 'scaleX(-1)' }}>🤺</div>
                <div style={{
                    position: 'absolute', bottom: '20px',
                    background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px',
                    width: '90%', textAlign: 'center', minHeight: '80px'
                }}>
                    {playerLog.map((l, i) => (
                        <div key={i} style={{ opacity: 1 - (i * 0.2), fontSize: i === 0 ? '1rem' : '0.8rem' }}>{l}</div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div style={{ padding: '20px', background: '#1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <button className="btn-primary"
                    style={{ background: '#ff4444', padding: '15px', fontSize: '1.2rem' }}
                    onClick={() => executeTurn('attack')}
                >
                    ⚔️ ATACAR
                </button>
                <button className="btn-secondary"
                    style={{ background: '#4444ff', padding: '15px', fontSize: '1.2rem' }}
                    onClick={() => executeTurn('defend')}
                >
                    🛡️ DEFENDER
                </button>
            </div>
        </div>
    );
};

export default RingBattle;
