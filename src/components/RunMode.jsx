import React, { useState, useEffect, useRef } from 'react';

const RunMode = ({ profile, onAddXp }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [distance, setDistance] = useState(0); // in meters
    const [elapsedTime, setElapsedTime] = useState(0); // in seconds
    const [currentPace, setCurrentPace] = useState(0); // min/km
    const [lastPosition, setLastPosition] = useState(null);
    const [accumulatedXp, setAccumulatedXp] = useState(0);
    const [showCamera, setShowCamera] = useState(false);
    const [photoDataUrl, setPhotoDataUrl] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const watchIdRef = useRef(null);
    const timerRef = useRef(null);

    // Haversine formula to calculate distance between two coords
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    const startRun = () => {
        setIsRunning(true);
        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, speed } = position.coords; // speed is m/s

                    if (lastPosition) {
                        const dist = calculateDistance(
                            lastPosition.latitude,
                            lastPosition.longitude,
                            latitude,
                            longitude
                        );

                        // Ignore GPS noise (e.g., extremely small movements if speed is 0)
                        if (dist > 2) {
                            setDistance(prev => {
                                const newDist = prev + dist;

                                // Check for XP Milestone (Every 500m)
                                const oldMilestones = Math.floor(prev / 500);
                                const newMilestones = Math.floor(newDist / 500);
                                if (newMilestones > oldMilestones) {
                                    // Award 50 XP
                                    onAddXp(50);
                                    setAccumulatedXp(prevXp => prevXp + 50);
                                }
                                return newDist;
                            });
                        }
                    }
                    setLastPosition({ latitude, longitude });

                    // Update Pace (min/km)
                    if (speed && speed > 0.1) {
                        const paceSecondsPerKm = 1000 / speed;
                        setCurrentPace(paceSecondsPerKm / 60);
                    } else {
                        setCurrentPace(0);
                    }
                },
                (error) => console.error("Error watching position:", error),
                { enableHighAccuracy: true, distanceFilter: 5 }
            );
        }

        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
    };

    const stopRun = () => {
        setIsRunning(false);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setShowCamera(true); // Auto open camera options on finish
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getRankBadge = (level) => {
        // Simplified Logic, replace with actual image URL or generic medal icon
        if (level < 5) return '🥉'; // Bronze
        if (level < 10) return '🥈'; // Silver
        if (level < 20) return '🥇'; // Gold
        return '🏆'; // Elite
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Não foi possível acessar a câmera.");
        }
    };

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Overlay Stats
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, canvas.height - 200, canvas.width, 200);

        context.fillStyle = '#fff';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';

        context.fillText(`Distância: ${(distance / 1000).toFixed(2)} km`, canvas.width / 2, canvas.height - 140);
        context.fillText(`XP Ganho: ${accumulatedXp} XP ⚡`, canvas.width / 2, canvas.height - 80);

        // Add Medal
        const medal = getRankBadge(profile.level);
        context.font = '60px Arial';
        context.fillText(medal, canvas.width / 2, canvas.height - 20);

        // Stop camera stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());

        setPhotoDataUrl(canvas.toDataURL('image/png'));
        setShowCamera(false); // Switch to preview mode
    };

    useEffect(() => {
        if (showCamera && !photoDataUrl) {
            startCamera();
        }
    }, [showCamera, photoDataUrl]);

    if (photoDataUrl) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 2000, background: '#000', display: 'flex', flexDirection: 'column'
            }}>
                <img src={photoDataUrl} alt="Run Result" style={{ width: '100%', flex: 1, objectFit: 'contain' }} />
                <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => { setPhotoDataUrl(null); setShowCamera(false); }}
                        style={{ flex: 1 }}
                    >
                        Voltar
                    </button>
                    <a
                        href={photoDataUrl}
                        download="minha-corrida-metafit.png"
                        className="btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                    >
                        Salvar / Compartilhar
                    </a>
                </div>
            </div>
        );
    }

    if (showCamera) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 2000, background: '#000'
            }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div style={{
                    position: 'absolute', bottom: '50px', left: '0', width: '100%',
                    display: 'flex', justifyContent: 'center', gap: '20px'
                }}>
                    <button
                        onClick={() => setShowCamera(false)}
                        style={{
                            padding: '15px 30px', borderRadius: '30px',
                            background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={takePhoto}
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: '#fff', border: '5px solid #ccc'
                        }}
                    ></button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ paddingTop: '80px', paddingBottom: '120px', textAlign: 'center', color: '#fff' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '4rem', margin: 0, fontFamily: 'monospace' }}>
                    {(distance / 1000).toFixed(2)} <span style={{ fontSize: '1.5rem', color: '#888' }}>km</span>
                </h1>
                <div style={{ fontSize: '2rem', color: '#00d4ff', fontWeight: 'bold' }}>
                    {formatTime(elapsedTime)}
                </div>
                <p style={{ color: '#888' }}>Ritmo: {currentPace.toFixed(1)} min/km</p>
                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '5px 15px', borderRadius: '20px' }}>
                    ⚡ +{accumulatedXp} XP ganhos
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                {!isRunning ? (
                    <button
                        onClick={startRun}
                        className="btn-primary"
                        style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            fontSize: '1.5rem', boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)'
                        }}
                    >
                        START
                    </button>
                ) : (
                    <button
                        onClick={stopRun}
                        className="btn-primary"
                        style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            fontSize: '1.5rem', background: '#ff0055', boxShadow: '0 0 30px rgba(255, 0, 85, 0.4)'
                        }}
                    >
                        STOP
                    </button>
                )}
            </div>
        </div>
    );
};

export default RunMode;
