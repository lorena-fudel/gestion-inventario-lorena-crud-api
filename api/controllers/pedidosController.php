<?php
// api/controllers/PedidoController.php

function handlePedidosRequest($pdo, $method, $id, $data) {

    switch ($method) {

        // =========================================
        // GET (uno o todos)
        // =========================================
        case 'GET':
            try {

                if ($id) {
                    // Cabecera
                    $stmt = $pdo->prepare("
                        SELECT p.*, pr.nombre AS proveedorNombre 
                        FROM pedidos p 
                        LEFT JOIN proveedores pr ON p.proveedorId = pr.id 
                        WHERE p.id = ?
                    ");
                    $stmt->execute([$id]);
                    $pedido = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$pedido) {
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Pedido no encontrado.'
                        ]);
                        return;
                    }

                    // Items
                    $stmt_items = $pdo->prepare("
                        SELECT pi.*, prod.nombre, prod.unidadMedida 
                        FROM pedido_items pi 
                        JOIN productos prod ON pi.productoId = prod.id 
                        WHERE pi.pedidoId = ?
                    ");
                    $stmt_items->execute([$id]);
                    $pedido['items'] = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

                    echo json_encode($pedido);
                
                } else {
                    // Lista completa
                    $stmt = $pdo->query("
                        SELECT p.*, pr.nombre AS proveedorNombre 
                        FROM pedidos p 
                        LEFT JOIN proveedores pr ON p.proveedorId = pr.id 
                        ORDER BY p.fechaCreacion DESC
                    ");
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                }

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al obtener pedidos.',
                    'error' => $e->getMessage()
                ]);
            }
            break;


        // =========================================
        // POST — Crear Pedido
        // =========================================
        case 'POST':

            // Validación básica
            if (!isset($data['fechaCreacion'], $data['total'], $data['proveedorId'], $data['items'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan datos obligatorios para crear un pedido.'
                ]);
                return;
            }

            try {
                $pdo->beginTransaction();

                // 1. Insertar cabecera
                $sql_cabecera = "
                    INSERT INTO pedidos (fechaCreacion, total, estado, proveedorId)
                    VALUES (?, ?, 'pendiente', ?)
                ";
                $stmt = $pdo->prepare($sql_cabecera);
                $stmt->execute([
                    $data['fechaCreacion'], 
                    $data['total'], 
                    $data['proveedorId']
                ]);

                $pedidoId = $pdo->lastInsertId();

                // 2. Insertar items
                $sql_items = "
                    INSERT INTO pedido_items (pedidoId, productoId, cantidad, precio)
                    VALUES (?, ?, ?, ?)
                ";
                $stmt_items = $pdo->prepare($sql_items);

                foreach ($data['items'] as $item) {
                    $stmt_items->execute([
                        $pedidoId,
                        $item['productoId'],
                        $item['cantidad'],
                        $item['precio']
                    ]);
                }

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'id' => $pedidoId,
                    'message' => 'Pedido creado con éxito.'
                ]);

            } catch (\PDOException $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al crear el pedido.',
                    'error' => $e->getMessage()
                ]);
            }
            break;


        // =========================================
        // PUT — actualizar estado
        // =========================================
        case 'PUT':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['message' => 'ID de pedido requerido.']);
                return;
            }

            try {
                if (isset($data['fechaCreacion']) && isset($data['proveedorId'])) {
                    $sql = "
                        UPDATE pedidos 
                        SET fechaCreacion=?, estado=?, proveedorId=? 
                        WHERE id=?
                    ";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $data['fechaCreacion'],
                        $data['estado'],
                        $data['proveedorId'],
                        $id
                    ]);
                } else {
                    $sql = "UPDATE pedidos SET estado=? WHERE id=?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['estado'], $id]);
                }

                echo json_encode([
                    'success' => true,
                    'rows_affected' => $stmt->rowCount()
                ]);

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al actualizar pedido.',
                    'error' => $e->getMessage()
                ]);
            }

            break;


        // =========================================
        // DELETE
        // =========================================
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['message' => 'ID de pedido requerido.']);
                return;
            }

            try {
                $stmt = $pdo->prepare("DELETE FROM pedidos WHERE id = ?");
                $stmt->execute([$id]);

                echo json_encode([
                    'success' => true,
                    'rows_affected' => $stmt->rowCount()
                ]);

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al eliminar pedido.',
                    'error' => $e->getMessage()
                ]);
            }
            break;

    }
}
