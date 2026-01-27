<template>
  <div>
    <canvas id="stars"></canvas>

    <div id="post-main">
      <a href="/cataclysm" class="back-link">← Назад</a>

      <div v-if="errorMessage" class="error-box">
        <h2>⚠ Ошибка загрузки поста</h2>
        <p>{{ errorMessage }}</p>
      </div>

      <article v-else class="post-content quill-content">
        <h1>{{ postTitle }}</h1>

        <div v-if="postDate" class="date">{{ postDate }}</div>

        <div v-if="postTags.length" class="tags">
          <span v-for="tag in postTags" :key="tag" class="tag">#{{ tag }}</span>
        </div>

        <div v-if="categories.length" class="category-switch">
          <button
            v-for="(cat, index) in categories"
            :key="cat.name + index"
            class="category-tab"
            :class="{ active: activeCategory === index }"
            type="button"
            @click="activeCategory = index"
          >
            {{ cat.name }}
          </button>
        </div>

        <div v-if="categories.length" class="category-content">
          <div
            v-for="(cat, index) in categories"
            :key="cat.name + '-panel-' + index"
            class="category-panel quill-content"
            :class="{ active: activeCategory === index }"
            v-html="cat.content"
          />
        </div>

        <div v-else class="content-area" v-html="postContent"></div>

        <section
          v-if="sourcePost"
          class="source-block"
          @click="goToSource"
        >
          <canvas class="source-bg"></canvas>
          <div class="source-inner">
            <h2>Источник</h2>
            <h3>{{ sourcePost.title }}</h3>
            <div v-if="sourcePost.tags?.length" class="tags">
              <span
                v-for="tag in sourcePost.tags"
                :key="tag"
                class="tag"
              >
                {{ tag }}
              </span>
            </div>
            <div v-if="sourcePost.created_at" class="date">
              Опубликовано: {{ formatDate(sourcePost.created_at) }}
            </div>
          </div>
        </section>
      </article>
    </div>

    <button id="toTop" :class="{ visible: showTop }" @click="scrollTop">↑</button>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const postId = computed(() => String(route.params.id || ''));
const activeCategory = ref(0);
const showTop = ref(false);

const { data, error } = await useFetch(() => `${runtimeConfig.public.apiBase}/public/posts/${postId.value}`, {
  key: `post-${postId.value}`
});

const errorMessage = computed(() => {
  if (error.value) return error.value.message || 'Ошибка сети';
  if (data.value && data.value.ok === false) return data.value.error || 'Ошибка API';
  return '';
});

const post = computed(() => data.value?.post || null);
const postTitle = computed(() => post.value?.title || 'Без названия');
const postContent = computed(() => post.value?.content_html || post.value?.content || '');
const postDate = computed(() => (post.value?.created_at ? formatDate(post.value.created_at) : ''));
const postTags = computed(() => {
  const tags = post.value?.tags || [];
  return Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
});
const categories = computed(() => {
  const cats = post.value?.categories || [];
  if (!Array.isArray(cats)) return [];
  return cats.map((c: any) => ({ name: c.name || 'Категория', content: c.content || '' }));
});
const sourcePost = computed(() => {
  const src = data.value?.linked_sources || [];
  if (Array.isArray(src) && src.length) return src[0];
  return null;
});
function formatDate(input: string) {
  const d = new Date(input);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const goToSource = () => {
  if (sourcePost.value?.id) {
    window.location.href = `/cataclysm/${sourcePost.value.id}`;
  }
};

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const initStars = () => {
  const canvas = document.getElementById('stars') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let stars: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];

  const resize = () => {
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

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
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
    }
    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', resize);
  resize();
  draw();
};

const initSourceCanvas = () => {
  const canvas = document.querySelector('.source-bg') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let stars: { x: number; y: number; r: number; vx: number; vy: number }[] = [];
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
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
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
    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', resize);
  resize();
  draw();
};

const initReveal = () => {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll('.quill-content > *').forEach(el => observer.observe(el));
};

onMounted(() => {
  initStars();
  initSourceCanvas();
  initReveal();
  const onScroll = () => {
    showTop.value = window.scrollY > 400;
  };
  window.addEventListener('scroll', onScroll);
});

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
    { rel: 'stylesheet', href: '/cataclysm/assets/post.css' }
  ]
});
</script>
