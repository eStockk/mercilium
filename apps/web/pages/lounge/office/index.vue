<template>
  <div>
    <canvas id="bg"></canvas>

    <header class="topbar">
      <a class="back" href="/lounge/custom">← Назад к офисам</a>
      <h1 id="officeTitle">Офис</h1>
      <div class="top-actions">
        <button id="btnToggleOnline" class="btn mini">offline</button>
      </div>
    </header>

    <main class="layout">
      <aside class="left">
        <div class="card">
          <div class="kv">
            <span>Название:</span><b id="infoName">—</b>
          </div>
          <div class="kv">
            <span>CIDR:</span><b id="infoCIDR">—</b>
          </div>

          <div class="kv">
            <span>Статус:</span>
            <b id="infoOnline" class="pill pill-off">offline</b>
          </div>

          <div class="kv">
            <span>Стабильность:</span>
            <b id="infoStable" class="warn">Проверка…</b>
          </div>

          <div class="kv">
            <span>VLAN:</span><b id="infoVlanCnt">0</b>
          </div>

          <div class="preview">
            <img id="officeImg" alt="Иллюстрация офиса" />
          </div>
        </div>
      </aside>

      <section class="right">
        <div class="console-actions">
          <button id="btnAddVM" class="btn violet">ADD_VM</button>
          <button id="btnMap" class="btn ghost">Карта офиса</button>
        </div>

        <div class="terminal" id="termBox">
          <div class="term-header">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
            <span class="title">Терминал офиса</span>
          </div>
          <div class="term-body" id="termBody" tabindex="-1" aria-live="polite"></div>

          <div class="term-input">
            <span class="prompt" id="termPrompt">$</span>
            <input id="cmd" type="text" autocomplete="off" spellcheck="false" />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Офис — Mercilium Lounge',
  htmlAttrs: { lang: 'ru' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap'
    },
    { rel: 'stylesheet', href: '/lounge/office/office.css' }
  ],
  script: [
    { src: '/lounge/office/office.js', defer: true },
    { src: '/lounge/office/vm-create-graphic.js', defer: true }
  ]
});
</script>
