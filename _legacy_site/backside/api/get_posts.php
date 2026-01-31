<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../inc/config.php';

try {
    if (!isset($pdo)) {
        throw new Exception("Нет соединения с базой данных");
    }

    // === Получаем параметры запроса ===
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $tags = isset($_GET['tags']) ? array_filter(explode(',', $_GET['tags'])) : [];

    // === Базовые условия ===
    $where = "p.status = 'published'";
    $params = [];

    // === Поиск по названию и тэгам ===
    if ($search !== '') {
        $where .= " AND (p.title LIKE :search OR t.name LIKE :search)";
        $params[':search'] = "%$search%";
    }

    // === Фильтр по выбранным тэгам (логика AND) ===
    if (!empty($tags)) {
        $placeholders = implode(',', array_fill(0, count($tags), '?'));
        $having = "HAVING COUNT(DISTINCT t.name) = " . count($tags);
        $where .= " AND t.name IN ($placeholders)";
    }


    // === Основной SQL ===
    $sql = "
        SELECT 
            p.id,
            p.title,
            p.content,
            p.type,
            p.source_id,
            p.created_at,
            GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') AS tags
        FROM posts p
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE $where
        GROUP BY p.id
        $having
        ORDER BY p.created_at DESC
    ";

    $stmt = $pdo->prepare($sql);

    // Привязываем параметры
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $i = 1;
    foreach ($tags as $tag) {
        $stmt->bindValue($i++, $tag);
    }

    $stmt->execute();
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // === Разделяем на guides и sources ===
    $guides = array_filter($posts, fn($p) => $p['type'] === 'guide');
    $sources = array_filter($posts, fn($p) => $p['type'] === 'source');

    echo json_encode([
        'ok' => true,
        'guides' => array_values($guides),
        'sources' => array_values($sources)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        'ok' => false,
        'error' => "Ошибка SQL: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
