import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

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

const deductXp = async () => {
    console.log("Searching for user 'root'...");

    // Search by name "root" (exact match first?) or just contains?
    // Let's look for exact match or close call.
    // Since names might be "Root", "root", etc., I'll fetch all and filter or query.
    // Query is better.

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    let targetUser = null;

    // Find case-insensitive "Noll Silva"
    let matches = [];
    snapshot.forEach(d => {
        const name = d.data().name || "";
        if (name.toLowerCase().includes('noll silva')) {
            matches.push({ id: d.id, ...d.data() });
        }
    });

    if (matches.length === 0) {
        console.error("No user found with name containing 'Noll Silva'.");
        console.log("Listing first 10 users for reference:");
        snapshot.docs.slice(0, 10).forEach(d => console.log(`- ${d.data().name} (${d.id})`));
        process.exit(1);
    }

    if (matches.length > 1) {
        console.log("Multiple users found:");
        matches.forEach(m => console.log(`- ${m.name} (${m.id}) | XP: ${m.xp}`));
        console.log("Please specify which user.");
        process.exit(1); // Safety stop
    }

    targetUser = matches[0];

    const currentXp = targetUser.xp || 0;
    const newXp = Math.max(0, currentXp - 112);
    const newLevel = calculateLevel(newXp);


    console.log(`User Found: "${targetUser.name}" (ID: "${targetUser.id}")`);
    console.log(`Current XP: ${currentXp} | Level: ${targetUser.level}`);
    console.log(`Deducting 112 XP...`);
    console.log(`New XP: ${newXp} | New Level: ${newLevel}`);

    try {
        // Using setDoc with merge match true to avoid NOT_FOUND issues if the doc "doesn't exist" in a weird way
        await setDoc(doc(db, "users", targetUser.id), {
            xp: newXp,
            level: newLevel
        }, { merge: true });
        console.log("Update successful!");
    } catch (e) {
        console.error("Error updating user:", e);
    }

    process.exit(0);
};

deductXp().catch(console.error);
