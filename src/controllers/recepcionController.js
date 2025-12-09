import { dataService } from '../services/dataService.js';

let pedidosPendientes = [];

// Exponemos las funciones al global scope (necesario para el onclick en las filas)
window.recibirPedido = null;
window.closeRecepcionForm = null; 

// Función auxiliar para cerrar el modal (llamada desde el HTML)
function closeRecepcionForm() {
    const modal = document.getElementById('albaranModal');
    if(modal) modal.style.display = 'none';
}


export const recepcionController = {
    
    init: async () => {
        console.log("Controlador de Recepción de Pedidos INICIADO");

        // 1. Cargar datos en paralelo
        const todosLosPedidos = await dataService.getAllPedidos();
        // Filtramos: No entregados y No cancelados
        pedidosPendientes = todosLosPedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado');

        // 2. Renderizar lista inicial
        renderizarListaPedidos(pedidosPendientes);
        
        // 3. Adjuntar funciones de gestión al ámbito global
        window.recibirPedido = recepcionController.showRecepcionForm;
        window.closeRecepcionForm = closeRecepcionForm; 
        
        // 4. Configurar eventos de guardar (Botón en el modal)
        const btnGuardarAlbaran = document.getElementById('btnGuardarAlbaran');
        if (btnGuardarAlbaran) {
            btnGuardarAlbaran.removeEventListener('click', recepcionController.guardarAlbaran);
            btnGuardarAlbaran.addEventListener('click', recepcionController.guardarAlbaran);
        }
        
        // 5. CONFIGURACIÓN DE FILTROS
        const selectEstado = document.getElementById('filtroEstadoRecepcion');
        const btnLimpiar = document.getElementById('btnLimpiarRecepcion');

        if (selectEstado) selectEstado.addEventListener('change', aplicarFiltrosRecepcion);
        if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltrosRecepcion);
    },

    /**
     * Muestra el formulario de Albarán en un MODAL para un Pedido específico
     * @param {number} pedidoId
     */
    showRecepcionForm: async (pedidoId) => {
        const pedido = await dataService.getPedidoById(pedidoId);

        if (!pedido) {
            console.error(`Error: Pedido ID ${pedidoId} no encontrado en dataService.`);
            alert("Error: Pedido no encontrado o datos de servicio fallidos.");
            return;
        }
        
        // Validación de seguridad para la estructura de productos
        if (!pedido.items || !Array.isArray(pedido.items)) {
            console.error("El objeto pedido no contiene el array 'items' para renderizar.");
            alert("Error de datos: El pedido no tiene lista de items asociados.");
            return;
        }

        // Pre-rellenar datos generales del albarán
        document.getElementById('pedido-id-albaran').innerText = `Albarán para Pedido N° ${pedidoId}`;
        document.getElementById('albaran-fecha').valueAsDate = new Date();
        document.getElementById('albaran-pedido-id').value = pedidoId;
        document.getElementById('albaran-observaciones').value = '';

        renderizarFormularioAlbaran(pedido);

        // Mostrar Modal
        document.getElementById('albaranModal').style.display = 'flex';
    },

    /**
     * Guarda el Albarán con la mercancía chequeada y actualiza el estado del Pedido.
     */
    guardarAlbaran: async () => {
        const pedidoId = document.getElementById('albaran-pedido-id').value;
        const pedido = await dataService.getPedidoById(pedidoId);
        if (!pedido) return alert("Error: Pedido no encontrado para guardar el albarán.");

        const fecha = document.getElementById('albaran-fecha').value;
        const observaciones = document.getElementById('albaran-observaciones').value;
        const filas = document.querySelectorAll('#albaranProductosBody tr');
        
        const productosRecibidos = [];
        // 🟢 FIX: Usamos pedido.items para la longitud del array
        let productosTotalPedido = pedido.items.length; 
        let productosCompletamenteRecibidos = 0;
        let productosNoRecibidos = 0;

        for (const fila of filas) {
            const cantidadPedida = parseInt(fila.dataset.cantidadPedida);
            const cantidadRecibida = parseInt(fila.querySelector('.input-cantidad-recibida').value);
            
            // 1. VALIDACIÓN
            if (cantidadRecibida < 0 || cantidadRecibida > cantidadPedida) {
                return alert(`Error: Cantidad recibida de ${fila.dataset.nombre} es inválida (debe ser entre 0 y ${cantidadPedida}).`);
            }
            
            // 2. REGISTRO
            if (cantidadRecibida > 0) {
                 productosRecibidos.push({
                    productoId: fila.dataset.id,
                    cantidad: cantidadRecibida,
                    precioUnitario: parseFloat(fila.dataset.precio),
                    observaciones: fila.querySelector('.input-observaciones-prod').value
                });
                
                if (cantidadRecibida === cantidadPedida) {
                    productosCompletamenteRecibidos++;
                }
            } else {
                productosNoRecibidos++;
            }
        }

        if (productosRecibidos.length === 0) {
            return alert('Debes ingresar la cantidad de al menos un producto recibido.');
        }

        // 3. Crear Objeto Albarán
        const nuevoAlbaran = {
            id: Date.now(),
            pedidoId: parseInt(pedidoId),
            fechaRecepcion: fecha,
            observacionesGenerales: observaciones,
            productos: productosRecibidos // El array que se guardará en el albarán
        };

        // 4. Guardar Albarán (Simulado)
        const albaranGuardado = await dataService.createAlbaran(nuevoAlbaran);

        if (albaranGuardado) {
            alert(`Albarán N° ${albaranGuardado.id} creado con éxito. Actualizando estado del pedido.`);
            
            // 5. Actualizar estado del Pedido (Lógica clave Parcial/Entregado)
            let nuevoEstado;
            if (productosCompletamenteRecibidos === productosTotalPedido) {
                nuevoEstado = 'recibido'; 
            } else {
                nuevoEstado = 'parcial'; 
            }

            await dataService.updatePedidoStatus(pedidoId, nuevoEstado);

            // 6. Cerrar Modal y Recargar
            closeRecepcionForm();
            recepcionController.init(); 

        } else {
            alert('Error al guardar el albarán.');
        }
    }
};

// --- FUNCIÓN DE FILTRADO ---

/**
 * Filtra los pedidos según el estado seleccionado.
 */
function aplicarFiltrosRecepcion() {
    const selectEstado = document.getElementById('filtroEstadoRecepcion');
    const estado = selectEstado.value; 

    const listaFiltrada = pedidosPendientes.filter(p => {
        const estadoActual = p.estado.toLowerCase(); 

        if (estado === "") {
            // Opción por defecto: Muestra pendientes y parciales (activos)
            return estadoActual !== 'recibido' && estadoActual !== 'cancelado';
        } else {
            // Filtra por un estado específico
            return estadoActual === estado;
        }
    });

    renderizarListaPedidos(listaFiltrada);
}

/**
 * Resetea el filtro de estado y vuelve a renderizar la lista completa.
 */
function limpiarFiltrosRecepcion() {
    const selectEstado = document.getElementById('filtroEstadoRecepcion');
    if (selectEstado) {
        selectEstado.value = ""; // Vuelve a la opción por defecto
    }
    aplicarFiltrosRecepcion(); // Muestra el estado inicial
}


// --- RENDERIZADO DE VISTA Y LÓGICA DE CHEQUEO ---

function renderizarListaPedidos(pedidos) {
    const tbody = document.getElementById('tablaPedidosRecepcionBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay pedidos pendientes de recepción.</td></tr>';
        return;
    }

    pedidos.forEach(p => {
        const estadoBadge = `<span class="badge badge-${p.estado}">${p.estado.toUpperCase()}</span>`;
        
        tbody.innerHTML += `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td>${p.proveedorNombre || 'Proveedor Desconocido'}</td>
                <td>${p.fechaCreacion || 'N/A'}</td>
                <td>${parseFloat(p.total || 0).toFixed(2)} €</td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn-primary btn-accion" onclick="recibirPedido(${p.id})">
                        Recibir Mercancía
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderizarFormularioAlbaran(pedido) {
    if (!pedido || !Array.isArray(pedido.items)) {
        document.getElementById('albaranProductosBody').innerHTML = 
            '<tr><td colspan="7" style="text-align:center;">Error de datos: Pedido sin lista de ítems (propiedad "items" faltante).</td></tr>';
        document.getElementById('albaran-total-monto').innerText = '0.00 €';
        return;
    }
    
    const tbody = document.getElementById('albaranProductosBody');
    const totalAlbaranElement = document.getElementById('albaran-total-monto');
    let totalMonto = 0;

    tbody.innerHTML = '';

    // 🟢 FIX: Iteramos sobre pedido.items
    pedido.items.forEach(prod => {
        const precioUnitario = parseFloat(prod.precioUnitario || 0);
        const cantidadPedida = parseInt(prod.cantidad || 0);
        const precioTotalLinea = precioUnitario * cantidadPedida;
        totalMonto += precioTotalLinea;

        tbody.innerHTML += `
            <tr data-id="${prod.id}" data-nombre="${prod.nombre}" data-precio="${precioUnitario}" data-cantidad-pedida="${cantidadPedida}">
                <td style="text-align:center;">
                    <input type="checkbox" class="check-recibido" checked>
                </td>
                <td>${prod.nombre}</td>
                <td>${cantidadPedida}</td>
                <td>${precioUnitario.toFixed(2)} €</td>
                <td>
                    <input type="number" class="input-cantidad-recibida" value="${cantidadPedida}" min="0" max="${cantidadPedida}" style="width: 70px;">
                </td>
                <td style="font-weight: bold;">${precioTotalLinea.toFixed(2)} €</td>
                <td>
                    <input type="text" class="input-observaciones-prod" placeholder="Faltante, dañado, etc.">
                </td>
            </tr>
        `;
    });
    
    totalAlbaranElement.innerText = totalMonto.toFixed(2) + ' €';

    // Lógica para enlazar Checkbox y Cantidad:
    const checks = tbody.querySelectorAll('.check-recibido');
    checks.forEach(check => {
        check.addEventListener('change', (e) => {
            const row = e.target.closest('tr');
            const inputCant = row.querySelector('.input-cantidad-recibida');
            const cantidadPedida = parseInt(row.dataset.cantidadPedida);
            
            if (e.target.checked) {
                inputCant.value = cantidadPedida;
                inputCant.disabled = false;
            } else {
                inputCant.value = 0;
                inputCant.disabled = true;
            }
        });
    });
    
    // Si el usuario cambia la cantidad, forzar el chequeo.
    const inputsCant = tbody.querySelectorAll('.input-cantidad-recibida');
    inputsCant.forEach(input => {
        input.addEventListener('input', (e) => {
             const row = e.target.closest('tr');
             const check = row.querySelector('.check-recibido');
             if (parseInt(e.target.value) > 0) {
                 check.checked = true;
             } else {
                 check.checked = false;
             }
        });
    });
}