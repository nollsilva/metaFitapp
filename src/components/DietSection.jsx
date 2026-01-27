import React, { useState, useEffect } from 'react';

const DietSection = ({ profile, onUpdateProfile }) => {
    // Local state for inputs
    const [weight, setWeight] = useState(profile.weight);
    const [height, setHeight] = useState(profile.height);
    const [age, setAge] = useState(profile.age);
    const [gender, setGender] = useState(profile.gender || 'male');
    const [activityLevel, setActivityLevel] = useState(profile.activityLevel || '1.55');
    const [goal, setGoal] = useState(profile.goal || 'maintain');

    // Novos campos de Treino
    const [urgentPart, setUrgentPart] = useState(profile.urgentPart || 'corpo todo');
    const [trainingDays, setTrainingDays] = useState(profile.trainingDays || 3);
    const [selectedWeekDays, setSelectedWeekDays] = useState(profile.selectedWeekDays || []);
    const [trainingDuration, setTrainingDuration] = useState(profile.trainingDuration || 20);

    const [showInputs, setShowInputs] = useState(!profile.mealPlan);

    useEffect(() => {
        setWeight(profile.weight);
        setHeight(profile.height);
        setAge(profile.age);
        setGender(profile.gender || 'male');
        setActivityLevel(profile.activityLevel);
        setGoal(profile.goal);
        setUrgentPart(profile.urgentPart || 'corpo todo');
        setTrainingDays(profile.trainingDays || 3);
        setSelectedWeekDays(profile.selectedWeekDays || []);
        setTrainingDuration(profile.trainingDuration || 20);
        if (profile.mealPlan) setShowInputs(false);
    }, [profile]);

    const calculateMetrics = () => {
        if (!weight || !height || !age) return;

        const h_m = height / 100;
        const w_kg = parseFloat(weight);
        const age_val = parseFloat(age);

        const imc = w_kg / (h_m * h_m);

        let classification = '';
        let color = '';
        if (imc < 18.5) { classification = 'Abaixo do Peso'; color = '#00f0ff'; }
        else if (imc < 24.9) { classification = 'Peso Normal'; color = '#00ff66'; }
        else if (imc < 29.9) { classification = 'Sobrepeso'; color = '#ffaa00'; }
        else { classification = 'Obesidade'; color = '#ff0055'; }

        const idealWeight = 21.7 * (h_m * h_m);
        // TMB (Taxa Metabólica Basal) - Fórmula de Mifflin-St Jeor
        let tmb = (10 * w_kg) + (6.25 * height) - (5 * age_val);

        if (gender === 'female') {
            tmb -= 161;
        } else {
            tmb += 5;
        }

        const tdee = tmb * parseFloat(activityLevel);

        let targetCalories = tdee;
        let goalText = "";
        if (goal === 'lose') { targetCalories -= 500; goalText = "Perder Peso"; }
        else if (goal === 'gain') { targetCalories += 500; goalText = "Ganhar Massa"; }
        else { goalText = "Manter Peso"; }

        const newMealPlan = generateMealPlan(targetCalories, goal);

        onUpdateProfile({
            weight, height, age, gender, activityLevel, goal,
            urgentPart, trainingDays, trainingDuration,
            selectedWeekDays,
            targetCalories: Math.round(targetCalories),
            idealWeight: idealWeight.toFixed(1),
            mealPlan: newMealPlan,
            classification,
            color,
            imc: imc.toFixed(1),
            goalText
        });

        setShowInputs(false);
    };

    const handleDayToggle = (day) => {
        let newDays = [...selectedWeekDays];
        if (newDays.includes(day)) {
            newDays = newDays.filter(d => d !== day);
        } else {
            newDays.push(day);
        }
        setSelectedWeekDays(newDays);
        setTrainingDays(newDays.length || 1);
        onUpdateProfile({ selectedWeekDays: newDays, trainingDays: newDays.length || 1 });
    };

    const generateMealPlan = (calories, currentGoal) => {
        // Calorie Splits
        const s = { b: 0.25, l: 0.35, sn: 0.15, d: 0.25 };

        const k = {
            b: Math.round(calories * s.b),
            l: Math.round(calories * s.l),
            sn: Math.round(calories * s.sn),
            d: Math.round(calories * s.d)
        };

        let title = "Plano Equilibrado";
        if (currentGoal === 'lose') title = "Definição & Queima";
        else if (currentGoal === 'gain') title = "Ganho de Volume";

        return {
            title: title,
            breakfast: getMealSuggestion('breakfast', k.b, currentGoal),
            lunch: getMealSuggestion('lunch', k.l, currentGoal),
            snack: getMealSuggestion('snack', k.sn, currentGoal),
            dinner: getMealSuggestion('dinner', k.d, currentGoal)
        };
    };

    const getMealSuggestion = (type, kcal, mode) => {
        // Base foods
        const proteins = mode === 'gain' ? ['3 Ovos', '150g Frango', '150g Carne Moida', 'Iogurte Protein'] : ['2 Claras + 1 Ovo', '120g Frango', '120g Peixe', 'Iogurte Natural'];
        const carbs = mode === 'gain' ? ['3 fatias Pão', '200g Arroz', '200g Macarrão', 'Aveia + Granola'] : ['1 fatia Pão Integral', '100g Arroz/Batata', 'Legumes a vontade', 'Aveia'];
        const fats = mode === 'gain' ? ['Pasta de Amendoim', 'Azeite', 'Abacate', 'Queijo Amarelo'] : ['Azeite (fio)', 'Castanhas (poucas)', 'Abacate (fatia)', 'Queijo Cotagge'];

        // Logic based on Kcal slots
        if (type === 'breakfast') {
            if (kcal < 350) return `Omelete (${proteins[0]}) + Café s/ açúcar + ${carbs[2]}`; // Low
            if (kcal < 550) return `${proteins[0]} mexidos + ${carbs[0]} + Café com leite + Fruta`; // Mid
            return `${proteins[0]} + ${carbs[0]} + ${fats[0]} + Vitamina de frutas`; // High
        }

        if (type === 'lunch') {
            if (kcal < 450) return `Salada Verde Grande + ${proteins[1]} + ${carbs[1]} + Azeite`;
            if (kcal < 700) return `${proteins[1]} + ${carbs[1]} + Feijão + Legumes variados`;
            return `${proteins[2]} ou ${proteins[1]} + ${carbs[1]} (dobro) + Feijão + Legumes + Azeite`;
        }

        if (type === 'snack') {
            if (kcal < 200) return `Fruta (Maçã/Pera) + Chá ou Água`;
            if (kcal < 400) return `${proteins[3]} + ${carbs[3]} ou Fruta`;
            return `Sanduíche natural (${proteins[1]}) ou Shake Hipercalórico`;
        }

        if (type === 'dinner') {
            if (kcal < 350) return `Sopa de Legumes com ${proteins[1]} ou Omelete`;
            if (kcal < 600) return `${proteins[1]} grelhado + ${carbs[1]} + Salada`;
            return `${proteins[2]} + ${carbs[1]} + Salada com ${fats[2]}`;
        }

        return "Opção balanceada conforme macros.";
    };

    // Helper for days UI
    const weekMap = [
        { key: 'dom', label: 'D' },
        { key: 'seg', label: 'S' },
        { key: 'ter', label: 'T' },
        { key: 'qua', label: 'Q' },
        { key: 'qui', label: 'Q' },
        { key: 'sex', label: 'S' },
        { key: 'sab', label: 'S' }
    ];

    return (
        <section className="container" style={{ paddingTop: '2rem', maxWidth: '800px', paddingBottom: '4rem' }}>
            <h2 className="section-title">Planejamento <span className="title-gradient">Nutricional</span></h2>

            {showInputs ? (
                <div className="card animate-fade-in" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="input-group">
                            <label>Peso (kg)</label>
                            <input type="number" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Altura (cm)</label>
                            <input type="number" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Idade</label>
                            <input type="number" placeholder="25" value={age} onChange={(e) => setAge(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Gênero</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value)}>
                                <option value="male">Masculino</option>
                                <option value="female">Feminino</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-row-diet">
                        <div className="input-group">
                            <label>Nível de Atividade</label>
                            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                                <option value="1.2">Sedentário (Pouco exercício)</option>
                                <option value="1.375">Leve (1-3 dias)</option>
                                <option value="1.55">Moderado (3-5 dias)</option>
                                <option value="1.725">Intenso (6-7 dias)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Objetivo</label>
                            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                                <option value="lose">Perder Peso</option>
                                <option value="maintain">Manter Peso</option>
                                <option value="gain">Ganhar Massa</option>
                            </select>
                        </div>
                    </div>

                    <button className="btn-primary" style={{ width: '100%' }} onClick={calculateMetrics}>
                        Gerar Meu Plano Completo
                    </button>
                </div>
            ) : (
                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                    <button
                        className="" // Reset default class to override manually or create a new class
                        style={{
                            fontSize: '1rem',
                            padding: '10px 24px',
                            background: 'transparent',
                            border: '2px solid var(--color-primary)',
                            color: 'var(--color-primary)',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'var(--color-primary)';
                            e.target.style.color = '#000';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = 'var(--color-primary)';
                        }}
                        onClick={() => setShowInputs(true)}
                    >
                        ↻ Recalcular Dieta
                    </button>
                </div>
            )}

            {profile.mealPlan && (
                <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ textAlign: 'center', borderColor: profile.color }}>
                            <div className="label-sm">SEU IMC</div>
                            <div className="result-xl" style={{ color: profile.color }}>{profile.imc}</div>
                            <div className="result-sub" style={{ color: profile.color }}>{profile.classification}</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div className="label-sm">PESO IDEAL (MÉDIA)</div>
                            <div className="result-xl">{profile.idealWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                            <div className="result-sub">Baseado em sua altura</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', background: 'rgba(0, 240, 255, 0.05)', borderColor: 'var(--color-primary)' }}>
                            <div className="label-sm">META DIÁRIA</div>
                            <div className="result-xl" style={{ color: 'var(--color-primary)' }}>{profile.targetCalories}</div>
                            <div className="result-sub">Kcal para {profile.goalText}</div>
                        </div>
                    </div>

                    <div className="card" style={{ position: 'relative', overflow: 'hidden', marginBottom: '2rem' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--gradient-main)' }}></div>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Cardápio: <span className="title-gradient">{profile.mealPlan.title}</span></h3>
                        <div className="meal-grid">
                            <MealItem time="Café da Manhã" content={profile.mealPlan.breakfast} />
                            <MealItem time="Almoço" content={profile.mealPlan.lunch} />
                            <MealItem time="Lanche da Tarde" content={profile.mealPlan.snack} />
                            <MealItem time="Jantar" content={profile.mealPlan.dinner} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }}>
                        {/* Configurações de Treino */}
                        <div className="card" style={{ border: '1px solid var(--color-primary)', background: 'rgba(0, 240, 255, 0.02)', gridColumn: '1 / -1' }}>
                            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Foco & Ritmo</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                <div className="input-group">
                                    <label>Foco Muscular</label>
                                    <select value={urgentPart} onChange={(e) => { setUrgentPart(e.target.value); onUpdateProfile({ urgentPart: e.target.value }); }}>
                                        <option value="corpo todo">Corpo Todo</option>
                                        <option value="braço">Braços & Peito</option>
                                        <option value="perna">Pernas & Glúteos</option>
                                        <option value="abdomen">Abdômen & Core</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Dias de Treino ({trainingDays})</label>
                                    {(() => {
                                        // Logic to Lock Schedule
                                        // 1. Get current week dates
                                        const curr = new Date();
                                        const first = curr.getDate() - curr.getDay(); // Sunday
                                        const weekDates = [];
                                        const weekKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

                                        for (let i = 0; i < 7; i++) {
                                            let day = new Date(curr);
                                            day.setDate(first + i);
                                            weekDates.push({
                                                dateStr: day.toISOString().split('T')[0],
                                                dayKey: weekKeys[i]
                                            });
                                        }

                                        // 2. Check scheduled vs done
                                        const scheduledDays = selectedWeekDays || []; // e.g. ['seg', 'qua']
                                        let doneCount = 0;
                                        let scheduledButNotDoneCount = 0;
                                        let hasStartedWeek = false;

                                        weekDates.forEach(d => {
                                            // If this day is in schedule
                                            if (scheduledDays.includes(d.dayKey)) {
                                                const status = (profile.workoutHistory || {})[d.dateStr];
                                                if (status === 'done') {
                                                    doneCount++;
                                                    hasStartedWeek = true;
                                                } else {
                                                    scheduledButNotDoneCount++;
                                                }
                                            }
                                        });

                                        // Lock if started but not finished everything
                                        // If doneCount == 0, not started -> Unlocked
                                        // If scheduledButNotDoneCount == 0, finished all -> Unlocked
                                        const isLocked = (doneCount > 0) && (scheduledButNotDoneCount > 0);

                                        return (
                                            <>
                                                {isLocked && (
                                                    <div style={{ fontSize: '0.75rem', color: '#ffaa00', marginBottom: '4px', fontStyle: 'italic' }}>
                                                        🔒 Complete a semana para alterar
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', opacity: isLocked ? 0.5 : 1 }}>
                                                    {weekMap.map(day => (
                                                        <button
                                                            key={day.key}
                                                            onClick={() => {
                                                                if (isLocked) {
                                                                    alert("Você já começou os treinos desta semana! Complete todos os dias agendados antes de fazer alterações.");
                                                                    return;
                                                                }
                                                                handleDayToggle(day.key);
                                                            }}
                                                            style={{
                                                                width: '40px', height: '40px', borderRadius: '50%',
                                                                border: '1px solid',
                                                                borderColor: selectedWeekDays.includes(day.key) ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                                                background: selectedWeekDays.includes(day.key) ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                color: selectedWeekDays.includes(day.key) ? '#fff' : 'var(--color-text-muted)',
                                                                fontWeight: 'bold', fontSize: '0.9rem',
                                                                cursor: isLocked ? 'not-allowed' : 'pointer', transition: '0.2s',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                        >
                                                            {day.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="input-group">
                                    <label>Duração por Treino</label>
                                    <select value={trainingDuration} onChange={(e) => { setTrainingDuration(e.target.value); onUpdateProfile({ trainingDuration: e.target.value }); }}>
                                        <option value="10">10 min</option>
                                        <option value="15">15 min</option>
                                        <option value="20">20 min</option>
                                        <option value="30">30 min</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                 .input-group { display: flex; flex-direction: column; gap: 0.5rem; }
                 .input-group label { color: var(--color-text-muted); font-size: 0.9rem; font-weight: 500; }
                 .input-group input, .input-group select { 
                     background: rgba(255,255,255,0.05); 
                     border: 1px solid rgba(255,255,255,0.1); 
                     padding: 12px; 
                     border-radius: var(--radius-sm); 
                     color: white; 
                     font-size: 1rem; 
                     outline: none;
                 }
                 .input-group input:focus, .input-group select:focus { border-color: var(--color-primary); }
                 .input-group select option { background: #151518; }
                 
                 .label-sm { font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px; }
                 .result-xl { font-size: 2.2rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; }
                 @media (max-width: 480px) { .result-xl { font-size: 1.8rem; } }
                 .result-sub { font-size: 0.85rem; opacity: 0.8; }
                 .meal-grid { display: grid; gap: 0.8rem; }
                 .meal-item-box { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
                 .meal-time { min-width: 100px; color: var(--color-primary); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
                 .meal-content { color: var(--color-text-main); font-size: 0.95rem; line-height: 1.4; }
                 
                 @media (max-width: 600px) {
                    .meal-item-box { flex-direction: column; gap: 0.4rem; }
                    .meal-time { min-width: auto; }
                 }
            `}</style>
        </section>
    );
};

const MealItem = ({ time, content }) => (
    <div className="meal-item-box">
        <div className="meal-time">{time}</div>
        <div className="meal-content">{content}</div>
    </div>
);

export default DietSection;
