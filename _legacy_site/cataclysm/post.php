<?php
require_once __DIR__ . '/../backside/inc/config.php';

// Включаем подробный вывод ошибок (во время разработки)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$errorMessage = null;
$post = null;
$source = null;

try {
  if ($id <= 0) {
    throw new Exception("Некорректный ID поста.");
  }

  // === Загружаем пост и теги ===
  $stmt = $pdo->prepare("
    SELECT p.*, GROUP_CONCAT(t.name SEPARATOR ', ') AS tags
    FROM posts p
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.id = ?
    GROUP BY p.id
  ");
  $stmt->execute([$id]);
  $post = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$post) {
    throw new Exception("Пост с ID {$id} не найден в базе данных.");
  }

  // === Если пост — гайд, подтягиваем источник ===
  if ($post['type'] === 'guide' && !empty($post['source_id'])) {
    $s = $pdo->prepare("SELECT id, title, content FROM posts WHERE id = ? AND type = 'source' LIMIT 1");
    $s->execute([$post['source_id']]);
    $source = $s->fetch(PDO::FETCH_ASSOC);
  }

} catch (Exception $e) {
  $errorMessage = $e->getMessage();
}

/**
 * Преобразует Quill JSON → HTML
 */
function quillToHTML($json) {
  $data = json_decode($json, true);
  if (!isset($data['ops'])) return $json; // не JSON — значит уже HTML

  $html = '';
  foreach ($data['ops'] as $op) {
    $insert = htmlspecialchars($op['insert'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $a = $op['attributes'] ?? [];

    if (!empty($a['bold'])) $insert = "<strong>$insert</strong>";
    if (!empty($a['italic'])) $insert = "<em>$insert</em>";
    if (!empty($a['underline'])) $insert = "<u>$insert</u>";

    if (!empty($a['header'])) $insert = "<h{$a['header']}>$insert</h{$a['header']}>";
    elseif (!empty($a['list']) && $a['list'] === 'bullet') $insert = "<ul><li>$insert</li></ul>";
    elseif (!empty($a['list']) && $a['list'] === 'ordered') $insert = "<ol><li>$insert</li></ol>";
    elseif (!empty($a['code-block'])) $insert = "<pre><code>$insert</code></pre>";
    else $insert = "<p>$insert</p>";

    $html .= $insert;
  }

  return preg_replace('#</(ul|ol)>\s*<(ul|ol)>#', '', $html);
}

// === Если пост загружен — готовим данные ===
$contentHTML = $post ? quillToHTML($post['content']) : '';
$tags = $post ? array_filter(array_map('trim', explode(',', $post['tags'] ?? ''))) : [];
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $post ? htmlspecialchars($post['title']) . ' — Cataclysm' : 'Ошибка — Cataclysm'; ?></title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./assets/post.css">
</head>
<body class="cataclysm">
  <canvas id="stars"></canvas>

  <div id="post-main">
    <a href="../cataclysm/" class="back-link">← Назад</a>

    <?php if ($errorMessage): ?>
      <!-- === Ошибка === -->
      <div class="error-box">
        <h2>⚠ Ошибка загрузки поста</h2>
        <p><?= htmlspecialchars($errorMessage); ?></p>
      </div>

    <?php else: ?>
      <!-- === Основной контент === -->
      <article class="post-content quill-content">
  <h1><?= htmlspecialchars($post['title']); ?></h1>

  <?php if (!empty($post['created_at'])): ?>
    <div class="date">Опубликовано: <?= date('d.m.Y H:i', strtotime($post['created_at'])); ?></div>
  <?php endif; ?>

  <?php
    // Получаем теги
    $tagsStmt = $pdo->prepare("
      SELECT t.name FROM tags t 
      JOIN post_tags pt ON t.id = pt.tag_id 
      WHERE pt.post_id = ?
    ");
    $tagsStmt->execute([$post['id']]);
    $tags = $tagsStmt->fetchAll(PDO::FETCH_COLUMN);
  ?>
  <?php if (!empty($tags)): ?>
    <div class="tags">
      <?php foreach ($tags as $tag): ?>
        <span class="tag"><?= htmlspecialchars($tag); ?></span>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <!-- Основной контент -->
  <?php
    $categories = [];
    if ($post['type'] === 'guide') {
      $catStmt = $pdo->prepare("
        SELECT c.name, pc.content
        FROM post_categories pc
        JOIN categories c ON c.id = pc.category_id
        WHERE pc.post_id = ?
        ORDER BY pc.position ASC
      ");
      $catStmt->execute([$post['id']]);
      $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);
    }
  ?>
  <?php if (!empty($categories)): ?>
    <div class="category-switch">
      <?php foreach ($categories as $idx => $cat): ?>
        <button class="category-tab<?= $idx === 0 ? ' active' : '' ?>" data-index="<?= $idx ?>">
          <?= htmlspecialchars($cat['name']); ?>
        </button>
      <?php endforeach; ?>
    </div>
    <div class="category-content">
      <?php foreach ($categories as $idx => $cat): ?>
        <div class="category-panel quill-content<?= $idx === 0 ? ' active' : '' ?>" data-index="<?= $idx ?>">
          <?= $cat['content']; ?>
        </div>
      <?php endforeach; ?>
    </div>
  <?php else: ?>
    <div class="content-area"><?= $post['content']; ?></div>
  <?php endif; ?>

 <?php
if ($post['type'] === 'guide' && !empty($post['source_id'])) {
  $srcStmt = $pdo->prepare("SELECT id, title, created_at FROM posts WHERE id = ?");
  $srcStmt->execute([$post['source_id']]);
  $source = $srcStmt->fetch(PDO::FETCH_ASSOC);

  if ($source) {
    // Получаем теги источника
    $srcTagsStmt = $pdo->prepare("
      SELECT t.name FROM tags t 
      JOIN post_tags pt ON t.id = pt.tag_id 
      WHERE pt.post_id = ?
    ");
    $srcTagsStmt->execute([$source['id']]);
    $srcTags = $srcTagsStmt->fetchAll(PDO::FETCH_COLUMN);
?>
  <section class="source-block" onclick="window.location.href='post.php?id=<?= $source['id']; ?>'">
    <canvas class="source-bg"></canvas>
    <div class="source-inner">
      <h2>Источник</h2>
      <h3><?= htmlspecialchars($source['title']); ?></h3>

      <?php if (!empty($srcTags)): ?>
        <div class="tags">
          <?php foreach ($srcTags as $tag): ?>
            <span class="tag"><?= htmlspecialchars($tag); ?></span>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <div class="date">Опубликовано: <?= date('d.m.Y H:i', strtotime($source['created_at'])); ?></div>
    </div>
  </section>
<?php
  }
}
?>


</article>

    <?php endif; ?>
  </div>

  <button id="toTop">↑</button>
  
  <script>
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.quill-content > *').forEach(el => observer.observe(el));
});
</script>

  <script>
document.addEventListener('DOMContentLoaded', () => {
  const tabs = Array.from(document.querySelectorAll('.category-tab'));
  const panels = Array.from(document.querySelectorAll('.category-panel'));
  if (!tabs.length || !panels.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const index = tab.dataset.index;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(panel => {
        panel.classList.toggle('active', panel.dataset.index === index);
      });
    });
  });
});
</script>

  <script>
    // === Космический фон ===
    const canvas = document.getElementById('stars');
    const ctx = canvas.getContext('2d');
    let stars = [];

    function createStars() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.max(150, Math.floor(canvas.width / 8));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        a: Math.random() * 0.8 + 0.2
      }));
    }

    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
      });
      requestAnimationFrame(drawStars);
    }

    window.addEventListener('resize', createStars);
    createStars();
    drawStars();

    // === Кнопка "вверх" ===
    const toTop = document.getElementById('toTop');
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('visible', window.scrollY > 400);
    });
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  </script>

  <style>
    .error-box {
      background: rgba(255, 0, 0, 0.1);
      color: #ff5555;
      padding: 25px;
      border: 1px solid #ff5555;
      border-radius: 8px;
      max-width: 800px;
      margin: 80px auto;
      text-align: center;
    }
    .error-box h2 {
      margin-bottom: 10px;
      color: #ff7777;
    }
    .source-block {
      margin-top: 40px;
      background: rgba(255,255,255,0.05);
      padding: 15px;
      border-radius: 8px;
    }
    .source-block h3 {
      margin-bottom: 6px;
      color: var(--violet);
    }
    .source-link {
      color: var(--blue);
      font-weight: bold;
      text-decoration: none;
      transition: 0.3s;
    }
    .source-link:hover {
      color: var(--violet);
    }
    .source-preview {
      margin-top: 6px;
      opacity: 0.8;
      font-size: 14px;
    }
  </style>
  <script>
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector(".source-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let stars = [];
  let STAR_COUNT = 70;
  let MAX_DISTANCE = 140;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2,
      vx: (Math.random() - 0.5) * 0.07,
      vy: (Math.random() - 0.5) * 0.07,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Соединяем линии — созвездия
    ctx.lineWidth = 0.4;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DISTANCE) {
          const alpha = 1 - dist / MAX_DISTANCE;
          ctx.strokeStyle = `rgba(148,0,211,${alpha * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }

    // Звёзды
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
      if (s.y < 0) s.y = canvas.height;
      if (s.y > canvas.height) s.y = 0;
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
});
</script>


</body>
</html>
