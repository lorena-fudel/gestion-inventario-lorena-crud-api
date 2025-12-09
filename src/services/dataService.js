const API_BASE_URL_FILE = 'http://localhost/gestionInventarioLorenaCompl/api/index.php';

// Función genérica para manejar todas las peticiones de la API
const _fetchApi = async (resource, method = 'GET', data = null, id = null) => {
    let url = API_BASE_URL_FILE + `?resource=${resource}`;      
    if (id !== null) url += `&id=${id}`;

    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        // Si no hay contenido (204)
        if (response.status === 204) return { success: true };

        const text = await response.text();
        
        try {
            const result = JSON.parse(text);
            
            // SI LA RESPUESTA NO ES OK (ej: 409 o 500)
            if (!response.ok) {
                 console.warn(`API Error ${response.status}:`, result);
                 result.success = false; 
                 return result; 
            }
            return result; 

        } catch (jsonError) {
            console.error("Error parseando JSON:", text);
            return { success: false, error: "Error del servidor (formato inválido)" };
        }

    } catch (error) {
        console.error("Error de red:", error);
        return { success: false, error: "Error de conexión" };
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
    // Alias para compatibilidad con el controlador
    getProductos: async () => { return _fetchApi('productos', 'GET'); }, 

    getProductoById: async (id) => { return _fetchApi('productos', 'GET', null, id); },
    createProducto: async (nuevoProducto) => { return _fetchApi('productos', 'POST', nuevoProducto); },
    updateProducto: async (id, updatedProducto) => { return _fetchApi('productos', 'PUT', updatedProducto, id); },
    deleteProducto: async (id) => { return _fetchApi('productos', 'DELETE', null, id); },

    // =================================================
    // PROVEEDORES Y CATEGORÍAS
    // =================================================

    getAllProveedores: async () => { return _fetchApi('proveedores', 'GET'); },
    // Alias para compatibilidad con el controlador
    getProveedores: async () => { return _fetchApi('proveedores', 'GET'); },

    getAllCategorias: async () => { return _fetchApi('categorias', 'GET'); },   
    createProveedor: async (nuevoProv) => { return _fetchApi('proveedores', 'POST', nuevoProv); },

    // =================================================
    // PEDIDOS (NUEVA FUNCIONALIDAD AÑADIDA)
    // =================================================

    getAllPedidos: async () => { return _fetchApi('pedidos', 'GET'); },
    getPedidoById: async (id) => { return _fetchApi('pedidos', 'GET', null, id); }, 
    
    // ✅ AÑADIDO: Crear nuevo pedido en BBDD
    createPedido: async (nuevoPedido) => { return _fetchApi('pedidos', 'POST', nuevoPedido); },

    updatePedidoStatus: async (id, data) => { 
        // Adapta a la necesidad de actualizar solo el estado enviando un objeto o string
        if (typeof data === 'string') {
            data = { estado: data };
        }
        return _fetchApi('pedidos', 'PUT', data, id);
    },

    // =================================================
    // ALBARANES
    // =================================================

    createAlbaran: async (nuevoAlbaran) => { return _fetchApi('albaranes', 'POST', nuevoAlbaran); },
    getAllAlbaranes: async () => { return _fetchApi('albaranes', 'GET'); },
};