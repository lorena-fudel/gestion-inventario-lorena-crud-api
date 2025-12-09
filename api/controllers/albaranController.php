<?php
// api/controllers/AlbaranController.php

function handleAlbaranesRequest($pdo, $method, $id, $data) {

    switch ($method) {

        // ======================================================
        // GET — obtener todos o uno
        // ======================================================
        case 'GET':
            try {

                $baseSql = "
                    SELECT a.*, p.proveedorId 
                    FROM albaranes a 
                    JOIN pedidos p ON a.pedidoId = p.id
                ";

                if ($id) {
                    // 1. Cabecera
                    $stmt = $pdo->prepare($baseSql . " WHERE a.id = ?");
                    $stmt->execute([$id]);
                    $albaran = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$albaran) {
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Albarán no encontrado.'
                        ]);
                        return;
                    }

                    // 2. Items del albarán
                    $stmt_items = $pdo->prepare("
                        SELECT ai.*, prod.nombre 
                        FROM albaran_items ai 
                        JOIN productos prod ON ai.productoId = prod.id
                        WHERE ai.albaranId = ?
                    ");
                    $stmt_items->execute([$id]);

                    $albaran['productos'] = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

                    echo json_encode($albaran);

                } else {
                    // Todos los albaranes
                    $stmt = $pdo->query($baseSql);
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                }

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al obtener los albaranes.',
                    'error' => $e->getMessage()
                ]);
            }
            break;


        // ======================================================
        // POST — crear un albarán y actualizar stock
        // ======================================================
        case 'POST':

            // Validación de datos mínimos
            if (!isset($data['pedidoId'], $data['fechaRecepcion'], $data['productos'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan campos obligatorios para crear un albarán.'
                ]);
                return;
            }

            try {
                $pdo->beginTransaction();

                // 1. Insertar cabecera
                $sql = "
                    INSERT INTO albaranes (pedidoId, fechaRecepcion, observacionesGenerales)
                    VALUES (?, ?, ?)
                ";
                $stmt = $pdo->prepare($sql);

                $stmt->execute([
                    $data['pedidoId'],
                    $data['fechaRecepcion'],
                    $data['observacionesGenerales'] ?? null
                ]);

                $albaranId = $pdo->lastInsertId();

                // 2. Insertar items
                $sql_items = "
                    INSERT INTO albaran_items 
                    (albaranId, productoId, cantidadRecibida, precio, observaciones)
                    VALUES (?, ?, ?, ?, ?)
                ";

                $stmt_items = $pdo->prepare($sql_items);

                foreach ($data['productos'] as $item) {
                    $stmt_items->execute([
                        $albaranId,
                        $item['productoId'],
                        $item['cantidad'],
                        $item['precio'],
                        $item['observaciones'] ?? null
                    ]);

                    // ACTUALIZAR STOCK DEL PRODUCTO
                    $updateStock = $pdo->prepare("
                        UPDATE productos 
                        SET stock = stock + ? 
                        WHERE id = ?
                    ");
                    $updateStock->execute([
                        $item['cantidad'],
                        $item['productoId']
                    ]);
                }

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'id' => $albaranId,
                    'message' => 'Albarán creado con éxito y stock actualizado.'
                ]);

            } catch (\PDOException $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al crear el albarán.',
                    'error' => $e->getMessage()
                ]);
            }

            break;


        // ======================================================
        // DELETE — eliminar un albarán
        // ======================================================
        case 'DELETE':

            if (!$id) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'ID de albarán requerido.'
                ]);
                return;
            }

            try {
                $stmt = $pdo->prepare("DELETE FROM albaranes WHERE id = ?");
                $stmt->execute([$id]);

                echo json_encode([
                    'success' => true,
                    'rows_affected' => $stmt->rowCount()
                ]);

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al eliminar albarán.',
                    'error' => $e->getMessage()
                ]);
            }

            break;

    }
}
