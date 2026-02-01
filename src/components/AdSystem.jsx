import React, { useState, useEffect } from 'react';

// --- MOCK AD CONFIG ---
const AD_DURATION_MS = 3000; // 3 seconds to simulate standard non-skip time (usually 30s)

export const BannerAd = ({ isVip }) => {
    if (isVip) return null;

    // --- REAL ADS IMPLEMENTATION (Google AdSense / AdMob) ---
    // 1. Web: Insert <ins class="adsbygoogle" ... /> here.
    // 2. Mobile (Capacitor): Call AdMob.showBanner() in useEffect.

    // TEMP: Ads disabled by user request
    return null;
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

    const handleWatchAd = async () => {
        // --- REAL ADS IMPLEMENTATION ---

        // OPTION A:  MOCK (Current)
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

        // OPTION B: ADMOB (Mobile Native)
        // await AdMob.prepareRewardVideoAd({ adId: '...' });
        // await AdMob.showRewardVideoAd();
        // Listener -> finishAd();
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

    return null; // TEMP: Ads disabled by user request

};
