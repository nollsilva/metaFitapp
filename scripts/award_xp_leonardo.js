import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';

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

const awardXp = async () => {
    const targetName = "Leonardo Silva";
    console.log(`Searching for user: ${targetName}...`);

    // Case-insensitive search might be safer, but let's try exact first based on user input
    // Collecting potential matches
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    let targetDoc = null;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.trim().toLowerCase() === targetName.toLowerCase()) {
            targetDoc = doc;
        }
    });

    if (!targetDoc) {
        console.log(`User ${targetName} not found.`);
        process.exit(1);
    }

    const userData = targetDoc.data();
    const currentXp = userData.xp || 0;
    const newXp = currentXp + 100;

    // Create history entry
    const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: 100,
        reason: "Bônus Manual: Indicação",
        type: 'gain'
    };

    console.log(`Found ${targetDoc.data().name} (ID: ${targetDoc.id}). Updating XP from ${currentXp} to ${newXp}...`);

    await updateDoc(targetDoc.ref, {
        xp: newXp,
        // Assuming xpHistory is an array, we append. If it doesn't exist, this might fail with arrayUnion if we don't initialize. 
        // But arrayUnion works on undefined fields by creating the array.
        xpHistory: arrayUnion(historyEntry)
    });

    console.log("Success!");
    process.exit(0);
};

awardXp().catch(console.error);
