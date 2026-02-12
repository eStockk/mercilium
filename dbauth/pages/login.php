<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../backside/inc/config.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $username = trim($_POST['username'] ?? '');
  $password = trim($_POST['password'] ?? '');
  if ($username && $password) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {
      $_SESSION['admin_id'] = $user['id'];
      $_SESSION['admin_role'] = $user['role'];
      header('Location: /dbauth/pages/dashboard.php');
      exit;
    } else {
      $error = "Неверный логин или пароль";
    }
  } else {
    $error = "Введите логин и пароль";
  }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Mercilium Admin — Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/dbauth/assets/admin.css">
</head>
<body class="login-body">

<div class="login-wrapper">
  <h1 class="login-title">🚀 Вход в панель</h1>
  <?php if (!empty($error)): ?>
    <div class="login-error"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>

  <form method="post" class="login-form">
    <label>Логин</label>
    <input type="text" name="username" required>

    <label>Пароль</label>
    <input type="password" name="password" required>

    <button type="submit" class="login-btn">Войти</button>
  </form>
</div>

<!-- вставь ПЕРЕД закрывающим </body> -->
<canvas id="network"></canvas>
<script>
const canvas = document.getElementById("network");
const ctx = canvas.getContext("2d");
let w, h, points = [], lines = [], floatingDigits = [], ripples = [];
let mouse = { x: -9999, y: -9999 };
let time = 0;

function resize() {
  w = canvas.width = innerWidth;
  h = canvas.height = innerHeight;

  const count = innerWidth < 600 ? 25 : innerWidth < 1000 ? 45 : 70;
  points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4
    });
  }

  lines = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (Math.random() < 0.08) {
        lines.push({ a: points[i], b: points[j], offset: Math.random() });
      }
    }
  }

  // Плавающие цифры
  floatingDigits = [];
  const floatCount = innerWidth < 600 ? 30 : innerWidth < 1000 ? 60 : 100;
  for (let i = 0; i < floatCount; i++) {
    floatingDigits.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 10 + Math.random() * 8,
      speed: 0.15 + Math.random() * 0.2,
      char: Math.floor(Math.random() * 10),
      alpha: 0.15 + Math.random() * 0.4
    });
  }
}

window.addEventListener("resize", resize);
window.addEventListener("mousemove", e => (mouse = { x: e.clientX, y: e.clientY }));
window.addEventListener("mouseleave", () => (mouse = { x: -9999, y: -9999 }));

// Реакция на клик и тач
window.addEventListener("click", e => createRipple(e.clientX, e.clientY));
window.addEventListener("touchstart", e => {
  const t = e.touches[0];
  createRipple(t.clientX, t.clientY);
});

function createRipple(x, y) {
  ripples.push({ x, y, radius: 0, alpha: 1 });
}

function draw() {
  // Глубокий фиолетово-чёрный фон
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 1.2);
  gradient.addColorStop(0, "rgba(15, 0, 40, 1)");
  gradient.addColorStop(0.5, "rgba(5, 0, 20, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 10, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  time += 0.01;

  // волны от кликов
  for (let r of ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200,150,255,${r.alpha * 0.25})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(200,120,255,${r.alpha * 0.4})`;
    ctx.shadowBlur = 20;
    ctx.stroke();
    r.radius += 6;
    r.alpha -= 0.01;
  }
  ripples = ripples.filter(r => r.alpha > 0);

  // Линии
  for (let line of lines) {
    const { a, b } = line;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const alpha = Math.max(0.05, 1 - dist / 260);

    let mx = (a.x + b.x) / 2;
    let my = (a.y + b.y) / 2;

    const mdx = mx - mouse.x;
    const mdy = my - mouse.y;
    const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

    let waveForce = 0;
    for (let r of ripples) {
      const d = Math.hypot(mx - r.x, my - r.y);
      const diff = Math.abs(d - r.radius);
      if (diff < 40) waveForce += (40 - diff) / 40 * r.alpha;
    }

    if (mDist < 180) {
      const force = 1 - mDist / 180;
      mx += Math.sin(time * 3 + mDist / 20) * 6 * force;
      my += Math.cos(time * 3 + mDist / 25) * 6 * force;
    }

    mx += Math.sin(time + waveForce * 6) * waveForce * 10;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.strokeStyle = `rgba(200,150,255,${alpha * (0.8 + waveForce)})`;
    ctx.lineWidth = 1.2 + waveForce * 2;
    ctx.shadowColor = `rgba(180,80,255,${alpha * (0.3 + waveForce)})`;
    ctx.shadowBlur = 8 + waveForce * 15;
    ctx.stroke();

    // цифры на линиях
    const t = (time * 0.6 + line.offset) % 1;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    ctx.save();
    ctx.shadowColor = "rgba(210,120,255,0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(240,220,255,${alpha + 0.3 + waveForce * 0.6})`;
    ctx.font = "14px 'Courier New'";
    ctx.fillText(Math.floor((t * 10) % 10), x, y);
    ctx.restore();
  }

  // точки
  for (let p of points) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240,220,255,0.95)";
    ctx.shadowColor = "rgba(180,0,255,0.8)";
    ctx.shadowBlur = 8;
    ctx.fill();
  }

  // плавающие цифры
  for (let f of floatingDigits) {
    f.y -= f.speed;
    if (f.y < -10) {
      f.y = h + 10;
      f.x = Math.random() * w;
      f.char = Math.floor(Math.random() * 10);
      f.alpha = 0.2 + Math.random() * 0.5;
    }

    const pulse = Math.sin(time * 3 + f.x / 40) * 0.3 + 0.7;
    ctx.save();
    ctx.fillStyle = `rgba(200,150,255,${f.alpha * pulse})`;
    ctx.font = `${f.size}px 'Courier New'`;
    ctx.fillText(f.char, f.x, f.y);
    ctx.restore();
  }

  requestAnimationFrame(draw);
}

resize();
draw();
</script>




</body>
</html>
