import { dataService } from '../services/dataService.js';

let albaranes = [];
let proveedores = [];
let productos = []; // Necesario para sacar los precios

export const albaranesController = {
    
    init: async () => {
        console.log("Controlador de Albaranes INICIADO");

        // 1. Cargar ALBARANES y PROVEEDORES
        albaranes = await dataService.getAllAlbaranes();
        proveedores = await dataService.getAllProveedores();

        // 2. Cargar PRODUCTOS (para poder poner precio a los items del albarán)
        // Verificamos si existe el método en el servicio, si no, fallback a fetch manual
        if (typeof dataService.getAllProductos === 'function') {
            productos = await dataService.getAllProductos();
        } else {
            try {
                const resp = await fetch('assets/data/db.json'); // Ajusta ruta si es necesario
                const data = await resp.json();
                productos = data.productos;
            } catch (e) {
                console.error("No se pudieron cargar productos para precios", e);
                productos = [];
            }
        }

        // 3. Renderizar vista inicial
        renderizarSelectProveedores();
        renderizarTabla(albaranes);

        // 4. Activar eventos
        configurarFiltros();
        configurarModal();
    }
};

// --- RENDERIZADO TABLA PRINCIPAL ---

function renderizarTabla(lista) {
    const tbody = document.getElementById('tablaAlbaranesBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron albaranes.</td></tr>';
        return;
    }

    lista.forEach(alb => {
        const prov = proveedores.find(p => p.id === alb.proveedorId)?.nombre || 'Desconocido';
        const fecha = new Date(alb.fecha).toLocaleDateString('es-ES');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${alb.id}</strong></td>
            <td><span class="badge pendiente">#${alb.pedidoId}</span></td>
            <td>${fecha}</td>
            <td>${prov}</td>
            <td style="font-size: 0.9em; color: #666; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${alb.nota || '-'}
            </td>
            <td style="text-align: center;">
                <button class="btn-ver" data-id="${alb.id}">Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarSelectProveedores() {
    const select = document.getElementById('filtroProveedor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los proveedores</option>';
    proveedores.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.nombre;
        select.appendChild(option);
    });
}

// --- LOGICA DEL MODAL ---

function configurarModal() {
    const modal = document.getElementById('modalOverlayAlb');
    const tbody = document.getElementById('tablaAlbaranesBody');
    const btnCerrarX = document.getElementById('btnCerrarX');
    const btnCerrarBtn = document.getElementById('btnCerrarModal');

    // Delegación de evento Click en la tabla para abrir modal
    tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-ver')) {
            const id = e.target.getAttribute('data-id');
            mostrarDetalle(id);
        }
    });

    const cerrar = () => modal.classList.remove('active');

    if (btnCerrarX) btnCerrarX.addEventListener('click', cerrar);
    if (btnCerrarBtn) btnCerrarBtn.addEventListener('click', cerrar);
    
    // Cerrar al hacer click fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) cerrar();
    });
}

function mostrarDetalle(id) {
    // Nota: Usamos '==' para que coincida string con number si es necesario
    const alb = albaranes.find(a => a.id == id);
    if (!alb) return;

    const prov = proveedores.find(p => p.id === alb.proveedorId)?.nombre || '---';

    // Rellenar cabecera del modal
    document.getElementById('mId').textContent = alb.id;
    document.getElementById('mPedidoId').textContent = '#' + alb.pedidoId;
    document.getElementById('mFecha').textContent = new Date(alb.fecha).toLocaleString('es-ES');
    document.getElementById('mProveedor').textContent = prov;
    document.getElementById('mNota').textContent = alb.nota || 'Sin notas adicionales';

    // Rellenar tabla items Y CALCULAR PRECIOS
    const tbodyItems = document.getElementById('mTablaItemsBody');
    tbodyItems.innerHTML = '';
    
    let totalValorado = 0;

    if (alb.items && alb.items.length > 0) {
        alb.items.forEach(item => {
            // Buscamos el producto en el catálogo para saber su precio actual
            const prodCatalogo = productos.find(p => p.id == item.productoId);
            const precio = prodCatalogo ? parseFloat(prodCatalogo.precio) : 0;
            const subtotal = precio * item.cantidad;
            
            totalValorado += subtotal;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td style="text-align: center;">${item.cantidad}</td>
                <td style="text-align: right;">${precio.toFixed(2)} €</td>
                <td style="text-align: right;"><strong>${subtotal.toFixed(2)} €</strong></td>
            `;
            tbodyItems.appendChild(tr);
        });
    } else {
        tbodyItems.innerHTML = '<tr><td colspan="4" style="text-align:center">Sin artículos listados</td></tr>';
    }

    // Mostrar el total calculado
    document.getElementById('mTotalValorado').textContent = totalValorado.toFixed(2) + ' €';

    // Mostrar modal activando la clase CSS
    document.getElementById('modalOverlayAlb').classList.add('active');
}

// --- FILTROS ---

function configurarFiltros() {
    const inputId = document.getElementById('filtroId');
    const selectProv = document.getElementById('filtroProveedor');
    const inputFecha = document.getElementById('filtroFecha');
    const btnLimpiar = document.getElementById('btnLimpiar');

    const filtrar = () => {
        const fId = inputId.value.toLowerCase();
        const fProv = selectProv.value;
        const fFecha = inputFecha.value;

        const resultado = albaranes.filter(alb => {
            const matchId = alb.id.toString().toLowerCase().includes(fId);
            const matchProv = fProv === "" || alb.proveedorId == fProv;
            const fechaAlb = alb.fecha.split('T')[0];
            const matchFecha = fFecha === "" || fechaAlb === fFecha;
            
            return matchId && matchProv && matchFecha;
        });

        renderizarTabla(resultado);
    };

    if(inputId) inputId.addEventListener('input', filtrar);
    if(selectProv) selectProv.addEventListener('change', filtrar);
    if(inputFecha) inputFecha.addEventListener('change', filtrar);

    if(btnLimpiar) btnLimpiar.addEventListener('click', () => {
        inputId.value = '';
        selectProv.value = '';
        inputFecha.value = '';
        renderizarTabla(albaranes);
    });
}