<?php
require_once __DIR__ . '/../../backside/inc/config.php';
session_start();

// 🔒 Проверка авторизации
if (empty($_SESSION['admin_id']) || ($_SESSION['admin_role'] ?? '') !== 'admin') {
  session_unset();
  session_destroy();
  header('Location: /dbauth/login.php');
  exit;
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Mercilium Admin — Панель управления</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap" rel="stylesheet">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <link rel="stylesheet" href="/dbauth/assets/admin.css">
</head>
<body>

<!-- === КОСМИЧЕСКИЙ ЛОАДЕР === -->
<div id="loader" class="loader-screen">
  <div class="loader-orbit"></div>
  <h1 class="loader-title">Mercilium Admin</h1>
  <div class="loader-status">
    <p>🛰 Инициализация ядра...</p>
    <p>🧠 Загрузка интерфейса...</p>
    <p>⚙️ Подключение модулей...</p>
    <p>🌌 Синхронизация API...</p>
    <p>🚀 Готово к запуску...</p>
  </div>
</div>

<!-- === DASHBOARD === -->
<main id="dashboard">
  <header class="top-bar">
    <div class="left">
      <h2>📘 Cataclysm</h2>
    </div>
    <div class="right">
      <button id="btnAddGuide" class="btn violet">+ Гайд</button>
      <button id="btnAddSource" class="btn">+ Источник</button>
      <a href="/dbauth/pages/logout.php" class="logout-btn">Выйти</a>
    </div>
  </header>

  <section class="posts-section">
    <div class="post-block">
      <h3>Гайды</h3>
      <div id="guidesList" class="posts-list"></div>
    </div>
    <div class="post-block">
      <h3>Источники</h3>
      <div id="sourcesList" class="posts-list"></div>
    </div>
  </section>
</main>

<script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
<script src="/dbauth/assets/popup.js"></script>
<script src="/dbauth/assets/dashboard.js"></script>
<!-- === POPUP: Создание гайда === -->
<div id="popup-guide" class="popup" aria-hidden="true">
  <div class="popup-content">
    <button class="close-btn">×</button>
    <h2>Создать гайд</h2>
    <div class="field">
      <label>Заголовок</label>
      <input id="guide-title" type="text" placeholder="Введите заголовок">
    </div>
    <div class="field">
      <label>Теги</label>
      <div id="guide-tags-list" class="tags-list"></div>
      <button class="btn-select-tag">Выбрать теги</button>
      <div class="tags-dropdown"></div>
      <input type="text" class="input-create-tag" placeholder="Новый тег">
      <button class="btn-create-tag">+</button>
    </div>
    <div id="guide-editor" class="editor"></div>
    <div class="popup-actions">
      <button id="publish-guide" class="btn violet">Опубликовать</button>
      <button id="save-draft-guide" class="btn">В черновики</button>
    </div>
  </div>
</div>

<!-- === POPUP: Создание источника === -->
<div id="popup-source" class="popup" aria-hidden="true">
  <div class="popup-content">
    <button class="close-btn">×</button>
    <h2>Создать источник</h2>
    <div class="field">
      <label>Заголовок</label>
      <input id="source-title" type="text" placeholder="Введите заголовок">
    </div>
    <div class="field">
      <label>Теги</label>
      <div id="source-tags-list" class="tags-list"></div>
      <button class="btn-select-tag">Выбрать теги</button>
      <div class="tags-dropdown"></div>
      <input type="text" class="input-create-tag" placeholder="Новый тег">
      <button class="btn-create-tag">+</button>
    </div>
    <div id="source-editor" class="editor"></div>
    <div class="popup-actions">
      <button id="publish-source" class="btn violet">Опубликовать</button>
      <button id="save-draft-source" class="btn">В черновики</button>
    </div>
  </div>
</div>

</body>
</html>
