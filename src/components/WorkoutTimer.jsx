import React, { useState, useEffect, useRef } from 'react';

const WorkoutTimer = ({ exercise, onExit, onFinish }) => {
    // Phases: 'prep', 'work', 'rest', 'summary'
    const [phase, setPhase] = useState('prep');
    const [timeLeft, setTimeLeft] = useState(5); // 5s prep
    const [currentSet, setCurrentSet] = useState(1);
    const totalSets = 3;

    const [isActive, setIsActive] = useState(true);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleTransition();
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft]);

    const handleTransition = () => {
        if (phase === 'prep') {
            setPhase('work');
            setTimeLeft(40);
        } else if (phase === 'work') {
            if (currentSet >= totalSets) {
                setPhase('summary');
            } else {
                setPhase('rest');
                setTimeLeft(10);
            }
        } else if (phase === 'rest') {
            setCurrentSet(s => s + 1);
            setPhase('work');
            setTimeLeft(40);
        }
    };

    const getPhaseTitle = () => {
        if (phase === 'prep') return 'Prepare-se';
        if (phase === 'work') return 'GO!';
        if (phase === 'rest') return 'Descanse';
        return 'Treino Finalizado';
    };

    const getPhaseColor = () => {
        if (phase === 'prep') return '#00f0ff';
        if (phase === 'work') return '#00ff66';
        if (phase === 'rest') return '#ffaa00';
        return '#fff';
    };

    const progress = phase === 'prep' ? (timeLeft / 5) * 100
        : phase === 'work' ? (timeLeft / 40) * 100
            : phase === 'rest' ? (timeLeft / 10) * 100 : 0;

    if (phase === 'summary') {
        return (
            <div className="timer-overlay animate-fade-in">
                <div className="summary-card">
                    <h2 className="section-title">Treino <span className="title-gradient">Concluído</span></h2>
                    <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Você completou {totalSets} séries de {exercise.name}.</p>
                    <button className="btn-primary" onClick={() => {
                        onFinish && onFinish();
                        onExit();
                    }}>FINALIZAR E VOLTAR</button>
                </div>
            </div>
        );
    }

    return (
        <div className="timer-overlay animate-fade-in" style={{ '--phase-color': getPhaseColor() }}>
            <div className="timer-container">
                <button className="exit-timer" onClick={onExit}>×</button>

                <div className="set-indicator">SÉRIE {currentSet} / {totalSets}</div>

                <div className="timer-circle-wrapper">
                    <svg className="timer-svg" viewBox="0 0 100 100">
                        <circle className="timer-bg" cx="50" cy="50" r="45" />
                        <circle
                            className="timer-progress"
                            cx="50" cy="50" r="45"
                            style={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                        />
                    </svg>
                    <div className="timer-text">
                        <div className="phase-label">{getPhaseTitle()}</div>
                        <div className="time-display">{timeLeft}</div>
                    </div>
                </div>

                <div className="exercise-preview-timer animate-fade-in">
                    <h2 className="exercise-name-timer">{exercise.name}</h2>
                    <div className="image-frame-timer">
                        <img src={exercise.image} alt={exercise.name} className={phase === 'work' ? 'pulse-anim' : ''} />
                    </div>
                </div>

                <div className="timer-controls">
                    <button className="btn-sec-timer" onClick={() => setIsActive(!isActive)}>
                        {isActive ? 'PAUSAR' : 'RECURAR'}
                    </button>
                </div>
            </div>

            <style>{`
                .timer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #050505; z-index: 2000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .timer-container { width: 100%; max-width: 500px; text-align: center; padding: 2rem; position: relative; }
                
                .exit-timer { position: absolute; top: 1rem; right: 1rem; font-size: 2.5rem; background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; }
                
                .set-indicator { font-size: 0.9rem; font-weight: 800; letter-spacing: 2px; color: var(--phase-color); margin-bottom: 2rem; opacity: 0.8; }
                
                .timer-circle-wrapper { position: relative; width: min(280px, 70vw); height: min(280px, 70vw); margin: 0 auto 2rem; }
                .timer-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
                .timer-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 4; }
                .timer-progress { fill: none; stroke: var(--phase-color); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 283; transition: stroke-dashoffset 1s linear, stroke 0.3s; }
                
                .timer-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; }
                .phase-label { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.5); }
                .time-display { font-size: min(6rem, 25vw); font-weight: 900; line-height: 1; color: #fff; text-shadow: 0 0 20px var(--phase-color); }
                
                .exercise-preview-timer { margin-bottom: 2rem; }
                .exercise-name-timer { font-size: 1.5rem; margin-bottom: 1rem; letter-spacing: -0.5px; }
                .image-frame-timer { height: 180px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%); border-radius: 20px; }
                .image-frame-timer img { height: 80%; object-fit: contain; filter: drop-shadow(0 0 15px rgba(255,255,255,0.1)); }
                
                .pulse-anim { animation: pulse 2s infinite ease-in-out; }
                @keyframes pulse { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px var(--phase-color)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 30px var(--phase-color)); } }
                
                .timer-controls { display: flex; justify-content: center; gap: 1rem; }
                .btn-sec-timer { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 40px; border-radius: 30px; font-weight: 700; cursor: pointer; transition: 0.2s; }
                .btn-sec-timer:hover { background: rgba(255,255,255,0.1); border-color: var(--phase-color); }

                .summary-card { background: #0a0a0c; border: 1px solid rgba(0, 240, 255, 0.2); padding: 3rem; border-radius: 24px; text-align: center; max-width: 400px; box-shadow: 0 0 40px rgba(0,240,255,0.1); }
            `}</style>
        </div>
    );
};

export default WorkoutTimer;
