import React from 'react';

const HamburgerMenu = ({ isOpen, onClose, activeTab, setActiveTab, onLogout, profile, notificationBonus, notificationRequests }) => {
    if (!isOpen) return null;

    const handleNav = (tab) => {
        setActiveTab(tab);
        onClose();
    };

    const menuItems = [
        { id: 'tracker', label: 'Perfil', icon: '👤', hasNotification: notificationRequests, notificationColor: '#00ff66' },
        { id: 'diet', label: 'Dieta', icon: '🥗' },
        // Bonus and Help might trigger modals instead of tabs, we'll handle that passed in props or just tabs
        { id: 'bonus', label: 'Bônus Diário', icon: '🎁', action: 'bonus', hasNotification: notificationBonus, notificationColor: '#ff0055' },
        { id: 'help', label: 'Ajuda', icon: '❓', action: 'help' },
    ];

    return (
        <div className="hamburger-menu-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 2000,
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s',
            backdropFilter: 'blur(3px)'
        }}>
            <div className="hamburger-menu-content" onClick={e => e.stopPropagation()} style={{
                position: 'absolute',
                top: 0,
                right: 0, // Opens from right
                width: '75%',
                maxWidth: '300px',
                height: '100%',
                background: '#1a1a1a',
                borderLeft: '1px solid #333',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '-5px 0 20px rgba(0,0,0,0.5)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                }}>✕</button>

                <div className="user-info" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', margin: '0 auto 10px',
                        borderRadius: '50%', background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 'bold', border: '3px solid #fff'
                    }}>
                        {profile?.avatar ? (
                            <img src={`/avatars/${profile.avatar}.png`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (profile?.name?.substring(0, 2).toUpperCase() || '👤')}
                    </div>
                    <h3 style={{ margin: 0 }}>{profile?.name || 'Visitante'}</h3>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>Nível {profile?.level || 1}</p>
                </div>

                <div className="menu-items" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {menuItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.action === 'bonus') {
                                    handleNav('bonus'); // Special case mainly handled in parent or here
                                } else if (item.action === 'help') {
                                    handleNav('help');
                                } else {
                                    handleNav(item.id);
                                }
                            }}
                            style={{
                                padding: '15px',
                                borderRadius: '10px',
                                background: activeTab === item.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                color: activeTab === item.id ? 'var(--color-primary)' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                            <span style={{ fontSize: '1rem', fontWeight: '500', flex: 1 }}>{item.label}</span>
                            {item.hasNotification && (
                                <span style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: item.notificationColor || 'red',
                                    boxShadow: `0 0 5px ${item.notificationColor || 'red'}`
                                }}></span>
                            )}
                        </div>
                    ))}

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }}></div>

                    <div
                        onClick={() => { onClose(); onLogout(); }}
                        style={{
                            padding: '15px',
                            borderRadius: '10px',
                            color: '#ff4d4d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🚪</span>
                        <span style={{ fontSize: '1rem', fontWeight: '500' }}>Sair</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HamburgerMenu;
