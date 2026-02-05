
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Manual .env parsing since dotenv is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

const envConfig = {};
try {
    const data = fs.readFileSync(envPath, 'utf8');
    data.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envConfig[key.trim()] = value.trim();
        }
    });
} catch (err) {
    console.error("Error reading .env file:", err);
}

const firebaseConfig = {
    apiKey: envConfig.VITE_FIREBASE_API_KEY,
    authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
    storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: envConfig.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const calculateLevel = (xp) => {
    if (xp < 1000) return 0;
    return Math.floor((xp - 1) / 1000);
};

const main = async () => {
    console.log("Starting correction...");

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    let nollFound = false;
    let jdFound = false;

    for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        const name = (data.name || data.userName || "").toLowerCase();

        // 1. Deduct XP from Noll Silva
        if (name.includes("noll silva")) {
            console.log(`Found Noll Silva: ${data.name} (ID: ${userDoc.id}) | Current XP: ${data.xp}`);
            nollFound = true;

            const newXp = Math.max(0, (data.xp || 0) - 112);
            const newLevel = calculateLevel(newXp);

            await updateDoc(doc(db, "users", userDoc.id), {
                xp: newXp,
                level: newLevel
            });
            console.log(`✅ Deducted 112 XP. New XP: ${newXp}, New Level: ${newLevel}`);
        }

        // 2. Delete "JD" user
        // Checking for "JD" exactly or just "JD" as name if created by mistake
        if (name === "jd" || name === "j d" || (data.name === undefined && data.userName === undefined)) {
            // Be careful not to delete legitimate users with empty names unless sure.
            // The user explicitly said "usuario JD", likely referring to the default avatar "JD" which might be a user with no name.
            // If the previous script created a doc with NO data, it might default to "JD" in UI.

            if (name === "jd") {
                console.log(`Found user 'JD' (ID: ${userDoc.id}). Deleting...`);
                await deleteDoc(doc(db, "users", userDoc.id));
                console.log("✅ Deleted user 'JD'.");
                jdFound = true;
            }
        }
    }

    if (!nollFound) console.log("❌ Noll Silva not found!");
    if (!jdFound) console.log("ℹ️ No user explicitly named 'JD' found. Checking for users with NO name (which appear as JD)...");

    // Double check for empty name users if JD wasn't found by name
    if (!jdFound) {
        for (const userDoc of snapshot.docs) {
            const data = userDoc.data();
            if (!data.name && !data.userName) {
                console.log(`Found user with NO NAME (ID: ${userDoc.id}) - Likely the 'JD' artifact. Deleting...`);
                await deleteDoc(doc(db, "users", userDoc.id));
                console.log("✅ Deleted nameless user.");
            }
        }
    }

    process.exit(0);
};

main();
