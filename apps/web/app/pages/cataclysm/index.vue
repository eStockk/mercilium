<template>
  <div class="cataclysm">
    <div v-show="loaderVisible" id="loader">
      <div class="loading">
        <div class="loading-text">
          <span class="loading-word">C</span>
          <span class="loading-word">A</span>
          <span class="loading-word">T</span>
          <span class="loading-word">A</span>
          <span class="loading-word">C</span>
          <span class="loading-word">L</span>
          <span class="loading-word">Y</span>
          <span class="loading-word">S</span>
          <span class="loading-word">M</span>
        </div>
      </div>
    </div>

    <div id="cata-main" :class="{ hidden: !mainVisible }">
      <div class="left">
        <NuxtLink class="logo" id="cataclysm-logo" to="/">Cataclysm</NuxtLink>

        <div class="tab-controls">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'guides' }"
            type="button"
            @click="activeTab = 'guides'"
          >
            Гайды
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'sources' }"
            type="button"
            @click="activeTab = 'sources'"
          >
            Источники
          </button>
        </div>

        <div class="search-section">
          <div class="search-bar">
            <input
              id="searchInput"
              v-model="search"
              type="text"
              placeholder="Поиск по названию или тегам..."
            />
            <button id="tagsBtn" type="button" @click="toggleTagsPopup">Теги</button>
          </div>

          <div id="selectedTags" class="tags-selected">
            <div
              v-for="tag in selectedTags"
              :key="tag"
              class="tag-chip"
              :data-tag="tag"
              @click="removeTag(tag)"
            >
              {{ tag }}
            </div>
          </div>

          <div id="tagsPopup" class="tags-popup" :class="{ active: tagsPopupOpen }">
            <div class="tags-list">
              <div v-if="tagsLoading" style="color:#aaa;">Загрузка...</div>
              <div
                v-for="tag in tagsList"
                :key="tag"
                class="tag-item"
                :class="{ selected: selectedTagsSet.has(tag) }"
                :data-tag="tag"
                @click="toggleTag(tag)"
              >
                #{{ tag }}
              </div>
              <div v-if="!tagsLoading && tagsList.length === 0" style="color:#aaa;">Нет тегов</div>
            </div>
          </div>
        </div>
      </div>

      <div class="right">
        <div class="scroll-block" :class="{ active: !isMobile || activeTab === 'guides' }">
          <h2>Гайды</h2>
          <div id="guidesList" ref="guidesListRef" class="scroll-list">
            <div v-if="loading" class="post-card"><div class="post-bg">Загрузка...</div></div>
            <div v-if="error" class="post-card"><div class="post-bg">{{ error }}</div></div>

            <div v-for="post in guides" :key="post.id" class="post-card" :data-id="post.id">
              <div class="post-bg">
                <h3>{{ post.title || 'Без названия' }}</h3>
                <p>{{ snippet(post.content) }}</p>
                <div class="post-meta">{{ formatDateTime(post.created_at) }}</div>
                <div v-if="post.tags && post.tags.length" class="tags">
                  <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
                </div>
                <button class="read-more" type="button" @click="openPost(post.id)">
                  Читать далее…
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="scroll-block" :class="{ active: !isMobile || activeTab === 'sources' }">
          <h2>Источники</h2>
          <div id="sourcesList" ref="sourcesListRef" class="scroll-list">
            <div v-if="loading" class="post-card"><div class="post-bg">Загрузка...</div></div>
            <div v-if="error" class="post-card"><div class="post-bg">{{ error }}</div></div>

            <div v-for="post in sources" :key="post.id" class="post-card" :data-id="post.id">
              <div class="post-bg">
                <h3>{{ post.title || 'Без названия' }}</h3>
                <p>{{ snippet(post.content) }}</p>
                <div class="post-meta">{{ formatDateTime(post.created_at) }}</div>
                <div v-if="post.tags && post.tags.length" class="tags">
                  <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
                </div>
                <button class="read-more" type="button" @click="openPost(post.id)">
                  Читать далее…
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <canvas ref="starsRef" id="stars"></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

type ApiPost = {
  id: number;
  title: string;
  content: string;
  created_at?: string;
  tags?: string | string[];
};

const router = useRouter();
const config = useRuntimeConfig();

useHead({
  title: 'Cataclysm — Mercilium',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'cataclysm' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap' },
    { rel: 'stylesheet', href: '/assets/style.css' },
    { rel: 'stylesheet', href: '/cataclysm/assets/style.css' }
  ]
});

const loaderVisible = ref(true);
const mainVisible = ref(false);
const loading = ref(true);
const error = ref('');

const guides = ref<Array<ApiPost & { tags: string[] }>>([]);
const sources = ref<Array<ApiPost & { tags: string[] }>>([]);

const search = ref('');
const selectedTags = ref<string[]>([]);
const tagsPopupOpen = ref(false);
const tagsLoading = ref(false);
const tagsList = ref<string[]>([]);

const activeTab = ref<'guides' | 'sources'>('guides');
const isMobile = ref(false);

const guidesListRef = ref<HTMLElement | null>(null);
const sourcesListRef = ref<HTMLElement | null>(null);
const starsRef = ref<HTMLCanvasElement | null>(null);

const selectedTagsSet = computed(() => new Set(selectedTags.value));

let searchTimer: number | null = null;
let rafId = 0;
let resizeHandler: (() => void) | null = null;

const parseTags = (raw?: string | string[]) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => t.trim()).filter(Boolean);
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
};

const snippet = (html?: string) => {
  const text = (html || '').replace(/<[^>]*>/g, '').trim();
  if (!text) return '';
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const openPost = (id: number) => {
  if (!id) return;
  router.push(`/cataclysm/${id}`);
};

const toggleTagsPopup = async () => {
  tagsPopupOpen.value = !tagsPopupOpen.value;
  if (tagsPopupOpen.value) {
    await loadTags();
  }
};

const loadTags = async () => {
  tagsLoading.value = true;
  try {
    const data = await $fetch<{ ok: boolean; tags: string[] }>(`${config.public.apiBase}/public/tags`);
    tagsList.value = data.tags || [];
  } catch (err: any) {
    console.error('Ошибка загрузки тегов', err);
    tagsList.value = [];
  } finally {
    tagsLoading.value = false;
  }
};

const toggleTag = (tag: string) => {
  if (!tag) return;
  if (selectedTagsSet.value.has(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag);
  } else {
    selectedTags.value = [...selectedTags.value, tag];
  }
};

const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter((t) => t !== tag);
};

const fetchPosts = async () => {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (search.value.trim()) params.append('search', search.value.trim());
    if (selectedTags.value.length) params.append('tags', selectedTags.value.join(','));

    const url = `${config.public.apiBase}/public/posts${params.toString() ? `?${params.toString()}` : ''}`;
    const data = await $fetch<{ ok: boolean; guides: ApiPost[]; sources: ApiPost[]; error?: string }>(url);
    if (!data.ok) throw new Error(data.error || 'Ошибка загрузки');

    guides.value = (data.guides || []).map((p) => ({
      ...p,
      tags: parseTags(p.tags)
    }));
    sources.value = (data.sources || []).map((p) => ({
      ...p,
      tags: parseTags(p.tags)
    }));

    await nextTick();
    enableDragScroll(guidesListRef.value);
    enableDragScroll(sourcesListRef.value);
  } catch (err: any) {
    error.value = err?.message || 'Ошибка загрузки';
    guides.value = [];
    sources.value = [];
  } finally {
    loading.value = false;
  }
};

const enableDragScroll = (container: HTMLElement | null) => {
  if (!container || container.dataset.dragInit === '1') return;
  container.dataset.dragInit = '1';

  let isDown = false;
  let lastY = 0;
  let velocity = 0;
  let momentumFrame: number | null = null;

  const onMouseDown = (e: MouseEvent) => {
    isDown = true;
    lastY = e.clientY;
    velocity = 0;
    if (momentumFrame) cancelAnimationFrame(momentumFrame);
    container.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDown) return;
    const delta = e.clientY - lastY;
    container.scrollTop -= delta;
    velocity = delta;
    lastY = e.clientY;
  };

  const onMouseUp = () => {
    if (!isDown) return;
    isDown = false;
    container.style.cursor = 'grab';
    const momentum = () => {
      container.scrollTop -= velocity;
      velocity *= 0.94;
      if (Math.abs(velocity) > 0.2) {
        momentumFrame = requestAnimationFrame(momentum);
      }
    };
    momentumFrame = requestAnimationFrame(momentum);
  };

  container.style.cursor = 'grab';
  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
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
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      a: Math.random() * 0.8 + 0.2
    }));
  };

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
    stars.forEach((s) => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#ffffff';
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

  const onVisibility = () => {
    running = !document.hidden;
    if (running) rafId = requestAnimationFrame(drawStars);
  };

  resizeHandler = createStars;
  window.addEventListener('resize', createStars);
  document.addEventListener('visibilitychange', onVisibility);
  createStars();
  rafId = requestAnimationFrame(drawStars);
};

const updateMobile = () => {
  isMobile.value = window.innerWidth <= 900;
};

watch([search, selectedTags], () => {
  if (searchTimer) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    fetchPosts();
  }, 400);
});

onMounted(async () => {
  updateMobile();
  window.addEventListener('resize', updateMobile);

  setupStars();
  await fetchPosts();

  setTimeout(() => {
    loaderVisible.value = false;
    mainVisible.value = true;
  }, 800);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  if (searchTimer) window.clearTimeout(searchTimer);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (rafId) cancelAnimationFrame(rafId);
});
</script>
