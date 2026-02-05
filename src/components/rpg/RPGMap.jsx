import React, { useRef, useEffect, useState } from 'react';
import CharacterHUD from './CharacterHUD';
import TrainingModal from './TrainingModal';
import RingBattle from './RingBattle';
import { ZONES, formatTimeRemaining, getCycleDay } from '../../utils/rpgLogic';

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

// Tile IDs
const TILE_FLOOR = 0;
const TILE_WALL = 1;

// Zone Tiles
const TILE_WEIGHTS = 10;
const TILE_TREADMILL = 11;
const TILE_MATS = 12;

const RPGMap = ({ profile, onUpdateProfile }) => {
    const canvasRef = useRef(null);
    const [player, setPlayer] = useState({ x: 10, y: 7 });
    const [currentZone, setCurrentZone] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Day Cycle State (Debuggable)
    const [currentDay, setCurrentDay] = useState(getCycleDay());

    // Training State
    const trainingState = profile?.rpg?.training || null;
    const [timeLeft, setTimeLeft] = useState(null);

    // Initial Attributes
    const attributes = profile?.rpg?.attributes || { str: 1, spd: 1, res: 1 };

    // Check Timer
    useEffect(() => {
        if (!trainingState) return;

        const checkTimer = () => {
            const now = Date.now();
            if (now < trainingState.endTime) {
                setTimeLeft(formatTimeRemaining(trainingState.endTime));
            } else {
                setTimeLeft(null);
            }
        };

        checkTimer(); // Initial
        const interval = setInterval(checkTimer, 60000); // Update every min
        return () => clearInterval(interval);
    }, [trainingState]);

    const handleStartTraining = ({ chunks, cost, gain, durationMs }) => {
        const now = Date.now();
        const endTime = now + durationMs;

        const newXp = (profile.xp || 0) - cost;
        const currentAttr = profile.rpg?.attributes?.[currentZone.attr] || 0;

        const newRpgState = {
            ...profile.rpg,
            attributes: {
                ...attributes,
                [currentZone.attr]: currentAttr + gain
            },
            training: {
                type: currentZone.id,
                endTime: endTime,
                xpInvested: cost
            }
        };

        onUpdateProfile({ xp: newXp, rpg: newRpgState });
        setShowModal(false);
    };

    // If Day 6 -> Render Ring (Battle Mode)
    if (currentDay === 6) {
        return (
            <div style={{ height: '100%', position: 'relative' }}>
                <RingBattle
                    profile={profile}
                    onBattleFinish={(result) => {
                        alert(`Combate encerrado! Resultado: ${result}`);
                        setCurrentDay(1); // Reset to Day 1
                        // Add Rewards Logic Here (Phase 4)
                    }}
                />

                {/* Debug Day Switcher (Floating) */}
                <div style={{ position: 'absolute', top: 50, right: 10, background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px', zIndex: 100 }}>
                    <small style={{ color: '#fff' }}>Dia: {currentDay}</small>
                    <button onClick={() => setCurrentDay(currentDay === 7 ? 1 : currentDay + 1)} style={{ marginLeft: '5px' }}>Next</button>
                </div>
            </div>
        );
    }

    // Gym Layout
    // 0: Floor, 1: Wall
    // 10: Weights (Red), 11: Treadmill (Blue), 12: Mats (Green)
    const mapRef = useRef([
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 11, 11, 11, 11, 1, 0, 0, 0, 1, 0, 0, 0, 1, 10, 10, 10, 10, 1], // Top Row Rooms
        [1, 11, 11, 11, 11, 1, 0, 0, 0, 1, 0, 0, 0, 1, 10, 10, 10, 10, 1],
        [1, 11, 11, 11, 11, 1, 0, 0, 0, 1, 0, 0, 0, 1, 10, 10, 10, 10, 1],
        [1, 11, 11, 11, 11, 1, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 1], // Open doors
        [1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Hallway
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Hallway (Player Start)
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Hallway
        [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Open door to bottom room
        [1, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 1],
        [1, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 1], // Large Mats Room
        [1, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const draw = () => {
            // Draw Map Function
            const drawMap = () => {
                // Background
                ctx.fillStyle = '#1a1a1a'; // Dark background for "void"
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                for (let y = 0; y < MAP_HEIGHT; y++) {
                    for (let x = 0; x < MAP_WIDTH; x++) {
                        const tile = mapRef.current[y][x];
                        const tx = x * TILE_SIZE;
                        const ty = y * TILE_SIZE;

                        // --- FLOOR DRAWING ---
                        if (tile !== TILE_WALL) {
                            // Default Floor (Concrete/Tile)
                            ctx.fillStyle = '#e0e0e0'; // Light concrete
                            if (tile === TILE_WEIGHTS) ctx.fillStyle = '#ffcccc'; // Light Red Tint
                            if (tile === TILE_TREADMILL) ctx.fillStyle = '#ccccff'; // Light Blue Tint
                            if (tile === TILE_MATS) ctx.fillStyle = '#ccffcc'; // Light Green Tint

                            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                            // Tile Grid Lines (Subtle)
                            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
                        }

                        // --- WALL DRAWING (Brick Style) ---
                        if (tile === TILE_WALL) {
                            ctx.fillStyle = '#8b4513'; // Brick Red/Brown
                            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                            // Brick Pattern
                            ctx.fillStyle = 'rgba(0,0,0,0.3)';
                            ctx.fillRect(tx, ty + 10, TILE_SIZE, 2); // Mortar line
                            ctx.fillRect(tx + 16, ty, 2, 10); // Vertical mortar
                            ctx.fillRect(tx + 8, ty + 12, 2, 20); // Vertical mortar offset

                            // Wall Border
                            ctx.strokeStyle = '#000';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);

                            // Cast Shadow on Floor below
                            if (y + 1 < MAP_HEIGHT && mapRef.current[y + 1][x] !== TILE_WALL) {
                                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                                ctx.fillRect(tx, ty + TILE_SIZE, TILE_SIZE, 10); // Shadow
                            }
                        }

                        // --- OBJECT DRAWING ---
                        // Weights Bench
                        if (tile === TILE_WEIGHTS) {
                            // Bench
                            ctx.fillStyle = '#333';
                            ctx.fillRect(tx + 8, ty + 4, 16, 24);
                            // Bar
                            ctx.fillStyle = '#aaa';
                            ctx.fillRect(tx + 4, ty + 8, 24, 4);
                            // Weights on bar
                            ctx.fillStyle = '#000';
                            ctx.beginPath();
                            ctx.arc(tx + 6, ty + 10, 4, 0, Math.PI * 2);
                            ctx.arc(tx + 26, ty + 10, 4, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // Treadmill
                        if (tile === TILE_TREADMILL) {
                            ctx.fillStyle = '#444';
                            ctx.fillRect(tx + 6, ty + 2, 20, 28); // Base
                            ctx.fillStyle = '#222';
                            ctx.fillRect(tx + 8, ty + 4, 16, 24); // Belt
                            ctx.fillStyle = '#666';
                            ctx.fillRect(tx + 6, ty + 2, 20, 6); // Console
                            ctx.fillStyle = '#00f'; // Screen glow
                            ctx.fillRect(tx + 10, ty + 3, 12, 4);
                        }

                        // Yoga Mat
                        if (tile === TILE_MATS) {
                            ctx.fillStyle = '#44aa44'; // Mat color
                            ctx.fillRect(tx + 4, ty + 6, 24, 20);
                            ctx.strokeStyle = '#338833';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(tx + 4, ty + 6, 24, 20);
                        }
                    }
                }
            };

            drawMap();

            // Draw Player (Top Down Head + Shoulders)
            const px = player.x * TILE_SIZE + TILE_SIZE / 2;
            const py = player.y * TILE_SIZE + TILE_SIZE / 2;

            // Shoulders/Body
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.ellipse(px, py + 5, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke(); // Outline

            // Head
            ctx.fillStyle = '#ffccaa'; // Skin tone
            ctx.beginPath();
            ctx.arc(px, py - 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();

            animationFrameId = window.requestAnimationFrame(draw);
        };

        draw();
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [player, currentZone]);

    // Input Handling
    useEffect(() => {
        if (timeLeft) return; // Block input if training

        const handleKeyDown = (e) => {
            let dx = 0;
            let dy = 0;

            if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
            if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
            if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
            if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;

            if (dx === 0 && dy === 0) return;

            setPlayer(prev => {
                const newX = prev.x + dx;
                const newY = prev.y + dy;

                if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
                    const tile = mapRef.current[newY][newX];
                    if (tile !== TILE_WALL) {
                        return { x: newX, y: newY };
                    }
                }
                return prev;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [timeLeft]);

    // Check Zone Logic
    useEffect(() => {
        const tile = mapRef.current[player.y][player.x];
        let zone = null;

        if (tile === TILE_WEIGHTS) zone = ZONES.WEIGHTS;
        if (tile === TILE_TREADMILL) zone = ZONES.TREADMILL;
        if (tile === TILE_MATS) zone = ZONES.MATS;

        setCurrentZone(zone);
    }, [player]);

    // On-Screen Controls
    const move = (dx, dy) => {
        if (timeLeft) return;
        setPlayer(prev => {
            const newX = prev.x + dx;
            const newY = prev.y + dy;
            if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
                if (mapRef.current[newY][newX] !== TILE_WALL) return { x: newX, y: newY };
            }
            return prev;
        });
    };

    if (timeLeft) {
        return (
            <div style={{
                height: '100%', background: '#111',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#fff', textAlign: 'center'
            }}>
                <CharacterHUD attributes={attributes} />
                <h1 style={{ fontSize: '3rem', margin: '20px 0' }}>⏳</h1>
                <h2>Treinando...</h2>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00f0ff' }}>
                    {timeLeft}
                </div>
                <p style={{ color: '#888', marginTop: '10px' }}>Seu personagem está ocupado evoluindo.</p>

                {/* Debug: Finish Now */}
                <button className="btn-secondary" style={{ marginTop: '20px' }}
                    onClick={() => {
                        onUpdateProfile({ rpg: { ...profile.rpg, training: null } }); // Clear training
                        setTimeLeft(null); // Clear local
                    }}>
                    [DEBUG] Terminar Agora
                </button>
            </div>
        );
    }

    return (
        <div style={{
            height: '100%', background: '#111',
            display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
            overflow: 'hidden'
        }}>
            <CharacterHUD attributes={attributes} />

            {/* Debug Day Switcher */}
            <div style={{ position: 'absolute', top: 50, right: 10, background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px', zIndex: 100 }}>
                <small style={{ color: '#fff' }}>Dia: {currentDay}</small>
                <button onClick={() => setCurrentDay(currentDay === 7 ? 1 : currentDay + 1)} style={{ marginLeft: '5px' }}>Next</button>
            </div>

            <div style={{ marginTop: '70px', position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    width={MAP_WIDTH * TILE_SIZE}
                    height={MAP_HEIGHT * TILE_SIZE}
                    style={{ background: '#000', borderRadius: '4px', border: '2px solid #333' }}
                />

                {/* Zone Label Overlay */}
                <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'rgba(68, 68, 255, 0.8)', fontWeight: 'bold' }}>ESTEIRA (VEL)</div>
                <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'rgba(255, 68, 68, 0.8)', fontWeight: 'bold' }}>PESOS (FOR)</div>
                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(68, 255, 68, 0.8)', fontWeight: 'bold' }}>TATAME (RES)</div>
            </div>

            {/* Interaction Button */}
            {currentZone && (
                <div className="animate-fade-in" style={{
                    position: 'absolute', bottom: '140px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 20
                }}>
                    <button
                        className="btn-primary"
                        style={{
                            background: currentZone.color,
                            boxShadow: `0 0 20px ${currentZone.color} `,
                            fontSize: '1.2rem', padding: '15px 30px'
                        }}
                        onClick={() => setShowModal(true)}
                    >
                        Treinar {currentZone.label}
                    </button>
                </div>
            )}

            {/* Mobile Controls */}
            <div style={{ marginTop: 'auto', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div></div>
                <button onClick={() => move(0, -1)} className="btn-secondary" style={{ padding: '15px' }}>⬆️</button>
                <div></div>
                <button onClick={() => move(-1, 0)} className="btn-secondary" style={{ padding: '15px' }}>⬅️</button>
                <div style={{ textAlign: 'center', color: '#555', paddingTop: '10px' }}>Move</div>
                <button onClick={() => move(1, 0)} className="btn-secondary" style={{ padding: '15px' }}>➡️</button>
                <div></div>
                <button onClick={() => move(0, 1)} className="btn-secondary" style={{ padding: '15px' }}>⬇️</button>
                <div></div>
            </div>

            {showModal && currentZone && (
                <TrainingModal
                    zone={currentZone}
                    currentXp={profile.xp || 0}
                    onClose={() => setShowModal(false)}
                    onConfirm={handleStartTraining}
                />
            )}
        </div>
    );
};

export default RPGMap;
