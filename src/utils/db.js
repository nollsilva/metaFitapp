import { auth, db } from '../lib/firebase';
import { sendWelcomeEmail } from './email';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateAuthProfile,
    deleteUser
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    collection,
    getDocs,
    query,
    where,
    deleteDoc
} from 'firebase/firestore';

// Generate 6-digit ID
export const generateId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (email, password, name) => {
    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Auth Profile
        await updateAuthProfile(user, { displayName: name });

        // 3. Create Firestore Document
        // We use a custom 6-digit ID for "friend code", but the doc ID usually matches Auth UID for security rules.
        // Best practice: Doc ID = Auth UID. Inside doc: `friendCode: 123456`.
        // To find friend by 6-digit ID, we'll need a query.

        let friendCode = generateId();
        // Ideally check uniqueness, but for MVP random collision is rare.
        // For a robust system, you'd query to ensure `friendCode` is unique before assigning.
        // Example:
        // let isUnique = false;
        // while (!isUnique) {
        //     friendCode = generateId();
        //     const q = query(collection(db, "users"), where("id", "==", friendCode));
        //     const snapshot = await getDocs(q);
        //     if (snapshot.empty) {
        //         isUnique = true;
        //     }
        // }

        const newUserProfile = {
            uid: user.uid, // Auth ID
            id: friendCode, // Public Friend Code
            email,
            name,
            xp: 100,
            level: 1,
            friends: [],
            createdAt: new Date().toISOString(),
            // Profile Defaults
            weight: '',
            height: '',
            age: '',
            activityLevel: '1.55',
            goal: 'maintain',
            urgentPart: 'corpo todo',
            trainingDays: 3,
            trainingDuration: 20,
            workoutHistory: {},
            selectedWeekDays: ['seg', 'qua', 'sex'],
            targetCalories: 0,
            idealWeight: 0,
            mealPlan: null,
            classification: '',
            color: '#fff',
        };

        await setDoc(doc(db, "users", user.uid), newUserProfile);

        // Send Welcome Email
        sendWelcomeEmail(newUserProfile).catch(err => console.error("Error sending welcome email:", err));

        return { user: newUserProfile };
    } catch (error) {
        console.error("Register Error:", error);
        let msg = "Erro ao criar conta.";
        if (error.code === 'auth/email-already-in-use') msg = "Email já está em uso.";
        if (error.code === 'auth/weak-password') msg = "Senha muito fraca.";
        return { error: msg };
    }
};

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Fetch Profile
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { user: docSnap.data() };
        } else {
            // This case should ideally not happen if registration creates the doc
            return { error: "Perfil de usuário não encontrado no banco de dados." };
        }
    } catch (error) {
        console.error("Login Error:", error);
        let msg = "Erro ao fazer login.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = "Email ou senha inválidos.";
        }
        return { error: msg };
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
        // Optionally handle logout errors
    }
};

// Helper to fetch full profile by UID
export const getUserProfile = async (uid) => {
    if (!uid) return null;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
        console.error("Error fetching user profile:", e);
        return null;
    }
};

// This function is now deprecated as `onAuthStateChanged` in App.jsx is the primary way
// to get the current user. If you need the full profile, use `getUserProfile(auth.currentUser.uid)`.
// export const getCurrentUser = () => {
//     return auth.currentUser; // Returns Firebase Auth User object, not the full profile
// };


export const updateUser = async (uid, updates) => {
    // The `uid` here should be the Firebase Auth UID, not the 6-digit friend code.
    // It's assumed the caller (e.g., App.jsx) passes the correct UID.
    if (!uid) {
        console.error("Update Error: No user ID provided.");
        return { error: "Erro de autenticação." };
    }

    try {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, updates);
        // Optionally fetch and return the updated document
        const updatedDoc = await getDoc(docRef);
        return { success: true, user: updatedDoc.data() };
    } catch (e) {
        console.error("Update Error:", e);
        return { error: "Erro ao atualizar perfil." };
    }
};


export const deleteUserAccount = async (uid) => {
    try {
        // 1. Delete Firestore Data
        const docRef = doc(db, "users", uid);
        await deleteDoc(docRef);

        // 2. Delete Auth User
        const user = auth.currentUser;
        if (user) {
            await deleteUser(user);
        }

        return { success: true };
    } catch (error) {
        console.error("Delete Account Error:", error);
        // Requires recent login often
        return { error: error.message };
    }
};

export const addFriend = async (myUid, friendCode) => {
    friendCode = String(friendCode).trim();

    try {
        // 1. Find friend by code
        const q = query(collection(db, "users"), where("id", "==", friendCode));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { error: "Usuário não encontrado com esse ID." };
        }

        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();
        const friendUid = friendDoc.id; // This is the friend's Auth UID

        if (friendUid === myUid) {
            return { error: "Você não pode adicionar a si mesmo." };
        }

        // 2. Get my data to check if already friends and get my friendCode
        const myRef = doc(db, "users", myUid);
        const myDoc = await getDoc(myRef);
        if (!myDoc.exists()) {
            return { error: "Erro: Seu perfil não foi encontrado." };
        }
        const myData = myDoc.data();
        const myFriendCode = myData.id; // My 6-digit friend code

        if (myData.friends && myData.friends.includes(friendCode)) {
            return { error: "Já está na sua lista de amigos." };
        }

        // 3. Add friendCode to my friends list
        await updateDoc(myRef, {
            friends: arrayUnion(friendCode)
        });

        // 4. Add myFriendCode to friend's friends list (mutual friendship)
        const friendRef = doc(db, "users", friendUid);
        await updateDoc(friendRef, {
            friends: arrayUnion(myFriendCode) // Add my 6-digit ID to their list
        });

        return { success: true, friendName: friendData.name };

    } catch (error) {
        console.error("Add Friend Error:", error);
        return { error: "Erro ao adicionar amigo." };
    }
};

export const getFriendsLeaderboard = async (myUid) => {
    try {
        // Get My Data
        const myRef = doc(db, "users", myUid);
        const myDoc = await getDoc(myRef);
        if (!myDoc.exists()) return [];
        const myData = myDoc.data();

        const friendCodes = myData.friends || [];
        // Add my own code to list to query everyone
        const allCodes = [myData.id, ...friendCodes];

        if (allCodes.length === 0) {
            return [myData];
        }

        let friendsData = [];
        const chunkSize = 10;
        for (let i = 0; i < allCodes.length; i += chunkSize) {
            const chunk = allCodes.slice(i, i + chunkSize);
            const q = query(collection(db, "users"), where("id", "in", chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(d => friendsData.push(d.data()));
        }

        return friendsData.sort((a, b) => b.xp - a.xp);
    } catch (error) {
        console.error("Friends Leaderboard Error:", error);
        return [];
    }
};

// Import logic from ranking system
import { calculateSeasonReset } from './rankingSystem';

export const checkSeasonReset = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const lastReset = data.lastSeasonReset ? new Date(data.lastSeasonReset) : new Date(data.createdAt || Date.now());
        const now = new Date();
        const diffDays = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

        if (diffDays >= 45) {
            console.log(`[Season Reset] 45 days passed for user ${uid}. Resetting XP...`);

            const newXp = calculateSeasonReset(data.xp || 0);

            await updateDoc(docRef, {
                xp: newXp,
                lastSeasonReset: now.toISOString()
            });

            return { resetOccurred: true, oldXp: data.xp, newXp };
        }

        return { resetOccurred: false };
    } catch (e) {
        console.error("Season Reset Check Error:", e);
        return { error: e.message };
    }
};

export const getGlobalLeaderboard = async () => {
    try {
        // Fetch all users (limit to 50 for sanity in case of many users)
        // In real app: query(collection(db, "users"), orderBy("xp", "desc"), limit(50))
        // But we need to create index for that. For now, fetch all client side sort is fine for small scale.
        const q = query(collection(db, "users"));
        const snap = await getDocs(q);
        const users = [];
        snap.forEach(d => users.push(d.data()));
        return users.sort((a, b) => b.xp - a.xp);
    } catch (e) {
        console.error("Global Leaderboard Error:", e);
        return [];
    }
};
