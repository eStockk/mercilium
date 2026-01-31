// vm-create-graphic.js
// GUI создание VM: шаг 1 (тип) -> шаг 2 (конфигурация)

(function () {
  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // Кнопка ADD_VM из office.html
  const btnAddVm = qs("#btnAddVM");


  /* ---------------- new modals (our) ---------------- */
  function ensureModal(id, extraClass = "") {
    let modal = qs(`#${id}`);
    if (modal) return modal;

    modal = el("div", `modal ${extraClass}`.trim(), "");
    modal.id = id;
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="modal__backdrop" data-close></div>
      <div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <button class="modal__close" data-close aria-label="Закрыть">✕</button>
        <div class="modal__head">
          <h2 class="modal__title" id="${id}-title"></h2>
        </div>
        <div class="modal__body"></div>
        <div class="modal__foot"></div>
      </div>
    `;

    document.body.appendChild(modal);

    qsa("[data-close]", modal).forEach(btn => {
      on(btn, "click", () => closeModal(modal));
    });

    return modal;
  }

  function openModal(modal) {
    if (modal.contains(document.activeElement)) document.body.focus();
    modal.classList.add("active", "is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal(modal) {
    if (modal.contains(document.activeElement)) document.body.focus();
    modal.classList.remove("active", "is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!qs(".modal.active, .modal.is-open")) {
      document.body.classList.remove("modal-open");
    }
  }

  /* ---------------- STEP 1: Type select ---------------- */
  const typeModal = ensureModal("modalVmType", "modal-vmtype");
  qs(".modal__title", typeModal).textContent = "Выбор типа машины";

  const TYPES = [
    { key: "router",   label: "Роутер",   icon: "../custom/img/router.svg" },
    { key: "server",   label: "Сервер",   icon: "../custom/img/server.svg" },
    { key: "client",   label: "Клиент",   icon: "../custom/img/client.svg" },
    { key: "switch",   label: "Свитч",    icon: "../custom/img/switch.svg" },
    { key: "firewall", label: "Фаерволл", icon: "../custom/img/firewall.svg" },
  ];

  function typeDescription(key){
    switch(key){
      case "router": return `
        Маршрутизатор ядра сети.<br>
        • L3 маршрутизация между VLAN/подсетями<br>
        • Uplink WAN + Trunk вниз в офис<br>
        • NAT, QoS, VPN-туннели<br>
        • Критичный узел топологии
      `;
      case "firewall": return `
        Межсетевой экран периметра.<br>
        • Фильтрация L3–L7, IDS/IPS<br>
        • Сегментация зон безопасности<br>
        • Логи и мониторинг инцидентов<br>
        • Стоит между WAN и LAN
      `;
      case "switch": return `
        Коммутатор доступа/агрегации.<br>
        • L2 связность внутри офиса<br>
        • VLAN trunk/access порты<br>
        • STP/LACP/зеркалирование<br>
        • Главная точка разводки линий
      `;
      case "server": return `
        Виртуальный сервер сервисов.<br>
        • Хостит DB/API/WEB/Storage<br>
        • Статический IP, фиксированные роли<br>
        • Масштабируется по CPU/RAM/IO<br>
        • Сердце бизнес-логики офиса
      `;
      case "client": return `
        Рабочая станция пользователя.<br>
        • Доступ к ресурсам LAN/VPN<br>
        • Обычно DHCP, иногда static<br>
        • Конечный потребитель сервисов<br>
        • Подключение через access-VLAN
      `;
      default: return `Описание типа машины.`;
    }
  }

  qs(".modal__body", typeModal).innerHTML = `
    <div class="vm-type-grid">
      ${TYPES.map(t => `
        <button class="vm-type-card" data-type="${t.key}">
          <div class="vm-type-card__inner">
            <div class="vm-type-card__face vm-type-card__front">
              <div class="vm-type-card__bgicon" style="background-image:url('${t.icon}')"></div>
              <div class="vm-type-card__footer">
                <span class="vm-type-card__label">${t.label}</span>
              </div>
            </div>
            <div class="vm-type-card__face vm-type-card__back">
              <div class="vm-type-card__backtitle">${t.label}</div>
              <div class="vm-type-card__backtext">${typeDescription(t.key)}</div>
            </div>
          </div>
        </button>
      `).join("")}
    </div>
  `;

  qs(".modal__foot", typeModal).innerHTML = `
    <div class="steps steps--fancy" data-step="1">
      <div class="steps__line"></div>
      <div class="steps__line-active"></div>
      <div class="steps__dot is-active">1</div>
      <div class="steps__dot">2</div>
      <div class="steps__dot">3</div>
      <div class="steps__dot">4</div>
      <div class="steps__dot">5</div>
    </div>

    <div class="modal-actions">
      <button class="btn ghost" data-close>Отмена</button>
      <button id="vmTypeNext" class="btn violet" disabled>Далее</button>
    </div>
  `;

  let selectedType = null;

  qsa(".vm-type-card", typeModal).forEach(card => {
    on(card, "click", () => {
      selectedType = card.dataset.type;
      sessionStorage.setItem("vm_create_type", selectedType);

      qsa(".vm-type-card", typeModal).forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");

      const nextBtn = qs("#vmTypeNext", typeModal);
      nextBtn.disabled = false;

      updateSteps(typeModal, 1);
    });
  });

  on(qs("#vmTypeNext", typeModal), "click", () => {
    if (!selectedType) return;
    closeModal(typeModal);
    openConfigStep(selectedType);
  });

  /* ---------------- STEP 2: Config modal ---------------- */
  const configModal = ensureModal("modalVmConfig", "modal-vmconfig");

  const DISTROS = {
    altServer:      { key:"altServer",      label:"Alt Server",      icon:"../img/altServer.png" },
    altWorkstation: { key:"altWorkstation", label:"Alt Workstation", icon:"../img/altServer.png" },
    debian:         { key:"debian",         label:"Debian",          icon:"../img/debian.svg" },
    ecorouter:      { key:"ecorouter",      label:"EcoRouter",       icon:"../img/ecorouter.png" },
    pfsense:        { key:"pfsense",        label:"pfSense",         icon:"../img/pfSense.png" },
    ideco:          { key:"ideco",          label:"Ideco",           icon:"../img/ideco.png" },
  };

  const TYPE_TO_DISTROS = {
    router:   ["altServer","debian","ecorouter"],
    switch:   ["altServer","debian","ecorouter"],
    server:   ["altServer","altWorkstation","debian"],
    firewall: ["ideco","pfsense"],
    client:   ["altServer","altWorkstation","debian"],
  };

  function openConfigStep(typeKey){
    const t = TYPES.find(x => x.key === typeKey);
    const distroKeys = TYPE_TO_DISTROS[typeKey] || [];

    qs(".modal__title", configModal).textContent = "Конфигурация машины";

    qs(".modal__body", configModal).innerHTML = `
      <div class="vm-config">
        <div class="vm-config__left">
          <div class="vm-config__typeicon" style="background-image:url('${t.icon}')"></div>
          <div class="vm-config__typename">${t.label}</div>
        </div>

        <div class="vm-config__right">
          <label class="field">
            <div class="field__label">Название машины <span class="req">*</span></div>
            <input id="vmNameInput" class="field__input" type="text" placeholder="Напр. SRV1-DT" />
            <div id="vmNameErr" class="field__err">Введите название машины</div>
          </label>
          <div class="field">
  <div class="field__label">Domain (опционально)</div>
  <input id="vmcDomain" class="field__input" type="text" placeholder="corp.local / пусто — пропустить">
  <div id="vmcDomainErr" class="field__err">Недопустимый домен (разрешены: a-z, 0-9, точки, дефисы)</div>
</div>


          <div class="section-title">Дистрибутивы</div>

          <div class="distro-grid">
            ${distroKeys.map(k => {
              const d = DISTROS[k];
              return `
  <button class="distro-card" data-distro="${d.key}">
    <div class="distro-card__bg" style="background-image:url('${d.icon}')"></div>
    <div class="scanline"></div>
    <div class="distro-card__label">${d.label}</div>
  </button>
`;

            }).join("")}
          </div>
        </div>
      </div>
    `;

    qs(".modal__foot", configModal).innerHTML = `
      <div class="steps steps--fancy" data-step="2">
        <div class="steps__line"></div>
        <div class="steps__line-active"></div>
        <div class="steps__dot is-done">1</div>
        <div class="steps__dot is-active">2</div>
        <div class="steps__dot">3</div>
        <div class="steps__dot">4</div>
        <div class="steps__dot">5</div>
      </div>

      <div class="modal-actions">
        <button id="vmConfigBack" class="btn ghost">Назад</button>
        <button id="vmConfigNext" class="btn violet" disabled>Далее</button>
      </div>
    `;

    let selectedDistro = null;

const nameInput   = qs("#vmNameInput", configModal);
const nameErr     = qs("#vmNameErr", configModal);

const domainInput = qs("#vmcDomain", configModal);
const domainErr   = qs("#vmcDomainErr", configModal);

const nextBtn     = qs("#vmConfigNext", configModal);


    function validate(){
  const hostname = nameInput.value.trim();
  const domain   = domainInput.value.trim();

  const okName = hostname.length > 0;
  nameErr.style.display = okName ? "none" : "block";

  // domain опциональный: валидируем только если введён
  let okDomain = true;
  if (domain) {
    okDomain = /^[a-zA-Z0-9.-]+$/.test(domain);
  }
  domainErr.style.display = okDomain ? "none" : "block";

  nextBtn.disabled = !(okName && okDomain && selectedDistro);
}


    on(nameInput, "input", () => {
      sessionStorage.setItem("vm_create_name", nameInput.value.trim());
      validate();
    });
    on(domainInput, "input", () => {
  sessionStorage.setItem("vm_create_domain", domainInput.value.trim());
  validate();
});


    qsa(".distro-card", configModal).forEach(card => {
      on(card, "click", () => {
        selectedDistro = card.dataset.distro;
        sessionStorage.setItem("vm_create_distro", selectedDistro);

        qsa(".distro-card", configModal).forEach(c => c.classList.remove("is-selected"));
        card.classList.add("is-selected");

        validate();
      });
    });

    on(qs("#vmConfigBack", configModal), "click", () => {
      closeModal(configModal);
      openModal(typeModal);
      updateSteps(typeModal, 1);
    });

    on(nextBtn, "click", () => {
  validate();
  if (nextBtn.disabled) return;

  closeModal(configModal);

  // Если это свитч — идём в режим Open vSwitch (шаг 3)
  if (typeKey === "switch") {
    openOvsStep(typeKey);
  } else {
    // остальные типы — старый шаг 3 с интерфейсами
    openInterfacesStep(typeKey);
  }
});




    updateSteps(configModal, 2);
    // Универсально и без конфликтов
let officeName;

if (window.office && window.office.name) {
  officeName = window.office.name;
} else {
  officeName =
    document.querySelector("#infoName")?.textContent?.trim() ||
    document.querySelector("#officeTitle")?.textContent?.trim() ||
    "Офис";
}

// Устанавливаем заголовок шага 2
qs("#modalVmConfig .modal__title").textContent =
  `Конфигурация машины | ${officeName}`;

    openModal(configModal);
    validate();
  }

  function updateSteps(modal, step){
    const steps = qs(".steps--fancy", modal);
    if (!steps) return;
    steps.dataset.step = String(step);
    const dots = qsa(".steps__dot", steps);

    dots.forEach((dot, i) => {
      const idx = i + 1;
      dot.classList.toggle("is-active", idx === step);
      dot.classList.toggle("is-done", idx < step);
    });

    // прогресс линия (0..100)
    const activeLine = qs(".steps__line-active", steps);
    const pct = ((step - 1) / (dots.length - 1)) * 100;
    if (activeLine) activeLine.style.width = pct + "%";
  }

    /* ---------------- запуск графического мастера по кнопке ADD_VM ---------------- */
  if (btnAddVm && !btnAddVm.dataset.boundGui) {
    btnAddVm.dataset.boundGui = "1";
    btnAddVm.addEventListener("click", () => {
      // сбрасываем прошлый выбор
      selectedType = null;
      sessionStorage.removeItem("vm_create_type");
      sessionStorage.removeItem("vm_create_name");
      sessionStorage.removeItem("vm_create_distro");
      sessionStorage.removeItem("vm_create_domain");
      sessionStorage.removeItem("vm_create_ifaces");
      sessionStorage.removeItem("vm_create_ovs");

      const nextBtn = qs("#vmTypeNext", typeModal);
      if (nextBtn) nextBtn.disabled = true;

      qsa(".vm-type-card", typeModal).forEach(c => c.classList.remove("is-selected"));

      updateSteps(typeModal, 1);
      openModal(typeModal);
    });
  }

/* ==========================================================
   STEP 3: Interfaces modal
   ========================================================== */

const ifacesModal = ensureModal("modalVmIfaces", "modal-vmifaces");

// === office.js compatibility layer ===
const STORE_KEY = 'lounge_offices_v1';

function loadStateSafe(){
  // Если office.js уже поднял глобальный state – работаем с ним,
  // чтобы list vm сразу видел наши изменения без перезагрузки.
  if (typeof window !== "undefined" && window.state && typeof window.state === "object") {
    return window.state;
  }

  // fallback – читаем из localStorage и одновременно кладём в window.state
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY)) || { offices: [] };
    if (typeof window !== "undefined") {
      window.state = parsed;
    }
    return parsed;
  } catch {
    const empty = { offices: [] };
    if (typeof window !== "undefined") {
      window.state = empty;
    }
    return empty;
  }
}


function getOfficeCtx(){
  const params = new URLSearchParams(location.search);
  const officeId = params.get('id');
  const state = loadStateSafe();
  const office = (state.offices || []).find(o => String(o.id) === String(officeId));
  return { state, office, officeId };
}

function getOfficeNameSafe(){
  const { office } = getOfficeCtx();
  return office?.name
    || document.querySelector("#infoName")?.textContent?.trim()
    || document.querySelector("#officeTitle")?.textContent?.trim()
    || "Офис";
}

function getVlansSafe(){
  const { office } = getOfficeCtx();
  return Array.isArray(office?.vlans) ? office.vlans : [];
}

/* ==========================================================
   IPAM STABLE LAYER (GUI only)
   - preview НЕ подтверждает пул
   - commit подтверждает пул только на "Далее" STEP3
   - rollback снимает подтверждение при "Назад" с STEP4
   - auto-sync учитывает занятые IP во всех VM и закрывает дырки
   ========================================================== */

function preserveTakenBeforeRebuild(office){
  const takenByVid = {};
  if (office?.ipam?.used){
    for (const [vid, u] of Object.entries(office.ipam.used)){
      if (u?.taken) takenByVid[vid] = Array.from(new Set(u.taken));
    }
  }
  return takenByVid;
}

function rebuildIpamPreserve(office){
  const takenByVid = preserveTakenBeforeRebuild(office);
  if (typeof rebuildIpam === "function") rebuildIpam(office);
  office.ipam ||= { ranges: [], used:{} };
  for (const [vid, arr] of Object.entries(takenByVid)){
    office.ipam.used[vid] ||= {};
    office.ipam.used[vid].taken = arr;
  }
}

function calcNextFree(range, takenArr){
  const taken = new Set(takenArr || []);
  for (let ip = range.start; ip <= range.last; ip++){
    if (!taken.has(ip)) return ip;
  }
  return range.last + 1; // нет свободных
}

/** Синхронизируем пул с уже созданными VM:
 *  - собираем все ip из office.vms[].ifaces[]
 *  - кладём в taken
 *  - next = первая свободная внутри диапазона
 */
function ensureIpamConsistency(office){
  if (!office) return;

  rebuildIpamPreserve(office);

  const ranges = office.ipam?.ranges || [];
  if (!ranges.length) return;

  // соберём занятые
  const takenMap = {};
  for (const r of ranges){
    takenMap[r.vid] = new Set(office.ipam.used?.[r.vid]?.taken || []);
  }

  const vms = office.vms || [];
  for (const vm of vms){
    for (const nic of (vm.ifaces || [])){
      if (!nic?.vlanId || !nic.ip) continue;
      const vid = String(nic.vlanId);
      const ipIntVal = (typeof ipToInt === "function") ? ipToInt(nic.ip) : null;
      if (ipIntVal != null && takenMap[vid]){
        // учитываем только те IP, что внутри диапазона
        const r = ranges.find(x => String(x.vid) === vid);
        if (r && ipIntVal >= r.start && ipIntVal <= r.last){
          takenMap[vid].add(ipIntVal);
        }
      }
    }
  }

  // записываем обратно и пересчитываем next
  for (const r of ranges){
    const vid = String(r.vid);
    const takenArr = Array.from(takenMap[vid] || []);
    takenArr.sort((a,b)=>a-b);

    office.ipam.used[vid] ||= {};
    office.ipam.used[vid].taken = takenArr;
    office.ipam.used[vid].next = calcNextFree(r, takenArr);
  }
}

/** GUI allocator: берёт ПЕРВЫЙ свободный, без дыр и без повторов */
function allocIPStable(office, vid){
  ensureIpamConsistency(office);
  const r = office.ipam?.ranges?.find(x => String(x.vid) === String(vid));
  if (!r) return null;

  const used = office.ipam.used[String(vid)] || (office.ipam.used[String(vid)] = {});
  const taken = new Set(used.taken || []);

  let chosen = null;
  for (let ip = r.start; ip <= r.last; ip++){
    if (!taken.has(ip)){ chosen = ip; break; }
  }
  if (chosen == null) return null;

  taken.add(chosen);
  const takenArr = Array.from(taken).sort((a,b)=>a-b);

  used.taken = takenArr;
  used.next  = calcNextFree(r, takenArr);

  return { ipStr: (typeof intToIp==="function"? intToIp(chosen) : String(chosen)), ipInt: chosen };
}

/** Rollback: освобождаем IP, если пользователь вернулся назад */
function rollbackCommittedIps(){
  const { state, office } = getOfficeCtx();
  if (!office) return;

  let reservations = [];
  try { reservations = JSON.parse(sessionStorage.getItem("vm_create_ip_reservations") || "[]"); }
  catch { reservations = []; }

  if (!reservations.length) return;

  ensureIpamConsistency(office);

  for (const r of reservations){
    const vid = String(r.vid);
    const used = office.ipam.used?.[vid];
    if (!used?.taken) continue;
    used.taken = used.taken.filter(x => x !== r.ipInt);
    const range = office.ipam.ranges.find(x => String(x.vid) === vid);
    if (range){
      used.next = calcNextFree(range, used.taken);
    }
  }

  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  sessionStorage.removeItem("vm_create_ip_reservations");
}


// --- ПРЕВЬЮ: считаем IP на копии офиса, НЕ подтверждая пул ---
function previewIpFromVlan(vid){
  const { office } = getOfficeCtx();
  if (!office) return null;

  // глубокая копия офиса, чтобы allocIP мутировал только копию
  const officeClone = JSON.parse(JSON.stringify(office));

  if (typeof rebuildIpam === "function") rebuildIpam(officeClone);
  if (typeof allocIP !== "function") return null;

  // выдаём IP на копии — в реальный пул не записываем
  return allocIP(officeClone, vid);
}

// --- КОММИТ: подтверждаем IP только при переходе на STEP4 ---
function commitIpsForIfaces(ifaces) {
  // общий контекст office.js
  let off = (typeof office !== "undefined") ? office : null;
  let st  = (typeof state  !== "undefined") ? state  : null;

  if (!off || !st) {
    const ctx = getOfficeCtx();
    off = ctx.office;
    st  = ctx.state;
  }
  if (!off) return { ok: false, ifaces };

  if (typeof allocIPStable !== "function") {
    // fallback на старое поведение, чтобы не ломать всё
    if (typeof rebuildIpam === "function") rebuildIpam(off);
    if (typeof allocIP !== "function") return { ok: false, ifaces };

    const resIfaces = ifaces.map(nic => ({ ...nic }));
    for (const nic of resIfaces) {
      if ((nic.type === "static" || nic.type === "vlan") && nic.vlanVid) {
        const ip = allocIP(off, Number(nic.vlanVid));
        nic.address = ip ? ip : `⚠ В VLAN ${nic.vlanVid} закончились адреса`;
      } else if (nic.type === "dhcp") {
        nic.address = "DHCP";
      } else if (nic.type === "ispemach") {
        nic.address = "Uplink → ISP/Emach";
      }
    }
    if (typeof saveState === "function") saveState(st);
    else localStorage.setItem(STORE_KEY, JSON.stringify(st));
    return { ok: true, ifaces: resIfaces };
  }

  // 1) Синхронизируем IPAM по текущим VM (учитывает удалённые)
  ensureIpamConsistency(off);

  const resIfaces = ifaces.map(nic => ({ ...nic }));
  const reservations = [];

  // 2) Выдаём IP через стабильный аллокатор
  for (const nic of resIfaces) {
    if ((nic.type === "static" || nic.type === "vlan") && nic.vlanVid) {
      const alloc = allocIPStable(off, Number(nic.vlanVid));
      if (alloc && alloc.ipStr) {
        nic.address = alloc.ipStr;
        reservations.push({ vid: Number(nic.vlanVid), ipInt: alloc.ipInt });
      } else {
        nic.address = `⚠ В VLAN ${nic.vlanVid} закончились адреса`;
      }
    } else if (nic.type === "dhcp") {
      nic.address = "DHCP";
    } else if (nic.type === "ispemach") {
      nic.address = "Uplink → ISP/Emach";
    }
  }

  // 3) Обновляем office внутри state и сохраняем
  if (Array.isArray(st.offices)) {
    const idx = st.offices.findIndex(o => String(o.id) === String(off.id));
    if (idx !== -1) {
      st.offices[idx] = off;
    }
  }

  try {
    if (typeof saveState === "function") {
      saveState(st);
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(st));
    }
  } catch {}

  // 4) Сохраняем резервации для rollbackCommittedIps()
  try {
    sessionStorage.setItem("vm_create_ip_reservations", JSON.stringify(reservations));
  } catch {}

  return { ok: true, ifaces: resIfaces };
}



function openInterfacesStep(typeKey){
  const t = TYPES.find(x => x.key === typeKey);
  const officeName = getOfficeNameSafe();

  const vmName   = sessionStorage.getItem("vm_create_name")   || "";
  const vmDistro = sessionStorage.getItem("vm_create_distro") || "";

  // дистрибутив-иконка для фона слева
  const distroIconMap = {
    altServer: "/lounge/img/altServer.png",
    altWorkstation: "/lounge/img/altServer.png",
    debian: "/lounge/img/debian.svg",
    pfsense: "/lounge/img/pfSense.png",
    ideco: "/lounge/img/ideco.png",
    ecorouter: "/lounge/img/ecorouter.png"
  };
  const distroBg = distroIconMap[vmDistro] || "";

  qs(".modal__title", ifacesModal).textContent =
    `Интерфейсы | ${officeName}`;

  qs(".modal__body", ifacesModal).innerHTML = `
    <div class="vm-ifaces">
      <div class="vm-ifaces__left">
        <div class="vm-ifaces__typewrap">
          <div class="vm-ifaces__distrobg" style="background-image:url('${distroBg}')"></div>
          <div class="vm-ifaces__typeicon" style="background-image:url('${t.icon}')"></div>
        </div>
        <div class="vm-ifaces__typename">${t.label}</div>
        <div class="vm-ifaces__vmname">${vmName || "Без имени"}</div>
      </div>

      <div class="vm-ifaces__right">
        <div class="iface-strip" id="ifaceStrip">
          <!-- add-card inserted by JS -->
        </div>
        <div class="iface-hint muted">Добавь интерфейсы машины. VLAN-интерфейсы будут “левитировать” на карте.</div>
      </div>
    </div>
  `;

  // подсветка выбранного дистрибутива слева
const wrap = qs(".vm-ifaces__typewrap", ifacesModal);
if (wrap) wrap.classList.add("is-distro-selected");

// проставим data-distro на wrap тоже (на будущее)
if (wrap) wrap.setAttribute("data-distro", vmDistro);


  qs(".modal__foot", ifacesModal).innerHTML = `
    <div class="steps steps--fancy" data-step="3">
      <div class="steps__line"></div>
      <div class="steps__line-active"></div>
      <div class="steps__dot is-done">1</div>
      <div class="steps__dot is-done">2</div>
      <div class="steps__dot is-active">3</div>
      <div class="steps__dot">4</div>
      <div class="steps__dot">5</div>
    </div>

    <div class="modal-actions">
      <button id="vmIfacesBack" class="btn ghost">Назад</button>
      <button id="vmIfacesNext" class="btn violet" disabled>Далее</button>
    </div>
  `;

  updateSteps(ifacesModal, 3);
  openModal(ifacesModal);

  const strip = qs("#ifaceStrip", ifacesModal);

  // стартовая add-card
  const addCard = createAddIfaceCard();
  strip.appendChild(addCard);

  // состояние интерфейсов
  let ifaces = [];
  persistIfaces();

  function persistIfaces(){
    sessionStorage.setItem("vm_create_ifaces", JSON.stringify(ifaces));
    const nextBtn = qs("#vmIfacesNext", ifacesModal);
    nextBtn.disabled = ifaces.length === 0 || ifaces.some(x => !x.name || !x.type);
  }

  function createAddIfaceCard(){
    const c = document.createElement("button");
    c.className = "iface-card iface-card--add";
    c.type = "button";
    c.innerHTML = `
      <div class="iface-plus">+</div>
      <div class="iface-add-label">Добавить интерфейс</div>
    `;
    c.addEventListener("click", () => {
      const newCard = createIfaceFormCard(ifaces.length);
      // анимация “сдвига вправо”
      newCard.classList.add("is-appearing");
      strip.insertBefore(newCard, addCard);
      requestAnimationFrame(() => newCard.classList.remove("is-appearing"));
      persistIfaces();
    });
    return c;
  }

  function createIfaceFormCard(idx){
    const vlans = getVlansSafe();

    const card = document.createElement("div");
    card.className = "iface-card iface-card--form";
    card.dataset.idx = String(idx);

    card.innerHTML = `
      <div class="iface-head">
        <div class="iface-title">Интерфейс #${idx+1}</div>
        <button class="iface-del" type="button" title="Удалить">✕</button>
      </div>

      <label class="field">
        <div class="field__label">Название интерфейса <span class="req">*</span></div>
        <input class="field__input iface-name" type="text" placeholder="eth0 / uplink / vlan10" />
      </label>

      <label class="field">
        <div class="field__label">Тип подключения</div>
        <select class="field__input iface-type">
  <option value="" selected disabled>Выбери тип</option>
  <option value="static">Статический</option>
  <option value="dhcp">Динамический (DHCP)</option>
  <option value="vlan">VLAN</option>
  <option value="ispemach">Подключение к ISP/Emach</option>
</select>

      </label>

      <label class="field iface-vlan-field" style="display:none">
        <div class="field__label">VLAN</div>
        <select class="field__input iface-vlan">
          <option value="" selected disabled>Выбери VLAN</option>
          ${vlans.map(v => `
            <option value="${v.vid}">
              VLAN ${v.vid}${v.name ? " — "+v.name : ""}${v.cidr ? " ("+v.cidr+")" : ""}
            </option>
          `).join("")}
        </select>
      </label>

      <div class="iface-result">
        <div class="iface-result__label">Адрес:</div>
        <div class="iface-result__value">—</div>
      </div>
    `;

    const btnDel    = qs(".iface-del", card);
    const inpName   = qs(".iface-name", card);
    const selType   = qs(".iface-type", card);
    const vlanField = qs(".iface-vlan-field", card);
    const selVlan   = qs(".iface-vlan", card);
    const resVal    = qs(".iface-result__value", card);

    // модель интерфейса
    const model = { name:"", type:"", vlanVid:null, address:"" };
    ifaces.push(model);

    function updateResult(){
  if (model.type === "dhcp") {
  model.address = "DHCP";
}
else if (model.type === "ispemach") {
  // uplink наружу, VLAN не требуется
  model.vlanVid = null;
  model.address = "Uplink → ISP/Emach";
}
else if (model.type === "static" || model.type === "vlan") {
  if (!model.vlanVid) {
    model.address = "Выбери VLAN";
  } else {
    // ПРЕВЬЮ IP — см. пункт 3 ниже
    const ip = previewIpFromVlan(Number(model.vlanVid));
    model.address = ip ? ip : `⚠ В VLAN ${model.vlanVid} закончились адреса`;
  }
}
else {
  model.address = "—";
}


  resVal.textContent = model.address;
  persistIfaces();
}


    inpName.addEventListener("input", () => {
      model.name = inpName.value.trim();
      persistIfaces();
    });

    selType.addEventListener("change", () => {
      model.type = selType.value;
      if (model.type === "static" || model.type === "vlan"){
  vlanField.style.display = "";
} else {
  vlanField.style.display = "none";
  model.vlanVid = null;
}
updateResult();

    });

    selVlan?.addEventListener("change", () => {
      model.vlanVid = selVlan.value;
      updateResult();
    });

    btnDel.addEventListener("click", () => {
  const removeIdx = parseInt(card.dataset.idx, 10);
  ifaces.splice(removeIdx, 1);
  card.remove();

  // переиндексируем карточки
  qsa(".iface-card--form", strip).forEach((c, i) => {
    c.dataset.idx = String(i);
    qs(".iface-title", c).textContent = `Интерфейс #${i + 1}`;
  });

  persistIfaces();
});



    // первичный расчёт
    updateResult();
    return card;
  }

  on(qs("#vmIfacesBack", ifacesModal), "click", () => {
    closeModal(ifacesModal);
    openModal(configModal);
    updateSteps(configModal, 2);
  });

  on(qs("#vmIfacesNext", ifacesModal), "click", () => {
  // 1) подтверждаем адреса (только сейчас!)
  const data = getWizardData(); // из STEP4 блока, он уже есть в файле
  const committed = commitIpsForIfaces(data.ifaces);

  // 2) сохраняем подтверждённые интерфейсы обратно в sessionStorage
  sessionStorage.setItem("vm_create_ifaces", JSON.stringify(committed.ifaces));

  // 3) переходим в STEP4
  closeModal(ifacesModal);
  openVerifyStep(typeKey);
  });


}

/* ==========================================================
   STEP 3 (switch): Open vSwitch + MGMT + физические интерфейсы
   ========================================================== */

const ovsModal = ensureModal("modalVmOvs", "modal-vmovs");

function openOvsStep(typeKey) {
  const officeName = getOfficeNameSafe();

  const vmName   = sessionStorage.getItem("vm_create_name")   || "";
  const vmDistro = sessionStorage.getItem("vm_create_distro") || "";
  const vmType   = typeKey; // 'switch'

  const t = TYPES.find(x => x.key === typeKey);

  const distroIconMap = {
    altServer: "/lounge/img/altServer.png",
    altWorkstation: "/lounge/img/altServer.png",
    debian: "/lounge/img/debian.svg",
    pfsense: "/lounge/img/pfSense.png",
    ideco: "/lounge/img/ideco.png",
    ecorouter: "/lounge/img/ecorouter.png"
  };
  const distroBg = distroIconMap[vmDistro] || "";

  // --- загрузка/инициализация ovsConfig ---
  let ovsConfig;
  try {
    ovsConfig = JSON.parse(sessionStorage.getItem("vm_create_ovs") || "{}");
  } catch {
    ovsConfig = {};
  }
  if (!Array.isArray(ovsConfig.bridges)) ovsConfig.bridges = [];

  // имя виртуального коммутатора по умолчанию = hostname
  if (!ovsConfig.switchName) {
    ovsConfig.switchName = vmName || "ovs-switch";
  }

  function persistOvs() {
    sessionStorage.setItem("vm_create_ovs", JSON.stringify(ovsConfig));
    validateOvs();
  }

  // гарантируем, что есть хотя бы один bridge и MGMT iface
  function ensureBaseBridgeAndMgmt() {
    if (!ovsConfig.bridges.length) {
      ovsConfig.bridges.push({ name: "br0", ifaces: [] });
    }
    const br0 = ovsConfig.bridges[0];
    if (!Array.isArray(br0.ifaces)) br0.ifaces = [];

    let mgmt = br0.ifaces.find(i => i.kind === "mgmt");
    if (!mgmt) {
      mgmt = {
        kind: "mgmt",
        name: "mgmt0",
        vlanVid: null,
        ip: null  // выдадим IP при создании VM
      };
      br0.ifaces.push(mgmt);
    }
  }

  /* === BUILD UI === */

  qs(".modal__title", ovsModal).textContent = `Open vSwitch | ${officeName}`;

  qs(".modal__body", ovsModal).innerHTML = `
    <div class="vm-ovs">
      <div class="vm-ovs__left">
        <div class="vm-ifaces__typewrap">
          <div class="vm-ifaces__distrobg" style="background-image:url('${distroBg}')"></div>
          <div class="vm-ifaces__typeicon" style="background-image:url('${t.icon}')"></div>
        </div>
        <div class="vm-ifaces__typename">${t.label}</div>
        <div class="vm-ifaces__vmname">${vmName || "Без имени"}</div>
        <div class="vm-ovs__note">
          Виртуальный коммутатор Open vSwitch.<br>
          MGMT-интерфейс получит IP из выбранного VLAN при создании машины.
        </div>
      </div>

      <div class="vm-ovs__right">
        <label class="field">
          <div class="field__label">Имя виртуального коммутатора (OVS)</div>
          <input id="vmOvsSwitchName" class="field__input" type="text"
                 placeholder="${vmName || "ovs-switch"}"
                 value="${ovsConfig.switchName || ""}">
        </label>

        <div class="vm-ovs__toolbar">
          <button id="vmOvsAddBridge" class="btn mini">+ Мост</button>
        </div>

        <div class="vm-ovs__bridges" id="vmOvsBridges"></div>
      </div>
    </div>
  `;

  qs(".modal__foot", ovsModal).innerHTML = `
    <div class="steps steps--fancy" data-step="3">
      <div class="steps__line"></div>
      <div class="steps__line-active"></div>
      <div class="steps__dot is-done">1</div>
      <div class="steps__dot is-done">2</div>
      <div class="steps__dot is-active">3</div>
      <div class="steps__dot">4</div>
      <div class="steps__dot">5</div>
    </div>

    <div class="modal-actions">
      <button id="vmOvsBack" class="btn ghost">Назад</button>
      <button id="vmOvsNext" class="btn violet" disabled>Далее</button>
    </div>
  `;

  updateSteps(ovsModal, 3);

  const bridgesWrap     = qs("#vmOvsBridges", ovsModal);
  const btnAddBridge    = qs("#vmOvsAddBridge", ovsModal);
  const btnBack         = qs("#vmOvsBack", ovsModal);
  const btnNext         = qs("#vmOvsNext", ovsModal);
  const switchNameInput = qs("#vmOvsSwitchName", ovsModal);

  switchNameInput.addEventListener("input", () => {
    ovsConfig.switchName = switchNameInput.value.trim() || (vmName || "ovs-switch");
    persistOvs();
  });

  /* =========================
     BRIDGES / IFACES
     ========================= */
  function addBridge() {
    const idx = ovsConfig.bridges.length;
    const name = idx === 0 ? "br0" : `br${idx}`;

    ovsConfig.bridges.push({
      name,
      ifaces: []
    });
    ensureBaseBridgeAndMgmt();
    persistOvs();
    renderBridges();
  }

  function deleteBridge(index) {
    // запрещать удаление первого моста с MGMT?
    if (index === 0) {
      alert("Нельзя удалить базовый мост с MGMT-интерфейсом.");
      return;
    }
    ovsConfig.bridges.splice(index, 1);
    persistOvs();
    renderBridges();
  }

  function addPhyIfaceToBridge(brIndex) {
    const br = ovsConfig.bridges[brIndex];
    if (!br) return;
    if (!Array.isArray(br.ifaces)) br.ifaces = [];

    br.ifaces.push({
      kind: "phy",
      name: `iface${br.ifaces.length + 1}`,
      mode: "",      // "tag" или "trunk"
      vlans: []      // список VLAN VID
    });

    persistOvs();
    renderBridges();
  }

  function renderBridges() {
    bridgesWrap.innerHTML = "";
    const vlans = getVlansSafe();

    ovsConfig.bridges.forEach((br, brIndex) => {
      const card = document.createElement("div");
      card.className = "ovs-bridge-card";

      const ifaceHtml = (br.ifaces || []).map((p, pIndex) => {
        const isMgmt = p.kind === "mgmt";

        if (isMgmt) {
          return `
            <div class="ovs-iface ovs-iface--mgmt" data-br="${brIndex}" data-iface="${pIndex}">
              <div class="ovs-iface__head">
                <div class="ovs-iface__title">MGMT (${p.name})</div>
                <div class="ovs-iface__badge">internal</div>
              </div>

              <label class="field">
                <div class="field__label">VLAN для MGMT</div>
                <select class="field__input ovs-mgmt-vlan">
                  <option value="" disabled ${p.vlanVid ? "" : "selected"}>Выбери VLAN</option>
                  ${vlans.map(v => `
                    <option value="${v.vid}" ${Number(p.vlanVid) === Number(v.vid) ? "selected" : ""}>
                      VLAN ${v.vid}${v.role ? " — " + v.role : ""}
                    </option>
                  `).join("")}
                </select>
              </label>

              <div class="ovs-iface__hint">
                IP MGMT будет выдан автоматически из выбранного VLAN при создании свитча.
              </div>
            </div>
          `;
        }

        // физический интерфейс без IP
        return `
          <div class="ovs-iface" data-br="${brIndex}" data-iface="${pIndex}">
            <div class="ovs-iface__head">
              <input class="field__input ovs-iface-name" type="text" value="${p.name || ""}">
              <button class="ovs-iface-del" type="button" title="Удалить интерфейс">✕</button>
            </div>

            <label class="field">
              <div class="field__label">Режим интерфейса</div>
              <select class="field__input ovs-iface-mode">
                <option value="" disabled ${!p.mode ? "selected" : ""}>Выбери режим</option>
                <option value="tag"   ${p.mode === "tag"   ? "selected" : ""}>tag</option>
                <option value="trunk" ${p.mode === "trunk" ? "selected" : ""}>trunk</option>
              </select>
            </label>

            <label class="field">
              <div class="field__label">VLAN’ы (через запятую)</div>
              <input class="field__input ovs-iface-vlans"
                     placeholder="пример: 10,20,30"
                     value="${(p.vlans || []).join(",")}">
            </label>

            <div class="ovs-iface__hint">
              Физический интерфейс без IP. Режим tag/trunk и список VLAN определяют,
              какие теги будут выходить на этот порт.
            </div>
          </div>
        `;
      }).join("");

      card.innerHTML = `
        <div class="ovs-bridge-head">
          <input class="field__input ovs-bridge-name" type="text" value="${br.name || ""}">
          <button class="ovs-bridge-del" type="button">✕</button>
        </div>

        <div class="ovs-bridge-ifaces">
          <div class="ovs-bridge-ifaces__head">
            <span>Интерфейсы моста</span>
            <button class="btn mini ovs-add-iface" type="button">+ Интерфейс</button>
          </div>
          <div class="ovs-bridge-ifaces__list">
            ${ifaceHtml || `<div class="muted">Интерфейсов пока нет</div>`}
          </div>
        </div>
      `;

      bridgesWrap.appendChild(card);
    });

    // привязка событий
    qsa(".ovs-bridge-card", bridgesWrap).forEach((card, brIndex) => {
      const br = ovsConfig.bridges[brIndex];

      qs(".ovs-bridge-name", card).addEventListener("input", e => {
        br.name = e.target.value.trim() || `br${brIndex}`;
        persistOvs();
      });

      qs(".ovs-bridge-del", card).addEventListener("click", () => {
        deleteBridge(brIndex);
      });

      qs(".ovs-add-iface", card).addEventListener("click", () => {
        addPhyIfaceToBridge(brIndex);
      });

      qsa(".ovs-iface", card).forEach(ifEl => {
        const pIndex = Number(ifEl.dataset.iface);
        const iface = br.ifaces[pIndex];

        if (iface.kind === "mgmt") {
          const mgmtVlan = qs(".ovs-mgmt-vlan", ifEl);
          mgmtVlan?.addEventListener("change", () => {
            iface.vlanVid = Number(mgmtVlan.value) || null;
            persistOvs();
          });
          return;
        }

        // физический интерфейс
        qs(".ovs-iface-name", ifEl).addEventListener("input", e => {
          iface.name = e.target.value.trim() || `iface${pIndex + 1}`;
          persistOvs();
        });

        const modeSel = qs(".ovs-iface-mode", ifEl);
        modeSel.addEventListener("change", e => {
          iface.mode = e.target.value || "";
          persistOvs();
        });

        const vlansInput = qs(".ovs-iface-vlans", ifEl);
        vlansInput.addEventListener("input", e => {
          iface.vlans = e.target.value
            .split(",")
            .map(x => x.trim())
            .filter(Boolean)
            .map(v => Number(v))
            .filter(v => !isNaN(v));
          persistOvs();
        });

        const delBtn = qs(".ovs-iface-del", ifEl);
        delBtn.addEventListener("click", () => {
          if (iface.kind === "mgmt") {
            alert("MGMT интерфейс нельзя удалить.");
            return;
          }
          br.ifaces.splice(pIndex, 1);
          persistOvs();
          renderBridges();
        });
      });
    });

    validateOvs();
  }

  function validateOvs() {
    let hasBridge = ovsConfig.bridges.length > 0;
    let mgmtOk = false;

    if (!hasBridge) {
      if (btnNext) btnNext.disabled = true;
      return;
    }

    for (const br of ovsConfig.bridges) {
      for (const i of (br.ifaces || [])) {
        if (i.kind === "mgmt" && i.vlanVid) {
          mgmtOk = true;
          break;
        }
      }
      if (mgmtOk) break;
    }

    const ok = hasBridge && mgmtOk;
    if (btnNext) btnNext.disabled = !ok;
  }

  // инициализация
  ensureBaseBridgeAndMgmt();
  persistOvs();
  renderBridges();

  btnAddBridge.addEventListener("click", () => {
    addBridge();
  });

  btnBack.addEventListener("click", () => {
    closeModal(ovsModal);
    openModal(configModal);
    updateSteps(configModal, 2);
  });

  btnNext.addEventListener("click", () => {
    validateOvs();
    if (btnNext.disabled) return;

    persistOvs();
    closeModal(ovsModal);
    // переход к шагу 4 — оставь имя функции, которое у тебя уже используется
    openSummaryStep(vmType);  // или openVerifyStep(vmType), если так называется в твоём файле
  });

  openModal(ovsModal);
}




/* ==========================================================
   STEP 4: Verify / Review modal
   ========================================================== */

const verifyModal = ensureModal("modalVmVerify", "modal-vmverify");
/* ==========================================================
   STEP 5: Done modal
   ========================================================== */

const doneModal = ensureModal("modalVmDone", "modal-vmdone");

function openDoneStep(createdVm){
  const officeName = getOfficeNameSafe();
  const fqdn = createdVm.domain ? `${createdVm.hostname}.${createdVm.domain}` : createdVm.hostname;

  qs(".modal__title", doneModal).textContent = `Готово | ${officeName}`;

  const ifaces = Array.isArray(createdVm.ifaces) ? createdVm.ifaces : [];

  const ifacesHtml = ifaces.length
    ? `
      <div class="vm-done__section">
        <div class="vm-done__section-title">Интерфейсы</div>
        <div class="vm-done__ifaces">
          ${ifaces.map(nic => `
            <div class="vm-done__iface-row">
              <span class="c1">${nic.name || "—"}</span>
              <span class="c2">${nic.mode || nic.addrMode || "—"}</span>
              <span class="c3">${(nic.vlanId != null) ? nic.vlanId : "—"}</span>
              <span class="c4">${
                nic.ip
                  || (nic.addrMode === "dhcp" ? "DHCP" : "—")
              }</span>
            </div>
          `).join("")}
        </div>
      </div>
    `
    : "";

  qs(".modal__body", doneModal).innerHTML = `
    <div class="vm-done">
      <div class="vm-done__badge">VM создана успешно</div>

      <div class="vm-done__kv">
        <span>ID</span><b>#${createdVm.id}</b>
      </div>
      <div class="vm-done__kv">
        <span>Тип</span><b>${typeLabel(createdVm.type)}</b>
      </div>
      <div class="vm-done__kv">
        <span>Дистрибутив</span><b>${createdVm.distro}</b>
      </div>
      <div class="vm-done__kv">
        <span>FQDN</span><b>${fqdn}</b>
      </div>

      ${ifacesHtml}

      <div class="vm-done__hint muted">
        Машина добавлена в офис. Можешь открыть карту и увидеть топологию.
      </div>
    </div>
  `;

  // остальную часть openDoneStep (steps + кнопки) оставляешь как есть
}

/** Собираем текущие данные мастера из sessionStorage */
function getWizardData(){
  const typeKey  = sessionStorage.getItem("vm_create_type") || "";
  const distroKey= sessionStorage.getItem("vm_create_distro") || "";
  const hostname = sessionStorage.getItem("vm_create_name") || "";
  const domain   = sessionStorage.getItem("vm_create_domain") || "";
  let ifaces = [];
  try { ifaces = JSON.parse(sessionStorage.getItem("vm_create_ifaces") || "[]"); }
  catch { ifaces = []; }

  return { typeKey, distroKey, hostname, domain, ifaces };
}

/** Валидируем шаг 4: возвращаем массив текстовых ошибок */
function validateStep4(data){
  const errors = [];

  if (!data.hostname.trim()) {
    errors.push("Укажите hostname (название машины).");
  }

  // domain опциональный — проверяем только если введён
  if (data.domain.trim() && !/^[a-zA-Z0-9.-]+$/.test(data.domain.trim())) {
    errors.push("Domain некорректен (разрешены: a-z, 0-9, точки, дефисы).");
  }

  if (!Array.isArray(data.ifaces) || data.ifaces.length === 0) {
    errors.push("Добавьте хотя бы один интерфейс.");
  } else {
    // пустые имена
    if (data.ifaces.some(i => !i.name || !String(i.name).trim())) {
      errors.push("У некоторых интерфейсов нет имени.");
    }

    // пустые типы
    if (data.ifaces.some(i => !i.type)) {
      errors.push("У некоторых интерфейсов не выбран тип подключения.");
    }

    // static/vlan требуют VLAN
    if (data.ifaces.some(i => (i.type === "static" || i.type === "vlan") && !i.vlanVid)) {
      errors.push("Некоторые интерфейсы (static/VLAN) требуют выбора VLAN.");
    }

    // дубли имён интерфейсов
    const names = data.ifaces.map(i => String(i.name || "").trim()).filter(Boolean);
    const dupNames = names.filter((n, idx) => names.indexOf(n) !== idx);
    if (dupNames.length) {
      const uniqDup = [...new Set(dupNames)];
      errors.push("Имена интерфейсов должны быть уникальны: " + uniqDup.join(", "));
    }

    // IP-ошибки (если allocIP в step3 вернул предупреждение)
    if (data.ifaces.some(i => String(i.address || "").includes("закончились адреса"))) {
      errors.push("В одном из VLAN закончились адреса. Увеличьте вместимость VLAN.");
    }
  }

  return errors;
}

/** Человеческие названия типов */
function typeLabel(typeKey){
  return (TYPES.find(t => t.key === typeKey)?.label) || typeKey || "—";
}

/** Человеческие названия дистрибутивов */
function distroLabel(dKey){
  return DISTROS[dKey]?.label || dKey || "—";
}

/** Иконка дистрибутива для фона слева */
function distroBgByKey(dKey){
  const map = {
    altServer: "/lounge/img/altServer.png",
    altWorkstation: "/lounge/img/altServer.png",
    debian: "/lounge/img/debian.svg",
    pfsense: "/lounge/img/pfSense.png",
    ideco: "/lounge/img/ideco.png",
    ecorouter: "/lounge/img/ecorouter.png"
  };
  return map[dKey] || "";
}

/** Сводка IPAM по VLAN */
function ipamSummaryLines(){
  const { office } = getOfficeCtx();
  if (!office || !office.ipam || !Array.isArray(office.ipam.ranges)) return [];
  return office.ipam.ranges.map(r => {
    const usedNext = office.ipam.used?.[r.vid]?.next || r.start;
    const usedCnt = Math.max(0, usedNext - r.start);
    const total   = Math.max(0, r.last - r.start + 1);
    return `VLAN ${r.vid}: ${usedCnt}/${total} использовано`;
  });
}



/** Финальная запись VM в office.vms (аналог finalizeVm из text wizard) */
function finalizeVmGui() {
  // 1) Берём общий контекст из office.js, чтобы терминал видел изменения без F5
  let off = (typeof office !== "undefined") ? office : null;
  let st  = (typeof state  !== "undefined") ? state  : null;

  if (!off || !st) {
    // fallback на старый способ, если вдруг что-то поменяется
    const ctx = getOfficeCtx();
    off = ctx.office;
    st  = ctx.state;
  }

  if (!off) return false;

  // 2) Синхронизируем IPAM с текущими VM (учитывает удалённые машины)
  ensureIpamConsistency(off);

  const data = getWizardData();

  let ovsCfg = null;
  try {
    ovsCfg = JSON.parse(sessionStorage.getItem("vm_create_ovs") || "null");
  } catch {
    ovsCfg = null;
  }

  const vms = Array.isArray(off.vms) ? off.vms : [];
  const nextId = vms.length ? Math.max(...vms.map(v => v.id)) + 1 : 1;

  const vm = {
    id: nextId,
    type: data.typeKey,
    distro: distroLabel(data.distroKey),
    hostname: data.hostname.trim(),
    domain: data.domain.trim() || "",
    ifaces: (data.ifaces || []).map(i => ({
      name: i.name,
      mode: i.type,          // в office.js поле называется mode
      vlanId: i.vlanVid ? Number(i.vlanVid) : undefined,
      ip: (i.address && i.address !== "DHCP" && !String(i.address).includes("⚠"))
            ? i.address
            : undefined,
      addrMode: (i.type === "dhcp") ? "dhcp" : "static"
    }))
  };

  // 3) Если это свитч — выдаём IP для MGMT из выбранного VLAN
  if (data.typeKey === "switch" && ovsCfg && Array.isArray(ovsCfg.bridges)) {
    let mgmtPort = null;
    let mgmtVlan = null;

    for (const br of ovsCfg.bridges) {
      for (const p of (br.ifaces || [])) {
        if (p.kind === "mgmt" && p.vlanVid) {
          mgmtPort = p;
          mgmtVlan = Number(p.vlanVid);
          break;
        }
      }
      if (mgmtPort) break;
    }

    if (mgmtPort && mgmtVlan && typeof allocIPStable === "function") {
      const alloc = allocIPStable(off, mgmtVlan);
      if (alloc && alloc.ipStr) {
        // сохраняем IP прямо в MGMT-порт OVS, чтобы дальше его было видно в UI
        mgmtPort.ip = alloc.ipStr;

        // добавляем MGMT как NIC в vm.ifaces, чтобы list vm показывал адрес
        vm.ifaces.push({
          name: mgmtPort.name || "mgmt0",
          mode: "static",
          vlanId: mgmtVlan,
          ip: alloc.ipStr,
          addrMode: "static",
          mgmt: true
        });
      }
    }

    vm.ovs = ovsCfg;
  } else if (data.typeKey === "switch" && ovsCfg) {
    // на всякий случай, если нет MGMT — просто прикрепляем конфиг
    vm.ovs = ovsCfg;
  }

  // 4) Записываем VM в общий office, который использует терминал
  vms.push(vm);
  off.vms = vms;

  // Обновляем ссылку в state.offices
  if (st && Array.isArray(st.offices)) {
    const idx = st.offices.findIndex(o => String(o.id) === String(off.id));
    if (idx !== -1) {
      st.offices[idx] = off;
    }
  }

  // 5) Ещё раз синхронизируем IPAM уже с учётом новой VM
  ensureIpamConsistency(off);

  // 6) Сохраняем состояние так же, как делает office.js
  try {
    if (typeof saveState === "function") {
      saveState(st);
    } else {
      localStorage.setItem("lounge_offices_v1", JSON.stringify(st || { offices: [off] }));
    }
  } catch {}

  // Обновляем левое меню офисов, если есть такая функция
  if (typeof refreshLeft === "function") {
    refreshLeft();
  }

  // 7) Лог в терминал — чтобы было видно создание VM сразу
  if (typeof writeLine === "function") {
    const fqdn = vm.domain ? `${vm.hostname}.${vm.domain}` : vm.hostname;
    writeLine(`VM#${vm.id} создана (GUI): ${vm.type} ${vm.distro} host:${fqdn}`);
  }

  // 8) Чистим данные мастера
  sessionStorage.removeItem("vm_create_type");
  sessionStorage.removeItem("vm_create_distro");
  sessionStorage.removeItem("vm_create_name");
  sessionStorage.removeItem("vm_create_domain");
  sessionStorage.removeItem("vm_create_ifaces");
  sessionStorage.removeItem("vm_create_ovs");
  sessionStorage.removeItem("vm_create_ip_reservations");

  openDoneStep(vm);
  return true;
}




/** Открыть шаг 4 */
function openVerifyStep(typeKey){
  const officeName = getOfficeNameSafe();
  const data = getWizardData();
  const t = TYPES.find(x => x.key === typeKey);

  const fqdn = data.domain ? `${data.hostname}.${data.domain}` : data.hostname;
  const distroBg = distroBgByKey(data.distroKey);

  qs(".modal__title", verifyModal).textContent =
    `Проверка | ${officeName}`;

  qs(".modal__body", verifyModal).innerHTML = `
    <div class="vm-verify">
      <div class="vm-verify__left">
        <div class="vm-verify__typewrap">
          <div class="vm-verify__distrobg" style="background-image:url('${distroBg}')"></div>
          <div class="vm-verify__typeicon" style="background-image:url('${t?.icon || ""}')"></div>
        </div>
        <div class="vm-verify__typename">${typeLabel(data.typeKey)}</div>
        <div class="vm-verify__vmname">${data.hostname || "Без имени"}</div>
        <div class="vm-verify__fqdn">${fqdn || "—"}</div>
      </div>

      <div class="vm-verify__right">
        <div class="verify-card">
          <div class="verify-card__title">Итог конфигурации</div>

          <div class="verify-kv">
            <span>Тип</span><b>${typeLabel(data.typeKey)}</b>
          </div>
          <div class="verify-kv">
            <span>Дистрибутив</span><b>${distroLabel(data.distroKey)}</b>
          </div>
          <div class="verify-kv">
            <span>Hostname</span><b>${data.hostname || "—"}</b>
          </div>
          <div class="verify-kv">
            <span>Domain</span><b>${data.domain || "—"}</b>
          </div>
          <div class="verify-kv">
            <span>FQDN</span><b>${fqdn || "—"}</b>
          </div>

          <div class="verify-section-title">Интерфейсы</div>
          <div class="verify-ifaces">
            ${(data.ifaces || []).map(i => `
              <div class="verify-iface-row">
                <div class="c1">${i.name || "—"}</div>
                <div class="c2">${i.type || "—"}</div>
                <div class="c3">${i.vlanVid || "—"}</div>
                <div class="c4">${i.address || "—"}</div>
              </div>
            `).join("") || `<div class="muted">Интерфейсы не добавлены</div>`}
          </div>

          <div class="verify-section-title">IPAM</div>
          <div class="verify-ipam">
            ${ipamSummaryLines().map(l => `<div class="verify-ipam__line">${l}</div>`).join("") || `<div class="muted">Нет данных IPAM</div>`}
          </div>

          <div class="verify-section-title">Проверка</div>
          <div class="verify-errors" id="verifyErrors"></div>
        </div>
      </div>
    </div>
  `;

  qs(".modal__foot", verifyModal).innerHTML = `
    <div class="steps steps--fancy" data-step="4">
      <div class="steps__line"></div>
      <div class="steps__line-active"></div>
      <div class="steps__dot is-done">1</div>
      <div class="steps__dot is-done">2</div>
      <div class="steps__dot is-done">3</div>
      <div class="steps__dot is-active">4</div>
      <div class="steps__dot">5</div>
    </div>

    <div class="modal-actions">
      <button id="vmVerifyBack" class="btn ghost">Назад</button>
      <button id="vmVerifyCreate" class="btn violet" disabled>Создать VM</button>
    </div>
  `;

  updateSteps(verifyModal, 4);
  openModal(verifyModal);

  // показать ошибки и включить/выключить кнопку создания
  const errors = validateStep4(data);
  const errorsBox = qs("#verifyErrors", verifyModal);
  const createBtn = qs("#vmVerifyCreate", verifyModal);

  if (errors.length){
    errorsBox.innerHTML = errors.map(e => `<div class="verify-error">⚠ ${e}</div>`).join("");
    createBtn.disabled = true;
  } else {
    errorsBox.innerHTML = `<div class="verify-ok">OK — конфигурация корректна</div>`;
    createBtn.disabled = false;
  }

  // назад в step3
  on(qs("#vmVerifyBack", verifyModal), "click", () => {
  rollbackCommittedIps();          // освобождаем выданные IP
  closeModal(verifyModal);
  openInterfacesStep(typeKey);
});


  // создать VM
  on(createBtn, "click", () => {
    const ok = finalizeVmGui();
    if (!ok) return;
    closeModal(verifyModal);
  });
}

function renderOvsSummaryHtml(ovsCfg){
  if (!ovsCfg || !Array.isArray(ovsCfg.bridges) || !ovsCfg.bridges.length) {
    return '<div class="muted">OVS-мосты не настроены.</div>';
  }

  const vlans = getVlansSafe() || [];

  function vlanLabel(vid){
    if (!vid) return "VLAN не выбран";
    const vlan = vlans.find(v => Number(v.vid) === Number(vid));
    if (!vlan) return "VLAN " + vid;
    return "VLAN " + vid + (vlan.role ? " — " + vlan.role : "");
  }

  let html = "";

  (ovsCfg.bridges || []).forEach(br => {
    html += '<div class="vm-summary__ovs-bridge">';
    html +=   '<div class="vm-summary__ovs-bridge-title">';
    html +=     'Мост: ' + (br.name || "br");
    html +=   '</div>';

    const ifaces = br.ifaces || [];
    if (!ifaces.length) {
      html += '<div class="muted">Интерфейсов нет.</div>';
    } else {
      html += '<div class="vm-summary__ovs-ports">';
      ifaces.forEach(p => {
        const isMgmt = p.kind === "mgmt";
        const rowClass = isMgmt ? " vm-summary__ovs-portline--mgmt" : "";
        html += `<div class="vm-summary__ovs-portline${rowClass}">`;

        // бейдж слева
        html += '<span class="vm-summary__ovs-portbadge">';
        html += isMgmt ? 'MGMT' : (p.name || 'iface');
        html += '</span>';

        // текст справа
        html += '<span class="vm-summary__ovs-porttext">';
        if (isMgmt) {
          html += vlanLabel(p.vlanVid) +
                  ". IP будет выдан автоматически из этого VLAN при создании свитча.";
        } else {
          const parts = [];
          parts.push("режим: " + (p.mode || "не указан"));
          if (Array.isArray(p.vlans) && p.vlans.length) {
            parts.push("VLAN’ы: " + p.vlans.join(", "));
          } else {
            parts.push("VLAN’ы не заданы");
          }
          html += parts.join(". ") + ".";
        }
        html += '</span>';

        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
  });

  return html;
}



/* ==========================================================
   STEP 4: Summary / Проверка перед созданием
   ========================================================== */
const summaryModal = ensureModal("modalVmSummary", "modal-vmsummary");

function openSummaryStep(typeKey){
  const officeName = getOfficeNameSafe();

  const vmName     = sessionStorage.getItem("vm_create_name")   || "";
  const vmDomain   = sessionStorage.getItem("vm_create_domain") || "";
  const distroKey  = sessionStorage.getItem("vm_create_distro") || "";
  let   ifaces     = [];
  let   ovsCfg     = null;

  try {
    ifaces = JSON.parse(sessionStorage.getItem("vm_create_ifaces") || "[]");
  } catch {
    ifaces = [];
  }

  try {
    ovsCfg = JSON.parse(sessionStorage.getItem("vm_create_ovs") || "null");
  } catch {
    ovsCfg = null;
  }

  const typeObj   = TYPES.find(t => t.key === typeKey) || { label: typeKey, icon: "" };
  const distroObj = DISTROS[distroKey] || null;

  qs(".modal__title", summaryModal).textContent =
    `Проверка перед созданием | ${officeName}`;

  /* -------------------------
     ЛЕВЫЙ БЛОК (портрет VM)
     ------------------------- */
  const distroBg = distroBgByKey(distroKey);

  const leftHtml = `
    <div class="summary-left">
      <div class="summary-hero">
        <div class="summary-distrobg" style="background-image:url('${distroBg}')"></div>
        <div class="summary-typeicon"  style="background-image:url('${typeObj.icon || ""}')"></div>
      </div>

      <div class="summary-vmtype">${typeObj.label}</div>
      <div class="summary-vmname">${vmName || "Без имени"}</div>
      <div class="summary-fqdn">
        ${vmDomain ? `${vmName}.${vmDomain}` : (vmName || "—")}
      </div>
    </div>
  `;

  /* -------------------------
     ПРАВЫЙ БЛОК
     ------------------------- */
  let rightHtml = `<div class="summary-right">`;

  // Базовая инфа
  rightHtml += `
    <div class="summary-section">
      <div class="summary-title">Итог конфигурации</div>
      <div class="summary-kv">Тип: ${typeObj.label}</div>
      <div class="summary-kv">Дистрибутив: ${distroObj?.label || "—"}</div>
      <div class="summary-kv">Hostname: ${vmName || "—"}</div>
      <div class="summary-kv">Domain: ${vmDomain || "—"}</div>
      <div class="summary-kv">
        FQDN: ${vmDomain ? `${vmName}.${vmDomain}` : (vmName || "—")}
      </div>
    </div>
  `;

  // Если это НЕ свитч — выводим обычные интерфейсы из step3
  if (typeKey !== "switch") {
    const ifacesHtml = (ifaces || []).length
      ? (ifaces || []).map(nic => {
          const name  = nic.name || "—";
          const type  = nic.type || "—";
          const vlan  = nic.vlanVid || "—";
          const addr  = nic.address || "—";
          return `
            <div class="summary-iface-row">
              <div class="c1">${name}</div>
              <div class="c2">${type}</div>
              <div class="c3">${vlan}</div>
              <div class="c4">${addr}</div>
            </div>
          `;
        }).join("")
      : `<div class="muted">Интерфейсы не настроены.</div>`;

    rightHtml += `
      <div class="summary-section">
        <div class="summary-title">Интерфейсы</div>
        <div class="summary-ifaces">
          ${ifacesHtml}
        </div>
      </div>
    `;
  } else {
    // SWITCH: используем актуальный ovsCfg.bridges + renderOvsSummaryHtml(ovsCfg)
    rightHtml += `
      <div class="summary-section">
        <div class="summary-title">Open vSwitch</div>
        <div class="summary-ovs">
          ${renderOvsSummaryHtml(ovsCfg || {})}
        </div>
      </div>
    `;
  }

  // IPAM-сводка (общая, по офису)
  rightHtml += `
    <div class="summary-section">
      <div class="summary-title">IPAM</div>
      <div class="summary-ipam" id="summaryIpamArea"></div>
    </div>
  `;

  rightHtml += `</div>`; // end summary-right

  qs(".modal__body", summaryModal).innerHTML = `
    <div class="summary-layout">
      ${leftHtml}
      ${rightHtml}
    </div>
  `;

  /* Шаги + кнопки */
  qs(".modal__foot", summaryModal).innerHTML = `
    <div class="steps steps--fancy" data-step="4">
      <div class="steps__line"></div>
      <div class="steps__line-active" style="width:75%"></div>
      <div class="steps__dot is-done">1</div>
      <div class="steps__dot is-done">2</div>
      <div class="steps__dot is-done">3</div>
      <div class="steps__dot is-active">4</div>
      <div class="steps__dot">5</div>
    </div>
    <div class="modal-actions">
      <button id="vmSummaryBack" class="btn ghost">Назад</button>
      <button id="vmSummaryCreate" class="btn violet">Создать VM</button>
    </div>
  `;

  updateSteps(summaryModal, 4);

  // Назад: в зависимости от типа возвращаемся либо в OVS, либо в интерфейсы
  qs("#vmSummaryBack", summaryModal).onclick = () => {
    closeModal(summaryModal);
    if (typeKey === "switch" && ovsCfg) {
      openOvsStep(typeKey);
    } else {
      openInterfacesStep(typeKey);
    }
  };

  // Создать VM: используем finalizeVmGui(), чтобы:
  //  - записать VM в office.vms
  //  - сохранить в localStorage
  //  - написать строку в терминал, чтобы list vm увидел машину
  qs("#vmSummaryCreate", summaryModal).onclick = () => {
    const ok = finalizeVmGui();
    if (!ok) return;
    closeModal(summaryModal);
  };


  // IPAM-сводка
  renderIpamForSummary();

  openModal(summaryModal);
}


// Вывод IPAM-сводки на шаге 4
function renderIpamForSummary() {
  const box = document.getElementById("summaryIpamArea");
  if (!box) return;

  const ctx    = (typeof getOfficeCtx === "function") ? getOfficeCtx() : null;
  const office = ctx && ctx.office ? ctx.office : null;

  if (!office || !office.ipam || !Array.isArray(office.ipam.ranges) || office.ipam.ranges.length === 0) {
    box.innerHTML = `<div>IPAM: подсеть офиса не сконфигурирована.</div>`;
    return;
  }

  let html = "";

  office.ipam.ranges.forEach(r => {
    const capacity = ((r.last - r.start + 1) >>> 0); // всего адресов
    let used = 0;

    if (typeof r.next === "number") {
      used = ((r.next - r.start) >>> 0);
      if (used < 0) used = 0;
      if (used > capacity) used = capacity;
    }

    html += `<div>VLAN ${r.vid}: ${used}/${capacity} использовано</div>`;
  });

  box.innerHTML = html;
}

})();
