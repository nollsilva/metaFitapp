import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import WorkoutTimer from './components/WorkoutTimer';
import ProfileSection from './components/ProfileSection';
import DietSection from './components/DietSection';
import WorkoutsSection from './components/WorkoutsSection';
import RankingSection from './components/RankingSection';
import AuthModal from './components/AuthModal';
import HeroSection from './components/HeroSection';
import OnboardingGuide from './components/OnboardingGuide';
import Footer from './components/Footer';
import TutorialOverlay from './components/TutorialOverlay';
import {
  loginUser, registerUser, logoutUser, resetPassword, getUserProfile,
  updateUser, checkSeasonReset, checkVipExpiration, updateHeartbeat // Add updateHeartbeat
} from './utils/db';
import { sendRankUpEmail } from './utils/email';
import { getRankTitle } from './utils/rankingSystem';
import { getBadgeConfig } from './components/BadgeIcons';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { MESSAGES } from './utils/messages';

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import './index.css';

import RunMode from './components/RunMode';
import BottomNav from './components/BottomNav';
import HamburgerMenu from './components/HamburgerMenu';
import DailyBonus from './components/DailyBonus';
import { ChallengeService } from './services/ChallengeService';
import NotificationSystem from './components/NotificationSystem'; // Imported
import NotificationPermissionModal from './components/NotificationPermissionModal'; // Imported
import NotificationsScreen from './components/NotificationsScreen'; // Imported
import BattleArena from './components/BattleArena'; // PvP System

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeExercise, setActiveExercise] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false); // New State
  const [showTutorial, setShowTutorial] = useState(false);
  const [sessionChecks, setSessionChecks] = useState(new Set());

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('metafit_tutorial_seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = () => {
    localStorage.setItem('metafit_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  // Initial empty state structure for fallback
  const defaultProfile = {
    isLoggedIn: false,
    uid: null,
    id: null,
    email: '',
    name: '',
    weight: '',
    height: '',
    age: '',
    gender: 'masculino',
    activityLevel: '1.55',
    goal: 'manter',
    targetCalories: 0,
    idealWeight: 0,
    mealPlan: null,
    classification: '',
    color: '#fff',
    urgentPart: 'corpo todo',
    trainingDays: 3,
    selectedWeekDays: [],
    trainingDuration: 20,
    workoutHistory: {},
    targetMuscles: [],
    focusAreas: [],
    xp: 0,
    level: 1,
    friends: [],
    friendRequests: [],
    friendRequestsAccepted: [],
    xpHistory: [] // New: History of XP transactions
  };

  const [userProfile, setUserProfile] = useState(defaultProfile);
  const [notification, setNotification] = useState(null);
  const [vipNotification, setVipNotification] = useState(null); // VIP Notification State
  const [battleOpponent, setBattleOpponent] = useState(null); // PvP Opponent State

  // Check for missed workouts logic
  const checkMissedWorkouts = (profile) => {
    const scheduledDays = profile.selectedWeekDays || [];
    const history = profile.workoutHistory || {};
    const lastCheck = profile.lastMissedCheck ? new Date(profile.lastMissedCheck) : new Date(profile.createdAt || Date.now());

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let currentDate = new Date(lastCheck);
    currentDate.setDate(currentDate.getDate() + 1);

    let penalty = 0;
    let missedCount = 0;
    const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    while (currentDate <= yesterday) {
      const dayKeyStr = dayKeys[currentDate.getDay()];
      const dateStr = currentDate.toISOString().split('T')[0];

      if (scheduledDays.includes(dayKeyStr)) {
        if (history[dateStr] !== 'done') {
          penalty += 100;
          missedCount++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (penalty > 0) {
      const currentXp = profile.xp || 0;
      const newXp = Math.max(0, currentXp - penalty);
      const newLevel = Math.floor(newXp / 1000) + 1;

      // Create history entry
      const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        amount: -penalty,
        reason: 'Penalidade: Dias perdidos',
        type: 'loss'
      };

      setUserProfile(prev => ({
        ...prev,
        xp: newXp,
        level: newLevel,
        lastMissedCheck: new Date().toISOString(),
        xpHistory: [historyEntry, ...(prev.xpHistory || [])].slice(0, 100)
      }));

      setNotification(MESSAGES.XP.LOST_STREAK(penalty, missedCount));
      setTimeout(() => setNotification(null), 8000);
    } else {
      if (missedCount === 0 && new Date() > lastCheck) {
        const todayStr = new Date().toISOString();
        setUserProfile(prev => ({ ...prev, lastMissedCheck: todayStr }));
      }
    }
  };

  // Load User from Firebase Session with Realtime Listener
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Check VIP Expiration
            checkVipExpiration(data).then(validatedData => {
              setUserProfile(prev => ({
                ...prev,
                ...validatedData,
                isLoggedIn: true,
                uid: user.uid
              }));
            });
          } else {
            console.error("Auth exists but no profile found in Firestore for UID:", user.uid);
          }
        }, (error) => {
          console.error("Snapshot Error:", error);
        });

      } else {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        setUserProfile(defaultProfile);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Save changes to DB whenever profile changes
  useEffect(() => {
    if (userProfile.uid) {
      updateUser(userProfile.uid, userProfile);
    }
  }, [userProfile]);

  // Heartbeat Effect (Online Status)
  useEffect(() => {
    if (!userProfile.uid) return;
    // Initial call
    updateHeartbeat(userProfile.uid);
    const interval = setInterval(() => {
      updateHeartbeat(userProfile.uid);
    }, 60 * 1000); // 1 minute
    return () => clearInterval(interval);
  }, [userProfile.uid]);

  // --- CHALLENGE SYSTEM LISTENER ---
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null); // The accepted challenge to show rules for

  useEffect(() => {
    if (!userProfile.uid) return;
    const unsub = ChallengeService.listenForIncomingChallenges(userProfile.uid, (challenges) => {
      setIncomingChallenges(challenges);
    });
    return () => unsub();
  }, [userProfile.uid]);

  const handleAcceptChallenge = async (challenge) => {
    await ChallengeService.acceptChallenge(challenge.id);
    setActiveChallenge(challenge); // Show rules modal
    // Remove from incoming list locally to close invite modal immediately
    setIncomingChallenges(prev => prev.filter(c => c.id !== challenge.id));
  };

  const handleRejectChallenge = async (challengeId) => {
    await ChallengeService.rejectChallenge(challengeId);
  };

  const enterBattleFromChallenge = () => {
    // Navigate to Battle Tab and Set Opponent
    // We need updates to battle stats or just passing data?
    // App.jsx handles generic tab switching. We need to pass the opponent to BattleArena.
    // For now, we assume RankingSection triggers battle, but here we are entering from App.
    // We need a way to set "battleOpponent" state if it exists, or pass it down.
    // Let's assume BattleArena gets props or we set it here.
    // Looking at App.jsx, we need see how `onBattle` works.
    // We will create a state `battleData` or similar if needed, or just setTab('battle') and pass props?
    // Let's check how BattleArena is used.
    setBattleOpponent({
      uid: activeChallenge.challengerId,
      name: activeChallenge.challengerName,
      avatar: activeChallenge.challengerAvatar
    });
    setActiveTab('ranking'); // Battle is usually inside Ranking or separate?
    // Wait, BattleArena seems to be a full screen overlay often triggered from Ranking.
    // If I change activeTab to 'ranking', I need to trigger the battle view there.
    // OR better: Just render BattleArena directly if we are in battle mode.
    // Let's set a global 'isBattling' state or check how RankingSection initiates it.
    // Actually, BattleArena was rendered in RankingSection in previous context.
    // But if I accept here in App.jsx, I need to tell RankingSection to open BattleArena.
    // Pass `initialBattleConfig` to RankingSection?
    // Simpler: Just render BattleArena as a top-level overlay in App.jsx if active.
    setActiveChallenge(null);
    // We need to trigger the battle start.
    // I will use a new prop on RankingSection or a global state.
    // Let's add `pendingBattle` state to App.jsx and pass to RankingSection.
    setPendingBattle({
      uid: activeChallenge.challengerId,
      name: activeChallenge.challengerName,
      avatar: activeChallenge.challengerAvatar
    });
    setActiveTab('battle');
  };

  const [pendingBattle, setPendingBattle] = useState(null);


  const updateProfile = (newData) => {
    setUserProfile(prev => ({ ...prev, ...newData }));
  };

  const addXp = (amount, reason = 'Geral') => {
    setUserProfile(prev => {
      let finalAmount = amount;
      let historyToAdd = [];

      // Main Entry
      historyToAdd.push({
        id: Date.now() + Math.random(),
        date: new Date().toISOString(),
        amount: amount,
        reason: reason,
        type: amount >= 0 ? 'gain' : 'loss'
      });

      // VIP Bonus Check (Only for gains)
      if (prev.vip && amount > 0) {
        const bonus = Math.floor(amount * 0.10);
        if (bonus > 0) {
          finalAmount += bonus;
          historyToAdd.push({
            id: Date.now() + Math.random() + 1,
            date: new Date().toISOString(),
            amount: bonus,
            reason: `Bônus VIP (+10%)`,
            type: 'gain'
          });
          // Trigger VIP Notification
          setVipNotification(`+${bonus} XP (Bônus VIP)`);
          setTimeout(() => setVipNotification(null), 4000);
        }
      }

      const newXp = (prev.xp || 0) + finalAmount;
      const newLevel = Math.floor(newXp / 1000) + 1;

      if (newLevel > (prev.level || 1)) {
        setNotification(MESSAGES.XP.LEVEL_UP(newLevel));
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        xpHistory: [...historyToAdd, ...(prev.xpHistory || [])].slice(0, 100)
      };
    });
  };

  const handleLogout = async () => {
    await logoutUser();
    setUserProfile(defaultProfile);
    setActiveTab('home');
    setIsAuthModalOpen(true);
    // Limpa o estado de descarte para que o modal de permissão reapareça no próximo login
    localStorage.removeItem('metafit_notif_dismissed');
  };

  const handleDeleteAccount = async () => {
    if (userProfile.uid) {
      const result = await deleteUserAccount(userProfile.uid);
      if (result.success) {
        setNotification(MESSAGES.ACCOUNT.DELETE_SUCCESS);
        setTimeout(() => setNotification(null), 5000);
        await handleLogout();
      } else {
        if (result.error && result.error.includes('requires-recent-login')) {
          setNotification(MESSAGES.ACCOUNT.DELETE_SECURITY_ERROR);
        } else {
          setNotification(MESSAGES.ACCOUNT.DELETE_ERROR(result.error));
        }
        setTimeout(() => setNotification(null), 8000);
      }
    }
  };

  const handleAuthSuccess = (user) => {
    setUserProfile({ ...user, isLoggedIn: true });
    setIsAuthModalOpen(false);
  };

  const handleDailyWorkoutComplete = (xpAmount) => {
    const todayKey = new Date().toISOString().split('T')[0];
    const newHistory = { ...userProfile.workoutHistory };
    newHistory[todayKey] = 'done';

    // We update history locally first for immediate UI, 
    // but updateProfile will merge it. 
    // Wait, addXp updates state, updateProfile updates state. 
    // We should call addXp first, then updateProfile for other fields.
    // Ideally we merge state updates.

    addXp(xpAmount, 'Treino Diário Completo');
    updateProfile({ workoutHistory: newHistory });

    setNotification(MESSAGES.XP.GAIN_DAILY(xpAmount));
    setTimeout(() => setNotification(null), 5000);
  };

  const handleToggleCheck = (index) => {
    setSessionChecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  // Notification Logic
  const hasRequestNotification = userProfile.friendRequests && userProfile.friendRequests.length > 0;

  const [hasBonusNotification, setHasBonusNotification] = useState(false);
  useEffect(() => {
    if (!userProfile) return;
    const today = new Date();
    const lastClaimStr = userProfile.lastClaimDate;

    if (!lastClaimStr) {
      setHasBonusNotification(true);
    } else {
      const lastClaim = new Date(lastClaimStr);
      const d1 = new Date(lastClaim); d1.setHours(0, 0, 0, 0);
      const d2 = new Date(today); d2.setHours(0, 0, 0, 0);
      // If diff >= 1 day, bonus is ready
      if (d2 > d1) {
        setHasBonusNotification(true);
      } else {
        setHasBonusNotification(false);
      }
    }
  }, [userProfile.lastClaimDate, userProfile]); // Added userProfile to dependency array for robustness

  // Check for Notification Permission on Login
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    if (userProfile.isLoggedIn) {
      // Se o navegador já tem uma decisão (granted ou denied), não precisamos mostrar o modal
      if (window.Notification && Notification.permission !== 'default') {
        return;
      }

      // Se o usuário já tiver um fcmToken, ele já autorizou no passado
      if (userProfile.fcmToken) return;

      // Check if user has dismissed it permanently
      const hasDismissed = localStorage.getItem('metafit_notif_dismissed');
      if (!hasDismissed) {
        // Delay slightly for better UX
        const timer = setTimeout(() => setShowNotificationModal(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [userProfile.isLoggedIn, userProfile.fcmToken]);

  return (
    <div className="app-container">
      <div className="bg-glow-container">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

      {/* Background Check System */}
      <NotificationSystem
        profile={userProfile}
        onShowNotification={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 8000);
        }}
      />

      {/* Notification Permission Request (Mobile Only or PWA) */}
      {showNotificationModal && (
        <NotificationPermissionModal
          profile={userProfile}
          onClose={() => {
            setShowNotificationModal(false);
            localStorage.setItem('metafit_notif_dismissed', 'true');
          }}
          onPermissionGranted={() => setShowNotificationModal(false)}
        />
      )}

      {notification && (
        <div className="animate-fade-in" style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255, 0, 85, 0.9)', color: '#fff', padding: '12px 24px',
          borderRadius: '50px', zIndex: 10000, fontWeight: 'bold', border: '1px solid #ff0055',
          boxShadow: '0 5px 20px rgba(255,0,85,0.4)', textAlign: 'center', width: '90%', maxWidth: '400px'
        }}>
          {notification}
        </div>
      )}

      {vipNotification && (
        <div className="animate-fade-in" style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255, 165, 0, 0.9)', color: '#fff', padding: '10px 20px',
          borderRadius: '50px', zIndex: 10000, fontWeight: 'bold', border: '1px solid #ffae00',
          boxShadow: '0 5px 20px rgba(255, 165, 0, 0.4)', textAlign: 'center', width: '85%', maxWidth: '350px',
          fontSize: '0.9rem'
        }}>
          👑 {vipNotification}
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onShowTutorial={() => setShowTutorial(true)}
        isLoggedIn={userProfile.isLoggedIn}
        onLogout={handleLogout}
        onOpenHamburger={() => setIsHamburgerOpen(true)} // Added
        notificationBonus={hasBonusNotification}
        notificationRequests={hasRequestNotification}
      />

      <HamburgerMenu
        isOpen={isHamburgerOpen}
        onClose={() => setIsHamburgerOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          // Handle special actions from menu
          if (tab === 'help') { setShowTutorial(true); }
          // Bonus might be a modal, but for now we can select tab if we had one, or open modal
          // But since Bonus is in Profile usually, or separate. 
          // Implementation plan said Hamburger Items: Perfil, Dieta, Bonus, Ajuda, Sair.
          // If Bonus is clicked, we might want to trigger the bonus modal inside Profile or global.
          // For now let's just setActiveTab, and handle rendering.
          else { setActiveTab(tab); }
        }}
        onLogout={handleLogout}
        profile={userProfile}
        notificationBonus={hasBonusNotification}
        notificationRequests={hasRequestNotification}
      />

      <main style={{ paddingBottom: activeTab === 'timer' ? 0 : '100px' }}>
        {activeTab === 'home' && (
          userProfile.isLoggedIn ? (
            <RankingSection
              profile={userProfile}
              onUpdateProfile={updateProfile}
              onBattle={(opponent) => {
                setBattleOpponent(opponent);
                setActiveTab('battle');
              }}
            />
          ) : (
            <>
              <HeroSection onStart={() => setIsAuthModalOpen(true)} />
              <OnboardingGuide />
            </>
          )
        )}

        {activeTab === 'workout' && (
          <WorkoutsSection
            profile={userProfile}
            onUpdateProfile={updateProfile}
            onStartWorkout={(exercise) => {
              setActiveExercise(exercise);
              setActiveTab('timer');
            }}
            onCompleteDaily={handleDailyWorkoutComplete}
            checkedExercises={sessionChecks}
            onToggleCheck={handleToggleCheck}
          />
        )}

        {activeTab === 'timer' && activeExercise && (
          <WorkoutTimer
            exercise={activeExercise}
            profile={userProfile}
            onExit={() => {
              setActiveTab('workout');
              setActiveExercise(null);
            }}
            onFinish={() => {
              if (activeExercise.isDaily) {
                if (activeExercise.index !== undefined) {
                  setSessionChecks(prev => new Set(prev).add(activeExercise.index));
                }
                setNotification(MESSAGES.WORKOUT.FINISHED_EXERCISE);
                setTimeout(() => setNotification(null), 3000);
                setActiveTab('workout');
                setActiveExercise(null);
                return;
              }

              addXp(15, activeExercise ? `Treino: ${activeExercise.name}` : 'Treino Avulso');
              setNotification(MESSAGES.XP.GAIN_DEFAULT(15));
              setTimeout(() => setNotification(null), 3000);
            }}
            onAddXp={addXp}
          />
        )}

        {activeTab === 'diet' && (
          <DietSection
            profile={userProfile}
            onUpdateProfile={updateProfile}
          />
        )}

        {activeTab === 'tracker' && (
          <ProfileSection
            profile={userProfile}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUpdateProfile={updateProfile}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {activeTab === 'run' && (
          <RunMode profile={userProfile} onAddXp={addXp} />
        )}

        {/* Battle Arena Overlay */}
        {activeTab === 'battle' && battleOpponent && (
          <BattleArena
            myProfile={userProfile}
            enemyProfile={battleOpponent}
            onUpdateProfile={updateProfile}
            onExit={() => {
              setActiveTab('home');
              setBattleOpponent(null);
            }}
          />
        )}

        {/* Notification Screen */}
        {activeTab === 'notifications' && (
          <NotificationsScreen profile={userProfile} onUpdateProfile={updateProfile} />
        )}

        {/* Bonus is a Modal or Screen? Let's make it a Modal for consistency with previous, or a screen.
            Since Hamburger sets activeTab='bonus', we can render it as a section or a modal. 
            User said "va para o bonus diario do menu". 
            Let's reuse the logic from ProfileSection but lift it to App level or render here.
            Because DailyBonus is a component, we can render it as a tab content or modal over current tab.
            Let's render it as a tab content for simplicity if activeTab is 'bonus'.
        */}
        {activeTab === 'bonus' && (
          <div className="container" style={{ paddingTop: '2rem' }}>
            <DailyBonus profile={userProfile} onUpdateProfile={updateProfile} />
          </div>
        )}

      </main>

      {/* Auth Modal Global */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => {
            setIsAuthModalOpen(false);
          }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* New Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <Footer />
      {/* CHALLENGE INVITE MODAL (OPPONENT) */}
      {incomingChallenges.length > 0 && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 11000 }}>
          <div className="card" style={{
            width: '90%', maxWidth: '350px', textAlign: 'center',
            background: 'linear-gradient(145deg, #1a0b0b 0%, #000 100%)',
            border: '1px solid #ff4444',
            boxShadow: '0 0 30px rgba(255,0,0,0.3)'
          }}>
            <h2 style={{ color: '#ff4444', fontSize: '1.5rem', marginBottom: '1rem' }}>⚔️ DESAFIO!</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 10px', overflow: 'hidden', border: '3px solid #ff4444' }}>
                {incomingChallenges[0].challengerAvatar ? (
                  <img src={`/avatars/${incomingChallenges[0].challengerAvatar}.png`} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#333' }}></div>
                )}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{incomingChallenges[0].challengerName}</div>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>te desafiou para um duelo!</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => handleRejectChallenge(incomingChallenges[0].id)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #ff4444',
                  background: 'transparent', color: '#ff4444', fontWeight: 'bold'
                }}>
                RECUSAR
              </button>
              <button
                onClick={() => handleAcceptChallenge(incomingChallenges[0])}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#ff4444', color: '#fff', fontWeight: 'bold',
                  boxShadow: '0 0 15px rgba(255, 68, 68, 0.4)'
                }}>
                ACEITAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RULES MODAL (OPPONENT ACCEPTED) */}
      {activeChallenge && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 11000 }}>
          <div className="card" style={{
            width: '90%', maxWidth: '350px', textAlign: 'center',
            background: '#000', border: '1px solid #333'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>📋 Regras do Duelo</h2>
            <div style={{ textAlign: 'left', fontSize: '0.9rem', color: '#ccc', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              <p>1. O duelo é baseado em turnos.</p>
              <p>2. Você escolhe: <strong>Força</strong>, <strong>Agilidade</strong> ou <strong>Defesa</strong>.</p>
              <p>3. <strong>Força</strong> vence Defesa.</p>
              <p>4. <strong>Defesa</strong> vence Agilidade.</p>
              <p>5. <strong>Agilidade</strong> vence Força.</p>
              <p>6. Quem zerar a vida do oponente vence!</p>
            </div>
            <button
              onClick={enterBattleFromChallenge}
              className="btn-primary"
              style={{ width: '100%', fontSize: '1.1rem', padding: '12px' }}
            >
              ENTRAR NA ARENA ⚔️
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
