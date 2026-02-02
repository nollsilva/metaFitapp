import { db } from '../lib/firebase';
import { collection, addDoc, doc, onSnapshot, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export const ChallengeService = {
    // Create a new challenge
    sendChallenge: async (challenger, opponentId) => {
        try {
            if (!db) throw new Error("Database não inicializado.");
            if (!opponentId) throw new Error("ID do oponente inválido.");

            const challengeRef = await addDoc(collection(db, 'battles'), {
                challengerId: challenger.uid,
                challengerName: challenger.name || 'Desconhecido',
                challengerAvatar: challenger.avatar || '',
                opponentId: opponentId,
                status: 'pending', // pending, accepted, rejected, timeout, finished
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 15000).toISOString() // 15s expiration (10s countdown + margin)
            });
            return { id: challengeRef.id };
        } catch (error) {
            console.error("Error sending challenge:", error);
            return { error: error.message };
        }
    },

    // Listen for challenge status updates (for Challenger)
    // Callback receives the challenge data or null if deleted
    listenToChallenge: (challengeId, callback) => {
        const unsub = onSnapshot(doc(db, 'battles', challengeId), (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                callback(null); // Deleted or not found
            }
        });
        return unsub;
    },

    // Listen for incoming challenges (for Opponent)
    // Callback receives array of active pending challenges
    listenForIncomingChallenges: (myUid, callback) => {
        if (!myUid) return () => { };

        // Listen for PENDING challenges where opponent is ME
        const q = query(
            collection(db, 'battles'),
            where('opponentId', '==', myUid),
            where('status', '==', 'pending')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const challenges = [];
            snapshot.forEach(doc => {
                challenges.push({ id: doc.id, ...doc.data() });
            });
            callback(challenges);
        });

        return unsub;
    },

    acceptChallenge: async (challengeId) => {
        try {
            await updateDoc(doc(db, 'battles', challengeId), {
                status: 'accepted'
            });
            return { success: true };
        } catch (e) { return { error: e.message }; }
    },

    rejectChallenge: async (challengeId) => {
        try {
            await updateDoc(doc(db, 'battles', challengeId), {
                status: 'rejected'
            });
            return { success: true };
        } catch (e) { return { error: e.message }; }
    },

    cleanup: async (challengeId) => {
        try {
            await deleteDoc(doc(db, 'battles', challengeId));
        } catch (e) { console.error(e); }
    },

    // --- TURN SYNC METHODS ---
    submitTurn: async (battleId, role, turn, tactics) => {
        try {
            const field = `turn${turn}_${role}`; // e.g. turn1_challenger
            await updateDoc(doc(db, 'battles', battleId), {
                [field]: tactics
            });
            return { success: true };
        } catch (e) { return { error: e.message }; }
    }
};
