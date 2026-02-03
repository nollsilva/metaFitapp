
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pages = [
    {
        emoji: "🧠",
        title: "Estratégia é Tudo",
        text: "O Duelo dura 3 turnos. Você distribui seus pontos de Atributos a cada turno. Não existe sorte pura, existe mente fria."
    },
    {
        emoji: "📉",
        title: "Eficiência Decrescente",
        text: "Apostar tudo em um atributo é ruim! \n• 1-3 pts: 100% força \n• 4-6 pts: 85% força \n• 7+ pts: 65% força. \nDistribua com sabedoria."
    },
    {
        emoji: "😫",
        title: "Cuidado com a Fadiga",
        text: "Se você usar muitos pontos (4+) no mesmo atributo, ele ficará 'Cansado' no próximo turno (-30% de força). Varie seus ataques!"
    },
    {
        emoji: "🛡️",
        title: "Defesa e Iniciativa",
        text: "Velocidade define quem ataca primeiro.\nDefesa reduz dano, mas o contra-ataque é fraco. Use defesa para sobreviver, não para matar."
    }
];

const DuelTutorialOverlay = ({ onComplete }) => {
    const [index, setIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleNext = () => {
        if (index < pages.length - 1) {
            setIndex(index + 1);
        } else {
            onComplete(dontShowAgain);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '30px', borderRadius: '20px', border: '1px solid #00f0ff',
                maxWidth: '400px', width: '100%', textAlign: 'center',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
            }}>
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{pages[index].emoji}</div>
                        <h2 style={{ color: '#00f0ff', marginBottom: '15px', textTransform: 'uppercase' }}>
                            {pages[index].title}
                        </h2>
                        <p style={{ color: '#ddd', lineHeight: '1.6', whiteSpace: 'pre-line', marginBottom: '30px' }}>
                            {pages[index].text}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginBottom: '20px' }}>
                    {pages.map((_, i) => (
                        <div key={i} style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: i === index ? '#00f0ff' : '#444'
                        }}></div>
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    style={{
                        background: index === pages.length - 1 ? 'linear-gradient(90deg, #ff0055, #ff5500)' : 'var(--color-primary)',
                        border: 'none',
                        padding: '15px 40px', borderRadius: '30px',
                        color: index === pages.length - 1 ? '#fff' : '#000',
                        fontWeight: 'bold', fontSize: '1.1rem',
                        cursor: 'pointer', width: '100%',
                        boxShadow: index === pages.length - 1 ? '0 0 20px rgba(255, 0, 85, 0.5)' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {index === pages.length - 1 ? "ENTRAR NO DUELO ⚔️" : "PRÓXIMO ➔"}
                </button>

                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#888', fontSize: '0.9rem' }}>
                    <input
                        type="checkbox"
                        id="dontShowDuelTutorial"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00f0ff' }}
                    />
                    <label htmlFor="dontShowDuelTutorial" style={{ cursor: 'pointer', userSelect: 'none' }}>
                        Não mostrar este tutorial novamente
                    </label>
                </div>
            </div>
        </div>
    );
};

export default DuelTutorialOverlay;
