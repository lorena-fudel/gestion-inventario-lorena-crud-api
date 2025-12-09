<?php
// api/controllers/ProveedorController.php

function handleProveedoresRequest($pdo, $method, $id, $data) {

    switch ($method) {

        // ===========================
        // GET — lista o por ID
        // ===========================
        case 'GET':
            try {
                if ($id) {
                    $stmt = $pdo->prepare("SELECT id, nombre, email, telefono, direccion 
                                           FROM proveedores WHERE id = ?");
                    $stmt->execute([$id]);
                    $prov = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($prov) {
                        echo json_encode($prov);
                    } else {
                        http_response_code(404);
                        echo json_encode([
                            "success" => false,
                            "message" => "Proveedor no encontrado."
                        ]);
                    }

                } else {
                    $stmt = $pdo->query("SELECT id, nombre FROM proveedores");
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                }

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Error al obtener proveedores.",
                    "error" => $e->getMessage()
                ]);
            }
            break;

        // ===========================
        // POST — crear proveedor
        // ===========================
        case 'POST':

            // Validar datos
            if (!isset($data['nombre']) || trim($data['nombre']) === "") {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "El nombre del proveedor es obligatorio."
                ]);
                return;
            }

            $nombre = $data['nombre'];
            $email = $data['email'] ?? null;
            $telefono = $data['telefono'] ?? null;
            $direccion = $data['direccion'] ?? null;

            try {
                $sql = "INSERT INTO proveedores (nombre, email, telefono, direccion) 
                        VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);

                $stmt->execute([$nombre, $email, $telefono, $direccion]);

                echo json_encode([
                    "success" => true,
                    "id" => $pdo->lastInsertId(),
                    "nombre" => $nombre
                ]);

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Error al crear proveedor.",
                    "error" => $e->getMessage()
                ]);
            }
            break;

        // ===========================
        // MÉTODOS NO PERMITIDOS
        // ===========================
        default:
            http_response_code(405);
            echo json_encode([
                "success" => false,
                "message" => "Método no permitido para proveedores."
            ]);
            break;
    }
}
