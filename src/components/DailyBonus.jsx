import React, { useState, useEffect } from 'react';

const DailyBonus = ({ profile, onUpdateProfile }) => {
    const [today] = useState(new Date());
    const [status, setStatus] = useState('loading'); // loading, ready, claimed, missed_protected, missed_reset

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const todayIndex = today.getDay(); // 0 = Dom, 6 = Sab

    // Helper to calculate days diff
    const getDaysDifference = (date1, date2) => {
        const d1 = new Date(date1); d1.setHours(0, 0, 0, 0);
        const d2 = new Date(date2); d2.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(d2 - d1);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    useEffect(() => {
        if (!profile) return;

        const lastClaimStr = profile.lastClaimDate;
        const lastClaim = lastClaimStr ? new Date(lastClaimStr) : null;

        if (!lastClaim) {
            setStatus('ready');
            return;
        }

        const diff = getDaysDifference(lastClaim, today);

        if (diff === 0) {
            setStatus('claimed');
        } else if (diff === 1) {
            setStatus('ready');
        } else {
            // Diff > 1 means missed at least one day
            if (profile.hasShield) {
                setStatus('missed_protected');
            } else {
                setStatus('missed_reset');
            }
        }
    }, [profile, today]);

    const handleClaim = () => {
        if (status === 'claimed') return;

        let newStreak = (profile.streak || 0);
        let newXp = (profile.xp || 0);
        let newShield = profile.hasShield || false;
        let msg = '';
        let type = 'success';

        // Logic for missed days
        if (status === 'missed_reset') {
            newStreak = 1; // Reset to 1 (today)
            newShield = false;
            msg = 'Sequência reiniciada! Volte amanhã.';
        } else if (status === 'missed_protected') {
            newStreak += 1; // Keep streak going
            newShield = false; // Consume shield
            msg = 'Escudo usado! Sequência salva.';
            type = 'warning';
        } else if (status === 'ready') {
            newStreak += 1;
            msg = '+50 XP recebidos!';
        } else {
            newStreak = 1;
            msg = '+50 XP! Bem-vindo!';
        }

        // Daily Fixed XP
        newXp += 50;

        // Day 7 Logic (Only on Saturday if we strictly follow the week? Or just every 7 days?)
        // User asked for "Day 7" logic. In a fixed week, Day 7 is Saturday.
        // But if I started on Wednesday, my streak is lower.
        // Let's grant the Shield if (todayIndex === 6) OR (streak % 7 === 0) ?
        // The prompt says "No 7 dia é legal por escudo". 
        // Given the visual is now Fixed Week, "Day 7" visually corresponds to Saturday (Sab).
        // Let's attach the Shield Reward to Saturday claim.

        if (todayIndex === 6) { // It is Saturday
            if (newShield) {
                newXp += 100;
                msg = 'Sábado Bônus: Escudo convertido em +100 XP!';
            } else {
                newShield = true;
                msg = 'Sábado Bônus: Você ganhou um Escudo!';
            }
        }

        onUpdateProfile({
            lastClaimDate: new Date().toISOString(),
            streak: newStreak,
            xp: newXp,
            hasShield: newShield
        });

        alert(msg);
        setStatus('claimed');
    };

    // Shield status for UI
    const isProtected = status === 'missed_protected';
    const currentStreak = profile.streak || 0;

    return (
        <div style={{ width: '100%' }}>
            {/* Header com Status */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    fontSize: '3rem', fontWeight: '800',
                    background: 'linear-gradient(to right, #FFD700, #ffaa00)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
                }}>
                    DIA {todayIndex + 1}
                </div>
                <div style={{ fontSize: '1.1rem', color: '#fff', opacity: 0.9 }}>
                    Semana de Foco
                </div>
                {status === 'claimed' && (
                    <div className="animate-fade-in" style={{
                        marginTop: '10px', display: 'inline-block',
                        padding: '6px 16px', borderRadius: '20px',
                        background: 'rgba(0, 255, 102, 0.15)', color: '#00ff66',
                        border: '1px solid rgba(0, 255, 102, 0.3)', fontSize: '0.9rem'
                    }}>
                        ✓ Bônus Resgatado
                    </div>
                )}
            </div>

            {/* Grid de Dias */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)', // 4 colunas para comportar 7 dias e talvez 1 extra ou centralizar
                gap: '12px', marginBottom: '2rem'
            }}>
                {weekDays.map((dayName, index) => {
                    let isDone = false;
                    let isLocked = false;
                    let isToday = index === todayIndex;
                    let isMissed = false;

                    const daysAgo = todayIndex - index;

                    if (index > todayIndex) {
                        isLocked = true; // Future
                    } else if (index === todayIndex) {
                        isDone = status === 'claimed';
                    } else {
                        // Past logic simplified for visual
                        if (status === 'claimed') isDone = daysAgo < currentStreak;
                        else if (status === 'missed_reset') isDone = false;
                        else if (status === 'missed_protected') isDone = false;
                        else isDone = daysAgo <= currentStreak;
                    }

                    // Special styling for the 7th day (Shield)
                    const isBigReward = index === 6;

                    return (
                        <div key={dayName} style={{
                            gridColumn: isBigReward ? 'span 4' : 'auto', // O 7º dia ocupa linha inteira ou destaque
                            display: 'flex', flexDirection: isBigReward ? 'row' : 'column',
                            alignItems: 'center', justifyContent: isBigReward ? 'center' : 'center',
                            gap: isBigReward ? '16px' : '6px',
                            background: isToday ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            border: isToday ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '12px',
                            opacity: isLocked ? 0.4 : 1,
                            position: 'relative'
                        }}>
                            {isBigReward && (
                                <div style={{ fontSize: '2rem' }}>🛡️</div>
                            )}

                            {!isBigReward && (
                                <div style={{
                                    fontSize: '1.2rem',
                                    color: isDone ? 'var(--color-primary)' : (isMissed ? '#ff4444' : '#fff')
                                }}>
                                    {isDone ? '✓' : (isMissed ? '✕' : '●')}
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>
                                {dayName} {isBigReward && '- Super Bônus de Proteção'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Ação */}
            <div style={{ textAlign: 'center' }}>
                {status !== 'claimed' ? (
                    <button
                        onClick={handleClaim}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '16px 0',
                            fontSize: '1.1rem',
                            background: isProtected ? '#ffaa00' : 'var(--color-primary)',
                            color: '#000',
                            boxShadow: isProtected ? '0 0 20px rgba(255, 170, 0, 0.5)' : '0 0 20px rgba(0, 240, 255, 0.3)',
                            border: 'none', borderRadius: '12px'
                        }}
                    >
                        {isProtected ? 'USAR ESCUDO E SALVAR' : 'RESGATAR RECOMPENSA'}
                    </button>
                ) : (
                    <div style={{ fontSize: '0.9rem', color: '#888' }}>
                        Volte amanhã para continuar sua sequência!
                    </div>
                )}
            </div>

            {profile.hasShield && (
                <div style={{
                    marginTop: '1.5rem', padding: '10px',
                    background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.3)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: '#ffaa00', fontSize: '0.9rem'
                }}>
                    <span>🛡️</span> Você tem um Escudo de Proteção ativo!
                </div>
            )}
        </div>
    );
};

export default DailyBonus;
