<template>
  <div class="home">
    <div v-show="loaderVisible" id="loader">
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

    <div id="main" :class="{ hidden: !mainVisible }">
      <div class="left">
        <h1 class="logo">Mercilium</h1>
      </div>
      <div class="right">
        <NuxtLink to="/cataclysm" class="main-btn cataclysm">Cataclysm</NuxtLink>
        <NuxtLink to="/lounge" class="main-btn lounge">Lounge</NuxtLink>
        <NuxtLink to="/admin/login" class="main-btn dbauth">DBAuth</NuxtLink>
      </div>
    </div>

    <canvas ref="starsRef" id="stars"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

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
  ]
});

const loaderVisible = ref(true);
const mainVisible = ref(false);
const starsRef = ref<HTMLCanvasElement | null>(null);

let rafId = 0;
let resizeHandler: (() => void) | null = null;

onMounted(() => {
  const body = document.body;
  body.style.overflow = 'hidden';

  const canvas = starsRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let STAR_COUNT = 100;
  let MAX_DISTANCE = 150;
  const stars: Array<{ x: number; y: number; r: number; vx: number; vy: number }> = [];

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const area = canvas.width * canvas.height;
    STAR_COUNT = Math.max(50, Math.floor(area / 12000));
    MAX_DISTANCE = Math.min(200, Math.max(100, canvas.width / 8));

    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i += 1) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.07,
        vy: (Math.random() - 0.5) * 0.07
      });
    }
  };

  resizeHandler = resizeCanvas;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const maxFPS = 30;
  let lastFrame = 0;
  let running = true;

  const drawStars = (ts: number) => {
    if (!running) return;
    if (ts - lastFrame < 1000 / maxFPS) {
      rafId = requestAnimationFrame(drawStars);
      return;
    }
    lastFrame = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 1.2
    );
    gradient.addColorStop(0, '#090922');
    gradient.addColorStop(1, '#02020a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 0.5;
    for (let i = 0; i < STAR_COUNT; i += 1) {
      for (let j = i + 1; j < STAR_COUNT; j += 1) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DISTANCE) {
          const alpha = 1 - dist / MAX_DISTANCE;
          ctx.strokeStyle = `rgba(148, 0, 211, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = '#fff';
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
      if (s.y < 0) s.y = canvas.height;
      if (s.y > canvas.height) s.y = 0;
    }

    rafId = requestAnimationFrame(drawStars);
  };

  const onVisibility = () => {
    running = !document.hidden;
    if (running) rafId = requestAnimationFrame(drawStars);
  };

  document.addEventListener('visibilitychange', onVisibility);
  rafId = requestAnimationFrame(drawStars);

  const minTime = 1200;
  const maxTime = 2500;
  const loadTime = Math.random() * (maxTime - minTime) + minTime;

  const showMain = () => {
    loaderVisible.value = false;
    mainVisible.value = true;
    body.style.overflow = 'auto';
  };

  setTimeout(() => {
    showMain();
  }, loadTime);

  setTimeout(() => {
    showMain();
  }, 5000);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  if (rafId) cancelAnimationFrame(rafId);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
});
</script>
