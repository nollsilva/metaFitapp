import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("Inicializando Firebase com config:", {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? "DEFINIDA (Oculta)" : "INDEFINIDA"
});

let app;
let auth;
let db;
let storage;
let messaging = null;

try {
    if (!firebaseConfig.apiKey) {
        throw new Error("VITE_FIREBASE_API_KEY não encontrada no .env");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Safely initialize messaging only in supported environments (browser)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
        } catch (e) {
            console.warn("Firebase Messaging failed to initialize (pode ser normal em ambientes sem HTTPS ou local):", e);
        }
    }

} catch (e) {
    console.error("ERRO CRÍTICO NA INICIALIZAÇÃO DO FIREBASE:", e);
    // Não re-lançamos o erro para permitir que o ErrorBoundary do React ou o handler do index.html capturem ou mostrem UI alternativa
    // Mas se app não for criado, exports abaixo falharão se usados antes da verificação.
}

// Defensive exports
const exportAuth = auth;
const exportDb = db;
const exportStorage = storage;
const exportMessaging = messaging;

export { exportAuth as auth, exportDb as db, exportStorage as storage, exportMessaging as messaging };
export default app;
