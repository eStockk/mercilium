<template>
  <div>
    <canvas id="spaceCanvas" aria-hidden="true"></canvas>
    <div class="glow" aria-hidden="true"></div>

    <header class="topbar">
      <div class="topbar__left">
        <a class="topbar__back" href="/lounge/office/">← Назад</a>
        <div class="topbar__title" id="officeTitle">Карта офиса</div>
      </div>
      <div class="topbar__right">
        <div class="badge">Topology view</div>
      </div>
    </header>

    <main id="officeGraph" class="office-graph" role="main"></main>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Карта офиса',
  htmlAttrs: { lang: 'ru' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap'
    },
    { rel: 'stylesheet', href: '/lounge/office/map.css' }
  ],
  script: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.33.1/cytoscape.min.js', defer: true },
    { src: '/lounge/office/map-init.js', type: 'module' }
  ]
});
</script>
