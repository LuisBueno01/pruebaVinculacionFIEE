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
let todosLosConvenios = [];
let conveniosFiltrados = [];
let convenioActual = null;

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

// ========== GUARDAR NUEVO CONVENIO ==========
const convenioForm = document.getElementById('convenioForm');
const mensaje = document.getElementById('mensaje');

convenioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const tipoConvenioSelect = document.getElementById('tipoConvenio');
  const tiposSeleccionados = Array.from(tipoConvenioSelect.selectedOptions).map(opt => opt.value);
  
  const data = {
    nombreEmpresa: document.getElementById('nombreEmpresa').value.trim(),
    encargado: document.getElementById('encargado').value.trim(),
    contacto: document.getElementById('contacto').value.trim(),
    tipoConvenio: tiposSeleccionados.join(', '),
    maxPracticantes: parseInt(document.getElementById('maxPracticantes').value),
    areaUV: document.getElementById('areaUV').value,
    objetivo: document.getElementById('objetivo').value.trim(),
    anioInicio: parseInt(document.getElementById('anioInicio').value),
    anioFin: parseInt(document.getElementById('anioFin').value),
    vigencia: document.getElementById('vigencia').value,
    ultimaRevision: document.getElementById('ultimaRevision').value || null,
    notas: document.getElementById('notas').value.trim(),
    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
    fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    await db.collection('convenios').add(data);
    mostrarMensaje('✅ Convenio guardado exitosamente', 'success');
    convenioForm.reset();
    
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

// ========== CARGAR CONVENIOS EN TIEMPO REAL ==========
db.collection('convenios').orderBy('fechaCreacion', 'desc').onSnapshot((snapshot) => {
  todosLosConvenios = [];
  
  snapshot.forEach((doc) => {
    todosLosConvenios.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  conveniosFiltrados = [...todosLosConvenios];
  mostrarConvenios();
  actualizarFiltros();
  actualizarContador();
  actualizarEstadisticas();
  verificarAlertas();
});

// ========== MOSTRAR CONVENIOS ==========
function mostrarConvenios() {
  const lista = document.getElementById('conveniosList');
  
  if (conveniosFiltrados.length === 0) {
    lista.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📭</div>
        <p>No se encontraron convenios</p>
      </div>
    `;
    return;
  }
  
  lista.innerHTML = '';
  
  conveniosFiltrados.forEach(convenio => {
    const fechaCreacion = convenio.fechaCreacion ? 
      new Date(convenio.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : 'Sin fecha';
    
    const vigenciaClass = getVigenciaClass(convenio.vigencia);
    const esVencido = convenio.vigencia === 'Vencido';
    const esPorVencer = convenio.vigencia === 'Por vencer';
    
    const div = document.createElement('div');
    div.className = `convenio-item${esVencido ? ' vencido' : ''}${esPorVencer ? ' por-vencer' : ''}`;
    
    div.innerHTML = `
      <div class="convenio-header">
        <div class="convenio-title">
          <div class="convenio-empresa">${convenio.nombreEmpresa}</div>
          <div class="convenio-encargado">👤 ${convenio.encargado}</div>
        </div>
        <div class="convenio-badges">
          <span class="badge badge-tipo">${getTipoIcon(convenio.tipoConvenio)} ${convenio.tipoConvenio}</span>
          <span class="badge badge-vigencia ${vigenciaClass}">${getVigenciaIcon(convenio.vigencia)} ${convenio.vigencia}</span>
        </div>
      </div>
      
      <div class="convenio-info">
        <div class="convenio-info-item">📞 ${convenio.contacto}</div>
        <div class="convenio-info-item">👥 Máx. ${convenio.maxPracticantes} practicantes</div>
        <div class="convenio-info-item">🏫 ${convenio.areaUV}</div>
        <div class="convenio-info-item">📅 ${convenio.anioInicio} - ${convenio.anioFin}</div>
      </div>
      
      <div class="convenio-objetivo">${convenio.objetivo}</div>
      
      <div class="convenio-footer">
        <span>📅 Registrado: ${fechaCreacion}</span>
        ${convenio.ultimaRevision ? `<span>📝 Última revisión: ${formatearFecha(convenio.ultimaRevision)}</span>` : ''}
      </div>
    `;
    
    div.addEventListener('click', () => abrirModal(convenio));
    lista.appendChild(div);
  });
}

function getTipoIcon(tipo) {
  if (tipo.includes('Ambas')) return '✅';
  if (tipo.includes('Servicio Social')) return '🤝';
  if (tipo.includes('Prácticas')) return '💼';
  return '📄';
}

function getVigenciaIcon(vigencia) {
  const iconos = {
    'Vigente': '🟢',
    'Por vencer': '🟡',
    'Vencido': '🔴',
    'En renovación': '🔄',
    'Suspendido': '⏸️'
  };
  return iconos[vigencia] || '⚪';
}

function getVigenciaClass(vigencia) {
  const clases = {
    'Vigente': 'vigente',
    'Por vencer': 'porvencer',
    'Vencido': 'vencido',
    'En renovación': 'renovacion',
    'Suspendido': 'suspendido'
  };
  return clases[vigencia] || '';
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ========== ALERTAS ==========
function verificarAlertas() {
  const vencidos = todosLosConvenios.filter(c => c.vigencia === 'Vencido').length;
  const porVencer = todosLosConvenios.filter(c => c.vigencia === 'Por vencer').length;
  const enRenovacion = todosLosConvenios.filter(c => c.vigencia === 'En renovación').length;
  
  const alertSection = document.getElementById('alertSection');
  const alertText = document.getElementById('alertText');
  
  if (vencidos > 0 || porVencer > 0 || enRenovacion > 0) {
    const alertas = [];
    if (vencidos > 0) alertas.push(`${vencidos} convenio${vencidos > 1 ? 's vencidos' : ' vencido'}`);
    if (porVencer > 0) alertas.push(`${porVencer} por vencer`);
    if (enRenovacion > 0) alertas.push(`${enRenovacion} en renovación`);
    
    alertText.textContent = alertas.join(' • ');
    alertSection.style.display = 'block';
  } else {
    alertSection.style.display = 'none';
  }
}

// ========== BÚSQUEDA Y FILTROS ==========
const searchInput = document.getElementById('searchInput');
const filterTipo = document.getElementById('filterTipo');
const filterVigencia = document.getElementById('filterVigencia');
const filterArea = document.getElementById('filterArea');
const sortBy = document.getElementById('sortBy');

searchInput.addEventListener('input', aplicarFiltros);
filterTipo.addEventListener('change', aplicarFiltros);
filterVigencia.addEventListener('change', aplicarFiltros);
filterArea.addEventListener('change', aplicarFiltros);
sortBy.addEventListener('change', aplicarFiltros);

function aplicarFiltros() {
  const busqueda = searchInput.value.toLowerCase();
  const tipoSeleccionado = filterTipo.value;
  const vigenciaSeleccionada = filterVigencia.value;
  const areaSeleccionada = filterArea.value;
  
  conveniosFiltrados = todosLosConvenios.filter(convenio => {
    const coincideBusqueda = 
      convenio.nombreEmpresa.toLowerCase().includes(busqueda) ||
      convenio.encargado.toLowerCase().includes(busqueda) ||
      convenio.objetivo.toLowerCase().includes(busqueda);
    
    const coincideTipo = !tipoSeleccionado || convenio.tipoConvenio.includes(tipoSeleccionado);
    const coincideVigencia = !vigenciaSeleccionada || convenio.vigencia === vigenciaSeleccionada;
    const coincideArea = !areaSeleccionada || convenio.areaUV === areaSeleccionada;
    
    return coincideBusqueda && coincideTipo && coincideVigencia && coincideArea;
  });
  
  const orden = sortBy.value;
  conveniosFiltrados.sort((a, b) => {
    switch(orden) {
      case 'fecha-desc':
        return (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0);
      case 'fecha-asc':
        return (a.fechaCreacion?.seconds || 0) - (b.fechaCreacion?.seconds || 0);
      case 'nombre-asc':
        return a.nombreEmpresa.localeCompare(b.nombreEmpresa);
      case 'vigencia':
        const vigenciaOrden = { 'Vencido': 1, 'Por vencer': 2, 'En renovación': 3, 'Vigente': 4, 'Suspendido': 5 };
        return (vigenciaOrden[a.vigencia] || 99) - (vigenciaOrden[b.vigencia] || 99);
      case 'anioFin':
        return a.anioFin - b.anioFin;
      default:
        return 0;
    }
  });
  
  mostrarConvenios();
  actualizarContador();
}

function actualizarFiltros() {
  // Los filtros ya están definidos en el HTML
}

function actualizarContador() {
  const contador = document.getElementById('recordCount');
  const total = todosLosConvenios.length;
  const mostrados = conveniosFiltrados.length;
  
  if (total === mostrados) {
    contador.textContent = `${total} convenio${total !== 1 ? 's' : ''} en total`;
  } else {
    contador.textContent = `Mostrando ${mostrados} de ${total} convenios`;
  }
}

// ========== MODAL PRINCIPAL ==========
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close');
const btnEdit = document.getElementById('btnEdit');
const btnDelete = document.getElementById('btnDelete');
const btnEditVigencia = document.getElementById('btnEditVigencia');

closeModal.addEventListener('click', cerrarModal);
window.addEventListener('click', (e) => {
  if (e.target === modal) cerrarModal();
});

function abrirModal(convenio) {
  convenioActual = convenio;
  const fechaCreacion = convenio.fechaCreacion ? 
    new Date(convenio.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Sin fecha';
  
  document.getElementById('modalBody').innerHTML = `
    <p><strong>Empresa/Institución:</strong> ${convenio.nombreEmpresa}</p>
    <p><strong>Encargado:</strong> ${convenio.encargado}</p>
    <p><strong>Contacto:</strong> ${convenio.contacto}</p>
    <p><strong>Tipo de convenio:</strong> ${getTipoIcon(convenio.tipoConvenio)} ${convenio.tipoConvenio}</p>
    <p><strong>Máx. Practicantes:</strong> ${convenio.maxPracticantes}</p>
    <p><strong>Área UV:</strong> ${convenio.areaUV}</p>
    <p><strong>Vigencia:</strong> ${getVigenciaIcon(convenio.vigencia)} ${convenio.vigencia}</p>
    <p><strong>Periodo:</strong> ${convenio.anioInicio} - ${convenio.anioFin} (${convenio.anioFin - convenio.anioInicio} años)</p>
    ${convenio.ultimaRevision ? `<p><strong>Última revisión:</strong> ${formatearFecha(convenio.ultimaRevision)}</p>` : ''}
    <p><strong>Objetivo:</strong></p>
    <p style="padding-left: 20px; border-left: 3px solid rgba(255,255,255,0.3); margin-bottom: 15px;">${convenio.objetivo}</p>
    ${convenio.notas ? `
      <p><strong>Notas adicionales:</strong></p>
      <p style="padding-left: 20px; border-left: 3px solid rgba(255,255,255,0.3);">${convenio.notas}</p>
    ` : ''}
    <p style="font-size: 0.85em; color: rgba(255,255,255,0.8); margin-top: 15px;"><strong>Fecha de registro:</strong> ${fechaCreacion}</p>
  `;
  
  modal.style.display = 'block';
}

function cerrarModal() {
  modal.style.display = 'none';
  convenioActual = null;
}

// ========== MODAL DE CAMBIO DE VIGENCIA ==========
const vigenciaModal = document.getElementById('vigenciaModal');
const closeVigenciaModal = document.querySelector('.close-vigencia');
const vigenciaBtns = document.querySelectorAll('.vigencia-btn');

closeVigenciaModal.addEventListener('click', () => {
  vigenciaModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === vigenciaModal) {
    vigenciaModal.style.display = 'none';
  }
});

btnEditVigencia.addEventListener('click', () => {
  if (!convenioActual) return;
  modal.style.display = 'none';
  vigenciaModal.style.display = 'block';
});

vigenciaBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!convenioActual) return;
    
    const nuevaVigencia = btn.getAttribute('data-vigencia');
    
    try {
      await db.collection('convenios').doc(convenioActual.id).update({
        vigencia: nuevaVigencia,
        fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      vigenciaModal.style.display = 'none';
      alert('✅ Vigencia actualizada exitosamente');
    } catch (error) {
      alert('❌ Error al actualizar: ' + error.message);
    }
  });
});

// ========== EDITAR CONVENIO ==========
btnEdit.addEventListener('click', () => {
  if (!convenioActual) return;
  
  const nuevoObjetivo = prompt('Nuevo objetivo:', convenioActual.objetivo);
  if (nuevoObjetivo === null) return;
  
  const nuevasNotas = prompt('Nuevas notas:', convenioActual.notas || '');
  if (nuevasNotas === null) return;
  
  db.collection('convenios').doc(convenioActual.id).update({
    objetivo: nuevoObjetivo.trim(),
    notas: nuevasNotas.trim(),
    fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    alert('✅ Convenio actualizado exitosamente');
    cerrarModal();
  })
  .catch((error) => {
    alert('❌ Error al actualizar: ' + error.message);
  });
});

// ========== ELIMINAR CONVENIO ==========
btnDelete.addEventListener('click', () => {
  if (!convenioActual) return;
  
  if (confirm(`¿Estás seguro de eliminar el convenio con ${convenioActual.nombreEmpresa}?`)) {
    db.collection('convenios').doc(convenioActual.id).delete()
      .then(() => {
        alert('✅ Convenio eliminado exitosamente');
        cerrarModal();
      })
      .catch((error) => {
        alert('❌ Error al eliminar: ' + error.message);
      });
  }
});

// ========== ESTADÍSTICAS ==========
function actualizarEstadisticas() {
  document.getElementById('totalConvenios').textContent = todosLosConvenios.length;
  
  const vigentes = todosLosConvenios.filter(c => c.vigencia === 'Vigente').length;
  const porVencer = todosLosConvenios.filter(c => c.vigencia === 'Por vencer').length;
  const vencidos = todosLosConvenios.filter(c => c.vigencia === 'Vencido').length;
  const enRenovacion = todosLosConvenios.filter(c => c.vigencia === 'En renovación').length;
  
  document.getElementById('conveniosVigentes').textContent = vigentes;
  document.getElementById('conveniosPorVencer').textContent = porVencer;
  document.getElementById('conveniosVencidos').textContent = vencidos;
  document.getElementById('conveniosRenovacion').textContent = enRenovacion;
  
  const conServicio = todosLosConvenios.filter(c => c.tipoConvenio.includes('Servicio')).length;
  const conPracticas = todosLosConvenios.filter(c => c.tipoConvenio.includes('Prácticas')).length;
  
  document.getElementById('conveniosServicio').textContent = conServicio;
  document.getElementById('conveniosPracticas').textContent = conPracticas;
  
  const totalPlazas = todosLosConvenios.reduce((sum, c) => sum + (c.maxPracticantes || 0), 0);
  document.getElementById('totalPlazas').textContent = totalPlazas;
  
  const total = todosLosConvenios.length;
  const porcentajeVigentes = total > 0 ? Math.round((vigentes / total) * 100) : 0;
  
  document.getElementById('vigenciaFill').style.width = porcentajeVigentes + '%';
  document.getElementById('vigenciaText').textContent = porcentajeVigentes + '% vigentes';
  
  mostrarGraficoAreas();
  mostrarGraficoEmpresas();
}

function mostrarGraficoAreas() {
  const areasCount = {};
  
  todosLosConvenios.forEach(convenio => {
    areasCount[convenio.areaUV] = (areasCount[convenio.areaUV] || 0) + 1;
  });
  
  const areasArray = Object.entries(areasCount).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...areasArray.map(a => a[1]));
  const chartContainer = document.getElementById('areaChart');
  
  if (areasArray.length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.8);">No hay datos disponibles</p>';
    return;
  }
  
  chartContainer.innerHTML = '';
  
  areasArray.forEach(([area, count]) => {
    const porcentaje = (count / maxCount) * 100;
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar-label">
        <span>🏫 ${area}</span>
        <span>${count}</span>
      </div>
      <div class="chart-bar-progress">
        <div class="chart-bar-fill" style="width: ${porcentaje}%"></div>
      </div>
    `;
    chartContainer.appendChild(div);
  });
}

function mostrarGraficoEmpresas() {
  const empresasConPlazas = todosLosConvenios
    .map(c => ({ nombre: c.nombreEmpresa, plazas: c.maxPracticantes }))
    .sort((a, b) => b.plazas - a.plazas)
    .slice(0, 10);
  
  const maxPlazas = Math.max(...empresasConPlazas.map(e => e.plazas));
  const chartContainer = document.getElementById('empresasChart');
  
  if (empresasConPlazas.length === 0) {
    chartContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.8);">No hay datos disponibles</p>';
    return;
  }
  
  chartContainer.innerHTML = '';
  
  empresasConPlazas.forEach(empresa => {
    const porcentaje = (empresa.plazas / maxPlazas) * 100;
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `
      <div class="chart-bar-label">
        <span>🏢 ${empresa.nombre}</span>
        <span>${empresa.plazas} plazas</span>
      </div>
      <div class="chart-bar-progress">
        <div class="chart-bar-fill" style="width: ${porcentaje}%"></div>
      </div>
    `;
    chartContainer.appendChild(div);
  });
}

console.log('Sistema de Convenios Empresariales inicializado');