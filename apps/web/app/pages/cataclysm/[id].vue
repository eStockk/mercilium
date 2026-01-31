<template>
  <div class="cataclysm">
    <canvas ref="starsRef" id="stars"></canvas>

    <div id="post-main">
      <NuxtLink to="/cataclysm" class="back-link">< Назад</NuxtLink>

      <div v-if="loading" class="error-box">
        <h2>Загрузка…</h2>
      </div>

      <div v-else-if="error" class="error-box">
        <h2>? Ошибка загрузки поста</h2>
        <p>{{ error }}</p>
      </div>

      <article v-else-if="post" class="post-content quill-content">
        <h1>{{ post.title }}</h1>

        <div v-if="post.created_at" class="date">Опубликовано: {{ formatDate(post.created_at) }}</div>

        <div v-if="post.tags.length" class="tags">
          <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <div v-if="categories.length" class="category-switch">
          <button
            v-for="(cat, idx) in categories"
            :key="`${cat.name}-${idx}`"
            class="category-tab"
            :class="{ active: activeCategoryIndex === idx }"
            type="button"
            @click="setCategory(idx)"
          >
            {{ cat.name }}
          </button>
        </div>

        <div v-if="categories.length" class="category-content">
          <div
            v-for="(cat, idx) in categories"
            :key="`${cat.name}-panel-${idx}`"
            class="category-panel quill-content"
            :class="{ active: activeCategoryIndex === idx }"
            v-html="cat.content"
          ></div>
        </div>
        <div v-else class="content-area" v-html="post.contentHtml"></div>

        <section
          v-if="linkedSources.length"
          class="source-block"
          @click="openSource(linkedSources[0].id)"
        >
          <canvas ref="sourceCanvasRef" class="source-bg"></canvas>
          <div class="source-inner">
            <h2>Источник</h2>
            <h3>{{ linkedSources[0].title }}</h3>
            <div v-if="linkedSources[0].tags.length" class="tags">
              <span v-for="tag in linkedSources[0].tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="date">Опубликовано: {{ formatDate(linkedSources[0].created_at) }}</div>
          </div>
        </section>
      </article>
    </div>

    <button id="toTop" :class="{ visible: showToTop }" @click="scrollToTop">^</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

type Category = { name: string; content: string };

type PostResponse = {
  ok: boolean;
  post?: {
    id: number;
    title: string;
    content: string;
    content_html?: string;
    created_at?: string;
    tags?: string[];
    categories?: Category[];
    type?: string;
  };
  linked_sources?: Array<{ id: number; title: string; tags?: string[]; created_at?: string }>;
  error?: string;
};

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

useHead({
  title: 'Cataclysm — Mercilium',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'cataclysm' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap' },
    { rel: 'stylesheet', href: '/cataclysm/assets/post.css' }
  ]
});

const loading = ref(true);
const error = ref('');
const post = ref<{ id: number; title: string; contentHtml: string; created_at?: string; tags: string[]; type?: string } | null>(null);
const categories = ref<Category[]>([]);
const linkedSources = ref<Array<{ id: number; title: string; tags: string[]; created_at?: string }>>([]);
const activeCategoryIndex = ref(0);

const showToTop = ref(false);

const starsRef = ref<HTMLCanvasElement | null>(null);
const sourceCanvasRef = ref<HTMLCanvasElement | null>(null);

let rafId = 0;
let resizeHandler: (() => void) | null = null;
let sourceRaf = 0;
let sourceResize: (() => void) | null = null;

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const setCategory = (index: number) => {
  activeCategoryIndex.value = index;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const openSource = (id?: number) => {
  if (!id) return;
  router.push(`/cataclysm/${id}`);
};

const setupStars = () => {
  const canvas = starsRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let stars: Array<{ x: number; y: number; r: number; vx: number; vy: number; a: number }> = [];

  const createStars = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.max(150, Math.floor(canvas.width / 8));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      a: Math.random() * 0.8 + 0.2
    }));
  };

  const drawStars = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
      if (s.y < 0) s.y = canvas.height;
      if (s.y > canvas.height) s.y = 0;
    });
    rafId = requestAnimationFrame(drawStars);
  };

  resizeHandler = createStars;
  window.addEventListener('resize', createStars);
  createStars();
  rafId = requestAnimationFrame(drawStars);
};

const setupSourceStars = () => {
  const canvas = sourceCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let stars: Array<{ x: number; y: number; r: number; vx: number; vy: number }> = [];
  const STAR_COUNT = 70;
  const MAX_DISTANCE = 140;

  const resize = () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2,
      vx: (Math.random() - 0.5) * 0.07,
      vy: (Math.random() - 0.5) * 0.07
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 0.4;
    for (let i = 0; i < stars.length; i += 1) {
      for (let j = i + 1; j < stars.length; j += 1) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DISTANCE) {
          const alpha = 1 - dist / MAX_DISTANCE;
          ctx.strokeStyle = `rgba(148,0,211,${alpha * 0.5})`;
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

    sourceRaf = requestAnimationFrame(draw);
  };

  sourceResize = resize;
  window.addEventListener('resize', resize);
  resize();
  sourceRaf = requestAnimationFrame(draw);
};

const observeContent = () => {
  if (!process.client) return;
  const items = document.querySelectorAll('.quill-content > *');
  if (!items.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => observer.observe(el));
};

const fetchPost = async () => {
  loading.value = true;
  error.value = '';
  try {
    const id = Number(route.params.id);
    if (!id) throw new Error('Некорректный ID');

    const data = await $fetch<PostResponse>(`${config.public.apiBase}/public/posts/${id}`);
    if (!data.ok || !data.post) throw new Error(data.error || 'Пост не найден');

    post.value = {
      id: data.post.id,
      title: data.post.title,
      contentHtml: data.post.content_html || data.post.content,
      created_at: data.post.created_at,
      tags: data.post.tags || [],
      type: data.post.type
    };

    categories.value = data.post.categories || [];
    activeCategoryIndex.value = 0;

    linkedSources.value = (data.linked_sources || []).map((src) => ({
      id: src.id,
      title: src.title,
      tags: src.tags || [],
      created_at: src.created_at
    }));

    await nextTick();
    observeContent();
    setupSourceStars();
  } catch (err: any) {
    error.value = err?.message || 'Ошибка загрузки';
    post.value = null;
    categories.value = [];
    linkedSources.value = [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.params.id,
  () => {
    fetchPost();
  }
);

onMounted(() => {
  setupStars();
  fetchPost();

  window.addEventListener('scroll', () => {
    showToTop.value = window.scrollY > 400;
  });
});

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (rafId) cancelAnimationFrame(rafId);
  if (sourceResize) window.removeEventListener('resize', sourceResize);
  if (sourceRaf) cancelAnimationFrame(sourceRaf);
});
</script>
