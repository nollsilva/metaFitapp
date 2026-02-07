import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { updateUser } from '../utils/db'; // Import DB update
import { ChallengeService } from '../services/ChallengeService';
import { playSfx } from '../utils/audio';
import BattleCard from './BattleCard';
import StatisticSelector from './StatisticSelector';
import DuelTutorialOverlay from './DuelTutorialOverlay';
import { calculateMaxHp, calculateDamage, getBotAction, resolveHealAction, resolveBuffAction } from '../utils/battleLogic';

const BattleArena = ({ myProfile, enemyProfile, onExit, onUpdateProfile, battleId, role }) => {
    console.log(`[BattleArena] Init. ID: ${battleId}, Role: ${role}`);

    // --- STATE ---
    const [turn, setTurn] = useState(1);
    const [phase, setPhase] = useState('setup'); // setup, acting, resolving, result
    const [battleLog, setBattleLog] = useState(["🔥 Batalha Iniciada! Escolha sua ação."]);

    // --- PLAYER STATE ---
    // We need to track dynamic stats during battle
    const [playerState, setPlayerState] = useState(() => {
        const attrs = myProfile.attributes || {};
        const max = calculateMaxHp(attrs);

        const baseStr = Number(attrs.strength || 0);
        const baseDef = Number(attrs.defense || 0);

        console.log("Player Stats Calc:", baseStr, baseDef, max);

        return {
            hp: max,
            maxHp: max,
            // Formula: 100 + (5 * Attribute)
            attack: 100 + (baseStr * 5),
            defense: 100 + (baseDef * 5),
            conversionsUsed: 0,
            isStunned: false,
            lastAction: null
        };
    });

    // --- SELECTION STATE (Persistent Sliders) ---
    const [atkSelection, setAtkSelection] = useState(0);
    const [defSelection, setDefSelection] = useState(0);

    // --- ENEMY STATE ---
    const [enemyState, setEnemyState] = useState(() => {
        const isBot = enemyProfile.id === 'BOT_METAFIT';
        const attrs = enemyProfile.attributes || {};

        const rawStr = Number(attrs.strength || 0);
        const rawDef = Number(attrs.defense || 0);

        const strAttr = rawStr + (isBot ? 5 : 0);
        const defAttr = rawDef + (isBot ? 5 : 0);

        const max = calculateMaxHp({ strength: strAttr, defense: defAttr });

        return {
            hp: max,
            maxHp: max,
            baseAttack: 100 + (strAttr * 5),
            baseDefense: 100 + (defAttr * 5),
            attack: 100 + (strAttr * 5),
            defense: 100 + (defAttr * 5),
            conversionsUsed: 0,
            isStunned: false,
            lastAction: null
        };
    });

    // --- ACTIONS ---

    // 1. Direct Conversion (Ends Turn)
    const handleConversion = (type) => {
        if (phase !== 'setup') return;

        let pState = { ...playerState };
        let pActionLog = "";
        let res = {};
        const amount = type === 'ATK_TO_HP' ? atkSelection : defSelection;

        if (amount <= 0) return; // Prevent 0 conversion

        if (type === 'ATK_TO_HP') {
            res = resolveHealAction(pState, amount);
            pActionLog = `Você converteu ${amount} de Ataque em Vida e encerrou o turno! (+${res.amountHealed} HP)`;
            setAtkSelection(0);
        } else if (type === 'DEF_TO_ATK') {
            res = resolveBuffAction(pState, amount);
            pActionLog = `Você converteu ${amount} de Defesa em Ataque e encerrou o turno! (+${res.attackGained} Atk)`;
            setDefSelection(0);
        }

        if (res.log) {
            setBattleLog(prev => [...prev, `Erro: ${res.log}`]);
        } else {
            // Update state and IMMEDIATELY resolve turn
            const newState = { ...pState, ...res };
            setPlayerState(newState);
            setBattleLog(prev => [...prev, `Ação: ${pActionLog}`]);

            // Trigger Turn Resolution with updated state
            // We pass the type just for logging/logic if needed, but the main thing is the state update happened
            resolveTurn(type, newState);
        }
    };

    // Consolidated Fight Action
    const handleFight = () => {
        if (phase !== 'setup') return;

        // Determine action based on Active Slider
        if (atkSelection > 0) {
            // ATTACK
            const newState = { ...playerState, attack: playerState.attack - atkSelection };
            setPlayerState(newState);
            resolveTurn('ATTACK', newState, atkSelection);
        }
        else if (defSelection > 0) {
            // DEFEND
            const newState = { ...playerState, defense: playerState.defense - defSelection };
            setPlayerState(newState);
            resolveTurn('DEFEND', newState, defSelection);
        }
        else if (playerState.attack <= 0 && playerState.defense <= 0) {
            // ANTI-DEADLOCK: SKIP TURN
            resolveTurn('SKIP', playerState, 0);
        }
    };

    // Mutual Exclusivity for Sliders
    const handleAtkSliderChange = (val) => {
        setAtkSelection(val);
        if (val > 0) setDefSelection(0);
    };

    const handleDefSliderChange = (val) => {
        setDefSelection(val);
        if (val > 0) setAtkSelection(0);
    };

    const resolveTurn = (playerActionType, currentPlayerState, playerAmountUsed = 0) => {
        setPhase('acting');

        // INSTANT TURN LOGIC: If enemy has no resources to "think" with, skip delay.
        // User Request: "assim que o jogador... clicar... vai direto"
        const enemyHasNoResources = enemyState.attack <= 0 && enemyState.defense <= 0;
        const delay = enemyHasNoResources ? 100 : 1000; // Small 100ms for UI feedback, else 1s

        setTimeout(() => {
            let pState = { ...currentPlayerState };
            let eState = { ...enemyState };
            let log = [];

            // --- BOT DECISION ---
            let botAction = { type: 'SKIP', amount: 0 };

            if (eState.isStunned) {
                log.push("🤖 Oponente está atordoado e perdeu a vez!");
                eState.isStunned = false;
            }
            else if (enemyState.attack <= 0 && enemyState.defense <= 0) {
                log.push("🤖 Oponente sem recursos! Passou a vez.");
                botAction = { type: 'SKIP', amount: 0 };
            }
            else {
                botAction = getBotAction(eState, pState, [], turn);
            }

            // Apply Bot Costs Matches Player Logic
            let botAmountUsed = botAction.amount || 0;
            // Cap bot amount to available
            if (botAction.type === 'ATTACK') {
                botAmountUsed = Math.min(botAmountUsed, eState.attack);
                eState.attack -= botAmountUsed;
            } else if (botAction.type === 'DEFEND') {
                botAmountUsed = Math.min(botAmountUsed, eState.defense);
                eState.defense -= botAmountUsed;
            }

            // Apply Bot Conversion Actions
            if (botAction.type === 'CONVERT_ATK_TO_HP') {
                const res = resolveHealAction(eState);
                eState = { ...eState, ...res };
                log.push(`🤖 Oponente converteu Ataque em Vida (+${res.amountHealed} HP)!`);
            } else if (botAction.type === 'CONVERT_DEF_TO_ATK') {
                const res = resolveBuffAction(eState);
                eState = { ...eState, ...res };
                log.push(`🤖 Oponente converteu Defesa em Ataque (+${res.attackGained} Atk)!`);
            } else if (botAction.type === 'DEFEND') {
                eState.lastAction = 'DEFEND';
                eState.isDefending = true;
                eState.defenseUsed = botAmountUsed; // Track defense used for this turn
                log.push(`🤖 Oponente defendeu usando ${botAmountUsed} pontos!`);
            }

            // --- DAMAGE CALCULATION ---
            // Defense ONLY mitigates if it was ACTUALLY used this turn (isDefending).
            // Passive defense (remaining stat) does NOT count in this "Resource Attrition" specific duel mode?
            // "O que foi usado no turno subtrai do total".
            // Implies: If I don't use Defense, I have 0 mitigation? Or do I have base mitigation?
            // "se o usuario tem 125 ... define quanto ... sera usado".
            // Typically in this resource model, only USED defense blocks.
            // Let's assume ONLY Used Defense counts for mitigation to match the "Attrition" style.

            // 1. Player Action Resolution
            if (playerActionType === 'ATTACK') {
                let effectiveDef = 0;
                if (eState.isDefending) {
                    effectiveDef = eState.defenseUsed || 0;
                }

                const dmg = calculateDamage(playerAmountUsed, effectiveDef);
                eState.hp = Math.max(0, eState.hp - dmg);
                log.push(`⚔️ Você atacou com força ${playerAmountUsed}! ${dmg} de dano.`);
            } else if (playerActionType === 'DEFEND') {
                pState.isDefending = true;
                pState.defenseUsed = playerAmountUsed;
                log.push(`🛡️ Você defendeu usando ${playerAmountUsed} pontos!`);
            } else if (playerActionType === 'SKIP') {
                log.push(`⏩ Você pulou a vez (sem recursos).`);
            }

            // 2. Bot Action Resolution
            if (botAction.type === 'ATTACK') {
                let effectiveDef = 0;
                if (pState.isDefending) {
                    effectiveDef = pState.defenseUsed || 0;
                }

                const dmg = calculateDamage(botAmountUsed, effectiveDef);
                pState.hp = Math.max(0, pState.hp - dmg);
                log.push(`🛡️ Oponente atacou com força ${botAmountUsed}! ${dmg} de dano.`);
            }

            // Reset Turn/Temp flags
            pState.isDefending = false;
            eState.isDefending = false;
            pState.defenseUsed = 0;
            eState.defenseUsed = 0;

            // Update States
            setPlayerState(pState);
            setEnemyState(eState);
            setBattleLog(prev => [...prev, ...log]);

            // Check End Game
            if (pState.hp <= 0) {
                setPhase('result');
            } else if (eState.hp <= 0) {
                setPhase('result');
            }
            else if (pState.attack <= 0 && pState.defense <= 0 && eState.attack <= 0 && eState.defense <= 0) {
                // EXHAUSTION: WINNER IS HIGHER HP
                if (pState.hp > eState.hp) {
                    setBattleLog(prev => [...prev, "⚠️ Exaustão! Você venceu por ter mais vida!"]);
                } else if (eState.hp > pState.hp) {
                    setBattleLog(prev => [...prev, "⚠️ Exaustão! Oponente venceu por ter mais vida!"]);
                    // Force HP to 0 for logic consistency in Result screen check? Or just use state comparison.
                } else {
                    setBattleLog(prev => [...prev, "⚠️ Empate total!"]);
                }
                setPhase('result');
            }
            else {
                setTurn(t => t + 1);
                setPhase('setup');
            }
        }, delay);
    };

    // Auto-Skip Player Turn if Stunned logic remains same...
    // ...

    // Checks for empty resources
    const isPlayerEmpty = playerState.attack <= 0 && playerState.defense <= 0;
    const isActionSelected = atkSelection > 0 || defSelection > 0;
    const canFight = isActionSelected || isPlayerEmpty;

    let fightButtonText = "⚔️ LUTAR";
    if (atkSelection > 0) fightButtonText = "⚔️ ATACAR!";
    else if (defSelection > 0) fightButtonText = "🛡️ DEFENDER!";
    else if (isPlayerEmpty) fightButtonText = "⏩ PULAR VEZ";

    // --- REWARD DISTRIBUTION STATE ---
    const [rewardPoints, setRewardPoints] = useState(0);
    const [distributedStr, setDistributedStr] = useState(0);
    const [distributedDef, setDistributedDef] = useState(0);
    const [rewardsCalculated, setRewardsCalculated] = useState(false);

    useEffect(() => {
        if (phase === 'result' && !rewardsCalculated) {
            const isVictory = playerState.hp > 0 && (playerState.hp > enemyState.hp || enemyState.hp <= 0);

            if (isVictory) {
                // 1 point vs Bot, 2 points vs Player
                const points = (enemyProfile.id === 'BOT_METAFIT') ? 1 : 2;
                setRewardPoints(points);
                playSfx('win');
            } else {
                playSfx('lose');
            }
            setRewardsCalculated(true);
        }
    }, [phase, playerState.hp, enemyState.hp, enemyProfile.id, rewardsCalculated]);


    const handleDistribute = (attr) => {
        if (rewardPoints <= 0) return;
        if (attr === 'str') {
            setDistributedStr(s => s + 1);
        } else {
            setDistributedDef(d => d + 1);
        }
        setRewardPoints(p => p - 1);
    };

    const handleConfirmRewards = async () => {
        if (distributedStr > 0 || distributedDef > 0) {
            const currentStr = Number(myProfile.attributes?.strength || 0);
            const currentDef = Number(myProfile.attributes?.defense || 0);

            await updateUser(myProfile.uid, {
                attributes: {
                    ...myProfile.attributes,
                    strength: currentStr + distributedStr,
                    defense: currentDef + distributedDef
                }
            });
            // Update local profile handler provided by App
            if (onUpdateProfile) {
                onUpdateProfile({
                    attributes: {
                        ...myProfile.attributes,
                        strength: currentStr + distributedStr,
                        defense: currentDef + distributedDef
                    }
                });
            }
        }
        onExit();
    };

    // Wrapper for Exit to handle click
    const handleExitClick = () => {
        onExit();
    };

    // Determine Result Title/Color
    const isPlayerWinner = playerState.hp > 0 && (playerState.hp > enemyState.hp || enemyState.hp <= 0);
    const resultTitle = isPlayerWinner ? 'VITÓRIA' : 'DERROTA';
    const resultColor = isPlayerWinner ? '#00f0ff' : '#ff4444';

    return (
        <div className="battle-arena" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0a0a15 0%, #1a1a2e 100%)',
            zIndex: 5000,
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
            {/* ... Top Bar & Battle Area (Cards) ... */}

            {/* ... (Keep existing until Controls) ... */}

            {/* TOP BAR & BATTLE AREA REMAIN SAME, SKIPPING TO CONTROL AREA */}
            <div style={{
                padding: '10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(5px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                zIndex: 10
            }}>
                <button onClick={onExit} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                    ⬅️ Sair
                </button>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '20px', border: '1px solid #333' }}>
                    Round {turn}
                </div>
                <div style={{ width: '50px' }}></div>
            </div>

            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                perspective: '1000px',
                padding: '10px'
            }}>
                {/* Battle Cards Wrapper */}
                <div style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: '800px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    <BattleCard
                        profile={myProfile}
                        health={playerState.hp}
                        maxHealth={playerState.maxHp}
                        isEnemy={false}
                        activeTurn={phase === 'setup'}
                        resultStatus={phase === 'result' ? (isPlayerWinner ? 'winner' : 'loser') : null}
                    />

                    {/* VS Badge */}
                    <div style={{
                        position: 'absolute',
                        zIndex: 5,
                        background: '#ff0055',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        padding: '15px',
                        borderRadius: '50%',
                        boxShadow: '0 0 20px #ff0055',
                        border: '3px solid #fff',
                        textShadow: '2px 2px 0 #000'
                    }}>
                        VS
                    </div>

                    <BattleCard
                        profile={enemyProfile}
                        health={enemyState.hp}
                        maxHealth={enemyState.maxHp}
                        isEnemy={true}
                        activeTurn={phase === 'resolution'}
                        resultStatus={phase === 'result' ? (!isPlayerWinner ? 'winner' : 'loser') : null}
                    />
                </div>
            </div>

            {/* BATTLE LOG */}
            <div style={{
                height: '80px',
                overflowY: 'auto',
                padding: '10px 20px',
                background: 'rgba(0,0,0,0.6)',
                fontSize: '0.9rem',
                color: '#ddd',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'monospace',
                display: 'flex', flexDirection: 'column-reverse'
            }}>
                {battleLog.slice().reverse().map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
                ))}
            </div>

            {/* CONTROLS AREA (Exclusive Actions) */}
            <div style={{
                padding: '15px',
                background: '#1a1a2e',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                boxShadow: '0 -5px 20px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 20,
                maxHeight: '40vh',
                overflowY: 'auto'
            }}>
                {phase === 'setup' ? (
                    <>
                        {/* Stats Overview */}
                        <div style={{ display: 'flex', justifyContent: 'space-around', color: '#fff', fontSize: '0.8rem', opacity: 0.8, marginBottom: '5px' }}>
                            <div>💪 Max Atk: {playerState.attack}</div>
                            <div>🛡️ Max Def: {playerState.defense}</div>
                            <div>⚡ Conversões: {2 - playerState.conversionsUsed}/2</div>
                        </div>

                        {/* SLIDER 1: ATTACK */}
                        <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid #522' }}>
                            <StatisticSelector
                                label="Usar Ataque"
                                icon="⚔️"
                                value={atkSelection}
                                color="#ff4444"
                                // UX Fix: Allow selecting up to full Attack, even if HP is full. Logic handles the cap.
                                maxAvailable={playerState.attack}
                                onSelect={handleAtkSliderChange}
                            />
                            <button
                                onClick={() => handleConversion('ATK_TO_HP')}
                                disabled={atkSelection <= 0 || playerState.conversionsUsed >= 2}
                                className="btn-sm"
                                style={{
                                    width: '100%', marginTop: '5px', background: '#333',
                                    border: '1px solid #ff4444', color: '#ff4444',
                                    opacity: (atkSelection <= 0 || playerState.conversionsUsed >= 2) ? 0.5 : 1
                                }}
                            >
                                🩸 Converter & Encerrar Turno
                            </button>
                        </div>

                        {/* SLIDER 2: DEFENSE */}
                        <div style={{ background: 'rgba(68, 68, 255, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid #225' }}>
                            <StatisticSelector
                                label="Usar Defesa"
                                icon="🛡️"
                                value={defSelection}
                                color="#4444ff"
                                maxAvailable={playerState.defense}
                                onSelect={handleDefSliderChange}
                            />
                            <button
                                onClick={() => handleConversion('DEF_TO_ATK')}
                                disabled={defSelection <= 0 || playerState.conversionsUsed >= 2}
                                className="btn-sm"
                                style={{
                                    width: '100%', marginTop: '5px', background: '#333',
                                    border: '1px solid #4444ff', color: '#4444ff',
                                    opacity: (defSelection <= 0 || playerState.conversionsUsed >= 2) ? 0.5 : 1
                                }}
                            >
                                🔥 Converter {defSelection > 0 ? `(${defSelection}) ` : ''}para Ataque
                            </button>
                        </div>

                        {/* SINGLE FIGHT BUTTON */}
                        <button
                            onClick={handleFight}
                            disabled={!canFight}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '15px',
                                fontSize: '1.5rem',
                                background: canFight ? '#ff0055' : '#555',
                                boxShadow: canFight ? '0 0 20px rgba(255, 0, 85, 0.6)' : 'none',
                                border: 'none',
                                marginTop: '10px',
                                opacity: canFight ? 1 : 0.5,
                                cursor: canFight ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {fightButtonText}
                        </button>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                        Resolvendo Turno...
                    </div>
                )}
            </div>

            {/* RESULTS OVERLAY */}
            {phase === 'result' && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 6000 }}>
                    <h1 style={{ fontSize: '3rem', color: resultColor, marginBottom: '20px' }}>
                        {resultTitle}
                    </h1>
                    <p style={{ color: '#aaa', marginBottom: '20px' }}>
                        {isPlayerWinner ? 'Você venceu o duelo!' : 'Você foi derrotado.'}
                    </p>

                    {isPlayerWinner && !rewardsCalculated ? (
                        <div style={{ color: '#fff' }}>Calculando Recompensas...</div>
                    ) : (
                        isPlayerWinner && (rewardPoints > 0 || distributedStr > 0 || distributedDef > 0) ? (
                            <div className="animate-fade-in" style={{ background: '#222', padding: '20px', borderRadius: '10px', border: '1px solid #444', marginBottom: '20px', minWidth: '300px' }}>
                                <h3 style={{ color: '#ffd700', textAlign: 'center', marginBottom: '15px' }}>🏆 Recompensas</h3>
                                <p style={{ color: '#fff', textAlign: 'center', marginBottom: '15px' }}>
                                    Pontos disponíveis: <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{rewardPoints}</span>
                                </p>

                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px' }}>
                                    {/* STR */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ color: '#ff4444' }}>Força (+{distributedStr})</span>
                                        <button
                                            onClick={() => handleDistribute('str')}
                                            disabled={rewardPoints <= 0}
                                            className="btn-sm"
                                            style={{ background: rewardPoints > 0 ? '#ff4444' : '#555', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.2rem' }}
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* DEF */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ color: '#4444ff' }}>Defesa (+{distributedDef})</span>
                                        <button
                                            onClick={() => handleDistribute('def')}
                                            disabled={rewardPoints <= 0}
                                            className="btn-sm"
                                            style={{ background: rewardPoints > 0 ? '#4444ff' : '#555', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.2rem' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {rewardPoints === 0 && (
                                    <button onClick={handleConfirmRewards} className="btn-primary" style={{ width: '100%', background: '#00ff66', color: '#000' }}>
                                        Confirmar & Sair
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button onClick={handleExitClick} className="btn-primary" style={{ width: '200px' }}>
                                Sair da Arena
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default BattleArena;

