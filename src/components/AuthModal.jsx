import React, { useState } from 'react';
import { registerUser, loginUser } from '../utils/db';

const AuthModal = ({ onClose, onSuccess }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLoginMode) {
                const res = await loginUser(email, password);
                if (res.error) {
                    setError(res.error);
                } else {
                    onSuccess(res.user);
                }
            } else {
                if (!name) { setError('Nome é obrigatório.'); setLoading(false); return; }
                const res = await registerUser(email, password, name);
                if (res.error) {
                    setError(res.error);
                } else {
                    onSuccess(res.user);
                }
            }
        } catch (err) {
            console.error(err);
            setError('Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="wide-modal auth-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '2.5rem' }}>
                <button className="close-btn" onClick={onClose} style={{
                    position: 'absolute', top: '20px', right: '20px', fontSize: '1.5rem', opacity: 0.7
                }}>×</button>

                <form onSubmit={handleSubmit}>
                    <h2 style={{ marginBottom: '0.5rem' }}>
                        {isLoginMode ? 'Acessar ' : 'Criar Conta '}
                        <span className="title-gradient">MetaFit</span>
                    </h2>
                    <p style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
                        {isLoginMode ? 'Entre para ver o ranking e seus treinos.' : 'Receba seu ID único e comece agora.'}
                    </p>

                    {!isLoginMode && (
                        <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Nome</label>
                            <input
                                type="text"
                                placeholder="Seu nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                            />
                        </div>
                    )}

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '2rem', position: 'relative' }}>
                        <label>Senha</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '38px', // Adjusted for label height approx
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                opacity: 0.7,
                                color: '#fff'
                            }}
                            title={showPassword ? "Ocultar senha" : "Ver senha"}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </button>
                    </div>

                    {error && <div style={{ color: '#ff0055', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                    <button className="btn-auth-primary" type="submit" style={{ width: '100%', opacity: loading ? 0.7 : 1 }} disabled={loading}>
                        {loading ? 'AGUARDE...' : (isLoginMode ? 'ENTRAR' : 'CRIAR CONTA')}
                    </button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        <span style={{ color: '#888' }}>
                            {isLoginMode ? 'Não tem conta? ' : 'Já tem conta? '}
                        </span>
                        <button
                            type="button"
                            onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            {isLoginMode ? 'Cadastre-se' : 'Fazer Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
