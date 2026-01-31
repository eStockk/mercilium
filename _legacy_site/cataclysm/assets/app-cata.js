// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ПОИСКА ===
let selectedTags = new Set();
let searchTimeout = null;

// === КОСМИЧЕСКИЙ ФОН ===
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [];

function createStars() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const count = Math.max(150, Math.floor(canvas.width / 8));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.6 + 0.3,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.1,
    a: Math.random() * 0.8 + 0.2
  }));
}
function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(s => {
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
  requestAnimationFrame(drawStars);
}
window.addEventListener('resize', createStars);
createStars();
drawStars();

const loader = document.getElementById('loader');
const main = document.getElementById('cata-main');

// === ФОРМАТИРОВАНИЕ ДАТЫ ===
function formatDateTime(str) {
  const d = new Date(str);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// === РЕНДЕР КАРТОЧКИ ===
function cardHTML(p) {
  const title = p.title || 'Без названия';
  const snippet = (p.content || '').replace(/<[^>]*>/g, '').slice(0, 140) + '…';
  const date = p.created_at ? formatDateTime(p.created_at) : '';
  const tagsArr = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const tags = tagsArr.length
    ? `<div class="tags">${tagsArr.map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>`
    : '';
  return `
    <div class="post-card" data-id="${p.id}">
      <div class="post-bg">
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(snippet)}</p>
        <div class="post-meta">${escapeHTML(date)}</div>
        ${tags}
        <button class="read-more" data-id="${p.id}">Читать далее…</button>
      </div>
    </div>`;
}
function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, s => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]
  ));
}

// === DRAG + ИНЕРЦИЯ + "КОСМИЧЕСКОЕ ПЛАВАНИЕ" ===
function enableDragScroll(container) {
  let isDown = false;
  let startY = 0;
  let lastY = 0;
  let velocity = 0;
  let momentumFrame = null;
  let floatActive = true;
  let lastInteraction = 0;

  container.style.cursor = 'grab';
  container.style.userSelect = 'none';
  container.style.overflowY = 'scroll';
  container.style.scrollBehavior = 'auto';

  const cards = container.querySelectorAll('.post-card');
  let floatAngle = 0;

  function floatCards() {
    if (!floatActive) return;
    floatAngle += 0.02;
    cards.forEach((card, i) => {
      const offset = Math.sin(floatAngle + i * 0.6) * 3;
      card.style.transform = `translateY(${offset}px)`;
    });
    requestAnimationFrame(floatCards);
  }
  requestAnimationFrame(floatCards);

  function onMouseDown(e) {
    isDown = true;
    startY = e.clientY;
    lastY = e.clientY;
    velocity = 0;
    cancelMomentum();
    container.style.cursor = 'grabbing';
    floatActive = false;
  }

  function onMouseMove(e) {
    if (!isDown) return;
    const deltaY = e.clientY - lastY;
    container.scrollTop -= deltaY;
    velocity = deltaY;
    lastY = e.clientY;
  }

  function onMouseUp() {
    if (!isDown) return;
    isDown = false;
    container.style.cursor = 'grab';
    startMomentumScroll();
    restartFloatAfterDelay();
  }

  function onTouchStart(e) {
    isDown = true;
    startY = e.touches[0].clientY;
    lastY = e.touches[0].clientY;
    velocity = 0;
    cancelMomentum();
    floatActive = false;
  }

  function onTouchMove(e) {
    if (!isDown) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - lastY;
    container.scrollTop -= deltaY;
    velocity = deltaY;
    lastY = currentY;
  }

  function onTouchEnd() {
    if (!isDown) return;
    isDown = false;
    startMomentumScroll();
    restartFloatAfterDelay();
  }

  function startMomentumScroll() {
    cancelMomentum();
    momentumFrame = requestAnimationFrame(momentumLoop);
  }

  function cancelMomentum() {
    if (momentumFrame) cancelAnimationFrame(momentumFrame);
    momentumFrame = null;
  }

  function momentumLoop() {
    container.scrollTop -= velocity;
    velocity *= 0.94;
    if (Math.abs(velocity) > 0.2) {
      momentumFrame = requestAnimationFrame(momentumLoop);
    } else {
      restartFloatAfterDelay();
    }
  }

  function restartFloatAfterDelay() {
    lastInteraction = Date.now();
    setTimeout(() => {
      const now = Date.now();
      if (now - lastInteraction > 1500 && !isDown) {
        floatActive = true;
        requestAnimationFrame(floatCards);
      }
    }, 1500);
  }

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', onTouchEnd);
}

// === ПЕРЕХОД НА ПОСТ ===
function bindReadMore() {
  document.querySelectorAll('.read-more').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (id) window.location.href = `post.php?id=${id}`;
    });
  });
}

// === ПОИСК И ТЭГИ ===
async function loadTags() {
  const popup = document.getElementById('tagsPopup');
  const list = popup.querySelector('.tags-list'); // <-- теперь точно popup
  list.innerHTML = '<div style="color:#aaa;">Загрузка...</div>';
  try {
    const res = await fetch('../../backside/api/get_tags.php');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Ошибка загрузки тэгов');
    list.innerHTML = data.tags
      .map(t => {
        const name = typeof t === 'string' ? t : (t.name || '');
        return `<div class="tag-item" data-tag="${name}">#${name}</div>`;
      })
      .join('');
  } catch (err) {
    console.error('Ошибка загрузки тэгов:', err);
    list.innerHTML = `<p style="color:#f77;">${err.message}</p>`;
  }
}


function setupSearch() {
  const input = document.getElementById('searchInput');
  const tagsBtn = document.getElementById('tagsBtn');
  const popup = document.getElementById('tagsPopup');
  const list = popup.querySelector('.tags-list');
  const selected = document.getElementById('selectedTags');

  tagsBtn.addEventListener('click', () => {
    popup.classList.toggle('active');
    if (popup.classList.contains('active')) loadTags();
  });

  list.addEventListener('click', e => {
    const tag = e.target.dataset.tag;
    if (!tag) return;
    if (selectedTags.has(tag)) selectedTags.delete(tag);
    else selectedTags.add(tag);
    renderSelectedTags();
    updateTagSelection();
    performSearch();
  });

  selected.addEventListener('click', e => {
    const tag = e.target.dataset.tag;
    if (!tag) return;
    selectedTags.delete(tag);
    renderSelectedTags();
    updateTagSelection();
    performSearch();
  });

  function updateTagSelection() {
    document.querySelectorAll('.tag-item').forEach(el => {
      const tag = el.dataset.tag;
      el.classList.toggle('selected', selectedTags.has(tag));
    });
  }

  function renderSelectedTags() {
    selected.innerHTML = Array.from(selectedTags)
      .map(t => `<div class="tag-chip" data-tag="${t}">${t}</div>`)
      .join('');
  }

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 400);
  });
}

async function performSearch() {
  const searchVal = document.getElementById('searchInput').value.trim();
  const tags = Array.from(selectedTags);
  const gList = document.getElementById('guidesList');
  const sList = document.getElementById('sourcesList');

  try {
    const params = new URLSearchParams();
    if (searchVal) params.append('search', searchVal);
    if (tags.length) params.append('tags', tags.join(','));

    const res = await fetch(`../../backside/api/get_posts.php?${params.toString()}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Ошибка API');

    gList.innerHTML = data.guides.map(cardHTML).join('');
    sList.innerHTML = data.sources.map(cardHTML).join('');

    enableDragScroll(gList);
    enableDragScroll(sList);
    bindReadMore();
  } catch (err) {
    console.error('❌ Ошибка поиска:', err);
    gList.innerHTML = `<p style="color:#f77;text-align:center;">${err.message}</p>`;
    sList.innerHTML = '';
  }
}

// === ИНИЦИАЛИЗАЦИЯ ===
async function init() {
  loader.style.display = 'flex';
  main.classList.add('hidden');

  const res = await fetch('../../backside/api/get_posts.php');
  const data = await res.json();

  const gList = document.getElementById('guidesList');
  const sList = document.getElementById('sourcesList');
  gList.innerHTML = data.guides.map(cardHTML).join('');
  sList.innerHTML = data.sources.map(cardHTML).join('');

  enableDragScroll(gList);
  enableDragScroll(sList);
  bindReadMore();
  setupSearch();

  setTimeout(() => {
    loader.style.display = 'none';
    main.classList.remove('hidden');
  }, 800);
  setupSearch();

  // только если экран меньше 900 пикселей
  if (window.innerWidth <= 900) {
    setupMobileTabs();
  }


}

// === МОБИЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК с анимацией и неоновым откликом ===
function setupMobileTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const blocks = document.querySelectorAll('.scroll-block');
  let currentActive = blocks[0];

  // Активируем первую вкладку по умолчанию
  if (blocks.length) {
    blocks[0].classList.add('active');
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const newBlock = Array.from(blocks).find(b => {
        const list = b.querySelector('.scroll-list');
        return list && list.id === targetId;
      });

      if (!newBlock || newBlock === currentActive) return;

      // 💜 Неоновый эффект при клике
      btn.classList.add('glow');
      setTimeout(() => btn.classList.remove('glow'), 400);

      // Обновляем состояние кнопок
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Анимация исчезновения текущего блока
      currentActive.classList.remove('active');
      currentActive.style.opacity = '0';
      currentActive.style.transform = 'scale(0.97)';

      // Анимация появления нового блока
      newBlock.classList.add('active');
      newBlock.style.opacity = '1';
      newBlock.style.transform = 'scale(1)';

      // Обновляем активный блок
      currentActive = newBlock;
    });
  });
}

function setupResponsiveSwitch() {
  let mobileMode = window.innerWidth <= 900;

  // Проверяем при старте
  toggleLayout(mobileMode);

  // Следим за изменением ширины окна
  window.addEventListener('resize', () => {
    const nowMobile = window.innerWidth <= 900;
    if (nowMobile !== mobileMode) {
      mobileMode = nowMobile;
      toggleLayout(mobileMode);
    }
  });

  function toggleLayout(isMobile) {
    const tabControls = document.querySelector('.tab-controls');
    const blocks = document.querySelectorAll('.scroll-block');

    if (isMobile) {
      // Включаем мобильный режим
      tabControls.style.display = 'flex';
      blocks.forEach((b, i) => {
        if (i === 0) b.classList.add('active');
        else b.classList.remove('active');
      });
      setupMobileTabs();
    } else {
      // Включаем десктопный режим (2 колонки)
      tabControls.style.display = 'none';
      blocks.forEach(b => {
        b.classList.add('active');
        b.style.opacity = '1';
        b.style.pointerEvents = 'all';
        b.style.transform = 'scale(1)';
      });
    }
  }
}



document.addEventListener('DOMContentLoaded', () => {
  init();
  setupSearch();
  setupResponsiveSwitch(); // 🔹 динамическое переключение между режимами
});
