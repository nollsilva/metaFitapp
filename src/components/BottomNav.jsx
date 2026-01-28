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
            <style jsx>{`
                .nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    color: #888;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    flex: 1;
                }
                .nav-item.active {
                    color: var(--color-primary, #00d4ff);
                }
                .nav-item.active .icon {
                    transform: scale(1.2);
                    filter: drop-shadow(0 0 8px var(--color-primary, #00d4ff));
                }
                .nav-item .icon {
                    font-size: 1.5rem;
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
            `}</style>

            <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                <span className="icon">🏆</span>
                <span>Ranking</span>
            </div>

            <div className={`nav-item ${activeTab === 'workout' ? 'active' : ''}`} onClick={() => setActiveTab('workout')}>
                <span className="icon">💪</span>
                <span>Treino</span>
            </div>

            <div className={`nav-item ${activeTab === 'run' ? 'active' : ''}`} onClick={() => setActiveTab('run')}>
                <span className="icon">🏃</span>
                <span>Corrida</span>
            </div>
        </div>
    );
};

export default BottomNav;
