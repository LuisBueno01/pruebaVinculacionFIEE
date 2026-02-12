import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf"
};

// ==================== INIT ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==================== ELEMENTOS ====================
const form = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");

// ==================== LOGIN ====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 👇 AQUÍ ESTÁ LA CORRECCIÓN
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    mensaje.textContent = "⚠️ Ingresa correo y contraseña";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "../dashboard/index.html";
  } catch (error) {
    console.error(error);
    mensaje.textContent = "❌ Correo o contraseña incorrectos";
  }
});

// ==================== SI YA HAY SESIÓN ====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "../dashboard/index.html";
  }
});
