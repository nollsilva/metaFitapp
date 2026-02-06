import React, { useState, useEffect } from 'react';
import ShareStoryCard from './ShareStoryCard';
import { shareHiddenElement } from '../utils/share';

const WorkoutsSection = ({ profile, onUpdateProfile, onStartWorkout, onCompleteDaily, checkedExercises, onToggleCheck }) => {
    // Initialize form state from profile
    const [urgentPart, setUrgentPart] = useState(profile.urgentPart || 'corpo todo');
    const [trainingDays, setTrainingDays] = useState(profile.trainingDays || 3);
    const [selectedWeekDays, setSelectedWeekDays] = useState(profile.selectedWeekDays || []);
    const [trainingDuration, setTrainingDuration] = useState(profile.trainingDuration || 20);

    // UI State
    // Auto-open settings if no days selected
    const [showSettings, setShowSettings] = useState(!profile.selectedWeekDays || profile.selectedWeekDays.length === 0);
    const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'library'

    const { goal, mealPlan, workoutHistory = {} } = profile;

    const [selectedExercise, setSelectedExercise] = useState(null);
    const [categorizedRoutine, setCategorizedRoutine] = useState({
        legs: [], glutes: [], chest: [], back: [], abs: [], arms: [], shoulders_biceps: []
    });

    // ... (useEffect for props stays same) ...

    // Checkbox state for equipment
    const [hasBar, setHasBar] = useState(false);

    // --- Date & Time Helpers ---
    // ... (Date/Time helpers stay same) ...
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const now = new Date();
    const currentDayIdx = now.getDay();
    const todayKey = now.toISOString().split('T')[0];

    useEffect(() => {
        // Full Exercise Library
        const lib = {
            legs: [
                { name: 'Agachamento Livre', reps: '3 x 15', image: '/squat.png', desc: 'Base fundamental.', howTo: '1. Pés largura ombros.\n2. Inicie pelo quadril.\n3. Desça até paralelo.\n4. Suba empurrando o chão.', proTip: 'Mantenha o peito alto.' },
                { name: 'Agachamento Isométrico (Parede)', reps: '3 x 45s', image: '/wall_sit.png', desc: 'Resistência quadríceps.', howTo: '1. Encoste na parede.\n2. Desça até 90 graus.\n3. Segure firme.\n4. Mãos fora das pernas.', proTip: 'Pressione as costas na parede.' },
                { name: 'Afundo Alternado', reps: '3 x 12/lado', image: '/lunge.png', desc: 'Dinâmico.', howTo: '1. Passo à frente.\n2. Desça o joelho de trás.\n3. Volte e troque a perna.\n4. Mantenha tronco reto.', proTip: 'Não bata o joelho no chão.' },
                { name: 'Passada Estacionária', reps: '3 x 12/lado', image: '/split_squat.png', desc: 'Foco Quadríceps.', howTo: '1. Pés afastados (tesoura).\n2. Desça verticalmente.\n3. Suba sem sair do lugar.\n4. Termine um lado, depois troque.', proTip: 'Peso na perna da frente.' },
                { name: 'Elevação de Panturrilha', reps: '3 x 20', image: '/calf_raise.png', desc: 'Gastrocnêmio.', howTo: '1. Pés largura quadril.\n2. Suba na ponta dos pés.\n3. Segure 1s no topo.\n4. Desça até quase tocar o chão.', proTip: 'Amplitude máxima.' }
            ],
            glutes: [
                { name: 'Elevação Pélvica', reps: '3 x 20', image: '/bridge.png', desc: 'Ponte de Glúteo.', howTo: '1. Deitado.\n2. Pés no chão.\n3. Eleve o quadril.\n4. Contraia no topo.', proTip: 'Force os calcanhares.' },
                { name: 'Elevação Pélvica Unilateral', reps: '3 x 12/lado', image: '/single_leg_bridge.png', desc: 'Glúteo isolado.', howTo: '1. Uma perna esticada.\n2. Suba com a outra.\n3. Quadril alinhado.\n4. Contraia forte.', proTip: 'Não gire o quadril.' },
                { name: 'Agachamento Sumô', reps: '3 x 15', image: '/sumo.png', desc: 'Foco adutores/glúteo.', howTo: '1. Base larga.\n2. Pés para fora.\n3. Agache reto.\n4. Joelhos abertos.', proTip: 'Coluna vertical.' },
                { name: 'Afundo Reverso', reps: '3 x 12/lado', image: '/reverse_lunge.png', desc: 'Cadeia posterior.', howTo: '1. Passo para trás.\n2. Desça vertical.\n3. Joelho 90 graus.\n4. Volte à base.', proTip: 'Tronco levemente à frente.' }, // Using explicit name
                { name: 'Coice de Glúteo (4 Apoios)', reps: '3 x 15/lado', image: '/glute_kickback.png', desc: 'Foco total glúteo.', howTo: '1. Quatro apoios.\n2. Chute para o teto.\n3. Joelho 90 graus ou reto.\n4. Não arqueie a lombar.', proTip: 'Aperte o glúteo no topo.' }
            ],
            chest: [
                { name: 'Flexão Tradicional', reps: '3 x 12', image: '/pushup.png', desc: 'Peitoral médio.', howTo: '1. Mãos largas.\n2. Corpo prancha.\n3. Peito ao chão.\n4. Empurre.', proTip: 'Core travado.' },
                { name: 'Flexão com Pausa', reps: '3 x 10', image: '/pause_pushup.png', desc: 'Força estática.', howTo: '1. Desça normal.\n2. Segure 2s no fundo.\n3. Não encoste no chão.\n4. Exploda para subir.', proTip: 'Segure a respiração embaixo.' },
                { name: 'Flexão Inclinada (Pés Elevados)', reps: '3 x 10', image: '/decline_pushup.png', desc: 'Peitoral Superior.', howTo: '1. Pés no banco.\n2. Mãos no chão.\n3. Desça até o queixo.\n4. Mantenha core firme.', proTip: 'Não deixe o quadril cair.' }, // Techically Decline in English
                { name: 'Flexão Declinada (Mãos Elevadas)', reps: '3 x 15', image: '/incline_pushup.png', desc: 'Peitoral Inferior.', howTo: '1. Mãos no banco/sofá.\n2. Pés no chão.\n3. Leve o peito ao banco.\n4. Empurre.', proTip: 'Ótimo para iniciantes.' }, // Technically Incline in English
                { name: 'Flexão Explosiva', reps: '3 x 8', image: '/explosive_pushup.png', desc: 'Potência.', howTo: '1. Desça controlado.\n2. Empurre com máxima força.\n3. Tire as mãos do chão.\n4. Amorteça a queda.', proTip: 'Cuidado com os pulsos.' }
            ],
            back: [
                { name: 'Remada Australiana', reps: '3 x 12', image: '/australian.png', desc: 'Espessura costas.', howTo: '1. Sob mesa/barra.\n2. Corpo reto.\n3. Puxe o peito até a borda.\n4. Desça lento.', proTip: 'Certifique-se que a mesa aguenta!', requiresBar: true },
                { name: 'Superman Isométrico', reps: '3 x 20s', image: '/superman.png', desc: 'Lombar e Postura.', howTo: '1. Deitado de bruços.\n2. Eleve braços e pernas.\n3. Segure a posição.\n4. Olhe para o chão.', proTip: 'Contraia glúteos e lombar.' },
                { name: 'Elevação Tronco (Prona)', reps: '3 x 15', image: '/back_extension.png', desc: 'Eretor da espinha.', howTo: '1. Deitado de bruços.\n2. Mãos na nuca.\n3. Suba apenas o tronco.\n4. Pés no chão.', proTip: 'Não force o pescoço.' },
                { name: 'Remada Unilateral (Toalha)', reps: '3 x 12/lado', image: '/door_row.png', desc: 'Dorsais em casa.', howTo: '1. Prenda toalha na maçaneta.\n2. Pés próximos à porta.\n3. Incline para trás.\n4. Puxe com um braço.\n4. Puxe com um braço.', proTip: 'Maçaneta deve ser forte!' },
                { name: 'Pull-down Isométrico (Toalha)', reps: '3 x 15s', image: '/towel_pulldown.png', desc: 'Ativação latíssimo.', howTo: '1. Segure toalha acima cabeça.\n2. Puxe para fora tentando rasgar.\n3. Traga ao peito tensionando.\n4. Segure embaixo.', proTip: 'Tensão constante na toalha.' }
            ],
            shoulders_biceps: [ // Renamed residual category
                { name: 'Chin-up (Supinada)', reps: '3 x 6', image: '/chinup.png', desc: 'Bíceps e dorsais.', howTo: '1. Palmas para você.\n2. Puxe até o queixo.\n3. Desça total.\n4. Controle.', proTip: 'Sem balanço.', requiresBar: true },
                { name: 'Hammer Curl', reps: '3 x 12', image: '/hammer_curl.png', desc: 'Bíceps e Antebraço.', howTo: '1. Halteres neutros.\n2. Cotovelos fixos.\n3. Suba até o ombro.\n4. Desça controlado.', proTip: 'Não balance o tronco.' },
                { name: 'Desenvolvimento Ombros', reps: '3 x 12', image: '/shoulder_press.png', desc: 'Ombros completo.', howTo: '1. Halteres na altura orelha.\n2. Empurre para cima.\n3. Braços esticados.\n4. Retorne a 90 graus.', proTip: 'Core firme.' },
                { name: 'Flexão Pike', reps: '3 x 10', image: '/pike_pushup.png', desc: 'Ombros Calistenia.', howTo: '1. Corpo em V invertido.\n2. Olhe para os pés.\n3. Dobre cotovelos.\n4. Empurre o chão.', proTip: 'Mantenha pernas esticadas.' }
            ],
            // back_triceps DEPRECATED - Content moved to 'back' and 'arms'
            arms: [
                { name: 'Flexão Diamante', reps: '3 x 10', image: '/diamond.png', desc: 'Ênfase em tríceps.', howTo: '1. Mãos unidas formando diamante.\n2. Desça o peito até a mão.\n3. Empurre focando no tríceps.\n4. Mantenha cotovelos próximos.', proTip: 'Não abra os cotovelos.' },
                { name: 'Flexão Fechada', reps: '3 x 12', image: '/close_grip_pushup.png', desc: 'Tríceps e Peito miolo.', howTo: '1. Mãos na largura dos ombros.\n2. Cotovelos raspando no tronco.\n3. Desça controlado.\n4. Empurre explosivo.', proTip: 'Cotovelos sempre colados ao corpo.' },
                { name: 'Mergulho no Banco', reps: '3 x 15', image: '/bench_dips.png', desc: 'Tríceps em casa.', howTo: '1. Mãos no banco.\n2. Pernas esticadas.\n3. Desça o quadril.\n4. Suba estendendo.', proTip: 'Costas rente ao banco.' },
                { name: 'Isometria de Flexão', reps: '3 x 20s', image: '/pushup_hold.png', desc: 'Resistência Tríceps.', howTo: '1. Posição de flexão.\n2. Desça até a metade (90 graus).\n3. Segure estático.\n4. Respire controlado.', proTip: 'Não deixe o quadril cair.' },
                { name: 'Flexão Arqueiro', reps: '3 x 8/lado', image: '/archer.png', desc: 'Tríceps unilateral.', howTo: '1. Mãos bem largas.\n2. Desça em um braço.\n3. Outro braço reto.\n4. Suba e troque.', proTip: 'Transfira o peso para o braço de apoio.' }
            ],
            abs: [
                { name: 'Prancha Frontal', reps: '3 x 45s', image: '/plank_front.png', desc: 'Estabilidade.', howTo: '1. Antebraços.\n2. Corpo linha reta.\n3. Contraia tudo.\n4. Respire.', proTip: 'Aperte os glúteos.' },
                { name: 'Elevação de Pernas Deitado', reps: '3 x 15', image: '/leg_raise.png', desc: 'Foco inferior.', howTo: '1. Deitado.\n2. Mãos sob quadril.\n3. Eleve pernas.\n4. Desça lento.', proTip: 'Lombar no chão.' },
                { name: 'Abdominal Bicicleta', reps: '3 x 20', image: '/bicycle.png', desc: 'Abdômen Completo.', howTo: '1. Deitado costas.\n2. Cotovelo no joelho oposto.\n3. Alterne lados.\n4. Ritmo controlado.', proTip: 'Gire bem o ombro.' },
                { name: 'Prancha Lateral', reps: '3 x 20s/lado', image: '/side_plank.png', desc: 'Oblíquos e Core.', howTo: '1. Antebraço no chão.\n2. Corpo alinhado de lado.\n3. Segure firme.\n4. Troque o lado.', proTip: 'Não deixe o quadril cair.' },
                { name: 'Abdominal Canivete', reps: '3 x 10', image: '/v_up.png', desc: 'Abs Total.', howTo: '1. Deitado esticado.\n2. Suba tronco e pernas.\n3. Toque os pés.\n4. Controle a descida.', proTip: 'Explosão na subida.' }
            ]
        };

        // GENDER ADAPTATIONS
        if (profile.gender === 'female') {
            const kneePushup = { name: 'Flexão com Joelhos', reps: '3 x 12', image: '/knee_pushup.png', desc: 'Peitoral (Adaptado).', howTo: '1. Joelhos no chão.\n2. Mãos largas.\n3. Desça o peito.\n4. Empurre.', proTip: 'Mantenha quadril alinhado.' };
            const wallPushup = { name: 'Flexão na Parede', reps: '3 x 15', image: '/wall_pushup.png', desc: 'Iniciante.', howTo: '1. Pés afastados da parede.\n2. Mãos altura ombro.\n3. Aproxime rosto.\n4. Empurre.', proTip: 'Corpo reto.' };

            // Chest
            lib.chest[0] = kneePushup;
            lib.chest[2] = { name: 'Flexão Banco (Pés chão)', reps: '3 x 12', image: '/incline_pushup.png', desc: 'Peitoral (Mais leve).', howTo: '1. Mãos no banco.\n2. Corpo reto.\n3. Toque o peito.\n4. Empurre.', proTip: 'Mais fácil que chão.' }; // Replace 'Pés Elevados' (Hard) with Hands Elevated (Easy) for scaling if needed, or Keep?
            // User requested specific exercises, but gender logic usually simplifies. I'll stick to replacing the hardest ones or adapting.
            // Keeping it simple for now as per refactor.

            // Other adaptations...
            lib.arms[0] = { name: 'Tríceps Coice', reps: '3 x 15', image: '/tricep_kickback.png', desc: 'Tríceps (Halteres).', howTo: '1. Tronco inclinado.\n2. Cotovelo alto fixo.\n3. Estenda o braço.\n4. Volte 90 graus.', proTip: 'Não balance o ombro.' };

            // Shoulders adaptation
            lib.shoulders_biceps[3] = { name: 'Prancha Toca Ombro', reps: '3 x 20', image: '/shoulder_tap.png', desc: 'Estabilidade Ombro.', howTo: '1. Posição prancha alta.\n2. Tira uma mão.\n3. Toca ombro oposto.\n4. Evite girar quadril.', proTip: 'Contraia abdômen forte.' };

            // Back
            // Ensure Australian row has an alternative if no "table"? Or just keep defaults.
            // Woman adaptations for Back usually involve lighter load or emphasis on form. The list is bodyweight/towel, should be fine.
        }

        // Filter library based on hasBar
        const filteredLib = {
            legs: lib.legs.filter(ex => hasBar || !ex.requiresBar),
            glutes: lib.glutes.filter(ex => hasBar || !ex.requiresBar),
            chest: lib.chest.filter(ex => hasBar || !ex.requiresBar),
            back: lib.back.filter(ex => hasBar || !ex.requiresBar),
            chest_biceps: [], // Deprecated
            back_triceps: [], // Deprecated
            shoulders_biceps: lib.shoulders_biceps.filter(ex => hasBar || !ex.requiresBar),
            arms: lib.arms.filter(ex => hasBar || !ex.requiresBar),
            abs: lib.abs.filter(ex => hasBar || !ex.requiresBar)
        };

        setCategorizedRoutine(filteredLib);
    }, [hasBar, profile.gender]);

    // --- Settings Logic ---
    const handleDayToggle = (day) => {
        let newDays = [...selectedWeekDays];
        if (newDays.includes(day)) {
            newDays = newDays.filter(d => d !== day);
        } else {
            newDays.push(day);
        }
        setSelectedWeekDays(newDays);
        setTrainingDays(newDays.length || 1);
    };

    const handleSaveSettings = () => {
        onUpdateProfile({
            urgentPart,
            trainingDays,
            selectedWeekDays,
            trainingDuration
        });
        setShowSettings(false);
    };

    const weekMap = [
        { key: 'dom', label: 'D' }, { key: 'seg', label: 'S' }, { key: 'ter', label: 'T' },
        { key: 'qua', label: 'Q' }, { key: 'qui', label: 'Q' }, { key: 'sex', label: 'S' },
        { key: 'sab', label: 'S' }
    ];

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
            // Upper Body Focus: Chest/Triceps, Back/Biceps, Arms/Shoulders
            // Rotate: Chest -> Back -> Arms/Shoulders
            const routine = [
                { t: 'Peito & Tríceps (Focus)', c: 'chest' },
                { t: 'Costas & Bíceps (Focus)', c: 'back' },
                { t: 'Braços & Ombros', c: 'arms' }, // Could include shoulders_biceps too? Let's stick to arms for intensity
                { t: 'Full Body Reset', c: 'all' }
            ];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        } else if (urgentPart === 'abdomen') {
            const routine = [{ t: 'Abs Hardcore', c: 'abs' }, { t: 'Full Body Cardio', c: 'legs' }, { t: 'Trinca-Abs', c: 'abs' }];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        } else if (urgentPart === 'perna') {
            const routine = [
                { t: 'Leg Day (Quads)', c: 'legs' },
                { t: 'Glúteos & Posterior', c: 'glutes' },
                { t: 'Upper Body Recovery', c: 'chest' }
            ];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        } else {
            // Default Balance
            const routine = [{ t: 'Full Body A', c: 'all' }, { t: 'Full Body B', c: 'all' }];
            const pick = routine[dayIndexInRoutine % routine.length];
            title = pick.t; targetCategory = pick.c;
        }

        // 3. Select 4 Unique Exercises -> NOW DYNAMIC BASED ON TIME
        let baseExercises = [];
        if (targetCategory === 'all') {
            // Pick 1 from each major group
            baseExercises = [
                ...(categorizedRoutine.legs[0] ? [categorizedRoutine.legs[0]] : []),
                ...(categorizedRoutine.chest[0] ? [categorizedRoutine.chest[0]] : []), // Updated from chest_biceps
                ...(categorizedRoutine.back[0] ? [categorizedRoutine.back[0]] : []),   // Updated from back_triceps
                ...(categorizedRoutine.abs[0] ? [categorizedRoutine.abs[0]] : [])
            ];
        } else {
            // Fallback for compound categories if needed, or direct mapping
            if (targetCategory === 'arms') {
                // Combine Arms (Triceps) + Shoulders/Biceps for a full arm day? 
                // Or just use the 'arms' category which is mostly Triceps/Pushups now. 
                // Let's combine them for a better "Arm Day"
                baseExercises = [...(categorizedRoutine.arms || []), ...(categorizedRoutine.shoulders_biceps || [])];
            } else {
                baseExercises = categorizedRoutine[targetCategory] || [];
            }
        }

        // 4. Calculate Total Slots based on Time (3 min per exercise)
        const TIME_PER_EXERCISE = 3;
        const durationNum = parseInt(trainingDuration, 10) || 15; // Default to 15 if undefined
        const totalSlots = Math.ceil(durationNum / TIME_PER_EXERCISE);

        let finalExercises = [];

        // Fill slots cycling through base exercises
        if (baseExercises.length > 0) {
            for (let i = 0; i < totalSlots; i++) {
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

        // VIP BONUS FOR SCHEDULED WORKOUTS: +15%
        if (profile.vip) {
            xpReward = Math.ceil(xpReward * 1.15);
        }

        onCompleteDaily(xpReward);
    };

    const allChecked = todayWorkout.exercises.length > 0 && checkedExercises.size === todayWorkout.exercises.length;

    const handleShareWorkout = () => {
        // Trigger share
        shareHiddenElement('share-workout-card', `treino-${todayKey}.png`);
    };

    return (
        <section className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

            {/* Hidden Card for Sharing */}
            <ShareStoryCard
                id="share-workout-card"
                type="workout"
                isVip={profile.vip}
                data={{
                    name: profile.name || profile.userName,
                    avatar: profile.avatar,
                    duration: trainingDuration,
                    xpTotal: profile.xp, // for medal
                    xp: trainingDuration >= 30 ? 400 : 200, // Estimate based on logic
                    focus: todayWorkout.title
                }}
            />

            {/* --- SETTINGS ACCORDION --- */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--color-primary)', background: 'rgba(0, 240, 255, 0.05)' }}>
                <div
                    onClick={() => setShowSettings(!showSettings)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem' }}>⚙️ Foco & Ritmo</h3>
                    <div style={{ transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>▼</div>
                </div>

                {showSettings && (
                    <div className="animate-fade-in" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                            <div className="input-group">
                                <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Foco Muscular</label>
                                <select
                                    value={urgentPart}
                                    onChange={(e) => setUrgentPart(e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '8px' }}
                                >
                                    <option value="corpo todo">Corpo Todo</option>
                                    <option value="braço">Braços & Peito</option>
                                    <option value="perna">Pernas & Glúteos</option>
                                    <option value="abdomen">Abdômen & Core</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Dias de Treino ({trainingDays})</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {weekMap.map(day => (
                                        <button
                                            key={day.key}
                                            onClick={() => handleDayToggle(day.key)}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                border: '1px solid',
                                                borderColor: selectedWeekDays.includes(day.key) ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                                background: selectedWeekDays.includes(day.key) ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: selectedWeekDays.includes(day.key) ? '#fff' : 'var(--color-text-muted)',
                                                fontWeight: 'bold', fontSize: '0.8rem',
                                                cursor: 'pointer', transition: '0.2s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-group">
                                <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Duração por Treino</label>
                                <select
                                    value={trainingDuration}
                                    onChange={(e) => setTrainingDuration(e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '8px' }}
                                >
                                    <option value="10">10 min</option>
                                    <option value="15">15 min</option>
                                    <option value="20">20 min</option>
                                    <option value="30">30 min</option>
                                </select>
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            style={{ marginTop: '1.5rem', width: '100%', padding: '10px' }}
                            onClick={handleSaveSettings}
                        >
                            SALVAR & FECHAR
                        </button>
                    </div>
                )}
            </div>

            {/* --- TABS --- */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                    onClick={() => setActiveTab('guide')}
                    style={{
                        padding: '10px 20px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'guide' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        color: activeTab === 'guide' ? '#fff' : 'var(--color-text-muted)',
                        fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer'
                    }}
                >
                    Guia Para Você
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    style={{
                        padding: '10px 20px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'library' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        color: activeTab === 'library' ? '#fff' : 'var(--color-text-muted)',
                        fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer'
                    }}
                >
                    Treinos Avulsos
                </button>
            </div>

            {/* Modal Detail Overlay (Shared) */}
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

            {/* --- CONTENT: GUIDE --- */}
            {activeTab === 'guide' && (
                <div className="animate-fade-in">
                    {/* PARA VOCE Section */}
                    {mealPlan && (
                        <div style={{ marginBottom: '4rem' }}>
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
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                                Treino de hoje finalizado! Bom descanso. 🔥
                                            </div>
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleShareWorkout()}
                                                style={{
                                                    background: 'linear-gradient(90deg, #E1306C, #FD1D1D)',
                                                    border: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem' }}>📸</span> Compartilhar Conquista
                                            </button>
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
                </div>
            )}

            {/* --- CONTENT: LIBRARY --- */}
            {activeTab === 'library' && (
                <div className="animate-fade-in">
                    <h2 className="section-title">Minha <span className="title-gradient">Biblioteca</span></h2>
                    <div className="routine-groups">
                        <CategoryGroup title="Peito" list={categorizedRoutine.chest} onSelect={setSelectedExercise} />
                        <CategoryGroup title="Costas" list={categorizedRoutine.back} onSelect={setSelectedExercise} />
                        <CategoryGroup title="Pernas" list={categorizedRoutine.legs} onSelect={setSelectedExercise} />
                        <CategoryGroup title="Glúteos" list={categorizedRoutine.glutes} onSelect={setSelectedExercise} />
                        <CategoryGroup title="Ombros & Bíceps" list={categorizedRoutine.shoulders_biceps} onSelect={setSelectedExercise} />
                        <CategoryGroup title="Braço (Bíceps + Tríceps)" list={categorizedRoutine.arms} onSelect={setSelectedExercise} />
                        <CategoryGroup title="Abdômen & Core" list={categorizedRoutine.abs} onSelect={setSelectedExercise} />
                    </div>
                </div>
            )}

            <style>{`
                .weekly-tracker { display: flex; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 12px; margin-bottom: 2rem; }
                .tracker-day { flex: 1; text-align: center; }
                .day-label { font-size: 0.65rem; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 0.5rem; }
                .status-icon { width: 32px; height: 32px; margin: 0 auto; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 900; }
                .tracker-day.active .status-icon { border-color: var(--color-primary); color: var(--color-primary); box-shadow: 0 0 10px rgba(0,240,255,0.2); }
                .status-icon.done { background: var(--color-primary); color: #000; border: none; }
                .status-icon.missed { border-color: #ff0055; color: #ff0055; background: rgba(255, 0, 85, 0.15); box-shadow: 0 0 10px rgba(255, 0, 85, 0.2); }

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
