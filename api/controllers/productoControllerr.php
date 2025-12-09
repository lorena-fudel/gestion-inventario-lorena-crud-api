<?php
// api/controllers/productoController.php

function handleProductosRequest($pdo, $method, $id, $data) {

    switch ($method) {

        /* ----------------------------------------------------
           📌 GET → Obtener productos o un producto específico
        ---------------------------------------------------- */
        case 'GET':

            // Si se pide un producto concreto
            if ($id) {
                $sql = "
                SELECT 
                    p.*,
                    c.id AS categoria_id,
                    c.nombre AS categoria_nombre,
                    pr.id AS proveedor_id,
                    pr.nombre AS proveedor_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoriaId = c.id
                LEFT JOIN proveedores pr ON p.proveedorId = pr.id
                WHERE p.id = ?
                ";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                $producto = $stmt->fetch();

                if (!$producto) {
                    http_response_code(404);
                    echo json_encode(["message" => "Producto no encontrado"]);
                    return;
                }

                // Transformación para que coincida con tu frontend
                $producto['categoria'] = [
                    "id" => $producto['categoria_id'],
                    "nombre" => $producto['categoria_nombre']
                ];

                $producto['proveedor'] = [
                    "id" => $producto['proveedor_id'],
                    "nombre" => $producto['proveedor_nombre']
                ];

                echo json_encode($producto);
                return;
            }

            // Si se piden todos los productos
            $sql = "
            SELECT 
                p.*,
                c.id AS categoria_id,
                c.nombre AS categoria_nombre,
                pr.id AS proveedor_id,
                pr.nombre AS proveedor_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoriaId = c.id
            LEFT JOIN proveedores pr ON p.proveedorId = pr.id
            ORDER BY p.id DESC
            ";

            $stmt = $pdo->query($sql);
            $productos = $stmt->fetchAll();

            // Armado para el frontend
            foreach ($productos as &$p) {
                $p['categoria'] = [
                    "id" => $p['categoria_id'],
                    "nombre" => $p['categoria_nombre']
                ];
                $p['proveedor'] = [
                    "id" => $p['proveedor_id'],
                    "nombre" => $p['proveedor_nombre']
                ];
            }

            echo json_encode($productos);
            break;


        /* ----------------------------------------------------
           📌 POST → Crear producto
           (Frontend usa: nombre, codigoBarras, stock, stockMinimo,
            precio, unidadMedida, descripcion, categoriaId, proveedorId)
        ---------------------------------------------------- */
        case 'POST':

            $sql = "
                INSERT INTO productos 
                (nombre, codigoBarras, stock, stockMinimo, precio, unidadMedida, descripcion, categoriaId, proveedorId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $stmt = $pdo->prepare($sql);

            try {
                $stmt->execute([
                    $data['nombre'],
                    $data['codigoBarras'],
                    $data['stock'],
                    $data['stockMinimo'],
                    $data['precio'],
                    $data['unidadMedida'],
                    $data['descripcion'],
                    $data['categoriaId'],
                    $data['proveedorId'],
                ]);

                echo json_encode([
                    "success" => true,
                    "id" => $pdo->lastInsertId(),
                    "message" => "Producto creado con éxito"
                ]);
            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }

            break;


        /* ----------------------------------------------------
           📌 PUT → Actualizar producto EXISTENTE
        ---------------------------------------------------- */
        case 'PUT':

            if (!$id) {
                http_response_code(400);
                echo json_encode(["message" => "ID requerido"]);
                return;
            }

            $sql = "
            UPDATE productos SET 
                nombre = ?,
                codigoBarras = ?,
                stock = ?,                 -- ✔ correcto
                stockMinimo = ?,
                precio = ?,                -- ✔ correcto
                unidadMedida = ?,
                descripcion = ?,
                categoriaId = ?,
                proveedorId = ?
            WHERE id = ?
            ";

            $stmt = $pdo->prepare($sql);

            try {
                $stmt->execute([
                    $data['nombre'],
                    $data['codigoBarras'],
                    $data['stock'],
                    $data['stockMinimo'],
                    $data['precio'], 
                    $data['unidadMedida'],
                    $data['descripcion'],
                    $data['categoriaId'],
                    $data['proveedorId'],
                    $id
                ]);

                echo json_encode([
                    "success" => true,
                    "affected" => $stmt->rowCount(),
                    "message" => "Producto actualizado correctamente"
                ]);
            } catch (\PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }

            break;


        /* ----------------------------------------------------
           📌 DELETE → Eliminar producto
        ---------------------------------------------------- */
        case 'DELETE':
            // 1. Validar ID
            if (!$id) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "ID requerido"]);
                return;
            }

            try {
                // 2. Intentar borrar
                $stmt = $pdo->prepare("DELETE FROM productos WHERE id = ?");
                $stmt->execute([$id]);

                if ($stmt->rowCount() > 0) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Producto eliminado correctamente"
                    ]);
                } else {
                    // El ID no existía, pero no es un error crítico
                    echo json_encode([
                        "success" => false,
                        "error" => "El producto no existe o ya fue borrado"
                    ]);
                }

            } catch (\PDOException $e) {
                // 3. CAPTURAR ERROR DE INTEGRIDAD (Clave Foránea - Código 23000)
                if ($e->getCode() == '23000') {
                    http_response_code(409); // Conflict
                    echo json_encode([
                        "success" => false, 
                        // Enviamos el mensaje claro para mostrar en la alerta
                        "error" => "⛔ NO SE PUEDE BORRAR: Este producto forma parte de pedidos o albaranes antiguos. Elimina primero esos registros."
                    ]);
                } else {
                    // Otro error SQL
                    http_response_code(500);
                    echo json_encode([
                        "success" => false, 
                        "error" => "Error BD: " . $e->getMessage()
                    ]);
                }
            }
            break;
    }
}