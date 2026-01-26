
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TutorialCard from './TutorialCard';

const cardsContent = [
    {
        step: 1,
        title: "Instruções",
        text: "Bem-vindo ao tutorial! Este é um baralho interativo. Para avançar, arraste esta carta para fora da tela em qualquer direção."
    },
    {
        step: 2,
        title: "Bem-vindo",
        text: "O MetaFit é sua central completa para atingir o corpo dos sonhos. Vamos de mostrar rapidamente como tudo funciona!"
    },
    {
        step: 3,
        title: "Dieta: O Início",
        text: "Na aba 'Dieta', nossa IA calcula exatamente o que você precisa comer com base no seu objetivo (perder peso, ganhar massa ou manter)."
    },
    {
        step: 4,
        title: "Dieta: Refeições",
        text: "Você receberá um plano de refeições personalizado. Siga os macros e calorias sugeridos para maximizar seus resultados."
    },
    {
        step: 5,
        title: "Treino: Ação",
        text: "Na aba 'Treino', selecione exercícios interativos. Use nosso Timer inteligente que controla suas séries e descansos automaticamente."
    },
    {
        step: 6,
        title: "Treino: XP",
        text: "Cada treino completado gera XP. Treine consistentemente para subir de nível e desbloquear novas conquistas!"
    },
    {
        step: 7,
        text: "Compare seu nível com amigos e outros usuários no Ranking. Mantenha a consistência para chegar ao topo da liga!"
    },
    {
        step: 8,
        title: "Editar Perfil",
        text: "Para mudar seu Avatar, Nome ou Email, basta clicar na sua foto de perfil na aba 'Perfil'. Personalize sua experiência!"
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
