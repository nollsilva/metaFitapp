import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID_WELCOME = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const TEMPLATE_ID_RANK = import.meta.env.VITE_EMAILJS_RANK_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const sendEmail = async (templateParams) => {
    // Default to Welcome ID if not specified, but ideally should be passed
    const specificTemplateId = templateParams._templateId || TEMPLATE_ID_WELCOME;

    // Remove internal flag before sending
    const paramsToSend = { ...templateParams };
    delete paramsToSend._templateId;

    if (!SERVICE_ID || !specificTemplateId || !PUBLIC_KEY) {
        console.warn("EmailJS not configured.");
        return { error: "EmailJS credentials missing." };
    }

    try {
        const response = await emailjs.send(SERVICE_ID, specificTemplateId, paramsToSend, PUBLIC_KEY);
        console.log('SUCCESS!', response.status, response.text);
        return { success: true };
    } catch (err) {
        console.error('FAILED...', err);
        return { error: err.text || "Failed to send email." };
    }
};

export const sendWelcomeEmail = async (user) => {
    return sendEmail({
        to_name: user.name || user.userName || "Atleta",
        to_email: user.email,
        message: "Bem-vindo ao MetaFit! Vamos transformar seu corpo e mente."
    });
};

export const sendRankUpEmail = async (user, newRank, medalImage) => {
    const baseUrl = window.location.origin;
    const fullImageUrl = `${baseUrl}${medalImage}`;

    return sendEmail({
        name: user.name || user.userName || "Atleta", // Matches {{name}}
        to_email: user.email,
        ranking: newRank,       // Matches {{ranking}}
        image_url: fullImageUrl, // Matches {{image_url}}
        message: `Parabéns! Você alcançou o elo ${newRank}!`,
        _templateId: TEMPLATE_ID_RANK // Use Rank Template
    });
};
