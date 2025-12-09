const API_BASE_URL_FILE = 'http://localhost/FuncionesVanillaGestion-inventario-entregable2-dbConnectVanilla/api/index.php'; 

// Función genérica para manejar todas las peticiones de la API
const _fetchApi = async (resource, method = 'GET', data = null, id = null) => {
    let url = API_BASE_URL_FILE + `?resource=${resource}`;      
    if (id !== null) {
        url += `&id=${id}`;
    }

    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        // 1. Manejar Respuestas Sin Contenido
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return { success: true, message: "Operación exitosa." };
        }
        
        // 🛑 CAMBIO CLAVE AQUÍ: Leemos como TEXTO primero para ver si es HTML o JSON
        const text = await response.text();
        
        try {
            // Intentamos convertir ese texto a JSON
            const result = JSON.parse(text);
            
            if (!response.ok) {
                 console.error(`Error ${response.status} API:`, result.message);
                 return null; 
            }
            return result; 

        } catch (jsonError) {
            // SI FALLA AQUÍ, SIGNIFICA QUE PHP ENVIÓ HTML (EL ERROR REAL)
            console.error("🔥 EL SERVIDOR PHP RESPONDIÓ CON UN ERROR (NO ES JSON):");
            console.log(text); // <--- ESTO te mostrará el error exacto de PHP en la consola
            return null;
        }

    } catch (error) {
        console.error("Error de red crítico:", error);
        return null;
    }
};


export const dataService = {
    // =================================================
    // AUTENTICACIÓN
    // =================================================
    authenticateUser: async (username, password) => {
        const data = await _fetchApi('auth', 'POST', { username, password });
        if (data && data.success) {
            return data.user;
        }
        return null;
    },

    // =================================================
    // PRODUCTOS (CRUD)
    // =================================================
    
    getAllProductos: async () => { return _fetchApi('productos', 'GET'); },
    getProductoById: async (id) => { return _fetchApi('productos', 'GET', null, id); },
    createProducto: async (nuevoProducto) => { return _fetchApi('productos', 'POST', nuevoProducto); },
    updateProducto: async (id, updatedProducto) => { return _fetchApi('productos', 'PUT', updatedProducto, id); },
    deleteProducto: async (id) => { return _fetchApi('productos', 'DELETE', null, id); },

    // =================================================
    // PROVEEDORES Y CATEGORÍAS
    // =================================================

    getAllProveedores: async () => { return _fetchApi('proveedores', 'GET'); },
    getAllCategorias: async () => { return _fetchApi('categorias', 'GET'); },   
    createProveedor: async (nuevoProv) => { return _fetchApi('proveedores', 'POST', nuevoProv); },


    // =================================================
    // PEDIDOS Y ALBARANES (Lógica Corregida)
    // =================================================

    getAllPedidos: async () => { return _fetchApi('pedidos', 'GET'); },
    getPedidoById: async (id) => { return _fetchApi('pedidos', 'GET', null, id); }, 
    
    createAlbaran: async (nuevoAlbaran) => { return _fetchApi('albaranes', 'POST', nuevoAlbaran); },
    getAllAlbaranes: async () => { return _fetchApi('albaranes', 'GET'); },

    updatePedidoStatus: async (id, data) => { 
        // 🟢 FIX: Se adapta a la necesidad de actualizar solo el estado
        if (typeof data === 'string') {
            data = { estado: data };
        }
        return _fetchApi('pedidos', 'PUT', data, id);
    },
};