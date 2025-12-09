<?php
// ====================================
// CONFIGURACIÓN INICIAL
// ====================================
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");


// ====================================
// INICIALIZAR API
// ====================================
require 'db_connect.php';

$resource = isset($_GET['resource']) ? strtolower(trim($_GET['resource'])) : null;
$id       = $_GET['id'] ?? null;
$method   = $_SERVER['REQUEST_METHOD'];
$data     = json_decode(file_get_contents("php://input"), true);

// ====================================
// ROUTER PRINCIPAL
// ====================================

switch ($resource) {

    case 'productos':
        require 'controllers/productoControllerr.php';
        handleProductosRequest($pdo, $method, $id, $data);
        break;

    case 'categorias':
        require 'controllers/categoriaController.php';
        handleCategoriasRequest($pdo, $method, $id);
        break;

    case 'proveedores':
        require 'controllers/proveedorController.php';
        handleProveedoresRequest($pdo, $method, $id, $data);
        break;

    case 'pedidos':
        require 'controllers/pedidosController.php';
        handlePedidosRequest($pdo, $method, $id, $data);
        break;

    case 'albaranes':
        require 'controllers/albaranController.php';
        handleAlbaranesRequest($pdo, $method, $id, $data);
        break;

    case 'auth':
        require 'controllers/authController.php';
        handleAuthRequest($pdo, $data);
        break;

    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Recurso no encontrado.'
        ]);
        break;
}
