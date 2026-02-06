import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';

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

const restituteXp = async () => {
    const targetName = "Luan Gym";
    const amountToRestitute = 105; // 7 workouts * 15 XP

    console.log(`Searching for user: ${targetName}...`);

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    let targetDoc = null;
    snapshot.forEach(doc => {
        const data = doc.data();
        // Check both 'name' and 'userName' just in case
        const name = data.name || data.userName || "";
        if (name.trim().toLowerCase() === targetName.toLowerCase()) {
            targetDoc = doc;
        }
    });

    if (!targetDoc) {
        console.log(`User '${targetName}' not found.`);
        process.exit(1);
    }

    const userData = targetDoc.data();
    const currentXp = userData.xp || 0;
    const newXp = currentXp + amountToRestitute;

    // Create history entry
    const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: amountToRestitute,
        reason: "Restituição: 7 Treinos Avulsos (Bug Fix)",
        type: 'gain'
    };

    console.log(`Found ${userData.name} (ID: ${targetDoc.id}).`);
    console.log(`Updating XP from ${currentXp} to ${newXp}...`);

    await updateDoc(targetDoc.ref, {
        xp: newXp,
        xpHistory: arrayUnion(historyEntry)
    });

    console.log("Success! XP restituted.");
    process.exit(0);
};

restituteXp().catch(console.error);
