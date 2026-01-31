<?php
require_once __DIR__ . '/../../../backside/inc/config.php';
header('Content-Type: application/json; charset=utf-8');


function json_out($arr) {
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    // --- LIST ---
    if ($method === 'GET' && $action === 'list') {
        $status = $_GET['status'] ?? 'published';
        $type = $_GET['type'] ?? null;

        $where = [];
        $params = [];
        if ($status) {
            $where[] = "p.status = :status";
            $params[':status'] = $status;
        }
        if ($type && $type !== 'all') {
            $where[] = "p.type = :type";
            $params[':type'] = $type;
        }

        $whereSql = $where ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT p.id, p.title, p.content, p.type, p.status, p.created_at, p.source_id, p.categories,
                   GROUP_CONCAT(t.name) as tags
            FROM posts p
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            LEFT JOIN tags t ON pt.tag_id = t.id
            $whereSql
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_out(['ok' => true, 'posts' => $posts]);
    }

    // --- GET ---
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) json_out(['ok' => false, 'error' => 'Empty title or content']);

        $stmt = $pdo->prepare("SELECT * FROM posts WHERE id = ?");
        $stmt->execute([$id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$post) json_out(['ok' => false, 'error' => 'Post not found']);

        $stmt = $pdo->prepare("
            SELECT t.name
            FROM tags t
            JOIN post_tags pt ON t.id = pt.tag_id
            WHERE pt.post_id = ?
        ");
        $stmt->execute([$id]);
        $tags = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $post['tags'] = $tags;

        $stmt = $pdo->prepare("
            SELECT c.name, pc.content
            FROM post_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE pc.post_id = ?
            ORDER BY pc.position ASC
        ");
        $stmt->execute([$id]);
        $post['categories'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($post['type'] === 'guide' && $post['source_id']) {
            $stmt = $pdo->prepare("SELECT id, title FROM posts WHERE id=? AND type='source'");
            $stmt->execute([$post['source_id']]);
            $post['source'] = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        json_out(['ok' => true, 'post' => $post]);
    }

    // --- CREATE/UPDATE ---
    if ($method === 'POST') {
        $act = $_POST['action'] ?? '';
        $id = (int)($_POST['id'] ?? 0);
        $title = trim($_POST['title'] ?? '');
        $content = trim($_POST['content'] ?? '');
        $type = $_POST['type'] ?? 'guide';
        $status = $_POST['mode'] ?? 'published';
        $tags = json_decode($_POST['tags'] ?? '[]', true);
        $source_id = ($type === 'guide' && !empty($_POST['source_id'])) ? (int)$_POST['source_id'] : null;
        $categoriesPayload = [];
        if ($type === 'guide' && isset($_POST['categories'])) {
            $raw = $_POST['categories'];
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $categoriesPayload = $decoded;
            }
        }
        $categoryNames = [];
        foreach ($categoriesPayload as $cat) {
            if (!is_array($cat)) continue;
            $name = trim($cat['name'] ?? '');
            if ($name === '') continue;
            $categoryNames[] = $name;
        }
        $categoriesJson = $categoryNames ? json_encode($categoryNames, JSON_UNESCAPED_UNICODE) : null;

        if ($title === '' || $content === '') {
            json_out(['ok' => false, 'error' => 'Empty title or content']);
        }


        if ($act === 'create') {
            $stmt = $pdo->prepare("INSERT INTO posts (title, content, type, status, source_id, categories, created_at) VALUES (?,?,?,?,?,?,NOW())");
            $stmt->execute([$title, $content, $type, $status, $source_id, $categoriesJson]);
            $id = $pdo->lastInsertId();
        } elseif ($act === 'update' && $id) {
            $stmt = $pdo->prepare("UPDATE posts SET title=?, content=?, type=?, status=?, source_id=?, categories=? WHERE id=?");
            $stmt->execute([$title, $content, $type, $status, $source_id, $categoriesJson, $id]);
        } else {
            json_out(['ok' => false, 'error' => 'Unknown action']);
        }

        // --- tags ---
        $pdo->prepare("DELETE FROM post_tags WHERE post_id=?")->execute([$id]);
        if ($tags && is_array($tags)) {
            foreach ($tags as $t) {
                $t = trim($t);
                if ($t === '') continue;
                $stmt = $pdo->prepare("SELECT id FROM tags WHERE name=?");
                $stmt->execute([$t]);
                $tid = $stmt->fetchColumn();
                if (!$tid) {
                    $pdo->prepare("INSERT INTO tags (name) VALUES (?)")->execute([$t]);
                    $tid = $pdo->lastInsertId();
                }
                $pdo->prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?,?)")->execute([$id, $tid]);
            }
        }

        // --- categories ---
        if ($type === 'guide') {
            $pdo->prepare("DELETE FROM post_categories WHERE post_id=?")->execute([$id]);
            $pos = 0;
            foreach ($categoriesPayload as $cat) {
                if (!is_array($cat)) continue;
                $name = trim($cat['name'] ?? '');
                if ($name === '') continue;
                $contentCat = $cat['content'] ?? '';
                $stmt = $pdo->prepare("SELECT id FROM categories WHERE name=?");
                $stmt->execute([$name]);
                $cid = $stmt->fetchColumn();
                if (!$cid) {
                    $pdo->prepare("INSERT INTO categories (name) VALUES (?)")->execute([$name]);
                    $cid = $pdo->lastInsertId();
                }
                $pos++;
                $stmt = $pdo->prepare("INSERT INTO post_categories (post_id, category_id, position, content) VALUES (?,?,?,?)");
                $stmt->execute([$id, $cid, $pos, $contentCat]);
            }
        }

        json_out(['ok' => true, 'id' => $id]);
    }

    // --- DELETE ---
    if ($method === 'GET' && $action === 'delete') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) json_out(['ok' => false, 'error' => 'No id']);

        $pdo->prepare("DELETE FROM posts WHERE id=?")->execute([$id]);
        $pdo->prepare("DELETE FROM post_tags WHERE post_id=?")->execute([$id]);

        $dir = __DIR__ . "/../uploads/$id";
        if (is_dir($dir)) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($files as $file) {
                $file->isDir() ? rmdir($file) : unlink($file);
            }
            rmdir($dir);
        }

        json_out(['ok' => true, 'deleted' => $id]);
    }

    json_out(['ok' => false, 'error' => 'Unknown request']);
} catch (Exception $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()]);
}
