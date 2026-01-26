import React, { useState } from 'react';
import { updateUser } from '../utils/db'; // Ensure this is imported effectively or passed down
import { updateEmail, updateProfile as updateAuthProfile, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

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

const ProfileSection = ({ profile, onOpenAuth, onUpdateProfile }) => { // onUpdateProfile passed from App
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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
    const history = [
        { date: 'Hoje', type: 'HIIT Blast', duration: '20 min', cal: 180, score: 'A' },
        { date: 'Ontem', type: 'Yoga Flow', duration: '45 min', cal: 120, score: 'S' },
        { date: '22 Jan', type: 'Força', duration: '30 min', cal: 210, score: 'A+' },
    ];

    const openEditModal = () => {
        setEditName(profile.name || profile.userName || '');
        setEditEmail(profile.email || '');
        setNewPassword('');
        setConfirmPassword('');
        setEditError('');
        setSuccessMsg('');
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

    const confirmAvatarSelection = () => {
        if (tempAvatar) {
            onUpdateProfile({ avatar: tempAvatar });
        }
        setIsAvatarModalOpen(false);
    };

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

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>Cancelar</button>
                                <button type="submit" disabled={editLoading} className="btn-primary" style={{ padding: '8px 16px' }}>
                                    {editLoading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
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

            {Object.keys(profile.workoutHistory || {}).length > 0 && (
                <>
                    <h2 className="section-title">Atividade <span className="title-gradient">Recente</span></h2>
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '3rem' }}>
                        {history.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1.5rem',
                                borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.type}</div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>{item.date} • {item.duration}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{item.cal} kcal</div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '2px 8px', borderRadius: '4px',
                                        display: 'inline-block', marginTop: '4px'
                                    }}>
                                        Rank {item.score}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                        ))}
                </div>
        </>
    )
}

<InstallGuideCard />
        </section >
    );
};

const InstallGuideCard = () => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="card" style={{
            marginBottom: '3rem',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0) 100%)'
        }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>📲</div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Instalar App</h3>
                        <p style={{ fontSize: '0.85rem', color: '#888' }}>Como adicionar à tela inicial</p>
                    </div>
                </div>
                <div style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>▼</div>
            </div>

            {expanded && (
                <div className="animate-fade-in" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🍎</span> iPhone (iOS)
                        </h4>
                        <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.6' }}>
                            <li>Toque no botão <strong>Compartilhar</strong> <span style={{ fontSize: '1.1rem' }}>⎋</span> no Safári.</li>
                            <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                            <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
                        </ol>
                    </div>

                    <div>
                        <h4 style={{ color: '#00ff66', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🤖</span> Android (Chrome)
                        </h4>
                        <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.6' }}>
                            <li>Toque no menu de <strong>Três Pontos</strong> <span style={{ fontSize: '1.1rem' }}>⋮</span> no Chrome.</li>
                            <li>Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                            <li>Confirme clicando em <strong>Instalar</strong>.</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSection;
