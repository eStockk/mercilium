<?php
/**
 * Mercilium — DB config
 * Рабочая конфигурация для MariaDB / MySQL
 */

declare(strict_types=1);

// =========================
// DATABASE CONFIG
// =========================
$DB_HOST = 'localhost';
$DB_NAME = 'mercilium';
$DB_USER = 'mercilium_user';
$DB_PASS = 'GHjj155gO';
$DB_CHARSET = 'utf8mb4';

// =========================
// PDO OPTIONS
// =========================
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// =========================
// CONNECT
// =========================
try {
    $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset={$DB_CHARSET}";
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    exit('Database connection failed');
}
