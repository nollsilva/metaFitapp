import React, { useEffect } from 'react';
import { MESSAGES } from '../utils/messages';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Helper simples para adicionar notificação ao histórico do usuário no Firestore
const addToHistory = async (uid, title, body, icon) => {
    try {
        await addDoc(collection(db, "users", uid, "notifications"), {
            title,
            body,
            icon,
            read: false,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Erro ao salvar notificação no histórico:", e);
    }
};

// Helper para enviar notificação nativa do sistema (Pop-up)
const sendSystemNotification = (title, body) => {
    if (!("Notification" in window)) {
        console.log("Este navegador não suporta notificações de sistema.");
        return;
    }

    if (Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: body,
                icon: '/logo.png', // Tenta usar o logo se existir
                requireInteraction: false,
                silent: false
            });
        } catch (e) {
            console.error("Erro ao enviar notificação de sistema:", e);
        }
    }
};

const NotificationSystem = ({ profile, onShowNotification }) => {
    useEffect(() => {
        if (!profile || !profile.isLoggedIn || !profile.uid) return;

        const isDev = import.meta.env.DEV; // Detecta ambiente de desenvolvimento (local)

        // Intervalo de verificação: 
        // Em Dev (Local): a cada 1 segundo para garantir que pegamos o segundo exato (:00, :10, etc)
        // Em Prod: a cada 60 segundos
        const intervalTime = isDev ? 1000 : 60000;

        if (isDev) {
            console.log("NotificationSystem: Iniciado em modo DEV (Check a cada 1s)");
        }

        const interval = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const settings = profile.notificationSettings || {};

            // --- MODO DE TESTE (Apenas Local) ---
            if (isDev) {
                // Alterna mensagens baseado nos segundos
                // Checamos se o segundo é multiplo de 10 (10, 20, 30...)
                if (seconds % 30 === 0) {
                    if (settings.water && seconds < 30) {
                        const msg = MESSAGES.WATER.REMINDER + " (Teste Local 💧)";
                        console.log("Disparando Teste Água...");
                        onShowNotification(msg);
                        sendSystemNotification("MetaFit - Hidratação", MESSAGES.WATER.REMINDER);
                    }
                    else if (settings.meal && seconds >= 30) {
                        const msg = MESSAGES.MEAL.REMINDER + " (Teste Local 🍽)";
                        console.log("Disparando Teste Comida...");
                        onShowNotification(msg);
                        sendSystemNotification("MetaFit - Alimentação", MESSAGES.MEAL.REMINDER);
                    }
                }
                return; // Impede execução da lógica real em dev para evitar duplicidade
            }


            // --- LÓGICA REAL (Produção) ---

            // Verificação de Água (A cada 2 horas, entre 8h e 22h, se minuto for 0)
            if (settings.water) {
                // Exemplo: 8:00, 10:00, 12:00... ate 22:00
                if (minutes === 0 && hours >= 8 && hours <= 22 && hours % 2 === 0) {
                    const msg = MESSAGES.WATER.REMINDER;
                    onShowNotification(msg);
                    sendSystemNotification("MetaFit - Hidratação", msg);
                    // Opcional: Salvar no histórico para persistencia
                    // addToHistory(profile.uid, "Hidratação", msg, "💧");
                }
            }

            // Verificação de Refeição (Horários fixos: 8h, 12h, 15h, 19h)
            if (settings.meal) {
                if (minutes === 0) {
                    if (hours === 8 || hours === 12 || hours === 15 || hours === 19) {
                        const msg = MESSAGES.MEAL.REMINDER;
                        onShowNotification(msg);
                        sendSystemNotification("MetaFit - Alimentação", msg);
                    }
                }
            }

        }, intervalTime);

        return () => clearInterval(interval);
    }, [profile, onShowNotification]);

    return null; // Componente lógico, não renderiza nada visual
};

export default NotificationSystem;
