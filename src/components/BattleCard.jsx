import React from 'react';
import { getBadgeConfig } from './BadgeIcons';

const BattleCard = ({ profile, health, maxHealth, isEnemy, activeTurn, resultStatus }) => {
    const healthPercent = Math.max(0, (health / maxHealth) * 100);
    const config = getBadgeConfig(profile.xp || 0);

    // Result Styles
    const isWinner = resultStatus === 'winner';
    const isLoser = resultStatus === 'loser';
    const isDiamond = profile.vip === 'diamond';

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

    const diamondGlow = isDiamond ? {
        border: '2px solid #b9f2ff',
        boxShadow: activeTurn ? '0 0 35px rgba(185, 242, 255, 0.6)' : '0 0 20px rgba(185, 242, 255, 0.3)',
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
            ...resultStyle,
            ...diamondGlow
        }}>
            {/* Avatar & Level */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    border: `3px solid ${isDiamond ? '#b9f2ff' : (isEnemy ? '#ff0055' : '#00f0ff')}`,
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative'
                }}>
                    {profile.avatar === 'logo' ? (
                        <img src="/logo.png" alt="MetaFit" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    ) : profile.avatar ? (
                        <img src={`/avatars/${profile.avatar}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                            {profile.name ? profile.name.substring(0, 2).toUpperCase() : 'JD'}
                        </div>
                    )}

                    {profile.vip && (
                        <img
                            src="/vip-frame.png"
                            alt="VIP Frame"
                            style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '155%', height: '155%',
                                zIndex: 20,
                                pointerEvents: 'none',
                                objectFit: 'contain'
                            }}
                        />
                    )}
                </div>
                <div style={{
                    position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)',
                    background: '#000', color: isDiamond ? '#b9f2ff' : '#ffd700', border: `1px solid ${isDiamond ? '#b9f2ff' : '#ffd700'}`,
                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                    zIndex: 30
                }}>
                    {isDiamond ? '💎 ' : ''}Lvl {profile.level || 1}
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

export default BattleCard;
