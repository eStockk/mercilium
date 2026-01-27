<template>
  <div class="home">
    <div id="loader">
      <div class="loading">
        <div class="loading-text">
          <span class="loading-word">M</span>
          <span class="loading-word">E</span>
          <span class="loading-word">R</span>
          <span class="loading-word">C</span>
          <span class="loading-word">I</span>
          <span class="loading-word">L</span>
          <span class="loading-word">I</span>
          <span class="loading-word">U</span>
          <span class="loading-word">M</span>
        </div>
      </div>
    </div>

    <div id="main" class="hidden">
      <div class="left">
        <h1 class="logo">Mercilium</h1>
      </div>
      <div class="right">
        <a href="/cataclysm" class="main-btn cataclysm">Cataclysm</a>
        <a href="/lounge" class="main-btn lounge">Lounge</a>
        <a href="/admin/login" class="main-btn dbauth">DBAuth</a>
      </div>
    </div>

    <canvas id="stars"></canvas>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Mercilium',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'home' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap'
    },
    { rel: 'stylesheet', href: '/assets/style.css' }
  ],
  script: [{ src: '/assets/app.js', defer: true }]
});
</script>
