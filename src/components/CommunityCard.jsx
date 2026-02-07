import React from 'react';

const CommunityCard = ({ post, isAdmin, onEdit, onDelete }) => {
    return (
        <div className="animate-fade-in" style={{
            background: 'rgba(20, 20, 25, 0.8)',
            border: post.isFeatured ? '1px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            marginBottom: '25px', // Increased margin
            width: '85%', // Reduced width for "1.5 posts" effect
            margin: '0 auto 25px', // Center and margin bottom
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)' // Added shadow for depth
        }}>
            {/* ADMIN CONTROLS */}
            {isAdmin && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 10,
                    display: 'flex',
                    gap: '5px'
                }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(post); }}
                        style={{
                            background: 'rgba(0, 100, 255, 0.8)', color: '#fff', border: 'none',
                            borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px'
                        }}
                    >
                        ✏️
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                        style={{
                            background: 'rgba(255, 0, 0, 0.8)', color: '#fff', border: 'none',
                            borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px'
                        }}
                    >
                        🗑️
                    </button>
                </div>
            )}

            {post.isFeatured && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#ffd700',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    zIndex: 2,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                    DESTAQUE 🔥
                </div>
            )}

            <div style={{ position: 'relative', width: '100%', paddingTop: '177.77%' /* Story aspect ratio 9:16 */ }}>
                <img
                    src={post.image}
                    alt={post.name}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: post.imageFit || 'cover', // Dynamic fit
                        background: '#000' // Black background for 'contain' mode
                    }}
                    loading="lazy"
                />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    padding: '20px 15px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end'
                }}>
                    <span style={{
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                    }}>
                        {post.name}
                    </span>
                </div>
            </div>

            <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontSize: '0.8rem',
                        color: '#aaa',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {post.type}
                    </span>
                    <span style={{
                        fontSize: '0.85rem',
                        color: '#00ff66',
                        fontWeight: '500'
                    }}>
                        {post.timeText}
                    </span>
                </div>

                {/* No interactions, just a static icon to imply verified/community */}
                <div style={{ opacity: 0.5 }}>
                    🏁
                </div>
            </div>
        </div>
    );
};

export default CommunityCard;
