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
console.log(`[BattleArena] Init. ID: ${battleId}, Role: ${role}`);
const [turn, setTurn] = useState(1);
const [phase, setPhase] = useState('setup'); // setup, waiting, animating, combat, result
const [showDuelAnimation, setShowDuelAnimation] = useState(false);
const [showDuelTutorial, setShowDuelTutorial] = useState(false);

// Check Tutorial on Mount
useEffect(() => {
    // Use a more specific key for the "Dismissed" state
    const isDismissed = localStorage.getItem('metafit_duel_tutorial_dismissed');
    if (!isDismissed) {
        setShowDuelTutorial(true);
    }
}, []);

const handleDuelTutorialComplete = (dontShowAgain) => {
    if (dontShowAgain) {
        localStorage.setItem('metafit_duel_tutorial_dismissed', 'true');
    }
    setShowDuelTutorial(false);
};

// Prevent double-processing of turn advancement
const processingTurn = React.useRef(false);

// Network Sync State
const [myTurnConfirmed, setMyTurnConfirmed] = useState(false);
const [opponentTurnConfirmed, setOpponentTurnConfirmed] = useState(false);
const [opponentTactics, setOpponentTactics] = useState(null);

// Turn Sync (Waiting for both to click "Next Turn")
const [myNextTurnReady, setMyNextTurnReady] = useState(false);
const [opponentNextTurnReady, setOpponentNextTurnReady] = useState(false);

// Sync Listener
useEffect(() => {
    if (!battleId) return;

    const unsub = ChallengeService.listenToChallenge(battleId, (battle) => {
        if (!battle) return;
        console.log(`[BattleArena] Listener update:`, battle);

        const opponentRole = role === 'challenger' ? 'opponent' : 'challenger';

        // 1. Current Turn Tactics Sync
        const oppField = `turn${turn}_${opponentRole}`;
        const myField = `turn${turn}_${role}`;

        if (battle[oppField]) {
            setOpponentTactics(battle[oppField]);
            setOpponentTurnConfirmed(true);
        } else {
            setOpponentTactics(null);
            setOpponentTurnConfirmed(false);
        }

        if (battle[myField]) {
            setMyTurnConfirmed(true);
        } else {
            setMyTurnConfirmed(false);
        }

        // 2. Next Turn Readiness Sync
        const oppReadyField = `turn${turn}_ready_${opponentRole}`;
        const myReadyField = `turn${turn}_ready_${role}`;

        // Strict Sync: Force state to match DB
        setOpponentNextTurnReady(!!battle[oppReadyField]);
        setMyNextTurnReady(!!battle[myReadyField]);
    });

    return () => unsub();
}, [battleId, turn, role]);

// Battle Stats State
const [myHp, setMyHp] = useState(getMaxHp(myProfile));
const [enemyHp, setEnemyHp] = useState(() => {
    const base = getMaxHp(enemyProfile);
    // Bot HP = User HP + 20 (Fixed advantage)
    return enemyProfile.id === 'BOT_METAFIT' ? (getMaxHp(myProfile) + 20) : base;
});

// Smart Bot Profile: Stats = User Stats + 1
const [effectiveEnemyProfile, setEffectiveEnemyProfile] = useState(() => {
    if (enemyProfile.id !== 'BOT_METAFIT') return enemyProfile;

    const userStats = myProfile.attributes || { strength: 0, speed: 0, defense: 0 };
    return {
        ...enemyProfile,
        attributes: {
            strength: (userStats.strength || 0) + 1,
            speed: (userStats.speed || 0) + 1,
            defense: (userStats.defense || 0) + 1
        }
    };
});

// Resource Pools (Starts with Base * 10)
// Formula: (10 base + Attribute) * 10
const getInitialPool = (p, isBotProfile = false) => {
    // Both User and Bot use same multiplier now for fairness in pool calculation logic,
    // but Bot has higher base stats so pool will be naturally slightly larger (+10 pts per attr)
    const multiplier = 10;
    return {
        strength: (10 + (p.attributes?.strength || 0)) * multiplier,
        speed: (10 + (p.attributes?.speed || 0)) * multiplier,
        defense: (10 + (p.attributes?.defense || 0)) * multiplier
    };
};

// Store Max Capacity for % calculations
const [pMaxPool] = useState(getInitialPool(myProfile));
// Calculate bot pool based on effective (boosted) profile
const [eMaxPool] = useState(getInitialPool(effectiveEnemyProfile, enemyProfile.id === 'BOT_METAFIT'));

const [myPool, setMyPool] = useState(getInitialPool(myProfile));
const [enemyPool, setEnemyPool] = useState(getInitialPool(effectiveEnemyProfile, enemyProfile.id === 'BOT_METAFIT'));

// Current Turn Bid (What user is betting this turn)
const [turnBid, setTurnBid] = useState({ strength: 0, speed: 0, defense: 0 });
// History for Fatigue Logic
const [myLastBid, setMyLastBid] = useState(null);
const [enemyLastBid, setEnemyLastBid] = useState(null);

const handleBidChange = (attr, newValue) => {
    setTurnBid(prev => ({ ...prev, [attr]: newValue }));
};

const [battleLog, setBattleLog] = useState(["🔥 Batalha Iniciada! Escolha sua estratégia."]);
const [turnSummary, setTurnSummary] = useState(null);

// Transition to Animating
useEffect(() => {
    if (myTurnConfirmed && opponentTurnConfirmed && phase === 'waiting') {
        setPhase('animating');
        setShowDuelAnimation(true);
        playSfx('clash'); // SWORD CLASH SOUND ⚔️
    }
}, [myTurnConfirmed, opponentTurnConfirmed, phase]);

// Handle Animation End & Result Calc
useEffect(() => {
    if (phase === 'animating') {
        const timer = setTimeout(() => {
            // Perform calculation ONLY when animation finishes
            // opponentTactics here is the Enemy's BID
            // FORCE NUMBER CASTING to avoid "98" > "120" string errors
            const pBid = {
                strength: Number(turnBid.strength),
                speed: Number(turnBid.speed),
                defense: Number(turnBid.defense)
            };
            const eBid = {
                strength: Number(opponentTactics?.strength || 0),
                speed: Number(opponentTactics?.speed || 0),
                defense: Number(opponentTactics?.defense || 0)
            };

            const result = calculateTurnLogic(
                pBid,
                eBid,
                {
                    profile: myProfile,
                    hp: myHp,
                    maxHp: getMaxHp(myProfile),
                    history: myLastBid,
                    maxPool: pMaxPool // Pass Max Pool for % Logic
                },
                {
                    profile: enemyProfile,
                    hp: enemyHp,
                    // Bot Max HP for calc is same as start
                    maxHp: effectiveEnemyProfile.id === 'BOT_METAFIT' ? (getMaxHp(myProfile) + 20) : getMaxHp(enemyProfile),
                    history: enemyLastBid,
                    maxPool: eMaxPool // Pass Max Pool for % Logic
                }
            );

            setBattleLog(result.log);
            setTurnSummary(result.turnSummary);
            setMyHp(prev => Math.max(0, prev - result.pDamage));
            setEnemyHp(prev => Math.max(0, prev - result.eDamage));

            if (opponentTactics) {
                setEnemyPool(prev => ({
                    strength: Math.max(0, prev.strength - opponentTactics.strength),
                    speed: Math.max(0, prev.speed - opponentTactics.speed),
                    defense: Math.max(0, prev.defense - opponentTactics.defense),
                }));
            }

            // Update History for next turn fatigue
            setMyLastBid(pBid);
            setEnemyLastBid(eBid);

            setShowDuelAnimation(false);
            setPhase('combat');
        }, 3000);

        return () => clearTimeout(timer);
    }
}, [phase]); // Only depend on phase

// Handle Turn Advancement Sync (PvP Only)
useEffect(() => {
    if (battleId && myNextTurnReady && opponentTurnConfirmed) {
        if (processingTurn.current) return;

        console.log(`[BattleArena] Both ready. Advancing from Turn ${turn}`);
        processingTurn.current = true;
        advanceTurnInternal(turn);

        // Allow processing again after a short delay to ensure state settles
        setTimeout(() => { processingTurn.current = false; }, 1000);
    }
}, [myNextTurnReady, opponentNextTurnReady, battleId, turn]);

const handleConfirmTurn = async () => {
    // Deduct Player Pool immediately upon confirmation logic
    // But for UI "Commit", we keep it in state until animation?
    // Let's deduct from the DISPLAY pool when confirming to show "Spent".

    // Validation: Can't spend more than you have
    // (Input prevents this, but double check)

    setMyPool(prev => ({
        strength: prev.strength - turnBid.strength,
        speed: prev.speed - turnBid.speed,
        defense: prev.defense - turnBid.defense
    }));

    if (battleId) {
        setPhase('waiting');
        await ChallengeService.submitTurn(battleId, role, turn, turnBid);
    } else {
        setPhase('combat');

        // Smarter AI Strategy
        const aiBid = { strength: 0, speed: 0, defense: 0 };
        const isBot = enemyProfile.id === 'BOT_METAFIT';

        if (isBot) {
            // 100% Intelligent & Aggressive Bot Logic
            // It knows exactly how much it has and how to pressure the user

            const myHpPercent = (myHp / getMaxHp(myProfile)) * 100;

            if (turn === 3) {
                // TURN 3: ALL-IN (FINISHER)
                // Dumps absolutely everything remaining into the bid
                aiBid.strength = enemyPool.strength;
                aiBid.speed = enemyPool.speed;
                aiBid.defense = enemyPool.defense;
            } else if (turn === 1) {
                // TURN 1: AGGRESSIVE OPENER
                // Goal: Win initiative (Speed) and deal heavy damage (Strength)
                // Sacrifice defense early to establish dominance
                aiBid.speed = Math.floor(enemyPool.speed * 0.50); // 50% of speed pool
                aiBid.strength = Math.floor(enemyPool.strength * 0.40); // 40% of strength pool
                aiBid.defense = Math.floor(enemyPool.defense * 0.10); // Minimal defense
            } else {
                // TURN 2: TACTICAL PRESSURE
                if (myHpPercent < 50) {
                    // User is weak? KILL IT.
                    aiBid.speed = Math.floor(enemyPool.speed * 0.60); // High speed to ensure hit
                    aiBid.strength = Math.floor(enemyPool.strength * 0.40); // Moderate strength
                    aiBid.defense = 0; // No fear
                } else {
                    // User is healthy? Balanced but heavy hitting.
                    aiBid.strength = Math.floor(enemyPool.strength * 0.50);
                    aiBid.speed = Math.floor(enemyPool.speed * 0.30);
                    aiBid.defense = Math.floor(enemyPool.defense * 0.20);
                }
            }

            // Safety clamp to ensure we don't bet more than we have (rounding errors)
            aiBid.strength = Math.min(aiBid.strength, enemyPool.strength);
            aiBid.speed = Math.min(aiBid.speed, enemyPool.speed);
            aiBid.defense = Math.min(aiBid.defense, enemyPool.defense);
        } else {
            // Legacy AI for generic opponents
            ['strength', 'speed', 'defense'].forEach(attr => {
                const available = enemyPool[attr];
                if (turn === 3) {
                    aiBid[attr] = available;
                } else {
                    const percent = 0.2 + (Math.random() * 0.3);
                    aiBid[attr] = Math.floor(available * percent);
                }
            });
        }

        // AI commits, update Enemy Tactics state so animation can use it
        setOpponentTactics(aiBid); // Emulate network response
        setOpponentTurnConfirmed(true);
        setMyTurnConfirmed(true); // Self ready

        // Trigger animation effect manually since we set both confirmed
        // (The useEffect will pick this up if we are in 'waiting' phase...
        // but we are in 'setup' -> 'combat' directly in local mode?
        // Let's force 'waiting' state briefly to trigger animation hook
        setPhase('waiting');
    }
};

const advanceTurnInternal = (currentTurn) => {
    console.log(`[BattleArena] Advancing Turn. Current: ${currentTurn}`);

    // 1. Reset Round State
    setTurnSummary(null);
    setMyNextTurnReady(false);
    setOpponentNextTurnReady(false);
    setMyTurnConfirmed(false);
    setOpponentTurnConfirmed(false);
    setOpponentTactics(null);
    setTurnBid({ strength: 0, speed: 0, defense: 0 });

    // 2. Advance Logic - Dynamic End Condition
    // End if: Someone is Dead OR Both are out of points (in all attributes)
    const myTotalPoints = myPool.strength + myPool.speed + myPool.defense;
    const enemyTotalPoints = enemyPool.strength + enemyPool.speed + enemyPool.defense;

    const isGameOver = (myHp <= 0 || enemyHp <= 0) || (myTotalPoints <= 0 && enemyTotalPoints <= 0);

    if (isGameOver) {
        console.log("-> Game Over Condition Met. Going to Result.");
        setPhase('result');
    } else {
        console.log(`-> Going to Turn ${currentTurn + 1}`);
        setTurn(currentTurn + 1);
        setPhase('setup');
    }
};

const handleNextTurn = async () => {
    if (battleId) {
        // PvP: Send ready signal
        setMyNextTurnReady(true);
        await ChallengeService.submitReadyNextTurn(battleId, role, turn);
        // Advancement will happen in useEffect when both are true
    } else {
        // AI: Instant advancement
        advanceTurnInternal(turn);
    }
};

// Watch for Early Death
useEffect(() => {
    if (myHp <= 0 || enemyHp <= 0) {
        if (phase !== 'result') setPhase('result');
    }
}, [myHp, enemyHp]);


// --- REWARD SYSTEM ---
const [distPoints, setDistPoints] = useState(0);
const [allocated, setAllocated] = useState({ strength: 0, speed: 0, defense: 0 });
const [showShare, setShowShare] = useState(false);

useEffect(() => {
    if (phase === 'result') {
        // New Reward Policy: Winner: 2pts, Loser: 1pt
        // EXCEPTION: Losing to BOT yields 0 pts.
        const isWinner = myHp > enemyHp;
        const isBotBattle = enemyProfile.id === 'BOT_METAFIT';

        if (isBotBattle && !isWinner) {
            setDistPoints(0);
        } else {
            setDistPoints(isWinner ? 2 : 1);
        }
    }
}, [phase, myHp, enemyHp, enemyProfile.id]);

const handleDistribute = (attr) => {
    if (distPoints > 0) {
        setDistPoints(p => p - 1);
        setAllocated(prev => ({ ...prev, [attr]: prev[attr] + 1 }));
    }
};

const handleClaimRewards = async () => {
    if (distPoints > 0 && !window.confirm("Ainda há pontos não distribuídos. Deseja continuar?")) return;

    // Calc New Attributes (Summing allocated points to existing ones)
    const currentAttrs = myProfile.attributes || { strength: 0, speed: 0, defense: 0, points: 0 };
    const newAttrs = {
        strength: (currentAttrs.strength || 0) + allocated.strength,
        speed: (currentAttrs.speed || 0) + allocated.speed,
        defense: (currentAttrs.defense || 0) + allocated.defense,
        // If they didn't spend all distPoints, save them to the points bank
        points: (currentAttrs.points || 0) + distPoints
    };

    // Calc Battle Stats
    const currentStats = myProfile.battleStats || { wins: 0, losses: 0 };
    const isWin = myHp > enemyHp;
    const newStats = {
        wins: currentStats.wins + (isWin ? 1 : 0),
        losses: currentStats.losses + (isWin ? 0 : 1)
    };

    // Update DB
    if (myProfile.uid) {
        await updateUser(myProfile.uid, {
            attributes: newAttrs,
            battleStats: newStats
        });

        if (onUpdateProfile) {
            onUpdateProfile({
                attributes: newAttrs,
                battleStats: newStats
            });
        }
    }

    // Show Share Screen
    setShowShare(true);
};

const handleShare = async () => {
    const text = myHp > enemyHp
        ? `🏆 Venci uma batalha épica no MetaFit! Lvl ${myProfile.level} vs Lvl ${enemyProfile.level}`
        : `💀 Batalha intensa no MetaFit! Vou voltar mais forte.`;

    try {
        // Capture Image
        const element = document.getElementById('battle-result-area');
        if (!element) return;

        const canvas = await html2canvas(element, {
            backgroundColor: '#0a0a15', // Force dark background (no transparency)
            scale: 2, // High res
            useCORS: true // For avatars
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'metafit-victory.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'MetaFit Battle',
                text: text,
                files: [file]
            });
        } else {
            // Fallback: Download
            const link = document.createElement('a');
            link.download = 'metafit-victory.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            alert("Imagem salva! Você pode compartilhar manualmente.");
        }
    } catch (err) {
        console.error('Share failed', err);
        // Fallback text share
        if (navigator.share) {
            await navigator.share({
                title: 'MetaFit Battle',
                text: text,
                url: window.location.href
            });
        } else {
            alert("Link copiado para a área de transferência!");
            navigator.clipboard.writeText(text);
        }
    }

    // Wait a bit before exiting to allow share dialog to close/open
    setTimeout(onExit, 2000);
};


return (
    <div className="battle-arena" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #0a0a15 0%, #1a1a2e 100%)',
        zIndex: 5000,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
    }}>
        {/* Header */}
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: '#fff', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Turno <span style={{ color: '#00f0ff', fontSize: '1.5rem' }}>{turn}</span>
            </h2>
            <button onClick={onExit} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
                Sair
            </button>
        </div>

        {/* Duel Tutorial Overlay */}
        {showDuelTutorial && <DuelTutorialOverlay onComplete={handleDuelTutorialComplete} />}

        {/* Arena Visuals */}
        <div id="battle-result-area" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', perspective: '1000px', padding: '1rem', paddingBottom: '250px' }}>

            {/* Visual Line */}
            <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)', opacity: 0.3, top: '50%' }}></div>

            {/* Waiting Overlay */}
            {phase === 'waiting' && (
                <div style={{ position: 'absolute', zIndex: 1000, top: '30%', textAlign: 'center', background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '15px', border: '1px solid #00f0ff' }}>
                    <div className="pulse" style={{ fontSize: '1.5rem', marginBottom: '10px' }}>⏳</div>
                    <div style={{ color: '#00f0ff', fontWeight: 'bold' }}>Aguardando oponente...</div>
                </div>
            )}

            {/* Duel Animation Overlay - IGNORE IN CAPTURE */}
            {showDuelAnimation && (
                <div data-html2canvas-ignore="true" style={{ position: 'absolute', zIndex: 2000, top: '0', left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                    <div className="sword-animation" style={{ fontSize: '5rem', display: 'flex', gap: '20px' }}>
                        <span className="sword-left">⚔️</span>
                        <span className="sword-right" style={{ transform: 'scaleX(-1)' }}>⚔️</span>
                    </div>
                    <h2 style={{ color: '#fff', textShadow: '0 0 10px #f00', marginTop: '20px' }}>BATALHANDO!</h2>

                    <style>{`
                            @keyframes clash-left {
                                0% { transform: translateX(-50px) rotate(-45deg); }
                                50% { transform: translateX(10px) rotate(0deg); }
                                100% { transform: translateX(-50px) rotate(-45deg); }
                            }
                            @keyframes clash-right {
                                0% { transform: translateX(50px) scaleX(-1) rotate(-45deg); }
                                50% { transform: translateX(-10px) scaleX(-1) rotate(0deg); }
                                100% { transform: translateX(50px) scaleX(-1) rotate(-45deg); }
                            }
                            .sword-left { animation: clash-left 0.5s infinite; }
                            .sword-right { animation: clash-right 0.5s infinite; }
                            .pulse { animation: pulse 1.5s infinite; }
                            @keyframes pulse {
                                0% { opacity: 0.5; transform: scale(1); }
                                50% { opacity: 1; transform: scale(1.1); }
                                100% { opacity: 0.5; transform: scale(1); }
                            }
                        `}</style>
                </div>
            )}

            {/* Result Message Overlay (Part of Capture) */}
            {phase === 'result' && (
                <div style={{ marginBottom: '20px', textAlign: 'center', zIndex: 200, textShadow: '0 5px 15px #000' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        color: myHp > enemyHp ? '#ffd700' : '#ff4444',
                        fontWeight: '900',
                        margin: 0,
                        letterSpacing: '3px'
                    }}>
                        {myHp > enemyHp ? '🏆 VOCÊ GANHOU!' : '💀 VOCÊ PERDEU!'}
                    </h1>
                    <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '5px', opacity: 0.8 }}>
                        {myHp > enemyHp ? 'Dominou a arena!' : 'A derrota ensina.'}
                    </div>
                </div>
            )}

            <div style={{
                width: '100%', maxWidth: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 'auto',
                minHeight: '400px',
                position: 'relative'
            }}>
                {/* Explicit Result Layout */}
                {phase === 'result' ? (
                    <>
                        {/* Loser (Background / "On the ground") */}
                        <div style={{
                            position: 'absolute',
                            zIndex: 1,
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            filter: 'grayscale(100%) brightness(0.7)',
                            opacity: 0.6,
                            transform: 'translateY(60px) scale(0.85) rotate(-5deg)',
                            transition: 'all 1s ease'
                        }}>
                            <BattleCard
                                profile={myHp > enemyHp ? effectiveEnemyProfile : myProfile}
                                health={0}
                                maxHealth={myHp > enemyHp ? (effectiveEnemyProfile.id === 'BOT_METAFIT' ? Math.floor(getMaxHp(enemyProfile) * 1.25) : getMaxHp(enemyProfile)) : getMaxHp(myProfile)}
                                isEnemy={myHp > enemyHp}
                                activeTurn={false}
                                resultStatus="loser"
                            />
                        </div>

                        {/* Winner (Foreground / Focal Point) */}
                        <div style={{
                            zIndex: 10,
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            transform: 'translateY(-30px)',
                            filter: 'drop-shadow(0 0 30px rgba(0, 240, 255, 0.4))',
                            transition: 'all 1s ease 0.3s'
                        }}>
                            <BattleCard
                                profile={myHp > enemyHp ? myProfile : effectiveEnemyProfile}
                                health={1}
                                maxHealth={1}
                                isEnemy={myHp <= enemyHp}
                                activeTurn={true}
                                resultStatus="winner"
                            />
                        </div>
                    </>
                ) : (
                    // Standard VS Layout
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '0.5rem',
                        maxWidth: '600px',
                        transition: 'all 0.5s ease',
                    }}>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <BattleCard
                                profile={myProfile}
                                health={myHp}
                                maxHealth={getMaxHp(myProfile)}
                                isEnemy={false}
                                activeTurn={phase === 'setup'}
                            />
                        </div>

                        <div style={{ fontSize: '2rem', fontWeight: '900', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>VS</div>

                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <BattleCard
                                profile={effectiveEnemyProfile}
                                health={enemyHp}
                                maxHealth={effectiveEnemyProfile.id === 'BOT_METAFIT' ? Math.floor(getMaxHp(enemyProfile) * 1.25) : getMaxHp(enemyProfile)}
                                isEnemy={true}
                                activeTurn={phase === 'combat'}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Controls / Log / Result */}
        <div style={{
            background: 'rgba(0,0,0,0.95)',
            borderTop: '2px solid #00f0ff',
            padding: '1rem',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -10px 30px rgba(0, 240, 255, 0.1)',
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            zIndex: 6000,
            maxHeight: '45vh',
            overflowY: 'auto'
        }}>
            {phase === 'result' ? (
                <div className="animate-slide-up" style={{ textAlign: 'center' }}>
                    {!showShare ? (
                        <>
                            {enemyProfile.id === 'BOT_METAFIT' && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ color: '#ffd700', fontSize: '1.4rem', marginBottom: '0.5rem' }}>🤖 Treino MetaFit Concluído</h3>
                                    {myHp <= enemyHp && (
                                        <div style={{ color: '#aaa', fontStyle: 'italic' }}>
                                            Tente novamente para ganhar pontos de habilidade!
                                        </div>
                                    )}
                                </div>
                            )}

                            {distPoints >= 0 && (myHp > enemyHp || distPoints > 0) && (
                                <>
                                    <h3 style={{ color: '#00f0ff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                        {enemyProfile.id === 'BOT_METAFIT' ? '💎 Recompensa de Treino' : 'Evolução de Atributos'}
                                    </h3>
                                    <div style={{ fontSize: '1rem', color: '#ccc', marginBottom: '1.5rem' }}>
                                        Pontos para distribuir: <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.5rem' }}>{distPoints}</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                        {['strength', 'speed', 'defense'].map(attr => (
                                            <div key={attr} style={{ background: '#222', padding: '10px', borderRadius: '12px', minWidth: '94px', border: '1px solid #333' }}>
                                                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{attr === 'strength' ? '💪' : attr === 'speed' ? '⚡' : '🛡️'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>{attr === 'strength' ? 'Força' : attr === 'speed' ? 'Veloc.' : 'Defesa'}</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>
                                                    {(myProfile.attributes?.[attr] || 0) + allocated[attr]}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 'bold', height: '1.2rem' }}>
                                                    {allocated[attr] > 0 ? `+${allocated[attr]}` : ''}
                                                </div>
                                                <button
                                                    disabled={distPoints <= 0}
                                                    onClick={() => handleDistribute(attr)}
                                                    style={{
                                                        width: '100%', padding: '8px', borderRadius: '8px',
                                                        border: 'none', background: distPoints > 0 ? 'var(--color-primary)' : '#333',
                                                        color: '#000', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer',
                                                        transition: '0.2s', transform: distPoints > 0 ? 'scale(1.05)' : 'none'
                                                    }}
                                                >
                                                    DISTRIBUIR
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleClaimRewards}
                                style={{
                                    width: '100%', padding: '15px',
                                    background: 'linear-gradient(90deg, #00ff66, #00cc55)', border: 'none',
                                    borderRadius: '12px', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer'
                                }}
                            >
                                {enemyProfile.id === 'BOT_METAFIT' ? 'CONCLUIR TREINO' : 'CONFIRMAR EVOLUÇÃO'}
                            </button>
                        </>
                    ) : (
                        <div className="animate-slide-up">
                            <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Resultado Salvo!</h3>
                            <button
                                onClick={handleShare}
                                style={{
                                    width: '100%', padding: '15px',
                                    background: 'linear-gradient(90deg, #00f0ff, #0066ff)', border: 'none',
                                    borderRadius: '12px', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
                                }}
                            >
                                <span>📤</span> COMPARTILHAR RESULTADO
                            </button>
                            <button
                                onClick={onExit}
                                style={{
                                    marginTop: '10px',
                                    background: 'none', border: '1px solid #444', color: '#aaa',
                                    padding: '10px', borderRadius: '8px', width: '100%', cursor: 'pointer'
                                }}
                            >
                                Voltar ao Ranking
                            </button>
                        </div>
                    )}
                </div>
            ) : phase === 'setup' ? (
                <div className="animate-slide-up">
                    <h3 style={{ color: '#fff', marginBottom: '1rem', textAlign: 'center', fontSize: '1rem' }}>Estratégia do Turno {turn}</h3>

                    <StatisticSelector
                        label="Velocidade (Iniciativa)"
                        icon="⚡"
                        color="#ffd700"
                        value={turnBid.speed}
                        maxAvailable={myPool.speed}
                        onSelect={(v) => handleBidChange('speed', v)}
                    />
                    <StatisticSelector
                        label="Força (Dano)"
                        icon="💪"
                        color="#ff4444"
                        value={turnBid.strength}
                        maxAvailable={myPool.strength}
                        onSelect={(v) => handleBidChange('strength', v)}
                    />
                    <StatisticSelector
                        label="Defesa (Resistência)"
                        icon="🛡️"
                        color="#00f0ff"
                        value={turnBid.defense}
                        maxAvailable={myPool.defense}
                        onSelect={(v) => handleBidChange('defense', v)}
                    />

                    <button
                        onClick={handleConfirmTurn}
                        disabled={myTurnConfirmed && battleId}
                        style={{
                            width: '100%', padding: '15px',
                            background: (myTurnConfirmed && battleId) ? '#333' : 'linear-gradient(90deg, #00f0ff, #0066ff)',
                            border: 'none', borderRadius: '12px',
                            color: (myTurnConfirmed && battleId) ? '#888' : '#000', fontWeight: 'bold', fontSize: '1.1rem',
                            marginTop: '1rem', boxShadow: (myTurnConfirmed && battleId) ? 'none' : '0 0 15px rgba(0,240,255,0.5)',
                            cursor: 'pointer'
                        }}
                    >
                        {(myTurnConfirmed && battleId) ? 'AGUARDANDO OPONENTE...' : 'CONFIRMAR TÁTICA'}
                    </button>
                </div>
            ) : (
                <div style={{ width: '100%', padding: '0 1rem' }}>
                    {turnSummary ? (
                        <div className="turn-result-card animate-fade-in" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{
                                color: turnSummary.winner === 'player' ? '#00ff66' : '#ff4444',
                                fontSize: '1.4rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900'
                            }}>
                                {turnSummary.winner === 'player' ? '🏆 Você Venceu o Turno!' : '💥 Oponente Venceu!'}
                            </h3>

                            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>VOCÊ CAUSOU</div>
                                    <div style={{ fontSize: '2rem', color: '#00f0ff', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,240,255,0.5)' }}>{turnSummary.playerDamageDealt}</div>
                                </div>
                                <div style={{ borderLeft: '1px solid #444' }}></div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>VOCÊ RECEBEU</div>
                                    <div style={{ fontSize: '2rem', color: '#ff4444', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,68,68,0.5)' }}>{turnSummary.playerDamageTaken}</div>
                                </div>
                            </div>

                            <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {turnSummary.log && turnSummary.log.map((l, i) => (
                                    <div key={i} style={{ marginBottom: '6px', color: '#ddd', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {l}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleNextTurn}
                                disabled={myNextTurnReady && battleId}
                                style={{
                                    width: '100%', padding: '15px',
                                    background: (myNextTurnReady && battleId) ? '#333' : 'var(--color-primary)',
                                    border: 'none', borderRadius: '12px',
                                    color: (myNextTurnReady && battleId) ? '#888' : '#000', fontWeight: 'bold', fontSize: '1.1rem',
                                    boxShadow: (myNextTurnReady && battleId) ? 'none' : '0 0 20px rgba(0,240,255,0.4)',
                                    cursor: 'pointer'
                                }}
                            >
                                {(myNextTurnReady && battleId) ? 'AGUARDANDO OPONENTE...' : 'PRÓXIMO TURNO ➔'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '2rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                            Processando combate...
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
);
};

export default BattleArena;
