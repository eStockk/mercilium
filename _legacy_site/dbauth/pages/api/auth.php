<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && isset($_POST['logout'])) {
  session_destroy();
  header('Location: ../login.php'); exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: [];

$login = trim($data['login'] ?? '');
$pass  = (string)($data['password'] ?? '');

if ($login === '' || $pass === '') {
  echo json_encode(['ok'=>false,'error'=>'Логин и пароль обязательны'], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  require_once __DIR__ . '/../../../backside/inc/config.php';
  if (!isset($pdo)) { throw new Exception('Нет соединения с базой'); }

  // Try multiple known tables/columns
  $tries = [
    ['table'=>'admins', 'user'=>'login', 'pass'=>'password_hash'],
    ['table'=>'users',  'user'=>'login', 'pass'=>'password_hash'],
    ['table'=>'users',  'user'=>'username', 'pass'=>'password_hash'],
    ['table'=>'users',  'user'=>'login', 'pass'=>'password'],
    ['table'=>'admins', 'user'=>'username', 'pass'=>'password'],
  ];

  $found = null;
  foreach ($tries as $t) {
    $sql = "SHOW TABLES LIKE :t";
    $st = $pdo->prepare($sql);
    $st->execute([':t'=>$t['table']]);
    if (!$st->fetchColumn()) continue;

    $sql = "SELECT id, {$t['user']} as login, {$t['pass']} as pwd FROM {$t['table']} WHERE {$t['user']} = :login LIMIT 1";
    $st = $pdo->prepare($sql);
    $st->execute([':login'=>$login]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if ($row) { $found = ['row'=>$row,'passcol'=>$t['pass']]; break; }
  }

  if (!$found) {
    echo json_encode(['ok'=>false,'error'=>'Пользователь не найден'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $hash = $found['row']['pwd'];
  $ok = false;
  if (password_get_info($hash)['algo']) {
    $ok = password_verify($pass, $hash);
  } else {
    // stored as plain or md5
    $ok = ($hash === $pass) || (strlen($hash)===32 && $hash === md5($pass));
  }

  if (!$ok) {
    echo json_encode(['ok'=>false,'error'=>'Неверный пароль'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $_SESSION['admin_id'] = (int)$found['row']['id'];
  $_SESSION['admin_login'] = $login;

  echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
