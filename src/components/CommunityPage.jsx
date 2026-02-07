import React, { useState, useEffect } from 'react';
import { communityData } from '../data/communityData';
import CommunityCard from './CommunityCard';
import JoinCommunityModal from './JoinCommunityModal';
import AddPostModal from './AddPostModal';
import { subscribeToCommunityFeed, deleteCommunityPost } from '../utils/db'; // Added delete

const CommunityPage = ({ profile }) => { // Receives profile
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [posts, setPosts] = useState(communityData);
    const [isAdmin, setIsAdmin] = useState(false);
    const [headerClicks, setHeaderClicks] = useState(0);

    // Edit State
    const [postToEdit, setPostToEdit] = useState(null);

    const isRootAdmin = profile?.email === "nollramsilva9@gmail.com";

    // Auto-enable admin for root
    useEffect(() => {
        if (isRootAdmin) setIsAdmin(true);
    }, [isRootAdmin]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (typeof subscribeToCommunityFeed !== 'function') {
            console.error("CRITICAL: subscribeToCommunityFeed is NOT a function!");
            return;
        }

        const unsubscribe = subscribeToCommunityFeed((newPosts) => {
            const combined = [...newPosts, ...communityData];
            setPosts(combined);
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const handleDelete = async (postId) => {
        if (!window.confirm("Tem certeza que deseja apagar este post?")) return;

        const result = await deleteCommunityPost(postId);
        if (result.success) {
            // Optimistic update or wait for subscription
            // Subscription will handle it, but we can alert
        } else {
            alert("Erro ao apagar: " + result.error);
        }
    };

    const handleEdit = (post) => {
        setPostToEdit(post);
        setShowAddModal(true);
    };

    // Secret Admin Trigger (Still works for non-root admins if any existed, but mostly for debug)
    const handleHeaderClick = () => {
        const newCount = headerClicks + 1;
        setHeaderClicks(newCount);
        if (newCount >= 7) {
            if (!isAdmin) {
                setIsAdmin(true);
                alert("Modo Admin Ativado! 🛠️");
            }
        }
    };

    return (
        <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
            {/* Header */}
            <div style={{ padding: '20px 20px 10px', textAlign: 'center' }} onClick={handleHeaderClick}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '5px', background: 'linear-gradient(45deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer', userSelect: 'none' }}>
                    Comunidade MetaFit 💪
                </h1>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    Veja quem está evoluindo junto com você.
                </p>
                <div style={{
                    marginTop: '10px',
                    background: 'rgba(255, 0, 85, 0.1)',
                    border: '1px solid rgba(255, 0, 85, 0.3)',
                    padding: '8px 15px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    fontSize: '0.8rem',
                    color: '#ff4d4d'
                }}>
                    Marque @metafit para aparecer aqui!
                </div>
            </div>

            {/* Feed */}
            <div style={{ padding: '10px 20px' }}>
                {posts.map((post, index) => (
                    <CommunityCard
                        key={post.id || index}
                        post={post}
                        isAdmin={isRootAdmin} // Only ROOT gets edit/delete
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Admin Add Button */}
            {isAdmin && (
                <button
                    onClick={() => { setPostToEdit(null); setShowAddModal(true); }}
                    style={{
                        position: 'fixed',
                        bottom: '150px',
                        right: '20px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: '#00ccff',
                        color: '#000',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(0, 204, 255, 0.5)',
                        fontSize: '2rem',
                        zIndex: 1000,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    +
                </button>
            )}

            {/* CTA Fixed Bottom */}
            <div style={{
                position: 'fixed',
                bottom: '80px', // Above bottom nav
                left: '0',
                width: '100%',
                padding: '10px 20px',
                background: 'linear-gradient(to top, #111 20%, transparent)',
                pointerEvents: 'none', // Allow clicking through transparent part
                display: 'flex',
                justifyContent: 'center',
                zIndex: 900
            }}>
                <button
                    onClick={() => setShowJoinModal(true)}
                    className="btn-primary"
                    style={{
                        pointerEvents: 'auto',
                        boxShadow: '0 4px 20px rgba(0, 255, 102, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <span>📸</span> Quero aparecer aqui
                </button>
            </div>

            {showJoinModal && (
                <JoinCommunityModal onClose={() => setShowJoinModal(false)} />
            )}

            {showAddModal && (
                <AddPostModal
                    onClose={() => { setShowAddModal(false); setPostToEdit(null); }}
                    postToEdit={postToEdit}
                />
            )}
        </div>
    );
};

export default CommunityPage;
