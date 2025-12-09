<?php
// api/controllers/albaranController.php

function handleAlbaranesRequest($pdo, $method, $id, $data) {

    switch ($method) {

        // ======================================================
        // GET — obtener todos o uno
        // ======================================================
        case 'GET':
            try {
                if ($id) {
                    // Cabecera del albarán
                    $stmt = $pdo->prepare("SELECT * FROM albaranes WHERE id = ?");
                    $stmt->execute([$id]);
                    $albaran = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$albaran) {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'message' => 'Albarán no encontrado.']);
                        return;
                    }

                    // Items del albarán
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
                    // Listar todos los albaranes ordenados por fecha
                    $stmt = $pdo->query("SELECT * FROM albaranes ORDER BY fechaRecepcion DESC");
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                }

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;


        // ======================================================
        // POST — Crear Albarán y Actualizar Stock
        // ======================================================
        case 'POST':

            // Validación de datos mínimos
            if (!isset($data['pedidoId'], $data['fechaRecepcion'], $data['productos'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Faltan campos obligatorios.']);
                return;
            }

            try {
                $pdo->beginTransaction();

                // 1. Insertar cabecera del Albarán
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

                // 2. Preparar consultas para Items y Stock
                // IMPORTANTE: Usamos 'precio_unitario' (o 'precio' según tu BD)
                $sql_items = "
                    INSERT INTO albaran_items 
                    (albaranId, productoId, cantidadRecibida, precioUnitario, observaciones)
                    VALUES (?, ?, ?, ?, ?)
                ";
                $stmt_items = $pdo->prepare($sql_items);

                $sql_stock = "UPDATE productos SET stock = stock + ? WHERE id = ?";
                $stmt_stock = $pdo->prepare($sql_stock);

                // 3. Recorrer productos recibidos
                foreach ($data['productos'] as $item) {
                    
                    // Mapeo seguro de precio
                    $precio = isset($item['precioUnitario']) ? $item['precioUnitario'] : 
                             (isset($item['precio']) ? $item['precio'] : 0);

                    // Insertar item en albarán
                    $stmt_items->execute([
                        $albaranId,
                        $item['productoId'],
                        $item['cantidad'],      // El JS envía 'cantidad'
                        $precio,
                        $item['observaciones'] ?? null
                    ]);

                    // Actualizar STOCK (+ cantidad recibida)
                    $stmt_stock->execute([
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
                    'message' => 'Error al crear albarán.',
                    'error' => $e->getMessage()
                ]);
            }
            break;
            
        // DELETE (Opcional)
        case 'DELETE':
            if (!$id) return;
            // Nota: Al borrar un albarán, idealmente deberías restar el stock, 
            // pero eso requiere una lógica más compleja de reversión.
            $stmt = $pdo->prepare("DELETE FROM albaranes WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
    }
}