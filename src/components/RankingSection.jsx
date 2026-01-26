import React, { useState, useEffect } from 'react';
import { addFriend, getFriendsLeaderboard, getGlobalLeaderboard, checkSeasonReset } from '../utils/db';
import { BadgeIcon, getBadgeConfig } from './BadgeIcons';
import { getRankTitle } from '../utils/rankingSystem';

const RankingSection = ({ profile, onUpdateProfile }) => {
    const [friendIdInput, setFriendIdInput] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [msg, setMsg] = useState('');
    const [rankingTab, setRankingTab] = useState('global'); // 'global' or 'friends'

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
            </div>

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
            <div className="leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(() => {
                    let displayList = leaderboard;
                    let showSeparator = false;
                    let myUserInList = null;

                    if (rankingTab === 'global' && leaderboard.length > 0) {
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
                            <div key={user.id} className="card" style={{
                                padding: '1.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                border: isMe ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                                background: isMe ? 'rgba(0,240,255,0.05)' : 'var(--color-bg-card)'
                            }}>
                                {/* Rank & Badge Row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}>
                                    <div style={{
                                        fontSize: '1.2rem',
                                        fontWeight: '800',
                                        width: '40px',
                                        textAlign: 'center',
                                        color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#666'
                                    }}>
                                        #{rank}
                                    </div>

                                    <div style={{
                                        position: 'relative',
                                        width: '70px', height: '70px',
                                        flexShrink: 0
                                    }}>
                                        <BadgeIcon type={config.icon} color={config.color} />
                                    </div>
                                </div>

                                <div style={{
                                    width: '50px', height: '50px',
                                    borderRadius: '50%',
                                    background: '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#fff',
                                    border: `2px solid ${rank <= 3 ? 'var(--color-primary)' : '#444'} `,
                                    overflow: 'hidden'
                                }}>
                                    {user.avatar ? (
                                        <img src={`/avatars/${user.avatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        user.name ? user.name.substring(0, 2).toUpperCase() : 'JD'
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isMe ? 'var(--color-primary)' : '#fff' }}>
                                        {user.name} {isMe && '(Você)'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {getRankTitle(user.xp)}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>{user.level}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>NÍVEL</div>
                                </div>
                            </div>
                        );
                    };

                    return (
                        <>
                            {displayList.map((user, idx) => renderRow(user, idx))}
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

        </section>
    );
};

export default RankingSection;
