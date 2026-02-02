import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDK4jus-gIfISwLuT-3IEGz_GSLjfVAkzU",
    authDomain: "metafit-6b64a.firebaseapp.com",
    projectId: "metafit-6b64a",
    storageBucket: "metafit-6b64a.firebasestorage.app",
    messagingSenderId: "796870877553",
    appId: "1:796870877553:web:778072489dd3c6361d16d0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const usersToUpdate = ["Wislen", "Wislentz"];

async function runUpdates() {
    console.log("Starting user updates...");

    for (const name of usersToUpdate) {
        try {
            const q = query(collection(db, "users"), where("name", "==", name));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log(`User "${name}" not found.`);
                continue;
            }

            for (const userDoc of snapshot.docs) {
                const data = userDoc.data();
                const uid = userDoc.id;
                const currentAttrs = data.attributes || { strength: 0, speed: 0, defense: 0, points: 0 };

                const newAttrs = {
                    ...currentAttrs,
                    strength: Math.max(0, (currentAttrs.strength || 0) - 7),
                    speed: Math.max(0, (currentAttrs.speed || 0) - 11)
                };

                console.log(`Updating ${name} (${uid}):`, {
                    from: { strength: currentAttrs.strength, speed: currentAttrs.speed },
                    to: { strength: newAttrs.strength, speed: newAttrs.speed }
                });

                await updateDoc(doc(db, "users", uid), {
                    attributes: newAttrs
                });
                console.log(`Successfully updated ${name}.`);
            }
        } catch (e) {
            console.error(`Error updating ${name}:`, e);
        }
    }
    process.exit(0);
}

runUpdates();
