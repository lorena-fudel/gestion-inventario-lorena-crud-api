import { dataService } from '../services/dataService.js';

let todosLosPedidos = [];
let todosLosProveedores = [];

export const pedidosController = {
    // Método de inicialización
    init: async () => {
        console.log("🚀 Controlador de Pedidos INICIADO");

        // 1. Obtener datos
        try {
            todosLosPedidos = await dataService.getAllPedidos();
            todosLosProveedores = await dataService.getAllProveedores();
        } catch (error) {
            console.error("Error cargando datos:", error);
        }

        // 2. Renderizar contenido inicial
        renderizarSelectProveedores();
        renderizarTabla(todosLosPedidos);

        // 3. Activar lógica
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay pedidos que coincidan.</td></tr>';
        return;
    }

    lista.forEach(pedido => {
        // Encontrar proveedor con seguridad
        const prov = todosLosProveedores.find(p => p.id == pedido.proveedorId); // Usamos == por si vienen tipos distintos (string/number)
        const nombreProv = prov ? prov.nombre : 'Proveedor desconocido';
        
        // Formatear fecha
        const fecha = new Date(pedido.fecha).toLocaleDateString('es-ES');
        
        // Formatear total
        const total = parseFloat(pedido.total || 0).toFixed(2);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${pedido.id}</strong></td>
            <td>${fecha}</td>
            <td>${nombreProv}</td>
            <td><span class="badge ${pedido.estado}">${pedido.estado}</span></td>
            <td>${total} €</td>
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
    const tbodyTabla = document.getElementById('tablaPedidosBody');

    // 1. ABRIR MODAL (Usando Delegación de Eventos)
    // Esto es crucial: escuchamos el click en la tabla, no en los botones individuales
    tbodyTabla.addEventListener('click', (e) => {
        // Verificamos si lo que se clickeó es el botón VER
        if (e.target.classList.contains('btn-ver')) {
            const idSeleccionado = e.target.getAttribute('data-id');
            console.log("Click detectado en pedido ID:", idSeleccionado);
            mostrarDetallePedido(idSeleccionado);
        }
    });

    // 2. CERRAR MODAL
    const cerrarModal = () => {
        modalOverlay.classList.remove('active');
    };

    if (btnCerrarX) btnCerrarX.addEventListener('click', cerrarModal);
    if (btnCerrarBtn) btnCerrarBtn.addEventListener('click', cerrarModal);

    // Cerrar si clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            cerrarModal();
        }
    });
}

function mostrarDetallePedido(id) {
    // Aquí estaba tu error antes: asegúrate de usar 'id' que es el parámetro que recibes
    const pedido = todosLosPedidos.find(p => p.id == id); 

    if (!pedido) {
        console.error("No se encontró el pedido con ID:", id);
        return;
    }

    const proveedor = todosLosProveedores.find(p => p.id == pedido.proveedorId);

    // Rellenar cabecera
    document.getElementById('mId').textContent = pedido.id;
    document.getElementById('mFecha').textContent = new Date(pedido.fecha).toLocaleString('es-ES');
    document.getElementById('mProveedor').textContent = proveedor ? proveedor.nombre : 'No encontrado';
    document.getElementById('mTotal').textContent = parseFloat(pedido.total).toFixed(2) + ' €';
    
    const badgeEstado = document.getElementById('mEstado');
    badgeEstado.textContent = pedido.estado;
    badgeEstado.className = `badge ${pedido.estado}`; 

    // Rellenar tabla de items
    const tbodyItems = document.getElementById('mTablaItemsBody');
    tbodyItems.innerHTML = '';

    if (pedido.items && pedido.items.length > 0) {
        pedido.items.forEach(item => {
            const tr = document.createElement('tr');
            
            // Seguridad: a veces la API devuelve productoNombre o nombre
            const nombreProd = item.nombre || item.productoNombre || 'Producto';
            
            tr.innerHTML = `
                <td>${nombreProd}</td>
                <td style="text-align: center;">${item.cantidad}</td>
                <td style="text-align: right;">${parseFloat(item.precioUnitario).toFixed(2)} €</td>
                <td style="text-align: right;"><strong>${parseFloat(item.subtotal).toFixed(2)} €</strong></td>
            `;
            tbodyItems.appendChild(tr);
        });
    } else {
        tbodyItems.innerHTML = '<tr><td colspan="4" align="center">Sin detalles de productos</td></tr>';
    }

    // Mostrar modal
    const modal = document.getElementById('modalOverlay');
    modal.classList.add('active');
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
            
            // Comparar solo la parte de la fecha YYYY-MM-DD
            const fechaP = p.fecha.split('T')[0]; 
            const matchFecha = busquedaFecha === "" || fechaP === busquedaFecha;
            
            return matchId && matchProv && matchFecha;
        });

        renderizarTabla(resultado);
    };

    if(inputId) inputId.addEventListener('input', filtrar);
    if(selectProv) selectProv.addEventListener('change', filtrar);
    if(inputFecha) inputFecha.addEventListener('change', filtrar);

    if(btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            inputId.value = '';
            selectProv.value = '';
            inputFecha.value = '';
            renderizarTabla(todosLosPedidos);
        });
    }
}