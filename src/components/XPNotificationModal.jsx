import React from 'react';

const XPNotificationModal = ({ onClose, penalty, missedDays, dates, currentXp }) => {
    // Format dates for display (DD/MM/YYYY)
    const formattedDates = dates.map(d => {
        const dateObj = new Date(d);
        // Add 1 day if timezone issue, but assuming UTC string standard usage:
        // Actually split('T')[0] gives YYYY-MM-DD.
        const [year, month, day] = d.split('-');
        return `${day}/${month}/${year}`;
    });

    const finalXp = Math.max(0, currentXp - penalty);

    return (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
            <div className="card" style={{
                width: '90%', maxWidth: '400px',
                textAlign: 'center',
                background: 'linear-gradient(145deg, #1a0b0b 0%, #000 100%)', // Dark Red/Black theme for Alert
                border: '2px solid #ff4444',
                boxShadow: '0 0 40px rgba(255, 68, 68, 0.3)',
                padding: '2rem'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>

                <h2 style={{ color: '#ff4444', fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    XP PERDIDO!
                </h2>

                <p style={{ color: '#ccc', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    Você esqueceu de treinar em:
                    <br />
                    {formattedDates.map((date, i) => (
                        <span key={i} style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginTop: '5px' }}>
                            📅 {date}
                        </span>
                    ))}
                </p>

                <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '15px', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem', color: '#aaa' }}>
                        <span>XP Anterior:</span>
                        <span>{currentXp}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1rem', color: '#ff4444', fontWeight: 'bold' }}>
                        <span>Penalidade:</span>
                        <span>- {penalty}</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,68,68,0.3)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#fff' }}>
                        <span>XP Atual:</span>
                        <span>{finalXp}</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: '#ff4444',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        boxShadow: '0 5px 15px rgba(255, 68, 68, 0.4)'
                    }}
                >
                    ENTENDI E ACEITO
                </button>
            </div>
        </div>
    );
};

export default XPNotificationModal;
