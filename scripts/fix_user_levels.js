import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

const calculateLevel = (xp) => {
    if (!xp || xp <= 1000) return 0;
    return Math.floor((xp - 1) / 1000);
};

const fixLevels = async () => {
    console.log("Starting Level Fix Script...");
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    let updatedCount = 0;

    for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        const currentXp = data.xp || 0;
        const currentLevel = data.level;
        const correctLevel = calculateLevel(currentXp);

        if (currentLevel !== correctLevel) {
            console.log(`Fixing User ${userDoc.id} (${data.name || 'Unknown'}): XP ${currentXp} | Level ${currentLevel} -> ${correctLevel}`);
            try {
                await updateDoc(doc(db, "users", userDoc.id), {
                    level: correctLevel
                });
                updatedCount++;
            } catch (e) {
                console.error(`Failed to update user ${userDoc.id}:`, e);
            }
        }
    }

    console.log(`Done! Updated ${updatedCount} users.`);
    process.exit(0);
};

fixLevels().catch(console.error);
