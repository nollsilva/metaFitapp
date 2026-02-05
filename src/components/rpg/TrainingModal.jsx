import React, { useState } from 'react';
import { XP_COST_PER_UNIT, GAINS, TRAINING_DURATION_MS } from '../../utils/rpgLogic';

const TrainingModal = ({ zone, currentXp, onClose, onConfirm }) => {
    const [chunks, setChunks] = useState(1);

    const cost = chunks * XP_COST_PER_UNIT;
    const gain = chunks * GAINS[zone.attr];
    const durationMs = chunks * TRAINING_DURATION_MS;

    // Format duration
    const hours = Math.floor(durationMs / (1000 * 60 * 60));

    const canAfford = currentXp >= cost;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="animate-fade-in" style={{
                background: '#1a1a1a', border: `2px solid ${zone.color}`,
                padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px',
                textAlign: 'center', position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}
                >✕</button>

                <h2 style={{ color: zone.color, marginTop: 0 }}>Treinar {zone.label}</h2>
                <div style={{ fontSize: '3rem', margin: '10px 0' }}>
                    {zone.id === 'weights' && '🏋️'}
                    {zone.id === 'treadmill' && '🏃'}
                    {zone.id === 'mats' && '🧗'}
                </div>

                <div style={{ background: '#333', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <p style={{ margin: '5px 0', color: '#aaa' }}>Disponível: <strong style={{ color: '#fff' }}>{currentXp} XP</strong></p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', margin: '15px 0' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => setChunks(Math.max(1, chunks - 1))}
                            disabled={chunks <= 1}
                        >-</button>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{chunks}x ({cost} XP)</span>
                        <button
                            className="btn-secondary"
                            onClick={() => setChunks(chunks + 1)}
                            disabled={currentXp < (chunks + 1) * XP_COST_PER_UNIT}
                        >+</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.9rem' }}>
                        <div>
                            <span style={{ display: 'block', color: '#aaa' }}>Ganho</span>
                            <span style={{ color: zone.color, fontWeight: 'bold' }}>+{gain} {zone.attr}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', color: '#aaa' }}>Tempo</span>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{hours} horas</span>
                        </div>
                    </div>
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', background: canAfford ? zone.color : '#555', cursor: canAfford ? 'pointer' : 'not-allowed' }}
                    onClick={() => {
                        if (canAfford) onConfirm({ chunks, cost, gain, durationMs });
                    }}
                    disabled={!canAfford}
                >
                    {canAfford ? 'INICIAR TREINO' : 'XP INSUFICIENTE'}
                </button>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
                    *O personagem ficará indisponível durante o treino.
                </p>
            </div>
        </div>
    );
};

export default TrainingModal;
