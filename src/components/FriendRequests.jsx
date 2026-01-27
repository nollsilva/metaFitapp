import React, { useState } from 'react';
import { acceptFriendRequest, rejectFriendRequest, clearAcceptedNotifications } from '../utils/db'; // Make sure to export these!

const FriendRequests = ({ profile, onUpdateProfile, onClose }) => {
    const [loading, setLoading] = useState(false);

    // Arrays from profile
    const pendingRequests = profile.friendRequests || [];
    const acceptedNotifications = profile.friendRequestsAccepted || [];

    const handleAccept = async (reqUid) => {
        setLoading(true);
        await acceptFriendRequest(profile.uid, reqUid);
        // Optimistic update
        const newRequests = pendingRequests.filter(r => r.fromUid !== reqUid);
        // We can't easily guess the friend code without fetching, but we know db update handles it.
        // For UI update, we might need to rely on the parent re-fetching or db subscription.
        // But we can clean the list.
        onUpdateProfile({ friendRequests: newRequests });
        setLoading(false);
    };

    const handleReject = async (reqUid) => {
        setLoading(true);
        await rejectFriendRequest(profile.uid, reqUid);
        const newRequests = pendingRequests.filter(r => r.fromUid !== reqUid);
        onUpdateProfile({ friendRequests: newRequests });
        setLoading(false);
    };

    const handleClearNotifications = async () => {
        await clearAcceptedNotifications(profile.uid);
        onUpdateProfile({ friendRequestsAccepted: [] });
    };

    return (
        <div style={{ width: '100%', color: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    fontSize: '2rem', fontWeight: '800',
                    background: 'linear-gradient(to right, #0077ff, #00c3ff)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 10px rgba(0, 195, 255, 0.3))'
                }}>
                    SOLICITAÇÕES
                </div>
                <div style={{ fontSize: '1rem', color: '#fff', opacity: 0.9 }}>
                    Gerencie seus amigos
                </div>
            </div>

            {/* Notifications of Accepted Requests */}
            {acceptedNotifications.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#00ff66', marginBottom: '10px' }}>Novos Amigos!</h4>
                    {acceptedNotifications.map((notif, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(0, 255, 102, 0.1)',
                            border: '1px solid rgba(0, 255, 102, 0.3)',
                            borderRadius: '12px', padding: '12px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: '#333', overflow: 'hidden'
                            }}>
                                {notif.friendAvatar ? (
                                    <img src={`/avatars/${notif.friendAvatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {notif.friendName ? notif.friendName.substring(0, 2).toUpperCase() : 'JD'}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <strong>{notif.friendName}</strong> aceitou seu pedido!
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={handleClearNotifications}
                        style={{
                            width: '100%', padding: '8px',
                            background: 'rgba(255,255,255,0.1)', border: 'none',
                            color: '#fff', borderRadius: '8px', cursor: 'pointer',
                            marginTop: '5px'
                        }}>
                        Limpar Notificações
                    </button>
                </div>
            )}

            {/* Pending Requests */}
            {pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    Nenhuma solicitação pendente.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingRequests.map(req => (
                        <div key={req.fromUid} className="card" style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '1rem'
                        }}>
                            <div style={{
                                width: '50px', height: '50px', borderRadius: '50%',
                                background: '#333', overflow: 'hidden', flexShrink: 0
                            }}>
                                {req.fromAvatar ? (
                                    <img src={`/avatars/${req.fromAvatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {req.fromName ? req.fromName.substring(0, 2).toUpperCase() : 'JD'}
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{req.fromName}</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Quer ser seu amigo</div>
                            </div>

                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    onClick={() => handleReject(req.fromUid)}
                                    disabled={loading}
                                    style={{
                                        background: 'rgba(255, 68, 68, 0.2)', border: '1px solid rgba(255, 68, 68, 0.5)',
                                        color: '#ff4444', borderRadius: '8px', width: '40px', height: '40px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                    ✕
                                </button>
                                <button
                                    onClick={() => handleAccept(req.fromUid)}
                                    disabled={loading}
                                    style={{
                                        background: 'rgba(0, 255, 102, 0.2)', border: '1px solid rgba(0, 255, 102, 0.5)',
                                        color: '#00ff66', borderRadius: '8px', width: '40px', height: '40px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                    ✓
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FriendRequests;
