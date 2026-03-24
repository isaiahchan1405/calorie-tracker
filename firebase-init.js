// Initialize Firebase with your project config.
const firebaseConfig = {
  apiKey: "AIzaSyCO9xQ3hzsWBih6yVcIVim2geXxKQpwV3Y",
  authDomain: "meallogger-36048.firebaseapp.com",
  projectId: "meallogger-36048",
  storageBucket: "meallogger-36048.appspot.com",
  messagingSenderId: "641539943428",
  appId: "1:641539943428:web:6c1affdeb5fe495d521951"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();
