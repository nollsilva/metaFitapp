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
import { sendRankUpEmail } from './utils/email';
import { getRankTitle } from './utils/rankingSystem';
import { getBadgeConfig } from './components/BadgeIcons';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; // Added imports
import { db } from './lib/firebase'; // Ensure db is imported
import './index.css';

import RunMode from './components/RunMode';
import BottomNav from './components/BottomNav';
import HamburgerMenu from './components/HamburgerMenu';

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
    gender: 'male',
    activityLevel: '1.55',
    goal: 'maintain',
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
    friendRequestsAccepted: []
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

      setUserProfile(prev => ({
        ...prev,
        xp: newXp,
        level: newLevel,
        lastMissedCheck: new Date().toISOString()
      }));

      setNotification(`Você perdeu ${penalty} XP por perder ${missedCount} dia(s) de treino! 😢`);
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
            setUserProfile(prev => ({
              ...prev,
              ...data,
              isLoggedIn: true,
              uid: user.uid
            }));
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

  const updateProfile = (newData) => {
    setUserProfile(prev => ({ ...prev, ...newData }));
  };

  const addXp = (amount) => {
    setUserProfile(prev => {
      const newXp = (prev.xp || 0) + amount;
      const newLevel = Math.floor(newXp / 1000) + 1;

      if (newLevel > (prev.level || 1)) {
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
    setUserProfile({ ...user, isLoggedIn: true });
    setIsAuthModalOpen(false);
  };

  const handleDailyWorkoutComplete = (xpAmount) => {
    const todayKey = new Date().toISOString().split('T')[0];
    const newHistory = { ...userProfile.workoutHistory };
    newHistory[todayKey] = 'done';

    addXp(xpAmount);
    updateProfile({ workoutHistory: newHistory });

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
        onOpenHamburger={() => setIsHamburgerOpen(true)} // Added
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
              if (activeExercise.isDaily) {
                if (activeExercise.index !== undefined) {
                  setSessionChecks(prev => new Set(prev).add(activeExercise.index));
                }
                setNotification(`Exercício finalizado! ✓`);
                setTimeout(() => setNotification(null), 3000);
                setActiveTab('workout');
                setActiveExercise(null);
                return;
              }

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

        {activeTab === 'run' && (
          <RunMode profile={userProfile} onAddXp={addXp} />
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
    </div>
  );
}

export default App;

