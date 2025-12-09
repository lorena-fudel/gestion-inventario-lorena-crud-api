<?php

// db_connect.php
// Conexión segura usando PDO
$host = 'localhost';
$db = 'db_inventario_entregable'; // 🛑 NOMBRE DE TU BASE DE DATOS
$user = 'root';                    // 🛑 TU USUARIO DE MySQL
$pass = '';                        // 🛑 TU CONTRASEÑA DE MySQL
$charset = 'utf8mb4';

// Configuración DSN (Data Source Name)
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    // Lanza excepciones en caso de error (necesario para la gestión de fallos)
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    // Devuelve los resultados como arrays asociativos
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    // Usa prepared statements nativas para seguridad
    PDO::ATTR_EMULATE_PREPARES   => false,
];
try {
     // Intenta establecer la conexión
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Si falla la conexión, devuelve un error 500 al frontend
     http_response_code(500);
     die(json_encode([
         "success" => false, 
         "message" => "Error de conexión a la base de datos. Verifica db_connect.php",
         "details" => $e->getMessage()
     ]));
}