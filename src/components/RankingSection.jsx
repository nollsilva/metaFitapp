import React, { useState, useEffect } from 'react';
import { getFriendsLeaderboard, getGlobalLeaderboard, checkSeasonReset, sendFriendRequest, removeFriend, updateUser } from '../utils/db';
import { BadgeIcon, getBadgeConfig } from './BadgeIcons';
import { getRankTitle } from '../utils/rankingSystem';
import ShareStoryCard from './ShareStoryCard';
import { shareHiddenElement } from '../utils/share';

import { BannerAd } from './AdSystem';
import { PaymentService } from '../services/PaymentService';

const RankingSection = ({ profile, onUpdateProfile, onBattle }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [rankingTab, setRankingTab] = useState('global'); // 'global' or 'friends'
    const [selectedUser, setSelectedUser] = useState(null);
    const [requestStatus, setRequestStatus] = useState(null); // null, 'sending', 'sent', 'error'
    const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);

    // VIP States
    const [showVipModal, setShowVipModal] = useState(false);

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
        setRequestStatus('sending');

        const result = await removeFriend(profile.uid, selectedUser.id);

        if (result.success) {
            onUpdateProfile({
                friends: (profile.friends || []).filter(fid => fid !== selectedUser.id)
            });
            setShowUnfriendConfirm(false);
            setRequestStatus(null);
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
        if (profile.friends && profile.friends.includes(targetUser.id)) return 'friend';
        return 'none';
    };

    const relationship = selectedUser ? getRelationshipStatus(selectedUser) : 'none';

    // STRIPE PAYMENT LINKS (Generate these in Stripe Dashboard -> Payment Links)
    const STRIPE_LINKS = {
        mensal: "https://buy.stripe.com/5kQeVd0Fn9EB0A92Kn0co00",
        semestral: "https://buy.stripe.com/fZuaEX87P4kh82Bfx90co01",
        anual: "https://buy.stripe.com/5kQ9ATco55ol96F4Sv0co02"
    };

    // VIP Purchase Logic
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const handleVipPurchase = async (planKey) => {
        setIsProcessingPayment(true);
        try {
            const link = STRIPE_LINKS[planKey];
            if (!link || link.includes("SEU_LINK")) {
                alert("⚠️ ATENÇÃO: Links de Pagamento não configurados.\n\n1. Crie os links no Stripe Dashboard.\n2. Cole no arquivo 'RankingSection.jsx'.");
                setIsProcessingPayment(false);
                return;
            }

            // Redirect to Stripe
            const result = await PaymentService.processPayment(link);

            if (result.success) {
                // For manual links, we don't update VIP instantly.
                setShowVipModal(false);
                // Optional: Show instructions
                alert("🔗 Redirecionando para o Pagamento...\n\nApós o pagamento, envie o comprovante para o suporte (ou aguarde ativação manual) para liberar seu VIP!");
            } else {
                alert(`❌ Erro: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao abrir link.");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const VipPlansModal = () => (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowVipModal(false)} style={{ zIndex: 10000 }}>
            <div className="card" onClick={e => e.stopPropagation()} style={{
                maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center',
                background: '#0a0a0c', border: '1px solid #ffd700',
                boxShadow: '0 0 50px rgba(255, 215, 0, 0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowVipModal(false)} style={{ fontSize: '1.5rem', color: '#666' }}>×</button>
                </div>
                <h2 style={{ color: '#ffd700', fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Seja VIP</h2>
                <p style={{ color: '#aaa', marginBottom: '2rem' }}>Escolha o plano ideal para sua evolução.</p>

                {isProcessingPayment && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.9)', zIndex: 20,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '24px'
                    }}>
                        <div className="spinner" style={{
                            width: '40px', height: '40px', border: '4px solid rgba(255,215,0,0.3)',
                            borderTop: '4px solid #ffd700', borderRadius: '50%', animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ marginTop: '1rem', color: '#ffd700', fontWeight: 'bold' }}>Conectando ao Stripe...</p>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>Você será redirecionado.</p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button onClick={() => handleVipPurchase('mensal')}
                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>1 Mês</span>
                            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>€ 1.50</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#888' }}>
                            <li>Sem anúncios</li>
                            <li>+10% XP em treinos e corridas</li>
                            <li>Badge Lendária Exclusiva</li>
                            <li>Acesso total ao app</li>
                        </ul>
                    </button>

                    <button onClick={() => handleVipPurchase('semestral')}
                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ffd700', background: 'rgba(255, 215, 0, 0.05)', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '10px', background: '#ffd700', color: '#000', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>-10% OFF</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>6 Meses</span>
                            <div>
                                <span style={{ textDecoration: 'line-through', color: '#666', fontSize: '0.8rem', marginRight: '5px' }}>€ 9.00</span>
                                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>€ 8.10</span>
                            </div>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#aaa' }}>
                            <li>Sem anúncios</li>
                            <li>+10% XP em treinos e corridas</li>
                            <li>Badge Lendária Exclusiva</li>
                            <li><strong style={{ color: '#ffd700' }}>Economize 10%</strong></li>
                        </ul>
                    </button>

                    <button onClick={() => handleVipPurchase('anual')}
                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>1 Ano</span>
                            <div>
                                <span style={{ textDecoration: 'line-through', color: '#666', fontSize: '0.8rem', marginRight: '5px' }}>€ 18.00</span>
                                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>€ 13.50</span>
                            </div>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#888' }}>
                            <li>Sem anúncios</li>
                            <li>+10% XP em treinos e corridas</li>
                            <li>Badge Lendária Exclusiva</li>
                            <li><strong style={{ color: '#ffd700' }}>Economize 25%</strong></li>
                        </ul>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <section className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: profile.vip ? '7rem' : '12rem' }}>

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
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>
                        {profile.vip && <span style={{ marginRight: '10px' }}>👑</span>}
                        {profile.name || profile.userName || 'Atleta'}
                    </h1>
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

            {/* VIP Upsell Card - Only if NOT VIP */}
            {!profile.vip && (
                <div
                    onClick={() => setShowVipModal(true)}
                    className="card animate-pulse-slow"
                    style={{
                        background: 'linear-gradient(90deg, #111 0%, #222 100%)',
                        border: '1px solid #ffd700',
                        marginBottom: '2rem',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '1.5rem',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ffd700' }}></div>
                    <h3 style={{ color: '#ffd700', fontSize: '1.5rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>🚀 Acelere sua Evolução</h3>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Desbloqueie treinos exclusivos, análises avançadas e destaque no ranking.
                    </p>
                    <span style={{
                        background: '#ffd700', color: '#000', padding: '8px 20px',
                        borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem'
                    }}>
                        SEJA VIP AGORA
                    </span>
                </div>
            )}

            {/* Leaderboard Tabs with VIP Button */}
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

                {/* VIP Button (Only if VIP) - Moved to middle */}
                {profile.vip && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            style={{
                                padding: '12px',
                                background: 'linear-gradient(45deg, #ffd700, #ffa500)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px'
                            }}
                        >
                            👑 VIP
                        </button>
                        <button
                            onClick={async () => {
                                if (window.confirm("Remover VIP (Teste)?")) {
                                    await updateUser(profile.uid, { vip: false, vipPlan: null });
                                    if (onUpdateProfile) onUpdateProfile({ vip: false, vipPlan: null });
                                }
                            }}
                            style={{
                                padding: '0 10px',
                                background: 'rgba(255, 68, 68, 0.2)',
                                color: '#ff4444',
                                border: '1px solid #ff4444',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                            }}
                            title="Cancelar VIP (Teste)"
                        >
                            ✕
                        </button>
                    </div>
                )}

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

            {/* Leaderboard List - Fixed Height & Scroll */}
            <h2 className="section-title">Ranking <span className="title-gradient">{rankingTab === 'global' ? 'Global' : 'Amigos'}</span></h2>
            <div className="leaderboard" style={{
                display: 'flex', flexDirection: 'column', gap: '0.8rem',
                maxHeight: '600px', // approx 8-9 items
                overflowY: 'auto',
                paddingRight: '5px' // space for scrollbar
            }}>
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
                                    background: isMe ? 'rgba(0,240,255,0.05)' : 'var(--color-bg-card)',
                                    minHeight: '80px' // ensure consistent height
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
                                    position: 'relative',
                                    overflow: 'visible' // Allow frame to overflow
                                }}>
                                    {user.avatar ? (
                                        <img src={`/avatars/${user.avatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', overflow: 'hidden', position: 'relative', zIndex: 10 }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, background: '#333' }}>
                                            {user.name ? user.name.substring(0, 2).toUpperCase() : 'JD'}
                                        </div>
                                    )}
                                    {user.vip && (
                                        <img
                                            src="/vip-frame.png?v=2"
                                            alt="VIP Frame"
                                            style={{
                                                position: 'absolute',
                                                top: '50%', left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '155%', height: '155%',
                                                zIndex: 20,
                                                pointerEvents: 'none',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    )}
                                </div>

                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isMe ? 'var(--color-primary)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {user.vip && <span style={{ marginRight: '2px', fontSize: '1rem' }}>👑</span>}
                                        {user.name}
                                        {isMe && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Você)</span>}
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

                    return displayList.map((user, index) => renderRow(user, index));
                })()}
            </div>

            {/* Medal Gallery - Moved to Bottom */}
            <div style={{ marginTop: '3rem' }}>
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
            </div>

            {/* Profile Detail Modal */}
            {selectedUser && (
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

                        <div style={{ width: '100px', height: '100px', margin: '0 auto 1rem' }}>
                            <BadgeIcon
                                type={getBadgeConfig(selectedUser.xp).icon}
                                color={getBadgeConfig(selectedUser.xp).color}
                            />
                        </div>

                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: '#222', margin: '-40px auto 1rem', position: 'relative',
                            border: '4px solid #121215', overflow: 'visible'
                        }}>
                            {selectedUser.avatar ? (
                                <img src={`/avatars/${selectedUser.avatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', position: 'relative', zIndex: 10 }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', position: 'relative', zIndex: 10, background: '#222' }}>
                                    {selectedUser.name ? selectedUser.name.substring(0, 2).toUpperCase() : 'JD'}
                                </div>
                            )}
                            {selectedUser.vip && (
                                <img
                                    src="/vip-frame.png?v=2"
                                    alt="VIP Frame"
                                    style={{
                                        position: 'absolute',
                                        top: '50%', left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '155%', height: '155%',
                                        zIndex: 20,
                                        pointerEvents: 'none',
                                        objectFit: 'contain'
                                    }}
                                />
                            )}
                        </div>

                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                            {selectedUser.vip && <span style={{ marginRight: '5px' }}>👑</span>}
                            {selectedUser.name}
                        </h2>

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

                        {/* ADMIN PANEL */}
                        {['nollramsilva9@gmail.com'].includes(profile?.email) && (
                            <div style={{
                                marginTop: '1rem', marginBottom: '1rem', padding: '10px',
                                border: '1px dashed #ff4444', borderRadius: '8px', background: 'rgba(255,0,0,0.1)'
                            }}>
                                <h4 style={{ color: '#ff4444', marginBottom: '10px', fontSize: '0.8rem' }}>🔧 PAINEL ROOT</h4>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                        {selectedUser.vip ? 'Estender/Alterar VIP:' : 'Conceder VIP por:'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Dar VIP de 1 Mês para ${selectedUser.name}?`)) {
                                                    const expiresAt = new Date();
                                                    expiresAt.setDate(expiresAt.getDate() + 30);
                                                    await updateUser(selectedUser.uid, {
                                                        vip: true,
                                                        vipPlan: 'manual_monthly',
                                                        vipExpiresAt: expiresAt.toISOString()
                                                    });
                                                    alert("VIP de 1 Mês Ativado!");
                                                    setSelectedUser({ ...selectedUser, vip: true });
                                                    refreshLeaderboard();
                                                }
                                            }}
                                            style={{ padding: '6px 10px', background: '#ffd700', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            1 Mês
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Dar VIP de 6 Meses para ${selectedUser.name}?`)) {
                                                    const expiresAt = new Date();
                                                    expiresAt.setDate(expiresAt.getDate() + 180);
                                                    await updateUser(selectedUser.uid, {
                                                        vip: true,
                                                        vipPlan: 'manual_semiannual',
                                                        vipExpiresAt: expiresAt.toISOString()
                                                    });
                                                    alert("VIP de 6 Meses Ativado!");
                                                    setSelectedUser({ ...selectedUser, vip: true });
                                                    refreshLeaderboard();
                                                }
                                            }}
                                            style={{ padding: '6px 10px', background: '#ffd700', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            6 Meses
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Dar VIP de 1 Ano para ${selectedUser.name}?`)) {
                                                    const expiresAt = new Date();
                                                    expiresAt.setDate(expiresAt.getDate() + 365);
                                                    await updateUser(selectedUser.uid, {
                                                        vip: true,
                                                        vipPlan: 'manual_annual',
                                                        vipExpiresAt: expiresAt.toISOString()
                                                    });
                                                    alert("VIP de 1 Ano Ativado!");
                                                    setSelectedUser({ ...selectedUser, vip: true });
                                                    refreshLeaderboard();
                                                }
                                            }}
                                            style={{ padding: '6px 10px', background: '#ffd700', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            1 Ano
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}


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
                                    onClick={() => {
                                        if (onBattle) onBattle(selectedUser);
                                    }}
                                    style={{
                                        width: '100%', padding: '12px',
                                        background: 'linear-gradient(90deg, #ff0055, #ff4444)',
                                        border: 'none', borderRadius: '8px',
                                        color: '#fff', fontWeight: 'bold',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 4px 12px rgba(255, 0, 85, 0.3)'
                                    }}
                                >
                                    ⚔️ DUELAR
                                </button>
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
                                <button
                                    onClick={() => {
                                        if (onBattle) onBattle(selectedUser);
                                    }}
                                    style={{
                                        width: '100%', padding: '12px',
                                        background: 'linear-gradient(90deg, #ff0055, #ff4444)',
                                        border: 'none', borderRadius: '8px',
                                        color: '#fff', fontWeight: 'bold',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 4px 12px rgba(255, 0, 85, 0.3)',
                                        marginBottom: '10px'
                                    }}
                                >
                                    ⚔️ DUELAR (Amistoso)
                                </button>
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

                        {/* Unfriend Overlay */}
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
                                    Você e <strong>{selectedUser.name}</strong> deixarão de ser amigos.
                                </p>
                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <button onClick={() => setShowUnfriendConfirm(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                    <button onClick={handleUnfriend} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#ff4444', color: '#fff', fontWeight: 'bold' }}>Desfazer</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Banner Ad (Variable Bottom) */}
            <BannerAd isVip={profile.vip} />

            {/* VIP Plans Modal attached */}
            {showVipModal && <VipPlansModal />}
            {/* Support Link */}
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#666', fontSize: '0.8rem' }}>
                Precisa de ajuda? Entre em contato com o <a href="mailto:nollramsilva9@gmail.com" style={{ color: '#888', textDecoration: 'underline' }}>suporte</a>
            </div>
        </section>
    );
};

export default RankingSection;
