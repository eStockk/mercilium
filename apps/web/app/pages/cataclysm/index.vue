<template>
  <div>
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

    <div id="cata-main" class="hidden">
      <div class="left">
        <a class="logo" id="cataclysm-logo" href="/">Cataclysm</a>
        <div class="tab-controls">
          <button class="tab-btn active" data-target="guidesList">Гайды</button>
          <button class="tab-btn" data-target="sourcesList">Источники</button>
        </div>

        <div class="search-section">
          <div class="search-bar">
            <input type="text" id="searchInput" placeholder="Поиск по названию или тегам...">
            <button id="tagsBtn">Тэги</button>
          </div>

          <div id="selectedTags" class="tags-selected"></div>

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
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Cataclysm — Mercilium',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'cataclysm' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap'
    },
    { rel: 'stylesheet', href: '/assets/style.css' },
    { rel: 'stylesheet', href: '/cataclysm/assets/style.css' }
  ],
  script: [{ src: '/cataclysm/assets/app-cata.js', defer: true }]
});
</script>
