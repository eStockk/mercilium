<?php
require_once __DIR__ . '/../../../backside/inc/config.php';
header('Content-Type: application/json; charset=utf-8');

function json_out($arr) {
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'error' => 'Invalid request']);
}

$post_id = (int)($_POST['post_id'] ?? 0);
if (!$post_id) {
    json_out(['ok' => false, 'error' => 'Не указан post_id']);
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    json_out(['ok' => false, 'error' => 'No file uploaded']);
}

$dir = __DIR__ . "/../uploads/$post_id";
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

$ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
$filename = uniqid('img_', true) . "." . strtolower($ext);
$path = "$dir/$filename";

if (!move_uploaded_file($_FILES['image']['tmp_name'], $path)) {
    json_out(['ok' => false, 'error' => 'Не удалось сохранить файл']);
}

$url = "/uploads/$post_id/$filename";
json_out(['ok' => true, 'url' => $url]);
