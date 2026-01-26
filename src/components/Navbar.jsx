import React from 'react';

const Navbar = ({ activeTab, setActiveTab, onOpenAuth, isLoggedIn, onLogout, onShowTutorial }) => {
    const getTabId = (name) => {
        const map = { 'Início': 'home', 'Treino': 'workout', 'Dieta': 'diet', 'Perfil': 'tracker' };
        return map[name];
    };

    return (
        <nav className="navbar">
            <div className="container nav-content">
                <div className="logo" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
                    META<span className="title-gradient">FIT</span>
                </div>
                <ul className="nav-links">
                    {['Início', 'Treino', 'Dieta', 'Perfil'].map((item) => (
                        <li
                            key={item}
                            className={activeTab === getTabId(item) ? 'active' : ''}
                            onClick={() => setActiveTab(getTabId(item))}
                        >
                            {item}
                        </li>
                    ))}
                    <li onClick={onShowTutorial} style={{ color: '#D4AF37', cursor: 'pointer', fontWeight: 'bold' }}>
                        Ver Tutorial
                    </li>
                </ul>
                {!isLoggedIn ? (
                    <button className="btn-primary" onClick={onOpenAuth}>Entrar</button>
                ) : (
                    // Optional: Logout button or user info, but requirement was just hide entry button. 
                    // Adding small logout for convenience if onLogout is passed
                    onLogout && (
                        <button
                            className="btn-secondary"
                            style={{
                                fontSize: '0.9rem',
                                padding: '8px 16px',
                                color: '#ff4d4d',
                                borderColor: 'rgba(255, 77, 77, 0.5)',
                                fontWeight: '600'
                            }}
                            onClick={onLogout}
                        >
                            Sair
                        </button>
                    )
                )}
            </div>
        </nav>
    );
};

export default Navbar;
