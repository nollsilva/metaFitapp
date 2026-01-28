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
                    const { latitude, longitude, speed } = pos.coords;
                    const newPos = { lat: latitude, lng: longitude };

                    // Update Map Position
                    setPosition(newPos);

                    // If Paused, don't track distance/path
                    if (isPaused) return;

                    // Update Path & Distance
                    setPathCoordinates(prev => {
                        const last = prev.length > 0 ? prev[prev.length - 1] : null; // [lat, lng]

                        if (last) {
                            const dist = calculateDistance(last[0], last[1], latitude, longitude);
                            // Filter noise: only count if move > 3m
                            if (dist > 3) {
                                setDistance(d => {
                                    const newDist = d + dist;
                                    // XP Logic: 50 XP per 500m
                                    const oldMilestones = Math.floor(d / 500);
                                    const newMilestones = Math.floor(newDist / 500);
                                    if (newMilestones > oldMilestones) {
                                        onAddXp(50);
                                        setAccumulatedXp(xp => xp + 50);
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

    if (showSummary) {
        return (
            <div style={{ padding: '80px 20px 120px', textAlign: 'center' }}>
                <h1 className="title-gradient" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>RESUMO DA CORRIDA</h1>

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

                <div className="map-container" style={{ height: '250px' }}>
                    {position && (
                        <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {pathCoordinates.length > 0 && <Polyline positions={pathCoordinates} color="#00f0ff" weight={5} />}
                        </MapContainer>
                    )}
                </div>

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
                        onClick={() => { alert("Salvo no histórico!"); setShowSummary(false); setDistance(0); setElapsedTime(0); setPathCoordinates([]); setIsRunning(false); }}
                    >
                        Salvar Atividade
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>

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
                        <button
                            className="btn-control-large"
                            style={{ background: '#00ff66', color: '#000', boxShadow: '0 0 25px rgba(0,255,102,0.4)', width: '100px', height: '100px' }}
                            onClick={startRun}
                        >
                            ▶
                        </button>
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
        </div>
    );
};

export default RunMode;
