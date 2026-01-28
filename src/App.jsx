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
import { MESSAGES } from './utils/messages';

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import './index.css';

import RunMode from './components/RunMode';
import BottomNav from './components/BottomNav';
import HamburgerMenu from './components/HamburgerMenu';
import DailyBonus from './components/DailyBonus';
import NotificationSystem from './components/NotificationSystem'; // Imported
import NotificationPermissionModal from './components/NotificationPermissionModal'; // Imported
import NotificationsScreen from './components/NotificationsScreen'; // Imported

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
        setNotification(MESSAGES.XP.LEVEL_UP(newLevel));
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

    addXp(xpAmount);
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
    if (userProfile.isLoggedIn && !userProfile.fcmToken) {
      // Check if user has dismissed it this session or permanently? User request says "No login"
      // We can store a local flag to not annoy them every refresh if they clicked "Not Now"
      const hasDismissed = sessionStorage.getItem('metafit_notif_dismissed');
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

      {/* Notification Permission Modal */}
      {showNotificationModal && (
        <NotificationPermissionModal
          profile={userProfile}
          onClose={() => {
            setShowNotificationModal(false);
            sessionStorage.setItem('metafit_notif_dismissed', 'true');
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
                setNotification(MESSAGES.WORKOUT.FINISHED_EXERCISE);
                setTimeout(() => setNotification(null), 3000);
                setActiveTab('workout');
                setActiveExercise(null);
                return;
              }

              addXp(15);
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
    </div>
  );
}

export default App;

