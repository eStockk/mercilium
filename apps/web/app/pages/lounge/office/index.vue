<template>
  <div>
    <canvas id="bg"></canvas>

    <header class="topbar">
      <NuxtLink class="back" to="/lounge/custom">< Назад к офисам</NuxtLink>
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
          <button id="btnEditVlan" class="btn mini" style="margin-top:6px">Настроить VLAN</button>

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
          <button id="btnMap" class="btn ghost" @click="openMap">Карта офиса</button>
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

    <div id="modalVlan" class="modal" aria-hidden="true">
      <div class="modal__dialog">
        <button class="modal__close" data-close>&times;</button>
        <h2 class="modal__title">VLAN офиса</h2>
        <div class="form">
          <div class="vlans__head">
            <span>VID + роль + вместимость</span>
            <button id="btnAddVlanOffice" type="button" class="btn mini">+ VLAN</button>
          </div>
          <div id="vlanRowsOffice" class="vlans__rows"></div>
          <div class="modal__footer">
            <button id="btnSaveVlanOffice" class="btn violet">Сохранить</button>
            <button class="btn ghost" data-close>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

useHead({
  title: 'Офис — Mercilium Lounge',
  htmlAttrs: { lang: 'ru' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap' },
    { rel: 'stylesheet', href: '/lounge/office/office.css' }
  ]
});

const openMap = () => {
  const id = route.query.id ? String(route.query.id) : '';
  router.push({ path: '/lounge/office/map', query: { id } });
};

onMounted(async () => {
  const office = await import('~/legacy/office');
  const vmGraphic = await import('~/legacy/vm-create-graphic');
  office.initOffice();
  vmGraphic.initVmGraphic();
});
</script>
