import { dataService } from '../services/dataService.js';

let todosLosPedidos = [];
let todosLosProveedores = [];

export const pedidosController = {
    
    // Método de inicialización llamado por el router
    init: async () => {
        console.log("Controlador de Pedidos INICIADO");

        // 1. Obtener datos
        todosLosPedidos = await dataService.getAllPedidos();
        todosLosProveedores = await dataService.getAllProveedores();

        // 2. Renderizar contenido inicial
        renderizarSelectProveedores();
        renderizarTabla(todosLosPedidos);

        // 3. Activar lógica (filtros y modal)
        configurarFiltros();
        configurarModal();
    }
};

// --- RENDERIZADO ---

function renderizarTabla(lista) {
    const tbody = document.getElementById('tablaPedidosBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" align="center">No hay pedidos registrados en la base de datos.</td></tr>';
                return;
            }

    lista.forEach(pedido => {
        // Encontrar proveedor
        const prov = todosLosProveedores.find(p => p.id === pedido.proveedorId);
        const nombreProv = prov ? prov.nombre : 'Desconocido';
        const fecha = new Date(pedido.fecha).toLocaleDateString('es-ES');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${pedido.id}</strong></td>
            <td>${fecha}</td>
            <td>${nombreProv}</td>
            <td><span class="badge ${pedido.estado}">${pedido.estado}</span></td>
            <td>${parseFloat(pedido.total).toFixed(2)} €</td>
            <td style="text-align: center;">
                <button class="btn-ver" data-id="${pedido.id}">Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarSelectProveedores() {
    const select = document.getElementById('filtroProveedor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los proveedores</option>';
    todosLosProveedores.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.nombre;
        select.appendChild(option);
    });
}

// --- LÓGICA DEL MODAL ---

function configurarModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    const btnCerrarX = document.getElementById('btnCerrarX');
    const btnCerrarBtn = document.getElementById('btnCerrarModal');
    const tbodyTabla = document.getElementById('tablaPedidosBody'); // Para delegación
    const btnVerDetalles = document.getElementsByClassName('btn-ver');

    // 1. ABRIR MODAL (Delegación de eventos en la tabla)
    tbodyTabla.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-ver')) {
            const idPedido = e.target.getAttribute('data-id');
            mostrarDetallePedido(idPedido);
        }
    });

    // 2. CERRAR MODAL (Funciones)
    const cerrarModal = () => {
        modalOverlay.classList.remove('active');
    };

    if (btnCerrarX) btnCerrarX.addEventListener('click', cerrarModal);
    if (btnCerrarBtn) btnCerrarBtn.addEventListener('click', cerrarModal);
    if (btnVerDetalles) {
        Array.from(btnVerDetalles).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pedidoId = e.target.getAttribute('data-id');
                mostrarDetallePedido(pedidoId);
            });
        },);
    }

    // Cerrar si se hace clic fuera de la ventana blanca
    window.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            cerrarModal();
        }
    });
}

function mostrarDetallePedido(id) {
    console.log("Intentando ver detalles del Pedido ID:", pedidoId);
    const pedido = todosLosPedidos.find(p => p.id == id); // == para permitir string/num
    if (!pedido) return;

    const proveedor = todosLosProveedores.find(p => p.id === pedido.proveedorId);

    // Rellenar cabecera
    document.getElementById('mId').textContent = pedido.id;
    document.getElementById('mFecha').textContent = new Date(pedido.fecha).toLocaleString('es-ES');
    document.getElementById('mProveedor').textContent = proveedor ? proveedor.nombre : 'No encontrado';
    document.getElementById('mTotal').textContent = pedido.total.toFixed(2) + ' €';
    
    const badgeEstado = document.getElementById('mEstado');
    badgeEstado.textContent = pedido.estado;
    badgeEstado.className = `badge ${pedido.estado}`; // Resetear clases y poner la correcta

    // Rellenar tabla de items
    const tbodyItems = document.getElementById('mTablaItemsBody');
    tbodyItems.innerHTML = '';

    if (pedido.items && pedido.items.length > 0) {
        pedido.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td style="text-align: center;">${item.cantidad}</td>
                <td style="text-align: right;">${item.precioUnitario.toFixed(2)} €</td>
                <td style="text-align: right;"><strong>${item.subtotal.toFixed(2)} €</strong></td>
            `;
            tbodyItems.appendChild(tr);
        });
    } else {
        tbodyItems.innerHTML = '<tr><td colspan="4">Sin detalles de productos</td></tr>';
    }

    // Mostrar modal agregando la clase CSS
    document.getElementById('modalOverlay').classList.add('active');
}

// --- FILTROS ---

function configurarFiltros() {
    const inputId = document.getElementById('filtroId');
    const selectProv = document.getElementById('filtroProveedor');
    const inputFecha = document.getElementById('filtroFecha');
    const btnLimpiar = document.getElementById('btnLimpiar');

    const filtrar = () => {
        const busquedaId = inputId.value.toLowerCase();
        const busquedaProv = selectProv.value;
        const busquedaFecha = inputFecha.value;

        const resultado = todosLosPedidos.filter(p => {
            const matchId = p.id.toString().toLowerCase().includes(busquedaId);
            const matchProv = busquedaProv === "" || p.proveedorId == busquedaProv;
            const fechaP = p.fecha.split('T')[0];
            const matchFecha = busquedaFecha === "" || fechaP === busquedaFecha;
            
            return matchId && matchProv && matchFecha;
        });

        renderizarTabla(resultado);
    };

    inputId.addEventListener('input', filtrar);
    selectProv.addEventListener('change', filtrar);
    inputFecha.addEventListener('change', filtrar);

    btnLimpiar.addEventListener('click', () => {
        inputId.value = '';
        selectProv.value = '';
        inputFecha.value = '';
        renderizarTabla(todosLosPedidos);
    });
}