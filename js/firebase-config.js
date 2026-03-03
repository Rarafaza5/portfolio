// =========================================================
//  FIREBASE CONFIG — replace with your own values!
//  Get these from: Firebase Console → Project Settings → General
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCA2uFUGcJy1BT7l6K_iJOAJLAvpKhdgxQ",
    authDomain: "rafael-diogo.firebaseapp.com",
    databaseURL: "https://rafael-diogo-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rafael-diogo",
    storageBucket: "rafael-diogo.firebasestorage.app",
    messagingSenderId: "393645739677",
    appId: "1:393645739677:web:5ebbdc7232d991206f0e74",
    measurementId: "G-ZXWLFQQCZJ"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
