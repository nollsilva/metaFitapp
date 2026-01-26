import React from 'react';

const BodyAvatar = ({ selectedParts, onTogglePart }) => {
    const isSelected = (part) => selectedParts.includes(part);

    return (
        <div className="avatar-card card animate-fade-in" style={{
            background: 'linear-gradient(145deg, #121215 0%, #0a0a0c 100%)',
            padding: '2.5rem',
            borderRadius: '24px',
            border: '1px solid rgba(0, 240, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Grid for Tech Feel */}
            <div className="grid-bg"></div>

            <div style={{ position: 'relative', zIndex: 2 }}>
                <h3 style={{ marginBottom: '0.5rem', letterSpacing: '2px', fontSize: '1.4rem' }}>
                    INTERFACE DE <span className="title-gradient">SCAN</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Selecione as áreas de foco para personalizar seu treinamento dinâmico:
                </p>

                <div className="avatar-viewport">
                    <svg viewBox="0 0 100 140" className="hologram-svg">
                        <defs>
                            <filter id="glow-fx" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Silhouette Body Figure */}
                        <g filter="url(#glow-fx)">
                            {/* Head */}
                            <circle cx="50" cy="12" r="6" fill="none" stroke="var(--color-primary)" strokeWidth="1" />

                            {/* Neck & Shoulders */}
                            <path d="M 47,18 L 53,18 M 35,25 L 65,25" fill="none" stroke="var(--color-primary)" strokeWidth="1" />

                            {/* Torso (Chest/Abs Cluster) */}
                            <path
                                d="M 35,25 L 65,25 L 62,55 L 38,55 Z"
                                className={`body-part ${isSelected('chest') ? 'selected' : ''}`}
                                onClick={() => onTogglePart('chest')}
                            />

                            {/* Core (Abs) */}
                            <path
                                d="M 40,55 L 60,55 L 58,75 L 42,75 Z"
                                className={`body-part ${isSelected('abs') ? 'selected' : ''}`}
                                onClick={() => onTogglePart('abs')}
                            />

                            {/* Arms */}
                            <path d="M 35,25 L 25,60 M 65,25 L 75,60" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

                            {/* Legs */}
                            <g className={`body-part ${isSelected('legs') ? 'selected' : ''}`} onClick={() => onTogglePart('legs')} style={{ cursor: 'pointer' }}>
                                <path d="M 42,75 L 38,130" fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
                                <path d="M 58,75 L 62,130" fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
                            </g>

                            {/* Interior details to look like wireframe */}
                            <line x1="50" y1="25" x2="50" y2="75" stroke="var(--color-primary)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
                        </g>

                        {/* Animated Scanning Line */}
                        <rect x="10" y="0" width="80" height="1" fill="var(--color-primary)" className="scan-line">
                            <animate attributeName="y" from="0" to="140" dur="3s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
                        </rect>
                    </svg>

                    {/* Interactive UI Overlays */}
                    <div className="ui-overlays">
                        <div className={`ui-item ${isSelected('chest') ? 'active' : ''}`} style={{ top: '25%', left: '0' }}>SUPERIOR</div>
                        <div className={`ui-item ${isSelected('abs') ? 'active' : ''}`} style={{ top: '45%', right: '0' }}>CORE</div>
                        <div className={`ui-item ${isSelected('legs') ? 'active' : ''}`} style={{ bottom: '20%', left: '0' }}>INFERIOR</div>
                    </div>
                </div>
            </div>

            <style>{`
                .avatar-viewport { position: relative; height: 450px; width: 100%; display: flex; justify-content: center; }
                .hologram-svg { height: 100%; width: auto; overflow: visible; transition: transform 0.5s; }
                
                .body-part { 
                    fill: rgba(0, 240, 255, 0.05); 
                    stroke: var(--color-primary); 
                    stroke-width: 1; 
                    cursor: pointer; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .body-part:hover { fill: rgba(0, 240, 255, 0.15); stroke-width: 1.5; filter: contrast(1.2); }
                .body-part.selected { 
                    fill: rgba(0, 240, 255, 0.3); 
                    stroke-width: 2.5; 
                    filter: drop-shadow(0 0 10px var(--color-primary));
                }

                .grid-bg {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background-image: linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px), 
                                      linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px);
                    background-size: 20px 20px;
                    opacity: 0.3;
                }

                .ui-item {
                    position: absolute;
                    padding: 4px 12px;
                    font-family: 'monospace';
                    font-size: 0.7rem;
                    color: rgba(255,255,255,0.4);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 4px;
                    background: rgba(0,0,0,0.3);
                    transition: 0.3s;
                }
                .ui-item.active {
                    color: var(--color-primary);
                    border-color: var(--color-primary);
                    background: rgba(0,240,255,0.1);
                    box-shadow: 0 0 15px rgba(0,240,255,0.2);
                }

                .scan-line { filter: drop-shadow(0 0 5px var(--color-primary)); }
            `}</style>
        </div>
    );
};

export default BodyAvatar;
