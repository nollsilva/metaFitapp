import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';

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

const TARGET_USER_NAME = "Ranna";
const XP_TO_ADD = 350;

const addXp = async () => {
    console.log(`Searching for user: ${TARGET_USER_NAME}...`);
    const snapshot = await getDocs(collection(db, "users"));

    let targetDoc = null;
    snapshot.forEach(d => {
        const data = d.data();
        if (data.name && data.name.toLowerCase() === TARGET_USER_NAME.toLowerCase()) {
            targetDoc = d;
        }
    });

    if (!targetDoc) {
        console.error(`User '${TARGET_USER_NAME}' not found!`);
        process.exit(1);
    }

    const data = targetDoc.data();
    console.log(`User found: ${data.name}`);
    console.log(`Ref Path: ${targetDoc.ref.path}`);
    console.log(`ID: ${targetDoc.id}`);

    const currentXp = data.xp || 0;
    const newXp = currentXp + XP_TO_ADD;

    console.log(`Current XP: ${currentXp}`);
    console.log(`Adding ${XP_TO_ADD} XP...`);
    console.log(`New XP: ${newXp}`);

    const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: XP_TO_ADD,
        reason: "Bônus Manual (Admin)",
        type: 'gain'
    };

    try {
        // Use the reference directly from the snapshot
        await updateDoc(targetDoc.ref, {
            xp: newXp,
            xpHistory: arrayUnion(historyEntry)
        });
        console.log("XP and History Updated Successfully!");
    } catch (e) {
        console.error("Error updating doc:", e);
        // If this fails, it's definitively permissions or strict database weirdness
    }

    process.exit(0);
};

addXp().catch(e => {
    console.error(e);
    process.exit(1);
});
