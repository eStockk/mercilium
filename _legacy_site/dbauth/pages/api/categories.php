<?php
require_once __DIR__ . '/../../../backside/inc/config.php';
header('Content-Type: application/json; charset=utf-8');

function json_out($a) {
    echo json_encode($a, JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;

try {
    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT c.id, c.name, COUNT(pc.post_id) as cnt
            FROM categories c
            LEFT JOIN post_categories pc ON pc.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY c.name ASC
        ");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_out(['ok' => true, 'categories' => $categories]);
    }

    if ($action === 'create') {
        $name = '';
        if (!empty($_POST['name'])) $name = trim($_POST['name']);
        else {
            $body = json_decode(file_get_contents('php://input'), true);
            if (isset($body['name'])) $name = trim($body['name']);
        }
        if ($name === '') json_out(['ok' => false, 'error' => 'Empty name']);

        $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $stmt->execute([$name]);
        if ($stmt->fetch()) json_out(['ok' => false, 'error' => 'Already exists']);

        $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
        $stmt->execute([$name]);
        json_out(['ok' => true, 'id' => $pdo->lastInsertId(), 'name' => $name]);
    }

    json_out(['ok' => false, 'error' => 'Unknown action']);
} catch (Exception $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()]);
}
