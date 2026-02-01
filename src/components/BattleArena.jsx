import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { BadgeIcon, getBadgeConfig } from './BadgeIcons';
import { updateUser } from '../utils/db'; // Import DB update

// Sub-component for a Player Card
const BattleCard = ({ profile, health, maxHealth, isEnemy, activeTurn, resultStatus }) => {
    const healthPercent = Math.max(0, (health / maxHealth) * 100);
    const config = getBadgeConfig(profile.xp || 0);

    // Result Styles
    const isWinner = resultStatus === 'winner';
    const isLoser = resultStatus === 'loser';

    const resultStyle = resultStatus ? {
        transform: isWinner ? 'scale(1.3) translateY(-40px) translateZ(50px)' : 'scale(0.8) translateY(140px) rotate(-12deg) translateZ(-50px)',
        zIndex: isWinner ? 100 : 1,
        opacity: isLoser ? 0.9 : 1,
        filter: isLoser ? 'grayscale(0.4)' : 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))',
        border: isWinner ? '4px solid #ffd700' : '2px solid #555',
        boxShadow: isWinner ? '0 0 50px rgba(255, 215, 0, 0.4)' : 'none'
    } : {};

    return (
        <div className={`battle-card ${isEnemy ? 'enemy' : 'player'} ${activeTurn ? 'active' : ''}`} style={{
            background: 'rgba(20, 20, 30, 0.8)',
            border: `2px solid ${isEnemy ? '#ff0055' : '#00f0ff'}`,
            borderRadius: '16px',
            padding: '1rem', // Reduced padding
            width: '48%', // Slightly wider % but smaller min-width
            minWidth: '130px', // Reduced min-width for mobile
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

            {/* Base Stats Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', fontSize: '0.8rem', color: '#ccc' }}>
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
    const [turn, setTurn] = useState(1);
    const [phase, setPhase] = useState('setup'); // setup, waiting, animating, combat, result
    const [showDuelAnimation, setShowDuelAnimation] = useState(false);

    // Network Sync State
    const [myTurnConfirmed, setMyTurnConfirmed] = useState(false);
    const [opponentTurnConfirmed, setOpponentTurnConfirmed] = useState(false);
    const [opponentTactics, setOpponentTactics] = useState(null);

    // Sync Listener
    useEffect(() => {
        if (!battleId) return;

        const unsub = ChallengeService.listenToChallenge(battleId, (battle) => {
            if (!battle) return;

            const opponentRole = role === 'challenger' ? 'opponent' : 'challenger';
            const oppField = `turn${turn}_${opponentRole}`;
            const myField = `turn${turn}_${role}`;

            if (battle[oppField]) {
                setOpponentTactics(battle[oppField]);
                setOpponentTurnConfirmed(true);
            }

            if (battle[myField]) {
                setMyTurnConfirmed(true);
            }
        });

        return () => unsub();
    }, [battleId, turn, role]);

    // Transition to Animating when both confirmed
    useEffect(() => {
        if (myTurnConfirmed && opponentTurnConfirmed && phase === 'waiting') {
            setPhase('animating');
            setShowDuelAnimation(true);

            // Wait 2.5s for animation, then process results
            const timer = setTimeout(() => {
                const logs = calculateTurn(effort, opponentTactics);
                setBattleLog(logs);
                setShowDuelAnimation(false);
                setPhase('combat');
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [myTurnConfirmed, opponentTurnConfirmed, phase, effort, opponentTactics]);

    // Battle Stats Formula: 150 + (Level * 15)
    const getMaxHp = (p) => 150 + ((p.level || 1) * 15);

    const [myHp, setMyHp] = useState(getMaxHp(myProfile));
    const [enemyHp, setEnemyHp] = useState(getMaxHp(enemyProfile));

    // Effort Allocation State
    const [effort, setEffort] = useState({ strength: 75, speed: 100, defense: 50 });

    const handleEffortChange = (attr, newValue) => {
        setEffort(prev => {
            const currentVal = prev[attr];
            if (currentVal === newValue) return prev; // No change

            // Find who has the new value
            const otherAttr = Object.keys(prev).find(key => prev[key] === newValue); // 'speed', 'strength', or 'defense'

            // Swap
            return {
                ...prev,
                [attr]: newValue,
                [otherAttr]: currentVal
            };
        });
    };

    // Ensure integrity (Unique values)
    useEffect(() => {
        const values = Object.values(effort);
        const unique = new Set(values);
        if (unique.size !== 3) {
            // Reset if corrupted
            setEffort({ strength: 75, speed: 100, defense: 50 });
        }
    }, [effort]);

    // Fatigue Tracking
    const [fatigue, setFatigue] = useState({
        player: { speed: 100, strength: 100, defense: 100 },
        enemy: { speed: 100, strength: 100, defense: 100 }
    });

    const [battleLog, setBattleLog] = useState(["🔥 Batalha Iniciada! Escolha sua estratégia."]);

    const calculateTurn = (playerEffort, enemyEffort) => {
        // Helper: Get Effective Stat (Base * Fatigue * Effort)
        // MULTIPLIER x3 applied as requested to increase damage pace
        const getStat = (p, attr, eff, fatigueVal) => {
            const base = 10 + ((p.level || 1) * 2) + ((p.attributes && p.attributes[attr]) || 0);
            const fatigueMultiplier = fatigueVal / 100;
            const effortMultiplier = eff / 100;
            return Math.floor(base * fatigueMultiplier * effortMultiplier * 3);
        };

        // Current Stats (incorporating Fatigue)
        const pStats = {
            speed: getStat(myProfile, 'speed', playerEffort.speed, fatigue.player.speed),
            strength: getStat(myProfile, 'strength', playerEffort.strength, fatigue.player.strength),
            defense: getStat(myProfile, 'defense', playerEffort.defense, fatigue.player.defense)
        };

        const eStats = {
            speed: getStat(enemyProfile, 'speed', enemyEffort.speed, fatigue.enemy.speed),
            strength: getStat(enemyProfile, 'strength', enemyEffort.strength, fatigue.enemy.strength),
            defense: getStat(enemyProfile, 'defense', enemyEffort.defense, fatigue.enemy.defense)
        };

        let log = [];

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

        const executePhase = (attackerName, atkStat, defStat, setDefenderHp, isPlayer, currentDefHp, defMaxHp, isBonus, isCounter) => {
            const dmg = calculateDamage(atkStat, defStat, isBonus, isCounter);
            setDefenderHp(prev => Math.max(0, prev - dmg));

            const typeText = isCounter ? " (Contra-Ataque)" : "";
            const icon = isPlayer ? "⚔️" : "🛡️";
            log.push(`${icon} ${attackerName} causou ${dmg} dano!${typeText}`);

            return { dmg, remainingHp: Math.max(0, currentDefHp - dmg) };
        };

        // --- Turn Execution ---
        let currEnemyHp = enemyHp;
        let currMyHp = myHp;
        const myMaxHp = getMaxHp(myProfile);
        const enemyMaxHp = getMaxHp(enemyProfile);

        if (playerGoesFirst) {
            // 1. Player Attacks
            const pResult = executePhase("Você", pStats.strength, eStats.defense, setEnemyHp, true, currEnemyHp, enemyMaxHp, true, false);
            currEnemyHp = pResult.remainingHp;

            // 2. Counter-Attack Check
            // Condition: Defender Defense > Attacker Strength
            if (eStats.defense > pStats.strength) {
                if (currEnemyHp > 0) {
                    log.push("🛡️ Inimigo bloqueou e contra-atacou!");
                    const eResult = executePhase("Inimigo", eStats.strength, pStats.defense, setMyHp, false, currMyHp, myMaxHp, false, true);
                    currMyHp = eResult.remainingHp;
                }
            } else {
                log.push("💫 Inimigo não conseguiu contra-atacar (Defesa baixa).");
            }
        } else {
            // 1. Enemy Attacks
            const eResult = executePhase("Inimigo", eStats.strength, pStats.defense, setMyHp, false, currMyHp, myMaxHp, true, false);
            currMyHp = eResult.remainingHp;

            // 2. Counter-Attack Check
            if (pStats.defense > eStats.strength) {
                if (currMyHp > 0) {
                    log.push("🛡️ Você bloqueou e contra-atacou!");
                    const pResult = executePhase("Você", pStats.strength, eStats.defense, setEnemyHp, true, currEnemyHp, enemyMaxHp, false, true);
                    currEnemyHp = pResult.remainingHp;
                }
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

        setFatigue(newFatigue);

        return log;
    };

    const handleConfirmTurn = async () => {
        if (battleId) {
            // PVP Sync Mode
            setPhase('waiting');
            await ChallengeService.submitTurn(battleId, role, turn, effort);
        } else {
            // AI Mode (Keep old logic)
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
            const logs = calculateTurn(effort, enemyEffort);
            setBattleLog(logs);
        }
    };

    const handleNextTurn = () => {
        setTurn(prev => {
            const nextTurn = prev + 1;
            if (nextTurn > 3) { // End of 3rd turn
                setPhase('result');
                return prev;
            }

            // Reset for next turn
            setMyTurnConfirmed(false);
            setOpponentTurnConfirmed(false);
            setOpponentTactics(null);
            setPhase('setup');
            return nextTurn;
        });
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

                {/* Duel Animation Overlay */}
                {showDuelAnimation && (
                    <div style={{ position: 'absolute', zIndex: 2000, top: '0', left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
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
                    justifyContent: 'center', // Center Alignment
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
                                    isEnemy={myHp > enemyHp} // If I won, loser is enemy
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
                                    isEnemy={myHp <= enemyHp} // If I won, winner is me (not enemy)
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
                maxHeight: '45vh', // Slightly taller
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
                                        borderRadius: '12px', color: '#000', fontWeight: 'bold', fontSize: '1.1rem'
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
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    <span>📤</span> COMPARTILHAR RESULTADO
                                </button>
                                <button
                                    onClick={onExit}
                                    style={{
                                        marginTop: '10px',
                                        background: 'none', border: '1px solid #444', color: '#aaa',
                                        padding: '10px', borderRadius: '8px', width: '100%'
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
                            style={{
                                width: '100%', padding: '15px',
                                background: 'linear-gradient(90deg, #00f0ff, #0066ff)',
                                border: 'none', borderRadius: '12px',
                                color: '#000', fontWeight: 'bold', fontSize: '1.1rem',
                                marginTop: '1rem', boxShadow: '0 0 15px rgba(0,240,255,0.5)'
                            }}
                        >
                            CONFIRMAR TÁTICA
                        </button>
                    </div>
                ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', textAlign: 'center' }}>
                        {/* Battle Log */}
                        {battleLog.map((log, i) => (
                            <div key={i} style={{ marginBottom: '8px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                                {log}
                            </div>
                        ))}
                        <button
                            onClick={handleNextTurn}
                            style={{
                                marginTop: '10px',
                                width: '100%',
                                padding: '12px',
                                background: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            CONTINUAR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BattleArena;
