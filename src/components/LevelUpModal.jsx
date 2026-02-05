import React, { useEffect, useState } from 'react';
import { getXpForNextLevel } from '../utils/rankingSystem';

const LevelUpModal = ({ level, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animation trigger
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const nextThreshold = getXpForNextLevel(level);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 15000,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease-out'
        }}>
            <div style={{
                position: 'relative',
                width: '90%',
                maxWidth: '400px',
                padding: '30px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)',
                border: '2px solid #ffd700',
                boxShadow: '0 0 50px rgba(255, 215, 0, 0.4)',
                textAlign: 'center',
                transform: isVisible ? 'scale(1)' : 'scale(0.8)',
                transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* Glow Effect Background */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0) 70%)',
                    zIndex: 0
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🚀</div>

                    <h2 style={{
                        color: '#ffd700',
                        fontSize: '1.8rem',
                        margin: '0 0 10px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                    }}>
                        Level Up!
                    </h2>

                    <div style={{
                        fontSize: '5rem',
                        fontWeight: '900',
                        background: 'linear-gradient(to bottom, #fff 0%, #ffd700 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: '10px 0',
                        filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.5))'
                    }}>
                        {level}
                    </div>

                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginBottom: '25px' }}>
                        Parabéns! Você alcançou um novo patamar de força.
                    </p>

                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginBottom: '25px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>Próximo Nível:</p>
                        <p style={{ margin: '5px 0 0 0', color: '#fff', fontWeight: 'bold' }}>{nextThreshold} XP</p>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(90deg, #ffd700 0%, #ffaa00 100%)',
                            color: '#000',
                            fontWeight: '900',
                            fontSize: '1.2rem',
                            border: 'none',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            boxShadow: '0 5px 20px rgba(255, 170, 0, 0.4)',
                            transition: 'transform 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LevelUpModal;
