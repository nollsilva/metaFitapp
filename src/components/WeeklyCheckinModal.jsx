import React, { useState, useEffect } from 'react';
import { updateUser } from '../utils/db'; // Ensure this path is correct

const WeeklyCheckinModal = ({ profile, onUpdateProfile, onClose }) => {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({
        completed: null, // "Você conseguiu completar todos os treinos?"
        goodForm: null,  // "Manteve boa execução?"
        wantsHarder: null // "Quer nível mais difícil?"
    });

    const isLevelUp = answers.completed && answers.goodForm && answers.wantsHarder;

    const handleAnswer = (key, value) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
        setStep(prev => prev + 1);
    };

    const handleFinish = async () => {
        const currentLevel = profile.workoutLevel || 1;
        let newLevel = currentLevel;
        let message = "";

        if (isLevelUp) {
            newLevel = Math.min(3, currentLevel + 1); // Max level 3
            message = `🔥 Parabéns! Você subiu para o Nível ${newLevel}!`;
        } else {
            message = "👍 Mantendo o ritmo. A consistência é a chave.";
        }

        // Save to DB
        if (profile.uid) {
            await updateUser(profile.uid, {
                workoutLevel: newLevel,
                lastWeeklyCheckin: new Date().toISOString()
            });
        }

        // Update Local State via prop
        onUpdateProfile({
            ...profile,
            workoutLevel: newLevel,
            lastWeeklyCheckin: new Date().toISOString()
        });

        onClose(message);
    };

    if (!profile) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', zIndex: 10000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px'
        }}>
            <div className="animate-slide-up" style={{
                background: '#1a1a2e',
                border: '1px solid #00f0ff',
                borderRadius: '20px',
                padding: '30px',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
            }}>
                <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.5rem' }}>
                    📅 Check-in Semanal
                </h2>

                {step === 0 && (
                    <>
                        <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '1.1rem' }}>
                            Você conseguiu completar <strong>todos</strong> os treinos desta semana?
                        </p>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => handleAnswer('completed', true)} style={btnStyle(true)}>Sim</button>
                            <button onClick={() => handleAnswer('completed', false)} style={btnStyle(false)}>Não</button>
                        </div>
                    </>
                )}

                {step === 1 && (
                    <>
                        <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '1.1rem' }}>
                            Conseguiu manter <strong>boa execução</strong> na maioria dos exercícios?
                        </p>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => handleAnswer('goodForm', true)} style={btnStyle(true)}>Sim</button>
                            <button onClick={() => handleAnswer('goodForm', false)} style={btnStyle(false)}>Não</button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '1.1rem' }}>
                            Está sentindo facilidade e deseja tentar um nível <strong>mais difícil</strong> na próxima semana?
                        </p>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => handleAnswer('wantsHarder', true)} style={btnStyle(true)}>Sim</button>
                            <button onClick={() => handleAnswer('wantsHarder', false)} style={btnStyle(false)}>Não (Manter)</button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>
                            {isLevelUp ? '🚀' : '🛡️'}
                        </div>
                        <h3 style={{ color: isLevelUp ? '#00f0ff' : '#fff', marginBottom: '15px' }}>
                            {isLevelUp ? 'Subindo de Nível!' : 'Mantendo o Foco'}
                        </h3>
                        <p style={{ color: '#aaa', marginBottom: '30px' }}>
                            {isLevelUp
                                ? 'Seus treinos serão ajustados para maior intensidade.'
                                : 'Continuaremos no nível atual para consolidar sua base.'}
                        </p>
                        <button onClick={handleFinish} style={{
                            width: '100%', padding: '15px', borderRadius: '12px',
                            background: 'linear-gradient(90deg, #00f0ff, #0066ff)',
                            color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '1.1rem'
                        }}>
                            Confirmar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const btnStyle = (isPositive) => ({
    flex: 1,
    padding: '15px',
    borderRadius: '12px',
    border: 'none',
    background: isPositive ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 68, 68, 0.2)',
    color: isPositive ? '#00ff80' : '#ff4444',
    border: `1px solid ${isPositive ? '#00ff80' : '#ff4444'}`,
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer'
});

export default WeeklyCheckinModal;
