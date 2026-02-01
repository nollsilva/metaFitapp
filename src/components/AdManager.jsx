import React, { useState, useEffect } from 'react';

// --- MOCK AD CONFIG ---
const AD_DURATION_MS = 3000; // 3 seconds to simulate standard non-skip time (usually 30s)

export const BannerAd = ({ isVip }) => {
    if (isVip) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '60px',
            background: '#fff',
            borderTop: '2px solid #333',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 4000,
            boxShadow: '0 -5px 20px rgba(0,0,0,0.5)'
        }}>
            <div style={{
                color: '#333',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                border: '1px solid #ccc',
                padding: '5px 20px',
                background: '#eee'
            }}>
                [PUBLICIDADE: BANNER GOOGLE ADMOB]
            </div>
        </div>
    );
};

export const RewardedAdButton = ({ onReward, isVip, label = "Assistir Anúncio (+10% Bônus)" }) => {
    const [isWatching, setIsWatching] = useState(false);
    const [timeLeft, setTimeLeft] = useState(AD_DURATION_MS / 1000);
    const [rewardClaimed, setRewardClaimed] = useState(false);

    // Auto-claim for VIP
    useEffect(() => {
        if (isVip && !rewardClaimed) {
            onReward();
            setRewardClaimed(true);
        }
    }, [isVip, rewardClaimed, onReward]);

    const handleWatchAd = () => {
        setIsWatching(true);
        setTimeLeft(3);

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    finishAd();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const finishAd = () => {
        setIsWatching(false);
        setRewardClaimed(true);
        onReward();
    };

    if (isVip) {
        return (
            <div style={{
                padding: '10px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #ffd700',
                borderRadius: '8px',
                color: '#ffd700',
                textAlign: 'center',
                marginBottom: '10px',
                animation: 'pulse 2s infinite'
            }}>
                👑 Bônus VIP Aplicado Automaticamente! (+10%)
            </div>
        );
    }

    if (rewardClaimed) {
        return (
            <div style={{
                padding: '10px',
                background: 'rgba(0, 255, 102, 0.1)',
                border: '1px solid #00ff66',
                borderRadius: '8px',
                color: '#00ff66',
                textAlign: 'center',
                fontWeight: 'bold',
                marginBottom: '10px'
            }}>
                ✅ Recompensa Recebida!
            </div>
        );
    }

    return (
        <>
            <button
                onClick={handleWatchAd}
                className="btn-primary"
                style={{
                    background: 'linear-gradient(45deg, #1a73e8, #4285f4)',
                    color: '#fff',
                    border: 'none',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 0 15px rgba(66, 133, 244, 0.4)'
                }}
            >
                <span>🎬</span> {label}
            </button>

            {/* AD OVERLAY */}
            {isWatching && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', color: '#fff'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '20px' }}>📺 PUBLICIDADE</div>
                    <div style={{ fontSize: '1rem', color: '#aaa' }}>Simulando AdMob...</div>
                    <div style={{
                        marginTop: '30px',
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: '#00f0ff',
                        border: '4px solid #00f0ff',
                        borderRadius: '50%',
                        width: '80px', height: '80px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {timeLeft}
                    </div>
                </div>
            )}
        </>
    );
};
