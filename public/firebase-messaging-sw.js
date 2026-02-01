importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyDK4jus-gIfISwLuT-3IEGz_GSLjfVAkzU",
    // For simplicity in this env, we rely on default or just messagingSenderId if possible, 
    // but usually full config is best. Ideally, we just need messagingSenderId for basic background handling.
    // IMPORTANT: For security, use the values from your project manually or use a build step to inject.
    // Since we are frontend only, we'll try minimal config or rely on the browser logic.
    // Actually, let's use the explicit config to be safe, assuming the user's config from conversations.
    // Re-using the one from their file:
    messagingSenderId: "304675402360",
    projectId: "metafit-app-fc360",
    // We can leave others blank if just for messaging? Usually need apiKey + appId + messagingSenderId.
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // custom icon
        badge: '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
