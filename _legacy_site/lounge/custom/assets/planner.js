console.log('planner.js loaded');
/* =========================
   Космический фон (звёзды)
========================= */
(function stars(){
  const cvs = document.getElementById('scene');
  const ctx = cvs.getContext('2d');
  let w,h,stars=[],mouse={x:-9999,y:-9999};
  function status(){
    if (typeof link === 'undefined') return;
    if (!link) return;
    if (link.type === 'ISP') {
      extWrite(`Тип: ISP; подключений: ${link.peers?.length||0}; id: ${link.id}`);
    } else {
      const p = link.peer;
      extWrite(`Тип: EMach; id: ${link.id}`);
      if (p) {
        extWrite(`CIDR: ${p.cidr}; EMach: ${p.emIp}; ВМ: ${p.officeIp}`);
      }
      if (link.ispId) {
        const isp = (state.links || []).find(l => l.id === link.ispId && l.type === 'ISP');
        if (isp) {
          extWrite(`Uplink: ISP "${isp.name || isp.id}"`);
        } else {
          extWrite('Uplink: ISP (ссылка потеряна)', 'err');
        }
      }
    }
  }

  function resize(){
    w=cvs.width=innerWidth; h=cvs.height=innerHeight;
    const count = innerWidth<700? 80 : 150;
    stars = new Array(count).fill(0).map(()=>({
      x: Math.random()*w, y: Math.random()*h,
      r: Math.random()*1.4+0.3, v: Math.random()*0.2+0.05
    }));
  }
  addEventListener('resize', resize);
  addEventListener('mousemove', e=> (mouse={x:e.clientX,y:e.clientY}));
  resize();

  function draw(){
    ctx.clearRect(0,0,w,h);
    // фон
    ctx.fillStyle="rgba(5,2,12,0.9)";
    ctx.fillRect(0,0,w,h);

    // звезды
    for(const s of stars){
      s.y += s.v; if(s.y>h) s.y=0;
      const dx=s.x-mouse.x, dy=s.y-mouse.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      const glow = d<120 ? (1 - d/120) : 0;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + glow*1.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(220,210,255, ${0.6 + glow*0.4})`;
      ctx.shadowColor = `rgba(176,115,255, ${glow})`;
      ctx.shadowBlur = glow*14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* =========================
   Данные и утилиты
========================= */
const STORE_KEY = 'lounge_offices_v1';
const MAX_OFFICES = 8; // максимум допустимых офисов
const VLAN_ROLE_META = {
  'Клиенты':        { icon: 'img/client.png' },
  'Администраторы': { icon: 'img/administrator.png' },
  'Серверы':        { icon: 'img/server.png' },
  'Управление':     { icon: 'img/management.png' }
};



// ================= VLAN GLOBAL ROLES =================
const VLAN_ROLES_KEY = "lounge_vlan_roles";
const DEFAULT_VLAN_ROLES = ["Клиенты", "Серверы", "Администраторы", "Управление"];

function getGlobalVlanRoles() {
  try {
    const saved = JSON.parse(localStorage.getItem(VLAN_ROLES_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  return [...DEFAULT_VLAN_ROLES];
}

function addGlobalVlanRole(name) {
  const role = String(name || "").trim();
  if (!role) return null;

  const list = getGlobalVlanRoles();
  if (!list.includes(role)) {
    list.push(role);
    localStorage.setItem(VLAN_ROLES_KEY, JSON.stringify(list));
  }
  return role;
}

// === alias для совместимости со старым кодом ===
function VLAN_ROLES() {
  return getGlobalVlanRoles();
}


// Служебный апгрейд состояния
function ensureStateUpgrades(s){
  s.links   ||= [];
  s.offices ||= [];

  // апгрейд офисов
  s.offices.forEach(o=>{
    o.vms  ||= [];
    // апгрейд VM: гарантируем наличие type
    o.vms.forEach(vm => {
      if (!vm.type) vm.type = "client"; // дефолт для старых конфигов
      vm.type = String(vm.type).toLowerCase();
    });

    o.vlans ||= [];
    o.vlans.forEach(v=>{
      if (v.priority == null) v.priority = v.vid;
    });
    o.ipam ||= { ranges: [], used: {} };
  });

    // апгрейд линков
  s.links.forEach(l => {

    // NEW: тоннельные ifaces для внешних
    // NEW: дефолтный дистрибутив для старых конфигов
if ((l.type === 'ISP' || l.type === 'EMach') && !l.os) {
  l.os = 'altserver';
}


    if (l.type === 'ISP') {
      l.peers   ||= [];
      l.emPeers ||= [];
    }
    if (l.type === 'EMach') {
      l.emOfficePeers ||= [];
      l.emIspPeer     = l.emIspPeer || null;
      if (l.peer && !l.emOfficePeers.length) {
        l.emOfficePeers.push({
          officeId: l.peer.officeId || null,
          vmId:     l.peer.vmId     || null,
          cidr:     l.peer.cidr     || '',
          policy:   l.peer.policy   || 'firstAfter',
          emIp:     l.peer.emIp     || null,
          vmIp:     l.peer.officeIp || null
        });
      }
    }
  });


  return s;
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}


// === Универсальный фон "цифровые созвездия" для терминала ===
function makeCosmicBackgroundFor(containerEl, canvasId = 'cosmicStars') {
  // безопасный escape на случай старых браузеров
  const esc = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-z0-9_-]/gi,'_');

  // убрать наш предыдущий холст (если был)
  const old = containerEl.querySelector(`#${esc(canvasId)}`);
  if (old) old.remove();

  // холст
  const cvs = document.createElement('canvas');
  cvs.id = canvasId;
  Object.assign(cvs.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '0',
    pointerEvents: 'none'
  });
  // чтобы холст корректно позиционировался
  if (getComputedStyle(containerEl).position === 'static') {
    containerEl.style.position = 'relative';
  }
  containerEl.prepend(cvs);

  const ctx = cvs.getContext('2d');

  // геометрия
  let w = 0, h = 0;
  let prevW = 0, prevH = 0;

  // «частицы»-цифры
  const digits = [];
  const COUNT = 80;
  let seeded = false;

  function seedDigits() {
    digits.length = 0;
    for (let i = 0; i < COUNT; i++) {
      digits.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        n: (Math.floor(Math.random() * 9) + 1)
      });
    }
    seeded = true;
  }

  function resizeTo(W, H) {
    if (!W || !H) return;
    if (W === w && H === h) return;
    prevW = w; prevH = h;
    w = cvs.width  = Math.floor(W);
    h = cvs.height = Math.floor(H);

    if (!seeded) {
      // первая валидная инициализация — раскидываем цифры по всей площади
      seedDigits();
    } else if (prevW && prevH) {
      // аккуратно масштабируем текущие позиции при изменении размеров
      const sx = w / prevW, sy = h / prevH;
      for (const d of digits) { d.x *= sx; d.y *= sy; }
    }
  }

  // первичная инициализация (двойной rAF — дождаться layout)
  requestAnimationFrame(() =>
    requestAnimationFrame(() => resizeTo(containerEl.clientWidth, containerEl.clientHeight))
  );

  // следим за изменениями размера контейнера
  const observer = new ResizeObserver(entries => {
    const r = entries[0].contentRect;
    resizeTo(r.width, r.height);
  });
  observer.observe(containerEl);

  // запасной таймер (если размеры появляются позже)
  let tries = 0;
  const kick = setInterval(() => {
    if (w && h) { clearInterval(kick); return; }
    tries++;
    resizeTo(containerEl.clientWidth, containerEl.clientHeight);
    if (tries > 20) clearInterval(kick);
  }, 50);

  // параметр «пульсации» свечения
  let pulse = 0;

  function draw() {
    if (w && h) {
      ctx.clearRect(0, 0, w, h);

      // соединительные линии (созвездия)
      for (let i = 0; i < digits.length; i++) {
        const a = digits[i];
        for (let j = i + 1; j < digits.length; j++) {
          const b = digits[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 120) {
            const opacity = Math.max(0, 0.12 - d / 900) + pulse * 0.25;
            ctx.strokeStyle = `rgba(190,150,255,${opacity})`;
            ctx.lineWidth = 0.6 + pulse * 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // сами «звёздные цифры»
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const d of digits) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;

        const glow = 0.35 + 0.3 * Math.sin((d.x + d.y) * 0.01) + pulse * 0.45;
        ctx.fillStyle = `rgba(190,160,255,${Math.min(1, glow)})`;
        ctx.shadowColor = 'rgba(190,160,255,0.5)';
        ctx.shadowBlur = 6 + 12 * pulse;
        ctx.fillText(String(d.n), d.x, d.y);
        ctx.shadowBlur = 0;
      }

      pulse *= 0.94;
    }
    requestAnimationFrame(draw);
  }
  draw();

  // внешний API (например, вызывать при командах, чтобы фон «дыхал»)
  return {
    pulse(times = 1) {
      let i = 0;
      const tick = () => {
        pulse = Math.min(1, pulse + 0.9);
        if (++i < times) setTimeout(tick, 130);
      };
      tick();
    }
  };
}





function ensureElement(id, html){
  if (!document.getElementById(id)) {
    document.body.insertAdjacentHTML('beforeend', html);
  }
}


function showResult(ok, text){
  // закрыть любые открытые модалки, если они есть
  ['modalLink','modalISP','modalEM','modalIO'].forEach(id=>{
    const m = document.getElementById(id);
    if (m && m.classList) m.classList.remove('active');
  });

  const res   = document.getElementById('modalResult');
  const iconE = document.getElementById('resultIcon');
  const titleE= document.getElementById('resultTitle');
  const textE = document.getElementById('resultText');

  if (res && iconE && titleE && textE){
    iconE.textContent  = ok ? '✅' : '❌';
    titleE.textContent = ok ? 'Успешно' : 'Ошибка';
    textE.textContent  = text || '';
    res.classList.add('active');
  } else {
    // Фолбэк, если модалки нет — хотя лучше добавить её (п.1)
    alert((ok?'✅ ':'❌ ') + (text || ''));
  }
}


// История логов внешних терминалов (по link.id)
const extTermHistory = {};
let currentExtTermKey = null;

function loadState(){
  try{
    const data = JSON.parse(localStorage.getItem(STORE_KEY)) || { offices: [], freedCovers: [] };
    return ensureStateUpgrades(data);
  }catch{
    return ensureStateUpgrades({ offices: [], freedCovers: [] });
  }
}

function saveState(state){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

function nextCover(state){
  // если есть освобождённые — берём оттуда, иначе по порядку 1..8
  if(state.freedCovers.length) return state.freedCovers.shift();
  const used = new Set(state.offices.map(o=>o.coverIndex));
  for(let i=1;i<=8;i++){ if(!used.has(i)) return i; }
  // если все заняты — берём 1 (переиспользование)
  return 1;
}

function digitsBlock(){
  // немного «плавающих» цифр
  let s='';
  for(let i=0;i<12;i++){
    const col = Math.floor(Math.random()*14)+8;
    s += Array.from({length:col},()=>Math.floor(Math.random()*10)).join('') + '\n';
  }
  return s;
}

// ===== IFACE HELPERS =====
// ===== ISP/EMach candidate iface helpers =====

// какие значения считать "подключением к ISP/Emach" из мастера ВМ
const ISP_EMACH_CANDIDATE_MODES = new Set([
  'isp-emach', 'isp_emach', 'ispemach',
  'external', 'uplink-external', 'isp/emach',
  'ispEmach', 'emach-isp'
]);

function isIspEmachCandidateIface(iface){
  if (!iface) return false;
  const m = String(iface.mode || iface.type || '').trim();
  return ISP_EMACH_CANDIDATE_MODES.has(m);
}

function getVmCandidateIfaces(vm){
  return (vm?.ifaces || []).filter(isIspEmachCandidateIface);
}

function officeHasCandidateVm(office){
  return (office?.vms || []).some(vm => getVmCandidateIfaces(vm).length > 0);
}

function nextIfaceName(vm, base){ // base: 'isp' -> isp0/isp1..., 'tunnel.' -> tunnel.0/tunnel.1...
  vm.ifaces ||= [];
  const re = new RegExp('^' + base.replace('.', '\\.') + '(\\d+)$');
  let max = -1;
  for(const i of vm.ifaces){
    const m = i.name.match(re);
    if (m) max = Math.max(max, parseInt(m[1],10));
  }
  return base + (max+1);
}

function ensureTunnelIface(vm, ip, cidr, linkId){
  vm.ifaces ||= [];
  // имя всегда tunnel.0 по твоему ТЗ
  const ex = vm.ifaces.find(i=> i.name==='tunnel.0' && i.mode==='tunnel');
  const data = { name:'tunnel.0', mode:'tunnel', ip, cidr, linkId };
  if (ex) Object.assign(ex, data); else vm.ifaces.push(data);
}


const vlanStyle = document.createElement('style');
vlanStyle.textContent = `
/* ===== VLAN GRID ===== */
.vlan-tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 14px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 6px;
}

/* ===== TILE ===== */
.vlan-tile {
  position: relative;
  height: 110px;
  border-radius: 14px;
  background: linear-gradient(180deg, #14111f, #0d0b14);
  border: 1px solid rgba(160,120,255,.12);
  cursor: pointer;
  transition: transform .25s ease, box-shadow .25s ease;
  animation: vlanFadeIn .35s ease forwards;
}

/* hover */
.vlan-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(140,100,255,.25);
}

/* ===== ACTIVE (GLOW) ===== */
.vlan-tile.active {
  box-shadow:
    0 0 0 1px rgba(180,130,255,.4),
    0 0 25px rgba(180,130,255,.6),
    inset 0 0 18px rgba(180,130,255,.25);
}

/* ===== ICON BG ===== */
.vlan-tile-bg {
  position: absolute;
  inset: 0;
  opacity: .14;
  background-size: 70%;
  background-repeat: no-repeat;
  background-position: center;
  filter: blur(1px);
}

/* ===== TEXT ===== */
.vlan-tile-top {
  position: relative;
  z-index: 2;
  padding: 12px;
}

.vlan-tile-name {
  font-size: 13px;
  font-weight: 600;
  color: #e9e3ff;
}

.vlan-tile-vid {
  font-size: 11px;
  color: rgba(200,180,255,.7);
}

/* ===== DELETE ===== */
.vlan-tile-del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(0,0,0,.45);
  color: #fff;
  border: none;
  font-size: 14px;
  opacity: 0;
  cursor: pointer;
  transition: opacity .2s ease, background .2s;
}

.vlan-tile:hover .vlan-tile-del {
  opacity: 1;
}

.vlan-tile-del:hover {
  background: #ff4d6d;
}

/* ===== ADD TILE ===== */
.vlan-tile.plus {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  color: rgba(180,150,255,.7);
  border: 1px dashed rgba(180,150,255,.25);
}

/* ===== ANIMATION ===== */
@keyframes vlanFadeIn {
  from { opacity: 0; transform: scale(.92); }
  to   { opacity: 1; transform: scale(1); }
}

/* ===== SCROLL ===== */
.vlan-tile-grid::-webkit-scrollbar {
  width: 6px;
}
.vlan-tile-grid::-webkit-scrollbar-thumb {
  background: rgba(180,130,255,.35);
  border-radius: 6px;
}
`;
document.head.appendChild(vlanStyle);


/* =========================
   Рендер левого списка
========================= */
const elOffices = document.getElementById('offices');
const elDetails = document.getElementById('details');

let state = loadState();
let selectedId = null;

function renderOffices(){
  if(!state.offices.length){
    elOffices.classList.add('empty');
    elOffices.innerHTML = `
      <div class="empty-note">
        <div class="empty-ill"></div>
        <h3>Офисы ещё не созданы</h3>
        <p>Нажмите «Создать офис», чтобы добавить первый.</p>
      </div>`;
    renderDetails(null);
    return;
  }
  elOffices.classList.remove('empty');
  elOffices.innerHTML = '';
  for(const off of state.offices){
    const card = document.createElement('div');
    card.className = 'office-card';
    card.dataset.id = off.id;

    const coverUrl = `../custom/img/office_${off.coverIndex}.png`;
    card.innerHTML = `
      <div class="pic" style="background-image:url('${coverUrl}')"></div>
      <div class="overlay"></div>
      <div class="head">
        <h3 class="title">${escapeHtml(off.name)}</h3>
      </div>
      <p class="sub">${escapeHtml(off.cidr || 'CIDR не задан')}</p>
      <div class="meta">
        <span class="badge ${off.online?'status online':'status offline'}">${off.online?'online':'offline'}</span>
        <span class="badge">VLAN: ${off.vlans.length}</span>
      </div>
    `;


    card.addEventListener('click', () => {
      // Запоминаем выбранный офис
      selectedId = off.id;
      renderDetails(off.id);

      // === Плавная подсветка карточки ===
      const allCards = document.querySelectorAll('.office-card');
      allCards.forEach(c => c.classList.remove('active'));
      void card.offsetWidth; // сброс анимации при повторном выборе
      card.classList.add('active');

      // === Сохраняем выбранный офис ===
      localStorage.setItem('selectedOffice', off.id);

      // === Подсветка правой панели (эффект "сигнала") ===
      const rightPanel = document.querySelector('.right');
      if (rightPanel) {
        rightPanel.classList.add('glow');
        setTimeout(() => rightPanel.classList.remove('glow'), 1000);
      }
    });




    elOffices.appendChild(card);
  }
  const savedId = localStorage.getItem('selectedOffice');
  if (savedId) {
    const activeCard = document.querySelector(`.office-card[data-id="${savedId}"]`);
    if (activeCard) activeCard.classList.add('active');
  }
  // Блокируем "Создать офис", если достигнут лимит
  const btnCreate = document.getElementById('btnCreate');
  if (btnCreate) {
    const atLimit = state.offices.length >= MAX_OFFICES;
    btnCreate.disabled = atLimit;
    btnCreate.title = atLimit ? `Достигнут лимит: ${MAX_OFFICES} офисов` : '';
  }

}

/* =========================
   Правая панель
========================= */
function renderDetails(id){
  // 1) Плейсхолдер
  if (id == null){
    elDetails.className = 'details placeholder';
    elDetails.innerHTML = `
      <div class="hint">
        <h3>Выберите офис слева</h3>
        <p>Здесь появится детальная информация, VLAN и «Входы/Выходы».</p>
      </div>`;
    return;
  }

  // 2) Ищем офис
  const off = state.offices.find(o => o.id === id);
  if (!off){ renderDetails(null); return; }

  const coverUrl = `../custom/img/office_${off.coverIndex}.png`;

  // 3) Разметка правой панели
  elDetails.className = 'details';
  elDetails.innerHTML = `
    <div class="hero">
      <div class="hero-img" style="background-image:url('${coverUrl}')"></div>
      <div class="hero-glow"></div>
    </div>

    <h3 class="title">${escapeHtml(off.name)}</h3>
    <p class="sub">${escapeHtml(off.cidr || 'CIDR не задан')}</p>

    <div class="block">
      <h4>Статус офиса</h4>
      <label class="switch">
        <input id="chkOnline" type="checkbox" ${off.online ? 'checked' : ''}>
        <span class="track"><span class="thumb"></span></span>
        <span class="status-text">${off.online ? 'online' : 'offline'}</span>
      </label>
    </div>

    <div class="block">
  <h4>VLAN</h4>

  <div id="vlanList" class="vlan-list readonly">
  ${[...(off.vlans || [])]
    .sort((a, b) => {
      const pa = a.priority ?? a.vid;
      const pb = b.priority ?? b.vid;
      return pa !== pb ? pa - pb : a.vid - b.vid;
    })
    .map(v => {
      const iconPath = v.isCustom
        ? `img/vlan-icons/${v.icon}`
        : (VLAN_ROLE_META[v.role]?.icon || 'img/client.png');


      return `
        <div class="vlan-mini">
          <div class="vlan-mini-icon" style="background-image:url('${iconPath}')"></div>
          <div class="vlan-mini-text">
            <div class="vlan-name">${escapeHtml(v.name || v.role || 'VLAN')}</div>
            <div class="vlan-vid">VID ${v.vid}</div>
          </div>
        </div>
      `;
    })
    .join('') || '<div class="muted">VLAN не созданы</div>'}
</div>


  <div class="actions-line" style="margin-top:8px">
    <button id="btnEditVlans" class="btn">Редактировать VLAN</button>
  </div>
</div>

<div class="actions-line" style="margin-top:8px">
  <button id="btnEditOffice" class="btn">Переконструировать</button>
  <button id="btnIO" class="btn violet">Входы/Выходы</button>
</div>

<div class="block">
  <h4>Действия</h4>
  <div class="actions-line">
    <button id="btnEnter" class="btn violet">Войти в офис</button>
    <button id="btnDelete" class="btn ghost">Снести офис</button>
  </div>
</div>

  `;

  // 4) Хэндлеры статуса
  const chk = elDetails.querySelector('#chkOnline');
  if (chk){
    chk.addEventListener('change', (e) => {
      off.online = !!e.target.checked;
      saveState(state);
      renderOffices();

      const card = document.querySelector(`.office-card[data-id="${off.id}"]`);
      if (card) card.classList.add('active');

      const rightPanel = document.querySelector('.right');
      if (rightPanel) {
        rightPanel.classList.add('glow');
        setTimeout(() => rightPanel.classList.remove('glow'), 1000);
      }

      const statusText = e.target.closest('.switch')?.querySelector('.status-text');
      if (statusText) statusText.textContent = off.online ? 'online' : 'offline';
    });
  }

  // 5) Переконструировать
  const btnEdit = elDetails.querySelector('#btnEditOffice');
  const btnEditVlans = elDetails.querySelector('#btnEditVlans');
  if (btnEditVlans) {
    btnEditVlans.onclick = () => {
      openVlanEditor(off);
    };
  }

  if (btnEdit) btnEdit.addEventListener('click', () => openOfficeModal('edit', off));

  // 6) Удалить офис
  const btnDel = elDetails.querySelector('#btnDelete');
  if (btnDel) btnDel.addEventListener('click', () => {
    if (!confirm('Снести офис целиком? Это действие необратимо.')) return;
    state.freedCovers.push(off.coverIndex);
    state.offices = state.offices.filter(o => o.id !== off.id);
    selectedId = null;
    saveState(state);
    renderOffices();
    renderDetails(null);
  });

  // 7) Войти в офис
  const btnEnter = elDetails.querySelector('#btnEnter');
  if (btnEnter) btnEnter.addEventListener('click', () => {
    window.location.href = `/lounge/office/?id=${off.id}`;
  });

  // 9) Входы/Выходы
  const btnIO = elDetails.querySelector('#btnIO');
  if (btnIO) btnIO.addEventListener('click', () => {
    if (!hasVM(off)){
      openModal('modalMsg');
      return;
    }

    // гарантируем наличие всех базовых модалок, если есть хелпер
    if (typeof ensurePlannerModals === 'function') ensurePlannerModals();

    openModal('modalIO');

    const ioCards = document.querySelectorAll('#modalIO .io-card');
    ioCards.forEach(card => {
      card.onclick = () => {
        const type = card.dataset.type; // GRE / IPIP / ISP / EMach
        closeModal('modalIO');

        // === GRE/IPIP ===
        if (type === 'GRE' || type === 'IPIP') {
          openTunnelWizard(type);
          return;
        // === ISP ===
        } else if (type === 'ISP'){
          const ispModal = document.getElementById('modalISP');
          const btnISP   = document.getElementById('btnCreateISP');
          const inpName  = document.getElementById('ispName');

          if (!ispModal || !btnISP || !inpName){
            showResult(false, 'Окно добавления ISP недоступно.');
            return;
          }

          openModal('modalISP');
          btnISP.onclick = () => {
  const name = (inpName.value || 'ISP').trim();

  // NEW: читаем дистрибутив
  const distroSel = document.getElementById('ispDistro');
  const distro = distroSel ? distroSel.value : 'ecorouter';

  const link = {
    id:'ISP_'+Date.now(),
    type:'ISP',
    name,
    os: distro, // NEW: сохраняем ОС
    isp: { ifname:'wan0', mode:'isp', dhcp:true, ip:null },
    peers: [],
    emPeers: [],
    cover:{isp:true}
  };
  link.ifaces = []; // LAN-интерфейсы, которые смотрят в офисные подсети

  state.links.push(link);
  saveState(state);
  closeModal('modalISP');
  renderLinks();

  if (typeof openISPBind === 'function') openISPBind(link.id);
  showResult(true, `Провайдер "${name}" добавлен.`);
};


        // === EMach ===
        // === EMach ===
} else if (type === 'EMach'){
  openModal('modalEM');
  const btn = document.getElementById('btnCreateEM');
  const nm  = document.getElementById('emName');
  if (!btn || !nm){
    showResult(false, 'Окно EMach недоступно.');
    return;
  }

  btn.onclick = () => {
  const name = (nm.value || 'EMach').trim();

  // NEW: читаем дистрибутив
  const distroSel = document.getElementById('emDistro');
  const distro = distroSel ? distroSel.value : 'ecorouter';

  const link = {
    id:   'EM_' + Date.now(),
    type: 'EMach',
    name,
    os:   distro,          // NEW
    cover: { em: true },
    emOfficePeers: [],
    emIspPeer: null,
    tunnelIfaces: []
  };

  state.links.push(link);
  saveState(state);
  closeModal('modalEM');
  renderLinks();

  if (typeof openEMBind === 'function') {
    openEMBind(link.id);
  }

  showResult(true, `Внешняя машина "${name}" добавлена.`);
};

}

      };
    });
  });
}


/* =========================
   Создание / редактирование офиса
========================= */
const modalOffice = document.getElementById('modalOffice');
//const vlanRows = document.getElementById('vlanRows');
let editingId = null;

document.getElementById('btnCreate').addEventListener('click', ()=>{
  if (state.offices.length >= MAX_OFFICES) {
    alert(`Нельзя создать больше ${MAX_OFFICES} офисов. Удалите один — и попробуйте снова.`);
    return;
  }
  openOfficeModal('create');
});


document.getElementById('btnImport').addEventListener('click', ()=>{
  const str = prompt('Вставьте JSON конфигурации:');
  if(!str) return;
  try{
    const obj = JSON.parse(str);
    if(!obj || !Array.isArray(obj.offices)) throw 0;
    if (obj.offices.length > MAX_OFFICES) {
      obj.offices = obj.offices.slice(0, MAX_OFFICES);
      alert(`Импортировано только первые ${MAX_OFFICES} офисов (лимит).`);
    }
    state = { offices: obj.offices, freedCovers: obj.freedCovers || [] };
    saveState(state);
    renderOffices();
    alert('Импортировано.');
  }catch{
    alert('Некорректный JSON.');
  }
});

document.getElementById('btnExport').addEventListener('click', ()=>{
  const dump = JSON.stringify({offices:state.offices, freedCovers: state.freedCovers}, null, 2);
  navigator.clipboard?.writeText(dump);
  alert('JSON скопирован в буфер обмена.');
});

document.querySelectorAll('[data-close]').forEach(b=> b.addEventListener('click', ()=>{
  b.closest('.modal').classList.remove('active');
}));

document.getElementById('btnCidrHelp').addEventListener('click', ()=>{
  alert(
`Справка по префиксам (CIDR):
/30 → 2 хоста
/29 → 6 хостов
/28 → 14 хостов
/27 → 30 хостов
/26 → 62 хоста
/25 → 126 хостов
/24 → 254 хоста
Замечания:
- Адрес сети и широковещательный адрес зарезервированы.
- Например, 192.168.10.0/24: маска 255.255.255.0, обратная 0.0.0.255.`);
});

//document.getElementById('btnAddVlan').addEventListener('click', ()=>{
//  addVlanRow();
//});

document.getElementById('btnSaveOffice').addEventListener('click', () => {
  const name = document.getElementById('inpName').value.trim();
  const cidr = document.getElementById('inpCIDR').value.trim();

  if (!name) {
    alert('Введите название офиса');
    return;
  }

  if (editingId) {
    const off = state.offices.find(o => o.id === editingId);
    if (!off) return;

    off.name = name;
    off.cidr = cidr;

    rebuildIpam(off);
  } else {
    if (state.offices.length >= MAX_OFFICES) {
      alert(`Нельзя создать больше ${MAX_OFFICES} офисов.`);
      return;
    }

    const off = {
      id: 'o_' + Date.now(),
      name,
      cidr,
      vlans: [],
      online: true,
      vms: [],
      coverIndex: nextCover(state),
      status: []
    };

    state.offices.push(off);
    rebuildIpam(off);
  }

  saveState(state);
  closeModal('modalOffice');
  renderOffices();
  if (selectedId) renderDetails(selectedId);
});


function openOfficeModal(mode, off){
  editingId = mode === 'edit' ? off.id : null;

  document.getElementById('officeModalTitle').textContent =
    mode === 'edit' ? 'Переконструировать офис' : 'Создать офис';

  document.getElementById('inpName').value =
    mode === 'edit' ? off.name : '';

  document.getElementById('inpCIDR').value =
    mode === 'edit' ? (off.cidr || '') : '';

  openModal('modalOffice');
}



// function addVlanRow(vid='', role='Клиенты'){
//   const row = document.createElement('div');
//   row.className='vlan-row';
//   row.innerHTML = `
//   <input class="vid" type="number" min="1" max="4094" placeholder="VID" value="${escapeAttr(vid)}">

//   <select class="role">
//     ${VLAN_ROLES().map(r=>`<option ${r===role?'selected':''}>${r}</option>`).join('')}
//     <option value="__custom__">+ Своя роль…</option>
//   </select>

//   <input class="priority" type="number" placeholder="prio" value="${vid || 100}" title="Приоритет VLAN">

//   <button class="del">×</button>
// `;
//   const roleSel = row.querySelector('.role');
// const prioInp = row.querySelector('.priority');

// roleSel.addEventListener('change', () => {
//   if (roleSel.value === '__custom__') {
//     const name = prompt('Введите название роли VLAN');
//     if (!name) {
//       roleSel.value = 'Клиенты';
//       return;
//     }
//     const saved = addGlobalVlanRole(name);
//     roleSel.innerHTML = `
//       ${VLAN_ROLES().map(r=>`<option ${r===saved?'selected':''}>${r}</option>`).join('')}
//       <option value="__custom__">+ Своя роль…</option>
//     `;
//     roleSel.value = saved;
//   }
// });


//   row.querySelector('.del').addEventListener('click', ()=> row.remove());
//   vlanRows.appendChild(row);
// }



// function collectVlans(){
//   const arr=[];
//   vlanRows.querySelectorAll('.vlan-row').forEach(r=>{
//     const vid  = +(r.querySelector('.vid').value||0);
//     const role = (r.querySelector('.role').value||'Клиенты').trim();
//     if (Number.isInteger(vid) && vid>=1 && vid<=4094) {
//       const prio = +(r.querySelector('.priority')?.value || vid);

// arr.push({
//   vid,
//   role,
//   priority: Number.isFinite(prio) ? prio : vid
// });

//     }
//   });
//   return arr;
// }




// =========================
//  Модалки (общие) — чистый JS
// =========================
let __lastFocus = null;

function openModal(id){
  const el = document.getElementById(id);
  if(!el) return;

  __lastFocus = document.activeElement;

  // показать модалку
  el.classList.add('active');
  el.setAttribute('aria-hidden', 'false');

  // заблокировать фон (инертим всё, кроме модалок)
  Array.from(document.body.children).forEach(n=>{
    if(!n.classList.contains('modal')) n.setAttribute('inert','');
  });
  // остальные модалки скрываем от assistive tech
  document.querySelectorAll('.modal').forEach(m=>{
    if(m !== el){ m.setAttribute('aria-hidden','true'); }
  });

  // сфокусировать крестик/кнопку «закрыть»
  const closeBtn = el.querySelector('.modal__close') || el.querySelector('[data-close]');
  if (closeBtn) setTimeout(()=> closeBtn.focus(), 0);
}

function closeModal(id){
  const el = document.getElementById(id);
  if(!el) return;

  // если фокус внутри модалки — снять
  const focused = document.activeElement;
  if (focused && el.contains(focused)) {
    focused.blur();
  }

  // спрятать модалку
  el.classList.remove('active');
  el.setAttribute('aria-hidden','true');

  // есть ли ещё открытые модалки?
  const stillOpen = document.querySelector('.modal.active');

  if (!stillOpen) {
    // вернуть фон
    document.querySelectorAll('[inert]').forEach(n=> n.removeAttribute('inert'));
  } else {
    // следующую открытую считаем видимой для assistive tech
    stillOpen.setAttribute('aria-hidden','false');
  }

  // вернуть фокус куда был (если узел ещё в DOM)
  if (__lastFocus && document.body.contains(__lastFocus)) {
    setTimeout(()=> __lastFocus.focus(), 0);
  }
}

// единый обработчик по атрибуту data-close
document.addEventListener('click', (e)=>{
  const btn = e.target && (e.target.closest
    ? e.target.closest('[data-close]')
    : null);
  if (!btn) return;
  const dlg = btn.closest('.modal');
  if (dlg && dlg.id) closeModal(dlg.id);
});




/* =========================
   Экран "Войти в офис"
========================= */
function showOfficeLoader(office) {
  const workspace = document.querySelector('.workspace');
  workspace.style.transition = 'opacity 0.6s ease';
  workspace.style.opacity = '0';

  setTimeout(() => {
    workspace.style.display = 'none';

    const loader = document.createElement('div');
    loader.className = 'office-loader';
    loader.innerHTML = `
      <div class="office-loader-inner">
        <div class="office-loader-image" style="background-image:url('../custom/img/office_${office.coverIndex}.png')"></div>
        <div class="office-loader-info">
          <pre class="office-loader-text">${randomLinuxDoc()}</pre>
        </div>
        <div class="office-loader-progress"></div>
      </div>
    `;
    document.body.appendChild(loader);
    console.log("✅ Loader создан:", loader);

    // Плавная загрузка с прогрессом
    let progress = 0;
    const bar = loader.querySelector('.office-loader-progress');
    const timer = setInterval(() => {
      progress += 2;
      bar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(timer);
        console.log("➡ Переход к экрану офиса");
        showOfficeView(office, loader);
      }
    }, 100);
  }, 500);
}

function randomLinuxDoc() {
  const lines = [
    'sudo systemctl restart networking.service',
    'ip addr show dev eth0',
    'cat /etc/netplan/01-network-manager-all.yaml',
    'journalctl -xe | grep network',
    'systemctl status systemd-resolved',
    'sudo dhclient -v',
    'ping -c 4 1.1.1.1',
    'netstat -tulnp | grep :22',
    'ip route show',
    'nmcli device status',
    'ifconfig eth0 up',
    'brctl show',
    'cat /etc/resolv.conf',
    'traceroute 8.8.8.8',
    'sudo systemctl restart sshd',
    'sudo ufw allow 22/tcp',
    'hostnamectl set-hostname office-node',
    'cat /etc/hosts',
    'sudo apt update && sudo apt upgrade -y',
    'sudo systemctl restart samba-ad-dc.service',
    'ip rule show',
    'ip -6 addr',
    'ip neigh show',
    'cat /proc/net/dev',
    'grep error /var/log/syslog',
    'sudo systemctl daemon-reexec',
    'sudo reboot',
  ];
  // Возвращаем 8 случайных разных строк
  return shuffle(lines).slice(0, 8).join('\n');
}

function shuffle(arr) {
  return arr
    .map(a => ({ sort: Math.random(), value: a }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value);
}

function showOfficeView(office, loader) {
  const view = document.getElementById('officeView');
  if (!view) return; // защита

  // Очистка и отображение
  view.innerHTML = `
    <div class="office-header">
      <h2>${office.name}</h2>
      <p>${office.cidr || 'CIDR не задан'}</p>
    </div>
    <div class="office-actions">
      <button id="btnAddVM" class="btn violet">Поставить машину</button>
      <button id="btnViewMap" class="btn">Просмотреть карту офиса</button>
      <button id="btnExitOffice" class="btn ghost">Выйти из офиса</button>
    </div>
  `;

  view.classList.remove('hidden');
  view.classList.add('active');

  // кнопка выхода
  const btnExit = view.querySelector('#btnExitOffice');
  btnExit.addEventListener('click', () => {
    view.classList.add('fade-out');
    setTimeout(() => {
      view.classList.remove('active', 'fade-out');
      view.classList.add('hidden');
      document.querySelector('.workspace').classList.remove('hidden');
    }, 600);
  });
  view.innerHTML += `
  <div class="block" style="margin-top:14px">
    <h4>VLAN → VM</h4>
    <div id="vmVlanPanel"></div>
  </div>
`;
renderVmVlanPanel(office);

}



/* =========================
   Хелперы
========================= */
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s=''){ return escapeHtml(String(s)); }
function hasVM(office){
  return Array.isArray(office.vms) && office.vms.length > 0;
}
function renderVmVlanPanel(office){
  const host = document.getElementById('vmVlanPanel');
  if (!host) return;

  const vlans = (office.vlans || []).filter(v => v.vid);
  const vms = (office.vms || []);

  if (!vlans.length){
    host.innerHTML = `<div class="muted">Сначала создайте VLAN (в правой панели офиса).</div>`;
    return;
  }
  if (!vms.length){
    host.innerHTML = `<div class="muted">Нет ВМ. Сначала поставьте машину.</div>`;
    return;
  }

  host.innerHTML = '';
  vms.forEach(vm => {
    const row = document.createElement('div');
    row.className = 'vm-vlan-row';
    row.innerHTML = `
      <div class="vm-vlan-title"><b>${escapeHtml(vmDisplayName(vm))}</b></div>

      <div class="vm-vlan-actions">
        <select class="vm-vlan-select">
          ${vlans.map(v => `<option value="${v.vid}">${escapeHtml(v.name || v.role)} (VID ${v.vid})</option>`).join('')}
        </select>
        <button class="btn mini violet vm-vlan-add">Назначить</button>
      </div>

      <div class="vm-vlan-ifaces"></div>
    `;

    const sel = row.querySelector('.vm-vlan-select');
    const btn = row.querySelector('.vm-vlan-add');
    const ifBox = row.querySelector('.vm-vlan-ifaces');

    function renderIfaces(){
      const ifaces = (vm.ifaces || []).filter(i => i.mode === 'vlan' && i.vid);
      if (!ifaces.length){
        ifBox.innerHTML = `<div class="muted small">VLAN-интерфейсов нет.</div>`;
        return;
      }
      ifBox.innerHTML = ifaces.map(i => `
        <div class="vm-vlan-iface">
          <span class="badge">VID ${i.vid}</span>
          <span class="badge">${escapeHtml(i.name || '')}</span>
          <span class="badge">${i.ip ? i.ip : '-'}</span>
          <span class="badge">GW ${i.gw ? i.gw : '-'}</span>
          <button class="btn mini ghost" data-del="${i.vid}">×</button>
        </div>
      `).join('');

      ifBox.querySelectorAll('[data-del]').forEach(b => {
        b.onclick = () => {
          const vid = b.getAttribute('data-del');
          removeVlanFromVm(office, vm.id, vid);
          renderIfaces();
        };
      });
    }

    btn.onclick = () => {
      try{
        const vid = Number(sel.value);
        applyVlanToVm(office, vm.id, vid);
        renderIfaces();
        renderDetails(office.id); // чтобы VLAN-блок/статусы обновились, если надо
      } catch(e){
        showResult(false, e.message || 'Не удалось назначить VLAN.');
      }
    };

    renderIfaces();
    host.appendChild(row);
  });
}

function ensureVlanIface(vm, vid){
  vm.ifaces ||= [];
  const name = `vlan.${vid}`;

  let nic = vm.ifaces.find(i =>
    (i.mode === 'vlan' && String(i.vid) === String(vid)) ||
    (i.name === name)
  );

  if (!nic){
    nic = { name, mode:'vlan', vid: Number(vid), ip:null, cidr:null, gw:null };
    vm.ifaces.push(nic);
  }

  nic.name = name;
  nic.mode = 'vlan';
  nic.vid  = Number(vid);
  return nic;
}

function applyVlanToVm(office, vmId, vid){
  const vm = (office.vms || []).find(v => String(v.id) === String(vmId));
  if (!vm) throw new Error('VM не найдена');

  const vlan = (office.vlans || []).find(v => String(v.vid) === String(vid));
  if (!vlan) throw new Error('VLAN не найдена');

  rebuildIpam(office);

  const range = getVlanRange(office, vid);
  if (!range) throw new Error('IPAM для VLAN не найден');

  const ip = allocIP(office, vid);
  if (!ip) throw new Error('IP адреса в VLAN закончились');

  const nic = ensureVlanIface(vm, vid);
  nic.ip   = ip;
  nic.cidr = range.cidr;
  nic.gw   = intToIp(range.gw);

  saveState(state);
  return nic;
}


function removeVlanFromVm(office, vmId, vid){
  const vm = (office.vms || []).find(v => String(v.id) === String(vmId));
  if (!vm) return;

  vm.ifaces = (vm.ifaces || []).filter(i => !(i.mode === 'vlan' && String(i.vid) === String(vid)));
  saveState(state);
}

function enableVlanDnD(container, office){
  let dragEl = null;

  [...container.children].forEach(row => {

    row.ondragstart = () => {
      dragEl = row;
      row.classList.add('dragging');
    };

    row.ondragend = () => {
      row.classList.remove('dragging');
      dragEl = null;
    };

    row.ondragover = e => {
      e.preventDefault();
      row.classList.add('dragover');
    };

    row.ondragleave = () => row.classList.remove('dragover');

    row.ondrop = e => {
      e.preventDefault();
      row.classList.remove('dragover');
      if (!dragEl || dragEl === row) return;

      const from = Number(dragEl.dataset.index);
      const to   = Number(row.dataset.index);

      const [moved] = office.vlans.splice(from, 1);
      office.vlans.splice(to, 0, moved);

      openVlanEditor(office);
    };
  });
}



// Хелпер для красивого имени ВМ
function vmDisplayName(vm){
  if (!vm) return '';

  // 1) Нормальное имя от пользователя
  if (vm.name && vm.name.trim()) {
    return vm.name.trim();
  }

  // 2) Если когда-то будет hostname / label — тоже поддержим
  if (vm.hostname && vm.hostname.trim()) {
    return vm.hostname.trim();
  }

  // 3) Фолбэк: если id просто число — делаем "VM#<id>",
  //    чтобы не было голых цифр в списке
  const idStr = String(vm.id ?? '').trim();

  if (/^\d+$/.test(idStr)) {
    return 'VM#' + idStr;
  }

  // 4) Если id строковый вроде "vm_123" — можно его показать
  return idStr || 'VM';
}



function fillVmSelect(selectEl, officeId, peer, opts = {}) {
  selectEl.innerHTML = '';

  const off = state.offices.find(o => o.id === officeId);
  let vms = off?.vms || [];

  // NEW: фильтрация только под ISP/EMach кандидатов
  if (opts.onlyIspEmachCandidates) {
    vms = vms.filter(vm => getVmCandidateIfaces(vm).length > 0);
  }

  if (!vms.length) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.selected = true;
    opt.value = '';
    opt.textContent = opts.onlyIspEmachCandidates
      ? 'Нет ВМ с интерфейсом ISP/Emach'
      : 'Нет ВМ';
    selectEl.appendChild(opt);
    if (peer) peer.vmId = null;
    return;
  }

  vms.forEach(vm => {
    const opt = document.createElement('option');
    opt.value = vm.id;
    opt.textContent = vmDisplayName(vm);
    if (peer && String(peer.vmId || '') === String(vm.id)) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });

  // если vmId ещё не задан — по дефолту берём первую
  if (peer && !peer.vmId && vms[0]) {
    peer.vmId = vms[0].id;
    selectEl.value = peer.vmId;
  }
}





// ADD: IPv4 utils
function ipToInt(ip){ return ip.split('.').reduce((a,p)=> (a<<8) + (+p), 0)>>>0; }
function intToIp(int){ return [24,16,8,0].map(s=> (int>>>s)&255 ).join('.'); }
function cidrInfo(cidr){
  // "A.B.C.D/nn" → {net, first, last, mask, total, usable}
  const [ip, bitsStr] = cidr.trim().split('/');
  const bits = +bitsStr;
  if(!ip || isNaN(bits) || bits<0 || bits>32) throw new Error('CIDR');
  const base = ipToInt(ip);
  const mask = bits===0 ? 0 : (~0 << (32-bits))>>>0;
  const net  = base & mask;
  const bcast= net | (~mask>>>0);
  const first= bits>=31 ? net : (net+1)>>>0;
  const last = bits>=31 ? bcast : (bcast-1)>>>0;
  const total= (bcast - net + 1)>>>0;
  const usable = bits>=31 ? 0 : (last - first + 1)>>>0;
  return { net, first, last, mask, total, usable };
}
function nextPow2(n){
  return 1 << Math.ceil(Math.log2(n));
}

function maskFromSize(size){
  return 32 - Math.log2(size);
}

function alignToBoundary(ipInt, size){
  return ipInt & (~(size - 1));
}

function cidrOverlap(ci1, ci2){
  // ci.* взяты из cidrInfo
  const net1 = ci1.net;
  const bc1  = (ci1.net | (~ci1.mask >>> 0)) >>> 0;
  const net2 = ci2.net;
  const bc2  = (ci2.net | (~ci2.mask >>> 0)) >>> 0;

  // Пересечение есть, если диапазоны не лежат строго "до" или "после" друг друга
  return !(bc1 < net2 || bc2 < net1);
}


// === Удаление интерфейсов, созданных линком (ISP/EMach) ===
function removeLinkIfaces(link) {
  if (!link) return;

  // --------------------------------------------------------------------
  // 1) Удаляем интерфейсы ВМ, созданные ЭТИМ линком
  // --------------------------------------------------------------------
  for (const off of state.offices || []) {
    for (const vm of off.vms || []) {
      if (!Array.isArray(vm.ifaces)) continue;

      vm.ifaces = vm.ifaces.filter(i => i.linkId !== link.id);
    }
  }

  // ====================================================================
  // 2) Если это ISP — Удаляем все связи с офисами и EMach
  // ====================================================================
  if (link.type === 'ISP') {

    // --- офисные peers ---
    if (Array.isArray(link.peers)) {
      link.peers.forEach(p => {
        delete p.vmId;
        delete p.officeIp;
        delete p.ispIp;
        delete p.iface;
      });
    }

    // --- связи с Emach ---
    if (Array.isArray(link.emPeers)) {
      link.emPeers.forEach(ep => {
        const em = state.links.find(l => l.id === ep.emId && l.type === 'EMach');
        if (em && em.ispPeer && em.ispPeer.ispId === link.id) {
          delete em.ispPeer;  // снять связь на стороне EMach
        }
      });

      link.emPeers = []; // очистить список
    }

    return;
  }

  // ====================================================================
  // 3) Если это EMach — убрать:
  //     - связи EMach ↔ офисы
  //     - связь EMach ↔ ISP
  // ====================================================================
  if (link.type === 'EMach') {

    // ---- удалить связи с офисами ----
    if (Array.isArray(link.officePeers)) {
      // officePeers = [{officeId, vmId, cidr, emIp, officeIp}, ...]
      link.officePeers.forEach(p => {
        const off = state.offices.find(o => o.id === p.officeId);
        if (!off) return;

        const vm = (off.vms || []).find(v => String(v.id) === String(p.vmId));
        if (!vm || !Array.isArray(vm.ifaces)) return;

        vm.ifaces = vm.ifaces.filter(i => i.linkId !== link.id);
      });
    }

    // ---- снять связь EMach ↔ ISP ----
    if (link.ispPeer) {
      const isp = state.links.find(l => l.id === link.ispPeer.ispId && l.type === 'ISP');
      if (isp && Array.isArray(isp.emPeers)) {
        isp.emPeers = isp.emPeers.filter(ep => ep.emId !== link.id);
      }
    }

    delete link.ispPeer;
    delete link.officePeers;

    return;
  }
}


function ensurePlannerModals(){
  // Результат операции
  ensureElement('modalResult', `
    <div id="modalResult" class="modal" aria-hidden="true">
      <div class="modal__dialog">
        <button class="modal__close" data-close>&times;</button>
        <h2 class="modal__title">
          <span id="resultIcon"></span>
          <span id="resultTitle"></span>
        </h2>
        <p id="resultText" class="muted"></p>
        <div class="modal__footer">
          <button class="btn violet" data-close>Ок</button>
        </div>
      </div>
    </div>
  `);
    // EMach bind modal (многократные офисы + ISP)
ensureElement('modalEMBind', `
  <div id="modalEMBind" class="modal" aria-hidden="true">
    <div class="modal__dialog wide">
      <button class="modal__close" data-close>&times;</button>
      <h2 class="modal__title">Привязка EMach</h2>

      <div class="form em-bind-grid">
        <!-- Левая колонка: тумблеры -->
        <aside class="em-bind-sidebar">
          <label class="switch em-switch">
            <input type="checkbox" id="emBindOffice">
            <span class="track"><span class="thumb"></span></span>
            <span class="label">Подключать к офисам</span>
          </label>

          <label class="switch em-switch">
            <input type="checkbox" id="emBindISP">
            <span class="track"><span class="thumb"></span></span>
            <span class="label">Подключать к ISP</span>
          </label>
        </aside>

        <!-- Правая часть: блоки настроек -->
        <section class="em-bind-main">
          <!-- Блок подключений к офисам -->
          <div id="emOfficeBlock" class="em-block">
            <h4>Подключения к офисам</h4>
            <div id="emOfficeList" class="vlan-list"></div>
            <button id="btnAddEmOffice" class="btn small" type="button">
              + Добавить офис
            </button>
          </div>

          <!-- Блок подключения к ISP -->
          <div id="emIspBlock" class="em-block">
            <h4>Подключение к ISP</h4>
            <div class="isp-peer-row em-peer-row">
              <select id="emIsp"></select>
              <input id="emIspCIDR" type="text" placeholder="например 172.16.250.0/30">
              <select id="emIspPolicy">
                <option value="firstAfter">Адрес после EMach</option>
                <option value="random">Случайный usable</option>
                <option value="last">Последний usable</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      <div class="modal__footer">
        <button id="btnSaveEmBind" class="btn violet">Сохранить</button>
        <button class="btn ghost" data-close>Отмена</button>
      </div>
    </div>
  </div>
`);



  // GRE/IPIP модалка (если вдруг отсутствует)
  ensureElement('modalLink', `
    <div id="modalLink" class="modal" aria-hidden="true">
      <div class="modal__dialog">
        <button class="modal__close" data-close>&times;</button>
        <h2 class="modal__title" id="modalLinkTitle">Создать туннель</h2>
        <div class="form">
          <label class="field">
            <span>Тип</span>
            <input id="linkType" type="text" disabled>
          </label>
          <label class="field">
            <span>Выберите офис-партнёр</span>
            <select id="linkPeer"></select>
          </label>
          <label class="field">
            <span>Подсеть туннеля (CIDR, например 172.16.100.0/30)</span>
            <input id="linkCIDR" type="text" placeholder="172.16.100.0/30">
          </label>
          <div class="modal__footer">
            <button id="btnCreateLink" class="btn violet">Создать</button>
            <button class="btn ghost" data-close>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  `);

  // ISP модалка (создание)
  ensureElement('modalISP', `
  <div id="modalISP" class="modal" aria-hidden="true">
    <div class="modal__dialog">
      <button class="modal__close" data-close>&times;</button>
      <h2 class="modal__title">Добавить провайдера (ISP)</h2>
      <div class="form">

        <label class="field">
          <span>Название (опционально)</span>
          <input id="ispName" type="text" placeholder="Напр. ISP-1">
        </label>

        <!-- NEW: выбор дистрибутива -->
        <label class="field">
          <span>Дистрибутив</span>
          <select id="ispDistro">
            <option value="ecorouter">EcoRouter</option>
            <option value="altserver">ALT Server</option>
            <option value="debian">Debian</option>
          </select>
        </label>

        <div class="modal__footer">
          <button id="btnCreateISP" class="btn violet">Добавить</button>
          <button class="btn ghost" data-close>Отмена</button>
        </div>
      </div>
    </div>
  </div>
`);

  ensureElement('modalTunnelWizard', `
  <div id="modalTunnelWizard" class="modal" aria-hidden="true">
    <div class="modal__dialog wide tunnel-modal">
      <button class="modal__close" data-close>&times;</button>
      <h2 class="modal__title" id="tunnelWizardTitle">Создать GRE-туннель</h2>

      <div class="tunnel-layout">

        <!-- Левая колонка: список всех узлов -->
        <section class="tunnel-sources">
          <h4>Узлы</h4>
          <p class="muted small">Перетащите офис или внешнюю машину в слот A/B.</p>
          <div id="tunnelSources" class="tunnel-sources-list"></div>
        </section>

        <!-- Правая колонка: слоты + параметры -->
        <section class="tunnel-targets">
          <div class="tunnel-slots-row">
            <div class="tunnel-slot" data-side="a">
              <div class="slot-label">Сторона A</div>
              <div class="slot-body" id="tunnelSlotA">
                <div class="slot-placeholder">Перетащите узел сюда</div>
              </div>
            </div>

            <div class="tunnel-arrow">
              <!-- можно вставить твою SVG-стрелку -->
              <svg viewBox="0 0 512 512" class="tunnel-arrow-icon" aria-hidden="true">
                <path
                  d="m505.661 271.254-113.935-85.828a15.914 15.914 0 0 0-25.492 12.709v45.343H133.241a6.735 6.735 0 0 0-.773.039A12.514 12.514 0 0 0 120.717 256v39.549L31.1 228.039l89.621-67.512V200.4a12.515 12.515 0 0 0 11.751 12.486 6.972 6.972 0 0 0 .773.039h177.1a12.525 12.525 0 1 0 0-25.049H145.766v-45.667a15.915 15.915 0 0 0-25.49-12.712L6.339 215.328a15.915 15.915 0 0 0 0 25.423l113.935 85.828c9.936 8.019 25.92.016 25.492-12.71v-45.342h232.993a9.753 9.753 0 0 0 1.014-.052A12.517 12.517 0 0 0 391.283 256v-39.547l89.617 67.512-89.621 67.513V311.6a12.516 12.516 0 0 0-11.605-12.478 8.785 8.785 0 0 0-.919-.046h-177.1a12.524 12.524 0 1 0 0 25.048h164.579V369.8c-.428 12.727 15.555 20.725 25.49 12.711l113.937-85.831a15.914 15.914 0 0 0 0-25.422z"
                  fill="#D6CDFF"
                  stroke="#4E3CCF"
                  stroke-width="10"
                />
              </svg>
            </div>

            <div class="tunnel-slot" data-side="b">
              <div class="slot-label">Сторона B</div>
              <div class="slot-body" id="tunnelSlotB">
                <div class="slot-placeholder">Перетащите узел сюда</div>
              </div>
            </div>
          </div>

          <div class="tunnel-params">
            <label class="field">
              <span>Подсеть туннеля (CIDR)</span>
              <input id="tunnelCIDR" type="text" placeholder="например 172.16.100.0/30">
            </label>
            <p class="muted small">
              Рекомендуется /30 для point-to-point. Адреса сети и broadcast будут зарезервированы.
            </p>
          </div>
        </section>
      </div>

      <div class="modal__footer">
        <button id="btnCreateTunnel" class="btn violet">Создать туннель</button>
        <button class="btn ghost" data-close>Отмена</button>
      </div>
    </div>
  </div>
`);
ensureElement('modalVlanEditor', `
<div id="modalVlanEditor" class="modal" aria-hidden="true">
  <div class="modal__dialog wide vlan-editor-dialog">

    <button class="modal__close" data-close>&times;</button>
    <h2 class="modal__title">Редактор VLAN</h2>

    <div class="vlan-editor-layout">

      <!-- ЛЕВАЯ ЧАСТЬ: ПЛИТКИ VLAN -->
      <div class="vlan-editor-left">
        <div id="vlanTileGrid" class="vlan-tile-grid">

          <!-- Плитки VLAN будут добавляться JS -->

          <!-- Плитка "+" -->
          <div id="vlanTileAdd" class="vlan-tile add">
            <span class="plus">+</span>
          </div>

        </div>
      </div>

      <!-- ПРАВАЯ ЧАСТЬ: РЕДАКТОР -->
      <div class="vlan-editor-right">

        <!-- ПУСТОЕ СОСТОЯНИЕ -->
        <div id="vlanEditEmpty" class="vlan-edit-empty">
          <p>Добавьте VLAN или выберите существующий</p>
        </div>

        <!-- ПАНЕЛЬ РЕДАКТИРОВАНИЯ VLAN -->
        <div id="vlanEditPane" class="vlan-edit-pane" style="display:none">

          <!-- НАЗВАНИЕ VLAN -->
          <label class="vlan-label">Название VLAN</label>

          <div class="vlan-name-row">
            <select id="vlanNameSelect" class="vlan-select">
              <option value="Клиенты">Клиенты</option>
              <option value="Администраторы">Администраторы</option>
              <option value="Серверы">Серверы</option>
              <option value="Управление">Управление</option>
            </select>

            <button id="btnVlanNameAdd" class="cube-btn">+</button>
            <button id="btnVlanNameRemove" class="cube-btn danger" style="display:none">×</button>
          </div>

          <!-- КАСТОМНОЕ ИМЯ -->
          <div id="vlanCustomNameBox" class="vlan-custom-name" style="display:none">
            <input
              id="vlanCustomNameInput"
              type="text"
              placeholder="Введите кастомное имя VLAN"
            >
          </div>

          <!-- VID + ИКОНКА -->
          <div class="vlan-row">
            <input
              id="vlanVidInput"
              type="number"
              min="1"
              max="4094"
              placeholder="VID"
            >

            <button id="btnVlanIcon" class="btn">
              Иконка
            </button>
          </div>

          <!-- ПРИОРИТЕТ -->
          <button
            id="btnVlanPriority"
            class="btn gray"
            disabled
          >
            Приоритет
          </button>

        </div>
      </div>
    </div>

    <!-- ФУТЕР -->
    <div class="modal__footer">
      <button id="btnSaveVlanEditor" class="btn violet">
        Сохранить
      </button>
      <button class="btn ghost" data-close>
        Отмена
      </button>
    </div>

  </div>
</div>

`);


ensureElement('modalVlanPriority', `
  <div id="modalVlanPriority" class="modal" aria-hidden="true">
    <div class="modal__dialog wide vlan-prio-modal">
      <button class="modal__close" data-close>&times;</button>
      <h2 class="modal__title">Приоритет VLAN</h2>

      <div class="vlan-prio-layout">
        <div class="vlan-prio-list" id="vlanPriorityList"></div>

        <div class="vlan-prio-hint">
          <div class="vlan-prio-hint__bar"></div>
          <div class="vlan-prio-hint__text">
            <div class="t">Выше — важнее</div>
            <div class="s">Перетащите VLAN, чтобы задать порядок</div>
          </div>
        </div>
      </div>

      <div class="modal__footer">
        <button id="btnSaveVlanPriority" class="btn violet">Сохранить</button>
        <button class="btn ghost" data-close>Отмена</button>
      </div>
    </div>
  </div>
`);
ensureElement('modalVlanIconPicker', `
  <div id="modalVlanIconPicker" class="modal" aria-hidden="true">
    <div class="modal__dialog wide">
      <button class="modal__close" data-close>&times;</button>
      <h2 class="modal__title">Иконка VLAN</h2>

      <div class="icon-picker">
        <div class="icon-grid" id="vlanIconGrid"></div>
        <div class="icon-preview">
          <div class="icon-preview__box" id="vlanIconPreview"></div>
          <div class="icon-preview__name" id="vlanIconName">—</div>
        </div>
      </div>

      <div class="modal__footer">
        <button id="btnSaveVlanIcon" class="btn violet">Сохранить</button>
        <button class="btn ghost" data-close>Отмена</button>
      </div>
    </div>
  </div>
`);



    // Всегда держим модалку результата последней в body,
  // чтобы она была поверх остальных окон
  const resModal = document.getElementById('modalResult');
  if (resModal && resModal.parentNode === document.body) {
    document.body.appendChild(resModal);
  }
}

// === Дополнительные утилиты для туннелей и ISP ===
const UPLINK_MODES = new Set(['isp-peer','emach-peer']);
const IFACE_NAME_ISP = 'isp0';
const IFACE_NAME_EM  = 'em0';

// интерфейсы-кандидаты: сначала uplink (к ISP/EMach), затем прочие
function getEligibleIfaces(office, showAll=false){
  const out = [];
  (office?.vms||[]).forEach(vm=>{
    (vm.ifaces||[]).forEach(ifc=>{
      const ok = showAll || UPLINK_MODES.has(ifc.mode);
      if(ok){
        out.push({
          vmId: vm.id,
          vmName: vm.name,
          ifaceName: ifc.name,
          mode: ifc.mode||''
        });
      }
    });
  });
  return out;
}

// дефолтная маленькая подсеть для point-to-point
function suggestSmallCIDR(seed='172.16.200.0/30'){
  return seed; // можно будет сделать авто-подбор, пока достаточно фиксированного
}

// выбор IP офиса внутри /30 с политиками
function pickOfficeIP(ci, policy, reservedIp){
  const first = intToIp(ci.first); // первый usable
  const last  = intToIp(ci.last);  // последний usable

  // если всего один usable — другого варианта нет
  if (ci.first === ci.last) return first;

  // helper: случайный usable, кроме reservedIp
  function randomUsable(){
    const min = ci.first;
    const max = ci.last;
    let ipInt, ipStr;
    let guard = 0;
    do {
      ipInt = Math.floor(Math.random() * (max - min + 1)) + min;
      ipStr = intToIp(ipInt);
      guard++;
    } while (ipStr === reservedIp && guard < 20);
    return ipStr;
  }

  if (policy === 'firstAfter') {
    // «адрес после EMach/ISP» – если первый занят reservedIp, берём последний, иначе первый
    return (reservedIp === first) ? last : first;
  }

  if (policy === 'last') {
    // всегда последний usable (если он не совпадает с reservedIp — ок; если совпадает, вернём первый)
    return (reservedIp === last) ? first : last;
  }

  // random
  return randomUsable();
}





// ADD: строим диапазоны под VLAN с учётом приоритета ролей
function rebuildIpam(office){
  if (!office.cidr) {
    office.ipam = { ranges: [], used: {} };
    return;
  }

  const info = cidrInfo(office.cidr);
  let cursor = info.first;

  const vlans = [...(office.vlans || [])].sort((a,b)=>{
    const pa = a.priority ?? a.vid;
    const pb = b.priority ?? b.vid;
    return pa - pb;
  });

  if (!vlans.length) {
    office.ipam = { ranges: [], used: {} };
    return;
  }

  const ranges = [];
  const used = {};

  const totalUsable = info.usable;
  const avgPerVlan = Math.max(4, Math.floor(totalUsable / vlans.length));
  // минимум /30 = 4 адреса (net + gw + host + bcast)

  for (const v of vlans){
    // округляем до степени двойки
    const size = nextPow2(avgPerVlan);
    const mask = maskFromSize(size);

    // выравниваем подсеть
    const net = alignToBoundary(cursor, size);
    const last = net + size - 1;

    if (last > info.last) break;

    const gw = net + 1;
    const firstHost = net + 2;
    const lastHost = last - 1;

    ranges.push({
      vid: v.vid,
      role: v.role,
      cidr: `${intToIp(net)}/${mask}`,
      net,
      gw,
      first: firstHost,
      last: lastHost,
      next: firstHost
    });

    used[v.vid] = { next: firstHost };
    cursor = last + 1;
  }

  office.ipam = { ranges, used };
}


function getVlanRange(office, vid){
  return office.ipam?.ranges?.find(r => String(r.vid) === String(vid)) || null;
}

function vlanGateway(office, vid){
  const r = getVlanRange(office, vid);
  return r ? intToIp(r.gw) : null;
}

function vlanCidr(office, vid){
  const r = getVlanRange(office, vid);
  return r ? r.cidr : null;
}

// выдать следующий IP из пула VLAN (или null, если кончились)
function allocIP(office, vid){
  const r = getVlanRange(office, vid);
  if (!r) return null;

  if (r.next > r.last) return null;

  const ip = r.next;
  r.next = (r.next + 1) >>> 0;
  office.ipam.used[vid] = { next: r.next };

  return intToIp(ip);
}


// есть ли хоть одна ВМ с хотя бы одним интерфейсом
function hasVMAndIfaces(office){
  return Array.isArray(office.vms) && office.vms.some(vm => Array.isArray(vm.ifaces) && vm.ifaces.length>0);
}

// ADD: рендер связей
function renderLinks() {
  const box = document.getElementById('linksList');
  if (!box) return;

  box.innerHTML = '';
  const list = state.links || [];

  // если связей нет
  if (!list.length) {
    box.classList.add('empty');
    box.innerHTML = `<div class="empty-note small"><p>Пока нет внешних связей.</p></div>`;
    return;
  }
  box.classList.remove('empty');

  for (const l of list) {

    const card = document.createElement('div');
    card.className = 'link-card ' + (
      l.type === 'GRE'  ? 'gre'  :
      l.type === 'IPIP' ? 'ipip' :
      l.type === 'ISP'  ? 'isp'  : 'em'
    );

    // ---------------------------------------------------------
    //                   COVER IMAGE
    // ---------------------------------------------------------
    let coverCss = '';
    if (l.type === 'GRE' || l.type === 'IPIP') {
      const a = l.cover?.a || 1, b = l.cover?.b || 2;
      coverCss = `background-image: url('../custom/img/office_${a}.png'), url('../custom/img/office_${b}.png');`;
    } else if (l.type === 'ISP') {
      coverCss = `background-image: url('../custom/img/isp.png');`;
    } else {
      coverCss = `background-image: url('../custom/img/Emach.png');`;
    }

    // ---------------------------------------------------------
    //                   META TEXT (CIDR)
    // ---------------------------------------------------------
    let metaHtml = '';

    if (l.type === 'GRE' || l.type === 'IPIP') {
      metaHtml = `Подсеть туннеля: <b>${l.cidr}</b>`;
    }

    else if (l.type === 'ISP') {
      const allCidrs = [
        ...(l.peers   || []).map(p => p.cidr).filter(Boolean),
        ...(l.emPeers || []).map(p => p.cidr).filter(Boolean)
      ];

      let finalCidr;
      if (!allCidrs.length) finalCidr = '—';
      else if (allCidrs.length === 1) finalCidr = allCidrs[0];
      else finalCidr = 'несколько подсетей';

      metaHtml = `CIDR: <b>${finalCidr}</b>`;
    }

    else if (l.type === 'EMach') {
      const officePeers = l.officePeers || [];
      const ispPeer     = l.ispPeer || null;

      let cidrs = [];

      officePeers.forEach(p => { if (p.cidr) cidrs.push(p.cidr); });
      if (ispPeer && ispPeer.cidr) cidrs.push(ispPeer.cidr);

      if (!cidrs.length) metaHtml = `CIDR: <b>-</b>`;
      else if (cidrs.length === 1) metaHtml = `CIDR: <b>${cidrs[0]}</b>`;
      else metaHtml = `CIDR: <b>несколько подсетей</b>`;
    }

    else metaHtml = `Узел: <b>${l.name}</b>`;
    if (l.os) {
      metaHtml += `<br>OS: <b>${l.os}</b>`;
    }



    // ---------------------------------------------------------
    //                   BADGES
    // ---------------------------------------------------------
    let badgesHtml = `
      <span class="badge">${l.type}</span>
    `;

    // GRE/IPIP badges
    if (l.a?.ip) badgesHtml += `<span class="badge">A: ${l.a.ip}</span>`;
    if (l.b?.ip) badgesHtml += `<span class="badge">B: ${l.b.ip}</span>`;

    // EMach → офисные связи
    if (l.type === 'EMach' && Array.isArray(l.officePeers)) {
      l.officePeers.forEach(p => {
        if (p.emIp)     badgesHtml += `<span class="badge">EM: ${p.emIp}</span>`;
        if (p.officeIp) badgesHtml += `<span class="badge">VM: ${p.officeIp}</span>`;
      });
    }

    // EMach → ISP
    if (l.type === 'EMach' && l.ispPeer) {
      badgesHtml += `<span class="badge">ISP: ${l.ispPeer.ispIp || l.ispPeer.emIp}</span>`;
    }

    // ISP → EMach
    if (l.type === 'ISP' && Array.isArray(l.emPeers)) {
      l.emPeers.forEach(ep => {
        if (ep.emIp)
          badgesHtml += `<span class="badge">EMach: ${ep.emIp}</span>`;
      });
    }


    // ---------------------------------------------------------
    //                   CARD HTML
    // ---------------------------------------------------------
    card.innerHTML = `
      <div class="cover" style="${coverCss}"></div>
      <div class="link-content">
        <h4>${l.name || l.type}</h4>
        <div class="meta">${metaHtml}</div>
        <div class="badges">${badgesHtml}</div>
      </div>
    `;


    // ---------------------------------------------------------
    //                   CLICK = open terminal
    // ---------------------------------------------------------
    card.onclick = () => {
      if (l.type === 'ISP' || l.type === 'EMach') {
        openExternalTerminal(l.id);
      } else {
        window.location.href = `/lounge/link/?id=${l.id}`;
      }
    };

    // ---------------------------------------------------------
    //          RIGHT CLICK = DELETE LINK + CLEAN IFACES
    // ---------------------------------------------------------
    card.oncontextmenu = (e) => {
      e.preventDefault();
      const name = l.name || l.type;

      const q = prompt(`Точно хотите уничтожить внешнюю машину ${name}?\nЧтобы подтвердить, введите: confirm`);
      if (!q) return;
      if (q.trim().toLowerCase() !== 'confirm') {
        alert('Отмена.');
        return;
      }

      removeLinkIfaces(l);
      state.links = (state.links || []).filter(x => x.id !== l.id);
      saveState(state);
      renderLinks();
    };

    box.appendChild(card);
  }
}



// === DOM для внешнего терминала (одноразово создаём) ===
function ensureExtTermDOM(){
  if (document.getElementById('extTerm')) return;
  const html = `
  <div id="extTerm" class="extterm hidden">
    <div class="extterm__wrap">
      <header class="extterm__top">
        <button id="extTermBack" class="btn ghost">← Назад</button>
        <h2 id="extTermTitle"></h2>
        <div class="spacer"></div>
      </header>

      <div class="extterm__content">
        <!-- Левая панель: картинка + связи -->
        <aside class="extterm__pane">
          <div class="extterm__image" id="extImg"></div>
          <div class="extterm__box">
            <h4>Связи</h4>
            <div id="extConns" class="extterm__conns"></div>
          </div>
        </aside>

        <!-- Правая панель: терминал -->
        <section class="extterm__body">
          <div class="terminal" id="extTermBox">
            <div class="term-header">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span class="title" id="extTermCaption">Внешняя машина</span>
            </div>
            <div class="term-body" id="extTermLog" tabindex="-1" aria-live="polite"></div>
            <div class="term-input">
              <span class="prompt" id="extPrompt">$</span>
              <input id="extCmd" type="text" autocomplete="off" spellcheck="false" />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // назад
  document.getElementById('extTermBack').onclick = () => {
    document.getElementById('extTerm').classList.add('hidden');
    document.querySelector('.workspace')?.classList.remove('hidden');
    currentExtTermKey = null; // 🔹 чтобы ничего случайно не писать после закрытия
  };

}

function renderExternalConnections(link){
  const box = document.getElementById('extConns');
  if (!box) return;
  box.innerHTML = '';

  // === ISP ===
  if (link.type === 'ISP'){
    const peers   = link.peers   || [];
    const emPeers = link.emPeers || [];

    if (!peers.length && !emPeers.length){
      box.innerHTML = '<div class="muted">Подключений нет</div>';
      return;
    }

    // офисы
    peers.forEach(p => {
      const off = state.offices.find(o => o.id === p.officeId);
      const el = document.createElement('div');
      el.className = 'extconn';
      el.innerHTML = `
        <div class="extconn__title">${off ? off.name : p.officeId}</div>
        <div class="extconn__meta">
          CIDR: <b>${p.cidr || '-'}</b>
          ${p.officeIp ? ` · офис: ${p.officeIp}` : ''}
          ${p.ispIp    ? ` · ISP: ${p.ispIp}`     : ''}
        </div>
      `;
      box.appendChild(el);
    });

    // EMach-машины
    emPeers.forEach(p => {
      const emLink = (state.links || []).find(l => l.id === p.emId && l.type === 'EMach');
      const el = document.createElement('div');
      el.className = 'extconn';
      el.innerHTML = `
        <div class="extconn__title">${emLink ? (emLink.name || emLink.id) : p.emId}</div>
        <div class="extconn__meta">
          CIDR: <b>${p.cidr || '-'}</b>
          ${p.emIp  ? ` · EMach: ${p.emIp}` : ''}
          ${p.ispIp ? ` · ISP: ${p.ispIp}`  : ''}
        </div>
      `;
      box.appendChild(el);
    });
        // --- ТУННЕЛИ, где участвует этот ISP ---
    const tifs = link.tunnelIfaces || [];
    tifs.forEach(nic => {
      // nic: {tunnelId, name, ip, cidr}
      const t = (state.links || []).find(x =>
        x.id === nic.tunnelId && (x.type === 'GRE' || x.type === 'IPIP')
      );
      if (!t) return;

      // определить "удалённую" сторону
      const remote =
        (t.a?.linkId === link.id && t.a?.linkType === 'ISP') ? t.b :
        (t.b?.linkId === link.id && t.b?.linkType === 'ISP') ? t.a :
        null;

      let remoteName = '—';
      if (remote?.officeId){
        const off = state.offices.find(o => o.id === remote.officeId);
        remoteName = off ? off.name : remote.officeId;
      } else if (remote?.linkId){
        const ext = state.links.find(l => l.id === remote.linkId);
        remoteName = ext ? (ext.name || ext.id) : remote.linkId;
      }

      const el = document.createElement('div');
      el.className = 'extconn extconn--tunnel';
      el.innerHTML = `
        <div class="extconn__title">
          ${t.type}-туннель → ${remoteName}
        </div>
        <div class="extconn__meta">
          CIDR: <b>${nic.cidr || t.cidr || '-'}</b>
          ${nic.ip ? ` · ${nic.name || 'tun'}: ${nic.ip}` : ''}
        </div>
      `;
      box.appendChild(el);
    });


  // === EMach ===
  } else if (link.type === 'EMach') {
    const officePeers = link.emOfficePeers || [];
    const ispPeer     = link.emIspPeer || null;

    if (!officePeers.length && !ispPeer) {
      box.innerHTML = '<div class="muted">Привязка не выполнена</div>';
      return;
    }

    // связи с офисами (может быть несколько)
    officePeers.forEach(p => {
      const off = state.offices.find(o => o.id === p.officeId);
      const el = document.createElement('div');
      el.className = 'extconn';
      el.innerHTML = `
        <div class="extconn__title">${off ? off.name : p.officeId}</div>
        <div class="extconn__meta">
          CIDR: <b>${p.cidr || '-'}</b>
          ${p.emIp  ? ` · EMach: ${p.emIp}`  : ''}
          ${p.vmIp  ? ` · ВМ: ${p.vmIp}`     : ''}
        </div>
      `;
      box.appendChild(el);
    });

    // связь с ISP
    if (ispPeer) {
      const ispLink = (state.links || []).find(l => l.id === ispPeer.ispId && l.type === 'ISP');
      const el2 = document.createElement('div');
      el2.className = 'extconn';
      el2.innerHTML = `
        <div class="extconn__title">${ispLink ? (ispLink.name || ispLink.id) : ispPeer.ispId}</div>
        <div class="extconn__meta">
          CIDR: <b>${ispPeer.cidr || '-'}</b>
          ${ispPeer.emIp  ? ` · EMach: ${ispPeer.emIp}` : ''}
          ${ispPeer.ispIp ? ` · ISP: ${ispPeer.ispIp}`   : ''}
        </div>
      `;
      box.appendChild(el2);
    }
        // --- ТУННЕЛИ, где участвует этот EMach ---
    const tifs = link.tunnelIfaces || [];
    tifs.forEach(nic => {
      const t = (state.links || []).find(x =>
        x.id === nic.tunnelId && (x.type === 'GRE' || x.type === 'IPIP')
      );
      if (!t) return;

      const remote =
        (t.a?.linkId === link.id && t.a?.linkType === 'EMach') ? t.b :
        (t.b?.linkId === link.id && t.b?.linkType === 'EMach') ? t.a :
        null;

      let remoteName = '—';
      if (remote?.officeId){
        const off = state.offices.find(o => o.id === remote.officeId);
        remoteName = off ? off.name : remote.officeId;
      } else if (remote?.linkId){
        const ext = state.links.find(l => l.id === remote.linkId);
        remoteName = ext ? (ext.name || ext.id) : remote.linkId;
      }

      const el = document.createElement('div');
      el.className = 'extconn extconn--tunnel';
      el.innerHTML = `
        <div class="extconn__title">
          ${t.type}-туннель → ${remoteName}
        </div>
        <div class="extconn__meta">
          CIDR: <b>${nic.cidr || t.cidr || '-'}</b>
          ${nic.ip ? ` · ${nic.name || 'tun'}: ${nic.ip}` : ''}
        </div>
      `;
      box.appendChild(el);
    });


  } else {
    // GRE/IPIP и прочее
    box.innerHTML = '<div class="muted">Для этого типа связи список соединений не отображается</div>';
  }
}

// маленькие утилиты для внешнего терминала
function extNow(){ return new Date().toTimeString().slice(0,8); }

function extWrite(text, cls=''){
  const log = document.getElementById('extTermLog');
  if (!log) return;

  const line = document.createElement('div');
  line.className = `line ${cls}`;
  line.innerHTML = `<span class="ts">[${extNow()}]</span> ${text}`;
  log.appendChild(line);

  const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 40;
  if (atBottom) log.scrollTop = log.scrollHeight;

  // ✏ сохраняем HTML в историю для текущего терминала
  if (currentExtTermKey) {
    extTermHistory[currentExtTermKey] = log.innerHTML;
  }
}


// запустить терминал внешней машины
function openExternalTerminal(linkId){
  ensureExtTermDOM();

  const link = state.links.find(l => l.id === linkId);
  if(!link){ alert('Связь не найдена'); return; }

  // спрятать рабочую зону, показать терминал
  document.querySelector('.workspace')?.classList.add('hidden');
  const root = document.getElementById('extTerm');
  root.classList.remove('hidden');

  // заголовки
  const title = `${link.type === 'ISP' ? 'Провайдер' : 'Внешняя машина'} — ${link.name || link.type}`;
  document.getElementById('extTermTitle').textContent   = title;
  document.getElementById('extTermCaption').textContent = title;

  // лог и ключ истории
  const log = document.getElementById('extTermLog');
  const body = document.querySelector('#extTermBox .term-body');

  // скролл только внутри терминала
  if (body) {
    body.style.overflowY      = 'auto';
    body.style.maxHeight      = '100%';
    body.style.scrollBehavior = 'smooth';
  }

  // === история терминала ===
  window.currentExtTermKey = `link:${link.id}`;
  if (window.extTermHistory && window.extTermHistory[currentExtTermKey]) {
    log.innerHTML = window.extTermHistory[currentExtTermKey];
  } else {
    log.innerHTML = '';
  }
  log.scrollTop = log.scrollHeight || 0;

  // === фон "цифровые созвездия" ===
  if (body) {
    // убираем старые холсты
    body.querySelectorAll('#ispStars, #emStars, canvas').forEach(c => c.remove());

    // создаём новый фон под тип
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (link.type === 'ISP') {
        body.__ispFX = makeCosmicBackgroundFor(body, 'ispStars');
        body.__emFX  = null;
      } else if (link.type === 'EMach') {
        body.__emFX  = makeCosmicBackgroundFor(body, 'emStars');
        body.__ispFX = null;
      } else {
        body.__ispFX = null;
        body.__emFX  = null;
      }
    }));
  }

  // картинка
  const img = document.getElementById('extImg');
  if (img) {
    img.style.backgroundImage = link.type === 'ISP'
      ? "url('../custom/img/isp.png')"
      : "url('../custom/img/Emach.png')";
  }

  // связи слева
  renderExternalConnections(link);

  // приветствие только если история пустая
  if (!window.extTermHistory || !window.extTermHistory[currentExtTermKey]) {
    extWrite('Инициализация внешнего терминала ...');
    if (link.type === 'ISP') {
      const peersCnt   = (link.peers   || []).length;
      const emPeersCnt = (link.emPeers || []).length;
      extWrite(`Узел: ${link.name || 'ISP'} (${link.id})`);
      extWrite(`Подключений офисов: ${peersCnt}, EMach: ${emPeersCnt}`);
    } else if (link.type === 'EMach') {
      const offCnt = (link.officePeers || []).length;
      const ispOn  = !!link.ispPeer;
      extWrite(`Узел: ${link.name || 'EMach'} (${link.id})`);
      extWrite(`Связи с офисами: ${offCnt} · ISP: ${ispOn ? 'подключён' : 'нет'}`);
    } else {
      extWrite(`Узел: ${link.name || link.type} (${link.id})`);
    }
    extWrite('Введите "help" для списка команд.');
  }

  // --- команды ---
  const input = document.getElementById('extCmd');
  input.value = '';
  input.focus();

  function listPeers(){
    if (link.type !== 'ISP'){
      extWrite('Команда доступна только для ISP','err');
      return;
    }
    const peers   = link.peers   || [];
    const emPeers = link.emPeers || [];

    if (!peers.length && !emPeers.length){
      extWrite('Подключений нет.');
      return;
    }

    // офисы
    peers.forEach((p,i)=>{
      const off = state.offices.find(o=>o.id===p.officeId);
      extWrite(
        `${i+1}. office: ${off ? off.name : p.officeId}  ` +
        `cidr:${p.cidr||'-'}  isp:${p.ispIp||'-'}  office:${p.officeIp||'-'}`
      );
    });

    // EMach
    emPeers.forEach((p,i)=>{
      const em = (state.links || []).find(l => l.id === p.emId && l.type === 'EMach');
      extWrite(
        `EM${i+1}. emach: ${em ? (em.name || em.id) : p.emId}  ` +
        `cidr:${p.cidr||'-'}  isp:${p.ispIp||'-'}  em:${p.emIp||'-'}`
      );
    });
  }

    function listIfaces(){
    extWrite('Интерфейсы:');

    if (link.type === 'ISP') {
      // базовый uplink
      extWrite('  - isp0  mode:uplink  (динамический, адреса раздаются по подключению офисов)');

      // подключённые офисы
      const peers = link.peers || [];
      peers.forEach((p, i) => {
        if (p.officeIp) {
          extWrite(`    · office${i+1}: ${p.officeIp} (${p.cidr || '-'})`);
        }
      });

      // EMach-подключения (новый формат)
      const emPeers = link.emPeers || [];
      emPeers.forEach((p, i) => {
        const mb  = (p.cidr && p.cidr.split('/')[1]) || '';
        const suf = mb ? `/${mb}` : '';
        extWrite(`  - em${i+1}  mode:emach-link  ${p.ispIp || '-'}${suf}`);
        if (p.emIp) {
          extWrite(`    · emach: ${p.emIp}`);
        }
      });
            // туннели, где этот ISP участвует
      const tifs = link.tunnelIfaces || [];
      tifs.forEach((nic, idx) => {
        if (!nic.ip || !nic.cidr) return;
        const mb  = (nic.cidr.split('/')[1] || '').trim();
        const suf = mb ? `/${mb}` : '';
        const name = nic.name || `tun${idx}`;
        extWrite(`  - ${name}  mode:tunnel  ${nic.ip}${suf}`);
      });



    } else if (link.type === 'EMach') {
      const officePeers = link.emOfficePeers || [];
      const ispPeer     = link.emIspPeer || null;

      // офисные связи
      if (!officePeers.length) {
        extWrite('  - em*  mode:emach-peer  (к офисам не привязан)');
      } else {
        officePeers.forEach((p, idx) => {
          if (p.cidr && p.emIp) {
            const mb  = (p.cidr.split('/')[1] || '').trim();
            const suf = mb ? `/${mb}` : '';
            extWrite(`  - em${idx}  mode:emach-peer  ${p.emIp}${suf}`);
            if (p.vmIp) {
              extWrite(`    · office-vm: ${p.vmIp}`);
            }
          }
        });
      }

      // связь с ISP
      if (ispPeer && ispPeer.cidr && ispPeer.emIp) {
        const mb  = (ispPeer.cidr.split('/')[1] || '').trim();
        const suf = mb ? `/${mb}` : '';
        extWrite(`  - isp-link0  mode:isp-link  ${ispPeer.emIp}${suf}`);
        if (ispPeer.ispIp) {
          extWrite(`    · isp: ${ispPeer.ispIp}`);
        }
      }
           // дополнительные интерфейсы EMach (в том числе туннели)
      const tifs = link.tunnelIfaces || [];
      tifs.forEach((nic, idx) => {
        if (!nic.ip || !nic.cidr) return;
        const mb  = (nic.cidr.split('/')[1] || '').trim();
        const suf = mb ? `/${mb}` : '';
        const name = nic.name || `tun${idx}`;
        extWrite(`  - ${name}  mode:tunnel  ${nic.ip}${suf}`);
      });


    } else {
      // запасной вариант
      extWrite('  - eth0  mode:static  10.10.10.2/24 (пример)');
    }
  }


  function help(){
    extWrite('Доступные команды:');
    extWrite('  help            — список команд');
    extWrite('  clear           — очистить экран');
    if (link.type === 'ISP') {
      extWrite('  peers           — список подключений офисов и EMach');
    }
    extWrite('  ifaces          — список интерфейсов узла');
    if (link.type === 'EMach') {
      extWrite('  ping <host>     — эмулировать ICMP-проверку');
      extWrite('  set-ip <if> <CIDR> — задать локальный интерфейс EMach (виртуально)');
    }
    extWrite('  status          — краткое состояние');
    extWrite('  del             — удалить внешнюю машину (confirm для подтверждения)');
    extWrite('  back            — вернуться в планнер');
  }

  function status(){
    if (link.type === 'ISP') {
      const peersCnt   = (link.peers   || []).length;
      const emPeersCnt = (link.emPeers || []).length;
      extWrite(`Тип: ISP; офисов: ${peersCnt}; EMach: ${emPeersCnt}; id: ${link.id}`);
    } else if (link.type === 'EMach') {
      const offCnt = (link.officePeers || []).length;
      const hasIsp = !!link.ispPeer;
      extWrite(`Тип: EMach; id: ${link.id}`);
      extWrite(`Связей с офисами: ${offCnt}; ISP: ${hasIsp ? 'подключён' : 'нет'}`);
    } else {
      extWrite(`Тип: ${link.type}; id: ${link.id}`);
    }
  }

  // обработчик ввода
  let waitConfirmDelete = false;

  input.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    const raw = input.value.trim();
    if (!raw) return;

    extWrite(`$ ${raw}`);
    input.value = '';

    // сохраняем историю
    if (window.extTermHistory && typeof currentExtTermKey === 'string') {
      const logEl = document.getElementById('extTermLog');
      window.extTermHistory[currentExtTermKey] = logEl.innerHTML;
    }

    // режим подтверждения удаления
    if (waitConfirmDelete) {
      if (raw.toLowerCase() === 'confirm') {
        removeLinkIfaces(link);
        state.links = (state.links || []).filter(l => l.id !== link.id);
        saveState(state);

        extWrite('Удалено. Возврат к планнеру.');
        if (window.extTermHistory && typeof currentExtTermKey === 'string') {
          delete window.extTermHistory[currentExtTermKey];
        }

        document.getElementById('extTerm').classList.add('hidden');
        document.querySelector('.workspace')?.classList.remove('hidden');
        renderLinks();
        return;
      } else {
        extWrite('Операция отменена.');
        waitConfirmDelete = false;
        return;
      }
    }

    const [cmd, ...args] = raw.split(/\s+/);
    const knownCommands = [
      'help','clear','peers','ifaces','status','del','back',
      'ping','set-ip'
    ];

    // подсказка по частичной команде
    if (!knownCommands.includes(cmd)) {
      const candidates = knownCommands.filter(c => c.startsWith(cmd));
      if (candidates.length === 1) {
        extWrite(`Возможно, вы имели в виду команду "${candidates[0]}"?`,'err');
      } else if (candidates.length > 1) {
        extWrite(
          `Команда не распознана. Похожие: ${candidates.join(', ')}. ` +
          `Введите полное имя или "help".`,
          'err'
        );
      } else {
        extWrite('Неизвестная команда. Введите "help".','err');
      }
      return;
    }

    // специальные сложные команды
    if (cmd === 'ping') {
      if (link.type !== 'EMach') {
        extWrite('ping доступен только в терминале EMach.','err');
        return;
      }
      const host = args[0] || '1.1.1.1';
      const cnt  = 4;
      const lat  = [];
      const bodyEl = document.querySelector('#extTermBox .term-body');

      extWrite(`PING ${host}: 56 data bytes`);

      for (let i = 0; i < cnt; i++) {
        setTimeout(() => {
          const ms = (Math.random() * 34 + 8).toFixed(1);
          lat.push(+ms);

          bodyEl?.__emFX?.pulse?.(1);

          extWrite(`64 bytes from ${host}: icmp_seq=${i+1} ttl=64 time=${ms} ms`);

          if (i === cnt - 1) {
            const min = Math.min(...lat).toFixed(1);
            const avg = (lat.reduce((a,b)=>a+b,0)/lat.length).toFixed(1);
            const max = Math.max(...lat).toFixed(1);
            const mdev = (
              Math.sqrt(lat.map(x => (x-avg)**2).reduce((a,b)=>a+b,0)/lat.length)
            ).toFixed(1);

            setTimeout(() => {
              extWrite('');
              extWrite(`--- ${host} ping statistics ---`);
              extWrite(`${cnt} packets transmitted, ${cnt} received, 0% packet loss`);
              extWrite(`rtt min/avg/max/mdev = ${min}/${avg}/${max}/${mdev} ms`);
            }, 120);
          }
        }, 180 * (i + 1));
      }
      return;
    }

    if (cmd === 'set-ip') {
      if (link.type !== 'EMach') {
        extWrite('set-ip доступен только в терминале EMach.','err');
        return;
      }

      if (args.length < 2) {
        extWrite('Ожидал: set-ip <iface> <CIDR>. Например: set-ip eth1 10.0.10.2/24','err');
        return;
      }

      const ifName = args[0];
      const cidr   = args[1];

      try {
        const ci = cidrInfo(cidr);
        const ip = intToIp(ci.first + 1); // просто что-то из usable-пула

        link.emIfaces ||= [];
        let nic = link.emIfaces.find(n => n.name === ifName);
        if (!nic) {
          nic = { name: ifName };
          link.emIfaces.push(nic);
        }
        Object.assign(nic, { cidr, ip });

        saveState(state);
        extWrite(`Интерфейс ${ifName} настроен: ${ip}/${cidr.split('/')[1] || ''}`);

      } catch (e) {
        extWrite('CIDR некорректен. Пример: 10.0.10.2/24','err');
      }
      return;
    }

    // обычные короткие команды
    switch (cmd) {
      case 'help':
        help();
        break;

      case 'clear':
        log.innerHTML = '';
        if (window.extTermHistory && typeof currentExtTermKey === 'string') {
          window.extTermHistory[currentExtTermKey] = '';
        }
        break;

      case 'peers':
        listPeers();
        break;

      case 'ifaces':
        listIfaces();
        break;

      case 'status':
        status();
        break;

      case 'del':
        extWrite(`Точно хотите уничтожить внешнюю машину ${link.name || link.type}? Введите confirm`);
        waitConfirmDelete = true;
        break;

      case 'back':
        document.getElementById('extTermBack').click();
        break;
    }
  };
}

function openLinkInfo(linkId){
  const link = state.links.find(l => l.id === linkId);
  if(!link) return;

  const modal = document.getElementById('modalLinkInfo');
  const cont  = document.getElementById('linkInfoContent');
  const title = document.getElementById('linkInfoTitle');
  title.textContent = `${link.name || link.type}`;

  let html = '';
  html += `<p><b>Тип:</b> ${link.type}</p>`;
  if(link.cidr) html += `<p><b>Подсеть:</b> ${link.cidr}</p>`;
  if(link.a?.officeId){
    const offA = state.offices.find(o=>o.id===link.a.officeId);
    html += `<p><b>Офис A:</b> ${offA ? offA.name : link.a.officeId} (${link.a.ip||'-'})</p>`;
  }
  if(link.b?.officeId){
    const offB = state.offices.find(o=>o.id===link.b.officeId);
    html += `<p><b>Офис B:</b> ${offB ? offB.name : link.b.officeId} (${link.b.ip||'-'})</p>`;
  }
  cont.innerHTML = html;

  modal.classList.add('active');

  const delBtn = document.getElementById('btnDeleteLink');
  delBtn.onclick = ()=>{
    if(confirm('Удалить эту связь?')){
      state.links = state.links.filter(l=>l.id!==link.id);
      saveState(state);
      renderLinks();
      modal.classList.remove('active');
    }
  };
}

function openTunnelBind(linkId){
  const link = state.links.find(l=>l.id===linkId && (l.type==='GRE'||l.type==='IPIP'));
  if(!link) return;

  const officeA = state.offices.find(o=>o.id===link.a.officeId);
  const officeB = state.offices.find(o=>o.id===link.b.officeId);

  const elA_vm = document.getElementById('tunA_vm');
  const elA_if = document.getElementById('tunA_if');
  const elB_vm = document.getElementById('tunB_vm');
  const elB_if = document.getElementById('tunB_if');

  if(!elA_vm || !elA_if || !elB_vm || !elB_if){
    showResult(false,'Модалка привязки туннеля недоступна.');
    return;
  }

  function fillVM(el, office, selected){
    el.innerHTML = '';
    (office?.vms||[]).forEach(vm=>{
      const opt = document.createElement('option');
      opt.value = vm.id; opt.textContent = vm.name;
      if(selected === vm.id) opt.selected = true;
      el.appendChild(opt);
    });
  }
  function fillIfaces(el, office, vmId, selected){
    el.innerHTML = '';
    const vm = (office?.vms||[]).find(v=>v.id===vmId) || (office?.vms||[])[0];
    if(!vm) return;
    const uplinks = (vm.ifaces||[]).filter(i=>UPLINK_MODES.has(i.mode));
    const others  = (vm.ifaces||[]).filter(i=>!UPLINK_MODES.has(i.mode));
    [...uplinks, ...others].forEach(i=>{
      const opt = document.createElement('option');
      opt.value = i.name;
      opt.textContent = `${i.name}${i.mode?` (${i.mode})`:''}${i.ip?` — ${i.ip}`:''}`;
      if(selected === i.name) opt.selected = true;
      el.appendChild(opt);
    });
  }

  fillVM(elA_vm, officeA, link.endpoints?.a?.vmId);
  fillVM(elB_vm, officeB, link.endpoints?.b?.vmId);
  fillIfaces(elA_if, officeA, elA_vm.value, link.endpoints?.a?.iface);
  fillIfaces(elB_if, officeB, elB_vm.value, link.endpoints?.b?.iface);

  elA_vm.onchange = ()=> fillIfaces(elA_if, officeA, elA_vm.value);
  elB_vm.onchange = ()=> fillIfaces(elB_if, officeB, elB_vm.value);

  document.getElementById('btnSaveTunnelBind').onclick = ()=>{
  link.endpoints = {
    a: { vmId: elA_vm.value, iface: elA_if.value },
    b: { vmId: elB_vm.value, iface: elB_if.value }
  };

  // --- ДОБАВЬ ЭТО ---
  const vmA = (officeA?.vms||[]).find(v=> String(v.id) === String(elA_vm.value));
  const vmB = (officeB?.vms||[]).find(v=> String(v.id) === String(elB_vm.value));
  if (vmA) ensureTunnelIface(vmA, link.a.ip, link.cidr, link.id);   // создаст/обновит tunnel.0
  if (vmB) ensureTunnelIface(vmB, link.b.ip, link.cidr, link.id);
  // -------------------

  saveState(state);
  closeModal('modalTunnelBind');
  renderLinks();
  showResult(true,'Туннель привязан к выбранным интерфейсам. Интерфейсы tunnel.0 созданы.');
};

  openModal('modalTunnelBind');
}


function openEMBind(linkId){
  const link = state.links.find(l => l.id === linkId && l.type === 'EMach');
  if (!link) return;

  // ---------- НОРМАЛИЗАЦИЯ СТРУКТУРЫ ----------
  // массив связей EMach ↔ офисы
  if (!Array.isArray(link.emOfficePeers)) {
    link.emOfficePeers = [];
  }

  // миграция из старого link.peer (одна связь) → emOfficePeers[0]
  if (!link.emOfficePeers.length && link.peer) {
    const legacy = Object.assign({}, link.peer);
    delete legacy.iface;
    link.emOfficePeers.push(legacy);
  }

  // одиночная связь EMach ↔ ISP
  link.emIspPeer = link.emIspPeer || link.ispPeer || null;

  // ---------- DOM ----------
  const chkOffice  = qs('#emBindOffice');
  const chkISP     = qs('#emBindISP');
  const officeList = qs('#emOfficeList');   // контейнер со строками "офис/ВМ/CIDR"
  const ispBlock   = qs('#emIspBlock');     // блок с настройками ISP
  const selIsp     = qs('#emIsp');
  const ispCIDR    = qs('#emIspCIDR');
  const ispPol     = qs('#emIspPolicy');
  const btnAddOff  = qs('#btnAddEmOffice');
  const btnSave    = qs('#btnSaveEmBind');

  if (!chkOffice || !chkISP || !officeList || !ispBlock ||
      !selIsp || !ispCIDR || !ispPol || !btnAddOff || !btnSave) {
    showResult(false, 'Модалка привязки EMach повреждена.');
    return;
  }

  // ========== РЕНДЕР СТРОК ОФИСОВ ==========
  function renderOfficeRows(){
    officeList.innerHTML = '';

    link.emOfficePeers.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'em-row';

      row.innerHTML = `
        <select class="em-office"></select>
        <select class="em-vm"></select>
        <input  class="em-cidr" placeholder="CIDR">
        <select class="em-pol">
          <option value="firstAfter">Адрес после EMach</option>
          <option value="random">Случайный usable</option>
          <option value="last">Последний usable</option>
        </select>
        <button class="del">×</button>
      `;

      const offSel = row.querySelector('.em-office');
      const vmSel  = row.querySelector('.em-vm');
      const ciInp  = row.querySelector('.em-cidr');
      const polSel = row.querySelector('.em-pol');
      const delBtn = row.querySelector('.del');

      // заполняем список офисов
      state.offices.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.name || o.id;
        if (o.id === p.officeId) opt.selected = true;
        offSel.appendChild(opt);
      });

      // если officeId ещё не задан — берём первый офис
      if (!p.officeId && state.offices[0]) {
        p.officeId = state.offices[0].id;
        offSel.value = p.officeId;
      }

      // заполняем список ВМ
      function fillVMs(){
        vmSel.innerHTML = '';
        const off = state.offices.find(o => o.id === offSel.value);
        let vms = off?.vms || [];
vms = vms.filter(vm => getVmCandidateIfaces(vm).length > 0);


        if (!vms.length) {
          const opt = document.createElement('option');
          opt.disabled = true;
          opt.selected = true;
          opt.textContent = 'Нет ВМ с интерфейсом ISP/Emach';

          opt.value = '';
          vmSel.appendChild(opt);
          p.vmId = null;
          return;
        }

        vms.forEach(vm => {
          const opt = document.createElement('option');
          opt.value = vm.id;
          opt.textContent = vmDisplayName(vm);
          if (String(vm.id) === String(p.vmId)) opt.selected = true;
          vmSel.appendChild(opt);
        });

        // если vmId ещё не задан — берём первую
        if (!p.vmId && vms[0]) {
          p.vmId = vms[0].id;
          vmSel.value = p.vmId;
        }
      }

      fillVMs();

      // восстановление значений
      ciInp.value  = p.cidr   || '';
      polSel.value = p.policy || 'firstAfter';

      // обработчики
      offSel.onchange = () => {
        p.officeId = offSel.value || null;
        p.vmId = null;
        fillVMs();
      };
      vmSel.onchange  = () => { p.vmId   = vmSel.value || null; };
      ciInp.oninput   = () => { p.cidr   = ciInp.value.trim(); };
      polSel.onchange = (e) => { p.policy = e.target.value; };

      delBtn.onclick = () => {
        link.emOfficePeers.splice(idx, 1);
        renderOfficeRows();
      };

      officeList.appendChild(row);
    });
  }

  // кнопка "Добавить офис"
  btnAddOff.onclick = () => {
    const defaultOfficeId = state.offices[0]?.id || null;
    link.emOfficePeers.push({
      officeId: defaultOfficeId,
      vmId: null,
      cidr: '',
      policy: 'firstAfter',
      emIp: null,
      vmIp: null
    });
    renderOfficeRows();
  };

  renderOfficeRows();

  // тумблер оффисов
  chkOffice.checked = link.emOfficePeers.length > 0;
  officeList.style.display = chkOffice.checked ? '' : 'none';
  chkOffice.onchange = () => {
    officeList.style.display = chkOffice.checked ? '' : 'none';
  };

  // ========== ISP ==========

  // список ISP
  selIsp.innerHTML = '<option value="">— Выбрать ISP —</option>';
  state.links
    .filter(l => l.type === 'ISP')
    .forEach(isp => {
      const o = document.createElement('option');
      o.value = isp.id;
      o.textContent = isp.name || isp.id;
      selIsp.appendChild(o);
    });

  if (link.emIspPeer) {
    chkISP.checked = true;
    selIsp.value   = link.emIspPeer.ispId || '';
    ispCIDR.value  = link.emIspPeer.cidr  || '';
    ispPol.value   = link.emIspPeer.policy || 'firstAfter';
  } else {
    chkISP.checked = false;
    selIsp.value   = '';
    ispCIDR.value  = '';
    ispPol.value   = 'firstAfter';
  }

  ispBlock.style.display = chkISP.checked ? '' : 'none';
  chkISP.onchange = () => {
    ispBlock.style.display = chkISP.checked ? '' : 'none';
  };

  // ========== SAVE ==========

  btnSave.onclick = () => {
    try {
      // ===== EMach ↔ ОФИСЫ =====
      if (!chkOffice.checked) {
        // выключили целиком — чистим интерфейсы на ВМ и сам список
        link.emOfficePeers.forEach(p => {
          const off = state.offices.find(o => o.id === p.officeId);
          const vm  = off?.vms.find(v => String(v.id) === String(p.vmId));
          if (vm && Array.isArray(vm.ifaces)) {
            vm.ifaces = vm.ifaces.filter(i => i.linkId !== link.id || i.mode !== 'emach-peer');
          }
        });
        link.emOfficePeers = [];
        link.peer = null; // для старого кода
      } else {
        if (!link.emOfficePeers.length) {
          throw new Error('Добавьте хотя бы одно подключение к офису или выключите тумблер «подключать к офису».');
        }

        link.emOfficePeers.forEach((p, idx) => {
          if (!p.officeId) throw new Error('Не выбран офис для одной из связей EMach.');
          if (!p.vmId)     throw new Error('Не выбрана ВМ для одной из связей EMach.');
          if (!p.cidr)     throw new Error('CIDR обязателен для связи EMach ↔ офис.');

          const off = state.offices.find(o => o.id === p.officeId);
          const vm  = off?.vms.find(v => String(v.id) === String(p.vmId));
          if (!vm) throw new Error('ВМ для связи EMach ↔ офис не найдена.');

          const ci   = cidrInfo(p.cidr);
          const emIp = intToIp(ci.first);                         // EMach — первый usable
          const vmIp = pickOfficeIP(ci, p.policy || 'firstAfter', emIp); // ВМ — второй конец

          // запоминаем в peer
          p.emIp  = emIp;
          p.vmIp  = vmIp;
          // === NEW: LAN-интерфейс на стороне EMach для этой подсети ===
link.ifaces ||= [];
const lanName = `lan${idx}`; // idx = индекс emOfficePeers.forEach((p, idx)=>...)

let emLan = link.ifaces.find(x => x.name === lanName && x.officeId === off.id);

const lanIface = {
  name: lanName,
  mode: 'lan',
  cidr: p.cidr,
  ip: emIp,          // первый usable у EMach
  officeId: off.id,
  linkId: link.id
};

if (emLan) Object.assign(emLan, lanIface);
else link.ifaces.push(lanIface);


          vm.ifaces ||= [];
const candidates = getVmCandidateIfaces(vm);
let targetIface = candidates[0] || null;

if (!targetIface) {
  // старый режим: создаём emX
  const ifName = `em${idx}`;
  p.ifaceName = ifName;

  let ex = vm.ifaces.find(i => i.linkId === link.id && i.name === ifName);
  const iface = {
    name:   ifName,
    mode:   'emach-peer',
    cidr:   p.cidr,
    ip:     vmIp,
    linkId: link.id
  };
  if (ex) Object.assign(ex, iface);
  else vm.ifaces.push(iface);
  targetIface = vm.ifaces.find(i => i.linkId === link.id && i.name === ifName);
} else {
  // NEW: назначаем IP на существующий ISP/Emach интерфейс
  targetIface.mode   = 'emach-peer';
  targetIface.cidr   = p.cidr;
  targetIface.ip     = vmIp;
  targetIface.linkId = link.id;
}

p.ifaceName = targetIface?.name || p.ifaceName || `em${idx}`;

        });

        // для старого кода (renderLinks, терминал EMach), который ожидает один peer:
        link.peer = link.emOfficePeers[0] || null;
      }

      // ===== EMach ↔ ISP =====
      if (!chkISP.checked || !selIsp.value) {
        // отключили связь с ISP — чистим со стороны ISP и EMach
        if (link.emIspPeer && link.emIspPeer.ispId) {
          const oldIsp = state.links.find(l => l.id === link.emIspPeer.ispId && l.type === 'ISP');
          if (oldIsp && Array.isArray(oldIsp.emPeers)) {
            oldIsp.emPeers = oldIsp.emPeers.filter(p => p.emId !== link.id);
          }
        }
        link.emIspPeer = null;
        link.ispPeer   = null; // для старого кода
      } else {
        const cidrStr = ispCIDR.value.trim();
        if (!cidrStr) throw new Error('CIDR для связи EMach ↔ ISP обязателен.');

        const ispLink = state.links.find(l => l.id === selIsp.value && l.type === 'ISP');
        if (!ispLink) throw new Error('Выбранный ISP не найден.');

        const ciIsp = cidrInfo(cidrStr);

        // проверка пересечения с уже существующими EMach-связями на этом ISP
        ispLink.emPeers ||= [];
        const others = ispLink.emPeers.filter(p => p.emId !== link.id);
        if (typeof cidrOverlap === 'function') {
          for (const ep of others) {
            const ciOld = cidrInfo(ep.cidr);
            if (cidrOverlap(ciIsp, ciOld)) {
              throw new Error('Подсеть EMach↔ISP пересекается с уже существующей подсетью на этом ISP.');
            }
          }
        }

        const emIp  = intToIp(ciIsp.first);
        const ispIp = pickOfficeIP(ciIsp, ispPol.value || 'firstAfter', emIp);

        // обновляем ISP.emPeers
        let ispPeerRec = ispLink.emPeers.find(p => p.emId === link.id);
        if (!ispPeerRec) {
          ispPeerRec = { emId: link.id };
          ispLink.emPeers.push(ispPeerRec);
        }
        Object.assign(ispPeerRec, {
          cidr: cidrStr,
          emIp,
          ispIp
        });

        // и в самом EMach-линке
        link.emIspPeer = {
          ispId: ispLink.id,
          cidr:  cidrStr,
          emIp,
          ispIp,
          policy: ispPol.value || 'firstAfter'
        };
        link.ispPeer = link.emIspPeer; // для старого кода (renderLinks, терминал)
      }

      saveState(state);
      closeModal('modalEMBind');
      renderLinks();
      renderExternalConnections(link);

      showResult(true, 'Привязка EMach сохранена.');

    } catch (e) {
      showResult(false, e.message || 'Не удалось сохранить привязку EMach.');
    }
  };

  openModal('modalEMBind');
}




function openISPBind(linkId){
  const link = state.links.find(l=>l.id===linkId && l.type==='ISP');
  if(!link) return;

  const list = document.getElementById('ispPeersList');
  if(!list){ showResult(false,'Модалка привязки ISP недоступна.'); return; }

  // выбрать "следующий" офис по умолчанию
  function pickNextOfficeId(){
    const used = new Set(link.peers.map(p=>p.officeId).filter(Boolean));
    const free = state.offices.find(o=>!used.has(o.id));
    return (free || state.offices[1] || state.offices[0] || {}).id || null;
  }


    function renderPeers(){
    list.innerHTML = '';
    if (!link.peers.length){
      const row = document.createElement('div');
      row.className = 'empty-note small';
      row.textContent = 'Нет подключений. Добавьте офис.';
      list.appendChild(row);
      return;
    }

    link.peers.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'isp-peer-row';
      row.innerHTML = `
        <select data-k="office"></select>
        <select data-k="vm"></select>
        <input data-k="cidr" type="text" placeholder="например 172.16.210.0/30">
        <select data-k="policy">
          <option value="firstAfter"${p.policy==='firstAfter'?' selected':''}>Адрес после ISP</option>
          <option value="random"${p.policy==='random'?' selected':''}>Случайный адрес</option>
          <option value="last"${p.policy==='last'?' selected':''}>Последний адрес</option>
        </select>
        <button class="del">×</button>
      `;

      const selOffice = row.querySelector('select[data-k="office"]');
      const selVm     = row.querySelector('select[data-k="vm"]');
      const inpCIDR   = row.querySelector('input[data-k="cidr"]');
      const selPol    = row.querySelector('select[data-k="policy"]');

      // офисы
      state.offices.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.name || o.id;
        if ((p.officeId || '') === o.id) opt.selected = true;
        selOffice.appendChild(opt);
      });

      // если officeId ещё не задан — берём дефолт из select’а
      if (!p.officeId && selOffice.options.length) {
        p.officeId = selOffice.value;
      }

      // ВМ для текущего офиса
      fillVmSelect(selVm, p.officeId, p, { onlyIspEmachCandidates: true });


      // реакции
      selOffice.onchange = () => {
        p.officeId = selOffice.value;
        p.vmId = null;                 // офис сменился — сбросить ВМ
        fillVmSelect(selVm, p.officeId, p, { onlyIspEmachCandidates: true });

      };

      selVm.onchange = () => {
        p.vmId = selVm.value || null;
      };

      inpCIDR.value = p.cidr || '';
      inpCIDR.oninput = () => {
        p.cidr = inpCIDR.value.trim();
      };

      selPol.onchange = (e) => {
        p.policy = e.target.value;
      };

      // удаление строки
      row.querySelector('.del').onclick = () => {
        link.peers.splice(idx, 1);
        renderPeers();
      };

      list.appendChild(row);
    });
  }


  const addBtn  = document.getElementById('btnAddIspPeer');
  const saveBtn = document.getElementById('btnSaveIspBind');

  if(addBtn){
    addBtn.onclick = ()=>{
      link.peers.push({
        officeId: pickNextOfficeId(),
        vmId: null,
        cidr: '',
        ispIp: null,
        officeIp: null,
        policy: 'firstAfter'
      });
      renderPeers();
    };
  }

  if(saveBtn){
    saveBtn.onclick = ()=>{
      try{
        link.peers.forEach((p, i) => {
          if(!p.officeId) throw new Error('Не выбран офис для одного из подключений');
          if(!p.cidr)     throw new Error('Не указан CIDR для одного из подключений');
          if(!p.vmId)     throw new Error('Не выбрана ВМ для одного из подключений');

          const off = state.offices.find(o => o.id === p.officeId);
          if (!off) throw new Error('Офис не найден');

          const vmList = off.vms || [];
          if (!vmList.length) throw new Error(`В офисе ${off.name} нет ВМ`);

          let vm = null;
          if (p.vmId) {
            vm = vmList.find(v => String(v.id) === String(p.vmId));
          }
          if (!vm) {
            vm = vmList[0]; // fallback, если что-то пошло не так
          }


          // рассчитать адреса
          const ci    = cidrInfo(p.cidr);
          const ispIp = intToIp(ci.first);                 // ISP всегда первый usable
          const offIp = pickOfficeIP(ci, p.policy||'firstAfter', ispIp);
          // === NEW: LAN-интерфейс на стороне ISP для этой подсети ===
link.ifaces ||= [];
const lanName = `lan${i}`; // i = индекс peer в link.peers.forEach((p,i)=>...)

let ispLan = link.ifaces.find(x => x.name === lanName && x.officeId === off.id);

const lanIface = {
  name: lanName,
  mode: 'lan',          // внутренний LAN-порт провайдера
  cidr: p.cidr,
  ip: ispIp,            // ПЕРВЫЙ usable из пользовательской подсети
  officeId: off.id,
  linkId: link.id
};

if (ispLan) Object.assign(ispLan, lanIface);
else link.ifaces.push(lanIface);


          // создать/обновить интерфейс у ВМ офиса
          // NEW: используем существующий интерфейс с типом ISP/Emach
vm.ifaces ||= [];
const candidates = getVmCandidateIfaces(vm);

// если кандидатов нет — фолбэк на старое поведение
let targetIface = candidates[0] || null;

if (!targetIface) {
  // старый режим: создаём isp0
  const ifname = 'isp0';
  const exists = vm.ifaces.find(i=>i.name===ifname && i.linkId===link.id);
  const iface  = { name: ifname, mode:'isp-peer', ip: offIp, cidr: p.cidr, linkId: link.id };
  if (exists) Object.assign(exists, iface); else vm.ifaces.push(iface);
  targetIface = vm.ifaces.find(i=>i.name===ifname && i.linkId===link.id);
} else {
  // назначаем IP на выбранный интерфейс
  targetIface.mode   = 'isp-peer';   // чтобы терминал/рендер видел uplink как ISP
  targetIface.ip     = offIp;
  targetIface.cidr   = p.cidr;
  targetIface.linkId = link.id;
}

p.ispIp      = ispIp;
p.officeIp   = offIp;
p.vmId       = vm.id;
p.ifaceName  = targetIface?.name || 'isp0';
p.iface      = p.ifaceName; // совместимость со старым кодом

        });

        saveState(state);
        closeModal('modalISPBind');
        renderLinks();
        showResult(true,'Подключения ISP сохранены.');
      }catch(e){
        showResult(false, e.message || 'Не удалось сохранить подключения.');
      }
    };
  }

  renderPeers();
  openModal('modalISPBind');
}

function openTunnelWizard(tunnelType){
  const modal = document.getElementById('modalTunnelWizard');
  if (!modal){
    showResult(false, 'Мастер туннеля недоступен.');
    return;
  }

  const titleEl   = document.getElementById('tunnelWizardTitle');
  const srcBox    = document.getElementById('tunnelSources');
  const slotABox  = document.getElementById('tunnelSlotA');
  const slotBBox  = document.getElementById('tunnelSlotB');
  const cidrInput = document.getElementById('tunnelCIDR');
  const btnCreate = document.getElementById('btnCreateTunnel');

  if (!titleEl || !srcBox || !slotABox || !slotBBox || !cidrInput || !btnCreate){
    showResult(false, 'Мастер туннеля: DOM повреждён.');
    return;
  }

  titleEl.textContent = `Создать ${tunnelType}-туннель`;

  // ---------- модель выбранных сторон ----------
  const selection = {
    a: null, // { kind:'office', officeId, vmId? } | { kind:'link', linkId, linkType }
    b: null
  };

  // ---------- вспомогалки ----------
  function vmDisplayName(vm){
    if (!vm) return '';
    // приоритет: hostname → name → VM#id
    if (vm.hostname && vm.hostname.trim()) return vm.hostname.trim();
    if (vm.name && vm.name.trim()) return vm.name.trim();
    return 'VM#' + vm.id;
  }

  function vmBgClass(vm){
    const t = (vm?.type || '').toLowerCase();
    if (t === 'router')   return 'vm-bg-router';
    if (t === 'switch')   return 'vm-bg-switch';
    if (t === 'server')   return 'vm-bg-server';
    if (t === 'firewall') return 'vm-bg-firewall';
    if (t === 'client')   return 'vm-bg-client';
    return 'vm-bg-generic';
  }

  function vmIconClass(vm){
    const t = (vm?.type || '').toLowerCase();
    if (t === 'router')   return 'vm-icon-router';
    if (t === 'switch')   return 'vm-icon-switch';
    if (t === 'server')   return 'vm-icon-server';
    if (t === 'firewall') return 'vm-icon-firewall';
    if (t === 'client')   return 'vm-icon-client';
    return 'vm-icon-generic';
  }

  function ensureSlotBg(side){
    const slot = (side === 'a')
      ? slotABox.closest('.tunnel-slot')
      : slotBBox.closest('.tunnel-slot');

    const sel = selection[side];
    if (!slot){
      return;
    }
    // сброс
    slot.classList.remove('with-bg');
    slot.style.backgroundImage = '';

    if (!sel) return;

    if (sel.kind === 'office'){
      const off = state.offices.find(o => o.id === sel.officeId);
      const cover = Number(off?.coverIndex || 1);
      slot.classList.add('with-bg');
      slot.style.backgroundImage = `url('../custom/img/office_${cover}.png')`;
    } else if (sel.kind === 'link'){
      if (sel.linkType === 'ISP'){
        slot.classList.add('with-bg');
        slot.style.backgroundImage = "url('../custom/img/isp.png')";
      } else if (sel.linkType === 'EMach'){
        slot.classList.add('with-bg');
        slot.style.backgroundImage = "url('../custom/img/Emach.png')";
      }
    }
  }

  // ---------- рендер содержимого слота ----------
  function renderSlot(side){
    const box    = side === 'a' ? slotABox : slotBBox;
    const sel    = selection[side];
    const parent = box.closest('.tunnel-slot');

    box.innerHTML = '';
    ensureSlotBg(side);

    const inner = document.createElement('div');
    inner.className = 'tunnel-slot-content';

    if (!sel){
      const ph = document.createElement('div');
      ph.className = 'slot-placeholder';
      ph.textContent = 'Перетащите узел сюда';
      inner.appendChild(ph);
      box.appendChild(inner);
      return;
    }

    const title = document.createElement('div');
    title.className = 'tunnel-endpoint-title';

    const kind = document.createElement('div');
    kind.className = 'tunnel-endpoint-kind';

    if (sel.kind === 'office'){
      const off = state.offices.find(o => o.id === sel.officeId);
      title.textContent = off ? off.name : sel.officeId;
      kind.textContent  = 'Офис';
    } else {
      const link = (state.links || []).find(l => l.id === sel.linkId);
      title.textContent = link ? (link.name || link.type) : sel.linkId;
      kind.textContent  = (sel.linkType === 'ISP' ? 'Провайдер (ISP)' : 'Внешняя машина (EMach)');
    }

    inner.appendChild(title);
    inner.appendChild(kind);

    // Если офис — показываем его ВМ большими карточками
if (sel.kind === 'office'){
  const off = state.offices.find(o => o.id === sel.officeId);
  const vms = (off?.vms || []);
  const vmList = document.createElement('div');
  vmList.className = 'tunnel-vm-list';

  if (!vms.length){
    const msg = document.createElement('div');
    msg.className = 'muted small';
    msg.textContent = 'В этом офисе нет ВМ.';
    vmList.appendChild(msg);
  } else {
    vms.forEach(vm => {
      const card = document.createElement('div');
      card.className = 'tunnel-vm-card ' + vmBgClass(vm);

      // помечаем выбранную ВМ
      if (String(sel.vmId || '') === String(vm.id)){
        card.classList.add('selected');
      }

      const label = document.createElement('div');
      label.className = 'tunnel-vm-card-label';

      const nameEl = document.createElement('div');
      nameEl.className = 'tunnel-vm-card-name';
      nameEl.textContent = vmDisplayName(vm);  // r-dt, gw-core и т.п.

      const kindEl = document.createElement('div');
      kindEl.className = 'tunnel-vm-card-kind';
      // можно подсказать тип
      kindEl.textContent = (vm.type ? vm.type : 'VM') + (vm.domain ? ` · ${vm.domain}` : '');

      label.appendChild(nameEl);
      label.appendChild(kindEl);
      card.appendChild(label);

      card.onclick = () => {
        sel.vmId = vm.id;
        renderSlot(side); // обновляем выделение, подсветку
      };

      vmList.appendChild(card);
    });
  }

  inner.appendChild(vmList);
}


    box.appendChild(inner);

    if (parent){
      parent.classList.remove('drag-over');
    }
  }

  // ---------- источник узлов (левая колонка) ----------
  srcBox.innerHTML = '';

  function makeNode(data){
    const node = document.createElement('div');
    node.className = 'tunnel-node';
    node.draggable = true;

    const icon = document.createElement('div');
    icon.className = 'tunnel-node-icon ' + (
      data.kind === 'office'
        ? 'office'
        : data.linkType === 'ISP'
          ? 'isp'
          : 'emach'
    );

    const textWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'tunnel-node-title';
    title.textContent = data.title;

    const sub = document.createElement('div');
    sub.className = 'tunnel-node-sub';
    sub.textContent = data.subtitle;

    textWrap.appendChild(title);
    textWrap.appendChild(sub);

    node.appendChild(icon);
    node.appendChild(textWrap);

    node.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify(data));

      node.classList.add('dragging');
      document.body.classList.add('tunnel-drag-active');

      // чтобы иконка перетаскивания была "как карточка"
      if (e.dataTransfer.setDragImage) {
        const rect = node.getBoundingClientRect();
        e.dataTransfer.setDragImage(node, rect.width / 2, rect.height / 2);
      }
    });

    node.addEventListener('dragend', () => {
      node.classList.remove('dragging');
      document.body.classList.remove('tunnel-drag-active');
    });

    return node;
  }

  // Офисы
  (state.offices || []).forEach(off => {
    srcBox.appendChild(makeNode({
      kind: 'office',
      officeId: off.id,
      title: off.name,
      subtitle: 'Офис'
    }));
  });

  // Внешние машины (ISP + EMach)
  (state.links || [])
    .filter(l => l.type === 'ISP' || l.type === 'EMach')
    .forEach(l => {
      srcBox.appendChild(makeNode({
        kind: 'link',
        linkId: l.id,
        linkType: l.type,
        title: l.name || l.type,
        subtitle: (l.type === 'ISP' ? 'Провайдер (ISP)' : 'Внешняя машина (EMach)')
      }));
    });

  // ---------- drag&drop для СЛОТОВ (вся область) ----------
  const slotA = slotABox.closest('.tunnel-slot');
  const slotB = slotBBox.closest('.tunnel-slot');

  function makeSlotDroppable(slotEl, side){
    if (!slotEl) return;

    slotEl.addEventListener('dragover', e => {
      e.preventDefault();
      slotEl.classList.add('drag-over');
    });

    slotEl.addEventListener('dragleave', e => {
      // чтобы не мигало, проверим, что реально уходим из слота
      if (!slotEl.contains(e.relatedTarget)) {
        slotEl.classList.remove('drag-over');
      }
    });

    slotEl.addEventListener('drop', e => {
      e.preventDefault();
      slotEl.classList.remove('drag-over');

      let payload = null;
      try {
        payload = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch {}

      if (!payload) return;

      if (payload.kind === 'office'){
        selection[side] = {
          kind: 'office',
          officeId: payload.officeId,
          vmId: null
        };
      } else if (payload.kind === 'link'){
        selection[side] = {
          kind: 'link',
          linkId: payload.linkId,
          linkType: payload.linkType
        };
      }

      renderSlot(side);
    });
  }

  makeSlotDroppable(slotA, 'a');
  makeSlotDroppable(slotB, 'b');

  // initial
  selection.a = null;
  selection.b = null;
  renderSlot('a');
  renderSlot('b');
  cidrInput.value = '';

        // ---------- создание туннеля ----------
  btnCreate.onclick = () => {
    try{
      const left  = selection.a;
      const right = selection.b;
      const cidr  = cidrInput.value.trim();

      if (!left || !right){
        throw new Error('Нужно выбрать обе стороны туннеля (A и B).');
      }
      if (!cidr){
        throw new Error('Укажите подсеть туннеля (CIDR).');
      }

      const leftIsOffice  = left.kind === 'office';
      const rightIsOffice = right.kind === 'office';
      const leftIsLink    = left.kind === 'link';
      const rightIsLink   = right.kind === 'link';

      // хотя бы одна сторона — офис (там живёт tunnel.0)
      if (!leftIsOffice && !rightIsOffice){
        throw new Error('Хотя бы одна сторона туннеля должна быть офисом.');
      }

      // для офисов обязательна выбранная ВМ
      if (leftIsOffice && !left.vmId){
        throw new Error('Для стороны A (офис) нужно выбрать ВМ.');
      }
      if (rightIsOffice && !right.vmId){
        throw new Error('Для стороны B (офис) нужно выбрать ВМ.');
      }

      const offA = leftIsOffice  ? state.offices.find(o => o.id === left.officeId)  : null;
      const offB = rightIsOffice ? state.offices.find(o => o.id === right.officeId) : null;
      if (leftIsOffice  && !offA) throw new Error('Офис A не найден.');
      if (rightIsOffice && !offB) throw new Error('Офис B не найден.');

      const ci = cidrInfo(cidr);
      if (ci.usable < 2){
        throw new Error('Подсеть слишком маленькая для туннеля. Рекомендуется /30.');
      }

      const ipA = intToIp(ci.first);
      const ipB = intToIp(ci.first + 1);

      // --- сторона A ---
      const sideA = { ip: ipA, if: 'tunnel.0' };
      let coverA  = 1;
      let nameA   = 'A';
      let extA    = null;

      if (leftIsOffice){
        sideA.officeId = offA.id;
        sideA.node     = offA.id;     // совместимость со страницей /lounge/link
        coverA         = Number(offA.coverIndex || 1);
        nameA          = offA.name || offA.id;
      } else if (leftIsLink){
        extA = (state.links || []).find(l => l.id === left.linkId && (l.type === 'ISP' || l.type === 'EMach'));
        if (!extA) throw new Error('Внешний узел A (ISP/EMach) не найден.');
        sideA.linkId   = extA.id;
        sideA.linkType = extA.type;
        sideA.node     = extA.id;
        nameA          = extA.name || extA.id;
      }

      // --- сторона B ---
      const sideB = { ip: ipB, if: 'tunnel.0' };
      let coverB  = 2;
      let nameB   = 'B';
      let extB    = null;

      if (rightIsOffice){
        sideB.officeId = offB.id;
        sideB.node     = offB.id;
        coverB         = Number(offB.coverIndex || 2);
        nameB          = offB.name || offB.id;
      } else if (rightIsLink){
        extB = (state.links || []).find(l => l.id === right.linkId && (l.type === 'ISP' || l.type === 'EMach'));
        if (!extB) throw new Error('Внешний узел B (ISP/EMach) не найден.');
        sideB.linkId   = extB.id;
        sideB.linkType = extB.type;
        sideB.node     = extB.id;
        nameB          = extB.name || extB.id;
      }

      const link = {
        id: 'L_' + Date.now(),
        type: tunnelType,              // 'GRE' / 'IPIP'
        cidr,
        a: sideA,
        b: sideB,
        cover: { a: coverA, b: coverB },
        name: `${nameA} ⇄ ${nameB}`,
        endpoints: {
          a: leftIsOffice  ? { vmId: left.vmId,  iface: 'tunnel.0' } : null,
          b: rightIsOffice ? { vmId: right.vmId, iface: 'tunnel.0' } : null
        }
      };

      state.links.push(link);

      // --- tunnel.0 на офисных ВМ ---
      if (leftIsOffice){
        const vmA = (offA.vms || []).find(v => String(v.id) === String(left.vmId));
        if (vmA) ensureTunnelIface(vmA, ipA, cidr, link.id);
      }
      if (rightIsOffice){
        const vmB = (offB.vms || []).find(v => String(v.id) === String(right.vmId));
        if (vmB) ensureTunnelIface(vmB, ipB, cidr, link.id);
      }

      // --- интерфейсы у ISP / EMach ---
      function attachTunnelIfaceToExternal(ext, ip){
        if (!ext) return;
        ext.tunnelIfaces ||= [];
        let nic = ext.tunnelIfaces.find(n => n.tunnelId === link.id);
        if (!nic){
          const idx = ext.tunnelIfaces.length;
          nic = { tunnelId: link.id, name: 'tun' + idx };
          ext.tunnelIfaces.push(nic);
        }
        nic.cidr = cidr;
        nic.ip   = ip;
      }

      if (extA) attachTunnelIfaceToExternal(extA, ipA);
      if (extB) attachTunnelIfaceToExternal(extB, ipB);

      saveState(state);
      closeModal('modalTunnelWizard');
      renderLinks();
      showResult(true, `${tunnelType}-туннель создан между ${nameA} и ${nameB}.`);

    } catch(e){
      showResult(false, e.message || 'Не удалось создать туннель.');
    }
  };




  openModal('modalTunnelWizard');
}


// =========================
// VLAN EDITOR (TILES + POPUPS)
// =========================

// список доступных иконок (папка /lounge/custom/img/vlan-icons/)
// потом заменишь на свой список
const VLAN_CUSTOM_ICONS = [
  'wall.png',
  'robot.png',
  'processor.png',
  'power-supply.png',
  'pattern.png',
  'interface.png',
  'gear.png',
  'face-recognition.png',
  'conveyor.png',
  'code.png',
  'access.png',
  'cctv-camera.png'
];



// удалить кастомное название из сохранений пользователя
function removeGlobalVlanRole(name){
  const role = String(name || '').trim();
  if (!role) return false;

  const list = getGlobalVlanRoles();
  const idx = list.indexOf(role);
  if (idx === -1) return false;

  // не даём удалить дефолтные роли
  if (DEFAULT_VLAN_ROLES.includes(role)) return false;

  list.splice(idx, 1);
  localStorage.setItem(VLAN_ROLES_KEY, JSON.stringify(list));
  return true;
}

function isDefaultRole(role){
  return DEFAULT_VLAN_ROLES.includes(String(role || '').trim());
}

function makeVlanId(){
  return 'v_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

function normalizeVlan(v){
  v ||= {};
  if (!v.id) v.id = makeVlanId();

  // role: либо один из дефолтов, либо кастом-строка
  v.role = String(v.role || 'Клиенты').trim() || 'Клиенты';

  // name: что показываем пользователю
  if (!v.name) v.name = v.role;

  // isCustom: кастомным считаем всё, что НЕ один из 4-х
  v.isCustom = !isDefaultRole(v.role);

  // icon: только для кастомных (для дефолтов — берём VLAN_ROLE_META)
  if (!v.isCustom) {
    v.icon = null;
  }

  // priority: если не задан — позже выставим по порядку
  if (v.priority == null) v.priority = null;

  // vid
  if (v.vid != null) v.vid = Number(v.vid) || null;

  return v;
}

function vlanIconPath(v){
  if (v?.isCustom && v?.icon) {
    return `img/vlan-icons/${v.icon}`;
  }
  return VLAN_ROLE_META[v?.role]?.icon || 'img/client.png';
}


function isVlanValid(v){
  if (!v) return false;
  if (!v.name || !String(v.name).trim()) return false;
  if (!Number.isFinite(Number(v.vid)) || Number(v.vid) < 1 || Number(v.vid) > 4094) return false;
  if (v.isCustom && !v.icon) return false;
  return true;
}

function allVlansValid(office){
  const arr = office?.vlans || [];
  if (!arr.length) return false;
  return arr.every(isVlanValid);
}

let vlanEditorOffice = null;
let vlanSelectedId = null;

function openVlanEditor(office){
  vlanEditorOffice = office;
  ensurePlannerModals(); // оставляем — пусть создаёт прочие модалки (НЕ VLAN)

  const modal = document.getElementById('modalVlanEditor');
  const grid  = document.getElementById('vlanTileGrid');

  const empty = document.getElementById('vlanEditEmpty');
  const pane  = document.getElementById('vlanEditPane');

  const selName = document.getElementById('vlanNameSelect');
  const btnNameAdd = document.getElementById('btnVlanNameAdd');

  const customBox  = document.getElementById('vlanCustomNameBox');
  const customInp  = document.getElementById('vlanCustomNameInput');
  const btnNameRemove = document.getElementById('btnVlanNameRemove');

  const vidInp  = document.getElementById('vlanVidInput');
  const btnIcon = document.getElementById('btnVlanIcon');

  const btnPriority = document.getElementById('btnVlanPriority');
  const btnSave = document.getElementById('btnSaveVlanEditor');

  if (!modal || !grid || !empty || !pane || !selName || !btnNameAdd ||
      !customBox || !customInp || !btnNameRemove || !vidInp || !btnIcon ||
      !btnPriority || !btnSave) {
    showResult(false, 'Редактор VLAN: DOM повреждён.');
    return;
  }

  office.vlans ||= [];
  office.vlans = office.vlans.map(normalizeVlan);

  // если не было приоритета — зададим по текущему порядку
  office.vlans.forEach((v, i) => {
    if (v.priority == null) v.priority = i + 1;
  });

  function getSelected(){
    return (office.vlans || []).find(v => v.id === vlanSelectedId) || null;
  }

  function setSelected(id){
    vlanSelectedId = id;
    render();
  }

  function updatePriorityButton(){
    btnPriority.disabled = !allVlansValid(office);
  }

  function updateSaveButton(){
    // сохранять можно, даже если VLAN невалидны — но по ТЗ логичнее запретить
    btnSave.disabled = !allVlansValid(office);
  }

  function fillNameSelect(selectedVlan){
    const globals = getGlobalVlanRoles(); // включает дефолты + сохранённые кастомные
    const defaults = DEFAULT_VLAN_ROLES;
    const customs = globals.filter(x => !defaults.includes(x));

    selName.innerHTML = '';

    // дефолты всегда первыми
    defaults.forEach(r => {
      const o = document.createElement('option');
      o.value = r;
      o.textContent = r;
      selName.appendChild(o);
    });

    // кастомные из сохранений
    if (customs.length){
      const sep = document.createElement('option');
      sep.disabled = true;
      sep.textContent = '────────';
      selName.appendChild(sep);

      customs.forEach(r => {
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r;
        selName.appendChild(o);
      });
    }

    // выставляем значение
    const current = selectedVlan?.role || 'Клиенты';
    // если роль отсутствует в списке — добавим её как временную опцию (на случай старых данных)
    const has = [...selName.options].some(o => o.value === current);
    if (!has) {
      const o = document.createElement('option');
      o.value = current;
      o.textContent = current;
      selName.appendChild(o);
    }
    selName.value = current;
  }

  function showCustomInput(show){
    if (!show) {
      customBox.style.display = 'none';
      customInp.value = '';
      return;
    }
    customBox.style.display = '';
    customBox.classList.remove('code-appear');
    void customBox.offsetWidth; // reflow
    customBox.classList.add('code-appear');
  }

  function applyVlanToForm(v){
    if (!v) return;

    fillNameSelect(v);

    // custom mode?
    const custom = v.isCustom;
    showCustomInput(custom);
    if (custom) {
      makeCosmicBackgroundFor(customBox, 'vlanCodeBg');
    }


    // кубик справа: если кастомного нет — это “+”, если кастом есть — всё равно “+” (по ТЗ)
    btnNameAdd.disabled = false;

    // левый кубик “×” показываем только если выбран кастом (роль не дефолт)
    btnNameRemove.style.display = custom ? '' : 'none';

    // значение кастом-инпута
    customInp.value = custom ? (v.role || '') : '';

    // VID
    vidInp.value = v.vid ?? '';

    // иконка доступна только для кастомных
    btnIcon.disabled = !custom;
  }

  function render(){
    // сетка VLAN-плиток
    grid.innerHTML = '';

    const vlans = office.vlans || [];

    // плитки VLAN
    vlans.forEach(v => {
      const tile = document.createElement('div');
tile.className = 'vlan-tile' + (v.id === vlanSelectedId ? ' active' : '');
tile.dataset.id = v.id;


      const icon = vlanIconPath(v);

      tile.innerHTML = `
  <div class="vlan-tile-bg" style="background-image:url('${icon}')"></div>

  <button class="vlan-tile-del" title="Удалить VLAN">×</button>

  <div class="vlan-tile-top">
    <div class="vlan-tile-name">${escapeHtml(v.name || v.role)}</div>
    <div class="vlan-tile-vid">VID ${escapeHtml(String(v.vid ?? '—'))}</div>
  </div>
`;

    const delBtn = tile.querySelector('.vlan-tile-del');
delBtn.onclick = (e) => {
  e.stopPropagation(); // чтобы не выбрать VLAN
  deleteVlanById(office, v.id);
  render();
};



      tile.onclick = () => setSelected(v.id);

      grid.appendChild(tile);
    });

    // плитка “+”
    const plus = document.createElement('div');
    plus.className = 'vlan-tile plus';
    plus.innerHTML = `<div class="vlan-plus">+</div>`;
    plus.onclick = () => {
      const nv = normalizeVlan({
        id: makeVlanId(),
        role: 'Клиенты',
        name: 'Клиенты',
        vid: null,
        isCustom: false,
        icon: null,
        priority: (office.vlans?.length || 0) + 1
      });
      office.vlans.push(nv);
      saveState(state);
      setSelected(nv.id);
    };
    grid.appendChild(plus);

    // панель справа
    const sel = getSelected();
    if (!sel) {
      empty.style.display = '';
      pane.style.display = 'none';
    } else {
      empty.style.display = 'none';
      pane.style.display = '';
      applyVlanToForm(sel);
    }

    updatePriorityButton();
    updateSaveButton();
    enableVlanTileDnD(grid, office);
  }

  function enableVlanTileDnD(container, office) {
  let dragEl = null;

  [...container.querySelectorAll('.vlan-tile:not(.plus)')].forEach(tile => {
    tile.draggable = true;

    tile.ondragstart = () => {
      dragEl = tile;
      tile.classList.add('dragging');
    };

    tile.ondragend = () => {
      tile.classList.remove('dragging');
      dragEl = null;
      [...container.children].forEach(t => t.classList.remove('drag-over'));
    };

    tile.ondragover = e => {
      e.preventDefault();
      tile.classList.add('drag-over');
    };

    tile.ondragleave = () => {
      tile.classList.remove('drag-over');
    };

    tile.ondrop = e => {
      e.preventDefault();
      tile.classList.remove('drag-over');
      if (!dragEl || dragEl === tile) return;

      const fromId = dragEl.dataset.id;
      const toId   = tile.dataset.id;

      const arr = office.vlans;
      const fromIdx = arr.findIndex(v => v.id === fromId);
      const toIdx   = arr.findIndex(v => v.id === toId);

      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);

      // обновляем priority
      arr.forEach((v, i) => v.priority = i + 1);

      saveState(state);
      render();
    };
  });
}


  // ===== handlers формы =====

  selName.onchange = () => {
    const v = getSelected();
    if (!v) return;

    const value = String(selName.value || '').trim();

    // дефолтные роли
    if (isDefaultRole(value)) {
      v.role = value;
      v.name = value;
      v.isCustom = false;
      v.icon = null;
      saveState(state);
      render();
      return;
    }

    // кастомное из сохранений
    v.role = value;
    v.name = value;
    v.isCustom = true;
    // иконку не трогаем, если уже была; иначе пусть выберет
    saveState(state);
    render();
  };

  btnNameAdd.onclick = () => {
    // кубик с плюсом: показать кастом-инпут и добавить новое имя в глобальный список
    const v = getSelected();
    if (!v) return;

    // если уже кастом — просто фокус на инпут
    if (v.isCustom) {
      showCustomInput(true);
      customInp.focus();
      return;
    }

    // переводим в кастом-режим
    v.isCustom = true;
    v.role = '';
    v.name = '';
    v.icon = null;
    saveState(state);
    render();

    showCustomInput(true);
    customInp.focus();
  };

  customInp.oninput = () => {
    const v = getSelected();
    if (!v) return;

    const val = String(customInp.value || '').trim();
    v.role = val;
    v.name = val;
    saveState(state);

    updatePriorityButton();
    updateSaveButton();
  };

  customInp.onblur = () => {
    // при уходе с инпута — если имя есть, сохраняем его в глобальные роли
    const v = getSelected();
    if (!v) return;

    const val = String(customInp.value || '').trim();
    if (!val) return;

    // добавляем в глобальные роли
    addGlobalVlanRole(val);

    // обновим select и выставим выбор
    v.role = val;
    v.name = val;
    v.isCustom = true;

    saveState(state);
    render();
  };

  btnNameRemove.onclick = () => {
    const v = getSelected();
    if (!v) return;

    const cur = String(v.role || '').trim();
    if (!cur) return;

    if (!confirm('Подтверждаете удаление кастомного названия VLAN?')) return;

    // удалить из сохранений пользователя
    const removed = removeGlobalVlanRole(cur);

    // сбрасываем VLAN на дефолт
    v.role = 'Клиенты';
    v.name = 'Клиенты';
    v.isCustom = false;
    v.icon = null;

    saveState(state);
    render();

    // если не удалилось (например, пытались удалить дефолт) — просто молча игнорируем
    void removed;
  };

  vidInp.oninput = () => {
    const v = getSelected();
    if (!v) return;

    const n = Number(vidInp.value);
    v.vid = Number.isFinite(n) ? n : null;
    saveState(state);

    updatePriorityButton();
    updateSaveButton();
  };

  btnIcon.onclick = () => {
    const v = getSelected();
    if (!v || !v.isCustom) return;
    openVlanIconPicker(v);
  };

  btnPriority.onclick = () => {
    if (!allVlansValid(office)) return;
    openVlanPriorityModal(office);
  };

  btnSave.onclick = () => {
    // финальная валидация
    if (!allVlansValid(office)) {
      showResult(false, 'Заполните VLAN (название, VID, иконка для кастомных) перед сохранением.');
      return;
    }

    // нормализуем priority: если пользователь не заходил в DnD — оставляем как есть,
    // иначе rebuildIpam сортирует по priority
    rebuildIpam(office);
    saveState(state);

    closeModal('modalVlanEditor');
    renderDetails(office.id);
    renderOffices();
    showResult(true, 'VLAN сохранены.');
  };

  // initial state
  if (office.vlans.length && !vlanSelectedId) vlanSelectedId = office.vlans[0].id;

  render();
  openModal('modalVlanEditor');
}

function deleteVlanById(office, vlanId){
  const idx = (office.vlans || []).findIndex(v => v.id === vlanId);
  if (idx === -1) return;

  if (!confirm('Удалить VLAN?')) return;

  office.vlans.splice(idx, 1);

  // если удалили выбранный — сбрасываем выбор
  if (vlanSelectedId === vlanId) {
    vlanSelectedId = office.vlans[0]?.id || null;
  }

  rebuildIpam(office);
  saveState(state);
}


// ===== icon picker =====

let __iconPickTarget = null;

function openVlanIconPicker(vlan){
  const grid = document.getElementById('vlanIconGrid');
  const prev = document.getElementById('vlanIconPreview');
  const name = document.getElementById('vlanIconName');
  const btn  = document.getElementById('btnSaveVlanIcon');

  if (!grid || !prev || !name || !btn){
    showResult(false,'Икон-пикер недоступен.');
    return;
  }

  __iconPickTarget = vlan;
  let selected = vlan.icon || null;

  function render(){
    grid.innerHTML = '';
    VLAN_CUSTOM_ICONS.forEach(fn=>{
      const it = document.createElement('div');
      it.className = 'icon-item' + (fn===selected?' active':'');
      it.style.backgroundImage = `url('img/vlan-icons/${fn}')`;
      it.onclick = ()=>{
        selected = fn;
        prev.style.backgroundImage = it.style.backgroundImage;
        name.textContent = fn;
        render();
      };
      grid.appendChild(it);
    });
  }

  prev.style.backgroundImage = selected
    ? `url('img/vlan-icons/${selected}')`
    : '';
  name.textContent = selected || '—';

  render();

  btn.onclick = ()=>{
    if (!__iconPickTarget) return;

    __iconPickTarget.isCustom = true;
    __iconPickTarget.icon = selected || null;

    saveState(state);
    closeModal('modalVlanIconPicker');

    // обновим обе области (правая панель + кнопки/валидность редактора)
    if (vlanEditorOffice?.id) {
      renderDetails(vlanEditorOffice.id);
    }
    // просто переоткроем редактор на текущем офисе, чтобы обновить валидность/иконку
    if (vlanEditorOffice) openVlanEditor(vlanEditorOffice);
  };

  openModal('modalVlanIconPicker');
}


// ===== priority popup (DnD) =====

function openVlanPriorityModal(office){
  const modal = document.getElementById('modalVlanPriority');
  const list  = document.getElementById('vlanPriorityList');
  const btnSave = document.getElementById('btnSaveVlanPriority');

  if (!modal || !list || !btnSave){
    showResult(false, 'Модалка приоритета VLAN недоступна.');
    return;
  }

  // рендер списка по текущему порядку массива
  function render(){
    list.innerHTML = '';

    (office.vlans || []).forEach((v, idx) => {
      const row = document.createElement('div');
      row.className = 'vlan-prio-item';
      row.draggable = true;
      row.dataset.i = String(idx);

      const icon = vlanIconPath(v);

      row.innerHTML = `
        <div class="vlan-prio-drag">⋮⋮</div>
        <div class="vlan-prio-icon" style="background-image:url('${icon}')"></div>
        <div class="vlan-prio-meta">
          <div class="vlan-prio-name">${escapeHtml(v.name || v.role || 'VLAN')}</div>
          <div class="vlan-prio-sub">VID ${escapeHtml(String(v.vid ?? '—'))}</div>
        </div>
      `;

      list.appendChild(row);
    });

    enableVlanPriorityDnD(list, office);
  }

  render();

  btnSave.onclick = () => {
    // чем выше — тем выше приоритет выдачи IP
    (office.vlans || []).forEach((v, i) => {
      v.priority = i + 1;
    });

    rebuildIpam(office);
    saveState(state);

    closeModal('modalVlanPriority');
    renderDetails(office.id);
    showResult(true, 'Приоритет VLAN сохранён.');
  };

  openModal('modalVlanPriority');
}

function enableVlanPriorityDnD(container, office){
  let dragEl = null;

  const items = () => container.querySelectorAll('.vlan-prio-item');

  items().forEach(item => {
    item.ondragstart = () => {
      dragEl = item;
      item.classList.add('dragging');
    };

    item.ondragend = () => {
      item.classList.remove('dragging');
      dragEl = null;
      items().forEach(x => x.classList.remove('dragover'));
    };

    item.ondragover = (e) => {
      e.preventDefault();
      item.classList.add('dragover');
    };

    item.ondragleave = () => item.classList.remove('dragover');

    item.ondrop = (e) => {
      e.preventDefault();
      item.classList.remove('dragover');
      if (!dragEl || dragEl === item) return;

      const from = Number(dragEl.dataset.i);
      const to   = Number(item.dataset.i);

      const arr = office.vlans || [];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);

      // перерисовать модалку (чтобы dataset.i пересчитался)
      openVlanPriorityModal(office);
    };
  });
}



/* =========================
   Инициализация
========================= */
renderOffices();
renderLinks();


// === Восстановление активного офиса после перезагрузки ===
window.addEventListener('DOMContentLoaded', () => {
  const savedId = localStorage.getItem('selectedOffice');
    if (savedId) {
      selectedId = savedId;
      renderDetails(savedId);
      const card = document.querySelector(`.office-card[data-id="${savedId}"]`);
      if (card) card.classList.add('active');
    }
});