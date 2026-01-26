import React, { useState, useEffect } from 'react';

const WorkoutsSection = ({ profile, onUpdateProfile, onStartWorkout, onCompleteDaily, checkedExercises, onToggleCheck }) => {
    const { goal, mealPlan, urgentPart, trainingDays, trainingDuration, workoutHistory = {} } = profile;

    const [selectedExercise, setSelectedExercise] = useState(null);
    const [categorizedRoutine, setCategorizedRoutine] = useState({
        legs: [], chest_biceps: [], back_triceps: [], abs: []
    });

    // Checkbox state for equipment
    const [hasBar, setHasBar] = useState(false);

    // --- Date & Time Helpers ---
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const now = new Date();
    const currentDayIdx = now.getDay();
    const currentDayName = weekDays[currentDayIdx];
    const todayKey = now.toISOString().split('T')[0];

    useEffect(() => {
        // Full Exercise Library
        const lib = {
            legs: [
                { name: 'Agachamento Livre', reps: '3 x 15', image: '/squat.png', desc: 'Base fundamental.', howTo: '1. Pés largura ombros.\n2. Inicie pelo quadril.\n3. Desça até paralelo.\n4. Suba empurrando o chão.', proTip: 'Mantenha o peito alto.' },
                { name: 'Afundo (Lunges)', reps: '3 x 12/lado', image: '/lunge.png', desc: 'Estabilidade e glúteo.', howTo: '1. Passo largo.\n2. Desça vertical.\n3. Joelho 90 graus.\n4. Retorne firme.', proTip: 'Olhe para frente.' },
                { name: 'Elevação Pélvica', reps: '3 x 20', image: '/bridge.png', desc: 'Isolamento glúteo.', howTo: '1. Deitado.\n2. Pés no chão.\n3. Eleve o quadril.\n4. Contraia no topo.', proTip: 'Force os calcanhares.' },
                { name: 'Agachamento Sumô', reps: '3 x 15', image: '/sumo.png', desc: 'Foco adutores.', howTo: '1. Base larga.\n2. Pés para fora.\n3. Agache reto.\n4. Joelhos abertos.', proTip: 'Coluna vertical.' },
                { name: 'Agachamento Búlgaro', reps: '3 x 10/lado', image: '/bulgarian_split_squat.png', desc: 'Perna unilateral.', howTo: '1. Pé de trás no banco.\n2. Desça vertical.\n3. Joelho da frente 90°.\n4. Empurre com calcanhar.', proTip: 'Incline levemente à frente.' },
                { name: 'Subida no Banco', reps: '3 x 12/lado', image: '/step_up.png', desc: 'Glúteo e Coxa.', howTo: '1. Pise firme no banco.\n2. Suba o corpo todo.\n3. Desça controlado.\n4. Alterne ou mantenha.', proTip: 'Não impulsione com o pé de baixo.' }
            ],
            chest_biceps: [
                { name: 'Flexão Tradicional', reps: '3 x 15', image: '/pushup.png', desc: 'Peitoral médio.', howTo: '1. Mãos largas.\n2. Corpo prancha.\n3. Peito ao chão.\n4. Empurre.', proTip: 'Core travado.' },
                { name: 'Flexão Arqueiro', reps: '3 x 8/lado', image: '/archer.png', desc: 'Força unilateral.', howTo: '1. Mãos bem largas.\n2. Desça em um braço.\n3. Outro braço reto.\n4. Suba e troque.', proTip: 'Avançado.' },
                { name: 'Chin-up (Supinada)', reps: '3 x 8', image: '/chinup.png', desc: 'Bíceps e dorsais.', howTo: '1. Palmas para você.\n2. Puxe até o queixo.\n3. Desça total.\n4. Controle.', proTip: 'Sem balanço.', requiresBar: true },
                { name: 'Hammer Curl', reps: '3 x 12', image: '/hammer_curl.png', desc: 'Bíceps e Antebraço.', howTo: '1. Halteres neutros.\n2. Cotovelos fixos.\n3. Suba até o ombro.\n4. Desça controlado.', proTip: 'Não balance o tronco.' },
                { name: 'Desenvolvimento Ombros', reps: '3 x 12', image: '/shoulder_press.png', desc: 'Ombros completo.', howTo: '1. Halteres na altura orelha.\n2. Empurre para cima.\n3. Braços esticados.\n4. Retorne a 90 graus.', proTip: 'Core firme.' },
                { name: 'Flexão Declinada', reps: '3 x 12', image: '/decline_pushup.png', desc: 'Peitoral Superior.', howTo: '1. Pés no banco.\n2. Mãos no chão.\n3. Desça até encostar.\n4. Empurre forte.', proTip: 'Não arqueie as costas.' },
                { name: 'Flexão Pike', reps: '3 x 10', image: '/pike_pushup.png', desc: 'Ombros Calistenia.', howTo: '1. Corpo em V invertido.\n2. Olhe para os pés.\n3. Dobre cotovelos.\n4. Empurre o chão.', proTip: 'Mantenha pernas esticadas.' }
            ],
            back_triceps: [
                { name: 'Barra Fixa (Pronada)', reps: '3 x 8', image: '/pullup_wide.png', desc: 'Largura costas.', howTo: '1. Palmas para frente.\n2. Puxe até o peito.\n3. Desça lento.\n4. Braços esticados.', proTip: 'Puxe cotovelos.', requiresBar: true },
                { name: 'Flexão Diamante', reps: '3 x 10', image: '/diamond.png', desc: 'Tríceps massa.', howTo: '1. Mãos juntas.\n2. Forme diamante.\n3. Desça e empurre.\n4. Cotovelos fechados.', proTip: 'Isolamento puro.' },
                { name: 'Remada Australiana', reps: '3 x 12', image: '/australian.png', desc: 'Espessura costas.', howTo: '1. Sob barra baixa.\n2. Corpo reto.\n3. Puxe o peito.\n4. Desça lento.', proTip: 'Esmague escápulas.', requiresBar: true },
                { name: 'Tríceps Testa', reps: '3 x 12', image: '/skullcrusher.png', desc: 'Tríceps isolado.', howTo: '1. Deitado no banco.\n2. Barra acima do peito.\n3. Flexione cotovelos até testa.\n4. Estenda retornando.', proTip: 'Cotovelos fechados.' },
                { name: 'Superman', reps: '3 x 15', image: '/superman.png', desc: 'Lombar e Postura.', howTo: '1. Deitado de bruços.\n2. Eleve braços e pernas.\n3. Segure 1s.\n4. Relaxe.', proTip: 'Olhe para o chão.' },
                { name: 'Mergulho no Banco', reps: '3 x 15', image: '/bench_dips.png', desc: 'Tríceps em casa.', howTo: '1. Mãos no banco.\n2. Pernas esticadas.\n3. Desça o quadril.\n4. Suba estendendo.', proTip: 'Costas rente ao banco.' }
            ],
            abs: [
                { name: 'Prancha Frontal', reps: '3 x 60s', image: '/plank_front.png', desc: 'Estabilidade.', howTo: '1. Antebraços.\n2. Corpo linha reta.\n3. Contraia tudo.\n4. Respire.', proTip: 'Aperte os glúteos.' },
                { name: 'Mountain Climbers', reps: '3 x 40s', image: '/climber.png', desc: 'Core e cardio.', howTo: '1. Posição flexão.\n2. Traga joelhos rápido.\n3. Troque pernas.\n4. Costas retas.', proTip: 'Acelere o ritmo.' },
                { name: 'Abdominal Infra', reps: '3 x 15', image: '/leg_raise.png', desc: 'Foco inferior.', howTo: '1. Deitado.\n2. Mãos sob quadril.\n3. Eleve pernas.\n4. Desça lento.', proTip: 'Lombar no chão.' },
                { name: 'Russian Twist', reps: '3 x 20', image: '/russian_twist.png', desc: 'Foco Oblíquos.', howTo: '1. Sentado em V.\n2. Gire o tronco.\n3. Toque o chão.\n4. Mantenha pernas altas.', proTip: 'Olhe para a mão.' },
                { name: 'Bicycle Crunches', reps: '3 x 20', image: '/bicycle.png', desc: 'Abdômen Completo.', howTo: '1. Deitado costas.\n2. Cotovelo no joelho oposto.\n3. Alterne lados.\n4. Ritmo controlado.', proTip: 'Gire bem o ombro.' },
                { name: 'Hollow Hold', reps: '3 x 30s', image: '/hollow.png', desc: 'Isometria Avançada.', howTo: '1. Deitado.\n2. Tire ombros e pés.\n3. Corpo em canoa.\n4. Segure firme.', proTip: 'Lombar colada no chão.' },
                { name: 'Abdominal Canivete', reps: '3 x 12', image: '/v_up.png', desc: 'Abs Total.', howTo: '1. Deitado esticado.\n2. Suba tronco e pernas.\n3. Toque os pés.\n4. Controle a descida.', proTip: 'Explosão na subida.' },
                { name: 'Prancha Lateral', reps: '3 x 30s/lado', image: '/side_plank.png', desc: 'Oblíquos e Core.', howTo: '1. Antebraço no chão.\n2. Corpo alinhado de lado.\n3. Segure firme.\n4. Troque o lado.', proTip: 'Não deixe o quadril cair.' }
            ]
        };

        // Filter library based on hasBar
        const filteredLib = {
            legs: lib.legs.filter(ex => hasBar || !ex.requiresBar),
            chest_biceps: lib.chest_biceps.filter(ex => hasBar || !ex.requiresBar),
            back_triceps: lib.back_triceps.filter(ex => hasBar || !ex.requiresBar),
            abs: lib.abs.filter(ex => hasBar || !ex.requiresBar)
        };

        setCategorizedRoutine(filteredLib);
    }, [hasBar]);

    // --- Dynamic Scheduling Logic ---
    const getDailyWorkout = () => {
        const selectedDays = profile.selectedWeekDays && profile.selectedWeekDays.length > 0
            ? profile.selectedWeekDays
            : ['seg', 'qua', 'sex']; // Default fallback

        // Normalize current day to match keys (dom, seg, ter...)
        const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const todayKeyStr = dayKeys[currentDayIdx];

        // 1. Check if today is a training day
        if (!selectedDays.includes(todayKeyStr)) {
            return { title: 'Descanso Ativo', category: 'rest', exercises: [] };
        }

        // 2. Determine Functionality Strategy
        const sortedDays = dayKeys.filter(d => selectedDays.includes(d));
        const dayIndexInRoutine = sortedDays.indexOf(todayKeyStr);

        let splitType = 'fullbody';
        let title = 'Corpo Todo';
        let targetCategory = 'all';

        // Re-implementing simplified selection logic
        if (['braço', 'costas'].includes(urgentPart)) {
            const routine = [{ t: 'Peito & Tríceps', c: 'chest_biceps' }, { t: 'Costas & Bíceps', c: 'back_triceps' }, { t: 'Ombros & Superiores', c: 'chest_biceps' }, { t: 'Full Body Reset', c: 'all' }];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        } else if (urgentPart === 'abdomen') {
            const routine = [{ t: 'Abs Hardcore', c: 'abs' }, { t: 'Full Body', c: 'all' }, { t: 'Trinca-Abs', c: 'abs' }];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        } else if (urgentPart === 'perna') {
            const routine = [{ t: 'Leg Day', c: 'legs' }, { t: 'Upper Body', c: 'chest_biceps' }, { t: 'Glute & Post', c: 'legs' }];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        } else {
            const routine = [{ t: 'Full Body A', c: 'all' }, { t: 'Full Body B', c: 'all' }];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        }

        // 3. Select 4 Unique Exercises
        let baseExercises = [];
        if (targetCategory === 'all') {
            baseExercises = [
                ...(categorizedRoutine.legs[0] ? [categorizedRoutine.legs[0]] : []),
                ...(categorizedRoutine.chest_biceps[0] ? [categorizedRoutine.chest_biceps[0]] : []),
                ...(categorizedRoutine.back_triceps[0] ? [categorizedRoutine.back_triceps[0]] : []),
                ...(categorizedRoutine.abs[0] ? [categorizedRoutine.abs[0]] : [])
            ];
        } else {
            baseExercises = categorizedRoutine[targetCategory] || [];
        }

        // Ensure we have exactly 4 base exercises (if available)
        baseExercises = baseExercises.slice(0, 4);

        // 4. Repeat to Fill Duration
        const totalSlots = Math.ceil(trainingDuration / 4);
        let finalExercises = [];

        for (let i = 0; i < totalSlots; i++) {
            if (baseExercises.length > 0) {
                finalExercises.push(baseExercises[i % baseExercises.length]);
            }
        }

        return { title, category: targetCategory, exercises: finalExercises };
    };

    const todayWorkout = getDailyWorkout();
    const todayDone = workoutHistory[todayKey] === 'done';

    const handleCompleteWorkout = () => {
        let xpReward = 200;
        if (trainingDuration >= 30) xpReward = 400;
        else if (trainingDuration >= 20) xpReward = 300;
        else if (trainingDuration >= 15) xpReward = 250;
        else if (trainingDuration >= 10) xpReward = 200;

        onCompleteDaily(xpReward);
    };

    const allChecked = todayWorkout.exercises.length > 0 && checkedExercises.size === todayWorkout.exercises.length;

    return (
        <section className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

            {/* Modal Detail Overlay */}
            {selectedExercise && (
                <div className="modal-overlay animate-fade-in" onClick={() => setSelectedExercise(null)}>
                    <div className="modal-content wide-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setSelectedExercise(null)}>×</button>
                        <div className="modal-inner">
                            <div className="modal-media-panel">
                                <div className="media-wrapper"><img src={selectedExercise.image} alt={selectedExercise.name} /></div>
                                <div className="exercise-stats"><div className="stat-pill">TEMPO: {trainingDuration} MIN</div></div>
                            </div>
                            <div className="modal-info-panel">
                                <h2 className="modal-title">{selectedExercise.name}</h2>
                                <p className="modal-subtitle">{selectedExercise.desc}</p>
                                <div className="instruction-section">
                                    <h3 className="section-subtitle">Instruções:</h3>
                                    {selectedExercise.howTo.split('\n').map((step, i) => (
                                        <p key={i} style={{ marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                            <strong style={{ color: 'var(--color-primary)' }}>{i + 1}.</strong> {step.split('. ')[1] || step}
                                        </p>
                                    ))}
                                </div>
                                {selectedExercise.proTip && (
                                    <div className="pro-tip-box"><div className="pro-tip-header">✦ DICA PRO</div><p className="pro-tip-text">{selectedExercise.proTip}</p></div>
                                )}
                                <button className="btn-primary start-btn" onClick={() => {
                                    onStartWorkout(selectedExercise);
                                    setSelectedExercise(null);
                                }}>INICIAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PARA VOCE Section */}
            {mealPlan && (
                <div className="animate-fade-in" style={{ marginBottom: '4rem' }}>
                    <div className="card" style={{ border: '1px solid var(--color-primary)', background: 'rgba(0, 240, 255, 0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>GUIA <span className="title-gradient">PARA VOCÊ</span></h2>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Foco: {urgentPart.toUpperCase()} | {trainingDuration}min por dia</p>
                                {/* Checkbox for Equipment (Restored) */}
                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={hasBar}
                                        onChange={(e) => setHasBar(e.target.checked)}
                                        style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                        id="bar-check"
                                    />
                                    <label htmlFor="bar-check" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                                        Tenho barra fixa em casa
                                    </label>
                                </div>
                            </div>
                            {todayDone ? (
                                <div className="done-status-badge">CONCLUÍDO ✓</div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                    Conclua todos para pontuar
                                </div>
                            )}
                        </div>

                        {/* Tracker Semanal */}
                        <div className="weekly-tracker">
                            {weekDays.map((day, idx) => {
                                const isToday = day === currentDayName;
                                const d = new Date();
                                d.setDate(now.getDate() - (currentDayIdx - idx));
                                const key = d.toISOString().split('T')[0];
                                const status = workoutHistory[key];

                                return (
                                    <div key={day} className={`tracker-day ${isToday ? 'active' : ''}`}>
                                        <div className="day-label">{day.substring(0, 3)}</div>
                                        <div className={`status-icon ${status || 'pending'}`}>
                                            {status === 'done' ? '✓' : status === 'missed' ? '✕' : isToday ? '○' : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Today's Content */}
                        <div className="today-content">
                            <h3 style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-primary)', paddingLeft: '1rem' }}>
                                HOJE: <span style={{ color: 'var(--color-primary)' }}>{todayWorkout.title}</span>
                            </h3>
                            {todayWorkout.category === 'rest' ? (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>😴 Dia de descanso planejado. Foque na nutrição!</div>
                            ) : todayDone ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    Treino de hoje finalizado! Bom descanso. 🔥
                                </div>
                            ) : (
                                <>
                                    <div className="mini-grid">
                                        {todayWorkout.exercises.map((ex, i) => (
                                            <div key={i} className="mini-ex-card" style={{
                                                border: checkedExercises.has(i) ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                                                opacity: checkedExercises.has(i) ? 0.6 : 1,
                                                position: 'relative'
                                            }} onClick={() => {
                                                setSelectedExercise(ex);
                                            }}>
                                                {/* Visual Indicator of Completion (non-clickable) */}
                                                {checkedExercises.has(i) && (
                                                    <div style={{
                                                        position: 'absolute', top: '5px', right: '5px',
                                                        color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 'bold'
                                                    }}>
                                                        ✓
                                                    </div>
                                                )}

                                                <img src={ex.image} alt={ex.name} style={{ cursor: 'pointer' }} />
                                                <div style={{ flex: 1, cursor: 'pointer' }}>
                                                    <div style={{ fontWeight: '600' }}>{ex.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>{ex.reps}</div>
                                                </div>
                                                <button className="btn-primary-sm" onClick={(e) => { e.stopPropagation(); onStartWorkout({ ...ex, isDaily: true, index: i }); }}>GO</button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className="btn-primary"
                                        style={{
                                            width: '100%', marginTop: '2rem', padding: '15px', fontSize: '1.1rem',
                                            opacity: allChecked ? 1 : 0.5,
                                            cursor: allChecked ? 'pointer' : 'not-allowed',
                                            filter: allChecked ? 'none' : 'grayscale(100%)'
                                        }}
                                        disabled={!allChecked}
                                        onClick={handleCompleteWorkout}
                                    >
                                        {allChecked ? 'CONCLUIR TREINO' : 'CONCLUA TODOS OS EXERCÍCIOS'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <h2 className="section-title">Minha <span className="title-gradient">Biblioteca</span></h2>
            <div className="routine-groups">
                <CategoryGroup title="Membros Inferiores" list={categorizedRoutine.legs} onSelect={setSelectedExercise} />
                <CategoryGroup title="Superiores & Braços" list={categorizedRoutine.chest_biceps} onSelect={setSelectedExercise} />
                <CategoryGroup title="Costas & Tríceps" list={categorizedRoutine.back_triceps} onSelect={setSelectedExercise} />
                <CategoryGroup title="Abdômen & Core" list={categorizedRoutine.abs} onSelect={setSelectedExercise} />
            </div>

            <style>{`
                .weekly-tracker { display: flex; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 12px; margin-bottom: 2rem; }
                .tracker-day { flex: 1; text-align: center; }
                .day-label { font-size: 0.65rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; }
                .status-icon { width: 32px; height: 32px; margin: 0 auto; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 900; }
                .tracker-day.active .status-icon { border-color: var(--color-primary); color: var(--color-primary); box-shadow: 0 0 10px rgba(0,240,255,0.2); }
                .status-icon.done { background: var(--color-primary); color: #000; border: none; }
                .status-icon.missed { border-color: #ff0055; color: #ff0055; }

                .mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.8rem; }
                .mini-ex-card { display: flex; flex-direction: column; align-items: flex-start; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 12px; cursor: pointer; transition: 0.2s; gap: 0.5rem; border: 1px solid rgba(255,255,255,0.05); }
                .mini-ex-card:hover { border-color: var(--color-primary); background: rgba(0,240,255,0.05); }
                .mini-ex-card img { width: 100%; height: 80px; object-fit: contain; background: #000; border-radius: 8px; }
                
                @media (min-width: 480px) {
                    .mini-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
                    .mini-ex-card { flex-direction: row; align-items: center; gap: 1rem; }
                    .mini-ex-card img { width: 50px; height: 50px; }
                }

                .done-status-badge { background: rgba(0,255,102,0.1); color: #00ff66; padding: 6px 15px; border-radius: 20px; font-weight: 800; font-size: 0.7rem; border: 1px solid #00ff66; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(15px); }
                .wide-modal { width: 100%; max-width: 850px; background: #0a0a0c; border-radius: 24px; border: 1px solid rgba(0,240,255,0.2); overflow: hidden; position: relative; }
                .modal-inner { display: flex; min-height: 480px; }
                @media (max-width: 768px) { .modal-inner { flex-direction: column; } }
                .modal-media-panel { flex: 0 0 40%; background: radial-gradient(circle, #1a1a1f 0%, #000 100%); display: flex; align-items: center; justify-content: center; }
                .modal-media-panel img { width: 85%; filter: drop-shadow(0 0 25px var(--color-primary)); }
                .modal-info-panel { flex: 1; padding: 2.5rem; display: flex; flex-direction: column; justify-content: center; }
                .modal-title { font-size: 2rem; margin-bottom: 0.5rem; }
                .modal-subtitle { color: var(--color-text-muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
                .instruction-section { margin-bottom: 2rem; }
                .pro-tip-box { background: rgba(0,240,255,0.05); padding: 1rem; border-radius: 12px; border-left: 4px solid var(--color-primary); margin-bottom: 2rem; }
                .close-btn { position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; color: #fff; font-size: 2.2rem; cursor: pointer; z-index: 10; }
            `}</style>
        </section>
    );
};

const CategoryGroup = ({ title, list, onSelect }) => (
    <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.2rem', color: '#fff' }}>{title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {list.map((ex, i) => (
                <div key={i} className="card" onClick={() => onSelect(ex)} style={{ cursor: 'pointer', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '8px', marginBottom: '0.8rem' }}>
                        <img src={ex.image} alt={ex.name} style={{ maxHeight: '90%', maxWidth: '90%' }} />
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{ex.name}</div>
                    <div style={{ color: 'var(--color-primary)', fontSize: '0.75rem' }}>{ex.reps}</div>
                </div>
            ))}
        </div>
    </div>
);

export default WorkoutsSection;
