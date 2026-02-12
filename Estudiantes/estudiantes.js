import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* ==================== FIREBASE CONFIG ==================== */

const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf",
  storageBucket: "servicio-social-b80cf.appspot.com",
  messagingSenderId: "350748918799",
  appId: "1:350748918799:web:8989549ab3a5ad7612cf7a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/* ==================== VARIABLES GLOBALES ==================== */

let todosLosAlumnos = [];
let alumnosFiltrados = [];
let alumnoEnEdicion = null;
let archivosTemporales = {
  cv: null,
  ss: [],
  pp: []
};

/* ==================== INICIALIZACIÓN ==================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM cargado completamente");
  
  inicializarTabs();
  inicializarLogout();
  inicializarFormulario();
  inicializarFiltros();
  inicializarAreasSubida();
  cargarAlumnos();
});

/* ==================== TABS ==================== */

function inicializarTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

/* ==================== LOGOUT ==================== */

function inicializarLogout() {
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que deseas salir?")) {
        window.location.href = "../login/index.html";
      }
    });
  }
}

/* ==================== FORMULARIO ==================== */

function inicializarFormulario() {
  const form = document.getElementById("alumnoForm");
  const realizoSS = document.getElementById("realizoSS");
  const realizoPP = document.getElementById("realizoPP");
  const ssSection = document.getElementById("ssSection");
  const ppSection = document.getElementById("ppSection");

  // Mostrar/ocultar secciones condicionales
  realizoSS.addEventListener("change", (e) => {
    if (e.target.value === "En proceso" || e.target.value === "Completado") {
      ssSection.classList.add("active");
    } else {
      ssSection.classList.remove("active");
    }
  });

  realizoPP.addEventListener("change", (e) => {
    if (e.target.value === "En proceso" || e.target.value === "Completado") {
      ppSection.classList.add("active");
    } else {
      ppSection.classList.remove("active");
    }
  });

  // Submit del formulario
  form.addEventListener("submit", guardarAlumno);
}

/* ==================== ÁREAS DE SUBIDA DE ARCHIVOS ==================== */

function inicializarAreasSubida() {
  // CV
  configurarAreaSubida('cv', 'cvUploadArea', 'cvFile', 'cvFileName', false);
  
  // Servicio Social
  configurarAreaSubida('ss', 'ssUploadArea', 'ssFiles', 'ssFilesList', true);
  
  // Prácticas Profesionales
  configurarAreaSubida('pp', 'ppUploadArea', 'ppFiles', 'ppFilesList', true);
}

function configurarAreaSubida(tipo, areaId, inputId, displayId, multiple) {
  const uploadArea = document.getElementById(areaId);
  const fileInput = document.getElementById(inputId);
  const fileDisplay = document.getElementById(displayId);

  if (!uploadArea || !fileInput) return;

  // Click para abrir selector
  uploadArea.addEventListener("click", () => fileInput.click());

  // Prevenir comportamiento por defecto del drag
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
  });

  // Drop de archivos
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    
    const files = e.dataTransfer.files;
    if (multiple) {
      agregarArchivos(tipo, files, fileDisplay);
    } else {
      if (files.length > 0) {
        agregarArchivo(tipo, files[0], fileDisplay);
      }
    }
  });

  // Cambio en input de archivo
  fileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (multiple) {
      agregarArchivos(tipo, files, fileDisplay);
    } else {
      if (files.length > 0) {
        agregarArchivo(tipo, files[0], fileDisplay);
      }
    }
  });
}

function agregarArchivo(tipo, file, displayElement) {
  if (!validarArchivo(file)) return;

  archivosTemporales[tipo] = file;

  displayElement.style.display = "flex";
  displayElement.innerHTML = `
    <div class="file-item-name">
      <span>📄</span>
      <span>${file.name}</span>
      <span style="color: #666; font-size: 0.85em;">(${formatearTamaño(file.size)})</span>
    </div>
    <button type="button" class="file-remove-btn" onclick="removerArchivo('${tipo}')">
      ✕ Quitar
    </button>
  `;
}

function agregarArchivos(tipo, files, displayElement) {
  for (let file of files) {
    if (!validarArchivo(file)) continue;
    
    archivosTemporales[tipo].push(file);

    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.innerHTML = `
      <div class="file-item-name">
        <span>📄</span>
        <span>${file.name}</span>
        <span style="color: #666; font-size: 0.85em;">(${formatearTamaño(file.size)})</span>
      </div>
      <button type="button" class="file-remove-btn" onclick="removerArchivoMultiple('${tipo}', '${file.name}')">
        ✕ Quitar
      </button>
    `;

    displayElement.appendChild(fileItem);
  }
}

function validarArchivo(file) {
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (file.type !== "application/pdf") {
    alert("⚠️ Solo se permiten archivos PDF");
    return false;
  }

  if (file.size > maxSize) {
    alert("⚠️ El archivo es demasiado grande. Tamaño máximo: 5MB");
    return false;
  }

  return true;
}

function formatearTamaño(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

window.removerArchivo = function(tipo) {
  archivosTemporales[tipo] = null;
  const display = document.getElementById(`${tipo}FileName`);
  if (display) {
    display.style.display = "none";
    display.innerHTML = "";
  }
};

window.removerArchivoMultiple = function(tipo, nombre) {
  archivosTemporales[tipo] = archivosTemporales[tipo].filter(f => f.name !== nombre);
  
  const display = document.getElementById(`${tipo}FilesList`);
  const items = display.querySelectorAll(".file-item");
  
  items.forEach(item => {
    if (item.textContent.includes(nombre)) {
      item.remove();
    }
  });
};

/* ==================== SUBIR ARCHIVOS A STORAGE ==================== */

async function subirArchivo(file, ruta, progressBarId, progressTextId) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, ruta);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const progressBar = document.getElementById(progressBarId);
    const progressText = document.getElementById(progressTextId);
    const progressContainer = document.getElementById(progressBarId.replace('Bar', ''));

    if (progressContainer) {
      progressContainer.classList.add('active');
    }

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.round(progress) + '%';
      },
      (error) => {
        console.error("Error subiendo archivo:", error);
        if (progressContainer) progressContainer.classList.remove('active');
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        if (progressContainer) progressContainer.classList.remove('active');
        resolve({
          nombre: file.name,
          url: downloadURL,
          ruta: ruta
        });
      }
    );
  });
}

/* ==================== GUARDAR ALUMNO ==================== */

async function guardarAlumno(e) {
  e.preventDefault();

  try {
    const realizoSS = document.getElementById("realizoSS").value;
    const realizoPP = document.getElementById("realizoPP").value;

    // Validar campos condicionales de SS
    if ((realizoSS === "En proceso" || realizoSS === "Completado") && !document.getElementById("empresaSS").value) {
      alert("⚠️ Debes completar el nombre de la empresa de Servicio Social");
      return;
    }

    // Validar campos condicionales de PP
    if ((realizoPP === "En proceso" || realizoPP === "Completado") && !document.getElementById("empresaPP").value) {
      alert("⚠️ Debes completar el nombre de la empresa de Prácticas Profesionales");
      return;
    }

    // Preparar datos base
    const data = {
      nombreCompleto: document.getElementById("nombreCompleto").value,
      matricula: document.getElementById("matricula").value.toUpperCase(),
      carrera: document.getElementById("carrera").value,
      semestre: parseInt(document.getElementById("semestre").value),
      promedio: parseFloat(document.getElementById("promedio").value) || null,
      fechaNacimiento: document.getElementById("fechaNacimiento").value || null,
      email: document.getElementById("email").value,
      telefono: document.getElementById("telefono").value,
      direccion: document.getElementById("direccion").value || null,
      emergenciaNombre: document.getElementById("emergenciaNombre").value || null,
      emergenciaTelefono: document.getElementById("emergenciaTelefono").value || null,
      realizoSS: realizoSS,
      realizoPP: realizoPP,
      habilidades: document.getElementById("habilidades").value || null,
      idiomas: document.getElementById("idiomas").value || null,
      notas: document.getElementById("notas").value || null
    };

    // Subir CV si existe
    if (archivosTemporales.cv) {
      const cvUrl = await subirArchivo(
        archivosTemporales.cv,
        `alumnos/${data.matricula}/cv/${archivosTemporales.cv.name}`,
        'cvProgressBar',
        'cvProgressText'
      );
      data.cv = cvUrl;
    } else if (alumnoEnEdicion) {
      // Mantener CV existente si estamos editando
      const alumnoRef = doc(db, "alumnos", alumnoEnEdicion);
      const alumnoSnap = await getDoc(alumnoRef);
      if (alumnoSnap.exists() && alumnoSnap.data().cv) {
        data.cv = alumnoSnap.data().cv;
      }
    }

    // Datos de Servicio Social
    if (realizoSS === "En proceso" || realizoSS === "Completado") {
      data.servicioSocial = {
        empresa: document.getElementById("empresaSS").value,
        fechaInicio: document.getElementById("fechaInicioSS").value || null,
        fechaTermino: document.getElementById("fechaTerminoSS").value || null,
        horas: parseInt(document.getElementById("horasSS").value) || null,
        documentos: []
      };

      // Subir documentos de SS
      if (archivosTemporales.ss.length > 0) {
        for (let file of archivosTemporales.ss) {
          const docUrl = await subirArchivo(
            file,
            `alumnos/${data.matricula}/servicio_social/${file.name}`,
            'ssProgressBar',
            'ssProgressText'
          );
          data.servicioSocial.documentos.push(docUrl);
        }
      } else if (alumnoEnEdicion) {
        // Mantener documentos existentes
        const alumnoRef = doc(db, "alumnos", alumnoEnEdicion);
        const alumnoSnap = await getDoc(alumnoRef);
        if (alumnoSnap.exists() && alumnoSnap.data().servicioSocial?.documentos) {
          data.servicioSocial.documentos = alumnoSnap.data().servicioSocial.documentos;
        }
      }
    }

    // Datos de Prácticas Profesionales
    if (realizoPP === "En proceso" || realizoPP === "Completado") {
      data.practicasProfesionales = {
        empresa: document.getElementById("empresaPP").value,
        fechaInicio: document.getElementById("fechaInicioPP").value || null,
        fechaTermino: document.getElementById("fechaTerminoPP").value || null,
        area: document.getElementById("areaPP").value || null,
        documentos: []
      };

      // Subir documentos de PP
      if (archivosTemporales.pp.length > 0) {
        for (let file of archivosTemporales.pp) {
          const docUrl = await subirArchivo(
            file,
            `alumnos/${data.matricula}/practicas_profesionales/${file.name}`,
            'ppProgressBar',
            'ppProgressText'
          );
          data.practicasProfesionales.documentos.push(docUrl);
        }
      } else if (alumnoEnEdicion) {
        // Mantener documentos existentes
        const alumnoRef = doc(db, "alumnos", alumnoEnEdicion);
        const alumnoSnap = await getDoc(alumnoRef);
        if (alumnoSnap.exists() && alumnoSnap.data().practicasProfesionales?.documentos) {
          data.practicasProfesionales.documentos = alumnoSnap.data().practicasProfesionales.documentos;
        }
      }
    }

    // Guardar o actualizar en Firestore
    if (alumnoEnEdicion) {
      const alumnoRef = doc(db, "alumnos", alumnoEnEdicion);
      await updateDoc(alumnoRef, {
        ...data,
        fechaActualizacion: serverTimestamp()
      });
      alert("✅ Alumno actualizado correctamente");
      cancelarEdicion();
    } else {
      data.fechaCreacion = serverTimestamp();
      await addDoc(collection(db, "alumnos"), data);
      alert("✅ Alumno guardado correctamente");
    }

    // Limpiar formulario
    e.target.reset();
    limpiarArchivosTemporales();
    
    // Cambiar a la pestaña de lista
    document.querySelector('[data-tab="lista"]').click();

  } catch (error) {
    console.error("❌ Error guardando alumno:", error);
    alert("❌ Error al guardar: " + error.message);
  }
}

function limpiarArchivosTemporales() {
  archivosTemporales = {
    cv: null,
    ss: [],
    pp: []
  };

  // Limpiar displays
  const cvDisplay = document.getElementById("cvFileName");
  if (cvDisplay) {
    cvDisplay.style.display = "none";
    cvDisplay.innerHTML = "";
  }

  const ssDisplay = document.getElementById("ssFilesList");
  if (ssDisplay) ssDisplay.innerHTML = "";

  const ppDisplay = document.getElementById("ppFilesList");
  if (ppDisplay) ppDisplay.innerHTML = "";

  // Limpiar inputs de archivo
  const cvInput = document.getElementById("cvFile");
  if (cvInput) cvInput.value = "";

  const ssInput = document.getElementById("ssFiles");
  if (ssInput) ssInput.value = "";

  const ppInput = document.getElementById("ppFiles");
  if (ppInput) ppInput.value = "";
}

/* ==================== CARGAR ALUMNOS ==================== */

function cargarAlumnos() {
  const lista = document.getElementById("alumnosList");

  if (!lista) {
    console.error("❌ No se encontró el elemento alumnosList");
    return;
  }

  onSnapshot(collection(db, "alumnos"), (snapshot) => {
    console.log(`📊 Cargando ${snapshot.size} alumnos...`);

    todosLosAlumnos = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      todosLosAlumnos.push({ id, ...data });
    });

    alumnosFiltrados = [...todosLosAlumnos];
    aplicarFiltros();
    actualizarEstadisticas();

  }, (error) => {
    console.error("❌ Error cargando alumnos:", error);
    lista.innerHTML = `
      <div class="empty-state">
        <h3>❌ Error al cargar alumnos</h3>
        <p>${error.message}</p>
      </div>
    `;
  });
}

/* ==================== FILTROS ==================== */

function inicializarFiltros() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroCarrera = document.getElementById("filtroCarrera");
  const filtroSS = document.getElementById("filtroSS");
  const filtroPP = document.getElementById("filtroPP");

  if (filtroNombre) filtroNombre.addEventListener("input", aplicarFiltros);
  if (filtroCarrera) filtroCarrera.addEventListener("change", aplicarFiltros);
  if (filtroSS) filtroSS.addEventListener("change", aplicarFiltros);
  if (filtroPP) filtroPP.addEventListener("change", aplicarFiltros);
}

function aplicarFiltros() {
  const filtroNombre = document.getElementById("filtroNombre")?.value.toLowerCase() || "";
  const filtroCarrera = document.getElementById("filtroCarrera")?.value || "";
  const filtroSS = document.getElementById("filtroSS")?.value || "";
  const filtroPP = document.getElementById("filtroPP")?.value || "";

  alumnosFiltrados = todosLosAlumnos.filter(alumno => {
    const matchNombre = alumno.nombreCompleto?.toLowerCase().includes(filtroNombre) ||
                       alumno.matricula?.toLowerCase().includes(filtroNombre);
    const matchCarrera = !filtroCarrera || alumno.carrera === filtroCarrera;
    const matchSS = !filtroSS || alumno.realizoSS === filtroSS;
    const matchPP = !filtroPP || alumno.realizoPP === filtroPP;

    return matchNombre && matchCarrera && matchSS && matchPP;
  });

  renderizarAlumnos();
  actualizarContadores();
}

window.limpiarFiltros = function() {
  document.getElementById("filtroNombre").value = "";
  document.getElementById("filtroCarrera").value = "";
  document.getElementById("filtroSS").value = "";
  document.getElementById("filtroPP").value = "";
  aplicarFiltros();
};

function actualizarContadores() {
  const countFiltrados = document.getElementById("countFiltrados");
  const countTotal = document.getElementById("countTotal");

  if (countFiltrados) countFiltrados.textContent = alumnosFiltrados.length;
  if (countTotal) countTotal.textContent = todosLosAlumnos.length;
}

/* ==================== RENDERIZAR ALUMNOS ==================== */

function renderizarAlumnos() {
  const lista = document.getElementById("alumnosList");
  if (!lista) return;

  lista.innerHTML = "";

  if (alumnosFiltrados.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <h3>📭 No se encontraron alumnos</h3>
        <p>Intenta ajustar los filtros o registra un nuevo alumno</p>
      </div>
    `;
    return;
  }

  alumnosFiltrados.forEach(alumno => {
    const card = document.createElement("div");
    card.className = "alumno-card";

    // Iconos de carrera
    const carreraIconos = {
      "Mecatronica": "🤖",
      "Informatica": "💻",
      "Electronica y Comunicaciones": "📡"
    };

    card.innerHTML = `
      <div class="alumno-header">
        <div class="alumno-info">
          <h3 class="alumno-nombre">${alumno.nombreCompleto}</h3>
          <p class="alumno-matricula">Matrícula: ${alumno.matricula}</p>
          <p class="alumno-carrera">${carreraIconos[alumno.carrera] || "🎓"} ${alumno.carrera}</p>
          
          <div class="status-badges">
            <span class="status-badge badge-ss-${alumno.realizoSS === 'Completado' ? 'completado' : alumno.realizoSS === 'En proceso' ? 'proceso' : 'no'}">
              ${alumno.realizoSS === 'Completado' ? '✅' : alumno.realizoSS === 'En proceso' ? '🔄' : '❌'} SS: ${alumno.realizoSS}
            </span>
            <span class="status-badge badge-pp-${alumno.realizoPP === 'Completado' ? 'completado' : alumno.realizoPP === 'En proceso' ? 'proceso' : 'no'}">
              ${alumno.realizoPP === 'Completado' ? '✅' : alumno.realizoPP === 'En proceso' ? '🔄' : '❌'} PP: ${alumno.realizoPP}
            </span>
          </div>
        </div>
      </div>

      <div class="alumno-details">
        <div class="detail-item">
          <span class="detail-label">📚 Semestre:</span>
          <span class="detail-value">${alumno.semestre}°</span>
        </div>
        
        ${alumno.promedio ? `
        <div class="detail-item">
          <span class="detail-label">📊 Promedio:</span>
          <span class="detail-value">${alumno.promedio}</span>
        </div>
        ` : ''}

        <div class="detail-item">
          <span class="detail-label">📧 Email:</span>
          <span class="detail-value">${alumno.email}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">📱 Teléfono:</span>
          <span class="detail-value">${alumno.telefono}</span>
        </div>

        ${alumno.fechaNacimiento ? `
        <div class="detail-item">
          <span class="detail-label">🎂 Fecha de Nac.:</span>
          <span class="detail-value">${alumno.fechaNacimiento}</span>
        </div>
        ` : ''}

        ${alumno.direccion ? `
        <div class="detail-item">
          <span class="detail-label">📍 Dirección:</span>
          <span class="detail-value">${alumno.direccion}</span>
        </div>
        ` : ''}
      </div>

      ${alumno.emergenciaNombre || alumno.emergenciaTelefono ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <strong style="color: #f44336;">🚨 Contacto de Emergencia:</strong><br>
        ${alumno.emergenciaNombre ? `<span>${alumno.emergenciaNombre}</span>` : ''}
        ${alumno.emergenciaTelefono ? `<span> - ${alumno.emergenciaTelefono}</span>` : ''}
      </div>
      ` : ''}

      ${alumno.servicioSocial ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <strong style="color: #2196F3;">📘 Servicio Social:</strong><br>
        <span>Empresa: ${alumno.servicioSocial.empresa}</span><br>
        ${alumno.servicioSocial.fechaInicio ? `<span>Inicio: ${alumno.servicioSocial.fechaInicio}</span>` : ''}
        ${alumno.servicioSocial.fechaTermino ? `<span> - Término: ${alumno.servicioSocial.fechaTermino}</span>` : ''}
        ${alumno.servicioSocial.horas ? `<br><span>Horas: ${alumno.servicioSocial.horas}</span>` : ''}
      </div>
      ` : ''}

      ${alumno.practicasProfesionales ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <strong style="color: #2196F3;">💼 Prácticas Profesionales:</strong><br>
        <span>Empresa: ${alumno.practicasProfesionales.empresa}</span><br>
        ${alumno.practicasProfesionales.area ? `<span>Área: ${alumno.practicasProfesionales.area}</span><br>` : ''}
        ${alumno.practicasProfesionales.fechaInicio ? `<span>Inicio: ${alumno.practicasProfesionales.fechaInicio}</span>` : ''}
        ${alumno.practicasProfesionales.fechaTermino ? `<span> - Término: ${alumno.practicasProfesionales.fechaTermino}</span>` : ''}
      </div>
      ` : ''}

      ${alumno.habilidades ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <strong style="color: #555;">💡 Habilidades:</strong><br>
        <span>${alumno.habilidades}</span>
      </div>
      ` : ''}

      ${alumno.idiomas ? `
      <div style="margin-top: 10px;">
        <strong style="color: #555;">🌍 Idiomas:</strong><br>
        <span>${alumno.idiomas}</span>
      </div>
      ` : ''}

      <div class="archivos-section">
        <h4>📎 Archivos</h4>
        ${alumno.cv ? `<a href="${alumno.cv.url}" target="_blank" class="archivo-link">📄 ${alumno.cv.nombre}</a>` : ''}
        ${alumno.servicioSocial?.documentos?.map(doc => 
          `<a href="${doc.url}" target="_blank" class="archivo-link">📘 ${doc.nombre}</a>`
        ).join('') || ''}
        ${alumno.practicasProfesionales?.documentos?.map(doc => 
          `<a href="${doc.url}" target="_blank" class="archivo-link">💼 ${doc.nombre}</a>`
        ).join('') || ''}
        ${!alumno.cv && !alumno.servicioSocial?.documentos?.length && !alumno.practicasProfesionales?.documentos?.length ? 
          '<span style="color: #999;">Sin archivos</span>' : ''}
      </div>

      <div class="alumno-actions">
        <button class="btn-edit" onclick="editarAlumno('${alumno.id}')">
          ✏️ Editar
        </button>
        <button class="btn-delete" onclick="eliminarAlumno('${alumno.id}', '${alumno.nombreCompleto}')">
          🗑️ Eliminar
        </button>
      </div>
    `;

    lista.appendChild(card);
  });
}

/* ==================== EDITAR ALUMNO ==================== */

window.editarAlumno = async function(id) {
  try {
    const alumnoRef = doc(db, "alumnos", id);
    const alumnoSnap = await getDoc(alumnoRef);

    if (!alumnoSnap.exists()) {
      alert("❌ Alumno no encontrado");
      return;
    }

    const data = alumnoSnap.data();
    alumnoEnEdicion = id;

    // Llenar formulario
    document.getElementById("nombreCompleto").value = data.nombreCompleto || "";
    document.getElementById("matricula").value = data.matricula || "";
    document.getElementById("carrera").value = data.carrera || "";
    document.getElementById("semestre").value = data.semestre || "";
    document.getElementById("promedio").value = data.promedio || "";
    document.getElementById("fechaNacimiento").value = data.fechaNacimiento || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("direccion").value = data.direccion || "";
    document.getElementById("emergenciaNombre").value = data.emergenciaNombre || "";
    document.getElementById("emergenciaTelefono").value = data.emergenciaTelefono || "";
    document.getElementById("realizoSS").value = data.realizoSS || "No";
    document.getElementById("realizoPP").value = data.realizoPP || "No";
    document.getElementById("habilidades").value = data.habilidades || "";
    document.getElementById("idiomas").value = data.idiomas || "";
    document.getElementById("notas").value = data.notas || "";

    // Activar secciones condicionales
    const ssSection = document.getElementById("ssSection");
    const ppSection = document.getElementById("ppSection");

    if (data.realizoSS === "En proceso" || data.realizoSS === "Completado") {
      ssSection.classList.add("active");
      document.getElementById("empresaSS").value = data.servicioSocial?.empresa || "";
      document.getElementById("fechaInicioSS").value = data.servicioSocial?.fechaInicio || "";
      document.getElementById("fechaTerminoSS").value = data.servicioSocial?.fechaTermino || "";
      document.getElementById("horasSS").value = data.servicioSocial?.horas || "";
    }

    if (data.realizoPP === "En proceso" || data.realizoPP === "Completado") {
      ppSection.classList.add("active");
      document.getElementById("empresaPP").value = data.practicasProfesionales?.empresa || "";
      document.getElementById("fechaInicioPP").value = data.practicasProfesionales?.fechaInicio || "";
      document.getElementById("fechaTerminoPP").value = data.practicasProfesionales?.fechaTermino || "";
      document.getElementById("areaPP").value = data.practicasProfesionales?.area || "";
    }

    // Cambiar botón
    const submitBtn = document.querySelector('#alumnoForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = "🔄 Actualizar Alumno";
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
    console.error("❌ Error cargando alumno:", error);
    alert("❌ Error: " + error.message);
  }
};

function cancelarEdicion() {
  alumnoEnEdicion = null;

  const submitBtn = document.querySelector('#alumnoForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = "💾 Guardar Alumno";
    submitBtn.style.background = "";
  }

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) cancelBtn.remove();

  document.getElementById("alumnoForm").reset();
  limpiarArchivosTemporales();

  document.getElementById("ssSection").classList.remove("active");
  document.getElementById("ppSection").classList.remove("active");
}

/* ==================== ELIMINAR ALUMNO ==================== */

window.eliminarAlumno = async function(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar a "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, "alumnos", id));
    alert("✅ Alumno eliminado correctamente");
  } catch (error) {
    console.error("❌ Error eliminando alumno:", error);
    alert("❌ Error al eliminar: " + error.message);
  }
};

/* ==================== ESTADÍSTICAS ==================== */

function actualizarEstadisticas() {
  try {
    const totalElement = document.getElementById("totalAlumnos");
    const ssElement = document.getElementById("alumnosSS");
    const ppElement = document.getElementById("alumnosPP");
    const promedioElement = document.getElementById("promedioGeneral");

    if (totalElement) {
      totalElement.textContent = todosLosAlumnos.length;
    }

    const conSS = todosLosAlumnos.filter(a => a.realizoSS === "Completado").length;
    if (ssElement) {
      ssElement.textContent = conSS;
    }

    const conPP = todosLosAlumnos.filter(a => a.realizoPP === "Completado").length;
    if (ppElement) {
      ppElement.textContent = conPP;
    }

    const alumnosConPromedio = todosLosAlumnos.filter(a => a.promedio);
    const sumaPromedios = alumnosConPromedio.reduce((sum, a) => sum + a.promedio, 0);
    const promedioGeneral = alumnosConPromedio.length > 0 
      ? (sumaPromedios / alumnosConPromedio.length).toFixed(2)
      : "N/A";
    
    if (promedioElement) {
      promedioElement.textContent = promedioGeneral;
    }

    generarGraficas();

  } catch (error) {
    console.error("❌ Error actualizando estadísticas:", error);
  }
}

/* ==================== GRÁFICAS ==================== */

function generarGraficas() {
  generarGraficaCarreras();
  generarGraficaSS();
  generarGraficaPP();
}

function generarGraficaCarreras() {
  const container = document.getElementById("chartCarreras");
  if (!container) return;

  const carreras = {};
  todosLosAlumnos.forEach(alumno => {
    const carrera = alumno.carrera || "Sin especificar";
    carreras[carrera] = (carreras[carrera] || 0) + 1;
  });

  let html = '<div style="padding: 10px;">';
  Object.entries(carreras).forEach(([carrera, count]) => {
    const porcentaje = todosLosAlumnos.length > 0
      ? (count / todosLosAlumnos.length * 100).toFixed(1)
      : 0;
    
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

function generarGraficaSS() {
  const container = document.getElementById("chartSS");
  if (!container) return;

  const estados = {
    "No": 0,
    "En proceso": 0,
    "Completado": 0
  };

  todosLosAlumnos.forEach(alumno => {
    const estado = alumno.realizoSS || "No";
    estados[estado] = (estados[estado] || 0) + 1;
  });

  const colores = {
    "No": "#f44336",
    "En proceso": "#ff9800",
    "Completado": "#4CAF50"
  };

  let html = '<div style="padding: 10px;">';
  Object.entries(estados).forEach(([estado, count]) => {
    const porcentaje = todosLosAlumnos.length > 0
      ? (count / todosLosAlumnos.length * 100).toFixed(1)
      : 0;
    
    html += `
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>${estado}</span>
          <strong>${count} (${porcentaje}%)</strong>
        </div>
        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: ${colores[estado]}; height: 100%; width: ${porcentaje}%;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function generarGraficaPP() {
  const container = document.getElementById("chartPP");
  if (!container) return;

  const estados = {
    "No": 0,
    "En proceso": 0,
    "Completado": 0
  };

  todosLosAlumnos.forEach(alumno => {
    const estado = alumno.realizoPP || "No";
    estados[estado] = (estados[estado] || 0) + 1;
  });

  const colores = {
    "No": "#f44336",
    "En proceso": "#ff9800",
    "Completado": "#2196F3"
  };

  let html = '<div style="padding: 10px;">';
  Object.entries(estados).forEach(([estado, count]) => {
    const porcentaje = todosLosAlumnos.length > 0
      ? (count / todosLosAlumnos.length * 100).toFixed(1)
      : 0;
    
    html += `
      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>${estado}</span>
          <strong>${count} (${porcentaje}%)</strong>
        </div>
        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: ${colores[estado]}; height: 100%; width: ${porcentaje}%;"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}
