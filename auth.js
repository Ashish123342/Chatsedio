import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDTjjxt12p-0CMeey4EjKqiWAz9trGB0kQ",
  authDomain: "tsedio-a122c.firebaseapp.com",
  databaseURL: "https://tsedio-a122c-default-rtdb.firebaseio.com",
  projectId: "tsedio-a122c",
  storageBucket: "tsedio-a122c.firebasestorage.app",
  messagingSenderId: "44533653921",
  appId: "1:44533653921:web:07676dce93af9690136be0",
  measurementId: "G-ZFZG6MBV1X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let userName = null;

// Check if user was previously logged in
window.addEventListener('DOMContentLoaded', () => {
  const savedUid = localStorage.getItem('userUid');
  const savedName = localStorage.getItem('userName');
  
  if (savedUid && savedName) {
    // Auto-login with saved credentials
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('user-name-display').textContent = `Name: ${savedName}`;
    userName = savedName;
    
    // Set up auth state with saved user
    currentUser = { uid: savedUid };
    window.dispatchEvent(new CustomEvent('userAuthenticated', { 
      detail: { user: { uid: savedUid }, userName: savedName } 
    }));
  }
});

// Authentication flow
document.getElementById('signin-btn').addEventListener('click', async () => {
  const nameInput = document.getElementById('name-input').value.trim();
  const errorElement = document.getElementById('error-message');
  const authStatus = document.getElementById('auth-status');

  if (!nameInput) {
    errorElement.textContent = 'Please enter your name';
    return;
  }

  errorElement.textContent = '';
  authStatus.innerHTML = '<div class="loader"></div><p>Signing in...</p>';
  document.getElementById('signin-btn').disabled = true;

  try {
    // Try to sign in anonymously
    const userCredential = await signInAnonymously(auth);
    userName = nameInput;

    // Store user data in Firebase
    await set(ref(db, `users/${userCredential.user.uid}`), {
      uid: userCredential.user.uid,
      name: userName,
      online: true
    });

    // Save to localStorage for auto-login
    localStorage.setItem('userUid', userCredential.user.uid);
    localStorage.setItem('userName', userName);

    // Hide auth screen and show app
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('user-name-display').textContent = `Name: ${userName}`;

    // Set current user
    currentUser = userCredential.user;
    window.dispatchEvent(new CustomEvent('userAuthenticated', { 
      detail: { user: userCredential.user, userName } 
    }));

  } catch (error) {
    console.error('Authentication error:', error);
    errorElement.textContent = `Sign in failed: ${error.message}`;
    authStatus.innerHTML = '';
    document.getElementById('signin-btn').disabled = false;
  }
});

// Profile editing functionality
document.getElementById('edit-profile-btn').addEventListener('click', () => {
  document.getElementById('edit-name-input').value = userName;
  document.getElementById('edit-profile-modal').style.display = 'flex';
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const newName = document.getElementById('edit-name-input').value.trim();
  if (!newName) return;
  
  try {
    await set(ref(db, `users/${currentUser.uid}/name`), newName);
    userName = newName;
    localStorage.setItem('userName', newName);
    document.getElementById('user-name-display').textContent = `Name: ${newName}`;
    document.getElementById('edit-profile-modal').style.display = 'none';
    
    // Notify other components about the name change
    window.dispatchEvent(new CustomEvent('userNameUpdated', { detail: newName }));
  } catch (error) {
    console.error('Error updating name:', error);
  }
});

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('edit-profile-modal').style.display = 'none';
});

// Handle auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // If we don't have a username yet, try to get it from the database
    if (!userName) {
      try {
        const userSnapshot = await get(ref(db, `users/${user.uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          userName = userData.name;
          document.getElementById('user-name-display').textContent = `Name: ${userName}`;
          localStorage.setItem('userUid', user.uid);
          localStorage.setItem('userName', userName);
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    }

    window.dispatchEvent(new CustomEvent('userAuthenticated', { 
      detail: { user, userName } 
    }));
  } else {
    // User is signed out - show auth screen
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('signin-btn').disabled = false;
    document.getElementById('auth-status').innerHTML = '';
    
    // Clear saved credentials
    localStorage.removeItem('userUid');
    localStorage.removeItem('userName');
  }
});

// Export for use in other modules
export { app, auth, db, currentUser, userName };