import { dataService } from '../services/dataService.js';

// Estado Local
let pedidosPendientes = [];
let listaProductosNuevoPedido = []; // Almacena temporalmente los items del nuevo pedido

// Exponemos las funciones al global scope (necesario para el onclick en las filas HTML)
window.recibirPedido = null;
window.closeRecepcionForm = null; 
window.eliminarLineaPedido = null; // Para el botón de borrar fila en el modal de nuevo pedido

// Función auxiliar para cerrar modales (llamada desde el HTML)
function closeRecepcionForm() {
    const modalAlbaran = document.getElementById('albaranModal');
    const modalPedido = document.getElementById('modalNuevoPedido');
    if(modalAlbaran) modalAlbaran.style.display = 'none';
    if(modalPedido) modalPedido.style.display = 'none';
}


export const recepcionController = {
    
    init: async () => {
        console.log("🚀 Controlador de Recepción y Pedidos INICIADO");

        // 1. Cargar la tabla principal (Pedidos pendientes de recibir)
        await recepcionController.cargarTablaPrincipal();
        
        // 2. Adjuntar funciones de gestión al ámbito global
        window.recibirPedido = recepcionController.showRecepcionForm;
        window.closeRecepcionForm = closeRecepcionForm; 
        window.eliminarLineaPedido = recepcionController.eliminarLineaNuevoPedido;
        
        // 3. CONFIGURAR EVENTOS (Listeners)
        recepcionController.configurarEventos();
    },

    cargarTablaPrincipal: async () => {
        try {
            const todosLosPedidos = await dataService.getAllPedidos();
            // Filtramos: Solo mostramos los que no están 'cancelado'
            pedidosPendientes = todosLosPedidos.filter(p => p.estado !== 'cancelado');
            // Aplicamos el filtro visual actual
            recepcionController.aplicarFiltrosRecepcion(); 
        } catch (error) {
            console.error("Error cargando tabla principal:", error);
        }
    },

    configurarEventos: () => {
        // --- A. EVENTOS DE RECEPCIÓN (ALBARANES) ---
        const btnGuardarAlbaran = document.getElementById('btnGuardarAlbaran');
        if (btnGuardarAlbaran) {
            const newBtn = btnGuardarAlbaran.cloneNode(true);
            btnGuardarAlbaran.parentNode.replaceChild(newBtn, btnGuardarAlbaran);
            newBtn.addEventListener('click', recepcionController.guardarAlbaran);
        }
        
        const selectEstado = document.getElementById('filtroEstadoRecepcion');
        const btnLimpiar = document.getElementById('btnLimpiarRecepcion');
        if (selectEstado) selectEstado.addEventListener('change', recepcionController.aplicarFiltrosRecepcion);
        if (btnLimpiar) btnLimpiar.addEventListener('click', recepcionController.limpiarFiltrosRecepcion);

        // --- B. EVENTOS DE NUEVO PEDIDO (CREACIÓN) ---
        const btnNuevoPedido = document.getElementById('btn-nuevo-pedido');
        if (btnNuevoPedido) {
            btnNuevoPedido.addEventListener('click', recepcionController.abrirModalNuevoPedido);
        }

        const btnCerrarPedido = document.getElementById('btnCerrarModalPedido');
        const btnCancelarPedido = document.getElementById('btn-cancelar-pedido');
        if (btnCerrarPedido) btnCerrarPedido.addEventListener('click', closeRecepcionForm);
        if (btnCancelarPedido) btnCancelarPedido.addEventListener('click', closeRecepcionForm);

        const btnAgregarLinea = document.getElementById('btn-agregar-linea');
        if (btnAgregarLinea) {
            btnAgregarLinea.addEventListener('click', recepcionController.agregarLineaNuevoPedido);
        }

        const formNuevoPedido = document.getElementById('form-nuevo-pedido');
        if (formNuevoPedido) {
            formNuevoPedido.addEventListener('submit', recepcionController.guardarNuevoPedidoBD);
        }
    },

    // =========================================================================
    // BLOQUE 1: GESTIÓN DE NUEVO PEDIDO (MODAL CREACIÓN)
    // =========================================================================

    abrirModalNuevoPedido: async () => {
        const modal = document.getElementById('modalNuevoPedido');
        modal.style.display = 'flex';
        
        // Resetear estado del formulario
        document.getElementById('form-nuevo-pedido').reset();
        document.getElementById('np-fecha').valueAsDate = new Date(); // Fecha hoy por defecto
        listaProductosNuevoPedido = [];
        recepcionController.renderizarTablaNuevoPedido();

        // Configuración inicial de selects
        const selectProd = document.getElementById('np-producto-select');
        selectProd.innerHTML = '<option value="">Seleccione proveedor primero...</option>';
        selectProd.disabled = true; // Desactivar productos hasta elegir proveedor

        // Cargar Proveedores desde BBDD
        await recepcionController.cargarProveedoresEnSelect();
    },

    /**
     * Carga los proveedores de la BD y configura el evento de cambio
     */
    cargarProveedoresEnSelect: async () => {
        const selectProv = document.getElementById('np-proveedor');
        selectProv.innerHTML = '<option value="">Cargando...</option>';
        
        try {
            const proveedores = await dataService.getProveedores(); // Llamada a la API
            
            selectProv.innerHTML = '<option value="">Seleccione un proveedor...</option>';
            
            if (proveedores && proveedores.length > 0) {
                proveedores.forEach(prov => {
                    selectProv.innerHTML += `<option value="${prov.id}">${prov.nombre}</option>`;
                });

                // EVENTO IMPORTANTE: Al cambiar proveedor, cargar sus productos
                // Usamos replaceChild para evitar acumular listeners si se abre/cierra el modal
                const newSelect = selectProv.cloneNode(true);
                selectProv.parentNode.replaceChild(newSelect, selectProv);
                
                newSelect.addEventListener('change', (e) => {
                    const proveedorId = e.target.value;
                    recepcionController.cargarProductosDelProveedor(proveedorId);
                });

            } else {
                selectProv.innerHTML = '<option value="">No hay proveedores disponibles</option>';
            }
        } catch (error) {
            console.error("Error cargando proveedores:", error);
            selectProv.innerHTML = '<option value="">Error de conexión</option>';
        }
    },

    /**
     * Carga todos los productos y filtra por el proveedor seleccionado
     */
    cargarProductosDelProveedor: async (proveedorId) => {
        const selectProd = document.getElementById('np-producto-select');
        const inputCosto = document.getElementById('np-costo');
        
        // Resetear inputs
        selectProd.innerHTML = '<option value="">Cargando productos...</option>';
        selectProd.disabled = true;
        inputCosto.value = '';

        if (!proveedorId) {
            selectProd.innerHTML = '<option value="">Seleccione proveedor primero...</option>';
            return;
        }

        try {
            // Traemos todos los productos (Si tu API tiene filtro por proveedor, mejor usar eso)
            const todosLosProductos = await dataService.getProductos(); 
            
            // FILTRO: Solo productos que coincidan con el ID del proveedor
            // Usamos == por si vienen como string/number mezclados
            const productosFiltrados = todosLosProductos.filter(p => 
                p.proveedorId == proveedorId || p.proveedor_id == proveedorId
            );

            selectProd.innerHTML = '<option value="">Buscar producto...</option>';
            
            if (productosFiltrados.length > 0) {
                selectProd.disabled = false;
                productosFiltrados.forEach(prod => {
                    // Guardamos el precio en un atributo data para usarlo después
                    selectProd.innerHTML += `<option value="${prod.id}" data-precio="${prod.precio}">${prod.nombre}</option>`;
                });

                // Evento: Al elegir producto, poner el precio automáticamente
                selectProd.addEventListener('change', (e) => {
                    const option = e.target.options[e.target.selectedIndex];
                    const precio = option.getAttribute('data-precio');
                    if(precio) inputCosto.value = precio;
                });
            } else {
                selectProd.innerHTML = '<option value="">Este proveedor no tiene productos</option>';
            }

        } catch (error) {
            console.error("Error cargando productos:", error);
            selectProd.innerHTML = '<option value="">Error al cargar datos</option>';
        }
    },

    agregarLineaNuevoPedido: () => {
        const selectProd = document.getElementById('np-producto-select');
        const inputCant = document.getElementById('np-cantidad');
        const inputCosto = document.getElementById('np-costo');

        const prodId = selectProd.value;
        const prodNombre = selectProd.options[selectProd.selectedIndex]?.text;
        const cantidad = parseInt(inputCant.value);
        const costo = parseFloat(inputCosto.value);

        if (!prodId || cantidad <= 0 || isNaN(costo)) {
            alert("Por favor, selecciona un producto válido y cantidad > 0.");
            return;
        }

        // Agregar al array temporal
        listaProductosNuevoPedido.push({
            id: prodId,
            nombre: prodNombre,
            cantidad: cantidad,
            precioUnitario: costo,
            subtotal: cantidad * costo
        });

        // Limpiar inputs para la siguiente línea
        inputCant.value = 1;
        selectProd.value = "";
        inputCosto.value = "";
        selectProd.focus();

        recepcionController.renderizarTablaNuevoPedido();
    },

    eliminarLineaNuevoPedido: (index) => {
        listaProductosNuevoPedido.splice(index, 1);
        recepcionController.renderizarTablaNuevoPedido();
    },

    renderizarTablaNuevoPedido: () => {
        const tbody = document.getElementById('np-tabla-body');
        const totalSpan = document.getElementById('np-total-final');
        tbody.innerHTML = '';

        if (listaProductosNuevoPedido.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="texto-centro" style="color:#888">No hay productos añadidos.</td></tr>';
            totalSpan.innerText = '0.00 €';
            return;
        }

        let totalGeneral = 0;
        listaProductosNuevoPedido.forEach((item, index) => {
            totalGeneral += item.subtotal;
            tbody.innerHTML += `
                <tr>
                    <td>${item.nombre}</td>
                    <td class="texto-centro">${item.cantidad}</td>
                    <td class="texto-derecha">${item.precioUnitario.toFixed(2)} €</td>
                    <td class="texto-derecha">${item.subtotal.toFixed(2)} €</td>
                    <td class="texto-centro">
                        <button type="button" class="btn-reset" style="color:red; padding:2px 8px;" onclick="window.eliminarLineaPedido(${index})">🗑</button>
                    </td>
                </tr>
            `;
        });
        totalSpan.innerText = totalGeneral.toFixed(2) + ' €';
    },

    guardarNuevoPedidoBD: async (e) => {
        e.preventDefault();

        const proveedorId = document.getElementById('np-proveedor').value;
        const proveedorSelect = document.getElementById('np-proveedor');
        const proveedorNombre = proveedorSelect.options[proveedorSelect.selectedIndex]?.text;
        const fecha = document.getElementById('np-fecha').value;

        if (!proveedorId || listaProductosNuevoPedido.length === 0) {
            alert("Debes seleccionar un proveedor y agregar al menos un producto.");
            return;
        }

        const totalPedido = listaProductosNuevoPedido.reduce((sum, item) => sum + item.subtotal, 0);

        // Crear objeto Pedido
        const nuevoPedido = {
            // id: null, // El ID lo genera el backend normalmente
            proveedorId: proveedorId,
            proveedorNombre: proveedorNombre,
            fechaCreacion: fecha,
            estado: 'pendiente', 
            items: listaProductosNuevoPedido,
            total: totalPedido
        };

        try {
            const resultado = await dataService.createPedido(nuevoPedido);
            if (resultado && resultado.success !== false) {
                alert("✅ Pedido creado correctamente. Ahora espera la recepción de mercancía.");
                closeRecepcionForm();
                await recepcionController.cargarTablaPrincipal(); 
            } else {
                alert("Error al guardar el pedido: " + (resultado.error || "Error desconocido"));
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al guardar pedido.");
        }
    },


    // =========================================================================
    // BLOQUE 2: GESTIÓN DE RECEPCIÓN (CREAR ALBARÁN)
    // =========================================================================

    showRecepcionForm: async (pedidoId) => {
        try {
            const pedido = await dataService.getPedidoById(pedidoId);

            if (!pedido) {
                alert("Error: Pedido no encontrado.");
                return;
            }
            
            // Validación de estructura
            if (!pedido.items || !Array.isArray(pedido.items)) {
                alert("Error de datos: El pedido no tiene items.");
                return;
            }

            // Pre-rellenar modal Albarán
            document.getElementById('pedido-id-albaran').innerText = `Albarán para Pedido #${pedidoId}`;
            document.getElementById('albaran-fecha').valueAsDate = new Date();
            document.getElementById('albaran-pedido-id').value = pedidoId;
            document.getElementById('albaran-observaciones').value = '';

            recepcionController.renderizarItemsParaRecepcion(pedido);

            // Mostrar Modal
            document.getElementById('albaranModal').style.display = 'flex';
        } catch (error) {
            console.error("Error al abrir recepción:", error);
            alert("No se pudo cargar la información del pedido.");
        }
    },

    renderizarItemsParaRecepcion: (pedido) => {
        const tbody = document.getElementById('albaranProductosBody');
        const totalAlbaranElement = document.getElementById('albaran-total-monto');
        let totalMonto = 0;

        tbody.innerHTML = '';

        pedido.items.forEach(prod => {
            const precioUnitario = parseFloat(prod.precioUnitario || prod.precio || 0); // Manejo seguro de precio
            const cantidadPedida = parseInt(prod.cantidad || 0);
            const precioTotalLinea = precioUnitario * cantidadPedida;
            totalMonto += precioTotalLinea;

            // CORRECCIÓN CLAVE: Usamos prod.productoId o prod.id según lo que envíe el PHP
            const idProductoReal = prod.productoId || prod.id; 

            if (!idProductoReal) {
                console.error("⚠️ Error: Item sin ID de producto válido:", prod);
                return;
            }

            tbody.innerHTML += `
                <tr data-id="${idProductoReal}" data-nombre="${prod.nombre}" data-precio="${precioUnitario}" data-cantidad-pedida="${cantidadPedida}">
                    <td style="text-align:center;">
                        <input type="checkbox" class="check-recibido" checked>
                    </td>
                    <td>${prod.nombre}</td>
                    <td>${cantidadPedida}</td>
                    <td>${precioUnitario.toFixed(2)} €</td>
                    <td>
                        <input type="number" class="input-tabla input-cantidad-recibida" value="${cantidadPedida}" min="0" max="${cantidadPedida}">
                    </td>
                    <td style="font-weight: bold;">${precioTotalLinea.toFixed(2)} €</td>
                    <td>
                        <input type="text" class="input-tabla input-observaciones-prod" style="width:100%" placeholder="Nota...">
                    </td>
                </tr>
            `;
        });
        
        totalAlbaranElement.innerText = totalMonto.toFixed(2) + ' €';

        // Listeners para checkboxes
        const checks = tbody.querySelectorAll('.check-recibido');
        checks.forEach(check => {
            check.addEventListener('change', (e) => {
                const row = e.target.closest('tr');
                const inputCant = row.querySelector('.input-cantidad-recibida');
                inputCant.value = e.target.checked ? row.dataset.cantidadPedida : 0;
                inputCant.disabled = !e.target.checked;
            });
        });
    },

    guardarAlbaran: async () => {
        const pedidoId = document.getElementById('albaran-pedido-id').value;
        const fecha = document.getElementById('albaran-fecha').value;
        const observaciones = document.getElementById('albaran-observaciones').value;
        const filas = document.querySelectorAll('#albaranProductosBody tr');
        
        const productosRecibidos = [];
        let errorValidacion = false;

        // Recorrer filas de la tabla
        for (const fila of filas) {
            const cantidadPedida = parseInt(fila.dataset.cantidadPedida);
            const cantidadRecibida = parseInt(fila.querySelector('.input-cantidad-recibida').value);
            const check = fila.querySelector('.check-recibido');
            const productoId = parseInt(fila.dataset.id); // CORRECCIÓN: Parsear a entero

            if (check.checked) {
                if (!productoId) {
                    alert(`Error grave: No se encuentra el ID del producto ${fila.dataset.nombre}`);
                    errorValidacion = true;
                    break;
                }

                if (cantidadRecibida > cantidadPedida) {
                    alert(`Error: Cantidad excesiva en ${fila.dataset.nombre}`);
                    errorValidacion = true;
                    break;
                }
                
                if (cantidadRecibida > 0) {
                     productosRecibidos.push({
                        productoId: productoId, // ID validado
                        nombre: fila.dataset.nombre,
                        cantidad: cantidadRecibida,
                        precioUnitario: parseFloat(fila.dataset.precio),
                        observaciones: fila.querySelector('.input-observaciones-prod').value
                    });
                }
            }
        }

        if (errorValidacion) return;

        if (productosRecibidos.length === 0) {
            return alert('No has marcado ningún producto como recibido o las cantidades son 0.');
        }

        // Crear Objeto Albarán
        const nuevoAlbaran = {
            pedidoId: parseInt(pedidoId),
            fechaRecepcion: fecha,
            observacionesGenerales: observaciones,
            productos: productosRecibidos
        };

        console.log("📤 Enviando Albarán:", nuevoAlbaran); // Para depuración

        try {
            const albaranGuardado = await dataService.createAlbaran(nuevoAlbaran);

            if (albaranGuardado && albaranGuardado.success !== false) {
                // Cálculo simple de estado
                await dataService.updatePedidoStatus(pedidoId, 'recibido');
                
                alert(`✅ Albarán creado correctamente.`);
                closeRecepcionForm();
                recepcionController.cargarTablaPrincipal(); 
            } else {
                alert('Error al guardar el albarán: ' + (albaranGuardado.message || albaranGuardado.error || "Error desconocido"));
            }
        } catch (error) {
            console.error(error);
            alert("Error de red al guardar albarán");
        }
    },

    // =========================================================================
    // BLOQUE 3: FILTROS Y UTILIDADES
    // =========================================================================

    aplicarFiltrosRecepcion: () => {
        const selectEstado = document.getElementById('filtroEstadoRecepcion');
        if(!selectEstado) return;
        
        const estadoFiltro = selectEstado.value; 

        const listaFiltrada = pedidosPendientes.filter(p => {
            const estadoActual = (p.estado || '').toLowerCase(); 
            if (estadoFiltro === "") {
                return estadoActual !== 'recibido' && estadoActual !== 'cancelado';
            } else if (estadoFiltro === "recibido") {
                 return estadoActual === 'recibido';
            } else {
                return estadoActual === estadoFiltro;
            }
        });

        recepcionController.renderizarTablaPrincipal(listaFiltrada);
    },

    limpiarFiltrosRecepcion: () => {
        const selectEstado = document.getElementById('filtroEstadoRecepcion');
        if (selectEstado) selectEstado.value = "";
        recepcionController.aplicarFiltrosRecepcion();
    },

    renderizarTablaPrincipal: (pedidos) => {
        const tbody = document.getElementById('tablaPedidosRecepcionBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay pedidos en este estado.</td></tr>';
            return;
        }

        pedidos.forEach(p => {
            let badgeClass = 'pendiente';
            const estado = (p.estado || 'pendiente').toLowerCase();
            if (estado === 'parcial') badgeClass = 'parcial';
            if (estado === 'recibido') badgeClass = 'recibido';

            const estadoBadge = `<span class="badge badge-${badgeClass}">${estado.toUpperCase()}</span>`;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.id}</strong></td>
                    <td>${p.proveedorNombre || '---'}</td>
                    <td>${p.fechaCreacion || '---'}</td>
                    <td>${parseFloat(p.total || 0).toFixed(2)} €</td>
                    <td>${estadoBadge}</td>
                    <td class="texto-centro">
                        <button class="boton-secundario" onclick="recibirPedido(${p.id})" title="Crear Albarán de Recepción">
                            📦 Recibir
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}; 