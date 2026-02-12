

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// Variables globales
let todosLosReportes = [];
let reportesFiltrados = [];
let reporteActual = null;

// ========== NAVEGACIÓN DE PESTAÑAS ==========
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
    
    if (targetTab === 'estadisticas') {
      actualizarEstadisticas();
    }
  });
});

// ========== GUARDAR NUEVO REPORTE ==========
const reporteForm = document.getElementById('reporteForm');
const mensaje = document.getElementById('mensaje');

reporteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nombre = document.getElementById('nombre').value.trim();
  const tipo = document.getElementById('tipo').value;
  const contacto = document.getElementById('contacto').value.trim();
  const detalles = document.getElementById('detalles').value.trim();
  const estatus = document.getElementById('estatus').value;
  const prioridad = document.getElementById('prioridad').value;
  
  try {
    await db.collection('reportes').add({
      nombre: nombre,
      tipo: tipo,
      contacto: contacto,
      detalles: detalles,
      estatus: estatus,
      prioridad: prioridad,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarMensaje('✅ Reporte guardado exitosamente', 'success');
    reporteForm.reset();
    
    setTimeout(() => {
      document.querySelector('[data-tab="lista"]').click();
    }, 1500);
    
  } catch (error) {
    mostrarMensaje('❌ Error al guardar: ' + error.message, 'error');
    console.error('Error:', error);
  }
});

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo;
  mensaje.style.display = 'block';
  
  setTimeout(() => {
    mensaje.style.display = 'none';
  }, 5000);
}

// ========== CARGAR REPORTES EN TIEMPO REAL ==========
db.collection('reportes').orderBy('fecha', 'desc').onSnapshot((snapshot) => {
  todosLosReportes = [];
  
  snapshot.forEach((doc) => {
    todosLosReportes.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  reportesFiltrados = [...todosLosReportes];
  mostrarReportes();
  actualizarFiltros();
  actualizarContador();
  actualizarEstadisticas();
});

// ========== MOSTRAR REPORTES ==========
function mostrarReportes() {
  const lista = document.getElementById('reportesList');
  
  if (reportesFiltrados.length === 0) {
    lista.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📭</div>
        <p>No se encontraron reportes</p>
      </div>
    `;
    return;
  }
  
  lista.innerHTML = '';
  
  reportesFiltrados.forEach(reporte => {
    const fecha = reporte.fecha ? 
      new Date(reporte.fecha.seconds * 1000).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Sin fecha';
    
    const prioridadClass = reporte.prioridad.toLowerCase();
    const estatusIcon = getEstatusIcon(reporte.estatus);
    
    const div = document.createElement('div');
    div.className = `reporte-item prioridad-${prioridadClass}`;
    div.innerHTML = `
      <div class="reporte-header">
        <span class="reporte-nombre">${reporte.nombre}</span>
        <div class="reporte-badges">
          <span class="badge badge-tipo">${reporte.tipo}</span>
          <span class="badge badge-estatus">${estatusIcon} ${reporte.estatus}</span>
          <span class="badge badge-prioridad ${prioridadClass}">${getPrioridadIcon(reporte.prioridad)} ${reporte.prioridad}</span>
        </div>
      </div>
      <div class="reporte-contacto">📞 ${reporte.contacto}</div>
      <div class="reporte-detalles">${reporte.detalles}</div>
      <div class="reporte-fecha">📅 ${fecha}</div>
    `;
    
    div.addEventListener('click', () => abrirModal(reporte));
    lista.appendChild(div);
  });
}

function getEstatusIcon(estatus) {
  const iconos = {
    'Recibido': '🟡',
    'En atención': '🔵',
    'Resuelto': '🟢'
  };
  return iconos[estatus] || '⚪';
}

function getPrioridadIcon(prioridad) {
  const iconos = {
    'Alta': '🔴',
    'Media': '🟡',
    'Baja': '🟢'
  };
  return iconos[prioridad] || '⚪';
}

// ========== BÚSQUEDA Y FILTROS ==========
const searchInput = document.getElementById('searchInput');
const filterTipo = document.getElementById('filterTipo');
const filterEstatus = document.getElementById('filterEstatus');
const filterPrioridad = document.getElementById('filterPrioridad');
const sortBy = document.getElementById('sortBy');

searchInput.addEventListener('input', aplicarFiltros);
filterTipo.addEventListener('change', aplicarFiltros);
filterEstatus.addEventListener('change', aplicarFiltros);
filterPrioridad.addEventListener('change', aplicarFiltros);
sortBy.addEventListener('change', aplicarFiltros);

function aplicarFiltros() {
  const busqueda = searchInput.value.toLowerCase();
  const tipoSeleccionado = filterTipo.value;
  const estatusSeleccionado = filterEstatus.value;
  const prioridadSeleccionada = filterPrioridad.value;
  
  // Filtrar
  reportesFiltrados = todosLosReportes.filter(reporte => {
    const coincideBusqueda = 
      reporte.nombre.toLowerCase().includes(busqueda) ||
      reporte.tipo.toLowerCase().includes(busqueda) ||
      reporte.detalles.toLowerCase().includes(busqueda);
    
    const coincideTipo = !tipoSeleccionado || reporte.tipo === tipoSeleccionado;
    const coincideEstatus = !estatusSeleccionado || reporte.estatus === estatusSeleccionado;
    const coincidePrioridad = !prioridadSeleccionada || reporte.prioridad === prioridadSeleccionada;
    
    return coincideBusqueda && coincideTipo && coincideEstatus && coincidePrioridad;
  });
  
  // Ordenar
  const orden = sortBy.value;
  reportesFiltrados.sort((a, b) => {
    switch(orden) {
      case 'fecha-desc':
        return (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0);
      case 'fecha-asc':
        return (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0);
      case 'prioridad':
        const prioridades = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        return (prioridades[b.prioridad] || 0) - (prioridades[a.prioridad] || 0);
      case 'nombre-asc':
        return a.nombre.localeCompare(b.nombre);
      default:
        return 0;
    }
  });
  
  mostrarReportes();
  actualizarContador();
}

function actualizarFiltros() {
  // Los filtros ya están definidos en el HTML
}

function actualizarContador() {
  const contador = document.getElementById('recordCount');
  const total = todosLosReportes.length;
  const mostrados = reportesFiltrados.length;
  
  if (total === mostrados) {
    contador.textContent = `${total} reporte${total !== 1 ? 's' : ''} en total`;
  } else {
    contador.textContent = `Mostrando ${mostrados} de ${total} reportes`;
  }
}

// ========== MODAL PRINCIPAL ==========
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close');
const btnEdit = document.getElementById('btnEdit');
const btnDelete = document.getElementById('btnDelete');
const btnEditEstatus = document.getElementById('btnEditEstatus');

closeModal.addEventListener('click', cerrarModal);
window.addEventListener('click', (e) => {
  if (e.target === modal) cerrarModal();
});

function abrirModal(reporte) {
  reporteActual = reporte;
  const fecha = reporte.fecha ? 
    new Date(reporte.fecha.seconds * 1000).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Sin fecha';
  
  document.getElementById('modalBody').innerHTML = `
    <p><strong>Nombre:</strong> ${reporte.nombre}</p>
    <p><strong>Tipo:</strong> ${reporte.tipo}</p>
    <p><strong>Contacto:</strong> ${reporte.contacto}</p>
    <p><strong>Estatus:</strong> ${getEstatusIcon(reporte.estatus)} ${reporte.estatus}</p>
    <p><strong>Prioridad:</strong> ${getPrioridadIcon(reporte.prioridad)} ${reporte.prioridad}</p>
    <p><strong>Detalles:</strong></p>
    <p style="padding-left: 20px; border-left: 3px solid #90caf9;">${reporte.detalles}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
  `;
  
  modal.style.display = 'block';
}

function cerrarModal() {
  modal.style.display = 'none';
  reporteActual = null;
}

// ========== MODAL DE CAMBIO DE ESTATUS ==========
const estatusModal = document.getElementById('estatusModal');
const closeEstatusModal = document.querySelector('.close-estatus');
const estatusBtns = document.querySelectorAll('.estatus-btn');

closeEstatusModal.addEventListener('click', () => {
  estatusModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === estatusModal) {
    estatusModal.style.display = 'none';
  }
});

btnEditEstatus.addEventListener('click', () => {
  if (!reporteActual) return;
  modal.style.display = 'none';
  estatusModal.style.display = 'block';
});

estatusBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!reporteActual) return;
    
    const nuevoEstatus = btn.getAttribute('data-estatus');
    
    try {
      await db.collection('reportes').doc(reporteActual.id).update({
        estatus: nuevoEstatus
      });
      
      estatusModal.style.display = 'none';
      alert('✅ Estatus actualizado exitosamente');
    } catch (error) {
      alert('❌ Error al actualizar: ' + error.message);
    }
  });
});

// ========== EDITAR REPORTE ==========
btnEdit.addEventListener('click', () => {
  if (!reporteActual) return;
  
  const nuevoNombre = prompt('Nuevo nombre:', reporteActual.nombre);
  if (nuevoNombre === null) return;
  
  const nuevoContacto = prompt('Nuevo contacto:', reporteActual.contacto);
  if (nuevoContacto === null) return;
  
  const nuevosDetalles = prompt('Nuevos detalles:', reporteActual.detalles);
  if (nuevosDetalles === null) return;
  
  db.collection('reportes').doc(reporteActual.id).update({
    nombre: nuevoNombre.trim(),
    contacto: nuevoContacto.trim(),
    detalles: nuevosDetalles.trim()
  })
  .then(() => {
    alert('✅ Reporte actualizado exitosamente');
    cerrarModal();
  })
  .catch((error) => {
    alert('❌ Error al actualizar: ' + error.message);
  });
});

// ========== ELIMINAR REPORTE ==========
btnDelete.addEventListener('click', () => {
  if (!reporteActual) return;
  
  if (confirm(`¿Estás seguro de eliminar el reporte de ${reporteActual.nombre}?`)) {
    db.collection('reportes').doc(reporteActual.id).delete()
      .then(() => {
        alert('✅ Reporte eliminado exitosamente');
        cerrarModal();
      })
      .catch((error) => {
        alert('❌ Error al eliminar: ' + error.message);
      });
  }
});

// ========== ESTADÍSTICAS ==========
function actualizarEstadisticas() {
  // Total de reportes
  document.getElementById('totalReportes').textContent = todosLosReportes.length;
  
  // Reportes por estatus
  const recibidos = todosLosReportes.filter(r => r.estatus === 'Recibido').length;
  const enAtencion = todosLosReportes.filter(r => r.estatus === 'En atención').length;
  const resueltos = todosLosReportes.filter(r => r.estatus === 'Resuelto').length;
  
  document.getElementById('reportesRecibidos').textContent = recibidos;
  document.getElementById('reportesAtencion').textContent = enAtencion;
  document.getElementById('reportesResueltos').textContent = resueltos;
  
  // Reportes por tipo
  const empresas = todosLosReportes.filter(r => r.tipo === 'Empresa').length;
  const alumnos = todosLosReportes.filter(r => r.tipo === 'Alumno').length;
  
  document.getElementById('reportesEmpresa').textContent = empresas;
  document.getElementById('reportesAlumno').textContent = alumnos;
  
  // Reportes por prioridad
  const prioridadAlta = todosLosReportes.filter(r => r.prioridad === 'Alta').length;
  document.getElementById('reportesPrioridadAlta').textContent = prioridadAlta;
  
  // Reportes de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const reportesHoy = todosLosReportes.filter(r => {
    if (!r.fecha) return false;
    const fechaReporte = new Date(r.fecha.seconds * 1000);
    fechaReporte.setHours(0, 0, 0, 0);
    return fechaReporte.getTime() === hoy.getTime();
  });
  document.getElementById('reportesHoy').textContent = reportesHoy.length;
  
  // Tasa de resolución
  const total = todosLosReportes.length;
  const porcentajeResueltos = total > 0 ? Math.round((resueltos / total) * 100) : 0;
  
  document.getElementById('resolutionFill').style.width = porcentajeResueltos + '%';
  document.getElementById('resolutionText').textContent = porcentajeResueltos + '% resueltos';
  
  // Gráfico de prioridad
  mostrarGraficoPrioridad();
}

function mostrarGraficoPrioridad() {
  const prioridadCount = {
    'Alta': todosLosReportes.filter(r => r.prioridad === 'Alta').length,
    'Media': todosLosReportes.filter(r => r.prioridad === 'Media').length,
    'Baja': todosLosReportes.filter(r => r.prioridad === 'Baja').length
  };
  
  const maxCount = Math.max(...Object.values(prioridadCount));
  const chartContainer = document.getElementById('prioridadChart');
  
  if (maxCount === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: #546e7a;">No hay datos disponibles</p>';
    return;
  }
  
  chartContainer.innerHTML = '';
  
  Object.entries(prioridadCount).forEach(([prioridad, count]) => {
    const porcentaje = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar-label">
        <span>${getPrioridadIcon(prioridad)} ${prioridad}</span>
        <span>${count}</span>
      </div>
      <div class="chart-bar-progress">
        <div class="chart-bar-fill" style="width: ${porcentaje}%"></div>
      </div>
    `;
    chartContainer.appendChild(div);
  });
}

// Inicializar
console.log('Sistema de Reportes de Atención inicializado');

