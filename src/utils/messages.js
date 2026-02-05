/**
 * Central de Mensagens da Aplicação
 * Edite os textos abaixo para alterar as notificações que aparecem na tela.
 */
export const MESSAGES = {
    XP: {
        LOST_STREAK: (penalty, days) => `Você perdeu ${penalty} XP por perder ${days} dia(s) de treino! 😢`,
        LEVEL_UP: (level) => `PARABÉNS! VOCÊ SUBIU DE NÍVEL! AGORA VOCÊ É NÍVEL ${level} 🚀`,
        GAIN_DEFAULT: (xp) => `PARABÉNS! Exercício concluído! +${xp} XP`,
        GAIN_DAILY: (xp) => `Parabéns! Treino do dia concluído! +${xp} XP`
    },
    WORKOUT: {
        FINISHED_EXERCISE: "Exercício finalizado! ✓",
    },
    WATER: {
        REMINDER: "Hidrate-se! 💧 Tome um copo de água agora.",
    },
    MEAL: {
        REMINDER: "Hora da refeição! 🍽 Não pule sua dieta.",
    },
    ACCOUNT: {
        DELETE_SUCCESS: "Conta excluída com sucesso. Sentiremos sua falta! 😢",
        DELETE_SECURITY_ERROR: "⚠️ Por segurança, faça Logout e Login novamente para excluir.",
        DELETE_ERROR: (error) => `Erro ao excluir conta: ${error}`
    }
};
