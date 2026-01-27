import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const sendEmail = async (templateParams) => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn("EmailJS not configured.");
        return { error: "EmailJS credentials missing." };
    }

    try {
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
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
