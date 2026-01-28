import React, { useState, useEffect } from 'react';
import { getFriendsLeaderboard, getGlobalLeaderboard, checkSeasonReset, sendFriendRequest, removeFriend } from '../utils/db'; // Updated imports
import { BadgeIcon, getBadgeConfig } from './BadgeIcons';
import { getRankTitle } from '../utils/rankingSystem';
import ShareStoryCard from './ShareStoryCard';
import { shareHiddenElement } from '../utils/share';

const RankingSection = ({ profile, onUpdateProfile }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [rankingTab, setRankingTab] = useState('global'); // 'global' or 'friends'
    const [selectedUser, setSelectedUser] = useState(null);
    const [requestStatus, setRequestStatus] = useState(null); // null, 'sending', 'sent', 'error'
    const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false); // New State

    // Reset states when selectedUser changes
    useEffect(() => {
        if (selectedUser) {
            setRequestStatus(null);
            setShowUnfriendConfirm(false);
        }
    }, [selectedUser]);

    // Handle Unfriend
    const handleUnfriend = async () => {
        if (!profile || !selectedUser) return;
        setRequestStatus('sending'); // Reuse sending state for loading UI

        const result = await removeFriend(profile.uid, selectedUser.id);

        if (result.success) {
            // Update local state to reflect change immediately
            onUpdateProfile({
                friends: (profile.friends || []).filter(fid => fid !== selectedUser.id)
            });
            setShowUnfriendConfirm(false);
            setRequestStatus(null);
            // Close main modal or just refresh relationship? 
            // Better to keep modal open but update UI to show "Send Request" again.
            // Relationship is derived from props/state, so it should auto-update if parent re-renders or we force update?
            // "relationship" var is calculated in render. We rely on onUpdateProfile causing a re-render of this component with new profile.
            alert("Amizade desfeita.");
        } else {
            alert("Erro ao desfazer amizade.");
            setRequestStatus(null);
        }
    };

    // Check for season reset on mount for the current user
    useEffect(() => {
        if (profile?.uid) {
            checkSeasonReset(profile.uid).then((res) => {
                if (res?.resetOccurred) {
                    console.log('Season reset occurred:', res);
                    if (onUpdateProfile) onUpdateProfile();
                }
            });
        }
    }, [profile?.uid]);

    const [myRank, setMyRank] = useState(null);

    useEffect(() => {
        refreshLeaderboard();
    }, [profile, rankingTab]);

    const refreshLeaderboard = async () => {
        let data = [];
        if (rankingTab === 'global') {
            data = await getGlobalLeaderboard();
        } else {
            if (profile.uid) {
                data = await getFriendsLeaderboard(profile.uid);
            }
        }
        setLeaderboard(data);

        const meIndex = data.findIndex(u => u.id === profile.id);
        if (meIndex !== -1) setMyRank(meIndex + 1);
        else setMyRank('-');
    };

    const handleSendRequest = async () => {
        if (!selectedUser || !profile.uid) return;
        setRequestStatus('sending');

        // selectedUser from leaderboard uses Auth UID as Document ID usually? 
        // Wait, leaderboard `getDocs`... `d.data()` usually contains what?
        // In db.js: `registerUser` sets doc id = uid. And saves `uid` field.
        // So `selectedUser.uid` should be available.

        const targetUid = selectedUser.uid;
        const result = await sendFriendRequest(profile.uid, targetUid);

        if (result.success) {
            setRequestStatus('sent');
        } else {
            console.error(result.error);
            setRequestStatus('error');
        }
    };

    const getRelationshipStatus = (targetUser) => {
        if (targetUser.uid === profile.uid) return 'me';
        // Check friends list (which contains friend codes)
        if (profile.friends && profile.friends.includes(targetUser.id)) return 'friend';

        // We can't easily check if *I* sent a request without reading target doc, 
        // OR storing "sentRequests" in my profile.
        // For now, simple interaction: User clicks send, if already sent db returns error.

        return 'none';
    };

    const relationship = selectedUser ? getRelationshipStatus(selectedUser) : 'none';

    return (
        <section className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

            {/* User Stat Card */}
            <div className="card" style={{
                background: 'var(--gradient-main)',
                color: '#000',
                marginBottom: '2rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: 'none',
                padding: '2rem'
            }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>{profile.name || profile.userName || 'Atleta'}</h1>
                    <div style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.8, marginBottom: '1rem' }}>ID: {profile.id}</div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '3rem', fontWeight: '900' }}>{profile.level}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>Nível</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '3rem', fontWeight: '900' }}>{profile.xp}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>XP Total</div>
                        </div>
                    </div>
                    <div style={{
                        marginTop: '1rem',
                        background: 'rgba(0,0,0,0.2)',
                        display: 'inline-block',
                        padding: '5px 15px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}>
                        RANK: {getRankTitle(profile.xp).toUpperCase()}
                    </div>
                    {profile.isLoggedIn && (
                        <div style={{ marginTop: '8px', width: '100%', maxWidth: '200px', margin: '8px auto 0' }}>
                            <div style={{
                                height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px', overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%', width: `${((profile.xp || 0) % 1000) / 10}% `,
                                    background: 'var(--color-primary)', transition: 'width 0.5s ease'
                                }}></div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                                {(profile.xp || 0) % 1000} / 1000 XP
                            </div>
                        </div>
                    )}

                    {/* Invite Text */}
                    <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', lineHeight: '1.4' }}>
                        💡 Olá, se alguém se cadastrar usando seu <strong>ID: {profile.id}</strong>, você ganha <strong>100 XP</strong>!
                        <br /><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(O ID encontra-se abaixo do seu nome)</span>
                    </div>
                </div>

                <button
                    onClick={() => shareHiddenElement('share-ranking-card', 'meu-ranking.png')}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: '#fff',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        fontSize: '1.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    title="Compartilhar Ranking"
                >
                    📸
                </button>

                <ShareStoryCard
                    id="share-ranking-card"
                    type="ranking"
                    data={{
                        xp: profile.xp,
                        rank: myRank || '?',
                    }}
                />
            </div>

            {/* Profile Detail Modal */}
            {
                selectedUser && (
                    <div className="modal-overlay animate-fade-in" onClick={() => { setSelectedUser(null); setRequestStatus(''); }}>
                        <div className="card" onClick={(e) => e.stopPropagation()} style={{
                            width: '90%', maxWidth: '350px',
                            background: 'linear-gradient(145deg, #121215 0%, #000 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '2rem',
                            textAlign: 'center',
                            position: 'relative',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}>
                            <button onClick={() => { setSelectedUser(null); setRequestStatus(''); }} style={{
                                position: 'absolute', top: '10px', right: '15px',
                                background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer'
                            }}>×</button>

                            {/* Elo Icon */}
                            <div style={{ width: '100px', height: '100px', margin: '0 auto 1rem' }}>
                                <BadgeIcon
                                    type={getBadgeConfig(selectedUser.xp).icon}
                                    color={getBadgeConfig(selectedUser.xp).color}
                                />
                            </div>

                            {/* Avatar */}
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: '#222', margin: '-40px auto 1rem', position: 'relative',
                                border: '4px solid #121215', overflow: 'hidden'
                            }}>
                                {selectedUser.avatar ? (
                                    <img src={`/avatars/${selectedUser.avatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                        {selectedUser.name ? selectedUser.name.substring(0, 2).toUpperCase() : 'JD'}
                                    </div>
                                )}
                            </div>

                            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{selectedUser.name}</h2>
                            <div style={{ color: 'var(--color-primary)', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: '600' }}>
                                {getRankTitle(selectedUser.xp)}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedUser.level}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Nível</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedUser.xp}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>XP Total</div>
                                </div>
                            </div>

                            {/* Friend Request Action */}
                            {relationship === 'me' ? (
                                <div style={{ color: '#666', fontStyle: 'italic' }}>Este é o seu perfil</div>
                            ) : relationship === 'friend' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{
                                        padding: '10px', background: 'rgba(0,255,102,0.1)',
                                        color: '#00ff66', borderRadius: '8px', border: '1px solid rgba(0,255,102,0.3)'
                                    }}>
                                        ✓ Vocês são amigos
                                    </div>
                                    <button
                                        onClick={() => setShowUnfriendConfirm(true)}
                                        style={{
                                            background: 'none', border: 'none', color: '#ff4444',
                                            fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline'
                                        }}
                                    >
                                        Desfazer amizade
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {requestStatus === 'sent' ? (
                                        <button disabled className="btn-secondary" style={{ width: '100%', color: '#00ff66', borderColor: '#00ff66' }}>
                                            ✓ Solicitação Enviada
                                        </button>
                                    ) : requestStatus === 'error' ? (
                                        <button disabled className="btn-secondary" style={{ width: '100%', color: '#ff4444', borderColor: '#ff4444' }}>
                                            Erro ao enviar
                                        </button>
                                    ) : (
                                        <button onClick={handleSendRequest} className="btn-primary" style={{ width: '100%' }}>
                                            {requestStatus === 'sending' ? 'Enviando...' : 'Enviar Solicitação de Amizade'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Unfriend Confirmation Overlay */}
                            {showUnfriendConfirm && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.95)', zIndex: 200,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '16px', padding: '20px', textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️</div>
                                    <h3 style={{ color: '#ff4444', marginBottom: '10px' }}>Desfazer Amizade?</h3>
                                    <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.9rem' }}>
                                        Você e <strong>{selectedUser.name}</strong> deixarão de ser amigos. Nenhuma notificação será enviada.
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                        <button
                                            onClick={() => setShowUnfriendConfirm(false)}
                                            className="btn-secondary"
                                            style={{ flex: 1 }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleUnfriend}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                                background: '#ff4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer'
                                            }}
                                        >
                                            Desfazer
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )
            }

            {/* Medal Gallery */}
            <h2 className="section-title">Galeria de <span className="title-gradient">Medalhas</span></h2>
            <div className="card" style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                overflowX: 'auto',
                display: 'flex',
                gap: '1.5rem',
                scrollbarWidth: 'thin',
                whiteSpace: 'nowrap'
            }}>
                {[
                    { type: 'bronze', name: 'Bronze ⭐', range: '0 - 3k XP' },
                    { type: 'bronze2', name: 'Bronze ⭐⭐', range: '3k - 6k XP' },
                    { type: 'bronze3', name: 'Bronze ⭐⭐⭐', range: '6k - 9k XP' },
                    { type: 'silver', name: 'Prata ⭐', range: '9k - 13k XP' },
                    { type: 'silver2', name: 'Prata ⭐⭐', range: '13k - 17k XP' },
                    { type: 'silver3', name: 'Prata ⭐⭐⭐', range: '17k - 21k XP' },
                    { type: 'gold', name: 'Ouro ⭐', range: '21k - 26k XP' },
                    { type: 'gold2', name: 'Ouro ⭐⭐', range: '26k - 31k XP' },
                    { type: 'gold3', name: 'Ouro ⭐⭐⭐', range: '31k - 36k XP' },
                    { type: 'diamond', name: 'Platina ⭐', range: '36k - 42k XP' },
                    { type: 'diamond2', name: 'Platina ⭐⭐', range: '42k - 48k XP' },
                    { type: 'diamond3', name: 'Platina ⭐⭐⭐', range: '48k - 54k XP' },
                    { type: 'legendary', name: 'Diamante 💎', range: '54k+ XP' }
                ].map((badge) => (
                    <div key={badge.type} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '100px'
                    }}>
                        <div style={{ width: '80px', height: '80px', marginBottom: '0.5rem' }}>
                            <BadgeIcon type={badge.type} />
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>{badge.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{badge.range}</div>
                    </div>
                ))}
            </div>

            {/* Leaderboard Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setRankingTab('global')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: rankingTab === 'global' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                        color: rankingTab === 'global' ? '#111' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.3s'
                    }}
                >
                    GLOBAL
                </button>
                <button
                    onClick={() => setRankingTab('friends')}
                    disabled={profile.friends?.length === 0}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: rankingTab === 'friends' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                        color: rankingTab === 'friends' ? '#111' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.3s',
                        opacity: (profile.friends && profile.friends.length > 0) ? 1 : 0.5
                    }}
                >
                    AMIGOS
                </button>
            </div>

            {/* Leaderboard List */}
            <h2 className="section-title">Ranking <span className="title-gradient">{rankingTab === 'global' ? 'Global' : 'Amigos'}</span></h2>
            <div className="leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {(() => {
                    const renderRow = (user, idxOrRealRank) => {
                        const rank = typeof idxOrRealRank === 'number' ? idxOrRealRank + 1 : idxOrRealRank;
                        const isMe = user.id === profile.id;
                        const config = getBadgeConfig(user.xp);

                        return (
                            <div key={user.id} className="card"
                                onClick={() => setSelectedUser(user)}
                                style={{
                                    padding: '0.8rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    border: isMe ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                                    background: isMe ? 'rgba(0,240,255,0.05)' : 'var(--color-bg-card)'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '5px' }}>
                                    <div style={{
                                        fontSize: '1rem', fontWeight: '800', width: '30px', textAlign: 'center',
                                        color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#666'
                                    }}>
                                        #{rank}
                                    </div>
                                    <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0 }}>
                                        <BadgeIcon type={config.icon} color={config.color} />
                                    </div>
                                </div>

                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', color: '#fff', fontSize: '0.8rem',
                                    border: `2px solid ${rank <= 3 ? 'var(--color-primary)' : '#444'} `,
                                    overflow: 'hidden'
                                }}>
                                    {user.avatar ? (
                                        <img src={`/avatars/${user.avatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        user.name ? user.name.substring(0, 2).toUpperCase() : 'JD'
                                    )}
                                </div>

                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isMe ? 'var(--color-primary)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user.name} {isMe && '(Você)'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {getRankTitle(user.xp)}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>{user.xp} XP</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Lvl {user.level}</div>
                                </div>
                            </div>
                        );
                    };

                    let displayList = leaderboard;

                    if (displayList.length === 0) {
                        return (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontStyle: 'italic' }}>
                                {rankingTab === 'friends'
                                    ? "Você ainda não tem amigos no ranking."
                                    : "Ninguém no ranking ainda..."}
                            </div>
                        );
                    }

                    // Scrollable Container
                    return (
                        <div style={{
                            maxHeight: '500px',
                            overflowY: 'auto',
                            paddingRight: '5px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {displayList.map((user, index) => renderRow(user, index))}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </section>
    );
};

export default RankingSection;
