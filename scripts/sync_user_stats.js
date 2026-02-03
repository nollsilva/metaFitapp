import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

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

const updateStats = async () => {
    const usersToUpdate = ['Wislentz']; // Corrected name
    const targetStats = {
        strength: 12,
        speed: 5,
        defense: 7
    };

    for (const name of usersToUpdate) {
        console.log(`Searching for user: ${name}...`);
        const q = query(collection(db, "users"), where("name", "==", name));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`User ${name} not found.`);
            continue;
        }

        for (const doc of snapshot.docs) {
            await updateDoc(doc.ref, {
                attributes: targetStats
            });
            console.log(`Successfully updated ${name}!`);
        }
    }
    process.exit(0);
};

updateStats().catch(err => {
    console.error("Error updating stats:", err);
    process.exit(1);
});
