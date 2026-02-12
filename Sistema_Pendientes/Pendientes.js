// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCU14BKyvxP-s8Ipq6pVv3N4XJ9FuBi1FQ",
  authDomain: "servicio-social-b80cf.firebaseapp.com",
  projectId: "servicio-social-b80cf",
  storageBucket: "servicio-social-b80cf.firebasestorage.app",
  messagingSenderId: "350748918799",
  appId: "1:350748918799:web:8989549ab3a5ad7612cf7a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variables globales
let todosLosPendientes = [];
let pendientesFiltrados = [];
let pendienteActual = null;

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

// ========== GUARDAR NUEVO PENDIENTE ==========
const pendienteForm = document.getElementById('pendienteForm');
const mensaje = document.getElementById('mensaje');

pendienteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const tipoPendiente = document.getElementById('tipoPendiente').value;
  const nombrePersona = document.getElementById('nombrePersona').value.trim();
  const responsable = document.getElementById('responsable').value.trim();
  const resolviendo = document.getElementById('resolviendo').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const estatus = document.getElementById('estatus').value;
  const prioridad = document.getElementById('prioridad').value;
  const fechaLimite = document.getElementById('fechaLimite').value;
  const categoria = document.getElementById('categoria').value;
  const descripcion = document.getElementById('descripcion').value.trim();
  const observaciones = document.getElementById('observaciones').value.trim();
  
  try {
    await db.collection('pendientes').add({
      tipoPendiente: tipoPendiente,
      nombrePersona: nombrePersona,
      responsable: responsable,
      resolviendo: resolviendo,
      telefono: telefono,
      correo: correo,
      estatus: estatus,
      prioridad: prioridad,
      fechaLimite: fechaLimite || null,
      categoria: categoria,
      descripcion: descripcion,
      observaciones: observaciones,
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
      fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarMensaje('✅ Pendiente guardado exitosamente', 'success');
    pendienteForm.reset();
    
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

// ========== CARGAR PENDIENTES EN TIEMPO REAL ==========
db.collection('pendientes').orderBy('fechaCreacion', 'desc').onSnapshot((snapshot) => {
  todosLosPendientes = [];
  
  snapshot.forEach((doc) => {
    todosLosPendientes.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  pendientesFiltrados = [...todosLosPendientes];
  mostrarPendientes();
  actualizarFiltros();
  actualizarContador();
  actualizarEstadisticas();
  verificarAlertas();
});

// ========== MOSTRAR PENDIENTES ==========
function mostrarPendientes() {
  const lista = document.getElementById('pendientesList');
  
  if (pendientesFiltrados.length === 0) {
    lista.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📭</div>
        <p>No se encontraron pendientes</p>
      </div>
    `;
    return;
  }
  
  lista.innerHTML = '';
  
  pendientesFiltrados.forEach(pendiente => {
    const fechaCreacion = pendiente.fechaCreacion ? 
      new Date(pendiente.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : 'Sin fecha';
    
    const prioridadClass = pendiente.prioridad.toLowerCase();
    const estatusIcon = getEstatusIcon(pendiente.estatus);
    const prioridadIcon = getPrioridadIcon(pendiente.prioridad);
    
    // Verificar si está vencido
    const estaVencido = verificarVencimiento(pendiente);
    const diasRestantes = calcularDiasRestantes(pendiente.fechaLimite);
    
    const div = document.createElement('div');
    div.className = `pendiente-item prioridad-${prioridadClass}${estaVencido ? ' vencido' : ''}`;
    
    div.innerHTML = `
      <div class="pendiente-header">
        <div class="pendiente-title">
          <div class="pendiente-nombre">${pendiente.nombrePersona}</div>
          <div class="pendiente-tipo">${getTipoIcon(pendiente.tipoPendiente)} ${pendiente.tipoPendiente}</div>
        </div>
        <div class="pendiente-badges">
          <span class="badge badge-estatus">${estatusIcon} ${pendiente.estatus}</span>
          <span class="badge badge-prioridad ${prioridadClass}">${prioridadIcon} ${pendiente.prioridad}</span>
        </div>
      </div>
      
      <div class="pendiente-info">
        <div class="pendiente-info-item">👤 <strong>Responsable:</strong> ${pendiente.responsable}</div>
        <div class="pendiente-info-item">🔧 <strong>Resolviendo:</strong> ${pendiente.resolviendo}</div>
        ${pendiente.telefono ? `<div class="pendiente-info-item">📞 ${pendiente.telefono}</div>` : ''}
        ${pendiente.correo ? `<div class="pendiente-info-item">✉️ ${pendiente.correo}</div>` : ''}
      </div>
      
      <div class="pendiente-descripcion">${pendiente.descripcion}</div>
      
      <div class="pendiente-footer">
        <span>📅 Creado: ${fechaCreacion}</span>
        ${pendiente.fechaLimite ? `
          <span class="pendiente-fecha-limite ${diasRestantes <= 3 && diasRestantes >= 0 ? 'proxima' : ''} ${diasRestantes < 0 ? 'vencida' : ''}">
            ⏰ Límite: ${formatearFecha(pendiente.fechaLimite)} ${diasRestantes >= 0 ? `(${diasRestantes} días)` : '(¡VENCIDO!)'}
          </span>
        ` : '<span>Sin fecha límite</span>'}
      </div>
    `;
    
    div.addEventListener('click', () => abrirModal(pendiente));
    lista.appendChild(div);
  });
}

function getTipoIcon(tipo) {
  const iconos = {
    'Alumno': '🎓',
    'Empresa': '🏢',
    'Convenio': '📄',
    'Carta de liberación': '✉️',
    'Servicio social': '🤝',
    'Prácticas profesionales': '💼',
    'Seguimiento': '🔍',
    'Documentación': '📑',
    'Otro': '📌'
  };
  return iconos[tipo] || '📌';
}

function getEstatusIcon(estatus) {
  const iconos = {
    'Pendiente': '🟡',
    'En proceso': '🔵',
    'Completado': '🟢',
    'En espera': '⏸️',
    'Cancelado': '🔴'
  };
  return iconos[estatus] || '⚪';
}

function getPrioridadIcon(prioridad) {
  const iconos = {
    'Urgente': '🆘',
    'Alta': '🔴',
    'Media': '🟡',
    'Baja': '🟢'
  };
  return iconos[prioridad] || '⚪';
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function verificarVencimiento(pendiente) {
  if (!pendiente.fechaLimite || pendiente.estatus === 'Completado' || pendiente.estatus === 'Cancelado') {
    return false;
  }
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(pendiente.fechaLimite);
  limite.setHours(0, 0, 0, 0);
  
  return limite < hoy;
}

function calcularDiasRestantes(fechaLimite) {
  if (!fechaLimite) return null;
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite);
  limite.setHours(0, 0, 0, 0);
  
  const diferencia = limite - hoy;
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

// ========== ALERTAS ==========
function verificarAlertas() {
  const vencidos = todosLosPendientes.filter(p => 
    verificarVencimiento(p)
  ).length;
  
  const proximos = todosLosPendientes.filter(p => {
    const dias = calcularDiasRestantes(p.fechaLimite);
    return dias >= 0 && dias <= 3 && p.estatus !== 'Completado' && p.estatus !== 'Cancelado';
  }).length;
  
  const urgentes = todosLosPendientes.filter(p => 
    p.prioridad === 'Urgente' && p.estatus !== 'Completado' && p.estatus !== 'Cancelado'
  ).length;
  
  const alertSection = document.getElementById('alertSection');
  const alertText = document.getElementById('alertText');
  
  if (vencidos > 0 || proximos > 0 || urgentes > 0) {
    const alertas = [];
    if (vencidos > 0) alertas.push(`${vencidos} pendiente${vencidos > 1 ? 's vencidos' : ' vencido'}`);
    if (proximos > 0) alertas.push(`${proximos} próximo${proximos > 1 ? 's' : ''} a vencer`);
    if (urgentes > 0) alertas.push(`${urgentes} urgente${urgentes > 1 ? 's' : ''}`);
    
    alertText.textContent = alertas.join(' • ');
    alertSection.style.display = 'block';
  } else {
    alertSection.style.display = 'none';
  }
}

// ========== BÚSQUEDA Y FILTROS ==========
const searchInput = document.getElementById('searchInput');
const filterTipo = document.getElementById('filterTipo');
const filterEstatus = document.getElementById('filterEstatus');
const filterPrioridad = document.getElementById('filterPrioridad');
const filterResponsable = document.getElementById('filterResponsable');
const sortBy = document.getElementById('sortBy');

searchInput.addEventListener('input', aplicarFiltros);
filterTipo.addEventListener('change', aplicarFiltros);
filterEstatus.addEventListener('change', aplicarFiltros);
filterPrioridad.addEventListener('change', aplicarFiltros);
filterResponsable.addEventListener('change', aplicarFiltros);
sortBy.addEventListener('change', aplicarFiltros);

function aplicarFiltros() {
  const busqueda = searchInput.value.toLowerCase();
  const tipoSeleccionado = filterTipo.value;
  const estatusSeleccionado = filterEstatus.value;
  const prioridadSeleccionada = filterPrioridad.value;
  const responsableSeleccionado = filterResponsable.value;
  
  // Filtrar
  pendientesFiltrados = todosLosPendientes.filter(pendiente => {
    const coincideBusqueda = 
      pendiente.nombrePersona.toLowerCase().includes(busqueda) ||
      pendiente.descripcion.toLowerCase().includes(busqueda) ||
      pendiente.responsable.toLowerCase().includes(busqueda) ||
      pendiente.resolviendo.toLowerCase().includes(busqueda);
    
    const coincideTipo = !tipoSeleccionado || pendiente.tipoPendiente === tipoSeleccionado;
    const coincideEstatus = !estatusSeleccionado || pendiente.estatus === estatusSeleccionado;
    const coincidePrioridad = !prioridadSeleccionada || pendiente.prioridad === prioridadSeleccionada;
    const coincideResponsable = !responsableSeleccionado || pendiente.responsable === responsableSeleccionado;
    
    return coincideBusqueda && coincideTipo && coincideEstatus && coincidePrioridad && coincideResponsable;
  });
  
  // Ordenar
  const orden = sortBy.value;
  pendientesFiltrados.sort((a, b) => {
    switch(orden) {
      case 'fecha-desc':
        return (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0);
      case 'fecha-asc':
        return (a.fechaCreacion?.seconds || 0) - (b.fechaCreacion?.seconds || 0);
      case 'prioridad':
        const prioridades = { 'Urgente': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
        return (prioridades[b.prioridad] || 0) - (prioridades[a.prioridad] || 0);
      case 'fechaLimite':
        const fechaA = a.fechaLimite ? new Date(a.fechaLimite) : new Date('2099-12-31');
        const fechaB = b.fechaLimite ? new Date(b.fechaLimite) : new Date('2099-12-31');
        return fechaA - fechaB;
      case 'nombre-asc':
        return a.nombrePersona.localeCompare(b.nombrePersona);
      default:
        return 0;
    }
  });
  
  mostrarPendientes();
  actualizarContador();
}

function actualizarFiltros() {
  // Actualizar filtro de responsables
  const responsables = [...new Set(todosLosPendientes.map(p => p.responsable))].sort();
  const select = document.getElementById('filterResponsable');
  const valorActual = select.value;
  
  select.innerHTML = '<option value="">Todos los responsables</option>';
  responsables.forEach(responsable => {
    const option = document.createElement('option');
    option.value = responsable;
    option.textContent = responsable;
    select.appendChild(option);
  });
  
  select.value = valorActual;
}

function actualizarContador() {
  const contador = document.getElementById('recordCount');
  const total = todosLosPendientes.length;
  const mostrados = pendientesFiltrados.length;
  
  if (total === mostrados) {
    contador.textContent = `${total} pendiente${total !== 1 ? 's' : ''} en total`;
  } else {
    contador.textContent = `Mostrando ${mostrados} de ${total} pendientes`;
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

function abrirModal(pendiente) {
  pendienteActual = pendiente;
  const fechaCreacion = pendiente.fechaCreacion ? 
    new Date(pendiente.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Sin fecha';
  
  const diasRestantes = calcularDiasRestantes(pendiente.fechaLimite);
  
  document.getElementById('modalBody').innerHTML = `
    <p><strong>Tipo de pendiente:</strong> ${getTipoIcon(pendiente.tipoPendiente)} ${pendiente.tipoPendiente}</p>
    <p><strong>Nombre/Institución:</strong> ${pendiente.nombrePersona}</p>
    <p><strong>Responsable:</strong> 👤 ${pendiente.responsable}</p>
    <p><strong>Quien resuelve:</strong> 🔧 ${pendiente.resolviendo}</p>
    ${pendiente.telefono ? `<p><strong>Teléfono:</strong> 📞 ${pendiente.telefono}</p>` : ''}
    ${pendiente.correo ? `<p><strong>Correo:</strong> ✉️ ${pendiente.correo}</p>` : ''}
    <p><strong>Estatus:</strong> ${getEstatusIcon(pendiente.estatus)} ${pendiente.estatus}</p>
    <p><strong>Prioridad:</strong> ${getPrioridadIcon(pendiente.prioridad)} ${pendiente.prioridad}</p>
    <p><strong>Categoría:</strong> ${pendiente.categoria}</p>
    ${pendiente.fechaLimite ? `
      <p><strong>Fecha límite:</strong> ⏰ ${formatearFecha(pendiente.fechaLimite)}
      ${diasRestantes !== null ? `(${diasRestantes >= 0 ? `${diasRestantes} días restantes` : '¡VENCIDO!'})` : ''}</p>
    ` : ''}
    <p><strong>Descripción:</strong></p>
    <p style="padding-left: 20px; border-left: 3px solid #b39ddb; margin-bottom: 15px;">${pendiente.descripcion}</p>
    ${pendiente.observaciones ? `
      <p><strong>Observaciones:</strong></p>
      <p style="padding-left: 20px; border-left: 3px solid #b39ddb;">${pendiente.observaciones}</p>
    ` : ''}
    <p style="font-size: 0.85em; color: #7e57c2; margin-top: 15px;"><strong>Fecha de creación:</strong> ${fechaCreacion}</p>
  `;
  
  modal.style.display = 'block';
}

function cerrarModal() {
  modal.style.display = 'none';
  pendienteActual = null;
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
  if (!pendienteActual) return;
  modal.style.display = 'none';
  estatusModal.style.display = 'block';
});

estatusBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!pendienteActual) return;
    
    const nuevoEstatus = btn.getAttribute('data-estatus');
    
    try {
      await db.collection('pendientes').doc(pendienteActual.id).update({
        estatus: nuevoEstatus,
        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      estatusModal.style.display = 'none';
      alert('✅ Estatus actualizado exitosamente');
    } catch (error) {
      alert('❌ Error al actualizar: ' + error.message);
    }
  });
});

// ========== EDITAR PENDIENTE ==========
btnEdit.addEventListener('click', () => {
  if (!pendienteActual) return;
  
  const nuevaDescripcion = prompt('Nueva descripción:', pendienteActual.descripcion);
  if (nuevaDescripcion === null) return;
  
  const nuevasObservaciones = prompt('Nuevas observaciones:', pendienteActual.observaciones || '');
  if (nuevasObservaciones === null) return;
  
  db.collection('pendientes').doc(pendienteActual.id).update({
    descripcion: nuevaDescripcion.trim(),
    observaciones: nuevasObservaciones.trim(),
    fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    alert('✅ Pendiente actualizado exitosamente');
    cerrarModal();
  })
  .catch((error) => {
    alert('❌ Error al actualizar: ' + error.message);
  });
});

// ========== ELIMINAR PENDIENTE ==========
btnDelete.addEventListener('click', () => {
  if (!pendienteActual) return;
  
  if (confirm(`¿Estás seguro de eliminar el pendiente de ${pendienteActual.nombrePersona}?`)) {
    db.collection('pendientes').doc(pendienteActual.id).delete()
      .then(() => {
        alert('✅ Pendiente eliminado exitosamente');
        cerrarModal();
      })
      .catch((error) => {
        alert('❌ Error al eliminar: ' + error.message);
      });
  }
});

// ========== ESTADÍSTICAS ==========
function actualizarEstadisticas() {
  // Total de pendientes
  document.getElementById('totalPendientes').textContent = todosLosPendientes.length;
  
  // Pendientes por estatus
  const pendientes = todosLosPendientes.filter(p => p.estatus === 'Pendiente').length;
  const enProceso = todosLosPendientes.filter(p => p.estatus === 'En proceso').length;
  const completados = todosLosPendientes.filter(p => p.estatus === 'Completado').length;
  
  document.getElementById('pendientesPendientes').textContent = pendientes;
  document.getElementById('pendientesProceso').textContent = enProceso;
  document.getElementById('pendientesCompletados').textContent = completados;
  
  // Urgentes y vencidos
  const urgentes = todosLosPendientes.filter(p => 
    p.prioridad === 'Urgente' && p.estatus !== 'Completado' && p.estatus !== 'Cancelado'
  ).length;
  const vencidos = todosLosPendientes.filter(p => verificarVencimiento(p)).length;
  
  document.getElementById('pendientesUrgentes').textContent = urgentes;
  document.getElementById('pendientesVencidos').textContent = vencidos;
  
  // Pendientes de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const pendientesHoy = todosLosPendientes.filter(p => {
    if (!p.fechaCreacion) return false;
    const fechaPendiente = new Date(p.fechaCreacion.seconds * 1000);
    fechaPendiente.setHours(0, 0, 0, 0);
    return fechaPendiente.getTime() === hoy.getTime();
  });
  document.getElementById('pendientesHoy').textContent = pendientesHoy.length;
  
  // Completados hoy
  const completadosHoy = todosLosPendientes.filter(p => {
    if (!p.fechaModificacion || p.estatus !== 'Completado') return false;
    const fechaMod = new Date(p.fechaModificacion.seconds * 1000);
    fechaMod.setHours(0, 0, 0, 0);
    return fechaMod.getTime() === hoy.getTime();
  });
  document.getElementById('completadosHoy').textContent = completadosHoy.length;
  
  // Progreso general
  const total = todosLosPendientes.length;
  const porcentajeCompletados = total > 0 ? Math.round((completados / total) * 100) : 0;
  
  document.getElementById('progresoFill').style.width = porcentajeCompletados + '%';
  document.getElementById('progresoText').textContent = porcentajeCompletados + '% completados';
  
  // Gráficos
  mostrarGraficoTipo();
  mostrarGraficoResponsables();
}

function mostrarGraficoTipo() {
  const tipoCount = {};
  
  todosLosPendientes.forEach(pendiente => {
    tipoCount[pendiente.tipoPendiente] = (tipoCount[pendiente.tipoPendiente] || 0) + 1;
  });
  
  const tipoArray = Object.entries(tipoCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const maxCount = Math.max(...tipoArray.map(t => t[1]));
  const chartContainer = document.getElementById('tipoChart');
  
  if (tipoArray.length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: #7e57c2;">No hay datos disponibles</p>';
    return;
  }
  
  chartContainer.innerHTML = '';
  
  tipoArray.forEach(([tipo, count]) => {
    const porcentaje = (count / maxCount) * 100;
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar-label">
        <span>${getTipoIcon(tipo)} ${tipo}</span>
        <span>${count}</span>
      </div>
      <div class="chart-bar-progress">
        <div class="chart-bar-fill" style="width: ${porcentaje}%"></div>
      </div>
    `;
    chartContainer.appendChild(div);
  });
}

function mostrarGraficoResponsables() {
  const responsableCount = {};
  
  todosLosPendientes.forEach(pendiente => {
    responsableCount[pendiente.responsable] = (responsableCount[pendiente.responsable] || 0) + 1;
  });
  
  const responsableArray = Object.entries(responsableCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const maxCount = Math.max(...responsableArray.map(r => r[1]));
  const chartContainer = document.getElementById('responsableChart');
  
  if (responsableArray.length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: #7e57c2;">No hay datos disponibles</p>';
    return;
  }
  
  chartContainer.innerHTML = '';
  
  responsableArray.forEach(([responsable, count]) => {
    const porcentaje = (count / maxCount) * 100;
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar-label">
        <span>👤 ${responsable}</span>
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
console.log('Sistema de Pendientes de Vinculación inicializado');