<template>
  <div>
    <canvas id="bg"></canvas>

    <div id="loader">
      <div class="cube">
        <div class="side"></div>
        <div class="side"></div>
        <div class="side"></div>
        <div class="side"></div>
        <div class="side"></div>
        <div class="side"></div>
      </div>
      <div class="loading">
        <div class="loading-text">
          <span class="loading-word">L</span>
          <span class="loading-word">O</span>
          <span class="loading-word">U</span>
          <span class="loading-word">N</span>
          <span class="loading-word">G</span>
          <span class="loading-word">E</span>
        </div>
      </div>
    </div>

    <main class="lounge" style="display: none;">
      <a href="/" class="back-link">← Назад в Mercilium</a>
      <h1 class="title">Lounge</h1>
      <p class="subtitle">Выберите способ настройки сети</p>

      <div class="cards">
        <div class="card card-custom" data-target="/lounge/custom/">
          <div class="card-bg" style="background-image: url('/lounge/img/make_site_bg.png');"></div>
          <h2>Создание собственных офисов</h2>
          <p>Поддержанный конструктор офисов для сетевой связи и упрощения/ускорения работы специалиста.</p>
        </div>

        <div class="card card-auto" data-target="/lounge/auto/">
          <div class="card-bg" style="background-image: url('/lounge/img/gen_site_bg.png');"></div>
          <h2>Генерация автоматической сети</h2>
          <p>Автоматическая развёртка офисов без участия пользователя. Требует проверки возможностей сервиса.</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
onMounted(() => {
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const lounge = document.querySelector('.lounge') as HTMLElement | null;
    if (!loader || !lounge) return;
    setTimeout(() => {
      loader.classList.add('fade');
      setTimeout(() => {
        loader.style.display = 'none';
        lounge.style.display = 'flex';
      }, 800);
    }, 1800);
  });
});

useHead({
  title: 'Lounge — Mercilium Network Generator',
  htmlAttrs: { lang: 'ru' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800;900&display=swap'
    },
    { rel: 'stylesheet', href: '/lounge/assets/lounge.css' }
  ],
  script: [
    { src: '/lounge/assets/stars.js', defer: true },
    { src: '/lounge/assets/lounge.js', defer: true }
  ]
});
</script>
