import { auth, db } from '../lib/firebase';
import { sendWelcomeEmail } from './email';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateAuthProfile,
    deleteUser,
    sendPasswordResetEmail
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

export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error("Reset Password Error:", error);
        let msg = "Erro ao enviar email de redefinição.";
        if (error.code === 'auth/user-not-found') msg = "Email não encontrado.";
        if (error.code === 'auth/invalid-email') msg = "Email inválido.";
        return { error: msg };
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

// --- FRIEND REQUEST SYSTEM ---

export const sendFriendRequest = async (myUid, targetUid) => {
    try {
        if (myUid === targetUid) return { error: "Você não pode enviar solicitação para si mesmo." };

        // 1. Get My Profile to have name/avatar for the request
        const myRef = doc(db, "users", myUid);
        const mySnap = await getDoc(myRef);
        if (!mySnap.exists()) return { error: "Erro de autenticação." };
        const myData = mySnap.data();

        const targetRef = doc(db, "users", targetUid);

        // Check if already friends
        if (myData.friends && myData.friends.includes(targetUid)) { // Storing UIDs now, not codes? 
            // WAIT. The old system stored "Friend Codes" (6 digits).
            // The NEW system should probably stick to UIDs for reliability, OR keep Friend Codes if we want backward compat?
            // The prompt implies "clicar no nome", so we have the User Object (and UID).
            // Let's migrate to using UIDs for friends list if possible, OR look up Friend Code.
            // Current db.js uses `friends: [friendCode1, friendCode2]`.
            // To be consistent, let's keep storing Friend Codes in `friends` array if we want compatibility with existing leaderboards.
            // OR switch to UIDs. Leaderboards `getFriendsLeaderboard` fetches by `where("id", "in", chunk)`.
            // field "id" is the Friend Code.
            // So we MUST store Friend Codes in the `friends` array to keep leaderboard working without refactoring everything.

            // So:
            // 1. Get Target's Friend Code
            // 2. Add request using My Friend Code + My Name + My Avatar
        }

        const targetSnap = await getDoc(targetRef);
        if (!targetSnap.exists()) return { error: "Usuário não encontrado." };
        const targetData = targetSnap.data();

        // Check compatibility:
        // if `myData.friends` has `targetData.id`
        if (myData.friends && myData.friends.includes(targetData.id)) {
            return { error: "Vocês já são amigos!" };
        }

        // Check if request already sent
        // We'll store requests in `requestsReceived` on the target.
        // Array of objects: { fromUid, fromName, fromAvatar, timestamp }
        // Firestore arrays of objects are tricky to dedupe. 
        // Better: `friendRequests: { [requestUid]: { name, avatar... } }` (Map)
        // OR just simple array and check manually.
        const currentRequests = targetData.friendRequests || [];
        if (currentRequests.some(r => r.fromUid === myUid)) {
            return { error: "Solicitação já enviada." };
        }

        // Add Request to Target
        await updateDoc(targetRef, {
            friendRequests: arrayUnion({
                fromUid: myUid,
                fromName: myData.name || "Sem Nome",
                fromAvatar: myData.avatar || "",
                timestamp: new Date().toISOString()
            })
        });

        return { success: true };

    } catch (error) {
        console.error("Send Request Error:", error);
        return { error: "Erro ao enviar solicitação." };
    }
};

export const acceptFriendRequest = async (myUid, requesterUid) => {
    try {
        const myRef = doc(db, "users", myUid);
        const reqRef = doc(db, "users", requesterUid);

        const [mySnap, reqSnap] = await Promise.all([getDoc(myRef), getDoc(reqRef)]);

        if (!mySnap.exists() || !reqSnap.exists()) return { error: "Erro ao processar." };

        const myData = mySnap.data();
        const reqData = reqSnap.data();

        const myFriendCode = myData.id;
        const reqFriendCode = reqData.id;

        // 1. Add to Friends Lists (Mutual) - Storing Friend Codes
        await updateDoc(myRef, {
            friends: arrayUnion(reqFriendCode)
        });
        await updateDoc(reqRef, {
            friends: arrayUnion(myFriendCode)
        });

        // 2. Remove from my friendRequests
        // ArrayRemove requires exact object match, which is hard.
        // Better to read, filter, write.
        const newRequests = (myData.friendRequests || []).filter(r => r.fromUid !== requesterUid);

        await updateDoc(myRef, {
            friendRequests: newRequests
        });

        // 3. Add to Requester's "acceptedNotifications" (Green Dot)
        await updateDoc(reqRef, {
            friendRequestsAccepted: arrayUnion({
                friendUid: myUid,
                friendName: myData.name || "Alguém",
                friendAvatar: myData.avatar || "",
                timestamp: new Date().toISOString()
            })
        });

        return { success: true };

    } catch (error) {
        console.error("Accept Error:", error);
        return { error: "Erro ao aceitar amizade." };
    }
};

export const rejectFriendRequest = async (myUid, requesterUid) => {
    try {
        const myRef = doc(db, "users", myUid);
        const mySnap = await getDoc(myRef);

        if (!mySnap.exists()) return { error: "Erro." };
        const myData = mySnap.data();

        // Filter out
        const newRequests = (myData.friendRequests || []).filter(r => r.fromUid !== requesterUid);

        await updateDoc(myRef, {
            friendRequests: newRequests
        });

        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
};

export const clearAcceptedNotifications = async (myUid) => {
    try {
        const myRef = doc(db, "users", myUid);
        await updateDoc(myRef, {
            friendRequestsAccepted: []
        });
        return { success: true };
    } catch (e) {
        return { error: e.message };
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
