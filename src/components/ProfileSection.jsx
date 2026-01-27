import React, { useState } from 'react';
import { updateUser } from '../utils/db'; // Ensure this is imported effectively or passed down
import { sendWelcomeEmail } from '../utils/email';
import { updateEmail, updateProfile as updateAuthProfile, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import DailyBonus from './DailyBonus';

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
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);

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

    // Mock Data for History
    // Mock Data removed


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

    const handleTestEmail = async () => {
        if (!profile || !profile.email) {
            setEditError("Você precisa de um email cadastrado para testar.");
            return;
        }
        setEditError("Enviando email de teste...");
        const result = await sendWelcomeEmail(profile);
        if (result.success) {
            setSuccessMsg("Email enviado com sucesso! Verifique sua caixa de entrada.");
        } else {
            setEditError("Erro ao enviar email: " + result.error);
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
                        overflow: 'hidden',
                        position: 'relative',
                        border: '3px solid var(--color-primary)',
                        transition: 'transform 0.2s'
                    }}
                    className={profile.isLoggedIn ? "hover-scale" : ""}
                >
                    {profile.avatar ? (
                        <img src={`/avatars/${profile.avatar}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        (profile.name || profile.userName) ? (profile.name || profile.userName).substring(0, 2).toUpperCase() : 'JD'
                    )}
                    {profile.isLoggedIn && (
                        <div style={{
                            position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)',
                            fontSize: '0.6rem', color: '#fff', textAlign: 'center', padding: '2px'
                        }}>Editar</div>
                    )}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ marginBottom: '0.2rem', fontSize: '1.5rem' }}>
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
                                {(profile.xp || 0) % 1000} / 1000 XP
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Avatar Selection Modal */}
            {isAvatarModalOpen && (
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
            )}

            {/* Bonus Modal - Only if Logged In */}
            {isBonusModalOpen && profile.isLoggedIn && (
                <div className="modal-overlay" onClick={() => setIsBonusModalOpen(false)} style={{ zIndex: 10000 }}>
                    <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '2rem', background: '#111', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsBonusModalOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <DailyBonus profile={profile} onUpdateProfile={onUpdateProfile} />
                    </div>
                </div>
            )}

            {/* Main Action Buttons Area */}
            {profile.isLoggedIn && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        className="btn-primary"
                        onClick={() => setIsBonusModalOpen(true)}
                        style={{
                            flex: 1, position: 'relative',
                            background: 'linear-gradient(135deg, #0077ff, #00c3ff)', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        🎁 Bônus Diário
                        {isBonusReady && (
                            <div style={{
                                position: 'absolute', top: '-5px', right: '-5px',
                                width: '12px', height: '12px', background: '#ff0055',
                                borderRadius: '50%', border: '2px solid #000'
                            }}></div>
                        )}
                    </button>
                    {/* Placeholder for other actions or just full width if alone */}
                </div>
            )}

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
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
                                <button type="button" onClick={handleTestEmail} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>📧 Testar Email</button>
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
            )}

            {!profile.isLoggedIn && (
                <div className="card" style={{ marginBottom: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--color-primary)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Sincronize sua Evolução</h3>
                    <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Crie uma conta para salvar seus treinos e dietas na nuvem.</p>
                    <button className="btn-auth-primary" style={{ width: '100%' }} onClick={onOpenAuth}>FAZER LOGIN / CRIAR CONTA</button>
                </div>
            )}

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
        </section>
    );
};

export default ProfileSection;
