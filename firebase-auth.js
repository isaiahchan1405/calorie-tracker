// Google Sign-in and Logout with auth state management.

function firebaseLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(() => {
      window.location.href = 'index.html';
    })
    .catch(err => alert('Login failed: ' + err.message));
}

function firebaseLogout() {
  firebase.auth().signOut().then(() => {
    window.location.href = 'login.html';
  }).catch(err => alert('Logout failed: ' + err.message));
}

// Check auth state and redirect to login if not signed in.
firebase.auth().onAuthStateChanged(user => {
  if (!user && !window.location.pathname.includes('login')) {
    window.location.href = 'login.html';
    return;
  }

  if (user && window.location.pathname.includes('login')) {
    window.location.href = 'index.html';
  }
});
