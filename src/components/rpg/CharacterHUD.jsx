import React from 'react';
import { calculateMaxHp } from '../../utils/rpgLogic';

const CharacterHUD = ({ attributes }) => {
    const { str = 0, spd = 0, res = 0 } = attributes;
    const maxHp = calculateMaxHp(str, res);

    // Styling for attribute items
    const itemStyle = {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '8px',
        border: '1px solid #333', minWidth: '60px'
    };

    const labelStyle = { fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' };
    const valStyle = { fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' };

    return (
        <div style={{
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '10px', zIndex: 10,
            background: 'rgba(20, 20, 20, 0.9)', padding: '10px', borderRadius: '12px',
            border: '1px solid #444', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
            <div style={itemStyle}>
                <span style={labelStyle}>Força</span>
                <span style={{ ...valStyle, color: '#ff4444' }}>{str}</span>
            </div>
            <div style={itemStyle}>
                <span style={labelStyle}>Velocidade</span>
                <span style={{ ...valStyle, color: '#4444ff' }}>{spd}</span>
            </div>
            <div style={itemStyle}>
                <span style={labelStyle}>Resistência</span>
                <span style={{ ...valStyle, color: '#44ff44' }}>{res}</span>
            </div>
            <div style={{ ...itemStyle, borderColor: '#ff0055' }}>
                <span style={labelStyle}>Vida</span>
                <span style={{ ...valStyle, color: '#ff0055' }}>{maxHp}</span>
            </div>
        </div>
    );
};

export default CharacterHUD;
