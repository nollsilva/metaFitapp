import React, { useState, useEffect } from 'react';
import { getAllUsers, setUserVip } from '../utils/db';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(null); // UID of user being processed

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers(users);
        } else {
            const lower = searchTerm.toLowerCase();
            const filtered = users.filter(u =>
                (u.name && u.name.toLowerCase().includes(lower)) ||
                (u.email && u.email.toLowerCase().includes(lower)) ||
                (u.userName && u.userName.toLowerCase().includes(lower))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const loadUsers = async () => {
        setLoading(true);
        const allUsers = await getAllUsers();
        // Sort: VIPs first, then by name
        allUsers.sort((a, b) => {
            if (a.vip === b.vip) return (a.name || '').localeCompare(b.name || '');
            return a.vip ? -1 : 1;
        });
        setUsers(allUsers);
        setLoading(false);
    };

    const handleVipAction = async (uid, plan) => {
        if (!confirm(`Confirmar alteração de VIP para este usuário?`)) return;

        setProcessing(uid);
        const result = await setUserVip(uid, plan);

        if (result.success) {
            alert(result.message);
            await loadUsers(); // Refresh list to show updated status
        } else {
            alert(`Erro: ${result.error}`);
        }
        setProcessing(null);
    };

    if (loading) return <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>Carregando usuários...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '10px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Painel Root - Gestão de VIPs 👑</h3>

            <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#333',
                    border: '1px solid #444',
                    color: '#fff',
                    marginBottom: '20px'
                }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredUsers.map(user => (
                    <div key={user.uid} style={{
                        background: '#222',
                        padding: '15px',
                        borderRadius: '10px',
                        border: user.vip ? '1px solid #ffd700' : '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {user.name || user.userName || 'Sem Nome'}
                                </div>
                                <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{user.email}</div>
                                {user.vip && (
                                    <div style={{
                                        color: '#ffd700',
                                        fontSize: '0.8rem',
                                        marginTop: '5px',
                                        background: 'rgba(255, 215, 0, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        display: 'inline-block'
                                    }}>
                                        VIP ATIVO ({user.vipPlan}) - Expira: {user.vipExpiresAt ? new Date(user.vipExpiresAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
                                Lv. {user.level || 1}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                disabled={processing === user.uid}
                                onClick={() => handleVipAction(user.uid, 'monthly')}
                                style={{
                                    background: '#333', color: '#fff', border: '1px solid #555',
                                    borderRadius: '5px', padding: '8px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                + Mensal
                            </button>
                            <button
                                disabled={processing === user.uid}
                                onClick={() => handleVipAction(user.uid, 'semiannual')}
                                style={{
                                    background: '#333', color: '#fff', border: '1px solid #555',
                                    borderRadius: '5px', padding: '8px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                + Semestral
                            </button>
                            <button
                                disabled={processing === user.uid}
                                onClick={() => handleVipAction(user.uid, 'annual')}
                                style={{
                                    background: '#333', color: '#fff', border: '1px solid #555',
                                    borderRadius: '5px', padding: '8px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                + Anual
                            </button>
                            <button
                                disabled={processing === user.uid}
                                onClick={() => handleVipAction(user.uid, null)}
                                style={{
                                    background: '#3f0000', color: '#ff4d4d', border: '1px solid #500',
                                    borderRadius: '5px', padding: '8px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                ✕ Remover VIP
                            </button>
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Nenhum usuário encontrado.</div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
