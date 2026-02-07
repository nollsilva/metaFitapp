import React from 'react';

const JoinCommunityModal = ({ onClose }) => {
    return (
        <div
            onClick={onClose}
            className="animate-fade-in"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.8)',
                zIndex: 5000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#1a1a1a',
                    width: '90%',
                    maxWidth: '400px',
                    borderRadius: '20px',
                    padding: '30px',
                    border: '1px solid #333',
                    textAlign: 'center',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        color: '#aaa',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >✕</button>

                <h2 style={{ color: '#fff', marginBottom: '10px' }}>Quer aparecer aqui? 🤩</h2>
                <p style={{ color: '#aaa', fontSize: '0.95rem', marginBottom: '25px' }}>
                    Mostre sua dedicação para a comunidade MetaFit!
                </p>

                <div style={{ textAlign: 'left', background: '#222', padding: '15px', borderRadius: '10px', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ background: '#00ff66', color: '#000', width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '10px' }}>1</span>
                        <span style={{ color: '#fff' }}>Poste um story ou foto do seu treino.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ background: '#00ff66', color: '#000', width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '10px' }}>2</span>
                        <span style={{ color: '#fff' }}>Marque <strong style={{ color: '#ff0055' }}>@metafit</strong> no Instagram.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ background: '#00ff66', color: '#000', width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '10px' }}>3</span>
                        <span style={{ color: '#fff' }}>Use a hashtag <strong>#MetaFit</strong>.</span>
                    </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginBottom: '20px' }}>
                    * Os posts passam por curadoria da nossa equipe antes de aparecerem no app para garantir a segurança da comunidade.
                </div>

                <button
                    onClick={onClose}
                    className="btn-primary"
                    style={{ width: '100%', py: '12px' }}
                >
                    Entendi, vou postar! 📸
                </button>
            </div>
        </div>
    );
};

export default JoinCommunityModal;
