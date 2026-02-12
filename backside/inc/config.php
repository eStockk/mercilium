<?php
$DB_HOST = 'localhost';
$DB_NAME = 'ce15180_guides';
$DB_USER = 'ce15180_guides';
$DB_PASS = '6w61pmEH';

try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("DB connection failed: " . $e->getMessage());
}