import { loadView } from '../views/viewLoader.js';

// Importar controladores
import { authenticateUser } from '../controllers/authController.js';
import { inventarioController } from '../controllers/inventarioController.js';
import { productoNuevoController } from '../controllers/productoNuevoController.js';
import { pedidosController } from '../controllers/pedidosController.js'; // Solo una vez
import { albaranesController } from '../controllers/albaranesController.js';    
import { recepcionController } from '../controllers/recepcionController.js';

const routes = {
    '': { view: 'landing', controller: null },
    '#login': { view: 'login', controller: authenticateUser },
    '#inicio': { view: 'inicio', controller: null },
    '#almacen': { view: 'almacen', controller: inventarioController },
    '#productoNuevo': { view: 'productoNuevo', controller: productoNuevoController },
    '#pedidos': { view: 'pedidos', controller: pedidosController }, // Ahora cargará el controlador
    '#albaranes': { view: 'albaranes', controller: albaranesController },
    '#recepcion': { view: 'recepcionPedidos', controller: recepcionController },
};

export const router = async () => {
    const path = window.location.hash;
    const routeInfo = routes[path] || routes[''];

    // 1. Manejo del Landing
    if (path === '') {
        await loadView('landing');
        const nav = document.getElementById('main-nav');
        if (nav) nav.style.display = 'none'; // Ocultar nav en landing
        bindLandingEvents();
        return;
    }

    // 2. Protección de rutas (Si no hay usuario, manda al login)
    const user = localStorage.getItem('user');
    if (!user && path !== '#login') {
        window.location.hash = '#login';
        return;
    }

    // 3. Cargar Vista
    await loadView(routeInfo.view);

    // 4. ACTUALIZAR BARRA DE NAVEGACIÓN
    updateNav(path);

    // 5. EJECUTAR CONTROLADOR (Lógica Mejorada)
    if (routeInfo.controller) {
        // Opción A: El controlador es un objeto con método init (Nuevo estándar MVC)
        if (typeof routeInfo.controller.init === 'function') {
            await routeInfo.controller.init();
        } 
        // Opción B: El controlador es una función directa (Código antiguo)
        else if (typeof routeInfo.controller === 'function') {
            routeInfo.controller();
        }
    }
};

// --- FUNCIONES AUXILIARES ---

function updateNav(currentPath) {
    const nav = document.getElementById('main-nav');
    const user = localStorage.getItem('user');

    // Lógica de visibilidad
    if (nav) {
        if (user && currentPath !== '#login') {
            nav.style.display = 'block';
        } else {
            nav.style.display = 'none';
        }

        // Lógica de clase "Active"
        const links = nav.querySelectorAll('a');
        links.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Lógica de Cerrar Sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.onclick = (e) => {
            e.preventDefault();
            logout();
        };
    }
}

function logout() {
    if(confirm('¿Seguro que quieres cerrar sesión?')) {
        localStorage.removeItem('user');
        window.location.hash = '';
    }
}

export const bindLandingEvents = () => {
    const btnAcceder = document.getElementById('btn-show-login');
    if (btnAcceder) {
        btnAcceder.addEventListener('click', () => {
            window.location.hash = '#login';
        });
    }
};

// ==========================================
// 🚀 INICIALIZACIÓN DE LA APP
// ==========================================

window.addEventListener('load', () => {
    router();
});

window.addEventListener('hashchange', router);