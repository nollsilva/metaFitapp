// Helper to get local date key (YYYY-MM-DD)
const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculates the current workout streak based on scheduled days and shield.
 * @param {Object} workoutHistory - The user's workout history object (key: date, value: status).
 * @param {boolean} includeToday - Whether to force include today in the calc.
 * @param {Array} selectedWeekDays - Array of day keys ['seg', 'ter', ...] determining schedule.
 * @param {boolean} hasShield - Whether the user has an active shield to prevent streak reset.
 * @returns {number} The current streak in days.
 */
export const calculateStreak = (workoutHistory, includeToday = false, selectedWeekDays = null, hasShield = false) => {
    if (!workoutHistory) return includeToday ? 1 : 0;

    // Map user days to JS indices (0=Sun, 1=Mon...)
    const dayMap = { 'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6 };
    let scheduledDaysSet = null;

    if (selectedWeekDays && selectedWeekDays.length > 0) {
        // Create a Set of integers representing scheduled days
        scheduledDaysSet = new Set(selectedWeekDays.map(d => dayMap[d]));
    }

    // Clone history to read safely
    const history = { ...workoutHistory };
    const today = new Date();
    const todayKey = getLocalDateKey(today);

    // If forcing today as done
    if (includeToday) {
        history[todayKey] = 'done';
    }

    let streak = 0;

    // We start checking from TODAY backwards
    let currentDate = new Date(today);

    // Allow ONE miss if shield is active (only for the most recent break)
    let shieldAvailable = hasShield;

    // Loop Limit (safety)
    const MAX_DAYS_BACK = 730; // 2 years

    for (let i = 0; i < MAX_DAYS_BACK; i++) {
        // Get key and day index for current check date
        const key = getLocalDateKey(currentDate);
        const dayIdx = currentDate.getDay(); // 0-6

        // 1. Determine if this day requires a workout
        // If no schedule set, assume EVERY day is scheduled (classic streak)
        const isScheduled = scheduledDaysSet ? scheduledDaysSet.has(dayIdx) : true;

        // 2. Check status
        // status could be 'done', true, or simply present
        const status = history[key];
        const isDone = status === 'done' || status === true || (key === todayKey && includeToday);

        if (isDone) {
            // Worked out! Increment streak.
            streak++;
        } else {
            // NOT DONE

            if (isScheduled) {
                // Was scheduled but missed.

                // Special handling for TODAY:
                // If today is scheduled but not done, and we are just checking (not finishing),
                // it shouldn't break the streak from yesterday.
                // However, it doesn't add to the streak.
                if (key === todayKey) {
                    // Just continue to yesterday without breaking or incrementing.
                    // This allows streak to persist until end of day.
                } else {
                    // Past scheduled day missed.
                    if (shieldAvailable) {
                        // Shield Used! 
                        // Streak is maintained (not broken), but we don't increment for a missed day.
                        shieldAvailable = false;
                        // Continue to previous day...
                    } else {
                        // No shield, streak broken.
                        break;
                    }
                }
            } else {
                // Not scheduled AND not done.
                // Just a rest day. Continue without breaking.
            }
        }

        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
};
