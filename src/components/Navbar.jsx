import React from 'react';

const Navbar = ({ activeTab, setActiveTab, onOpenAuth, isLoggedIn, onLogout, onShowTutorial, onOpenHamburger }) => {
    return (
        <nav className="navbar">
            <div className="container nav-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="logo" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <img src="/logo.png" alt="MetaFit Logo" style={{ height: '50px', objectFit: 'contain' }} />
                </div>

                {/* Desktop Links - Optional, maybe hide if mobile-first approach is strict */}
                <div className="desktop-links mobile-hidden" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {/* Keep desktop links if needed, or rely on Hamburger for all */}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {!isLoggedIn && (
                        <button className="btn-primary" onClick={onOpenAuth} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>Entrar</button>
                    )}

                    <button
                        onClick={onOpenHamburger}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            fontSize: '2rem',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        ☰
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
