import React, { useState, useEffect } from 'react';
import { addFriend, getFriendsLeaderboard, getGlobalLeaderboard, checkSeasonReset } from '../utils/db';
import { BadgeIcon, getBadgeConfig } from './BadgeIcons';
import { getRankTitle } from '../utils/rankingSystem';
import ShareStoryCard from './ShareStoryCard';
import { shareHiddenElement } from '../utils/share';

const RankingSection = ({ profile, onUpdateProfile }) => {
    const [friendIdInput, setFriendIdInput] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [msg, setMsg] = useState('');
    const [rankingTab, setRankingTab] = useState('global'); // 'global' or 'friends'
    const [selectedUser, setSelectedUser] = useState(null);

    // Check for season reset on mount for the current user
    useEffect(() => {
        if (profile?.uid) {
            checkSeasonReset(profile.uid).then((res) => {
                if (res?.resetOccurred) {
                    // Force profile refresh if implemented, or just alert/log
                    console.log('Season reset occurred:', res);
                    if (onUpdateProfile) onUpdateProfile(); // Assuming this refetches profile
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

        // Update myRank state
        const meIndex = data.findIndex(u => u.id === profile.id);
        if (meIndex !== -1) setMyRank(meIndex + 1);
        else setMyRank('-');
    };

    const handleAddFriend = async (e) => {
        e.preventDefault();
        setMsg('');
        if (!friendIdInput) return;

        const res = await addFriend(profile.uid, friendIdInput);
        if (res.error) {
            setMsg(res.error);
        } else {
            setMsg(`Amigo ${res.friendName} adicionado!`);
            setFriendIdInput('');
            if (rankingTab === 'friends') refreshLeaderboard();
        }
    };

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
                </div>

                {/* Share Button absolute positioned */}
                <button
                    onClick={() => shareHiddenElement('share-ranking-card', 'meu-ranking.png')}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: '#fff',
                        width: '50px', // Increased size
                        height: '50px', // Increased size
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        fontSize: '1.5rem', // Larger icon
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    title="Compartilhar Ranking"
                >
                    📸
                </button>

                {/* Hidden Card for Sharing */}
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
                    <div className="modal-overlay animate-fade-in" onClick={() => setSelectedUser(null)}>
                        <div className="card" onClick={(e) => e.stopPropagation()} style={{
                            width: '90%', maxWidth: '350px',
                            background: 'linear-gradient(145deg, #121215 0%, #000 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '2rem',
                            textAlign: 'center',
                            position: 'relative',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}>
                            <button onClick={() => setSelectedUser(null)} style={{
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

                            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedUser.level}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Nível</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedUser.xp}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>XP Total</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Friend Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#fff' }}>Adicionar Amigo</h3>
                <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="ID do Amigo (6 números)"
                        value={friendIdInput}
                        onChange={(e) => setFriendIdInput(e.target.value)}
                        maxLength={6}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            outline: 'none'
                        }}
                    />
                    <button className="btn-primary" type="submit" style={{ padding: '0 20px' }}>+</button>
                </form>
                {msg && <p style={{ marginTop: '10px', color: msg.includes('erro') ? '#ff0055' : '#00ff66', fontSize: '0.9rem' }}>{msg}</p>}
            </div>

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
                    let displayList = leaderboard;
                    let showSeparator = false;
                    let myUserInList = null;
                    let remainingCount = 0;

                    if (rankingTab === 'global' && leaderboard.length > 0) {
                        if (leaderboard.length > 10) {
                            remainingCount = leaderboard.length - 10;
                        }

                        displayList = leaderboard.slice(0, 10);
                        const myIndex = leaderboard.findIndex(u => u.id === profile.id);
                        if (myIndex >= 10 && profile.isLoggedIn) {
                            showSeparator = true;
                            myUserInList = { ...leaderboard[myIndex], realRank: myIndex + 1 };
                        }
                    }

                    if (displayList.length === 0 && !myUserInList) {
                        return (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontStyle: 'italic' }}>
                                {rankingTab === 'friends'
                                    ? "Você ainda não tem amigos no ranking. Adicione alguém pelo ID!"
                                    : "Ninguém no ranking ainda..."}
                            </div>
                        );
                    }

                    const renderRow = (user, idxOrRealRank) => {
                        // idxOrRealRank is 0-indexed index usually, or (realRank - 1)
                        const rank = typeof idxOrRealRank === 'number' ? idxOrRealRank + 1 : idxOrRealRank;
                        const isMe = user.id === profile.id;

                        // Badge Logic
                        const config = getBadgeConfig(user.xp);

                        return (
                            <div key={user.id} className="card"
                                onClick={() => setSelectedUser(user)}
                                style={{
                                    padding: '0.8rem 1rem', // Compact padding
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    border: isMe ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                                    background: isMe ? 'rgba(0,240,255,0.05)' : 'var(--color-bg-card)'
                                }}>
                                {/* Rank & Badge Row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '5px' }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '800',
                                        width: '30px',
                                        textAlign: 'center',
                                        color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#666'
                                    }}>
                                        #{rank}
                                    </div>

                                    <div style={{
                                        position: 'relative',
                                        width: '50px', height: '50px', // Smaller badge
                                        flexShrink: 0
                                    }}>
                                        <BadgeIcon type={config.icon} color={config.color} />
                                    </div>
                                </div>

                                <div style={{
                                    width: '40px', height: '40px', // Smaller avatar
                                    borderRadius: '50%',
                                    background: '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#fff',
                                    fontSize: '0.8rem',
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

                    return (
                        <>
                            {displayList.map((user, idx) => renderRow(user, idx))}

                            {/* Remaining Players Summary */}
                            {rankingTab === 'global' && remainingCount > 0 && !showSeparator && (
                                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666', marginTop: '1rem', paddingBottom: '1rem' }}>
                                    E outros {remainingCount} jogadores buscando a glória...
                                </div>
                            )}

                            {showSeparator && (
                                <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#666', margin: '0.5rem 0' }}>
                                    ...
                                </div>
                            )}
                            {myUserInList && renderRow(myUserInList, myUserInList.realRank - 1)}
                        </>
                    );
                })()}
            </div>

        </section >
    );
};

export default RankingSection;
