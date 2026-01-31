<template>
  <div>
    <canvas ref="bgRef" id="bg"></canvas>

    <div v-show="loaderVisible" id="loader" :class="{ fade: loaderFade }">
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

    <main class="lounge" :style="{ display: mainVisible ? 'flex' : 'none', transform: loungeTransform }">
      <NuxtLink to="/" class="back-link">< Назад в Mercilium</NuxtLink>
      <h1 class="title">Lounge</h1>
      <p class="subtitle">Выберите способ настройки сети</p>

      <div class="cards">
        <div
          class="card card-custom"
          @mouseenter="hoverTarget = 'custom'"
          @mouseleave="hoverTarget = null"
          @click="navigate('/lounge/custom')"
        >
          <div class="card-bg" style="background-image: url('/lounge/img/make_site_bg.png');"></div>
          <h2>Создание собственных офисов</h2>
          <p>
            Поддержанный конструктор офисов для сетевой связи и упрощения/ускорения работы специалиста.
          </p>
        </div>

        <div
          class="card card-auto"
          @mouseenter="hoverTarget = 'auto'"
          @mouseleave="hoverTarget = null"
          @click="navigate('/lounge/auto')"
        >
          <div class="card-bg" style="background-image: url('/lounge/img/gen_site_bg.png');"></div>
          <h2>Генерация автоматической сети</h2>
          <p>
            Автоматическая развёртка офисов без участия пользователя. Требует проверки возможностей сервиса.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

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
  ]
});

const bgRef = ref<HTMLCanvasElement | null>(null);
const loaderVisible = ref(true);
const loaderFade = ref(false);
const mainVisible = ref(false);
const hoverTarget = ref<'custom' | 'auto' | null>(null);

let rafId = 0;
let resizeHandler: (() => void) | null = null;

const loungeTransform = computed(() => {
  if (hoverTarget.value === 'custom') return 'translateX(-0.5%) scale(1.015)';
  if (hoverTarget.value === 'auto') return 'translateX(0.5%) scale(1.015)';
  return 'translateX(0) scale(1)';
});

const navigate = (path: string) => {
  document.body.style.transition = 'opacity 0.6s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    router.push(path);
    document.body.style.opacity = '1';
  }, 600);
};

const setupStars = () => {
  const canvas = bgRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let stars: Array<{ x: number; y: number; z: number; r: number; vx: number; vy: number }> = [];
  let lines: Array<[number, number]> = [];
  let pulse = 0;

  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = w < 700 ? 60 : 120;
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.7 + 0.3,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15
    }));

    lines = [];
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        if (Math.random() < 0.045) {
          lines.push([i, j]);
        }
      }
    }
  };

  const maxFPS = 30;
  let lastFrame = 0;
  let running = true;

  const animate = (ts: number) => {
    if (!running) return;
    if (ts - lastFrame < 1000 / maxFPS) {
      rafId = requestAnimationFrame(animate);
      return;
    }
    lastFrame = ts;

    ctx.fillStyle = 'rgba(5, 0, 20, 0.9)';
    ctx.fillRect(0, 0, w, h);
    pulse += 0.02;

    for (const [i, j] of lines) {
      const a = stars[i];
      const b = stars[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 250) {
        const alpha = 0.25 - dist / 800;
        ctx.strokeStyle = `rgba(180,130,255,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0 || s.x > w) s.vx *= -1;
      if (s.y < 0 || s.y > h) s.vy *= -1;

      const glow = 0.8 + Math.sin(pulse + s.x / 50) * 0.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * glow, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,180,255,${s.z})`;
      ctx.shadowColor = `rgba(180,100,255,${s.z})`;
      ctx.shadowBlur = 10;
      ctx.fill();
    }

    rafId = requestAnimationFrame(animate);
  };

  const onVisibility = () => {
    running = !document.hidden;
    if (running) rafId = requestAnimationFrame(animate);
  };

  resizeHandler = resize;
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  rafId = requestAnimationFrame(animate);
};

onMounted(() => {
  setupStars();
  setTimeout(() => {
    loaderFade.value = true;
    setTimeout(() => {
      loaderVisible.value = false;
      mainVisible.value = true;
    }, 800);
  }, 1800);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (rafId) cancelAnimationFrame(rafId);
});
</script>
