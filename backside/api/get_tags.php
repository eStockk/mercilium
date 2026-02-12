<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../inc/config.php';

try {
    $stmt = $pdo->query("SELECT DISTINCT name FROM tags ORDER BY name ASC");
    $tags = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(['ok' => true, 'tags' => $tags], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
