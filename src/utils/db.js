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
    collection,
    doc,
    deleteDoc,
    query,
    where,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    arrayUnion,
    arrayRemove, // Imported
    increment,
    limit
} from 'firebase/firestore';

// Generate 6-digit ID
export const generateId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (email, password, name, inviteCode = "") => {
    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Auth Profile
        await updateAuthProfile(user, { displayName: name });

        // 3. Create Firestore Document
        let friendCode = generateId();

        // Handle Referral Logic
        if (inviteCode) {
            const q = query(collection(db, "users"), where("id", "==", inviteCode));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const referrerDoc = snapshot.docs[0];
                const referrerData = referrerDoc.data();

                // Award 100 XP to Referrer
                await updateDoc(referrerDoc.ref, {
                    xp: (referrerData.xp || 0) + 100
                });

                // Optional: Notify referrer (not implemented without cloud functions easily, but we update the doc)
            }
        }

        const newUserProfile = {
            uid: user.uid, // Auth ID
            id: friendCode, // Public Friend Code
            email,
            name,
            xp: 0, // Requirement: New users start with 0 XP
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
            // Battle System Defaults
            attributes: { strength: 0, speed: 0, defense: 0, points: 0 },
            battleStats: { wins: 0, losses: 0 },
        };

        await setDoc(doc(db, "users", user.uid), newUserProfile);

        // Send Welcome Email
        sendWelcomeEmail(newUserProfile).catch(err => console.error("Error sending welcome email:", err));

        return { user: newUserProfile };
    } catch (error) {
        console.error("Register Error:", error);
        let msg = "Erro ao criar conta.";
        if (error.code === 'auth/email-already-in-use') msg = "Este email já está cadastrado.";
        if (error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
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
            // RECOVERY: Auth exists but Firestore Profile is missing. Use Auth data to recreate.
            console.warn("Profile missing for existing Auth user. Recreating...");

            let friendCode = generateId();
            // Basic collision check unused for now as per register logic

            const newUserProfile = {
                uid: uid,
                id: friendCode,
                email: userCredential.user.email,
                name: userCredential.user.displayName || "Usuário",
                xp: 0, // Reset XP as it's a "new" profile technically
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
                // Battle System Defaults
                attributes: { strength: 0, speed: 0, defense: 0, points: 0 },
                battleStats: { wins: 0, losses: 0 },
                friendRequests: [],
                friendRequestsAccepted: []
            };

            await setDoc(docRef, newUserProfile);
            return { user: newUserProfile };
        }
    } catch (error) {
        console.error("Login Error:", error);
        let msg = "Erro ao fazer login.";

        if (error.code === 'auth/user-not-found') {
            msg = "Este email não está cadastrado.";
        } else if (error.code === 'auth/wrong-password') {
            msg = "Senha incorreta.";
        } else if (error.code === 'auth/invalid-credential') {
            msg = "Email ou senha incorretos (ou não cadastrado).";
        } else if (error.code === 'auth/too-many-requests') {
            msg = "Muitas tentativas. Tente novamente mais tarde.";
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
        const targetSnap = await getDoc(targetRef);
        if (!targetSnap.exists()) return { error: "Usuário não encontrado." };
        const targetData = targetSnap.data();

        // Check if already friends
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
        // Filter out any undefined/null/empty codes to safely query
        const allCodes = [myData.id, ...friendCodes].filter(c => c && typeof c === 'string');

        if (allCodes.length === 0) {
            return [myData];
        }

        let friendsData = [];
        const chunkSize = 10;
        for (let i = 0; i < allCodes.length; i += chunkSize) {
            const chunk = allCodes.slice(i, i + chunkSize);
            if (chunk.length === 0) continue;

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
// --- RUN HISTORY SYSTEM ---
export const saveRun = async (uid, runData) => {
    try {
        const userRef = doc(db, "users", uid);
        const runsRef = collection(userRef, "runs");

        await addDoc(runsRef, {
            ...runData,
            date: new Date().toISOString()
        });

        // Also update total stats on profile if needed
        // e.g. totalDistance += runData.distance
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentTotalKm = userData.totalKm || 0;
            const newTotalKm = currentTotalKm + (runData.distance / 1000);

            await updateDoc(userRef, {
                totalKm: newTotalKm
            });
        }

        return { success: true };
    } catch (e) {
        console.error("Save Run Error:", e);
        return { error: e.message };
    }
};

export const getUserRuns = async (uid) => {
    try {
        const runsRef = collection(db, "users", uid, "runs");
        // Order by date desc
        // Requires index for compound queries if we filter, but basic sort might need index too?
        // Let's try client side sort if index fails, or just default order.
        // For subcollections, indexes are needed for ordering.
        // Keep it simple: fetch all and sort client side for now (assuming < 1000 runs)
        const q = query(runsRef);
        const snap = await getDocs(q);

        const runs = [];
        snap.forEach(d => runs.push(d.data()));

        return runs.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
        console.error("Get Runs Error:", e);
        return [];
    }
};

// Remove Friend
export const removeFriend = async (currentUid, targetId) => {
    try {
        // 1. Get current user doc
        const currentUserRef = doc(db, "users", currentUid);
        const currentUserSnap = await getDoc(currentUserRef);

        if (!currentUserSnap.exists()) return { error: "User not found" };
        const currentData = currentUserSnap.data();
        const currentId = currentData.id;

        // 2. Find target user by their ID
        const targetQuery = query(collection(db, "users"), where("id", "==", targetId));
        const targetSnap = await getDocs(targetQuery);

        // If friend not found in DB, just try to remove from local list anyway to self-heal
        if (targetSnap.empty) {
            await updateDoc(currentUserRef, {
                friends: arrayRemove(targetId)
            });
            return { success: true, message: "Friend removed (User not found in DB)" };
        }

        const targetDoc = targetSnap.docs[0];
        const targetUid = targetDoc.id;

        // 3. Remove targetId from current user's friends list (CRITICAL STEP)
        await updateDoc(currentUserRef, {
            friends: arrayRemove(targetId)
        });

        // 4. Try to remove currentId from target user's friends list (Best Effort)
        try {
            await updateDoc(doc(db, "users", targetUid), {
                friends: arrayRemove(currentId)
            });
        } catch (targetErr) {
            console.warn("Could not remove from friend's list (likely permission issue):", targetErr);
            // We ignore this error to allow the user to at least unfriend on their side
        }

        return { success: true };

    } catch (e) {
        console.error("Remove Friend Error:", e);
        return { error: e.message };
    }
};

// --- NOTIFICATION SYSTEM ---

export const saveFCMToken = async (uid, token) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            fcmToken: token,
            fcmTokenLastUpdated: new Date().toISOString()
        });
        return { success: true };
    } catch (e) {
        console.error("Save Token Error:", e);
        return { error: e.message };
    }
};

export const updateNotificationSettings = async (uid, settings) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            notificationSettings: settings
        });
        return { success: true };
    } catch (e) {
        console.error("Update Notification Settings Error:", e);
        return { error: e.message };
    }
};

export const getNotificationHistory = async (uid) => {
    try {
        const notifRef = collection(db, "users", uid, "notifications");
        const q = query(notifRef);
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
        return [];
    }
};

export const markAsRead = async (uid, notificationId) => {
    try {
        const notifRef = doc(db, "users", uid, "notifications", notificationId);
        await updateDoc(notifRef, { read: true });
        return { success: true };
    } catch (e) { return { error: e }; }
};

export const markAllRead = async (uid) => {
    try {
        const notifRef = collection(db, "users", uid, "notifications");
        const snap = await getDocs(notifRef);
        const updates = snap.docs.map(d => updateDoc(d.ref, { read: true }));
        await Promise.all(updates);
        return { success: true };
    } catch (e) { return { error: e }; }
};
// Check VIP Expiration
export const checkVipExpiration = async (profile) => {
    if (!profile || !profile.vip || !profile.uid) return profile;

    // If vip is permanent (no expiresAt), skip
    if (!profile.vipExpiresAt) return profile;

    const expiresAt = new Date(profile.vipExpiresAt);
    const now = new Date();

    if (now > expiresAt) {
        console.log(`[VIP] Expired for user ${profile.uid}. Removing status...`);

        await updateUser(profile.uid, {
            vip: false,
            vipPlan: null,
            vipExpiresAt: null
        });

        return {
            ...profile,
            vip: false,
            vipPlan: null,
            vipExpiresAt: null
        };
    }

    return profile;
};

export const updateHeartbeat = async (uid) => {
    if (!uid) return;
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            lastActive: Date.now()
        });
    } catch (e) {
        console.error("Error updating heartbeat:", e);
    }
};
