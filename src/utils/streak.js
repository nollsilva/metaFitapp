// Helper to get local date key (YYYY-MM-DD)
const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculates the current workout streak based ONLY on scheduled days.
 * Rules:
 * - Only days found in `selectedWeekDays` are considered.
 * - Non-scheduled days are ignored (don't break streak, don't add to it).
 * - A missed scheduled day breaks the streak (unless shield is used).
 * - Streak = consecutive scheduled days completed.
 *
 * @param {Object} workoutHistory - The user's workout history object (key: date, value: status).
 * @param {boolean} includeToday - Whether to force include today in the calc (for preview).
 * @param {Array} selectedWeekDays - Array of day keys ['seg', 'ter', ...] determining schedule.
 * @param {boolean} hasShield - Whether the user has an active shield.
 * @returns {number} The current streak.
 */
export const calculateStreak = (workoutHistory, includeToday = false, selectedWeekDays = null, hasShield = false) => {
    if (!workoutHistory) return includeToday ? 1 : 0;

    // Map user days to JS indices (0=Sun, 1=Mon...)
    const dayMap = { 'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6 };
    let scheduledDaysSet = new Set();

    // Default to M-W-F if checked days is empty/null, OR assume all days? 
    // User logic: "so deve incluir os dias que o usuario marcou".
    if (selectedWeekDays && selectedWeekDays.length > 0) {
        scheduledDaysSet = new Set(selectedWeekDays.map(d => dayMap[d]));
    } else {
        // Fallback: If no days selected, maybe treating every day as scheduled is safer for legacy behavior?
        // Or return 0? Let's assume M-W-F default or All Days?
        // Let's assume ALL days to be safe if strictly no schedule is provided, 
        // but typically the app sets a default.
        for (let i = 0; i < 7; i++) scheduledDaysSet.add(i);
    }

    const history = { ...workoutHistory };
    const today = new Date();
    const todayKey = getLocalDateKey(today);

    // If forcing today as done
    if (includeToday) {
        history[todayKey] = 'done';
    }

    let streak = 0;

    // We scan BACKWARDS from TODAY
    let currentDate = new Date(today);

    // Allow ONE miss if shield is active
    let shieldAvailable = hasShield;

    const MAX_DAYS_BACK = 365 * 2; // Check up to 2 years

    for (let i = 0; i < MAX_DAYS_BACK; i++) {
        const key = getLocalDateKey(currentDate);
        const dayIdx = currentDate.getDay(); // 0-6

        const isScheduled = scheduledDaysSet.has(dayIdx);
        const status = history[key];
        const isDone = status === 'done' || status === true || (key === todayKey && includeToday);

        if (isScheduled) {
            if (isDone) {
                // Scheduled AND Done -> Increment Streak
                streak++;
            } else {
                // Scheduled AND NOT Done

                // Special case for TODAY:
                // If it's today, we might not have finished yet.
                // If we are checking "includeToday=true", it's handled above as isDone.
                // If "includeToday=false" (viewing history), missing today shouldn't break 
                // the streak from yesterday immediately (unless day is over, but we are simple here).
                // Actually, if today is scheduled and not done, the streak is simply 0 for today 
                // until done. But we usually want to show "current streak" which implies "streak so far".

                if (key === todayKey) {
                    // If today is scheduled but not done, we don't increment, 
                    // but we also don't break the chain coming from yesterday.
                    // We just continue to check yesterday.
                } else {
                    // PAST scheduled day missed!
                    if (shieldAvailable) {
                        shieldAvailable = false;
                        // Shield saves the streak break, but doesn't add to count.
                        // Continue to check previous days.
                    } else {
                        // Broken! Params: "a contagem zera se o usuario errar um dia"
                        break;
                    }
                }
            }
        } else {
            // Not Scheduled
            // Ignore (Rest Day). Neither increments nor breaks.
        }

        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
};
