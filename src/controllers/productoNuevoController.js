import { dataService } from '../services/dataService.js';

let listaTemporal = [];
let isNewProvMode = false; // Estado para saber si estamos creando proveedor o seleccionando uno

export const productoNuevoController = async () => {
    console.log("Cargando controlador de Producto Nuevo...");
    listaTemporal = []; // Limpiamos la lista al entrar

    // --- Referencias al DOM ---
    const btnAgregar = document.getElementById('btn-anadir-a-tabla');
    const btnRegistrarDB = document.getElementById('btn-registrar-productos');
    const btnToggleProv = document.getElementById('btn-toggle-new-prov');
    
    const tablaTempBody = document.querySelector('#productos-temp-table tbody');
    const contador = document.getElementById('contador-productos-temp');

    // Inputs Producto
    const inputNombre = document.getElementById('new-producto-nombre');
    const inputSku = document.getElementById('new-producto-sku'); // Asegúrate que en tu HTML el ID sea este
    const inputPrecio = document.getElementById('new-producto-precio');
    const inputUnidad = document.getElementById('new-producto-unidad'); 
    const inputStockMin = document.getElementById('new-producto-stock-min');
    const selectCategoria = document.getElementById('select-categoria');

    // Inputs Proveedor
    const selectProveedor = document.getElementById('select-proveedor');
    const divNewProv = document.getElementById('new-prov-container'); // El contenedor de inputs nuevos
    const inputProvNombre = document.getElementById('new-prov-nombre');
    const inputProvEmail = document.getElementById('new-prov-email');
    const inputProvTel = document.getElementById('new-prov-telefono');
    const inputProvDir = document.getElementById('new-prov-direccion');

    // =================================================
    // 1. CARGAR DATOS INICIALES (Selects)
    // =================================================
    const cargarListas = async () => {
        try {
            console.log("Solicitando categorías y proveedores...");
            
            // CORRECCIÓN AQUI: Usamos los nombres exactos del dataService (getAll...)
            const [cats, provs] = await Promise.all([
                dataService.getAllCategorias(),
                dataService.getAllProveedores()
            ]);

            // Llenar Categorías
            if (selectCategoria) {
                selectCategoria.innerHTML = '<option value="">Selecciona Categoría</option>';
                if (cats && cats.length > 0) {
                    cats.forEach(c => {
                        selectCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
                    });
                } else {
                    console.warn("No se recibieron categorías.");
                }
            }

            // Llenar Proveedores
            if (selectProveedor) {
                selectProveedor.innerHTML = '<option value="">Selecciona Proveedor</option>';
                if (provs && provs.length > 0) {
                    provs.forEach(p => {
                        selectProveedor.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                    });
                } else {
                    console.warn("No se recibieron proveedores.");
                }
            }

        } catch (error) {
            console.error("Error cargando listas desplegables:", error);
            alert("Error de conexión al cargar las listas. Revisa la consola.");
        }
    };

    // Ejecutamos la carga inicial
    await cargarListas();


    // =================================================
    // 2. LÓGICA TOGGLE PROVEEDOR (Nuevo vs Existente)
    // =================================================
    if (btnToggleProv) {
        btnToggleProv.addEventListener('click', () => {
            isNewProvMode = !isNewProvMode; // Invertir estado

            if (isNewProvMode) {
                // Modo CREAR NUEVO
                if(selectProveedor) selectProveedor.style.display = 'none';
                if(divNewProv) divNewProv.style.display = 'block';
                btnToggleProv.innerText = '📋 Ver Lista';
                btnToggleProv.classList.add('btn-primary');
                btnToggleProv.classList.remove('btn-secondary');
                if(inputProvNombre) inputProvNombre.focus();
            } else {
                // Modo SELECCIONAR EXISTENTE
                if(selectProveedor) selectProveedor.style.display = 'block';
                if(divNewProv) divNewProv.style.display = 'none';
                btnToggleProv.innerText = '➕ Crear Nuevo';
                btnToggleProv.classList.add('btn-secondary');
                btnToggleProv.classList.remove('btn-primary');
            }
        });
    }

    // =================================================
    // 3. BOTÓN AÑADIR A LISTA TEMPORAL
    // =================================================
    if (btnAgregar) {
        btnAgregar.addEventListener('click', async () => {
            // Validaciones básicas del formulario
            if (!inputNombre.value || !inputPrecio.value || !selectCategoria.value) {
                alert("Por favor completa: Nombre, Precio y Categoría.");
                return;
            }

            let finalProvId = null;
            let finalProvNombre = "";

            // --- Lógica del Proveedor ---
            if (isNewProvMode) {
                // A) Estamos creando un proveedor nuevo al vuelo
                if (!inputProvNombre.value) {
                    alert("Escribe el nombre del nuevo proveedor.");
                    return;
                }

                // Creamos objeto proveedor
                const nuevoProvData = {
                    nombre: inputProvNombre.value,
                    email: inputProvEmail ? inputProvEmail.value : "",
                    telefono: inputProvTel ? inputProvTel.value : "",
                    direccion: inputProvDir ? inputProvDir.value : ""
                };

                // Enviamos a la API primero
                const resProv = await dataService.createProveedor(nuevoProvData);
                
                if (resProv && resProv.success) {
                    finalProvId = resProv.id; // El ID que nos devolvió la base de datos
                    finalProvNombre = inputProvNombre.value;
                    
                    // Recargamos el select para que aparezca el nuevo y lo seleccionamos
                    await cargarListas(); 
                    selectProveedor.value = finalProvId;
                    
                    // Volvemos visualmente al modo lista
                    btnToggleProv.click(); 
                } else {
                    alert("Error creando el proveedor. Revisa la consola.");
                    return;
                }

            } else {
                // B) Usamos un proveedor existente de la lista
                if (!selectProveedor.value) {
                    alert("Selecciona un proveedor de la lista.");
                    return;
                }
                finalProvId = selectProveedor.value;
                finalProvNombre = selectProveedor.options[selectProveedor.selectedIndex].text;
            }

            // --- Crear Objeto Temporal ---
            const itemTemp = {
                tempId: Date.now(),
                nombre: inputNombre.value,
                codigoBarras: inputSku ? inputSku.value : "SIN-SKU-" + Date.now(),
                precio: parseFloat(inputPrecio.value),
                unidadMedida: inputUnidad ? inputUnidad.value : "ud",
                stock: 0,
                stockMinimo: inputStockMin ? (parseInt(inputStockMin.value) || 5) : 5,
                descripcion: "", // Opcional
                categoriaId: parseInt(selectCategoria.value),
                proveedorId: parseInt(finalProvId),
                displayProv: finalProvNombre // Solo para mostrar en tabla HTML
            };

            // Añadir al array global
            listaTemporal.push(itemTemp);
            
            // Renderizar y limpiar
            renderTabla();
            limpiarInputsProducto();
        });
    }

    // =================================================
    // 4. RENDERIZAR TABLA TEMPORAL
    // =================================================
    const renderTabla = () => {
        if (!tablaTempBody) return;
        
        tablaTempBody.innerHTML = '';
        listaTemporal.forEach(item => {
            tablaTempBody.innerHTML += `
                <tr>
                    <td>${item.codigoBarras}</td>
                    <td><b>${item.nombre}</b></td>
                    <td>${item.precio.toFixed(2)} €</td>
                    <td>${item.unidadMedida}</td>
                    <td>${item.displayProv}</td>
                    <td>
                        <button class="btn-danger btn-sm" onclick="window.borrarTemp(${item.tempId})">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        if(contador) contador.innerText = listaTemporal.length;
        if(btnRegistrarDB) btnRegistrarDB.disabled = listaTemporal.length === 0;
    };

    // Función global para borrar desde el HTML
    window.borrarTemp = (id) => {
        listaTemporal = listaTemporal.filter(x => x.tempId !== id);
        renderTabla();
    };

    const limpiarInputsProducto = () => {
        inputNombre.value = '';
        if(inputSku) inputSku.value = '';
        inputPrecio.value = '';
        inputNombre.focus();
    };

    // =================================================
    // 5. REGISTRAR TODO EN BASE DE DATOS
    // =================================================
    if (btnRegistrarDB) {
        btnRegistrarDB.addEventListener('click', async () => {
            if(!confirm(`¿Confirmas registrar estos ${listaTemporal.length} productos en el inventario?`)) return;

            let exitosos = 0;
            let errores = 0;

            // Iteramos y enviamos uno por uno
            for (const item of listaTemporal) {
                // Preparamos objeto limpio para la API
                const dataToSend = {
                    nombre: item.nombre,
                    codigoBarras: item.codigoBarras,
                    stock: item.stock,
                    stockMinimo: item.stockMinimo,
                    precio: item.precio,
                    unidadMedida: item.unidadMedida,
                    descripcion: item.descripcion,
                    categoriaId: item.categoriaId,
                    proveedorId: item.proveedorId
                };

                const response = await dataService.createProducto(dataToSend);
                
                if (response && response.success) {
                    exitosos++;
                } else {
                    console.error("Fallo al guardar:", item.nombre, response);
                    errores++;
                }
            }

            // Resultado final
            alert(`Proceso finalizado.\n✅ Guardados correctamente: ${exitosos}\n❌ Errores: ${errores}`);

            if (exitosos > 0) {
                listaTemporal = [];
                renderTabla();
                // Opcional: ir a almacén
                 window.location.hash = '#almacen';
            }
        });
    }
};