<?php
// api/controllers/pedidosController.php

function handlePedidosRequest($pdo, $method, $id, $data) {

    switch ($method) {

        // =========================================
        // GET — Obtener pedidos
        // =========================================
        case 'GET':
            try {
                if ($id) {
                    // Obtener UN pedido con el nombre del proveedor
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
                        echo json_encode(['success' => false, 'message' => 'Pedido no encontrado.']);
                        return;
                    }

                    // Obtener los ITEMS del pedido
                    // NOTA: Asegúrate de que tu tabla se llame 'pedido_items' o 'lineas_pedido'
                    $stmt_items = $pdo->prepare("
                        SELECT pi.productoId, pi.cantidad, pi.precioUnitario as precioUnitario, 
                               (pi.cantidad * pi.precioUnitario) as subtotal,
                               prod.nombre, prod.unidadMedida 
                        FROM pedido_items pi 
                        JOIN productos prod ON pi.productoId = prod.id 
                        WHERE pi.pedidoId = ?
                    ");
                    $stmt_items->execute([$id]);
                    $pedido['items'] = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

                    echo json_encode($pedido);
                
                } else {
                    // Obtener TODOS los pedidos
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

            // 1. Validación de datos
            if (!isset($data['fechaCreacion'], $data['total'], $data['proveedorId'], $data['items'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios (fecha, total, proveedor, items).']);
                return;
            }

            try {
                $pdo->beginTransaction();

                // 2. Insertar cabecera del pedido
                // El estado inicial siempre es 'pendiente'
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

                // 3. Insertar líneas (items)
                // IMPORTANTE: Aquí corregimos el error de columna. Usamos 'precio_unitario'.
                // Verifica que en tu BD la columna se llame 'precio_unitario'. Si es 'precio', cámbialo aquí.
                $sql_items = "
                    INSERT INTO pedido_items (pedidoId, productoId, cantidad, precioUnitario)
                    VALUES (?, ?, ?, ?)
                ";
                $stmt_items = $pdo->prepare($sql_items);

                foreach ($data['items'] as $item) {
                    // El JS puede enviar 'id' (del producto) o 'productoId'. Normalizamos:
                    $prodId = isset($item['id']) ? $item['id'] : (isset($item['productoId']) ? $item['productoId'] : null);
                    
                    // El JS envía 'precioUnitario'.
                    $precio = isset($item['precioUnitario']) ? $item['precioUnitario'] : 0;

                    if ($prodId) {
                        $stmt_items->execute([
                            $pedidoId,
                            $prodId,
                            $item['cantidad'],
                            $precio
                        ]);
                    }
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
                    'error' => $e->getMessage() // Aquí verás si sigue fallando la columna
                ]);
            }
            break;


        // =========================================
        // PUT — Actualizar estado (para Recepción)
        // =========================================
        case 'PUT':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['message' => 'ID de pedido requerido.']);
                return;
            }

            try {
                // Si recibimos solo el estado (desde el controlador de recepción)
                if (isset($data['estado'])) {
                    $sql = "UPDATE pedidos SET estado=? WHERE id=?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['estado'], $id]);
                    
                    echo json_encode(['success' => true, 'message' => 'Estado actualizado.']);
                } else {
                    // Lógica para actualizar pedido completo si fuera necesario
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Datos insuficientes para actualizar.']);
                }

            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al actualizar pedido.',
                    'error' => $e->getMessage()
                ]);
            }
            break;

        // DELETE (Opcional, si lo necesitas)
        case 'DELETE':
             if (!$id) return;
             $stmt = $pdo->prepare("DELETE FROM pedidos WHERE id = ?");
             $stmt->execute([$id]);
             echo json_encode(['success' => true]);
             break;
    }
}