<template>
  <div class="page" data-page="tunnel">
    <header class="topbar">
      <div class="topbar__left">
        <button id="btnBack" class="btn ghost mini">← Вернуться</button>
        <div class="title-wrap">
          <h1 id="pageTitle">Туннель</h1>
          <div id="pageSubtitle" class="subtitle">interactive link board</div>
        </div>
      </div>

      <div class="topbar__right">
        <div class="top-actions">
          <button id="btnFitView" class="btn ghost mini" title="Уместить в экран">Fit</button>
          <button id="btnRecenter" class="btn ghost mini" title="Центрировать">Center</button>
          <button id="btnDelete" class="btn danger mini">Удалить</button>
        </div>
      </div>
    </header>

    <div class="layout">
      <aside class="sidebar">
        <section class="card">
          <div class="card__head">
            <h3>Адреса tunnel.0</h3>
            <div class="card__sub">изменения применяются к обеим сторонам</div>
          </div>

          <label class="fld">
            <span>IP стороны A</span>
            <input id="ipA" type="text" placeholder="10.0.0.1">
          </label>

          <label class="fld">
            <span>IP стороны B</span>
            <input id="ipB" type="text" placeholder="10.0.0.2">
          </label>

          <label class="fld">
            <span>Подсеть (CIDR)</span>
            <input id="cidr" type="text" placeholder="10.0.0.0/30">
          </label>

          <button id="btnSaveAddrs" class="btn violet full">Сохранить</button>
        </section>

        <section class="card legend">
          <h3>Легенда</h3>
          <div class="legend__item office">Офис</div>
          <div class="legend__item isp">ISP</div>
          <div class="legend__item emach">Emach</div>
          <div class="legend__item vm">VM внутри офиса</div>
        </section>
      </aside>

      <main class="board-area">
        <div class="board-shell">
          <canvas id="starsBg" class="stars-canvas"></canvas>
          <svg id="board" class="board-svg"></svg>

          <div class="hud">
            <button id="zoomIn" class="btn ghost mini" title="Zoom in">+</button>
            <button id="zoomOut" class="btn ghost mini" title="Zoom out">−</button>
          </div>
        </div>
      </main>
    </div>

    <div id="dragGhost" class="drag-ghost hidden"></div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Туннель — Mercilium Lounge',
  htmlAttrs: { lang: 'ru' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [{ rel: 'stylesheet', href: '/lounge/link/link.css' }],
  script: [
    { src: 'https://d3js.org/d3.v7.min.js', defer: true },
    { src: '/lounge/link/link.js', defer: true }
  ]
});
</script>
