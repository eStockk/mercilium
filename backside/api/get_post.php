<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../inc/config.php';

function quillToHtml($json) {
    $data = json_decode($json, true);
    if (!isset($data['ops'])) return htmlspecialchars($json);
    $html = '';
    foreach ($data['ops'] as $op) {
        $text = htmlspecialchars($op['insert'] ?? '');
        if (isset($op['attributes'])) {
            $a = $op['attributes'];
            if (!empty($a['bold'])) $text = "<strong>$text</strong>";
            if (!empty($a['italic'])) $text = "<em>$text</em>";
            if (!empty($a['underline'])) $text = "<u>$text</u>";
            if (!empty($a['header'])) {
                $lvl = (int)$a['header'];
                $text = "<h$lvl>$text</h$lvl>";
            }
            if (!empty($a['code-block'])) {
                $text = "<pre><code>$text</code></pre>";
            }
        }
        $html .= nl2br($text);
    }
    return $html;
}

try {
    if (!isset($pdo)) {
        throw new Exception("Нет соединения с базой данных");
    }

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) throw new Exception("Некорректный id");

    // Загружаем пост
    $sql = "
        SELECT 
            p.id,
            p.title,
            p.content,
            p.type,
            p.source_id,
            p.created_at,
            GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') AS tags
        FROM posts p
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.id = :id
        GROUP BY p.id
        LIMIT 1
    ";
    $st = $pdo->prepare($sql);
    $st->execute([':id' => $id]);
    $post = $st->fetch(PDO::FETCH_ASSOC);
    if (!$post) throw new Exception("Пост не найден");

    // Конвертируем Quill JSON в HTML
    $post['content_html'] = quillToHtml($post['content']);

    // Источники, если guide
    $linked_sources = [];
    if ($post['type'] === 'guide' && !empty($post['source_id'])) {
        $q = $pdo->prepare("SELECT id, title FROM posts WHERE id = :sid AND type = 'source' LIMIT 1");
        $q->execute([':sid' => (int)$post['source_id']]);
        if ($src = $q->fetch(PDO::FETCH_ASSOC)) $linked_sources[] = $src;
    }

    echo json_encode([
        'ok' => true,
        'post' => $post,
        'linked_sources' => $linked_sources
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
