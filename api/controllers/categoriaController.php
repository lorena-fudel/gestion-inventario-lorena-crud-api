<?php
// api/controllers/CategoriaController.php

function handleCategoriasRequest($pdo, $method, $id) {

    switch ($method) {

        // ===========================
        // GET — todas las categorías
        // ===========================
        case 'GET':
            try {
                if ($id) {
                    // Obtener categoría por ID
                    $stmt = $pdo->prepare("SELECT id, nombre FROM categorias WHERE id = ?");
                    $stmt->execute([$id]);
                    $cat = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($cat) {
                        echo json_encode($cat);
                    } else {
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Categoría no encontrada'
                        ]);
                    }

                } else {
                    // Obtener todas las categorías
                    $stmt = $pdo->query("SELECT id, nombre FROM categorias");
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                }

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al obtener categorías',
                    'error' => $e->getMessage()
                ]);
            }
            break;

        // ===========================
        // MÉTODO NO PERMITIDO
        // ===========================
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Método no permitido para categorías'
            ]);
            break;
    }
}
