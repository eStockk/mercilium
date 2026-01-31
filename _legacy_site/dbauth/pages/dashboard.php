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
      <h2>Mercilium Admin</h2>
      <span class="subtitle">?????? ??????????</span>
    </div>
    <div class="right">
      <button id="btnAddGuide" class="btn violet">+ ????</button>
      <button id="btnAddSource" class="btn">+ ????????</button>
      <a href="/dbauth/pages/logout.php" class="logout-btn">?????</a>
    </div>
  </header>

  <div class="search-bar">
    <input id="globalSearch" class="search-input" type="search" placeholder="????? ?? ???????? ? ?????">
  </div>

  <section class="posts-section">
    <div class="post-block">
      <div class="block-head">
        <h3>?????</h3>
      </div>
      <div id="guidesList" class="posts-list"></div>
    </div>
    <div class="post-block">
      <div class="block-head">
        <h3>?????????</h3>
      </div>
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
    <button class="close-btn" type="button" aria-label="Закрыть">×</button>
    <h2>Создать гайд</h2>
    <div class="field">
      <label>Заголовок</label>
      <input id="guide-title" type="text" placeholder="Введите заголовок">
    </div>
    <div class="category-layout" id="guide-category-layout" data-category-scope="guide">
      <div class="category-tabs" id="guide-category-tabs">
        <button class="category-tab category-add" id="guide-category-add-tab" type="button">+</button>
      </div>
      <div class="category-main">
        <div class="category-header">
          <div class="category-current" id="guide-category-current">Категория не выбрана</div>
          <div class="category-actions">
            <button id="guide-category-select" class="btn btn-mini btn-select-category" type="button" data-scope="guide">Выбрать</button>
            <div class="category-dropdown" id="guide-category-dropdown"></div>
          </div>
          <div class="category-create">
            <input id="guide-category-input" type="text" placeholder="Новая категория">
            <button id="guide-category-add" class="btn btn-mini" type="button">Добавить</button>
            <button id="guide-category-remove" class="btn btn-mini btn-remove-category" type="button">Убрать</button>
          </div>
        </div>
        <div id="guide-editor" class="editor"></div>
      </div>
    </div>
    <div class="field">
      <label>Теги</label>
      <div id="guide-tags-list" class="tags-list"></div>
      <div class="tag-controls">
        <button class="btn-select-tag" type="button">Выбрать теги</button>
      </div>
      <div class="tags-dropdown"></div>
      <div class="tag-create-row">
        <input type="text" class="input-create-tag" placeholder="Новый тег">
        <button class="btn-create-tag" type="button">+</button>
      </div>
    </div>
    <div class="popup-actions">
      <button id="publish-guide" class="btn violet" type="button">Опубликовать</button>
      <button id="save-draft-guide" class="btn" type="button">В черновики</button>
    </div>
  </div>
</div>

<!-- === POPUP: Создание источника === -->
<div id="popup-source" class="popup" aria-hidden="true">
  <div class="popup-content">
    <button class="close-btn" type="button" aria-label="Закрыть">×</button>
    <h2>Создать источник</h2>
    <div class="field">
      <label>Заголовок</label>
      <input id="source-title" type="text" placeholder="Введите заголовок">
    </div>
    <div id="source-editor" class="editor"></div>
    <div class="field">
      <label>Теги</label>
      <div id="source-tags-list" class="tags-list"></div>
      <div class="tag-controls">
        <button class="btn-select-tag" type="button">Выбрать теги</button>
      </div>
      <div class="tags-dropdown"></div>
      <div class="tag-create-row">
        <input type="text" class="input-create-tag" placeholder="Новый тег">
        <button class="btn-create-tag" type="button">+</button>
      </div>
    </div>
    <div class="popup-actions">
      <button id="publish-source" class="btn violet" type="button">Опубликовать</button>
      <button id="save-draft-source" class="btn" type="button">В черновики</button>
    </div>
  </div>
</div>

<!-- === POPUP: Редактирование поста === -->
<div id="popup-edit" class="popup" aria-hidden="true">
  <div class="popup-content">
    <button class="close-btn" type="button" aria-label="Закрыть">×</button>
    <h2>Редактировать пост</h2>
    <div class="field">
      <label>Заголовок</label>
      <input id="edit-title" type="text" placeholder="Введите заголовок">
    </div>
    <div class="category-layout" id="edit-category-layout" data-category-scope="edit">
      <div class="category-tabs" id="edit-category-tabs">
        <button class="category-tab category-add" id="edit-category-add-tab" type="button">+</button>
      </div>
      <div class="category-main">
        <div class="category-header">
          <div class="category-current" id="edit-category-current">Категория не выбрана</div>
          <div class="category-actions">
            <button id="edit-category-select" class="btn btn-mini btn-select-category" type="button" data-scope="edit">Выбрать</button>
            <div class="category-dropdown" id="edit-category-dropdown"></div>
          </div>
          <div class="category-create">
            <input id="edit-category-input" type="text" placeholder="Новая категория">
            <button id="edit-category-add" class="btn btn-mini" type="button">Добавить</button>
            <button id="edit-category-remove" class="btn btn-mini btn-remove-category" type="button">Убрать</button>
          </div>
        </div>
        <div id="edit-editor" class="editor"></div>
      </div>
    </div>
    <div class="field" id="edit-source-block" style="display: none;">
      <label>Источник</label>
      <select id="edit-source-select">
        <option value="">Без источника</option>
      </select>
    </div>
    <div class="field">
      <label>Теги</label>
      <div id="edit-tags-list" class="tags-list"></div>
      <div class="tag-controls">
        <button class="btn-select-tag" type="button">Выбрать теги</button>
      </div>
      <div class="tags-dropdown"></div>
      <div class="tag-create-row">
        <input type="text" class="input-create-tag" placeholder="Новый тег">
        <button class="btn-create-tag" type="button">+</button>
      </div>
    </div>
    <div class="popup-actions">
      <button id="update-post" class="btn violet" type="button">Обновить</button>
      <button id="save-draft-edit" class="btn" type="button">В черновики</button>
    </div>
  </div>
</div>

</body>
</html>
