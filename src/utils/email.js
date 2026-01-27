import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_n15z5s4";
const TEMPLATE_ID_WELCOME = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_lxxboo8";
const TEMPLATE_ID_RANK = import.meta.env.VITE_EMAILJS_RANK_TEMPLATE_ID || "template_6lncata";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "E36tvH90s8DMTLSyZ";

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

// Imgur hosting for email compatibility (Localhost images don't load in emails)
const BADGE_IMAGE_MAP = {
    '/badges/badge_bronze_2.png': 'https://i.imgur.com/JPOq7rs.png',
    '/badges/badge_bronze_3.png': 'https://i.imgur.com/AE4w4rC.png',
    '/badges/badge_praticante.png': 'https://i.imgur.com/5MHFOUg.png',
    '/badges/badge_silver_2.png': 'https://i.imgur.com/eLzwhz3.png',
    '/badges/badge_silver_3.png': 'https://i.imgur.com/jHziOmK.png',
    '/badges/badge_atleta.png': 'https://i.imgur.com/Ccp15rH.png',
    '/badges/badge_atleta_2.png': 'https://i.imgur.com/s520E4h.png',
    '/badges/badge_atleta_3.png': 'https://i.imgur.com/CDtNe68.png',
    '/badges/badge_elite.png': 'https://i.imgur.com/mT53W36.png',
    '/badges/badge_elite_2.png': 'https://i.imgur.com/aHXEk4r.png',
    '/badges/badge_elite_3.png': 'https://i.imgur.com/xq2U0L0.png',
    '/badges/badge_lenda.png': 'https://i.imgur.com/Swol2qi.png'
};

export const sendRankUpEmail = async (user, newRank, medalImage) => {
    // Check if we have a hosted URL for this image
    let fullImageUrl;
    if (BADGE_IMAGE_MAP[medalImage]) {
        fullImageUrl = BADGE_IMAGE_MAP[medalImage];
    } else {
        // Fallback (will likely break in email if localhost, but works in deployed env)
        const baseUrl = window.location.origin;
        fullImageUrl = `${baseUrl}${medalImage}`;
    }

    return sendEmail({
        name: user.name || user.userName || "Atleta", // Matches {{name}}
        to_email: user.email,
        ranking: newRank,       // Matches {{ranking}}
        image_url: fullImageUrl, // Matches {{image_url}}
        message: `Parabéns! Você alcançou o elo ${newRank}!`,
        _templateId: TEMPLATE_ID_RANK // Use Rank Template
    });
};
