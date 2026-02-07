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
import { RewardedAdButton } from './AdSystem';

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
    const [isRunSaved, setIsRunSaved] = useState(false);

    // Anti-Cheat State
    const [violationCount, setViolationCount] = useState(0);
    const [showCheatWarning, setShowCheatWarning] = useState(false);

    // History State
    const [showHistory, setShowHistory] = useState(false);
    const [historyRuns, setHistoryRuns] = useState([]);
    const [selectedHistoryRun, setSelectedHistoryRun] = useState(null);

    // Watch ID for geolocation
    const watchIdRef = useRef(null);
    const timerRef = useRef(null);

    // Wake Lock Ref
    const wakeLockRef = useRef(null);

    // Timer Refs for Background Accuracy
    const startTimeRef = useRef(null);
    const pausedStartTimeRef = useRef(null); // When did we pause?
    const totalPausedTimeRef = useRef(0); // How long have we been paused total?

    const [bonusApplied, setBonusApplied] = useState(false); // Track if ad bonus was used

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

    // SILENT AUDIO HACK FOR BACKGROUND GPS (SCREEN OFF)
    // 1-second of silence. Playing this keeps the OS audio service active, preventing app suspension.
    const silentAudioRef = useRef(null);

    useEffect(() => {
        // Initialize Silent Audio
        const audioData = "data:audio/mp3;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
        silentAudioRef.current = new Audio(audioData);
        silentAudioRef.current.loop = true;
        silentAudioRef.current.volume = 0.01; // Almost silent, but technically playing
    }, []);

    const playSilentAudio = () => {
        if (silentAudioRef.current) {
            silentAudioRef.current.play().catch(e => console.log("Audio play failed (interaction required first):", e));
        }
    };

    const stopSilentAudio = () => {
        if (silentAudioRef.current) {
            silentAudioRef.current.pause();
            silentAudioRef.current.currentTime = 0;
        }
    };

    // WAKE LOCK FUNCTION
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                // console.log('Wake Lock active!');
            }
        } catch (err) {
            console.error('Wake Lock error:', err);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.error('Wake Lock release error:', err);
            }
        }
    };

    const startRun = async () => {
        setIsRunning(true);
        setIsPaused(false);

        await requestWakeLock(); // Keep screen alive
        playSilentAudio();       // Hack: Keep background process alive via Audio Service

        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, speed, accuracy } = pos.coords;
                    const newPos = { lat: latitude, lng: longitude };

                    // FILTER: Accuracy Check (Ignore > 30m error)
                    if (accuracy > 30) return;

                    // Update Map Position ONLY if accuracy is good
                    setPosition(newPos);

                    // If Paused, don't track distance/path
                    if (isPaused) return;

                    // Update Path & Distance
                    setPathCoordinates(prev => {
                        const last = prev.length > 0 ? prev[prev.length - 1] : null; // [lat, lng]

                        if (last) {
                            const dist = calculateDistance(last[0], last[1], latitude, longitude);
                            // Filter noise: almost zero filter to catch return path
                            if (dist > 0.5) {
                                setDistance(d => {
                                    const newDist = d + dist;

                                    // XP Logic: 10 XP per 100m (Formula: Distance / 10)
                                    // Constraint: Minimum 100m to start scoring.
                                    // FIX: Only update accumulated for DISPLAY. Do not award yet.
                                    if (newDist >= 100) {
                                        const totalPotentialXp = Math.floor(newDist / 10);
                                        setAccumulatedXp(totalPotentialXp);
                                    } else {
                                        setAccumulatedXp(0);
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
                            setViolationCount(prev => Math.max(0, prev - 0.5)); // Recover slowly
                        }
                    }
                },
                (err) => console.error(err),
                { enableHighAccuracy: true, distanceFilter: 0, maximumAge: 0, timeout: 5000 }
            );
        }

        // Initialize Timer Refs
        if (!startTimeRef.current) {
            startTimeRef.current = Date.now();
            totalPausedTimeRef.current = 0;
        }

        if (!timerRef.current) {
            timerRef.current = setInterval(() => {
                // Calculate elapsed time based on System Clock
                // Elastic = (Now - Start) - TotalPaused
                const now = Date.now();
                const totalElapsed = now - startTimeRef.current - totalPausedTimeRef.current;
                setElapsedTime(Math.floor(totalElapsed / 1000));
            }, 1000);
        }
    };

    const pauseRun = () => {
        setIsPaused(true);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

        releaseWakeLock(); // Let screen sleep if paused
        stopSilentAudio(); // Stop hacked background service

        // Mark pause start time to calculate duration later
        pausedStartTimeRef.current = Date.now();

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const resumeRun = () => {
        setIsPaused(false);
        playSilentAudio(); // Resume background hack

        // Add current pause duration to total
        if (pausedStartTimeRef.current) {
            const pauseDuration = Date.now() - pausedStartTimeRef.current;
            totalPausedTimeRef.current += pauseDuration;
            pausedStartTimeRef.current = null;
        }

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

    // HANDLE SAVE
    const handleSaveRun = async () => {
        if (!profile || !profile.uid) {
            alert("❌ Erro: Perfil de usuário não encontrado.");
            return false;
        }

        if (isRunSaved) {
            console.log("Already saved.");
            return true;
        }

        console.log("Saving run for:", profile.uid);

        // FIX: Firestore doesn't support nested arrays. Convert to valid objects.
        const pathForDb = pathCoordinates.map(p => ({ lat: p[0], lng: p[1] }));

        // VIP BONUS: +15% on Run Finish
        let finalXp = accumulatedXp;
        if (profile.vip) {
            finalXp = Math.ceil(finalXp * 1.15);
        }

        // AWARD XP NOW (Only once at the end)
        if (finalXp > 0) {
            onAddXp(finalXp, `Corrida (${(distance / 1000).toFixed(2)}km)`);
        }

        const result = await saveRun(profile.uid, {
            distance,
            time: elapsedTime,
            xp: finalXp, // Save with bonus
            path: pathForDb
        });

        if (result.success) {
            setIsRunSaved(true);
            return true;
        } else {
            alert("❌ Erro ao salvar: " + result.error);
            return false;
        }
    };

    // SOCIAL SHARE FUNCTION
    const handleShare = async () => {
        // Auto Save on Share
        const saved = await handleSaveRun();
        if (!saved) return; // Stop if save failed (optional, or just warn)

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

            // Auto-close after share
            setShowSummary(false);
            setDistance(0);
            setElapsedTime(0);
            setPathCoordinates([]);
            setAccumulatedXp(0);
            setIsRunning(false);
            setIsRunSaved(false);

        } catch (err) {
            console.error("Screenshot failed:", err);
            alert("Erro ao gerar imagem.");
        }
    };

    // DEV: SIMULATE 500m


    // AD BONUS HANDLER
    const handleAdReward = () => {
        if (bonusApplied) return;
        const bonus = Math.floor(accumulatedXp * 0.10); // 10%
        if (bonus > 0) {
            setAccumulatedXp(prev => prev + bonus);
            // onAddXp(bonus, 'Bônus Ad: Corrida'); // Removed to avoid double-dip. Awarded at Save.
            setBonusApplied(true);
        }
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
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                +{profile.vip ? Math.ceil(accumulatedXp * 1.15) : accumulatedXp}
                            </div>
                            <div className="run-stat-label">XP GANHO {profile.vip && <span style={{ color: '#ffd700', fontSize: '0.7rem' }}>(+15%)</span>}</div>
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

                    {/* AD REWARD BUTTON */}
                    {!isRunSaved && (
                        <RewardedAdButton
                            isVip={profile.vip}
                            onReward={handleAdReward}
                            label={`Assistir Anúncio (+${Math.floor(accumulatedXp * 0.1)} XP)`}
                        />
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="btn-primary"
                            style={{ flex: 1, backgroundColor: '#333' }}
                            onClick={() => { setShowSummary(false); setDistance(0); setElapsedTime(0); setPathCoordinates([]); setIsRunning(false); setIsRunSaved(false); }}
                        >
                            Descartar
                        </button>
                        <button
                            className="btn-primary"
                            style={{ flex: 1, background: 'var(--gradient-main)', color: '#000' }}
                            onClick={async () => {
                                const success = await handleSaveRun();
                                if (success) {
                                    alert("✅ Salvo no histórico!");
                                    setShowSummary(false);
                                    setDistance(0);
                                    setElapsedTime(0);
                                    setPathCoordinates([]);
                                    setAccumulatedXp(0);
                                    setIsRunning(false);
                                    setIsRunSaved(false); // Reset for next run
                                }
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
        <div style={{ height: '100dvh', width: '100%', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', background: '#000' }}>

            {/* TOP CARD (Absolute Overlay on Map) */}
            <div style={{
                position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, pointerEvents: 'none'
            }}>
                <div className="run-card-neon" style={{ background: 'rgba(0,0,0,0.85)', padding: '10px 15px' }}>
                    <h3 className="run-stat-label" style={{ marginBottom: '5px', fontSize: '0.8rem' }}>🏃‍♂️ CORRIDA EM ANDAMENTO</h3>
                    <div className="run-stat-value" style={{ fontSize: '2.5rem', color: '#fff', textShadow: '0 0 15px #00f0ff', lineHeight: '1' }}>
                        {(distance / 1000).toFixed(2)} <span style={{ fontSize: '0.9rem', color: '#888' }}>km</span>
                    </div>
                </div>
            </div>

            {/* MAP LAYOUT (Fixed Height - 60% of screen) */}
            <div style={{ flex: '0 0 60%', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
                {!position ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#fff' }}>
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

            {/* BOTTOM METRICS & CONTROLS (Flex Grow - Takes remaining 40%) */}
            <div style={{
                flex: '1',
                background: 'linear-gradient(to top, #000 95%, #111)',
                padding: '10px 10px calc(10px + env(safe-area-inset-bottom)) 10px',
                zIndex: 1000,
                display: 'flex', flexDirection: 'column', gap: '15px',
                justifyContent: 'center', // Center content vertically
                borderTop: '1px solid #333',
                boxShadow: '0 -5px 20px rgba(0,0,0,0.8)'
            }}>
                {/* Metrics Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="run-stat-value" style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 'bold' }}>{formatTime(elapsedTime)}</div>
                        <div className="run-stat-label" style={{ fontSize: '0.65rem', color: '#888' }}>TEMPO</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="run-stat-value" style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 'bold' }}>{formatPace(currentPace)}</div>
                        <div className="run-stat-label" style={{ fontSize: '0.65rem', color: '#888' }}>RITMO</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="run-stat-value" style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 'bold' }}>{currentSpeed.toFixed(1)}</div>
                        <div className="run-stat-label" style={{ fontSize: '0.65rem', color: '#888' }}>KM/H</div>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                    {!isRunning ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <button
                                    onClick={() => {
                                        if (profile && profile.uid) {
                                            getUserRuns(profile.uid).then(runs => {
                                                console.log("Runs fetched:", runs);
                                                setHistoryRuns(runs);
                                            }).catch(err => alert("Erro ao buscar histórico: " + err));
                                            setShowHistory(true);
                                        } else {
                                            alert("Erro: Faça login para ver o histórico.");
                                        }
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid #333',
                                        color: '#fff',
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '50%',
                                        fontSize: '1.1rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                    title="Histórico"
                                >
                                    📜
                                </button>

                                <button
                                    className="btn-control-large"
                                    style={{
                                        background: '#00ff66', color: '#000',
                                        boxShadow: '0 0 25px rgba(0,255,102,0.4)',
                                        width: '70px', height: '70px',
                                        fontSize: '1.8rem',
                                        borderRadius: '50%', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
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
                                    style={{
                                        background: '#00ff66', color: '#000', width: '70px', height: '70px',
                                        borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '1.8rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                    onClick={resumeRun}
                                >
                                    ▶
                                </button>
                            ) : (
                                <button
                                    className="btn-control-large"
                                    style={{
                                        background: '#ffcc00', color: '#000', width: '70px', height: '70px',
                                        borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '1.8rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                    onClick={pauseRun}
                                >
                                    ⏸
                                </button>
                            )}

                            <button
                                className="btn-control-large"
                                style={{
                                    background: '#ff0055', color: '#fff', width: '55px', height: '55px', fontSize: '1.3rem',
                                    borderRadius: '50%', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
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
                                        <div
                                            key={idx}
                                            className="card"
                                            style={{ padding: '15px', border: '1px solid #333', cursor: 'pointer', transition: 'transform 0.2s' }}
                                            onClick={() => setSelectedHistoryRun(run)}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
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

            {/* DETAIL MODAL FOR HISTORY ITEM */}
            {selectedHistoryRun && (
                <div className="modal-overlay" onClick={() => setSelectedHistoryRun(null)} style={{ zIndex: 3100 }}>
                    <div className="wide-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '20px', background: '#000', border: '1px solid #333', borderRadius: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedHistoryRun(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem' }}>×</button>
                        </div>

                        <h2 style={{ color: '#00f0ff', marginBottom: '20px', textTransform: 'uppercase' }}>Detalhes da Corrida</h2>
                        <p style={{ color: '#aaa', marginBottom: '20px' }}>{new Date(selectedHistoryRun.date).toLocaleString()}</p>

                        <div className="run-card-neon" style={{ marginBottom: '15px' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'monospace' }}>{(selectedHistoryRun.distance / 1000).toFixed(2)}</div>
                            <div className="run-stat-label">QUILÔMETROS</div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div className="run-card-neon" style={{ flex: 1, padding: '10px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Math.floor(selectedHistoryRun.time / 60)}:{selectedHistoryRun.time % 60 < 10 ? '0' : ''}{selectedHistoryRun.time % 60}</div>
                                <div className="run-stat-label">TEMPO</div>
                            </div>
                            <div className="run-card-neon" style={{ flex: 1, padding: '10px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+{selectedHistoryRun.xp}</div>
                                <div className="run-stat-label">XP GANHO</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RunMode;
