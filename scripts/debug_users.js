import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDK4jus-gIfISwLuT-3IEGz_GSLjfVAkzU",
    authDomain: "metafit-6b64a.firebaseapp.com",
    projectId: "metafit-6b64a",
    storageBucket: "metafit-6b64a.firebasestorage.app",
    messagingSenderId: "796870877553",
    appId: "1:796870877553:web:778072489dd3c6361d16d0",
    measurementId: "G-PR1HLKP2JY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listUsers = async () => {
    console.log("Fetching all users to find Wislen variants...");
    const snapshot = await getDocs(collection(db, "users"));
    snapshot.forEach(doc => {
        const name = doc.data().name;
        if (name && name.toLowerCase().includes('wislen')) {
            console.log(`Found: "${name}" (ID: ${doc.id})`);
        }
    });
    process.exit(0);
};

listUsers().catch(console.error);
