import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Marker Icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to recenter map on user location
const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);
    return null;
};

import { saveRun, getUserRuns } from '../utils/db'; // Import DB functions
import html2canvas from 'html2canvas';

const RunMode = ({ profile, onAddXp }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [distance, setDistance] = useState(0); // meters
    const [elapsedTime, setElapsedTime] = useState(0); // seconds
    const [currentPace, setCurrentPace] = useState(0); // min/km
    const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
    const [position, setPosition] = useState(null); // { lat, lng }
    const [pathCoordinates, setPathCoordinates] = useState([]); // [[lat, lng], ...]
    const [accumulatedXp, setAccumulatedXp] = useState(0);
    const [showSummary, setShowSummary] = useState(false);

    // Anti-Cheat State
    const [violationCount, setViolationCount] = useState(0);
    const [showCheatWarning, setShowCheatWarning] = useState(false);

    // History State
    const [showHistory, setShowHistory] = useState(false);
    const [historyRuns, setHistoryRuns] = useState([]);

    // Watch ID for geolocation
    const watchIdRef = useRef(null);
    const timerRef = useRef(null);

    // Initial Location
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
    }, []);

    // Haversine
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const startRun = () => {
        setIsRunning(true);
        setIsPaused(false);

        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, speed, accuracy } = pos.coords;
                    const newPos = { lat: latitude, lng: longitude };

                    // FILTER: Accuracy Check (Ignore > 30m error)
                    if (accuracy > 30) return;

                    // Update Map Position ONLY if accuracy is good
                    setPosition(newPos);

                    // Update Path & Distance
                    setPathCoordinates(prev => {
                        const last = prev.length > 0 ? prev[prev.length - 1] : null; // [lat, lng]

                        if (last) {
                            const dist = calculateDistance(last[0], last[1], latitude, longitude);
                            // Filter noise: only count if move > 10m
                            if (dist > 10) {
                                setDistance(d => {
                                    const newDist = d + dist;

                                    // XP Logic: 10 XP per 100m (Formula: Distance / 10)
                                    // Constraint: Minimum 100m to start scoring.
                                    if (newDist >= 100) {
                                        const currentTotalXp = Math.floor(newDist / 10);
                                        const prevTotalXp = Math.floor(d / 10);

                                        // If we just crossed 100m, we go from 0 to 10 XP immediately.
                                        // If we are at 105m -> 10 XP. 110m -> 11 XP.
                                        // We need to calculate the *diff* to add.

                                        // Effective previous XP (considering the 100m thershold)
                                        const effectivePrevXp = d < 100 ? 0 : prevTotalXp;

                                        const xpToAdd = currentTotalXp - effectivePrevXp;

                                        if (xpToAdd > 0) {
                                            onAddXp(xpToAdd);
                                            setAccumulatedXp(xp => xp + xpToAdd);
                                        }
                                    }

                                    return newDist;
                                });
                                return [...prev, [latitude, longitude]];
                            }
                            return prev;
                        } else {
                            // First point
                            return [[latitude, longitude]];
                        }
                    });

                    // Speed & Pace
                    if (speed !== null && speed >= 0) {
                        const kph = speed * 3.6;
                        setCurrentSpeed(kph);
                        if (kph > 0.5) {
                            setCurrentPace(60 / kph); // min/km
                        } else {
                            setCurrentPace(0);
                        }

                        // ANTI-CHEAT: Speed Limit > 40 km/h
                        if (kph > 40) {
                            // console.warn("Over Speed Limit:", kph);
                            setViolationCount(prev => {
                                const newCount = prev + 1;
                                if (newCount >= 3) {
                                    // CANCEL RUN
                                    alert("Corrida cancelada por uso de veículo (velocidade > 40km/h).");
                                    setIsPaused(true);
                                    setIsRunning(false);
                                    setDistance(0);
                                    setElapsedTime(0);
                                    setPathCoordinates([]);
                                    setAccumulatedXp(0);
                                    return 0;
                                } else {
                                    // WARNING
                                    if (!showCheatWarning) setShowCheatWarning(true);
                                    return newCount;
                                }
                            });
                        } else {
                            // Reset violation count if speed returns to normal?
                            // Maybe not continuously, but if they slow down we shouldn't punish instantly unless consecutive.
                            // For strictness, let's keep the count or decrement it slowly. 
                            // Simplest: Decrement if normal speed.
                            setViolationCount(prev => Math.max(0, prev - 0.5)); // Recover slowly
                        }
                    }
                },
                (err) => console.error(err),
                { enableHighAccuracy: true, distanceFilter: 2 }
            );
        }

        if (!timerRef.current) {
            timerRef.current = setInterval(() => {
                setElapsedTime(t => t + 1);
            }, 1000);
        }
    };

    const pauseRun = () => {
        setIsPaused(true);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const resumeRun = () => {
        setIsPaused(false);
        startRun(); // Restart watchers
    };

    const finishRun = () => {
        pauseRun(); // Ensure everything stops
        setShowSummary(true);
    };

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const formatPace = (pace) => {
        if (pace === 0 || pace === Infinity) return "--'--\"";
        const m = Math.floor(pace);
        const s = Math.floor((pace - m) * 60);
        return `${m}'${s < 10 ? '0' : ''}${s}"/km`;
    };



    // ... existing imports ...

    // ... inside component ...

    // SOCIAL SHARE FUNCTION
    const handleShare = async () => {
        const element = document.getElementById('run-summary-card');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#000000', // Ensure dark background
                scale: 2, // High res
                useCORS: true
            });

            const image = canvas.toDataURL("image/png");

            // Create a link to download
            const link = document.createElement('a');
            link.href = image;
            link.download = `metafit-run-${new Date().toISOString().split('T')[0]}.png`;
            link.click();

            // Mobile Web Share
            if (navigator.share) {
                const blob = await (await fetch(image)).blob();
                const file = new File([blob], 'run.png', { type: 'image/png' });
                try {
                    await navigator.share({
                        files: [file],
                        title: 'MetaFit Run',
                        text: 'Minha corrida no MetaFit! 🚀'
                    });
                } catch (err) {
                    console.log("Share failed or cancelled", err);
                }
            }
        } catch (err) {
            console.error("Screenshot failed:", err);
            alert("Erro ao gerar imagem.");
        }
    };

    // DEV: SIMULATE 500m
    const simulateRun = () => {
        setDistance(500);
        setElapsedTime(300); // 5 mins
        setAccumulatedXp(50); // 500m / 10 = 50 XP
        setPathCoordinates([
            [position?.lat || 0, position?.lng || 0],
            [(position?.lat || 0) + 0.005, (position?.lng || 0) + 0.005] // Fake diagonal path
        ]);
        alert("Simulação: 500m, 50 XP. Clique em Parar Iniciar para ver o resumo.");
    };

    if (showSummary) {
        return (
            <div style={{ padding: '80px 20px 120px', textAlign: 'center' }}>

                {/* ID for screenshot targeting */}
                <div id="run-summary-card" style={{ padding: '20px', background: '#000', borderRadius: '15px', border: '1px solid #333' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#00f0ff', textTransform: 'uppercase' }}>RESUMO DA CORRIDA</h1>

                    <div className="run-card-neon">
                        <div style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'monospace' }}>{(distance / 1000).toFixed(2)}</div>
                        <div className="run-stat-label">QUILÔMETROS</div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <div className="run-card-neon" style={{ flex: 1, padding: '10px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatTime(elapsedTime)}</div>
                            <div className="run-stat-label">TEMPO</div>
                        </div>
                        <div className="run-card-neon" style={{ flex: 1, padding: '10px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>+{accumulatedXp}</div>
                            <div className="run-stat-label">XP GANHO</div>
                        </div>
                    </div>

                    {/* Branding for Share */}
                    <div style={{ marginBottom: '10px', color: '#00f0ff', fontWeight: 'bold', letterSpacing: '2px' }}>
                        METAFIT APP
                    </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        className="btn-primary"
                        onClick={handleShare}
                        style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', border: 'none' }}
                    >
                        📸 Compartilhar no Instagram
                    </button>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="btn-primary"
                            style={{ flex: 1, backgroundColor: '#333' }}
                            onClick={() => { setShowSummary(false); setDistance(0); setElapsedTime(0); setPathCoordinates([]); setIsRunning(false); }}
                        >
                            Descartar
                        </button>
                        <button
                            className="btn-primary"
                            style={{ flex: 1, background: 'var(--gradient-main)', color: '#000' }}
                            onClick={async () => {
                                if (profile && profile.uid) {
                                    console.log("Saving run for:", profile.uid);

                                    // FIX: Firestore doesn't support nested arrays. Convert to valid objects.
                                    const pathForDb = pathCoordinates.map(p => ({ lat: p[0], lng: p[1] }));

                                    const result = await saveRun(profile.uid, {
                                        distance,
                                        time: elapsedTime,
                                        xp: accumulatedXp,
                                        path: pathForDb
                                    });
                                    if (result.success) {
                                        alert("✅ Salvo no histórico!");
                                    } else {
                                        alert("❌ Erro ao salvar: " + result.error);
                                    }
                                } else {
                                    alert("❌ Erro: Perfil de usuário não encontrado.");
                                }
                                setShowSummary(false);
                                setDistance(0);
                                setElapsedTime(0);
                                setPathCoordinates([]);
                                setAccumulatedXp(0);
                                setIsRunning(false);
                            }}
                        >
                            Salvar Atividade
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>

            {/* DEV BUTTON (Hidden-ish or clearly visible for user test as requested) */}
            <button
                onClick={simulateRun}
                style={{
                    position: 'absolute', top: '100px', right: '10px', zIndex: 9999,
                    padding: '5px', background: 'rgba(255, 0, 0, 0.5)', fontSize: '0.7rem', color: '#fff', border: 'none'
                }}
            >
                [DEV] TEST 500m
            </button>

            {/* TOP CARD */}
            <div style={{
                position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000
            }}>
                <div className="run-card-neon" style={{ background: 'rgba(0,0,0,0.85)' }}>
                    <h3 className="run-stat-label" style={{ marginBottom: '10px' }}>🏃‍♂️ CORRIDA EM ANDAMENTO</h3>
                    <div className="run-stat-value" style={{ fontSize: '3.5rem', color: '#fff', textShadow: '0 0 15px #00f0ff' }}>
                        {(distance / 1000).toFixed(2)} <span style={{ fontSize: '1rem', color: '#888' }}>km</span>
                    </div>
                </div>
            </div>

            {/* MAP LAYOUT */}
            <div style={{ flex: 1, height: '100%' }}>
                {!position ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <p>Buscando GPS...</p>
                    </div>
                ) : (
                    <MapContainer
                        center={[position.lat, position.lng]}
                        zoom={16}
                        style={{ height: '100%', width: '100%', background: '#0a0a0c' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            className="dark-map-tiles"
                        />
                        <RecenterAutomatically lat={position.lat} lng={position.lng} />

                        {pathCoordinates.length > 0 && (
                            <Polyline positions={pathCoordinates} color="#00f0ff" weight={6} opacity={0.8} />
                        )}

                        {/* Current User Marker */}
                        <Marker position={[position.lat, position.lng]}>
                            <Popup>Você está aqui</Popup>
                        </Marker>
                    </MapContainer>
                )}
            </div>

            {/* BOTTOM METRICS & CONTROLS */}
            <div style={{
                position: 'absolute', bottom: '90px', left: '0', right: '0',
                background: 'linear-gradient(to top, #000 70%, transparent)',
                padding: '20px', zIndex: 1000
            }}>
                {/* Metrics Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '0 10px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="run-stat-value" style={{ fontSize: '1.5rem' }}>{formatTime(elapsedTime)}</div>
                        <div className="run-stat-label">TEMPO</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="run-stat-value" style={{ fontSize: '1.5rem' }}>{formatPace(currentPace)}</div>
                        <div className="run-stat-label">RITMO</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="run-stat-value" style={{ fontSize: '1.5rem' }}>{currentSpeed.toFixed(1)}</div>
                        <div className="run-stat-label">KM/H</div>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'center' }}>
                    {!isRunning ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'center' }}>
                                <button
                                    onClick={() => {
                                        if (profile && profile.uid) {
                                            // alert("Carregando histórico..."); // Optional: Too invasive? Maybe just better UX later.
                                            getUserRuns(profile.uid).then(runs => {
                                                console.log("Runs fetched:", runs);
                                                setHistoryRuns(runs);
                                                if (runs.length === 0) {
                                                    // alert("Nenhum histórico encontrado no banco de dados.");
                                                }
                                            }).catch(err => alert("Erro ao buscar histórico: " + err));
                                            setShowHistory(true);
                                        } else {
                                            alert("Erro: Faça login para ver o histórico.");
                                        }
                                    }}
                                    style={{
                                        background: 'rgba(0,0,0,0.6)',
                                        border: '1px solid #333',
                                        color: '#fff',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        fontSize: '1.5rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                    title="Histórico"
                                >
                                    📜
                                </button>

                                <button
                                    className="btn-control-large"
                                    style={{ background: '#00ff66', color: '#000', boxShadow: '0 0 25px rgba(0,255,102,0.4)', width: '100px', height: '100px' }}
                                    onClick={startRun}
                                >
                                    ▶
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {isPaused ? (
                                <button
                                    className="btn-control-large"
                                    style={{ background: '#00ff66', color: '#000' }}
                                    onClick={resumeRun}
                                >
                                    ▶
                                </button>
                            ) : (
                                <button
                                    className="btn-control-large"
                                    style={{ background: '#ffcc00', color: '#000' }}
                                    onClick={pauseRun}
                                >
                                    ⏸
                                </button>
                            )}

                            <button
                                className="btn-control-large"
                                style={{ background: '#ff0055', color: '#fff', width: '60px', height: '60px', fontSize: '1.5rem' }}
                                onClick={finishRun}
                            >
                                ■
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* CHEAT WARNING MODAL */}
            {showCheatWarning && isRunning && (
                <div style={{
                    position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(255, 0, 0, 0.9)', color: '#fff', padding: '20px',
                    borderRadius: '15px', zIndex: 2000, textAlign: 'center', border: '3px solid #fff',
                    boxShadow: '0 0 30px #ff0000'
                }}>
                    <div style={{ fontSize: '3rem' }}>⚠️</div>
                    <h2>Velocidade Alta Detectada!</h2>
                    <p>É proibido usar veículos.</p>
                    <p>Se continuar, a corrida será <strong>CANCELADA</strong>.</p>
                    <button onClick={() => setShowCheatWarning(false)} style={{ marginTop: '10px', padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                        Entendido
                    </button>
                </div>
            )}

            {/* HISTORY MODAL wrapper */}
            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)} style={{ zIndex: 3000 }}>
                    <div className="wide-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '20px', background: '#111', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="title-gradient">Histórico de Corridas</h2>
                            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}>×</button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {historyRuns.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center' }}>Nenhuma corrida registrada.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {historyRuns.map((run, idx) => (
                                        <div key={idx} className="card" style={{ padding: '15px', border: '1px solid #333' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>{(run.distance / 1000).toFixed(2)} km</span>
                                                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{new Date(run.date).toLocaleDateString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.9rem' }}>
                                                <span>⏱ {Math.floor(run.time / 60)}:{run.time % 60 < 10 ? '0' : ''}{run.time % 60}</span>
                                                <span style={{ color: '#ff0055' }}>+{run.xp} XP</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RunMode;
