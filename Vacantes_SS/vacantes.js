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
  getDoc
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
let vacanteEnEdicion = null; // Para saber si estamos editando

/* ==================== FUNCIONALIDAD DE TABS ==================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM cargado completamente");

  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      // Remover active de todos
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));

      // Activar el seleccionado
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
        ofrece: document.getElementById("ofrece").value,
        requisitos: document.getElementById("requisitos").value,
        semestreMin: parseInt(document.getElementById("semestreMin").value) || null,
        fechaLimite: document.getElementById("fechaLimite").value || null,
        estatus: document.getElementById("estatus").value
      };

      if (vacanteEnEdicion) {
        // ACTUALIZAR VACANTE EXISTENTE
        const vacanteRef = doc(db, "vacantes", vacanteEnEdicion);
        await updateDoc(vacanteRef, {
          ...data,
          fechaActualizacion: serverTimestamp()
        });
        alert("✅ Vacante actualizada correctamente");
        cancelarEdicion();
      } else {
        // CREAR NUEVA VACANTE
        data.fechaCreacion = serverTimestamp();
        await addDoc(collection(db, "vacantes"), data);
        alert("✅ Vacante guardada correctamente");
      }

      e.target.reset();
      // Cambiar a la pestaña de lista
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
    
    const vacanteRef = doc(db, "vacantes", id);
    const vacanteSnap = await getDoc(vacanteRef);
    
    if (!vacanteSnap.exists()) {
      alert("❌ Vacante no encontrada");
      return;
    }

    const data = vacanteSnap.data();
    vacanteEnEdicion = id;

    // Llenar el formulario con los datos
    document.getElementById("empresa").value = data.empresa || "";
    document.getElementById("vacantes").value = data.vacantes || 1;
    document.getElementById("modalidad").value = data.modalidad || "Presencial";
    document.getElementById("tieneConvenio").value = data.tieneConvenio || "No";
    document.getElementById("convenioRelacionado").value = data.convenioId || "";
    document.getElementById("ofrece").value = data.ofrece || "";
    document.getElementById("requisitos").value = data.requisitos || "";
    document.getElementById("semestreMin").value = data.semestreMin || "";
    document.getElementById("fechaLimite").value = data.fechaLimite || "";
    document.getElementById("estatus").value = data.estatus || "Disponible";

    // Marcar las carreras seleccionadas
    document.querySelectorAll(".carrera-check").forEach(checkbox => {
      checkbox.checked = data.carreras?.includes(checkbox.value) || false;
    });

    // Cambiar el botón y título
    if (submitBtn) {
      submitBtn.innerHTML = "🔄 Actualizar Vacante";
      submitBtn.style.background = "#ff9800";
    }

    // Agregar botón de cancelar si no existe
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

    // Cambiar a la pestaña del formulario
    document.querySelector('[data-tab="nuevo"]').click();

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    alert("📝 Modo edición activado. Modifica los campos y guarda los cambios.");

  } catch (error) {
    console.error("❌ Error cargando vacante para editar:", error);
    alert("❌ Error al cargar la vacante: " + error.message);
  }
}

/* ==================== CANCELAR EDICIÓN ==================== */

function cancelarEdicion() {
  vacanteEnEdicion = null;
  
  // Restaurar el botón
  if (submitBtn) {
    submitBtn.innerHTML = "💾 Guardar Vacante";
    submitBtn.style.background = "";
  }

  // Eliminar botón de cancelar
  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) {
    cancelBtn.remove();
  }

  // Limpiar formulario
  vacanteForm.reset();
}

/* ==================== MOSTRAR VACANTES ==================== */

const lista = document.getElementById("vacantesList");

if (!lista) {
  console.error("❌ No se encontró el elemento 'vacantesList'");
} else {
  console.log("✅ Elemento vacantesList encontrado");

  onSnapshot(collection(db, "vacantes"), (snapshot) => {
    console.log(`📊 Cargando ${snapshot.size} vacantes...`);

    todasLasVacantes = [];
    lista.innerHTML = "";

    if (snapshot.empty) {
      lista.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <h3>📭 No hay vacantes registradas</h3>
          <p>Crea la primera vacante usando el formulario</p>
        </div>
      `;
      actualizarEstadisticas();
      return;
    }

    snapshot.forEach(docSnap => {
      try {
        const data = docSnap.data();
        const id = docSnap.id;
        todasLasVacantes.push({ id, ...data });

        const card = document.createElement("div");
        card.className = "vacante-card";

        // Validar que carreras sea un array
        const carreras = Array.isArray(data.carreras) 
          ? data.carreras.join(", ") 
          : data.carreras || "No especificado";

        // Iconos de estatus
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
            <button class="btn-edit" onclick="editarVacante('${id}')">
              ✏️ Editar
            </button>
          </div>
        `;

        lista.appendChild(card);
      } catch (error) {
        console.error("❌ Error procesando vacante:", error, docSnap.data());
      }
    });

    actualizarEstadisticas();
    console.log("✅ Vacantes cargadas exitosamente");

  }, (error) => {
    console.error("❌ Error escuchando vacantes:", error);
    lista.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #d32f2f;">
        <h3>❌ Error al cargar vacantes</h3>
        <p>${error.message}</p>
        <p>Verifica las reglas de Firestore</p>
      </div>
    `;
  });
}

/* ==================== HACER FUNCIÓN GLOBAL ==================== */

window.editarVacante = editarVacante;

/* ==================== ESTADÍSTICAS ==================== */

function actualizarEstadisticas() {
  try {
    const totalElement = document.getElementById("totalVacantes");
    const disponiblesElement = document.getElementById("vacantesDisponibles");
    const convenioElement = document.getElementById("vacantesConConvenio");

    if (totalElement) {
      totalElement.textContent = todasLasVacantes.length;
    }

    const disponibles = todasLasVacantes.filter(v =>
      v.estatus === "Disponible"
    ).length;

    if (disponiblesElement) {
      disponiblesElement.textContent = disponibles;
    }

    const conConvenio = todasLasVacantes.filter(v =>
      v.tieneConvenio === "Si"
    ).length;

    if (convenioElement) {
      convenioElement.textContent = conConvenio;
    }

    console.log(`📊 Estadísticas: Total=${todasLasVacantes.length}, Disponibles=${disponibles}, Con Convenio=${conConvenio}`);

  } catch (error) {
    console.error("❌ Error actualizando estadísticas:", error);
  }
}