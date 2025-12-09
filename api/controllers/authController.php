<?php
// api/controllers/AuthController.php

function handleAuthRequest($pdo, $data) {
    // 1. Obtener credenciales
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? ''; 

    // 2. Buscar usuario de forma segura
    // Nota: La contraseña en la BD es 123 (texto plano), pero en producción DEBE ser un hash
    $stmt = $pdo->prepare("SELECT id, username, rol, nombreCompleto FROM usuarios WHERE username = ? AND password = ?");
    $stmt->execute([$username, $password]);
    $user = $stmt->fetch();

    if ($user) {
        // Login exitoso
        echo json_encode([
            'success' => true,
            'user' => $user
        ]);
    } else {
        // Fallo de autenticación
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Credenciales LLEGA AQUI incorrectas.'
        ]);
    }
}