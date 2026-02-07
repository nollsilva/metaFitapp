import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { updateUser } from '../utils/db'; // Import DB update
import { ChallengeService } from '../services/ChallengeService';
import { playSfx } from '../utils/audio';
import BattleCard from './BattleCard';
// import StatisticSelector from './StatisticSelector'; // Removed
import DuelTutorialOverlay from './DuelTutorialOverlay';
import { calculateMaxHp, calculateDamage, getBotAction, resolveHealAction, resolveBuffAction } from '../utils/battleLogic';

const BattleArena = ({ myProfile, enemyProfile, onExit, onUpdateProfile, battleId, role }) => {
    console.log(`[BattleArena] Init. ID: ${battleId}, Role: ${role}`);

    // --- STATE ---
    const [turn, setTurn] = useState(1);
    const [phase, setPhase] = useState('setup'); // setup, acting, resolving, result
    const [battleLog, setBattleLog] = useState(["🔥 Batalha Iniciada! Escolha sua ação."]);

    // --- PLAYER STATE ---
    // We need to track dynamic stats during battle (Attack/Def can change via conversion)
    const [playerState, setPlayerState] = useState(() => {
        const max = calculateMaxHp(myProfile.attributes);
        return {
            hp: max,
            maxHp: max,
            attack: (myProfile.attributes?.strength || 0) * 2, // Arbitrary base scaling for 'Attack Stat' from raw Strength? 
            // Or just use raw attributes? User formulas imply raw usage: "Vida = 100 + Str*2...". 
            // "Dano = Ataque * ...". If 'Ataque' is just Strength, we use that. 
            // Let's assume: Attack = Strength, Defense = Defense (Resistence/Defense).
            // Actually, "Ataque_atual" changes. So we initialize it with base Strength.
            baseAttack: (myProfile.attributes?.strength || 10),
            baseDefense: (myProfile.attributes?.defense || 10),

            // Dynamic Battle Stats
            attack: (myProfile.attributes?.strength || 10),
            defense: (myProfile.attributes?.defense || 10),

            conversionsUsed: 0,
            isStunned: false,
            lastAction: null
        };
    });

    // --- ENEMY STATE ---
    const [enemyState, setEnemyState] = useState(() => {
        const isBot = enemyProfile.id === 'BOT_METAFIT';
        // Bot buff: +20% stats? Or just fixed?
        // Let's use the profile attributes directly but track them dynamically
        const baseStr = (enemyProfile.attributes?.strength || 10) + (isBot ? 5 : 0);
        const baseDef = (enemyProfile.attributes?.defense || 10) + (isBot ? 5 : 0);
        const max = calculateMaxHp({ strength: baseStr, defense: baseDef });

        return {
            hp: max,
            maxHp: max,
            baseAttack: baseStr,
            baseDefense: baseDef,

            attack: baseStr,
            defense: baseDef,

            conversionsUsed: 0,
            isStunned: false,
            lastAction: null
        };
    });

    // --- ACTIONS ---
    const handleAction = async (actionType) => {
        if (phase !== 'setup') return;

        // 1. Player Choice Process
        let pState = { ...playerState };
        let pActionLog = "";

        if (actionType === 'ATTACK') {
            pActionLog = "Você preparou um ataque!";
        } else if (actionType === 'DEFEND') {
            pActionLog = "Você assumiu postura defensiva (+50% Defesa temporária).";
            // Defensive Stance Logic: Maybe boost defense for calculation?
            // Let's implement Defense Stance as a temp buff for turn resolution
            pState.isDefending = true;
        } else if (actionType === 'CONVERT_ATK_TO_HP') {
            const res = resolveHealAction(pState);
            pState = { ...pState, ...res }; // updates hp, attack, conversionsUsed, isStunned
            pActionLog = `Você converteu Ataque em Vida! (+${res.amountHealed} HP)`;
            // Cannot attack this turn
        } else if (actionType === 'CONVERT_DEF_TO_ATK') {
            const res = resolveBuffAction(pState);
            pState = { ...pState, ...res }; // updates def, atk, conversionsUsed
            pActionLog = `Você converteu Defesa em Ataque! (+${res.attackGained} Atk)`;
            // Cannot double convert, but can attack? 
            // Rules: "Converter Def -> Atk ... não pode converter atk -> vida". 
            // "Ação: Escolher APENAS UMA". 
            // So if I convert, I do NOT attack this turn?
            // "O jogador pode escolher apenas uma ação por turno: Converter Defesa → Ataque".
            // This implies the turn ENDS after conversion? 
            // If so, no damage dealt? That makes Convert Def->Atk very risky (open to free hit).
            // But valid strategy for preparing next turn finish.
        }

        // Apply Player State Update (Immediate visual feedback)
        setPlayerState(pState);
        setBattleLog(prev => [...prev, `Turno ${turn}: ${pActionLog}`]);

        // 2. Bot Response (Simulated Network Delay)
        setPhase('acting'); // Lock inputs

        setTimeout(() => {
            resolveTurn(actionType, pState);
        }, 1500);
    };

    const resolveTurn = (playerActionType, currentPlayerState) => {
        let pState = { ...currentPlayerState };
        let eState = { ...enemyState };
        let log = [];

        // --- BOT DECISION ---
        // If Bot stunned, skip
        let botAction = { type: 'SKIP' };
        if (eState.isStunned) {
            log.push("🤖 Oponente está atordoado e perdeu a vez!");
            eState.isStunned = false; // Clear stun for NEXT turn
        } else {
            botAction = getBotAction(eState, pState, [], turn); // History empty for now
        }

        // Apply Bot Conversion Actions NOW (before damage calc)
        if (botAction.type === 'CONVERT_ATK_TO_HP') {
            const res = resolveHealAction(eState);
            eState = { ...eState, ...res };
            log.push(`🤖 Oponente converteu Ataque em Vida (+${res.amountHealed} HP)!`);
        } else if (botAction.type === 'CONVERT_DEF_TO_ATK') {
            const res = resolveBuffAction(eState);
            eState = { ...eState, ...res };
            log.push(`🤖 Oponente converteu Defesa em Ataque (+${res.attackGained} Atk)!`);
        } else if (botAction.type === 'DEFEND') {
            eState.isDefending = true;
            log.push("🤖 Oponente assumiu postura defensiva.");
        }

        // --- DAMAGE CALCULATION ---

        // 1. Player trying to deal damage?
        if (playerActionType === 'ATTACK') {
            // Calculate Dmg
            let effectiveDef = eState.defense;
            if (eState.isDefending) effectiveDef = Math.floor(effectiveDef * 1.5); // Bonus for defending

            const dmg = calculateDamage(pState.attack, effectiveDef);
            eState.hp = Math.max(0, eState.hp - dmg);
            log.push(`⚔️ Você atacou! ${dmg} de dano.`);
        }

        // 2. Bot trying to deal damage?
        if (botAction.type === 'ATTACK') {
            let effectiveDef = pState.defense;
            if (pState.isDefending) effectiveDef = Math.floor(effectiveDef * 1.5);

            const dmg = calculateDamage(eState.attack, effectiveDef);
            pState.hp = Math.max(0, pState.hp - dmg);
            log.push(`🛡️ Oponente atacou! ${dmg} de dano em você.`);
        }

        // Reset Turn/Temp flags
        pState.isDefending = false;
        eState.isDefending = false;

        // Update States
        setPlayerState(pState);
        setEnemyState(eState);
        setBattleLog(prev => [...prev, ...log]);

        // Check End Game
        if (pState.hp <= 0 || eState.hp <= 0) {
            setPhase('result');
        } else {
            setTurn(t => t + 1);

            // Handle Stun for next turn (Player)
            // If player healed 2nd time this turn (isStunned true), next turn they skip?
            // "Próximo turno bloqueado (não pode jogar)"
            // Logic handled at START of next turn interaction 
            setPhase('setup');
        }
    };

    // Auto-Skip Player Turn if Stunned
    useEffect(() => {
        if (phase === 'setup' && playerState.isStunned) {
            setBattleLog(prev => [...prev, "⚠️ Você está atordoado pelo esforço excessivo! Turno pulado."]);
            setPlayerState(prev => ({ ...prev, isStunned: false })); // Clear stun

            // Force Skip Action
            setPhase('acting');
            setTimeout(() => {
                resolveTurn('SKIP', { ...playerState, isStunned: false });
            }, 1000);
        }
    }, [turn, phase, playerState]); // Check on turn start

    // --- RENDER HELPERS ---
    const getHpColor = (current, max) => {
        const pct = current / max;
        if (pct > 0.6) return '#00ff66';
        if (pct > 0.3) return '#ffd700';
        return '#ff0055';
    };

    return (
        <div className="battle-arena" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0a0a15 0%, #1a1a2e 100%)',
            zIndex: 5000,
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
            {/* HUD Header */}
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
                <h2 style={{ color: '#fff', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Turno <span style={{ color: '#00f0ff', fontSize: '1.5rem' }}>{turn}</span>
                </h2>
                <button onClick={onExit} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
                    Sair
                </button>
            </div>

            {/* Battle Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', overflowY: 'auto' }}>

                {/* Enemy Card */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <div className="card" style={{ width: '80%', border: '1px solid #ff4444' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <strong style={{ color: '#ff4444' }}>OPONENTE (Bot)</strong>
                            <span style={{ color: getHpColor(enemyState.hp, enemyState.maxHp) }}>{enemyState.hp}/{enemyState.maxHp} HP</span>
                        </div>
                        {/* HP Bar */}
                        <div style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{ width: `${(enemyState.hp / enemyState.maxHp) * 100}%`, height: '100%', background: getHpColor(enemyState.hp, enemyState.maxHp), transition: 'width 0.5s' }}></div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', color: '#ccc' }}>
                            <span>⚔️ {enemyState.attack}</span>
                            <span>🛡️ {enemyState.defense}</span>
                            {enemyState.conversionsUsed > 0 && <span style={{ color: '#00f0ff' }}>💊 {enemyState.conversionsUsed}/2</span>}
                        </div>
                    </div>
                </div>

                {/* Log Area */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '20px', fontSize: '0.9rem', color: '#ddd' }}>
                    {battleLog.map((log, i) => (
                        <div key={i} style={{ marginBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                            {log}
                        </div>
                    ))}
                    {/* Dummy div to scroll to bottom could go here */}
                </div>

                {/* Player Card */}
                <div style={{ marginBottom: '20px' }}>
                    <div className="card" style={{ width: '85%', border: '1px solid #00f0ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <strong style={{ color: '#00f0ff' }}>VOCÊ</strong>
                            <span style={{ color: getHpColor(playerState.hp, playerState.maxHp) }}>{playerState.hp}/{playerState.maxHp} HP</span>
                        </div>
                        {/* HP Bar */}
                        <div style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{ width: `${(playerState.hp / playerState.maxHp) * 100}%`, height: '100%', background: getHpColor(playerState.hp, playerState.maxHp), transition: 'width 0.5s' }}></div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', color: '#ccc' }}>
                            <span>⚔️ {playerState.attack}</span>
                            <span>🛡️ {playerState.defense}</span>
                            {playerState.conversionsUsed > 0 && <span style={{ color: '#00f0ff' }}>💊 {playerState.conversionsUsed}/2</span>}
                        </div>
                    </div>
                </div>

            </div>

            {/* Action Bar */}
            {phase === 'setup' && (
                <div style={{ background: '#111', padding: '15px', borderTop: '1px solid #333', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={() => handleAction('ATTACK')} className="btn-primary" style={{ background: '#ff4444' }}>
                        ⚔️ ATACAR
                    </button>
                    <button onClick={() => handleAction('DEFEND')} className="btn-primary" style={{ background: '#444' }}>
                        🛡️ DEFENDER
                    </button>
                    <button
                        onClick={() => handleAction('CONVERT_ATK_TO_HP')}
                        disabled={playerState.hp >= playerState.maxHp || playerState.conversionsUsed >= 2 || playerState.attack <= 0}
                        className="btn-primary"
                        style={{ background: 'linear-gradient(90deg, #00f0ff, #0099ff)', fontSize: '0.8rem', opacity: (playerState.hp >= playerState.maxHp || playerState.conversionsUsed >= 2) ? 0.5 : 1 }}
                    >
                        ❤️ CURAR (Atk→HP)
                    </button>
                    <button
                        onClick={() => handleAction('CONVERT_DEF_TO_ATK')}
                        disabled={playerState.hp >= playerState.maxHp || playerState.conversionsUsed >= 2 || playerState.defense <= 1}
                        className="btn-primary"
                        style={{ background: 'linear-gradient(90deg, #ffaa00, #ff5500)', fontSize: '0.8rem', opacity: (playerState.hp >= playerState.maxHp || playerState.conversionsUsed >= 2) ? 0.5 : 1 }}
                    >
                        🔥 BUFF (Def→Atk)
                    </button>
                </div>
            )}

            {phase === 'result' && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 6000 }}>
                    <h1 style={{ fontSize: '3rem', color: playerState.hp > 0 ? '#00f0ff' : '#ff4444', marginBottom: '20px' }}>
                        {playerState.hp > 0 ? 'VITÓRIA' : 'DERROTA'}
                    </h1>
                    <button onClick={onExit} className="btn-primary" style={{ width: '200px' }}>
                        Sair da Arena
                    </button>
                </div>
            )}
        </div>
    );
};

export default BattleArena;
