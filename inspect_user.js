import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

const inspect = async () => {
    // Noll Silva UID from previous logs
    const uid = "slpQeEZSCSZv1VEplt1afwsVnJ02";

    try {
        const d = await getDoc(doc(db, "users", uid));
        if (d.exists()) {
            const data = d.data();
            console.log("Name:", data.name);
            console.log("Friends:", data.friends);
            console.log("friendRequests:", JSON.stringify(data.friendRequests, null, 2));
            console.log("friendRequestsAccepted:", JSON.stringify(data.friendRequestsAccepted, null, 2));
        } else {
            console.log("Doc not found");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit();
};

inspect();
