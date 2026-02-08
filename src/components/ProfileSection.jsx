import React, { useState, useEffect } from 'react';
import { updateUser } from '../utils/db'; // Ensure this is imported effectively or passed down
import { sendRankUpEmail } from '../utils/email';
import { updateEmail, updateProfile as updateAuthProfile, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import AdminPanel from './AdminPanel';
import DailyBonus from './DailyBonus';
import FriendRequests from './FriendRequests';

const getRankTitle = (level) => {
    if (level < 5) return 'Iniciante';
    if (level < 10) return 'Praticante';
    if (level < 20) return 'Atleta';
    if (level < 50) return 'Elite';
    return 'Lenda';
};

const avatars = {
    male: [
        'avatar_m1', 'avatar_m2', 'avatar_m3', 'avatar_m4', 'avatar_m5',
        'avatar_m6', 'avatar_m7', 'avatar_m8', 'avatar_m9'
    ],
    female: [
        'avatar_f1', 'avatar_f2', 'avatar_f3', 'avatar_f4', 'avatar_f5',
        'avatar_f6'
    ]
};

const ProfileSection = ({ profile, onOpenAuth, onUpdateProfile, onDeleteAccount }) => { // onUpdateProfile passed from App
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false); // Admin Toggle
    const IS_ADMIN = profile?.email === "nollramsilva9@gmail.com";

    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
    const [showXpHistory, setShowXpHistory] = useState(false);

    // Delete Account State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Edit Form State
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [editError, setEditError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Avatar Selection State
    const [tempAvatar, setTempAvatar] = useState(null);
    const [avatarTab, setAvatarTab] = useState('male'); // 'male' | 'female'

    // History Collapsible State
    const [expandedDays, setExpandedDays] = useState([]);

    useEffect(() => {
        // Expand TODAY by default on mount using LOCAL time
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        setExpandedDays([todayStr]);
    }, []);

    const toggleDay = (dateKey) => {
        setExpandedDays(prev => {
            if (prev.includes(dateKey)) {
                return prev.filter(d => d !== dateKey);
            } else {
                return [...prev, dateKey];
            }
        });
    };


    const openEditModal = () => {
        setEditName(profile.name || profile.userName || '');
        setEditEmail(profile.email || '');
        setNewPassword('');
        setConfirmPassword('');
        setEditError('');
        setSuccessMsg('');
        setSuccessMsg('');
        setShowDeleteConfirm(false);
        setIsEditModalOpen(true);
    };

    const openAvatarModal = () => {
        if (!profile.isLoggedIn) return;
        setTempAvatar(profile.avatar || null);
        setIsAvatarModalOpen(true);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setEditError('');
        setSuccessMsg('');
        setEditLoading(true);

        try {
            const updates = {};
            let hasChanges = false;
            let passChanged = false;

            // 1. Update Name
            if (editName !== (profile.name || profile.userName)) {
                if (auth.currentUser) {
                    await updateAuthProfile(auth.currentUser, { displayName: editName });
                }
                updates.name = editName;
                hasChanges = true;
            }

            // 2. Update Email (Sensitive!)
            if (editEmail !== profile.email && editEmail) {
                if (auth.currentUser) {
                    await updateEmail(auth.currentUser, editEmail);
                    updates.email = editEmail;
                    hasChanges = true;
                }
            }

            // 3. Update Password
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    setEditError('As senhas não coincidem.');
                    setEditLoading(false);
                    return;
                }
                if (newPassword.length < 6) {
                    setEditError('A senha deve ter pelo menos 6 caracteres.');
                    setEditLoading(false);
                    return;
                }

                if (auth.currentUser) {
                    await updatePassword(auth.currentUser, newPassword);
                    passChanged = true;
                }
            }

            if (hasChanges) {
                onUpdateProfile(updates);
            }

            setSuccessMsg(`Dados ${passChanged ? 'e senha ' : ''}atualizados com sucesso!`);
            setTimeout(() => {
                setIsEditModalOpen(false);
            }, 1500);

        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                setEditError('Para mudar email ou senha, faça logout e login novamente.');
            } else {
                setEditError('Erro: ' + error.message);
            }
        } finally {
            setEditLoading(false);
        }
    };



    const updateBiometrics = (field, value) => {
        const updated = { ...profile, [field]: value };

        // Calculate TDEE if all fields present
        if (updated.weight && updated.height && updated.age && updated.gender && updated.activityLevel) {
            let bmr;
            const w = parseFloat(updated.weight);
            const h = parseFloat(updated.height);
            const a = parseFloat(updated.age);

            if (updated.gender === 'male') {
                bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
            } else {
                bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
            }

            const activityMultipliers = {
                'sedentary': 1.2,
                'light': 1.375,
                'moderate': 1.55,
                'active': 1.725,
                'very_active': 1.9
            };

            const tdee = Math.round(bmr * (activityMultipliers[updated.activityLevel] || 1.2));

            // Adjust for Goal
            let goalAdjustment = 0;
            if (updated.goal === 'lose') goalAdjustment = -500;
            if (updated.goal === 'gain') goalAdjustment = 500;

            const finalCalories = Math.max(1200, tdee + goalAdjustment); // Min 1200 safety net

            onUpdateProfile({ [field]: value, targetCalories: finalCalories });
        } else {
            onUpdateProfile({ [field]: value });
        }
    };

    const confirmAvatarSelection = () => {
        if (tempAvatar) {
            onUpdateProfile({ avatar: tempAvatar });
        }
        setIsAvatarModalOpen(false);
    };

    // Calculate Bonus Notification
    const checkBonusReady = () => {
        if (!profile || !profile.lastClaimDate) return true; // Never claimed = Ready
        const last = new Date(profile.lastClaimDate);
        const today = new Date();
        // Check if different days
        return last.toDateString() !== today.toDateString();
    };
    const isBonusReady = profile.isLoggedIn && checkBonusReady();

    // Calculate Friend Request Notifications
    const hasPendingRequests = profile.friendRequests && profile.friendRequests.length > 0;
    const hasAcceptedRequests = profile.friendRequestsAccepted && profile.friendRequestsAccepted.length > 0;

    return (
        <section className="container" style={{ paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                <div
                    onClick={openAvatarModal}
                    style={{
                        width: '90px', height: '90px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #eee, #999)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 'bold', color: '#333',
                        cursor: profile.isLoggedIn ? 'pointer' : 'default',
                        cursor: profile.isLoggedIn ? 'pointer' : 'default',
                        overflow: 'hidden', // Ensure image stays in circle
                        position: 'relative',
                        border: '3px solid var(--color-primary)',
                        transition: 'transform 0.2s',
                        flexShrink: 0 // Prevent squashing
                    }}
                    className={profile.isLoggedIn ? "hover-scale" : ""}
                >
                    {profile.avatar ? (
                        <img src={`/avatars/${profile.avatar}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', position: 'relative', zIndex: 5 }} />
                    ) : (
                        <div style={{ position: 'relative', zIndex: 5 }}>
                            {(profile.name || profile.userName) ? (profile.name || profile.userName).substring(0, 2).toUpperCase() : 'JD'}
                        </div>
                    )}
                    {profile.isLoggedIn && (
                        <div style={{
                            position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)',
                            fontSize: '0.6rem', color: '#fff', textAlign: 'center', padding: '2px', zIndex: 6,
                            borderBottomLeftRadius: '50px', borderBottomRightRadius: '50px'
                        }}>Editar</div>
                    )}
                    {(isBonusReady || hasPendingRequests) && (
                        <div style={{
                            position: 'absolute', top: '0', right: '0',
                            width: '18px', height: '18px', background: '#ff0055',
                            borderRadius: '50%', border: '2px solid #000', zIndex: 7
                        }}></div>
                    )}
                    {profile.vip && (
                        <img
                            src="/vip-frame.png?v=2"
                            alt="VIP Frame"
                            style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '155%', height: '155%',
                                zIndex: 10,
                                pointerEvents: 'none',
                                objectFit: 'contain'
                            }}
                        />
                    )}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ marginBottom: '0.2rem', fontSize: '1.5rem' }}>
                            {profile.vip && <span style={{ marginRight: '5px' }}>👑</span>}
                            {profile.isLoggedIn ? (profile.name || profile.userName) : 'Perfil'}
                        </h1>
                        {profile.isLoggedIn && (
                            <button
                                onClick={openEditModal}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.7
                                }}
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    <div style={{ fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Nível {profile.level || 1}</span>
                        <span style={{ margin: '0 8px', color: '#666' }}>•</span>
                        <span>{getRankTitle(profile.level || 1)}</span>
                    </div>
                    {profile.isLoggedIn && (
                        <div style={{ marginTop: '8px', width: '100%', maxWidth: '200px' }}>
                            <div style={{
                                height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px', overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%', width: `${((profile.xp || 0) % 1000) / 10}%`,
                                    background: 'var(--color-primary)', transition: 'width 0.5s ease'
                                }}></div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                                <span>{(profile.xp || 0) % 1000} / 1000 XP</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* XP History Modal MOVED TO BOTTOM */}
            {
                showXpHistory && (
                    <div className="modal-overlay" onClick={() => setShowXpHistory(false)} style={{ zIndex: 10000 }}>
                        <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Histórico de XP</h3>
                                <button onClick={() => setShowXpHistory(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                                {(!profile.xpHistory || profile.xpHistory.length === 0) ? (
                                    <p style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>Nenhum registro de XP ainda.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* GROUPED HISTORY Logic */}
                                        {(() => {
                                            const grouped = {};
                                            if (Array.isArray(profile.xpHistory)) {
                                                profile.xpHistory.forEach(item => {
                                                    let dateKey;
                                                    try {
                                                        // Convert everything to a Date object first
                                                        let d;
                                                        if (item.date && typeof item.date === 'string') {
                                                            d = new Date(item.date);
                                                        } else if (item.date && item.date.toDate) {
                                                            d = item.date.toDate();
                                                        } else if (item.date instanceof Date) {
                                                            d = item.date;
                                                        } else {
                                                            d = new Date();
                                                        }

                                                        // Get LOCAL YYYY-MM-DD
                                                        const year = d.getFullYear();
                                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                                        const day = String(d.getDate()).padStart(2, '0');
                                                        dateKey = `${year}-${month}-${day}`;

                                                    } catch (e) {
                                                        const d = new Date();
                                                        dateKey = d.toISOString().split('T')[0];
                                                    }

                                                    if (!grouped[dateKey]) grouped[dateKey] = [];
                                                    grouped[dateKey].push(item);
                                                });
                                            }

                                            const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

                                            return sortedDates.map(dateStr => {
                                                const items = grouped[dateStr];
                                                // Create date object from the YYYY-MM-DD string (treated as local midnight)
                                                // We act as if this string IS local time by appending T00:00:00 and letting logic handle it?
                                                // Actually, simpler: comparing YYYY-MM-DD strings directly is safest.

                                                const d = new Date();
                                                const tYear = d.getFullYear();
                                                const tMonth = String(d.getMonth() + 1).padStart(2, '0');
                                                const tDay = String(d.getDate()).padStart(2, '0');
                                                const today = `${tYear}-${tMonth}-${tDay}`;

                                                const yD = new Date(Date.now() - 86400000);
                                                const yYear = yD.getFullYear();
                                                const yMonth = String(yD.getMonth() + 1).padStart(2, '0');
                                                const yDay = String(yD.getDate()).padStart(2, '0');
                                                const yesterday = `${yYear}-${yMonth}-${yDay}`;

                                                let displayDateHeader = "";

                                                // Format DD/MM
                                                const [year, month, day] = dateStr.split('-');
                                                const formattedDate = `${day}/${month}`;

                                                // Get Weekday
                                                // Important: dateStr is YYYY-MM-DD. new Date(dateStr) might be UTC or Local depending on browser.
                                                // safer: new Date(year, month-1, day)
                                                const dateObj = new Date(year, month - 1, day);
                                                const days = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
                                                const weekDay = days[dateObj.getDay()];

                                                if (dateStr === today) {
                                                    displayDateHeader = `HOJE ${formattedDate}`;
                                                } else if (dateStr === yesterday) {
                                                    displayDateHeader = `ONTEM ${formattedDate}`;
                                                } else {
                                                    displayDateHeader = `${weekDay} ${formattedDate}`;
                                                }

                                                // CALCULATE DAILY SUMMARY
                                                const summary = {
                                                    total: 0,
                                                    sources: {}
                                                };

                                                items.forEach(i => {
                                                    if (i.amount > 0) summary.total += i.amount;
                                                });

                                                const isExpanded = expandedDays.includes(dateStr);

                                                return (
                                                    <div key={dateStr} style={{ marginBottom: '15px' }}>
                                                        <div
                                                            onClick={() => toggleDay(dateStr)}
                                                            style={{
                                                                fontSize: '1rem', fontWeight: '900', color: '#fff',
                                                                marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px',
                                                                background: 'linear-gradient(90deg, #333, transparent)',
                                                                padding: '12px 15px', borderRadius: '8px',
                                                                borderLeft: '4px solid var(--color-primary)',
                                                                cursor: 'pointer',
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                transition: 'background 0.2s'
                                                            }}>
                                                            <span>{displayDateHeader}</span>
                                                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                                {isExpanded ? '▼' : '▶'}
                                                            </span>
                                                        </div>

                                                        {/* DETAILED LIST - Collapsible */}
                                                        {isExpanded && (
                                                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px', marginTop: '10px' }}>
                                                                {items.map((item, idx) => (
                                                                    <div key={item.id || idx} style={{
                                                                        background: 'rgba(255,255,255,0.02)',
                                                                        padding: '12px',
                                                                        borderRadius: '8px',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        borderLeft: item.amount >= 0 ? '2px solid #00ff66' : '2px solid #ff0055'
                                                                    }}>
                                                                        <div>
                                                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#eee' }}>{item.reason || 'XP Geral'}</div>
                                                                        </div>
                                                                        <div style={{
                                                                            fontWeight: '900',
                                                                            color: item.amount >= 0 ? '#00ff66' : '#ff0055',
                                                                            fontSize: '1rem'
                                                                        }}>
                                                                            {item.amount >= 0 ? '+' : ''}{item.amount} XP
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Avatar Selection Modal */}
            {
                isAvatarModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsAvatarModalOpen(false)} style={{ zIndex: 10000 }}>
                        <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Escolha seu Avatar</h3>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                                <button
                                    onClick={() => setAvatarTab('male')}
                                    className={avatarTab === 'male' ? 'btn-primary' : 'btn-secondary'}
                                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                                >
                                    Masculino
                                </button>
                                <button
                                    onClick={() => setAvatarTab('female')}
                                    className={avatarTab === 'female' ? 'btn-primary' : 'btn-secondary'}
                                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                                >
                                    Feminino
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '2rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {avatars[avatarTab].map(av => (
                                    <div
                                        key={av}
                                        onClick={() => setTempAvatar(av)}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: '50%',
                                            border: tempAvatar === av ? '3px solid var(--color-primary)' : '3px solid transparent',
                                            opacity: tempAvatar === av ? 1 : 0.7,
                                            overflow: 'hidden',
                                            transition: 'all 0.2s',
                                            aspectRatio: '1/1',
                                            transform: tempAvatar === av ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                    >
                                        <img src={`/avatars/${av}.png`} alt={av} style={{ width: '100%', height: '100%' }} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setIsAvatarModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                <button onClick={confirmAvatarSelection} className="btn-primary" style={{ flex: 1 }}>Salvar Avatar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bonus Modal - Only if Logged In */}
            {
                isBonusModalOpen && profile.isLoggedIn && (
                    <div className="modal-overlay" onClick={() => setIsBonusModalOpen(false)} style={{ zIndex: 10000 }}>
                        <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '2rem', background: '#111', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsBonusModalOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>
                            <DailyBonus profile={profile} onUpdateProfile={onUpdateProfile} />
                        </div>
                    </div>
                )
            }



            {/* Friend Requests Modal - Only if Logged In */}
            {
                isRequestsModalOpen && profile.isLoggedIn && (
                    <div className="modal-overlay" onClick={() => setIsRequestsModalOpen(false)} style={{ zIndex: 10000 }}>
                        <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '2rem', background: '#111', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsRequestsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>
                            <FriendRequests
                                profile={profile}
                                onUpdateProfile={onUpdateProfile}
                                onClose={() => setIsRequestsModalOpen(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* Main Action Buttons Area */}
            {
                profile.isLoggedIn && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>

                        {/* Bonus button removed as requested */}

                        <button
                            className="btn-primary"
                            onClick={() => setIsRequestsModalOpen(true)}
                            style={{
                                flex: 1, position: 'relative',
                                background: 'linear-gradient(135deg, #FFD700, #ffaa00)', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                color: '#000', fontWeight: 'bold',
                                overflow: 'visible' // Allow dot to be seen
                            }}
                        >
                            👥 Solicitações
                            {hasPendingRequests && (
                                <div style={{
                                    position: 'absolute', top: '-5px', right: '-5px',
                                    width: '12px', height: '12px', background: '#ff0055',
                                    borderRadius: '50%', border: '2px solid #000'
                                }}></div>
                            )}
                            {hasAcceptedRequests && !hasPendingRequests && (
                                <div style={{
                                    position: 'absolute', top: '-5px', right: '-5px',
                                    width: '12px', height: '12px', background: '#00ff66',
                                    borderRadius: '50%', border: '2px solid #000'
                                }}></div>
                            )}
                        </button>

                        <button
                            className="btn-secondary"
                            onClick={() => setShowXpHistory(true)}
                            style={{
                                flex: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                fontWeight: 'bold', border: '1px solid #333',
                                padding: '12px 32px', borderRadius: '50px', minHeight: '48px', // Match btn-primary
                                background: '#333', color: '#fff', border: 'none'
                            }}
                        >
                            📜 Histórico
                        </button>
                    </div>
                )
            }

            {/* INVITE LINK SECTION */}
            {
                profile.isLoggedIn && (profile.name || profile.userName) && (
                    <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(0,0,0,0))', borderColor: '#ffd700' }}>
                        <h3 style={{ marginBottom: '10px', color: '#ffd700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🎟️</span> Link de Convite (+100 XP)
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '1rem' }}>
                            Envie para amigos. Quando eles criarem conta, ambos ganham bônus!
                        </p>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{
                                flex: 1, background: 'rgba(0,0,0,0.5)', padding: '10px',
                                borderRadius: '8px', fontSize: '0.8rem', color: '#888',
                                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                fontFamily: 'monospace'
                            }}>
                                {(() => {
                                    // SECURE LINK LOGIC: Force HTTPS unless strictly localhost
                                    const origin = window.location.origin;
                                    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168');
                                    const protocol = isLocal ? origin.split('//')[0] : 'https:';
                                    const host = origin.split('//')[1];
                                    return `${protocol}//${host}/?ref=${profile.id}`;
                                })()}
                            </div>
                            <button
                                onClick={() => {
                                    const origin = window.location.origin;
                                    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168');
                                    const protocol = isLocal ? origin.split('//')[0] : 'https:';
                                    const host = origin.split('//')[1]; // Remove existing protocol to replace cleanly
                                    const link = `${protocol}//${host}/?ref=${profile.id}`;

                                    navigator.clipboard.writeText(link);
                                    alert("Link copiado! Envie para seus amigos via WhatsApp ou Telegram.");
                                }}
                                className="btn-primary"
                                style={{ width: 'auto', padding: '0 20px', background: '#333' }}
                            >
                                Copiar
                            </button>
                        </div>
                    </div>
                )
            }

            {/* BMI Calculator Section */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚖️ Calculadora Metabólica
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                    {/* Weight */}
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Peso (kg)</label>
                        <input
                            type="number"
                            placeholder="Ex: 70"
                            value={profile.weight || ''}
                            onChange={(e) => updateBiometrics('weight', e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                    </div>
                    {/* Height */}
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Altura (cm)</label>
                        <input
                            type="number"
                            placeholder="Ex: 175"
                            value={profile.height || ''}
                            onChange={(e) => updateBiometrics('height', e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                    </div>
                    {/* Age */}
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Idade</label>
                        <input
                            type="number"
                            placeholder="Ex: 25"
                            value={profile.age || ''}
                            onChange={(e) => updateBiometrics('age', e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                    </div>
                    {/* Gender */}
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Gênero</label>
                        <select
                            value={profile.gender || 'male'}
                            onChange={(e) => updateBiometrics('gender', e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                        </select>
                    </div>
                    {/* Activity Level - Full Width */}
                    <div style={{ gridColumn: '1 / -1', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>
                            Nível de Atividade Atual <span style={{ fontSize: '0.7em', color: '#666' }}>(Seja sincero!)</span>
                        </label>
                        <select
                            value={profile.activityLevel || 'moderate'}
                            onChange={(e) => updateBiometrics('activityLevel', e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                            <option value="sedentary">Sedentário (Pouco ou nenhum exercício)</option>
                            <option value="light">Levemente Ativo (Exercício leve 1-3 dias/sem)</option>
                            <option value="moderate">Moderadamente Ativo (Exercício moderado 3-5 dias/sem)</option>
                            <option value="active">Muito Ativo (Exercício pesado 6-7 dias/sem)</option>
                            <option value="very_active">Extremamente Ativo (Exercício muito pesado + trabalho físico)</option>
                        </select>
                    </div>
                    {/* Goal - Full Width */}
                    <div style={{ gridColumn: '1 / -1', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>Objetivo</label>
                        <select
                            value={profile.goal || 'maintain'}
                            onChange={(e) => updateBiometrics('goal', e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                            <option value="lose">Perder Peso (-500kcal)</option>
                            <option value="maintain">Manter Peso</option>
                            <option value="gain">Ganhar Massa (+500kcal)</option>
                        </select>
                    </div>
                </div>

                {/* Calculation Display */}
                {(() => {
                    const h = parseFloat(profile.height) / 100;
                    const w = parseFloat(profile.weight);
                    if (h > 0 && w > 0) {
                        const imc = (w / (h * h)).toFixed(1);
                        let classification = '';
                        let color = '#fff';

                        if (imc < 18.5) { classification = 'Abaixo do Peso'; color = '#00d4ff'; }
                        else if (imc < 24.9) { classification = 'Peso Normal'; color = '#00ff66'; }
                        else if (imc < 29.9) { classification = 'Sobrepeso'; color = '#ffaa00'; }
                        else if (imc < 34.9) { classification = 'Obesidade I'; color = '#ff5500'; }
                        else { classification = 'Obesidade II/III'; color = '#ff0055'; }

                        // Auto-update profile IMC string (optional prevention of infinite loop required if doing useEffect, 
                        // but here we just render. We could convert this to a button "Save Stats" if preferred, 
                        // but user said "calculator". Live update is nicer.
                        // Ideally we save the calculated IMC to profile when values change? 
                        // The profile already has 'imc' field in display. We can just display it here dynamically.

                        return (
                            <div style={{
                                background: `linear-gradient(90deg, rgba(0,0,0,0.5), ${color}22)`,
                                padding: '15px', borderRadius: '8px',
                                borderLeft: `4px solid ${color}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>Seu IMC</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: color }}>{imc}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{classification}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Classificação</div>
                                </div>
                            </div>
                        );
                    } else {
                        return <div style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center', padding: '10px' }}>Insira peso e altura para calcular.</div>;
                    }
                })()}
            </div>

            {
                isEditModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)} style={{ zIndex: 10000 }}>
                        <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '2rem' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Editar Perfil</h3>
                            <form onSubmit={handleSaveProfile}>
                                <div className="input-group" style={{ marginBottom: '1rem' }}>
                                    <label>Nome</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}
                                    />
                                </div>
                                <div className="input-group" style={{ marginBottom: '1rem' }}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}
                                    />
                                </div>

                                <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#aaa' }}>Alterar Senha (Opcional)</h4>

                                <div className="input-group" style={{ marginBottom: '1rem' }}>
                                    <label>Nova Senha</label>
                                    <input
                                        type="password"
                                        placeholder="Deixe em branco para manter"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}
                                    />
                                </div>
                                <div className="input-group" style={{ marginBottom: '1rem' }}>
                                    <label>Confirmar Senha</label>
                                    <input
                                        type="password"
                                        placeholder="Confirme a nova senha"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}
                                    />
                                </div>

                                {editError && <p style={{ color: '#ff0055', fontSize: '0.8rem', marginBottom: '1rem' }}>{editError}</p>}
                                {successMsg && <p style={{ color: '#00ff66', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{successMsg}</p>}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>Cancelar</button>
                                    <button type="submit" disabled={editLoading} className="btn-primary" style={{ padding: '8px 16px' }}>
                                        {editLoading ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </form>

                            <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                {!showDeleteConfirm ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        style={{ background: 'transparent', border: '1px solid #ff0055', color: '#ff0055', width: '100%', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem' }}
                                    >
                                        Excluir Conta
                                    </button>
                                ) : (
                                    <div className="animate-fade-in" style={{ background: 'rgba(255, 0, 85, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid #ff0055', textAlign: 'center' }}>
                                        <p style={{ color: '#ff0055', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.9rem' }}>
                                            Tem certeza? Esta ação é irreversível e apagará todos os seus dados.
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #aaa', color: '#aaa', borderRadius: '5px', cursor: 'pointer' }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { onDeleteAccount(); setIsEditModalOpen(false); }}
                                                style={{ flex: 1, padding: '8px', background: '#ff0055', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                SIM, EXCLUIR
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                !profile.isLoggedIn && (
                    <div className="card" style={{ marginBottom: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--color-primary)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Sincronize sua Evolução</h3>
                        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Crie uma conta para salvar seus treinos e dietas na nuvem.</p>
                        <button className="btn-auth-primary" style={{ width: '100%' }} onClick={onOpenAuth}>FAZER LOGIN / CRIAR CONTA</button>
                    </div>
                )
            }

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                <div className="card">
                    <div style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {profile.targetCalories > 0 ? profile.targetCalories : '--'}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Meta Kcal</div>
                </div>
                <div className="card">
                    <div style={{ color: 'var(--color-secondary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {profile.weight ? profile.weight + 'kg' : '--'}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Peso Atual</div>
                </div>
                <div className="card">
                    <div style={{ color: 'var(--color-accent)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {profile.goal === 'lose' ? 'Perder' : profile.goal === 'gain' ? 'Ganhar' : 'Manter'}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Objetivo</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '3rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Dados Biométricos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Altura:</span> <strong>{profile.height ? profile.height + 'cm' : '--'}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Idade:</span> <strong>{profile.age ? profile.age + ' anos' : '--'}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Peso Ideal:</span> <strong>{profile.idealWeight ? profile.idealWeight + 'kg' : '--'}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>IMC:</span> <strong style={{ color: profile.color }}>{profile.imc ? profile.imc : '--'}</strong>
                    </div>
                </div>
            </div>

            {/* Daily Bonus Section - REMOVED DIRECT RENDER */}
            {/* 
            {profile.isLoggedIn && (
                <DailyBonus profile={profile} onUpdateProfile={onUpdateProfile} />
            )} 
            */}
            {/* Support Link */}
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#666', fontSize: '0.8rem' }}>
                Precisa de ajuda? Entre em contato com o <a href="mailto:metafitsuporte4@gmail.com" style={{ color: '#888', textDecoration: 'underline' }}>suporte</a>
            </div>
        </section >
    );
};

export default ProfileSection;
