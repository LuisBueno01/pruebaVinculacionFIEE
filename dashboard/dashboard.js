import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Proteger página
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../auth/login.html";
  }
});

// Logout
document.getElementById("logout").onclick = () => {
  signOut(auth).then(() => {
    window.location.href = "../auth/login.html";
  });
};
