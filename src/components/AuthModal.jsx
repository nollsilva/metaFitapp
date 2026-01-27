import React, { useState } from 'react';
import { registerUser, loginUser, resetPassword } from '../utils/db';

const AuthModal = ({ onClose, onSuccess }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isForgotMode) {
                const res = await resetPassword(email);
                if (res.error) {
                    setError(res.error);
                } else {
                    setSuccess('Email de redefinição enviado! Verifique sua caixa de entrada.');
                    // Optional: Switch back to login after delay
                }
            } else if (isLoginMode) {
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
                        {isForgotMode ? 'Redefinir Senha' : (isLoginMode ? 'Acessar ' : 'Criar Conta ')}
                        <span className="title-gradient">MetaFit</span>
                    </h2>
                    <p style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
                        {isForgotMode
                            ? 'Digite seu email para receber o link de redefinição.'
                            : (isLoginMode ? 'Entre para ver o ranking e seus treinos.' : 'Receba seu ID único e comece agora.')
                        }
                    </p>

                    {!isLoginMode && !isForgotMode && (
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

                    {!isForgotMode && (
                        <div className="input-group" style={{ marginBottom: '2rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <label>Senha</label>
                                {isLoginMode && (
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotMode(true); setError(''); setSuccess(''); }}
                                        style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Esqueceu a senha?
                                    </button>
                                )}
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={!isForgotMode}
                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '38px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    opacity: 0.7,
                                    color: '#fff'
                                }}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>
                    )}

                    {error && <div style={{ color: '#ff0055', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                    {success && <div style={{ color: '#00ff66', marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</div>}

                    <button className="btn-auth-primary" type="submit" style={{ width: '100%', opacity: loading ? 0.7 : 1 }} disabled={loading}>
                        {loading ? 'AGUARDE...' : (isForgotMode ? 'ENVIAR LINK' : (isLoginMode ? 'ENTRAR' : 'CRIAR CONTA'))}
                    </button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {isForgotMode ? (
                            <button
                                type="button"
                                onClick={() => { setIsForgotMode(false); setError(''); setSuccess(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Voltar para Login
                            </button>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
