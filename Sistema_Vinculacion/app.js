import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

// ==================== FIREBASE DESDE CDN ====================
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";


// ==================== CONFIGURACIÓN FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf",
  storageBucket: "servicio-social-b80cf.firebasestorage.app",
  messagingSenderId: "350748918799",
  appId: "1:350748918799:web:8989549ab3a5ad7612cf7a"
};

// ==================== INICIALIZAR FIREBASE ====================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== VARIABLES GLOBALES ====================
let todosLosRegistros = [];
let registrosFiltrados = [];
let registroActual = null;

// ==================== NAVEGACIÓN DE PESTAÑAS ====================
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;

    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(targetTab).classList.add("active");

    if (targetTab === "lista") {
      mostrarRegistros();
      actualizarContador();
    }

    if (targetTab === "estadisticas") {
      actualizarEstadisticas();
    }
  });
});


// ==================== GUARDAR FOLIO ====================
const folioForm = document.getElementById("folioForm");
const mensaje = document.getElementById("mensaje");

folioForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const folio = document.getElementById("folio").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const dependencia = document.getElementById("dependencia").value.trim();
  const carrera = document.getElementById("carrera").value.trim();

  try {
    await addDoc(collection(db, "folios"), {
      folio,
      nombre,
      dependencia,
      carrera,
      fecha: serverTimestamp()
    });

    mostrarMensaje(" Folio guardado correctamente", "success");
    folioForm.reset();

    setTimeout(() => {
      document.querySelector('[data-tab="lista"]').click();
    }, 1200);

  } catch (error) {
    mostrarMensaje(" Error al guardar: " + error.message, "error");
  }
});

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo;
  mensaje.style.display = "block";

  setTimeout(() => mensaje.style.display = "none", 4000);
}

// ==================== CARGA EN TIEMPO REAL ====================
const q = query(
  collection(db, "folios"),
  orderBy("fecha", "desc")
);

onSnapshot(q, (snapshot) => {
  todosLosRegistros = [];

  snapshot.forEach((docSnap) => {
    todosLosRegistros.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  registrosFiltrados = [...todosLosRegistros];
  mostrarRegistros();
  actualizarFiltroCarreras();
  actualizarContador();
  actualizarEstadisticas();
});

// ==================== MOSTRAR REGISTROS ====================
function mostrarRegistros() {
  const lista = document.getElementById("registrosList");

  if (registrosFiltrados.length === 0) {
    lista.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📭</div>
        <p>No se encontraron registros</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = "";
  registrosFiltrados.forEach(registro => {
    const fecha = registro.fecha
      ? new Date(registro.fecha.seconds * 1000).toLocaleString("es-MX")
      : "Sin fecha";

    const div = document.createElement("div");
    div.className = "registro-item";
    div.innerHTML = `
      <div class="registro-header">
        <span class="registro-folio">${registro.folio}</span>
        <span class="registro-fecha">${fecha}</span>
      </div>
      <div class="registro-nombre">${registro.nombre}</div>
      <div class="registro-info">
        <span>🏢 ${registro.dependencia}</span>
        <span>🎓 ${registro.carrera}</span>
      </div>
    `;

    div.addEventListener("click", () => abrirModal(registro));
    lista.appendChild(div);
  });
}

// ==================== FILTROS ====================
const searchInput = document.getElementById("searchInput");
const filterCarrera = document.getElementById("filterCarrera");
const sortBy = document.getElementById("sortBy");

searchInput.addEventListener("input", aplicarFiltros);
filterCarrera.addEventListener("change", aplicarFiltros);
sortBy.addEventListener("change", aplicarFiltros);

function aplicarFiltros() {
  const texto = searchInput.value.toLowerCase();
  const carreraSel = filterCarrera.value;

  registrosFiltrados = todosLosRegistros.filter(r =>
    (r.folio + r.nombre + r.carrera).toLowerCase().includes(texto) &&
    (!carreraSel || r.carrera === carreraSel)
  );

  mostrarRegistros();
  actualizarContador();
}

function actualizarFiltroCarreras() {
  const select = filterCarrera;
  const carreras = [...new Set(todosLosRegistros.map(r => r.carrera))].sort();

  select.innerHTML = `<option value="">Todas las carreras</option>`;
  carreras.forEach(c => {
    const op = document.createElement("option");
    op.value = c;
    op.textContent = c;
    select.appendChild(op);
  });
}

function actualizarContador() {
  document.getElementById("recordCount").textContent =
    `${registrosFiltrados.length} de ${todosLosRegistros.length} registros`;
}

// ==================== MODAL ====================
const modal = document.getElementById("modal");
const closeModal = document.querySelector(".close");
const btnEdit = document.getElementById("btnEdit");
const btnDelete = document.getElementById("btnDelete");

closeModal.onclick = () => cerrarModal();
window.onclick = e => { if (e.target === modal) cerrarModal(); };

function abrirModal(registro) {
  registroActual = registro;

  document.getElementById("modalBody").innerHTML = `
    <p><strong>Folio:</strong> ${registro.folio}</p>
    <p><strong>Nombre:</strong> ${registro.nombre}</p>
    <p><strong>Dependencia:</strong> ${registro.dependencia}</p>
    <p><strong>Carrera:</strong> ${registro.carrera}</p>
  `;

  modal.style.display = "block";
}

function cerrarModal() {
  modal.style.display = "none";
  registroActual = null;
}

// ==================== EDITAR ====================
btnEdit.onclick = async () => {
  if (!registroActual) return;

  const nombre = prompt("Nuevo nombre:", registroActual.nombre);
  if (!nombre) return;

  const dependencia = prompt("Nueva dependencia:", registroActual.dependencia);
  if (!dependencia) return;

  const carrera = prompt("Nueva carrera:", registroActual.carrera);
  if (!carrera) return;

  await updateDoc(doc(db, "folios", registroActual.id), {
    nombre,
    dependencia,
    carrera
  });

  cerrarModal();
};

// ==================== ELIMINAR ====================
btnDelete.onclick = async () => {
  if (!registroActual) return;

  if (confirm(`¿Eliminar folio ${registroActual.folio}?`)) {
    await deleteDoc(doc(db, "folios", registroActual.id));
    cerrarModal();
  }
};

// ==================== ESTADÍSTICAS ====================
function actualizarEstadisticas() {
  document.getElementById("totalRegistros").textContent = todosLosRegistros.length;
  document.getElementById("totalCarreras").textContent =
    new Set(todosLosRegistros.map(r => r.carrera)).size;
  document.getElementById("totalDependencias").textContent =
    new Set(todosLosRegistros.map(r => r.dependencia)).size;
}

console.log("✅ Sistema de Folios conectado correctamente a Firebase");
