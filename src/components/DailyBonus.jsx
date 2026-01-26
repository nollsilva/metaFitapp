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
        <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)', border: '1px solid rgba(255,200,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📅 Bônus Semanal
                        {profile.hasShield && <span title="Escudo Ativo" style={{ fontSize: '1.2rem' }}>🛡️</span>}
                    </h3>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>
                        {status === 'claimed' ? 'Hoje completado!' : 'Não esqueça de marcar hoje!'}
                    </div>
                </div>
                <div>
                    {status !== 'claimed' && (
                        <button
                            onClick={handleClaim}
                            className="btn-primary"
                            style={{
                                padding: '8px 20px',
                                background: isProtected ? '#ffaa00' : 'var(--color-primary)',
                                color: isProtected ? '#000' : '#000',
                                boxShadow: isProtected ? '0 0 15px rgba(255, 170, 0, 0.4)' : 'none'
                            }}
                        >
                            {isProtected ? '🛡️ USAR ESCUDO' : `RECEBER (+50XP)`}
                        </button>
                    )}
                    {status === 'claimed' && (
                        <span style={{ color: '#00ff66', fontWeight: 'bold', fontSize: '0.9rem' }}>✓ Recebido</span>
                    )}
                </div>
            </div>

            {/* Steps Container */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {/* Progress Bar Background */}
                <div style={{
                    position: 'absolute', top: '50%', left: '0', right: '0', height: '4px',
                    background: 'rgba(255,255,255,0.1)', transform: 'translateY(-50%)', zIndex: 0
                }}></div>

                {/* Progress Fill - Calculated based on Today Index if claimed */}
                <div style={{
                    position: 'absolute', top: '50%', left: '0',
                    // Fill up to 'todayIndex' if claimed, or 'todayIndex - 1' if not.
                    width: `${((status === 'claimed' ? todayIndex : todayIndex - 1) / 6) * 100}%`,
                    height: '4px',
                    background: 'var(--color-primary)',
                    transform: 'translateY(-50%)',
                    zIndex: 0,
                    transition: 'width 0.5s ease'
                }}></div>

                {weekDays.map((dayName, index) => {
                    // Logic for Status of each Day
                    // Past Days (index < todayIndex):
                    //   - Need to know if they were claimed.
                    //   - Simple approximation: If current streak is long enough, assume yes.
                    //   - E.g. Streak=3, Today=Wed(3). Then Mon(1), Tue(2) were claimed.
                    //   - But index relative to today logic:
                    //   - daysAgo = todayIndex - index.
                    //   - claimed = currentStreak > daysAgo (if claimed today) or >= daysAgo (if not?)
                    //   Let's refine:
                    //   If status='claimed' (today included in streak): index is claimed if (todayIndex - index) < currentStreak.
                    //   If status!='claimed' (today NOT in streak): index is claimed if (todayIndex - index) <= currentStreak.

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
                        // Past
                        let effectivelyClaimed = false;
                        if (status === 'claimed') {
                            effectivelyClaimed = daysAgo < currentStreak;
                        } else {
                            // If I haven't claimed today, and streak is 5.
                            // Yesterday (1 day ago)? 1 <= 5 -> Yes.
                            effectivelyClaimed = daysAgo <= currentStreak;
                            // HOWEVER, if status is missed_reset, streak is technically 0?
                            // But 'currentStreak' is from profile state which might be old '7' if missed?
                            // Profile updates ONLY on claim.
                            // So if I missed yesterday, profile.streak is still high from day before yesterday?
                            // Wait, logic in 'useEffect' determined status.
                            // If status == 'missed_reset', then the visual streak is broken. 
                            // Past days of THIS week might show as Missed.
                            if (status === 'missed_reset') effectivelyClaimed = false;
                            if (status === 'missed_protected') effectivelyClaimed = false; // Actually shielded logic preserves streak number but visual?
                        }

                        if (effectivelyClaimed) {
                            isDone = true;
                        } else {
                            isMissed = true; // Was supposed to be done but wasn't logic? Or just Locked/Missed?
                            // User said: "os dias que ja passaram ficam bloqueados ate chegar nele de novo"
                        }
                    }

                    return (
                        <div key={dayName} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: isDone
                                    ? 'var(--color-primary)'
                                    : isMissed
                                        ? '#331111'
                                        : isToday
                                            ? 'var(--color-background)'
                                            : '#333',
                                border: isToday ? '2px solid var(--color-primary)' : (isMissed ? '2px solid #550000' : '2px solid transparent'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isDone ? '#000' : isToday ? 'var(--color-primary)' : isMissed ? '#772222' : '#666',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                boxShadow: isToday ? '0 0 10px var(--color-primary)' : 'none',
                                opacity: isLocked ? 0.5 : 1
                            }}>
                                {index === 6 ? (
                                    <span>🛡️</span>
                                ) : (
                                    isDone ? '✓' : isMissed ? '✕' : dayName.substring(0, 1) // First letter or DayName? User said "iniciais do nome" -> D, S, T... actually user "Dom, Seg" in request. Let's use 3 chars or 1?
                                    // User said "iniciais ... Dom, Seg..." -> These are 3 chars. Fits in 40px? Maybe small font.
                                )}
                            </div>
                            <div style={{ fontSize: '0.65rem', opacity: isToday || isDone ? 1 : 0.5 }}>
                                {dayName}
                            </div>
                        </div>
                    );
                })}
            </div>

            {status === 'missed_reset' && (
                <div style={{ marginTop: '1rem', color: '#ff4444', fontSize: '0.8rem', textAlign: 'center' }}>
                    Você perdeu a sequência! Dias anteriores bloqueados.
                </div>
            )}
            {status === 'missed_protected' && (
                <div style={{ marginTop: '1rem', color: '#ffaa00', fontSize: '0.8rem', textAlign: 'center' }}>
                    Escudo ativado!
                </div>
            )}

        </div>
    );
};

export default DailyBonus;
