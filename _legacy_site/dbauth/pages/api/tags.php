<?php
require_once __DIR__ . '/../../../backside/inc/config.php';
header('Content-Type: application/json; charset=utf-8');

function json_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }

$action = $_GET['action'] ?? $_POST['action'] ?? null;

try {
    if ($action === 'list') {
        $stmt = $pdo->query("
            SELECT t.id, t.name, COUNT(pt.post_id) as cnt
            FROM tags t
            LEFT JOIN post_tags pt ON pt.tag_id = t.id
            GROUP BY t.id, t.name
            ORDER BY t.name ASC
        ");
        $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_out(['ok'=>true, 'tags'=>$tags]);
    }

    if ($action === 'create') {
        // accept name via form-data or JSON body
        $name = '';
        if (!empty($_POST['name'])) $name = trim($_POST['name']);
        else {
            $body = json_decode(file_get_contents('php://input'), true);
            if (isset($body['name'])) $name = trim($body['name']);
        }
        if ($name === '') json_out(['ok'=>false, 'error'=>'Название тэга пустое']);

        // check exists
        $stmt = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
        $stmt->execute([$name]);
        if ($stmt->fetch()) json_out(['ok'=>false,'error'=>'Такой тэг уже существует']);

        $stmt = $pdo->prepare("INSERT INTO tags (name) VALUES (?)");
        $stmt->execute([$name]);
        json_out(['ok'=>true, 'id' => $pdo->lastInsertId(), 'name' => $name]);
    }

    json_out(['ok'=>false,'error'=>'Unknown action']);
} catch (Exception $e) {
    json_out(['ok'=>false,'error'=>$e->getMessage()]);
}
