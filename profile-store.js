function getActiveProfileName() {
    const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');
    if (authUser && authUser.email) return authUser.email;

    return 'default';
}

function normalizeProfileKey(name) {
    return (name || 'default').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '') || 'default';
}

function getActiveProfileKey() {
    return normalizeProfileKey(getActiveProfileName());
}

function defaultProfileData(profileKey) {
    return {
        profileKey,
        userGoals: {
            profileName: profileKey,
            age: null,
            sex: 'male',
            weight: null,
            height: null,
            activity: 1.55,
            calories: 2000,
            protein: 50,
            carbs: 260,
            fat: 78,
            fibre: 30
        },
        mealsByDate: {}
    };
}

async function fetchProfileData() {
    const profileKey = getActiveProfileKey();
    const res = await fetch('/api/profiles/' + encodeURIComponent(profileKey));
    if (!res.ok) throw new Error('Failed to load profile data');
    const data = await res.json();
    return data && typeof data === 'object' ? data : defaultProfileData(profileKey);
}

async function saveProfileData(profileData) {
    const profileKey = getActiveProfileKey();
    const res = await fetch('/api/profiles/' + encodeURIComponent(profileKey), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData || defaultProfileData(profileKey))
    });
    if (!res.ok) throw new Error('Failed to save profile data');
    return res.json();
}

async function fetchCustomFoods() {
    const res = await fetch('/api/custom-foods');
    if (!res.ok) throw new Error('Failed to load custom foods');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

async function saveCustomFoods(customFoods) {
    const res = await fetch('/api/custom-foods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(customFoods) ? customFoods : [])
    });
    if (!res.ok) throw new Error('Failed to save custom foods');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

window.MealLoggerStore = {
    getActiveProfileName,
    getActiveProfileKey,
    fetchProfileData,
    saveProfileData,
    defaultProfileData,
    fetchCustomFoods,
    saveCustomFoods
};
