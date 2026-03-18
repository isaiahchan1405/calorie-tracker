async function mlBuildProfilePayload() {
    const profile = await MealLoggerStore.fetchProfileData();
    const customFoods = await MealLoggerStore.fetchCustomFoods().catch(() => []);
    return {
        version: 1,
        profileName: profile.userGoals && profile.userGoals.profileName ? profile.userGoals.profileName : MealLoggerStore.getActiveProfileKey(),
        userGoals: profile.userGoals || {},
        customFoods: Array.isArray(customFoods) ? customFoods : [],
        mealsByDateKeys: profile.mealsByDate && typeof profile.mealsByDate === 'object' ? profile.mealsByDate : {},
        updatedAt: profile.updatedAt || new Date().toISOString()
    };
}

async function mlApplyProfilePayload(payload) {
    if (!payload || typeof payload !== 'object') return { ok: false, message: 'Invalid payload' };

    const profileData = {
        profileKey: MealLoggerStore.getActiveProfileKey(),
        userGoals: payload.userGoals || {},
        customFoods: Array.isArray(payload.customFoods) ? payload.customFoods : [],
        mealsByDate: payload.mealsByDateKeys && typeof payload.mealsByDateKeys === 'object' ? payload.mealsByDateKeys : {}
    };

    try {
        await MealLoggerStore.saveProfileData(profileData);
        await MealLoggerStore.saveCustomFoods(profileData.customFoods);
        return { ok: true, profileName: profileData.userGoals.profileName || MealLoggerStore.getActiveProfileKey() };
    } catch {
        return { ok: false, message: 'Failed to save payload' };
    }
}

window.MealLoggerProfileSync = {
    getPayload: mlBuildProfilePayload,
    applyPayload: mlApplyProfilePayload
};
