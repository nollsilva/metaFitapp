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
import { getUserProfile, updateUser, logoutUser, deleteUserAccount } from './utils/db';
import { getUserProfile, updateUser, logoutUser, deleteUserAccount } from './utils/db';
import { sendLevelUpEmail } from './utils/email';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeExercise, setActiveExercise] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [sessionChecks, setSessionChecks] = useState(new Set()); // Track completed daily exercises indices

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
    uid: null, // Auth ID
    id: null,  // Friend Code
    email: '',
    name: '',
    weight: '',
    height: '',
    age: '',
    gender: 'male', // 'male' or 'female'
    activityLevel: '1.55',
    goal: 'maintain', // lose, maintain, gain
    targetCalories: 0,
    idealWeight: 0,
    mealPlan: null,
    classification: '',
    color: '#fff',
    // Novos campos de Treino
    urgentPart: 'corpo todo',
    trainingDays: 3,
    selectedWeekDays: [], // ['seg', 'qua', 'sex']
    trainingDuration: 20,
    workoutHistory: {},
    targetMuscles: [],
    focusAreas: [],
    // Sistema de Level
    xp: 0,
    level: 1,
    friends: []
  };

  const [userProfile, setUserProfile] = useState(defaultProfile);
  const [notification, setNotification] = useState(null);

  // Check for missed workouts logic
  const checkMissedWorkouts = (profile) => {
    const scheduledDays = profile.selectedWeekDays || [];
    const history = profile.workoutHistory || {};
    const lastCheck = profile.lastMissedCheck ? new Date(profile.lastMissedCheck) : new Date(profile.createdAt || Date.now());

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Iterate from lastCheck + 1 day until yesterday
    // If we haven't checked since X, we check all days between X and Today.

    let currentDate = new Date(lastCheck);
    currentDate.setDate(currentDate.getDate() + 1);

    let penalty = 0;
    let missedCount = 0;
    const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    while (currentDate <= yesterday) {
      const dayKeyStr = dayKeys[currentDate.getDay()];
      const dateStr = currentDate.toISOString().split('T')[0];

      // If this was a scheduled training day
      if (scheduledDays.includes(dayKeyStr)) {
        // And it was NOT done
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
      const newLevel = Math.floor(newXp / 1000) + 1; // 1000 XP/level assumed

      // Update State
      setUserProfile(prev => ({
        ...prev,
        xp: newXp,
        level: newLevel,
        lastMissedCheck: new Date().toISOString()
      }));

      setNotification(`Você perdeu ${penalty} XP por perder ${missedCount} dia(s) de treino! 😢`);
      setTimeout(() => setNotification(null), 8000);
    } else {
      // Just update the check date if significant time passed, to avoid re-looping too much
      if (missedCount === 0 && new Date() > lastCheck) {
        // We can silently update lastMissedCheck to today (or yesterday) to optimize next run
        // However, simpler to just update state if we want to persist it. 
        // Let's do nothing to avoid unnecessary writes unless a penalty happened, 
        // OR we update it so we don't re-scan every reload.
        // Better to update it.
        const todayStr = new Date().toISOString();
        // We only need to write if it's been more than a day to avoid write spam?
        // Let's just update local state, effect will write to DB.
        setUserProfile(prev => ({ ...prev, lastMissedCheck: todayStr }));
      }
    }
  };

  // Load User from Firebase Session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in.
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile({ ...profile, isLoggedIn: true, uid: user.uid });
          // Run checks
          checkMissedWorkouts(profile);
        } else {
          console.error("Auth exists but no profile found in Firestore for UID:", user.uid);
        }
      } else {
        // User is signed out.
        setUserProfile(defaultProfile);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save changes to DB whenever profile changes
  useEffect(() => {
    if (userProfile.uid) {
      // Debounce? For now direct write.
      // We pass userProfile.uid (Auth ID) to update.
      // Ensure we don't send 'isLoggedIn' or derived UI state if purely DB data,
      // but our updateUser just merges, so it's mostly fine.
      updateUser(userProfile.uid, userProfile);
    }
  }, [userProfile]);

  const updateProfile = (newData) => {
    setUserProfile(prev => ({ ...prev, ...newData }));
  };

  const addXp = (amount) => {
    setUserProfile(prev => {
      const newXp = (prev.xp || 0) + amount;
      const newLevel = Math.floor(newXp / 1000) + 1; // 1000 XP por nível

      // Check for Level Up
      if (newLevel > (prev.level || 1)) {
        // Trigger Level Up Email
        sendLevelUpEmail({ ...prev, level: newLevel }, newLevel).catch(console.error);
        setNotification(`SUBIU DE NÍVEL! AGORA VOCÊ É NÍVEL ${newLevel} 🚀`);
      }

      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  const handleLogout = async () => {
    await logoutUser();
    setUserProfile(defaultProfile);
    setActiveTab('home');
    setIsAuthModalOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (userProfile.uid) {
      const result = await deleteUserAccount(userProfile.uid);
      if (result.success) {
        setNotification("Conta excluída com sucesso. Sentiremos sua falta! 😢");
        setTimeout(() => setNotification(null), 5000);
        await handleLogout();
      } else {
        // Handle Requires Recent Login
        if (result.error && result.error.includes('requires-recent-login')) {
          setNotification("⚠️ Por segurança, faça Logout e Login novamente para excluir.");
        } else {
          setNotification("Erro ao excluir conta: " + result.error);
        }
        setTimeout(() => setNotification(null), 8000);
      }
    }
  };

  const handleAuthSuccess = (user) => {
    // Optimistic update, but onAuthStateChanged will confirm
    setUserProfile({ ...user, isLoggedIn: true });
    setIsAuthModalOpen(false);
    // checkInactivity(user); // check on fresh login too if needed
  };

  const handleDailyWorkoutComplete = (xpAmount) => {
    const todayKey = new Date().toISOString().split('T')[0];
    const newHistory = { ...userProfile.workoutHistory };
    newHistory[todayKey] = 'done';

    // Add the lump sum XP
    addXp(xpAmount);

    // Update profile with new history
    updateProfile({ workoutHistory: newHistory });

    // Notify
    setNotification(`Parabéns! Treino do dia concluído! +${xpAmount} XP`);
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

  return (
    <div className="app-container">
      <div className="bg-glow-container">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

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

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onShowTutorial={() => setShowTutorial(true)}
        isLoggedIn={userProfile.isLoggedIn}
        onLogout={handleLogout}
      />

      <main style={{ paddingBottom: activeTab === 'timer' ? 0 : '100px' }}>
        {activeTab === 'home' && (
          userProfile.isLoggedIn ? (
            <RankingSection profile={userProfile} onUpdateProfile={updateProfile} />
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
            onExit={() => {
              setActiveTab('workout');
              setActiveExercise(null);
            }}
            onFinish={() => {
              // If it's a "Daily/For You" exercise, we don't award XP here.
              // We only award XP when the whole set is done in WorkoutsSection.
              if (activeExercise.isDaily) {
                // Auto-mark check
                if (activeExercise.index !== undefined) {
                  setSessionChecks(prev => new Set(prev).add(activeExercise.index));
                }
                setNotification(`Exercício finalizado! ✓`);
                setTimeout(() => setNotification(null), 3000);
                setActiveTab('workout');
                setActiveExercise(null);
                return;
              }

              // If it's a standalone library exercise, award small XP (15)
              addXp(15);
              setNotification(`Exercício concluído! +15 XP`);
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
      </main>

      {/* Auth Modal Global */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => {
            // If forcefully opened due to no session, maybe don't allow close unless logged in?
            // For now allow close to view landing page.
            setIsAuthModalOpen(false);
          }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-nav mobile-only">
        <div className={`mobile - nav - item ${activeTab === 'home' ? 'active' : ''} `} onClick={() => setActiveTab('home')}>
          <span className="icon">🏠</span>
          <span>Início</span>
        </div>
        <div className={`mobile - nav - item ${activeTab === 'workout' ? 'active' : ''} `} onClick={() => setActiveTab('workout')}>
          <span className="icon">💪</span>
          <span>Treino</span>
        </div>
        <div className={`mobile - nav - item ${activeTab === 'diet' ? 'active' : ''} `} onClick={() => setActiveTab('diet')}>
          <span className="icon">🥗</span>
          <span>Dieta</span>
        </div>
        <div className={`mobile - nav - item ${activeTab === 'tracker' ? 'active' : ''} `} onClick={() => setActiveTab('tracker')}>
          <span className="icon">👤</span>
          <span>Perfil</span>
        </div>
        <div className="mobile - nav - item" onClick={() => setShowTutorial(true)} style={{ color: '#D4AF37' }}>
          <span className="icon">?</span>
          <span>Ajuda</span>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default App;

