import React from 'react';

export const BadgeIcon = ({ type }) => {

    const imageBadges = {
        bronze: { src: '/badges/badge_iniciante.png', alt: 'Iniciante' },
        bronze2: { src: '/badges/badge_bronze_2.png', alt: 'Iniciante II' },
        bronze3: { src: '/badges/badge_bronze_3.png', alt: 'Iniciante III' },
        silver: { src: '/badges/badge_praticante.png', alt: 'Praticante' },
        silver2: { src: '/badges/badge_silver_2.png', alt: 'Praticante II' },
        silver3: { src: '/badges/badge_silver_3.png', alt: 'Praticante III' },
        gold: { src: '/badges/badge_atleta.png', alt: 'Atleta' },
        gold2: { src: '/badges/badge_atleta_2.png', alt: 'Atleta II' },
        gold3: { src: '/badges/badge_atleta_3.png', alt: 'Atleta III' },
        diamond: { src: '/badges/badge_elite.png', alt: 'Elite' },
        diamond2: { src: '/badges/badge_elite_2.png', alt: 'Elite II' },
        diamond3: { src: '/badges/badge_elite_3.png', alt: 'Elite III' },
        legendary: { src: '/badges/badge_lenda.png', alt: 'Lenda' }
    };

    const badge = imageBadges[type] || imageBadges['bronze'];

    if (!badge) return null;

    return (
        <>
            <style>
                {`
                    @keyframes badgeFloat {
                        0% { transform: translateY(0px) rotateX(0deg); }
                        50% { transform: translateY(-3px) rotateX(10deg); }
                        100% { transform: translateY(0px) rotateX(0deg); }
                    }
                `}
            </style>
            <img
                src={badge.src}
                alt={badge.alt}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 5px 4px rgba(0,0,0,0.5))',
                    animation: 'badgeFloat 3s ease-in-out infinite'
                }}
            />
        </>
    );
};

export const getBadgeConfig = (xp) => {
    const val = xp || 0;

    // Bronze (0 - 8,999)
    if (val < 3000) return { icon: 'bronze', color: '#cd7f32' };     // 0 - 2999
    if (val < 6000) return { icon: 'bronze2', color: '#cd7f32' };    // 3000 - 5999
    if (val < 9000) return { icon: 'bronze3', color: '#cd7f32' };    // 6000 - 8999

    // Silver (9,000 - 20,999)
    if (val < 13000) return { icon: 'silver', color: '#c0c0c0' };    // 9000 - 12999
    if (val < 17000) return { icon: 'silver2', color: '#c0c0c0' };   // 13000 - 16999
    if (val < 21000) return { icon: 'silver3', color: '#c0c0c0' };   // 17000 - 20999

    // Gold (21,000 - 35,999)
    if (val < 26000) return { icon: 'gold', color: '#ffd700' };      // 21000 - 25999
    if (val < 31000) return { icon: 'gold2', color: '#ffd700' };     // 26000 - 30999
    if (val < 36000) return { icon: 'gold3', color: '#ffd700' };     // 31000 - 35999

    // Platinum (36,000 - 53,999) - Uses previous "Diamond/Elite" assets
    if (val < 42000) return { icon: 'diamond', color: '#b9f2ff' };   // 36000 - 41999
    if (val < 48000) return { icon: 'diamond2', color: '#b9f2ff' };  // 42000 - 47999
    if (val < 54000) return { icon: 'diamond3', color: '#b9f2ff' };  // 48000 - 53999

    // Diamond (54,000+) - Uses previous "Legendary" asset
    return { icon: 'legendary', color: '#d500f9' };
};
