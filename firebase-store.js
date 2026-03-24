// Firestore-backed data layer for authenticated users.

const MealLoggerStore = {
  // Fetch user's profile data (goals and meals) from Firestore.
  async fetchProfileData() {
    const uid = firebase.auth().currentUser.uid;
    const snap = await firebase.firestore().doc(`users/${uid}/profile/main`).get();
    if (!snap.exists) {
      return {
        profileKey: uid,
        userGoals: {},
        mealsByDate: {},
        updatedAt: new Date().toISOString()
      };
    }
    return snap.data();
  },

  // Save profile data (goals and meals) to Firestore.
  async saveProfileData(profileData) {
    const uid = firebase.auth().currentUser.uid;
    profileData.profileKey = uid;
    profileData.updatedAt = new Date().toISOString();
    await firebase.firestore().doc(`users/${uid}/profile/main`).set(profileData);
    return profileData;
  },

  // Fetch custom foods list from Firestore.
  async fetchCustomFoods() {
    const uid = firebase.auth().currentUser.uid;
    const snap = await firebase.firestore().doc(`users/${uid}/customFoods/list`).get();
    return snap.exists ? snap.data().foods || [] : [];
  },

  // Save custom foods list to Firestore.
  async saveCustomFoods(foods) {
    const uid = firebase.auth().currentUser.uid;
    await firebase.firestore().doc(`users/${uid}/customFoods/list`).set({ foods });
    return foods;
  },

  // Return current user's UID as the profile key.
  getActiveProfileKey() {
    return firebase.auth().currentUser.uid;
  },

  // Return default profile structure.
  defaultProfileData(profileKey) {
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
      mealsByDate: {},
      updatedAt: new Date().toISOString()
    };
  }
};
