import React from 'react';

const StatisticSelector = ({ label, icon, value, onSelect, color, maxAvailable }) => {
    return (
        <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#fff', fontSize: '1rem' }}>
                    <span style={{ marginRight: '10px', fontSize: '1.4rem' }}>{icon}</span>
                    <div>
                        <span style={{ fontWeight: 'bold', display: 'block' }}>{label}</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Disponível: <span style={{ color: color, fontWeight: 'bold' }}>{maxAvailable}</span></span>
                    </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: color }}>
                    {value}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="range"
                    min="0"
                    max={maxAvailable}
                    value={value > maxAvailable ? maxAvailable : value} // Ensure value doesn't exceed new max
                    onChange={(e) => onSelect(parseInt(e.target.value))}
                    style={{
                        flex: 1,
                        appearance: 'none',
                        height: '6px',
                        borderRadius: '3px',
                        background: '#333',
                        outline: 'none',
                        cursor: 'pointer',
                        accentColor: color
                    }}
                />
            </div>
            {/* Quick Select Buttons */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                {[0, Math.floor(maxAvailable * 0.33), Math.floor(maxAvailable * 0.5), maxAvailable].map((v, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(v)}
                        style={{
                            flex: 1,
                            padding: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#aaa',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                    >
                        {i === 0 ? '0' : i === 3 ? 'MAX' : v}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StatisticSelector;
