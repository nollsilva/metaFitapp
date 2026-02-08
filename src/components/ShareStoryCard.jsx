
import React from 'react';
import { BadgeIcon, getBadgeConfig } from './BadgeIcons';
import { getRankTitle } from '../utils/rankingSystem';

const ShareStoryCard = ({ id, type, data, isVip }) => {

    // Configurações
    const isWorkout = type === 'workout';
    const isRanking = type === 'ranking';

    // Container fixo para captura (Stories 9:16)
    // Usamos um tamanho menor base, e o html2canvas escala 2-3x
    const containerStyle = {
        width: '400px',
        height: '711px',
        background: isVip
            ? 'linear-gradient(135deg, #1a1200 0%, #000 100%)'
            : 'linear-gradient(135deg, #0a0a0c 0%, #151515 100%)',
        border: isVip ? '2px solid #FFD700' : 'none',
        position: 'fixed',
        top: '0',
        left: '-9999px',
        pointerEvents: 'none',
        zIndex: -1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem', // Reduced padding
        fontFamily: "'Inter', sans-serif",
        color: 'white',
        boxSizing: 'border-box'
    };

    const gradientText = isVip ? {
        background: 'linear-gradient(90deg, #FFD700, #FFA500)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    } : {
        background: 'linear-gradient(90deg, #00f0ff, #00ff66)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    // Sombra para melhorar leitura
    const textShadow = {
        textShadow: '0px 2px 4px rgba(0,0,0,0.8)'
    };

    return (
        <div id={id} style={containerStyle}>
            {/* Background Effects */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: isVip
                    ? 'radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.15) 0%, transparent 60%)'
                    : 'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.1) 0%, transparent 60%)',
                zIndex: 0
            }}></div>

            {/* App Header */}
            <div style={{ zIndex: 1, textAlign: 'center', marginTop: '1rem', width: '100%' }}>
                <div style={{
                    fontSize: '0.9rem',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: isVip ? '#FFD700' : 'rgba(255,255,255,0.7)',
                    marginBottom: '0.4rem',
                    ...textShadow,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    borderBottom: isVip ? '1px solid rgba(255, 215, 0, 0.3)' : 'none',
                    paddingBottom: isVip ? '5px' : '0'
                }}>
                    {isVip && <span style={{ fontSize: '1.2rem' }}>👑</span>} MetaFit App {isVip && <span style={{ fontSize: '1.2rem' }}>👑</span>}
                </div>
                {!isWorkout && (
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: '#fff', ...textShadow }}>
                        RANKING ATUAL
                    </h1>
                )}
            </div>

            {/* Content Area */}
            <div style={{
                zIndex: 1,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                gap: '1rem' // Reduced gap
            }}>

                {isWorkout && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', lineHeight: 1.1, ...gradientText, ...textShadow }}>
                                TREINO DE <br /> {data.duration || '0'} MIN <br /> CONCLUÍDO
                            </div>
                        </div>

                        {/* Medalha Centralizada */}
                        {data.xpTotal && (
                            <div style={{ transform: 'scale(1.1)', margin: '1rem 0' }}>
                                <BadgeIcon type={getBadgeConfig(data.xpTotal).icon} color={getBadgeConfig(data.xpTotal).color} />
                            </div>
                        )}

                        {/* Box de XP */}
                        <div style={{
                            padding: '0.8rem 2rem',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            textAlign: 'center',
                            backdropFilter: 'blur(5px)',
                            marginTop: '0.5rem'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>XP Conquistado</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff66', ...textShadow }}>+{data.xp || 0} XP</div>
                        </div>
                    </>
                )}

                {isRanking && (
                    <>
                        {/* Medalha Grande - Reduzida para 1.45x (approx 20% less than 1.8) */}
                        <div style={{
                            width: '180px',
                            height: '180px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <div style={{ transform: 'scale(1.45)' }}>
                                <BadgeIcon type={getBadgeConfig(data.xp).icon} color={getBadgeConfig(data.xp).color} />
                            </div>
                        </div>

                        {/* Posição */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem', color: isVip ? '#FFD700' : '#ccc', textTransform: 'uppercase', letterSpacing: '1px', ...textShadow }}>Posição Global</div>
                            <div style={{ fontSize: '5rem', lineHeight: 0.9, fontWeight: '900', ...gradientText, ...textShadow, filter: isVip ? 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' : 'none' }}>
                                #{data.rank || '-'}
                            </div>
                        </div>

                        {/* Nome do Rank */}
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '1px', color: '#fff', ...textShadow }}>
                                {getRankTitle(data.xp).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '1rem', color: '#888', marginTop: '0.3rem', ...textShadow }}>
                                {data.xp} XP Total
                            </div>
                        </div>
                    </>
                )}

            </div>

            {/* Footer */}
            <div style={{ zIndex: 1, textAlign: 'center', marginBottom: '1.5rem', opacity: 1, width: '100%' }}>

                {/* Streak Display */}
                {data.streak > 0 && (
                    <div style={{ marginBottom: '0.8rem', ...textShadow }}>
                        <span style={{ fontSize: '1.4rem' }}>🔥</span>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffaa00', marginLeft: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {data.streak} {data.streak === 1 ? 'Dia' : 'Dias'} Seguidos
                        </span>
                    </div>
                )}

                <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: isVip ? '#fff' : '#ccc', ...textShadow }}>Use já o MetaFit</p>
                <div style={{
                    fontWeight: 'bold',
                    color: isVip ? '#FFD700' : '#00f0ff',
                    fontSize: '0.9rem',
                    ...textShadow,
                    background: isVip ? 'rgba(0,0,0,0.5)' : 'transparent',
                    padding: isVip ? '4px 12px' : '0',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: isVip ? '1px solid rgba(255,215,0,0.3)' : 'none'
                }}>metafitapp.onrender.com</div>
            </div>

        </div>
    );
};

export default ShareStoryCard;
