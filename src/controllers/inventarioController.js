import { dataService } from '../services/dataService.js';

export const inventarioController = async () => {
    console.log("🚀 Iniciando inventarioController...");

    // Variable para guardar TODOS los productos y poder filtrar sin recargar
    let todosLosProductos = [];

    // =================================================
    // 1. REFERENCIAS AL DOM
    // =================================================
    const getEl = (id) => document.getElementById(id);

    // --- Tabla y Filtros ---
    const tablaBody = document.querySelector('#tabla-inventario tbody');
    const inputBusqueda = getEl('filtro-producto-nombre');
    const selectFiltroCategoria = getEl('filtro-producto-categoria');
    const btnFiltrar = getEl('btn-filtrar-inventario'); // Opcional si lo hacemos en tiempo real

    // --- Modales y Formularios ---
    const btnAbrirModalProd = getEl('btn-abrir-modal-producto');
    const modalProd = getEl('producto-modal');
    const formProducto = getEl('producto-form');
    const modalTitle = getEl('modal-title');
    
    // Inputs Producto
    const inputId = getEl('producto-id');
    const inputNombre = getEl('producto-nombre');
    const inputSku = getEl('producto-sku');
    const selectCategoria = getEl('producto-categoria');
    const selectProveedor = getEl('producto-proveedor');
    const inputStock = getEl('producto-stock');
    const inputStockMin = getEl('producto-stock-minimo');
    const inputPrecio = getEl('producto-precio');
    const inputUnidad = getEl('producto-unidad-medida');
    const inputDesc = getEl('producto-descripcion');

    // --- Modal Proveedor ---
    const btnAbrirModalProv = getEl('btn-abrir-modal-proveedor');
    const modalProv = getEl('proveedor-modal');
    const formProveedor = getEl('proveedor-form');


    // =================================================
    // 2. LÓGICA DE VISUALIZACIÓN (TABLA)
    // =================================================

    // Función que SOLO se encarga de pintar filas en la tabla
    const renderizarTabla = (listaDeProductos) => {
        tablaBody.innerHTML = '';

        if (!listaDeProductos || listaDeProductos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No se encontraron productos.</td></tr>';
            return;
        }

        listaDeProductos.forEach(p => {
            const stockClass = (p.stock <= p.stockMinimo) ? 'color:red;font-weight:bold;' : '';
            
            // Seguridad: verificar que categoria/proveedor existen
            const catNombre = p.categoria ? p.categoria.nombre : (p.categoria_nombre || '-');
            const provNombre = p.proveedor ? p.proveedor.nombre : (p.proveedor_nombre || '-');

            tablaBody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td><b>${p.nombre}</b></td>
                    <td>${p.codigoBarras || '-'}</td>
                    <td style="${stockClass}">${p.stock}</td>
                    <td>${p.stockMinimo}</td>
                    <td>${parseFloat(p.precio).toFixed(2)} €</td>
                    <td>${catNombre}</td>
                    <td>${provNombre}</td>
                    <td style="display:flex;gap:5px;justify-content:center;">
                        <button class="btn-secondary btn-sm" onclick="window.editarProducto(${p.id})">✏️</button>
                        <button class="btn-danger btn-sm" onclick="window.borrarProducto(${p.id}, '${p.nombre}')">🗑️</button>
                    </td>
                </tr>`;
        });
    };

    // Función que carga los datos de la API
    const cargarInventario = async () => {
        tablaBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Cargando inventario...</td></tr>';
        try {
            // Guardamos en la variable GLOBAL
            todosLosProductos = await dataService.getAllProductos();
            
            // Pintamos la tabla inicial
            renderizarTabla(todosLosProductos);
        } catch (error) {
            console.error("Error cargando inventario:", error);
            tablaBody.innerHTML = '<tr><td colspan="9">Error de conexión.</td></tr>';
        }
    };


    // =================================================
    // 3. LÓGICA DE FILTRADO (Buscador)
    // =================================================
    
    const aplicarFiltros = () => {
        const texto = inputBusqueda.value.toLowerCase();
        const catId = selectFiltroCategoria.value;

        // Filtramos el array global 'todosLosProductos'
        const productosFiltrados = todosLosProductos.filter(p => {
            // 1. Filtro por Texto (Nombre o SKU)
            const matchTexto = p.nombre.toLowerCase().includes(texto) || 
                               (p.codigoBarras && p.codigoBarras.toLowerCase().includes(texto));
            
            // 2. Filtro por Categoría
            // Nota: p.categoriaId puede venir como string o numero, igualamos tipos
            const pCatId = p.categoriaId || (p.categoria ? p.categoria.id : null);
            const matchCategoria = catId === "" || pCatId == catId;

            return matchTexto && matchCategoria;
        });

        renderizarTabla(productosFiltrados);
    };

    // Event Listeners para filtrado en tiempo real
    if (inputBusqueda) {
        inputBusqueda.addEventListener('keyup', aplicarFiltros);
        inputBusqueda.addEventListener('search', aplicarFiltros); // Para cuando borran con la X del input
    }
    if (selectFiltroCategoria) {
        selectFiltroCategoria.addEventListener('change', aplicarFiltros);
    }
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltros);
    }


    // =================================================
    // 4. CARGA DE LISTAS DESPLEGABLES (Modal y Filtros)
    // =================================================
    const cargarListasDesplegables = async () => {
        try {
            const [cats, provs] = await Promise.all([
                dataService.getAllCategorias(),
                dataService.getAllProveedores()
            ]);

            // 1. Llenar Select del MODAL DE PRODUCTO
            if (selectCategoria) {
                const currentCat = selectCategoria.value;
                selectCategoria.innerHTML = '<option value="">Selecciona Categoría</option>';
                cats.forEach(c => selectCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
                if(currentCat) selectCategoria.value = currentCat;
            }

            // 2. Llenar Select de PROVEEDOR (Modal)
            if (selectProveedor) {
                const currentProv = selectProveedor.value;
                selectProveedor.innerHTML = '<option value="">Selecciona Proveedor</option>';
                provs.forEach(p => selectProveedor.innerHTML += `<option value="${p.id}">${p.nombre}</option>`);
                if(currentProv) selectProveedor.value = currentProv;
            }

            // 3. ✅ LLENAR SELECT DEL FILTRO (Buscador)
            if (selectFiltroCategoria) {
                // Guardamos seleccion actual por si acaso
                const filtroActual = selectFiltroCategoria.value;
                selectFiltroCategoria.innerHTML = '<option value="">Todas las Categorías</option>';
                cats.forEach(c => {
                    selectFiltroCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
                });
                if(filtroActual) selectFiltroCategoria.value = filtroActual;
            }

        } catch (error) {
            console.error("Error cargando listas:", error);
        }
    };


    // =================================================
    // 5. LÓGICA MODALES (Nuevo/Editar)
    // =================================================

    // --- Cierre Genérico de Modales ---
    const cerrarModales = () => {
        if(modalProd) modalProd.style.display = 'none';
        if(modalProv) modalProv.style.display = 'none';
    };
    document.querySelectorAll('.close-button, .btn-secondary').forEach(btn => {
        if(['btn-cancelar-producto','btn-cancelar-proveedor','close-producto','close-proveedor'].includes(btn.id) || btn.classList.contains('close-button')){
            btn.addEventListener('click', cerrarModales);
        }
    });

    // --- Modal Producto ---
    if (btnAbrirModalProd) {
        btnAbrirModalProd.addEventListener('click', async () => {
            await cargarListasDesplegables();
            formProducto.reset();
            inputId.value = '';
            modalTitle.innerText = "Registrar Nuevo Producto";
            modalProd.style.display = 'block';
        });
    }

    if (formProducto) {
        formProducto.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validaciones rápidas
            if(!selectCategoria.value || !selectProveedor.value) {
                alert("Selecciona categoría y proveedor."); return;
            }

            const data = {
                nombre: inputNombre.value,
                codigoBarras: inputSku.value,
                stock: inputStock.value,
                stockMinimo: inputStockMin.value,
                precio: inputPrecio.value,
                unidadMedida: inputUnidad.value,
                descripcion: inputDesc.value,
                categoriaId: selectCategoria.value,
                proveedorId: selectProveedor.value
            };

            const id = inputId.value;
            let res;
            
            if (id) res = await dataService.updateProducto(id, data);
            else res = await dataService.createProducto(data);

            if (res && (res.success || res.id || res.affected)) {
                alert("Guardado correctamente.");
                cerrarModales();
                await cargarInventario(); // Recargamos datos (esto limpiará filtros)
                // Opcional: Si quieres mantener el filtro tras guardar, llama a aplicarFiltros() en vez de cargarInventario()
            } else {
                alert("Error al guardar.");
            }
        });
    }

    // --- Modal Proveedor ---
    if (btnAbrirModalProv) {
        btnAbrirModalProv.addEventListener('click', () => {
            modalProv.style.display = 'block';
            if(formProveedor) formProveedor.reset();
        });
    }

    if (formProveedor) {
        formProveedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nuevoProv = {
                nombre: getEl('prov-nombre').value,
                email: getEl('prov-email').value,
                telefono: getEl('prov-telefono').value,
                direccion: getEl('prov-direccion').value
            };
            const res = await dataService.createProveedor(nuevoProv);
            if(res && res.success) {
                alert("Proveedor creado.");
                cerrarModales();
                await cargarListasDesplegables(); // Refrescar desplegables
            } else { alert("Error creando proveedor."); }
        });
    }


    // =================================================
    // 6. FUNCIONES GLOBALES (Editar / Borrar)
    // =================================================
    window.editarProducto = async (id) => {
        const p = todosLosProductos.find(prod => prod.id == id) || await dataService.getProductoById(id);
        if(!p) return;

        await cargarListasDesplegables();

        inputId.value = p.id;
        inputNombre.value = p.nombre;
        inputSku.value = p.codigoBarras;
        inputStock.value = p.stock;
        inputStockMin.value = p.stockMinimo;
        inputPrecio.value = p.precio;
        inputUnidad.value = p.unidadMedida;
        inputDesc.value = p.descripcion;
        
        // Asignar selects
        selectCategoria.value = p.categoriaId || p.categoria?.id || "";
        selectProveedor.value = p.proveedorId || p.proveedor?.id || "";

        modalTitle.innerText = `Editar Producto #${id}`;
        modalProd.style.display = 'block';
    };

    window.borrarProducto = async (id, nombre) => {
        if(confirm(`¿Eliminar "${nombre}"?`)) {
            const res = await dataService.deleteProducto(id);
            if(res) cargarInventario();
        }
    };

    // =================================================
    // 7. INICIALIZACIÓN
    // =================================================
    // Cargamos productos y TAMBIÉN las listas para el filtro
    await Promise.all([
        cargarInventario(),
        cargarListasDesplegables()
    ]);
};