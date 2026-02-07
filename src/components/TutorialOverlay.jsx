
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TutorialCard from './TutorialCard';

const cardsContent = [
    {
        step: 1,
        title: "Perfil & Biometria 🎯",
        text: "Cadastre Peso e Altura para calcular seu IMC automaticamente (Perfil). Defina seu Objetivo para personalizar sua jornada."
    },
    {
        step: 2,
        title: "Ganhe XP & Rank 🚀",
        text: "Treine, Corra e convide amigos (+100 XP!). Suba no Rank Global e desbloqueie novas Ligas com recompensas exclusivas."
    },
    {
        step: 3,
        title: "Treino & Evolução 💪",
        text: "Siga o Timer nos treinos diários. Cada exercício concluído gera XP e melhora os atributos reais do seu avatar (Força, Velocidade)."
    },
    {
        step: 4,
        title: "Modo Corrida 🏃",
        text: "Rastreie suas corridas com GPS. Acompanhe ritmo, distância e controle sua música sem sair da tela, tudo em um layout otimizado."
    },
    {
        step: 5,
        title: "Batalhas PvP ⚔️",
        text: "Use seus atributos reais (conquistados nos treinos) para desafiar amigos em duelos de estratégia! Vença para roubar pontos."
    },
    {
        step: 6, // Added extra step for App install if needed, or keep 5. Let's keep the "Pro Tip" as 6 if user wants, but I'll stick to 5 relevant ones + the Pro Tip from before if it fits, or replace one. 
        // The previous had 5. Let's make it 6 to include the App Install tip which is valuable.
        title: "Dica Pro 📲",
        text: "Instale o App (Adicionar à Tela de Início) para ter a melhor performance, acesso offline e receber lembretes!"
    }
];

const totalSteps = cardsContent.length;

const TutorialOverlay = ({ onComplete }) => {
    const [stage, setStage] = useState('intro'); // 'intro' | 'cards'
    const [cards, setCards] = useState(cardsContent);

    useEffect(() => {
        // Stage transition from intro to cards logic handled by animation variants or timeouts
        const timer = setTimeout(() => {
            setStage('cards');
        }, 3500); // 3.5s total intro duration

        return () => clearTimeout(timer);
    }, []);

    const handleCardSwipe = (index) => {
        const newCards = [...cards];
        newCards.shift(); // Remove top card
        setCards(newCards);

        if (newCards.length === 0) {
            onComplete();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#000', // Start dark
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            perspective: '1000px'
        }}>
            <AnimatePresence>
                {stage === 'intro' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotateX: 45 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1.2, 1.2, 5],
                            rotateX: [45, 0, 0, -20],
                            z: [0, 0, 0, 500]
                        }}
                        transition={{
                            duration: 3,
                            times: [0, 0.4, 0.7, 1],
                            ease: "easeInOut"
                        }}
                        style={{
                            fontSize: '4rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            background: 'linear-gradient(to right, #FF0055, #FF5500, #FF0055)',
                            backgroundSize: '200% auto',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    >
                        MetaFit
                    </motion.div>
                )}
            </AnimatePresence>

            {stage === 'cards' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{ position: 'relative', width: '320px', height: '480px' }}>
                        <AnimatePresence>
                            {cards.map((card, index) => {
                                // Calculate a random-ish but deterministic rotation based on index/title
                                const randomRotate = (index % 2 === 0 ? 1 : -1) * (Math.random() * 4 + 2);

                                return (
                                    <TutorialCard
                                        key={card.title}
                                        index={index}
                                        totalInStack={cards.length}
                                        totalSteps={totalSteps}
                                        content={card}
                                        onSwipe={() => handleCardSwipe(index)}
                                        randomRotate={randomRotate}
                                    />
                                )
                            })}
                        </AnimatePresence>
                        {cards.length === 0 && (
                            <div style={{ color: 'white', textAlign: 'center' }}>Carregando...</div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default TutorialOverlay;
