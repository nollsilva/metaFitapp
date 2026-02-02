import React from 'react';

const StatisticSelector = ({ label, icon, value, onSelect, color, allEfforts }) => {
    return (
        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.8rem', color: '#fff', fontSize: '1rem' }}>
                <span style={{ marginRight: '10px', fontSize: '1.4rem' }}>{icon}</span>
                <span style={{ flex: 1, fontWeight: 'bold' }}>{label}</span>
                <span style={{ color: color, fontWeight: 'bold', fontSize: '1.2rem' }}>{value}%</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {[50, 75, 100].map(opt => {
                    const isActive = value === opt;
                    const isTaken = Object.values(allEfforts).includes(opt) && !isActive;

                    return (
                        <button
                            key={opt}
                            onClick={() => onSelect(opt)}
                            style={{
                                flex: 1,
                                padding: '12px 5px',
                                border: isActive ? `2px solid ${color}` : isTaken ? '1px dashed #555' : '1px solid #444',
                                background: isActive ? color : isTaken ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                                color: isActive ? '#000' : isTaken ? '#666' : '#aaa',
                                borderRadius: '8px',
                                fontWeight: isActive ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            {opt}%
                            {isTaken && <div style={{ fontSize: '0.6rem', position: 'absolute', bottom: '2px', left: 0, width: '100%', opacity: 0.7 }}>TROCAR</div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

export default StatisticSelector;
