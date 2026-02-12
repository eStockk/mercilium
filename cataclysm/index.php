<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cataclysm — Mercilium</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap" rel="stylesheet">
  <!-- общий стиль из основного assets -->
  <link rel="stylesheet" href="../assets/style.css">
  <link rel="stylesheet" href="./assets/style.css">
</head>
<body class="cataclysm">

  <!-- === Экран загрузки (как на главной) === -->
  <div id="loader">
    <div class="loading">
      <div class="loading-text">
        <span class="loading-word">C</span>
        <span class="loading-word">A</span>
        <span class="loading-word">T</span>
        <span class="loading-word">A</span>
        <span class="loading-word">C</span>
        <span class="loading-word">L</span>
        <span class="loading-word">Y</span>
        <span class="loading-word">S</span>
        <span class="loading-word">M</span>
      </div>
    </div>
  </div>

  <!-- === Основной контент === -->
  <div id="cata-main" class="hidden">
    <div class="left">
      <a class="logo" id="cataclysm-logo" href="../">Cataclysm</a>
      <!-- === МОБИЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК === -->
      <div class="tab-controls">
        <button class="tab-btn active" data-target="guidesList">Гайды</button>
        <button class="tab-btn" data-target="sourcesList">Источники</button>
      </div>


      <div class="search-section">
        <div class="search-bar">
          <input type="text" id="searchInput" placeholder="Поиск по названию или тэгам...">
          <button id="tagsBtn">Тэги</button>
        </div>

        <div id="selectedTags" class="tags-selected"></div>

        <!-- popup должен быть именно здесь -->
        <div id="tagsPopup" class="tags-popup">
          <div class="tags-list"></div>
        </div>
      </div>


    </div>

    <div class="right">
      <div class="scroll-block">
        <h2>Гайды</h2>
        <div id="guidesList" class="scroll-list"></div>
      </div>
      <div class="scroll-block">
        <h2>Источники</h2>
        <div id="sourcesList" class="scroll-list"></div>
      </div>
    </div>
  </div>

  <canvas id="stars"></canvas>

  <!-- 🔹 теперь правильный путь -->
  <script src="./assets/app-cata.js"></script>
  
</body>
</html>
