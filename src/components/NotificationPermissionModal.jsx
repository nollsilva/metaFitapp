import React, { useState } from 'react';
import { getMessaging, getToken } from "firebase/messaging";
import { saveFCMToken, updateNotificationSettings } from '../utils/db'; // Assuming these are exported from db.js

const NotificationPermissionModal = ({ profile, onClose, onPermissionGranted }) => {
    const defaultSettings = {
        water: true,
        meal: true,
        workout: true,
        run: true,
        ranking: true,
        inactivity: true
    };

    const [settings, setSettings] = useState(profile?.notificationSettings || defaultSettings);
    const [step, setStep] = useState(1); // 1: Settings, 2: System Permission Request
    const [loading, setLoading] = useState(false);

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleContinue = async () => {
        if (!profile?.uid) return;
        setLoading(true);

        try {
            // 1. Save preferences first
            await updateNotificationSettings(profile.uid, settings);

            // 2. Request System Permission
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                const messaging = getMessaging();
                // Get Token (VAPID key is optional if not using web push protocol specific features, but good generic flow)
                // Replacing 'YOUR_PUBLIC_VAPID_KEY_HERE' with empty for now or standard retrieval
                const currentToken = await getToken(messaging, {
                    vapidKey: 'BMD2P3GXXXXXXXXX' // Placeholder, usually needed for Web Push. 
                    // If simple token, just getToken(messaging).
                }).catch(err => console.log('An error occurred while retrieving token. ', err));

                if (currentToken) {
                    await saveFCMToken(profile.uid, currentToken);
                    if (onPermissionGranted) onPermissionGranted();
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Permission denied');
            }
        } catch (error) {
            console.error("Notification Setup Error:", error);
        } finally {
            setLoading(false);
            onClose();
        }
    };

    const SwitchItem = ({ label, id, icon }) => (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
            marginBottom: '10px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{label}</span>
            </div>
            <div
                onClick={() => toggleSetting(id)}
                style={{
                    width: '40px', height: '22px',
                    background: settings[id] ? '#00ff66' : '#444',
                    borderRadius: '20px', position: 'relative', cursor: 'pointer',
                    transition: 'background 0.3s'
                }}
            >
                <div style={{
                    width: '18px', height: '18px', background: '#fff', borderRadius: '50%',
                    position: 'absolute', top: '2px',
                    left: settings[id] ? '20px' : '2px',
                    transition: 'left 0.3s'
                }} />
            </div>
        </div>
    );

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }}>
            <div className="card animate-fade-in" style={{
                background: '#1a1a1a', border: '1px solid #333',
                width: '90%', maxWidth: '400px', padding: '2rem',
                boxShadow: '0 0 30px rgba(0,255,102,0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔔</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Ative as Notificações</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                        Receba lembretes inteligentes para manter a constância nos seus treinos e dieta.
                    </p>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                    <SwitchItem id="water" label="Lembretes de Hidratação 💧" icon="" />
                    <SwitchItem id="meal" label="Lembretes de Refeição 🍽" icon="" />
                    <SwitchItem id="workout" label="Lembretes de Treino 💪" icon="" />
                    <SwitchItem id="run" label="Lembretes de Corrida 🏃" icon="" />
                    <SwitchItem id="ranking" label="Atualizações de Ranking 🏆" icon="" />
                    <SwitchItem id="inactivity" label="Aviso de Inatividade ⏳" icon="" />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '12px' }}
                    >
                        Agora não
                    </button>
                    <button
                        onClick={handleContinue}
                        className="btn-primary"
                        style={{ flex: 1, padding: '12px', background: '#00ff66', color: '#000' }}
                        disabled={loading}
                    >
                        {loading ? 'Ativando...' : 'Permitir'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationPermissionModal;
