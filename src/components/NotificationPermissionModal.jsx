import React, { useState } from 'react';
import { getToken } from "firebase/messaging";
import { messaging } from '../lib/firebase'; // Use safe export
import { saveFCMToken, updateNotificationSettings } from '../utils/db';

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
                if (!messaging) {
                    console.warn("Messaging not supported/initialized");
                    // Continue flow even if messaging is not available (e.g. on host without support)
                    if (onPermissionGranted) onPermissionGranted();
                    return;
                }

                // Get Token
                const currentToken = await getToken(messaging, {
                    vapidKey: ''
                }).catch(err => console.log('An error occurred while retrieving token. ', err));

                if (currentToken) {
                    await saveFCMToken(profile.uid, currentToken);
                } else {
                    console.log('No registration token available.');
                }

                if (onPermissionGranted) onPermissionGranted();
            } else {
                console.log('Permission denied');
                // User denied, but we saved prefs. Close modal.
                onClose();
            }
        } catch (error) {
            console.error("Notification Setup Error:", error);
            onClose();
        } finally {
            setLoading(false);
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
