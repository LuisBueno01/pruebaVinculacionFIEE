import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ==================== FIREBASE CONFIG ==================== */

const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf",
  storageBucket: "servicio-social-b80cf.firebasestorage.app",
  messagingSenderId: "350748918799",
  appId: "1:350748918799:web:8989549ab3a5ad7612cf7a"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ==================== VARIABLES ==================== */

let todasLasVacantes = [];
let vacantesFiltradas = [];
let vacanteEnEdicion = null;

/* ==================== FUNCIONALIDAD DE TABS ==================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM cargado completamente");

  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(tabId).classList.add("active");

      console.log(`Tab activada: ${tabId}`);
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que deseas salir?")) {
        window.location.href = "../login/index.html";
      }
    });
  }

  // Filtros
  const filtroEmpresa = document.getElementById("filtroEmpresa");
  const filtroEstatus = document.getElementById("filtroEstatus");
  const filtroCarrera = document.getElementById("filtroCarrera");

  if (filtroEmpresa) {
    filtroEmpresa.addEventListener("input", aplicarFiltros);
  }
  if (filtroEstatus) {
    filtroEstatus.addEventListener("change", aplicarFiltros);
  }
  if (filtroCarrera) {
    filtroCarrera.addEventListener("change", aplicarFiltros);
  }
});

/* ==================== CARGAR CONVENIOS VIGENTES ==================== */

const convenioSelect = document.getElementById("convenioRelacionado");

if (convenioSelect) {
  const qConvenios = query(
    collection(db, "convenios"),
    where("vigencia", "==", "Vigente")
  );

  onSnapshot(qConvenios, (snapshot) => {
    convenioSelect.innerHTML = `<option value="">Seleccionar convenio</option>`;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = data.nombreEmpresa;
      convenioSelect.appendChild(option);
    });

    console.log(`✅ ${snapshot.size} convenios cargados`);
  }, (error) => {
    console.error("❌ Error cargando convenios:", error);
  });
}

/* ==================== GUARDAR O ACTUALIZAR VACANTE ==================== */

const vacanteForm = document.getElementById("vacanteForm");
const submitBtn = vacanteForm?.querySelector('button[type="submit"]');

if (vacanteForm) {
  vacanteForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const checkboxes = document.querySelectorAll(".carrera-check:checked");
      const carrerasSeleccionadas = Array.from(checkboxes).map(cb => cb.value);

      if (carrerasSeleccionadas.length === 0) {
        alert("⚠️ Debes seleccionar al menos una carrera");
        return;
      }

      const data = {
        empresa: document.getElementById("empresa").value,
        vacantes: parseInt(document.getElementById("vacantes").value),
        modalidad: document.getElementById("modalidad").value,
        carreras: carrerasSeleccionadas,
        tieneConvenio: document.getElementById("tieneConvenio").value,
        convenioId: document.getElementById("convenioRelacionado").value || null,
        area: document.getElementById("area").value || null,
        ofrece: document.getElementById("ofrece").value,
        requisitos: document.getElementById("requisitos").value,
        semestreMin: parseInt(document.getElementById("semestreMin").value) || null,
        duracionMeses: parseInt(document.getElementById("duracionMeses").value) || null,
        horario: document.getElementById("horario").value || null,
        fechaLimite: document.getElementById("fechaLimite").value || null,
        apoyoEconomico: parseFloat(document.getElementById("apoyoEconomico").value) || null,
        estatus: document.getElementById("estatus").value
      };

      if (vacanteEnEdicion) {
        // ACTUALIZAR
        const vacanteRef = doc(db, "vacantes_practicas", vacanteEnEdicion);
        await updateDoc(vacanteRef, {
          ...data,
          fechaActualizacion: serverTimestamp()
        });
        alert("✅ Vacante actualizada correctamente");
        cancelarEdicion();
      } else {
        // CREAR NUEVA
        data.fechaCreacion = serverTimestamp();
        await addDoc(collection(db, "vacantes_practicas"), data);
        alert("✅ Vacante guardada correctamente");
      }

      e.target.reset();
      document.querySelector('[data-tab="lista"]').click();

    } catch (error) {
      console.error("❌ Error guardando/actualizando vacante:", error);
      alert("❌ Error: " + error.message);
    }
  });
}

/* ==================== FUNCIÓN PARA EDITAR VACANTE ==================== */

async function editarVacante(id) {
  try {
    console.log("Editando vacante:", id);
    
    const vacanteRef = doc(db, "vacantes_practicas", id);
    const vacanteSnap = await getDoc(vacanteRef);
    
    if (!vacanteSnap.exists()) {
      alert("❌ Vacante no encontrada");
      return;
    }

    const data = vacanteSnap.data();
    vacanteEnEdicion = id;

    // Llenar el formulario
    document.getElementById("empresa").value = data.empresa || "";
    document.getElementById("vacantes").value = data.vacantes || 1;
    document.getElementById("modalidad").value = data.modalidad || "Presencial";
    document.getElementById("tieneConvenio").value = data.tieneConvenio || "No";
    document.getElementById("convenioRelacionado").value = data.convenioId || "";
    document.getElementById("area").value = data.area || "";
    document.getElementById("ofrece").value = data.ofrece || "";
    document.getElementById("requisitos").value = data.requisitos || "";
    document.getElementById("semestreMin").value = data.semestreMin || "";
    document.getElementById("duracionMeses").value = data.duracionMeses || "";
    document.getElementById("horario").value = data.horario || "";
    document.getElementById("fechaLimite").value = data.fechaLimite || "";
    document.getElementById("apoyoEconomico").value = data.apoyoEconomico || "";
    document.getElementById("estatus").value = data.estatus || "Disponible";

    // Marcar carreras
    document.querySelectorAll(".carrera-check").forEach(checkbox => {
      checkbox.checked = data.carreras?.includes(checkbox.value) || false;
    });

    // Cambiar botón
    if (submitBtn) {
      submitBtn.innerHTML = "🔄 Actualizar Vacante";
      submitBtn.style.background = "#ff9800";
    }

    // Botón cancelar
    let cancelBtn = document.getElementById("cancelEditBtn");
    if (!cancelBtn) {
      cancelBtn = document.createElement("button");
      cancelBtn.id = "cancelEditBtn";
      cancelBtn.type = "button";
      cancelBtn.className = "btn-secondary";
      cancelBtn.innerHTML = "❌ Cancelar Edición";
      cancelBtn.style.marginLeft = "10px";
      cancelBtn.addEventListener("click", cancelarEdicion);
      submitBtn.parentElement.appendChild(cancelBtn);
    }

    document.querySelector('[data-tab="nuevo"]').click();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    alert("📝 Modo edición activado");

  } catch (error) {
    console.error("❌ Error cargando vacante:", error);
    alert("❌ Error: " + error.message);
  }
}

/* ==================== ELIMINAR VACANTE ==================== */

async function eliminarVacante(id, empresa) {
  if (!confirm(`¿Estás seguro de eliminar la vacante de "${empresa}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, "vacantes_practicas", id));
    alert("✅ Vacante eliminada correctamente");
  } catch (error) {
    console.error("❌ Error eliminando vacante:", error);
    alert("❌ Error al eliminar: " + error.message);
  }
}

/* ==================== CANCELAR EDICIÓN ==================== */

function cancelarEdicion() {
  vacanteEnEdicion = null;
  
  if (submitBtn) {
    submitBtn.innerHTML = "💾 Guardar Vacante";
    submitBtn.style.background = "";
  }

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) {
    cancelBtn.remove();
  }

  vacanteForm.reset();
}

/* ==================== MOSTRAR VACANTES ==================== */

const lista = document.getElementById("vacantesList");

if (lista) {
  onSnapshot(collection(db, "vacantes_practicas"), (snapshot) => {
    console.log(`📊 Cargando ${snapshot.size} vacantes...`);

    todasLasVacantes = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      todasLasVacantes.push({ id, ...data });
    });

    vacantesFiltradas = [...todasLasVacantes];
    aplicarFiltros();
    actualizarEstadisticas();

  }, (error) => {
    console.error("❌ Error escuchando vacantes:", error);
    lista.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #d32f2f;">
        <h3>❌ Error al cargar vacantes</h3>
        <p>${error.message}</p>
      </div>
    `;
  });
}

/* ==================== APLICAR FILTROS ==================== */

function aplicarFiltros() {
  const filtroEmpresa = document.getElementById("filtroEmpresa")?.value.toLowerCase() || "";
  const filtroEstatus = document.getElementById("filtroEstatus")?.value || "";
  const filtroCarrera = document.getElementById("filtroCarrera")?.value || "";

  vacantesFiltradas = todasLasVacantes.filter(v => {
    const matchEmpresa = v.empresa?.toLowerCase().includes(filtroEmpresa);
    const matchEstatus = !filtroEstatus || v.estatus === filtroEstatus;
    const matchCarrera = !filtroCarrera || v.carreras?.includes(filtroCarrera);

    return matchEmpresa && matchEstatus && matchCarrera;
  });

  renderizarVacantes();
}

/* ==================== RENDERIZAR VACANTES ==================== */

function renderizarVacantes() {
  if (!lista) return;

  lista.innerHTML = "";

  if (vacantesFiltradas.length === 0) {
    lista.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <h3>📭 No se encontraron vacantes</h3>
        <p>Intenta ajustar los filtros o crea una nueva vacante</p>
      </div>
    `;
    return;
  }

  vacantesFiltradas.forEach(data => {
    const card = document.createElement("div");
    card.className = "vacante-card";

    const carreras = Array.isArray(data.carreras) 
      ? data.carreras.join(", ") 
      : data.carreras || "No especificado";

    const estatusIcons = {
      "Disponible": "🟢",
      "En revisión": "🟡",
      "Cerrada": "🔴"
    };

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
        <h3 style="margin: 0;">${data.empresa || "Sin nombre"}</h3>
        <span class="badge ${data.tieneConvenio === "Si" ? "convenio-si" : "convenio-no"}">
          ${data.tieneConvenio === "Si" ? "✅ Convenio" : "❌ Sin Convenio"}
        </span>
      </div>
      
      <p><strong>📊 Vacantes disponibles:</strong> ${data.vacantes || 0}</p>
      <p><strong>🎓 Carreras:</strong> ${carreras}</p>
      <p><strong>📍 Modalidad:</strong> ${data.modalidad || "No especificado"}</p>
      
      ${data.area ? `<p><strong>🏢 Área:</strong> ${data.area}</p>` : ''}
      ${data.duracionMeses ? `<p><strong>⏱️ Duración:</strong> ${data.duracionMeses} meses</p>` : ''}
      ${data.horario ? `<p><strong>🕐 Horario:</strong> ${data.horario}</p>` : ''}
      ${data.apoyoEconomico ? `<p><strong>💰 Apoyo económico:</strong> $${data.apoyoEconomico.toLocaleString('es-MX')}</p>` : ''}
      
      <p><strong>💼 Ofrece:</strong> ${data.ofrece || "No especificado"}</p>
      <p><strong>📋 Requisitos:</strong> ${data.requisitos || "No especificado"}</p>
      
      ${data.semestreMin ? `<p><strong>📚 Semestre mínimo:</strong> ${data.semestreMin}</p>` : ''}
      ${data.fechaLimite ? `<p><strong>📅 Fecha límite:</strong> ${data.fechaLimite}</p>` : ''}
      
      <p style="margin-top: 15px;">
        <strong>Estado:</strong> 
        <span style="font-size: 1.1em;">
          ${estatusIcons[data.estatus] || "⚪"} ${data.estatus || "No especificado"}
        </span>
      </p>

      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button class="btn-edit" onclick="editarVacante('${data.id}')">
          ✏️ Editar
        </button>
        <button class="btn-delete" onclick="eliminarVacante('${data.id}', '${data.empresa}')">
          🗑️ Eliminar
        </button>
      </div>
    `;

    lista.appendChild(card);
  });
}

/* ==================== ESTADÍSTICAS ==================== */

function actualizarEstadisticas() {
  try {
    const totalElement = document.getElementById("totalVacantes");
    const disponiblesElement = document.getElementById("vacantesDisponibles");
    const convenioElement = document.getElementById("vacantesConConvenio");
    const plazasElement = document.getElementById("totalPlazas");

    if (totalElement) {
      totalElement.textContent = todasLasVacantes.length;
    }

    const disponibles = todasLasVacantes.filter(v => v.estatus === "Disponible").length;
    if (disponiblesElement) {
      disponiblesElement.textContent = disponibles;
    }

    const conConvenio = todasLasVacantes.filter(v => v.tieneConvenio === "Si").length;
    if (convenioElement) {
      convenioElement.textContent = conConvenio;
    }

    const totalPlazas = todasLasVacantes.reduce((sum, v) => sum + (v.vacantes || 0), 0);
    if (plazasElement) {
      plazasElement.textContent = totalPlazas;
    }

    // Gráficas simples
    generarGraficaCarreras();
    generarGraficaModalidad();

  } catch (error) {
    console.error("❌ Error actualizando estadísticas:", error);
  }
}

/* ==================== GRÁFICAS SIMPLES ==================== */

function generarGraficaCarreras() {
  const container = document.getElementById("chartCarreras");
  if (!container) return;

  const carreras = {};
  todasLasVacantes.forEach(v => {
    if (Array.isArray(v.carreras)) {
      v.carreras.forEach(carrera => {
        carreras[carrera] = (carreras[carrera] || 0) + 1;
      });
    }
  });

  let html = '<div style="padding: 10px;">';
  Object.entries(carreras).forEach(([carrera, count]) => {
    const porcentaje = (count / todasLasVacantes.length * 100).toFixed(1);
    html += `
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>${carrera}</span>
          <strong>${count} (${porcentaje}%)</strong>
        </div>
        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: #2196F3; height: 100%; width: ${porcentaje}%;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function generarGraficaModalidad() {
  const container = document.getElementById("chartModalidad");
  if (!container) return;

  const modalidades = {};
  todasLasVacantes.forEach(v => {
    const mod = v.modalidad || "No especificado";
    modalidades[mod] = (modalidades[mod] || 0) + 1;
  });

  let html = '<div style="padding: 10px;">';
  Object.entries(modalidades).forEach(([modalidad, count]) => {
    const porcentaje = (count / todasLasVacantes.length * 100).toFixed(1);
    html += `
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>${modalidad}</span>
          <strong>${count} (${porcentaje}%)</strong>
        </div>
        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: #4CAF50; height: 100%; width: ${porcentaje}%;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

/* ==================== FUNCIONES GLOBALES ==================== */

window.editarVacante = editarVacante;
window.eliminarVacante = eliminarVacante;