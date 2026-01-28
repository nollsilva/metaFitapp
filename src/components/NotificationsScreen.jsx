import React, { useState, useEffect } from 'react';
import { getNotificationHistory, updateNotificationSettings, markAllRead } from '../utils/db';

const NotificationsScreen = ({ profile, onUpdateProfile }) => {
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'settings'
    const [notifications, setNotifications] = useState([]);
    const [settings, setSettings] = useState(profile?.notificationSettings || {
        water: true, meal: true, workout: true, run: true, ranking: true, inactivity: true
    });

    useEffect(() => {
        if (activeTab === 'history' && profile?.uid) {
            loadHistory();
        }
    }, [activeTab, profile]);

    const loadHistory = async () => {
        const data = await getNotificationHistory(profile.uid);
        setNotifications(data);
    };

    const handleMarkAllRead = async () => {
        await markAllRead(profile.uid);
        loadHistory(); // Refresh
    };

    const toggleSetting = async (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        // Optimistic update locally
        // onUpdateProfile({ notificationSettings: newSettings }); // Optional if parent relies on it
        // Persist to DB
        await updateNotificationSettings(profile.uid, newSettings);
    };

    const SwitchItem = ({ label, id, icon }) => (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
            marginBottom: '10px', border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                <span style={{ fontWeight: '500', fontSize: '1rem' }}>{label}</span>
            </div>
            <div
                onClick={() => toggleSetting(id)}
                style={{
                    width: '46px', height: '26px',
                    background: settings[id] ? '#00ff66' : '#444',
                    borderRadius: '20px', position: 'relative', cursor: 'pointer',
                    transition: 'background 0.3s'
                }}
            >
                <div style={{
                    width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                    position: 'absolute', top: '3px',
                    left: settings[id] ? '23px' : '3px',
                    transition: 'left 0.3s'
                }} />
            </div>
        </div>
    );

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '7rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1.5rem' }}>Notificações 🔔</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('history')}
                    className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '10px' }}
                >
                    Histórico
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '10px' }}
                >
                    Configurações
                </button>
            </div>

            {/* History Tab */}
            {activeTab === 'history' && (
                <div>
                    {notifications.length > 0 && notifications.some(n => !n.read) && (
                        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                            <button
                                onClick={handleMarkAllRead}
                                style={{ background: 'none', border: 'none', color: '#00ff66', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                Marcar todas como lidas
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#666', marginTop: '3rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
                                <p>Nenhuma notificação por enquanto.</p>
                            </div>
                        ) : (
                            notifications.map(note => (
                                <div key={note.id} style={{
                                    background: note.read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                                    padding: '15px', borderRadius: '12px',
                                    borderLeft: note.read ? '3px solid transparent' : '3px solid #00ff66',
                                    display: 'flex', gap: '15px'
                                }}>
                                    <div style={{ fontSize: '1.5rem' }}>{note.icon || '🔔'}</div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: note.read ? '#ccc' : '#fff' }}>{note.title}</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>{note.body}</p>
                                        <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '5px' }}>
                                            {note.timestamp ? new Date(note.timestamp).toLocaleString() : ''}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div>
                    <h3 style={{ color: '#888', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Preferências de Lembrete</h3>
                    <SwitchItem id="water" label="Beber Água 💧" icon="💧" />
                    <SwitchItem id="meal" label="Refeições 🍽" icon="🍽" />
                    <SwitchItem id="workout" label="Treinos 💪" icon="💪" />
                    <SwitchItem id="run" label="Corridas 🏃" icon="🏃" />
                    <SwitchItem id="ranking" label="Ranking 🏆" icon="🏆" />
                    <SwitchItem id="inactivity" label="Inatividade (+2 dias) ⏳" icon="⏳" />
                </div>
            )}
        </div>
    );
};

export default NotificationsScreen;
