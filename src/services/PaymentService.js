/**
 * Service to handle Manual Stripe Payment Links.
 * Strategy: Redirect user to a pre-configured Stripe Payment Link.
 * The VIP activation must be done MANUALLY by the admin usually, 
 * or we can implement a "Claim Code" system later.
 */
export const PaymentService = {
    /**
     * Redirects to a Stripe Payment Link.
     * @param {string} paymentUrl - The Stripe Link URL (e.g., https://buy.stripe.com/...)
     */
    processPayment: async (paymentUrl) => {
        if (!paymentUrl || !paymentUrl.startsWith('http')) {
            console.error("Invalid Payment URL:", paymentUrl);
            return { success: false, error: "Link de pagamento inválido." };
        }

        console.log(`[PaymentService] Redirecting to: ${paymentUrl}`);

        // Redirect logic
        window.open(paymentUrl, '_blank');

        // Return "success" so the UI stops loading, but we don't activate VIP automatically yet.
        return { success: true, redirecting: true, manual: true };
    }
};
