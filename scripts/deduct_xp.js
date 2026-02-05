import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

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

const deductXp = async () => {
    console.log("Searching for Noll Silva...");
    const snapshot = await getDocs(collection(db, "users"));

    let targetUser = null;
    snapshot.forEach(d => {
        const data = d.data();
        if (data.name === "Noll Silva") {
            targetUser = { id: d.id, ...data };
        }
    });

    if (!targetUser) {
        console.error("User 'Noll Silva' not found!");
        process.exit(1);
    }

    const currentXp = targetUser.xp || 0;
    const newXp = Math.max(0, currentXp - 113); // Prevent negative XP

    console.log(`User found: ${targetUser.name} (ID: ${targetUser.id})`);
    console.log(`Current XP: ${currentXp}`);
    console.log(`Deducting 113 XP...`);
    console.log(`New XP: ${newXp}`);

    const userRef = doc(db, "users", targetUser.id);
    await updateDoc(userRef, {
        xp: newXp
    });

    // Also add a history entry so it's transparent
    // We need to fetch current history first to be safe or just prepend?
    // Firestore arrayUnion/Remove is tricky with objects, better to read-update-write if we have the full object, 
    // but here we just updated XP. Ideally we push to history too.
    // Let's just update the XP for now as requested.

    console.log("XP Updated Successfully!");
    process.exit(0);
};

deductXp().catch(e => {
    console.error(e);
    process.exit(1);
});
