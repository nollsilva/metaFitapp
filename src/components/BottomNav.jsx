import React from 'react';

const BottomNav = ({ activeTab, setActiveTab }) => {
    return (
        <div className="mobile-nav mobile-only" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            background: 'rgba(10, 10, 12, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '10px 0',
            zIndex: 1000,
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))'
        }}>
            {/* <style> tag removed, converting to inline styles in the elements below for safety and zero warnings */}

            <div
                className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => setActiveTab('home')}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    color: activeTab === 'home' ? 'var(--color-primary, #00d4ff)' : '#888',
                    fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease', flex: 1
                }}
            >
                <span className="icon" style={{
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s',
                    transform: activeTab === 'home' ? 'scale(1.2)' : 'scale(1)',
                    filter: activeTab === 'home' ? 'drop-shadow(0 0 8px var(--color-primary, #00d4ff))' : 'none'
                }}>🏆</span>
                <span>Ranking</span>
            </div>

            <div
                className={`nav-item ${activeTab === 'workout' ? 'active' : ''}`}
                onClick={() => setActiveTab('workout')}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    color: activeTab === 'workout' ? 'var(--color-primary, #00d4ff)' : '#888',
                    fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease', flex: 1
                }}
            >
                <span className="icon" style={{
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s',
                    transform: activeTab === 'workout' ? 'scale(1.2)' : 'scale(1)',
                    filter: activeTab === 'workout' ? 'drop-shadow(0 0 8px var(--color-primary, #00d4ff))' : 'none'
                }}>💪</span>
                <span>Treino</span>
            </div>

            <div
                className={`nav-item ${activeTab === 'run' ? 'active' : ''}`}
                onClick={() => setActiveTab('run')}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    color: activeTab === 'run' ? 'var(--color-primary, #00d4ff)' : '#888',
                    fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease', flex: 1
                }}
            >
                <span className="icon" style={{
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s',
                    transform: activeTab === 'run' ? 'scale(1.2)' : 'scale(1)',
                    filter: activeTab === 'run' ? 'drop-shadow(0 0 8px var(--color-primary, #00d4ff))' : 'none'
                }}>🏃</span>
                <span>Corrida</span>
            </div>
        </div>
    );
};

export default BottomNav;
