import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { getBadgeConfig } from './BadgeIcons';
import { updateUser } from '../utils/db'; // Import DB update
import { ChallengeService } from '../services/ChallengeService';

// Helper Functions (Moved to TOP to prevent ReferenceError/TDZ issues)
const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

const calculateTurnLogic = (playerEffort, enemyEffort, pProfile, eProfile, fatigue) => {
    // Helper: Get Effective Stat (Base * Fatigue * Effort)
    const getStat = (p, attr, eff, fatigueVal) => {
        const base = 10 + ((p.level || 1) * 2) + ((p.attributes && p.attributes[attr]) || 0);
        const fatigueMultiplier = fatigueVal / 100;
        const effortMultiplier = eff / 100;
        return Math.floor(base * fatigueMultiplier * effortMultiplier * 3);
    };

    // Current Stats (incorporating Fatigue)
    const pStats = {
        speed: getStat(pProfile, 'speed', playerEffort.speed, fatigue.player.speed),
        strength: getStat(pProfile, 'strength', playerEffort.strength, fatigue.player.strength),
        defense: getStat(pProfile, 'defense', playerEffort.defense, fatigue.player.defense)
    };

    const eStats = {
        speed: getStat(eProfile, 'speed', enemyEffort.speed, fatigue.enemy.speed),
        strength: getStat(eProfile, 'strength', enemyEffort.strength, fatigue.enemy.strength),
        defense: getStat(eProfile, 'defense', enemyEffort.defense, fatigue.enemy.defense)
    };

    let log = [];
    let pDamage = 0;
    let eDamage = 0;

    // --- Phase 1: Initiative ---
    const playerSpeed = pStats.speed;
    const enemySpeed = eStats.speed;
    const playerGoesFirst = playerSpeed >= enemySpeed;

    // Bonus Calculation (+10% for winner)
    const atkBonus = 1.1;

    log.push(playerGoesFirst
        ? `⚡ Você foi mais rápido! (+10% de Dano)`
        : `⚡ Inimigo foi mais rápido! (+10% de Dano)`);

    // --- Damage Formula ---
    const calculateDamage = (atkVal, defVal, isBonus, isCounter) => {
        // Apply bonus if Initiative Winner
        let finalAtk = atkVal * (isBonus ? atkBonus : 1.0);

        // Counter-attack is weaker (50% power)
        if (isCounter) finalAtk = finalAtk * 0.5;

        // New Formula: Dmg = Atk * (1 - (Def / (Def + Atk)))
        const denominator = defVal + finalAtk;
        const reduction = denominator === 0 ? 0 : defVal / denominator;
        const damage = Math.floor(finalAtk * (1 - reduction));

        return Math.max(0, damage);
    };

    const resolvePhase = (attackerName, atkStat, defStat, isPlayer, isBonus, isCounter) => {
        const dmg = calculateDamage(atkStat, defStat, isBonus, isCounter);
        const typeText = isCounter ? " (Contra-Ataque)" : "";
        const icon = isPlayer ? "⚔️" : "🛡️";
        log.push(`${icon} ${attackerName} causou ${dmg} dano!${typeText}`);
        return dmg;
    };

    // --- Turn Execution ---
    // We only calculate DAMAGE here, not state updates directly to keep function pure-ish
    // But we need to simulate the state flow for Counter Attack check
    // We will return the total damage to apply at the end

    if (playerGoesFirst) {
        // 1. Player Attacks
        eDamage += resolvePhase("Você", pStats.strength, eStats.defense, true, true, false);

        // 2. Counter-Attack Check (using logic based on stats, not remaining HP yet)
        if (eStats.defense > pStats.strength) {
            log.push("🛡️ Inimigo bloqueou e contra-atacou!");
            pDamage += resolvePhase("Inimigo", eStats.strength, pStats.defense, false, false, true);
        } else {
            log.push("💫 Inimigo não conseguiu contra-atacar (Defesa baixa).");
        }
    } else {
        // 1. Enemy Attacks
        pDamage += resolvePhase("Inimigo", eStats.strength, pStats.defense, false, true, false);

        // 2. Counter-Attack Check
        if (pStats.defense > eStats.strength) {
            log.push("🛡️ Você bloqueou e contra-atacou!");
            eDamage += resolvePhase("Você", pStats.strength, eStats.defense, true, false, true);
        } else {
            log.push("💫 Você não conseguiu contra-atacar (Defesa baixa).");
        }
    }

    // --- 4. Fatigue System ---
    const calcNextFatigue = (effVal) => {
        if (effVal === 100) return 80; // -20%
        if (effVal === 75) return 90; // -10%
        return 100; // Reset
    };

    const newFatigue = {
        player: {
            speed: calcNextFatigue(playerEffort.speed),
            strength: calcNextFatigue(playerEffort.strength),
            defense: calcNextFatigue(playerEffort.defense)
        },
        enemy: {
            speed: calcNextFatigue(enemyEffort.speed),
            strength: calcNextFatigue(enemyEffort.strength),
            defense: calcNextFatigue(enemyEffort.defense)
        }
    };

    return {
        log,
        pDamage,
        eDamage,
        newFatigue,
        turnSummary: {
            winner: playerGoesFirst ? 'player' : 'enemy', // Who won initiative
            playerDamageDealt: eDamage,
            playerDamageTaken: pDamage,
            initiativeMsg: playerGoesFirst ? "Você venceu a disputa!" : "Oponente venceu a disputa!"
        }
    };
};

// Sub-component for a Player Card
const BattleCard = ({ profile, health, maxHealth, isEnemy, activeTurn, resultStatus }) => {
    const healthPercent = Math.max(0, (health / maxHealth) * 100);
    const config = getBadgeConfig(profile.xp || 0);

    // Result Styles
    const isWinner = resultStatus === 'winner';
    const isLoser = resultStatus === 'loser';

    const resultStyle = resultStatus ? {
        transform: isWinner
            ? 'scale(1.2) translateY(-30px) translateZ(50px)'
            : 'scale(0.85) translateY(120px) rotate(-8deg) translateZ(-20px)',
        zIndex: isWinner ? 100 : 1,
        opacity: isLoser ? 0.95 : 1, // Slightly less transparent
        filter: isLoser ? 'grayscale(0.3) brightness(0.8)' : 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))',
        border: isWinner ? '4px solid #ffd700' : '2px solid #555',
        boxShadow: isWinner ? '0 0 50px rgba(255, 215, 0, 0.4)' : 'none',
        transition: 'all 0.8s ease'
    } : {};

    return (
        <div className={`battle-card ${isEnemy ? 'enemy' : 'player'} ${activeTurn ? 'active' : ''}`} style={{
            background: 'rgba(20, 20, 30, 0.95)', // Increased opacity for "complete" look
            border: `2px solid ${isEnemy ? '#ff0055' : '#00f0ff'}`,
            borderRadius: '16px',
            padding: '1rem',
            width: '48%',
            minWidth: '140px', // Slightly wider
            position: 'relative',
            boxShadow: activeTurn ? `0 0 30px ${isEnemy ? 'rgba(255,0,85,0.4)' : 'rgba(0,240,255,0.4)'}` : 'none',
            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            ...resultStyle
        }}>
            {/* Avatar & Level */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    border: `3px solid ${isEnemy ? '#ff0055' : '#00f0ff'}`,
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {profile.avatar ? (
                        <img src={`/avatars/${profile.avatar}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                            {profile.name ? profile.name.substring(0, 2).toUpperCase() : 'JD'}
                        </div>
                    )}
                </div>
                <div style={{
                    position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)',
                    background: '#000', color: '#ffd700', border: '1px solid #ffd700',
                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap'
                }}>
                    Lvl {profile.level || 1}
                </div>
            </div>

            <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                {profile.name || "Guerreiro"}
            </h3>

            {/* Health Bar */}
            <div style={{ width: '100%', height: '12px', background: '#333', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid #555' }}>
                <div style={{
                    width: `${healthPercent}%`, height: '100%',
                    background: healthPercent > 50 ? '#00ff66' : healthPercent > 20 ? '#ffa500' : '#ff0055',
                    transition: 'width 0.5s ease'
                }}></div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '1rem' }}>
                {Math.floor(health)} / {maxHealth} HP
            </div>

            {/* Base Stats Preview - Show always for both */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                width: '100%',
                fontSize: '0.85rem',
                color: '#fff',
                background: 'rgba(255,255,255,0.05)',
                padding: '8px 5px',
                borderRadius: '8px'
            }}>
                <div title="Força">💪 {profile.attributes?.strength || 0}</div>
                <div title="Velocidade">⚡ {profile.attributes?.speed || 0}</div>
                <div title="Defesa">🛡️ {profile.attributes?.defense || 0}</div>
            </div>
        </div>
    );
};

const StatisticSelector = ({ label, icon, value, onSelect, color, allEfforts }) => {
    return (
        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.8rem', color: '#fff', fontSize: '1rem' }}>
                <span style={{ marginRight: '10px', fontSize: '1.4rem' }}>{icon}</span>
                <span style={{ flex: 1, fontWeight: 'bold' }}>{label}</span>
                <span style={{ color: color, fontWeight: 'bold', fontSize: '1.2rem' }}>{value}%</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {[50, 75, 100].map(opt => {
                    const isActive = value === opt;
                    const isTaken = Object.values(allEfforts).includes(opt) && !isActive;

                    return (
                        <button
                            key={opt}
                            onClick={() => onSelect(opt)}
                            style={{
                                flex: 1,
                                padding: '12px 5px',
                                border: isActive ? `2px solid ${color}` : isTaken ? '1px dashed #555' : '1px solid #444',
                                background: isActive ? color : isTaken ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                                color: isActive ? '#000' : isTaken ? '#666' : '#aaa',
                                borderRadius: '8px',
                                fontWeight: isActive ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            {opt}%
                            {isTaken && <div style={{ fontSize: '0.6rem', position: 'absolute', bottom: '2px', left: 0, width: '100%', opacity: 0.7 }}>TROCAR</div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const BattleArena = ({ myProfile, enemyProfile, onExit, onUpdateProfile, battleId, role }) => {
    console.log(`[BattleArena] Init. ID: ${battleId}, Role: ${role}`);
    const [turn, setTurn] = useState(1);
    const [phase, setPhase] = useState('setup'); // setup, waiting, animating, combat, result
    const [showDuelAnimation, setShowDuelAnimation] = useState(false);

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
            }
            if (battle[myField]) {
                setMyTurnConfirmed(true);
            }

            // 2. Next Turn Readiness Sync
            const oppReadyField = `turn${turn}_ready_${opponentRole}`;
            const myReadyField = `turn${turn}_ready_${role}`;

            if (battle[oppReadyField]) {
                setOpponentNextTurnReady(true);
            }
            if (battle[myReadyField]) {
                setMyNextTurnReady(true);
            }
        });

        return () => unsub();
    }, [battleId, turn, role]);

    // Battle Stats State
    const [myHp, setMyHp] = useState(getMaxHp(myProfile));
    const [enemyHp, setEnemyHp] = useState(getMaxHp(enemyProfile));
    const [effort, setEffort] = useState({ strength: 75, speed: 100, defense: 50 });

    // Fatigue Tracking
    const [fatigue, setFatigue] = useState({
        player: { speed: 100, strength: 100, defense: 100 },
        enemy: { speed: 100, strength: 100, defense: 100 }
    });

    // ...

    const handleEffortChange = (attr, newValue) => {
        setEffort(prev => {
            const currentVal = prev[attr];
            if (currentVal === newValue) return prev;
            const otherAttr = Object.keys(prev).find(key => prev[key] === newValue);
            return { ...prev, [attr]: newValue, [otherAttr]: currentVal };
        });
    };

    // Ensure integrity
    useEffect(() => {
        const values = Object.values(effort);
        const unique = new Set(values);
        if (unique.size !== 3) {
            setEffort({ strength: 75, speed: 100, defense: 50 });
        }
    }, [effort]);

    const [battleLog, setBattleLog] = useState(["🔥 Batalha Iniciada! Escolha sua estratégia."]);

    // Transition to Animating
    useEffect(() => {
        if (myTurnConfirmed && opponentTurnConfirmed && phase === 'waiting') {
            setPhase('animating');
            setShowDuelAnimation(true);

            // Wait 3s (as requested) for animation, then process results
            const timer = setTimeout(() => {
                const result = calculateTurnLogic(effort, opponentTactics, myProfile, enemyProfile, fatigue);

                setBattleLog(result.log);
                setTurnSummary(result.turnSummary);
                setMyHp(prev => Math.max(0, prev - result.pDamage));
                setEnemyHp(prev => Math.max(0, prev - result.eDamage));
                setFatigue(result.newFatigue);

                setShowDuelAnimation(false);
                setPhase('combat');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [myTurnConfirmed, opponentTurnConfirmed, phase, effort, opponentTactics, fatigue, myProfile, enemyProfile]);

    // Handle Turn Advancement Sync (PvP Only)
    useEffect(() => {
        if (battleId && myNextTurnReady && opponentNextTurnReady) {
            console.log(`[BattleArena] Both ready. Advancing from Turn ${turn}`);
            advanceTurnInternal();
        }
    }, [myNextTurnReady, opponentNextTurnReady, battleId]);

    const handleConfirmTurn = async () => {
        if (battleId) {
            setPhase('waiting');
            await ChallengeService.submitTurn(battleId, role, turn, effort);
        } else {
            setPhase('combat');
            const options = [50, 75, 100];
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }
            const enemyEffort = {
                speed: options[0],
                strength: options[1],
                defense: options[2]
            };

            const result = calculateTurnLogic(effort, enemyEffort, myProfile, enemyProfile, fatigue);
            setBattleLog(result.log);
            setTurnSummary(result.turnSummary);
            setMyHp(prev => Math.max(0, prev - result.pDamage));
            setEnemyHp(prev => Math.max(0, prev - result.eDamage));
            setFatigue(result.newFatigue);
        }
    };

    const advanceTurnInternal = () => {
        setTurnSummary(null);
        setMyNextTurnReady(false);
        setOpponentNextTurnReady(false);

        setTurn(prev => {
            const nextTurn = prev + 1;
            if (nextTurn > 3) {
                setPhase('result');
                return prev;
            }
            setMyTurnConfirmed(false);
            setOpponentTurnConfirmed(false);
            setOpponentTactics(null);
            setPhase('setup');
            return nextTurn;
        });
    };

    const handleNextTurn = async () => {
        if (battleId) {
            // PvP: Send ready signal
            setMyNextTurnReady(true);
            await ChallengeService.submitReadyNextTurn(battleId, role, turn);
            // Advancement will happen in useEffect when both are true
        } else {
            // AI: Instant advancement
            advanceTurnInternal();
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
            const points = myHp > enemyHp ? 3 : 1;
            setDistPoints(points);
        }
    }, [phase, myHp, enemyHp]);

    const handleDistribute = (attr) => {
        if (distPoints > 0) {
            setDistPoints(p => p - 1);
            setAllocated(prev => ({ ...prev, [attr]: prev[attr] + 1 }));
        }
    };

    const handleClaimRewards = async () => {
        if (distPoints > 0 && !window.confirm("Ainda há pontos não distribuídos. Deseja continuar?")) return;

        // Calc New Attributes
        const currentAttrs = myProfile.attributes || { strength: 0, speed: 0, defense: 0 };
        const newAttrs = {
            strength: (currentAttrs.strength || 0) + allocated.strength,
            speed: (currentAttrs.speed || 0) + allocated.speed,
            defense: (currentAttrs.defense || 0) + allocated.defense,
            points: (currentAttrs.points || 0) // existing points unused for now
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
        }

        // Update Local Profile
        if (onUpdateProfile) {
            onUpdateProfile({
                attributes: newAttrs,
                battleStats: newStats
            });
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
                    Turno <span style={{ color: '#00f0ff', fontSize: '1.5rem' }}>{Math.min(turn, 3)}</span> / 3
                </h2>
                <button onClick={onExit} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
                    Sair
                </button>
            </div>

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
                            {/* Loser (Background) */}
                            <div style={{
                                position: 'absolute',
                                zIndex: 1,
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                <BattleCard
                                    profile={myHp > enemyHp ? enemyProfile : myProfile}
                                    health={0}
                                    maxHealth={100}
                                    isEnemy={myHp > enemyHp}
                                    activeTurn={false}
                                    resultStatus="loser"
                                />
                            </div>

                            {/* Winner (Foreground) */}
                            <div style={{
                                zIndex: 10,
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                <BattleCard
                                    profile={myHp > enemyHp ? myProfile : enemyProfile}
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
                                    profile={enemyProfile}
                                    health={enemyHp}
                                    maxHealth={getMaxHp(enemyProfile)}
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
                                <h3 style={{ color: '#00f0ff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Evolução de Atributos</h3>
                                <div style={{ fontSize: '1rem', color: '#ccc', marginBottom: '1.5rem' }}>
                                    Pontos disponíveis: <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.2rem' }}>{distPoints}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    {['strength', 'speed', 'defense'].map(attr => (
                                        <div key={attr} style={{ background: '#222', padding: '10px', borderRadius: '8px', minWidth: '80px' }}>
                                            <div style={{ fontSize: '1.2rem' }}>{attr === 'strength' ? '💪' : attr === 'speed' ? '⚡' : '🛡️'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                                + {allocated[attr]}
                                            </div>
                                            <button
                                                disabled={distPoints <= 0}
                                                onClick={() => handleDistribute(attr)}
                                                style={{
                                                    width: '30px', height: '30px', borderRadius: '50%',
                                                    border: 'none', background: distPoints > 0 ? 'var(--color-primary)' : '#444',
                                                    color: '#000', fontWeight: 'bold', marginTop: '5px', cursor: 'pointer'
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleClaimRewards}
                                    style={{
                                        width: '100%', padding: '15px',
                                        background: 'linear-gradient(90deg, #00ff66, #00cc55)', border: 'none',
                                        borderRadius: '12px', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer'
                                    }}
                                >
                                    CONFIRMAR EVOLUÇÃO
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
                ) : phase === 'setup' && turn <= 3 ? (
                    <div className="animate-slide-up">
                        <h3 style={{ color: '#fff', marginBottom: '1rem', textAlign: 'center', fontSize: '1rem' }}>Estratégia do Turno {turn}</h3>

                        <StatisticSelector
                            label="Velocidade (Iniciativa)"
                            icon="⚡"
                            color="#ffd700"
                            value={effort.speed}
                            allEfforts={effort}
                            onSelect={(v) => handleEffortChange('speed', v)}
                        />
                        <StatisticSelector
                            label="Força (Dano)"
                            icon="💪"
                            color="#ff4444"
                            value={effort.strength}
                            allEfforts={effort}
                            onSelect={(v) => handleEffortChange('strength', v)}
                        />
                        <StatisticSelector
                            label="Defesa (Resistência)"
                            icon="🛡️"
                            color="#00f0ff"
                            value={effort.defense}
                            allEfforts={effort}
                            onSelect={(v) => handleEffortChange('defense', v)}
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
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>DANO CAUSADO</div>
                                        <div style={{ fontSize: '2rem', color: '#00f0ff', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,240,255,0.5)' }}>{turnSummary.playerDamageDealt}</div>
                                    </div>
                                    <div style={{ borderLeft: '1px solid #444' }}></div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>DANO RECEBIDO</div>
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
