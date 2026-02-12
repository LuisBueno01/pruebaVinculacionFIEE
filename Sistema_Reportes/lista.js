import { getAuth, onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = getAuth();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../auth/login.html";
  }
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const lista = document.getElementById("reportesList");
const modal = document.getElementById("modal");
const detalle = document.getElementById("detalleReporte");
const historialDiv = document.getElementById("historial");
const filterEstatus = document.getElementById("filterEstatus");

let reporteActual = null;

// ==================== CARGAR REPORTES ====================
const q = query(collection(db, "reportes"), orderBy("fecha", "desc"));

onSnapshot(q, snap => {
  lista.innerHTML = "";
  snap.forEach(docSnap => {
    const r = { id: docSnap.id, ...docSnap.data() };
    if (filterEstatus.value && r.estatus !== filterEstatus.value) return;

    const div = document.createElement("div");
    div.className = `reporte-card ${estadoClase(r.estatus)}`;
    div.innerHTML = `
      <strong>${r.nombre}</strong><br>
      ${r.tipo} | ${r.estatus}<br>
      ${r.detalles.substring(0, 80)}...
    `;
    div.onclick = () => abrirModal(r);
    lista.appendChild(div);
  });
});

filterEstatus.onchange = () => location.reload();

// ==================== MODAL ====================
function abrirModal(reporte) {
  reporteActual = reporte;
  modal.style.display = "block";

  detalle.innerHTML = `
    <p><strong>Nombre:</strong> ${reporte.nombre}</p>
    <p><strong>Contacto:</strong> ${reporte.contacto}</p>
    <p><strong>Detalles:</strong> ${reporte.detalles}</p>
  `;

  document.getElementById("nuevoEstatus").value = reporte.estatus;
  cargarHistorial(reporte.actualizaciones || []);
}

function cargarHistorial(arr) {
  historialDiv.innerHTML = "";
  if (!arr.length) {
    historialDiv.innerHTML = "<p>Sin actualizaciones</p>";
    return;
  }

  arr.forEach(a => {
    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>${a.estatus}</strong> - ${new Date(a.fecha.seconds*1000).toLocaleString()}</p>
      <p>${a.texto}</p>
      <hr>
    `;
    historialDiv.appendChild(div);
  });
}

document.querySelector(".close").onclick = () => modal.style.display = "none";

// ==================== ACTUALIZAR ====================
document.getElementById("btnActualizar").onclick = async () => {
  const nuevoEstatus = document.getElementById("nuevoEstatus").value;
  const texto = document.getElementById("observacion").value.trim();
  if (!texto) return alert("Escribe una observación");

  await updateDoc(doc(db, "reportes", reporteActual.id), {
    estatus: nuevoEstatus,
    actualizaciones: arrayUnion({
      texto,
      estatus: nuevoEstatus,
      fecha: serverTimestamp()
    })
  });

  modal.style.display = "none";
};

function estadoClase(e) {
  if (e === "Recibido") return "recibido";
  if (e === "En atención") return "atencion";
  return "resuelto";
}
