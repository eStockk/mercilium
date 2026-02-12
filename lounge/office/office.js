/* =============================
   Общие константы/утилиты
============================= */
const STORE_KEY = 'lounge_offices_v1';
const TERM_HISTORY_KEY = 'lounge_office_terms_v1';

// история терминалов офисов
let officeTermHistory = {};
try {
  officeTermHistory = JSON.parse(localStorage.getItem(TERM_HISTORY_KEY)) || {};
} catch {
  officeTermHistory = {};
}

let currentOfficeTermKey = null;

const VLAN_ROLES = ['Клиенты','Сервера','Администраторы'];
const ROLE_PRIORITY = {'Клиенты':1, 'Сервера':2, 'Администраторы':3};

function ipToInt(ip){ return ip.split('.').reduce((a,p)=> (a<<8)+(+p),0)>>>0; }
function intToIp(int){ return [24,16,8,0].map(s=> (int>>>s)&255 ).join('.'); }
function cidrInfo(cidr){ const [ip,b]=cidr.split('/'); const bits=+b; const base=ipToInt(ip); const mask=bits===0?0:(~0<<(32-bits))>>>0; const net=base&mask; const bc=net|(~mask>>>0); const first=bits>=31?net:(net+1)>>>0; const last=bits>=31?bc:(bc-1)>>>0; const usable=bits>=31?0:(last-first+1)>>>0; return {net,first,last,mask,usable}; }

function rebuildIpam(office){
  if(!office.cidr){ office.ipam={ranges:[],used:{}}; return;}
  const info = cidrInfo(office.cidr);
  let cursor = info.first, end=info.last;
  const vlans = [...(office.vlans||[])].sort((a,b)=> ROLE_PRIORITY[a.role]-ROLE_PRIORITY[b.role]);
  const used = office.ipam?.used || {};
  const ranges = [];
  for(const v of vlans){
    const need = Math.max(1, +v.cap|0);
    if(cursor+need-1> end) break;
    const start = cursor, last = cursor+need-1;
    ranges.push({vid:v.vid, role:v.role, start, last, next: Math.max(start,(used[v.vid]?.next||start))});
    cursor = last+1;
  }
  office.ipam = {ranges, used:Object.fromEntries(ranges.map(r=>[r.vid,{next:r.next}]))};
}
function allocIP(office, vlanVid){
  const r = office.ipam?.ranges?.find(x=> x.vid==vlanVid);
  if(!r) return null;
  if(r.next>r.last) return null;
  const ip = r.next; r.next = (r.next+1)>>>0;
  office.ipam.used[vlanVid] = {next:r.next};
  return intToIp(ip);
}


function loadState(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || { offices: [], freedCovers: [] }; }
  catch{ return { offices: [], freedCovers: [] }; }
}
function saveState(s){ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
function persistOffice(){
  saveState(state);
  refreshLeft();
}
function qs(sel,root=document){ return root.querySelector(sel); }
function ce(tag,cls){ const el=document.createElement(tag); if(cls) el.className=cls; return el; }
function nowTs(){ const d=new Date(); return d.toTimeString().slice(0,8); }
let glowTimer = null;

function writeLine(html, cls=''){
  const line = ce('div', 'line ' + cls);
  line.innerHTML = `<span class="ts">[${nowTs()}]</span> ${html}`;
  termBody.appendChild(line);

  const isAtBottom = termBody.scrollTop + termBody.clientHeight >= termBody.scrollHeight - 40;
  if (isAtBottom) termBody.scrollTop = termBody.scrollHeight;

  const terminal = document.querySelector('.terminal');
  if (terminal && termBody.scrollHeight > termBody.clientHeight + 10) {
    terminal.classList.add('glow');
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => terminal.classList.remove('glow'), 3500);
  }

    // persist history для текущего офиса
  if (currentOfficeTermKey) {
    officeTermHistory[currentOfficeTermKey] = termBody.innerHTML;
    try {
      localStorage.setItem(TERM_HISTORY_KEY, JSON.stringify(officeTermHistory));
    } catch {}
  }
}





/* =============================
   Фон: лёгкие "сканлайны" аним.
============================= */
(function bg(){
  const c = document.getElementById('bg'); const ctx = c.getContext('2d');
  function resize(){ c.width=innerWidth; c.height=innerHeight; }
  addEventListener('resize', resize); resize();
  let t=0;
  (function loop(){
    t+=0.02;
    ctx.clearRect(0,0,c.width,c.height);
    // лёгкий шум
    for(let i=0;i<70;i++){
      const x=Math.random()*c.width, y=Math.random()*c.height, r=Math.random()*1.2;
      ctx.fillStyle=`rgba(126,53,255,${Math.random()*.05})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
})();

/* =============================
   Глобальные DOM
============================= */
const officeTitle  = qs('#officeTitle');
const infoName     = qs('#infoName');
const infoCIDR     = qs('#infoCIDR');
const infoOnline   = qs('#infoOnline');
const infoStable   = qs('#infoStable');
const infoVlanCnt  = qs('#infoVlanCnt');
const officeImg    = qs('#officeImg');
const btnToggleOnline = qs('#btnToggleOnline');

const termBody   = qs('#termBody');
// запрет растягивания терминала — только скролл
termBody.style.overflowY = 'auto';
termBody.style.maxHeight = '100%';
termBody.style.scrollBehavior = 'smooth';

const termPrompt = qs('#termPrompt');
const cmdInput   = qs('#cmd');

const btnAddVM   = qs('#btnAddVM');
const btnMap     = qs('#btnMap');

/* =============================
   Загрузка офиса из URL
============================= */
const state = loadState();
const params = new URLSearchParams(location.search);
const officeId = params.get('id');

let office = state.offices.find(o => String(o.id) === String(officeId));
if(!office){
  // если нет — в офисы
  location.replace('/lounge/');
}
// ключ истории для этого офиса
currentOfficeTermKey = `office_${office.id}`;

/* =============================
   Отрисовка левой панели
============================= */
function refreshLeft(){
  officeTitle.textContent = office.name;
  infoName.textContent = office.name;
  infoCIDR.textContent = office.cidr || '—';
  infoVlanCnt.textContent = office.vlans?.length || 0;

  if(office.online){
    infoOnline.textContent = 'online';
    infoOnline.classList.remove('pill-off'); infoOnline.classList.add('pill','pill-on');
    btnToggleOnline.textContent='online';
    btnToggleOnline.classList.remove('ghost'); btnToggleOnline.classList.add('violet');
  }else{
    infoOnline.textContent = 'offline';
    infoOnline.classList.remove('pill-on'); infoOnline.classList.add('pill','pill-off');
    btnToggleOnline.textContent='offline';
    btnToggleOnline.classList.add('ghost'); btnToggleOnline.classList.remove('violet');
  }

  // простая "стабильность": нет VLAN → предупреждение
  if(!office.vlans || office.vlans.length===0){
    infoStable.textContent = '⚠ Нет VLAN';
    infoStable.classList.add('warn');
  }else{
    infoStable.textContent = 'OK';
    infoStable.classList.remove('warn');
  }

  const cover = Number(office.coverIndex||1);
  officeImg.src = `/lounge/custom/img/office_${cover}.png`;
  officeImg.onerror = ()=> { officeImg.src = `/lounge/custom/img/office_1.png`; };
}
refreshLeft();

/* =============================
   Переключение online/offline
============================= */
btnToggleOnline.onclick = ()=>{
  office.online = !office.online;
  saveState(state);
  refreshLeft();
  writeLine(`<span class="hl">Статус</span> офиса: ${office.online ? 'online' : 'offline'}`);
};

/* =============================
   ТЕРМИНАЛ: help/exit/list/del
============================= */
const HELP_TEXT = [
  'Доступные команды:',
  '  help                — список команд',
  '  exit                — прекратить текущий процесс (мастер/конфиг)',
  '  list vm             — список машин',
  '  del vm <id>         — удалить машину по id',
  '  config vm <id>      — войти в режим настройки VM',
  '  clear               — очистить экран терминала',
].join('\n');


let wizard = null;  // текущий "процесс" пошагового создания ВМ (или null)
let vmConfig = null;  // режим настройки уже существующей VM

function printHelp(){ HELP_TEXT.split('\n').forEach(l=>writeLine(l)); }
function printList(){
  const vms = office.vms||[];
  if(!vms.length){ writeLine('Машины не созданы.'); return; }
  for(const vm of vms){
    writeLine(`VM#${vm.id}  ${vm.type}  ${vm.distro}  host:${vm.hostname}${vm.domain?'.'+vm.domain:''}`);
    if(vm.ifaces?.length){
      vm.ifaces.forEach(nic=>{
        writeLine(
  `  - ${nic.name}  mode:${nic.mode}` +
  (nic.vlanId ? ` vlan:${nic.vlanId}` : '') +
  (nic.addrMode ? ` addr:${nic.addrMode}` : '') +
  (nic.ip ? ` ip:${nic.ip}` : '')
);

      });
    }
  }
}
function deleteVmById(id){
  const vms = office.vms||[];
  const idx = vms.findIndex(v=> String(v.id) === String(id));
  if(idx===-1){ writeLine(`Не найдена VM с id=${id}`, 'err'); return; }
  vms.splice(idx,1);
  office.vms = vms;
  saveState(state);
  writeLine(`VM#${id} удалена.`);
}

/* =============================
   Парсинг IP/CIDR утилиты
============================= */
function ipToInt(ip){
  const p = ip.split('.').map(Number);
  if(p.length!==4 || p.some(n=>isNaN(n)||n<0||n>255)) return null;
  return (p[0]<<24) + (p[1]<<16) + (p[2]<<8) + p[3];
}
function intToIp(int){
  return [ (int>>>24)&255, (int>>>16)&255, (int>>>8)&255, int&255 ].join('.');
}
function parseCIDR(cidr){
  if(!cidr || !cidr.includes('/')) return null;
  const [net,maskStr] = cidr.split('/');
  const maskLen = +maskStr; if(isNaN(maskLen)||maskLen<0||maskLen>32) return null;
  const base = ipToInt(net); if(base==null) return null;
  const mask = maskLen===0 ? 0 : (~0 << (32-maskLen)) >>>0;
  const network = base & mask;
  const broadcast = network | (~mask >>>0);
  return { base, mask, maskLen, network, broadcast, netStr:intToIp(network), bcStr:intToIp(broadcast) };
}
function isIpInCidr(ip, cidrObj){
  const val = ipToInt(ip); if(val==null) return false;
  return val>=cidrObj.network && val<=cidrObj.broadcast;
}



const TYPES = [
  { key:'router', label:'Маршрутизатор/Роутер' },
  { key:'switch', label:'Коммутатор/Свитч' },
  { key:'server', label:'Сервер' },
  { key:'firewall', label:'Фаервол' },
  { key:'client', label:'Клиент' },
];
const DISTROS_ALL = ['Alt Server','Alt Workstation','Debian','EcoRouter'];
const DISTROS_CLIENT = ['Alt Server','Alt Workstation','Debian'];

function promptType(){
  writeLine('Выберите тип машины (1-5):');
  TYPES.forEach((t,i)=> writeLine(`  ${i+1}. ${t.label}`));
  termPrompt.textContent='type>';
  wizard.step=0;
}
function promptDistro(){
  const list = (wizard.data.type==='client') ? DISTROS_CLIENT : DISTROS_ALL;
  wizard._dList = list;
  writeLine('Выберите дистрибутив:');
  list.forEach((d,i)=> writeLine(`  ${i+1}. ${d}`));
  termPrompt.textContent='distro>';
  wizard.step=1;
}
function promptHostname(){
  writeLine('Введите hostname (латиница/цифры/дефис):');
  termPrompt.textContent='host>';
  wizard.step=2;
}
function promptDomain(){
  writeLine('Укажите domain-name (опционально, пусто — пропустить):');
  termPrompt.textContent='domain>';
  wizard.step=3;
}
function promptIfaceCount(){
  writeLine('Сколько интерфейсов создать? (1..16):');
  termPrompt.textContent='ifcount>';
  wizard.step=4;
}
function promptIfaceName(){
  const i = wizard.data.ifaces.length;
  writeLine(`Имя интерфейса #${i+1} (напр. eth0):`);
  termPrompt.textContent=`ifname#${i+1}>`;
  wizard.step=5;
}
function promptIfaceMode(){
  const i = wizard._configIndex;
  writeLine(`Режим интерфейса ${wizard.data.ifaces[i].name} (dhcp/static/vlan):`);
  termPrompt.textContent=`mode:${wizard.data.ifaces[i].name}>`;
  wizard.step=6;
}
function promptIfaceParams(){
  const i = wizard._configIndex;

  if (wizard.data.ifaces[i].mode === 'dhcp') {
    // dhcp — параметров не нужно
    nextIfaceOrFinish();
    return;
  }

  // static или vlan — выбираем VLAN, IP выдадим автоматически
  if(!office.vlans || office.vlans.length===0){
    writeLine('У офиса нет VLAN. Вернитесь и добавьте VLAN в настройках офиса.', 'err');
    writeLine('Мастер прерван.');
    wizard=null; termPrompt.textContent='$'; return;
  }
  writeLine('Выберите VLAN (VID):');
  office.vlans.forEach(v=> writeLine(`  - ${v.vid} (${v.role||'без роли'})`));
  termPrompt.textContent=`vlan:${wizard.data.ifaces[i].name}>`;
  wizard.step=8; // ввод VID
}

function nextIfaceOrFinish(){
  // если есть еще nics без mode — переход к ним
  const idx = wizard.data.ifaces.findIndex(n=>!n.mode);
  if(idx!==-1){ wizard._configIndex = idx; promptIfaceMode(); return; }
  // все modes стоят → для static/vlan может требоваться ip, vlanId
  const needParams = wizard.data.ifaces.find(n=> (n.mode==='static' && !n.ip) || (n.mode==='vlan' && !n.vlanId));
  if(needParams){
    wizard._configIndex = wizard.data.ifaces.indexOf(needParams);
    promptIfaceParams(); return;
  }
  // готово
  finalizeVm();
}
function finalizeVm(){
  const arr = office.vms || [];
  const nextId = arr.length ? Math.max(...arr.map(v=>v.id))+1 : 1;
  const vm = {
    id: nextId,
    type: wizard.data.type,
    distro: wizard.data.distro,
    hostname: wizard.data.hostname,
    domain: wizard.data.domain || '',
    ifaces: wizard.data.ifaces
  };
  arr.push(vm);
  office.vms = arr; saveState(state);
  writeLine(`VM#${vm.id} создана: ${vm.type} ${vm.distro} host:${vm.hostname}${vm.domain?'.'+vm.domain:''}`);
  wizard=null; termPrompt.textContent='$';
}

/* =============================
   Обработка команды ввода
============================= */
cmdInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') {
    e.preventDefault();
    const raw = cmdInput.value.trim();
    if (!raw) return;
    writeLine(`$ ${raw}`);
    cmdInput.value = '';

    // режим мастера создания
    if (wizard) {
      handleWizardInput(raw);
      return;
    }

    // режим настройки конкретной VM
    if (vmConfig) {
      handleVmConfigInput(raw);
      return;
    }

    // обычные команды
    const [cmd, ...rest] = raw.split(/\s+/);

    if (cmd === 'help') {
      printHelp();
    }
    else if (cmd === 'exit') {
      writeLine('Нет активного процесса.', 'err');
    }
    else if (cmd === 'clear') {
      termBody.innerHTML = '';
    }
    else if (cmd === 'list' && rest[0] === 'vm') {
      printList();
    }
    else if (cmd === 'del' && rest[0] === 'vm' && rest[1]) {
      deleteVmById(rest[1]);
    }
    else if (cmd === 'config' && rest[0] === 'vm' && rest[1]) {
      startVmConfig(rest[1]);
    }
    else {
      writeLine('Неизвестная команда. Введите "help".','err');
    }
  }
});


/* =============================
   Ввод для мастера
============================= */


function startVmConfig(vmId) {
  const vms = office.vms || [];
  const vm = vms.find(v => String(v.id) === String(vmId));
  if (!vm) {
    writeLine(`VM с id=${vmId} не найдена`, 'err');
    return;
  }

  vmConfig = { vm };
  termPrompt.textContent = `vm#${vm.id}>`;

  writeLine(`Режим настройки VM#${vm.id}`);
  writeLine(`Тип: ${vm.type}, дистрибутив: ${vm.distro}`);
  writeLine(`Hostname: ${vm.hostname}${vm.domain ? '.'+vm.domain : ''}`);
  writeLine('Интерфейсы:');
  (vm.ifaces || []).forEach(nic => {
    writeLine(
      `  - ${nic.name}  mode:${nic.mode || '-'}`
      + (nic.vlanId ? ` vlan:${nic.vlanId}` : '')
      + (nic.ip ? ` ip:${nic.ip}` : '')
    );
  });
  writeLine('Доступные команды в режиме VM:');
  writeLine('  show                         — показать конфигурацию VM');
  writeLine('  set host <name>              — изменить hostname');
  writeLine('  set domain <name>            — изменить domain (пусто — убрать)');
  writeLine('  iface add <name>             — добавить интерфейс');
  writeLine('  iface del <name>             — удалить интерфейс');
  writeLine('  iface mode <name> <m>        — установить режим (dhcp/static/vlan)');
  writeLine('  iface vlan <name> <VID>      — привязать к VLAN и выдать IP');
  writeLine('  exit                         — выйти из режима настройки VM');
}

function handleVmConfigInput(raw) {
  const vm = vmConfig?.vm;
  if (!vm) {
    vmConfig = null;
    termPrompt.textContent = '$';
    writeLine('Режим конфигурации VM потерял контекст.', 'err');
    return;
  }

  if (!raw) return;

  // общие команды
  if (raw === 'exit') {
    vmConfig = null;
    termPrompt.textContent = '$';
    writeLine(`Выход из режима настройки VM#${vm.id}`);
    saveState(state);
    return;
  }

  if (raw === 'show') {
    startVmConfig(vm.id); // просто заново напечатаем инфу
    return;
  }

  const [cmd, sub, ...rest] = raw.split(/\s+/);

  if (cmd === 'set' && sub === 'host') {
    const name = rest.join(' ').trim();
    if (!name || !/^[a-zA-Z0-9-]{1,64}$/.test(name)) {
      writeLine('Некорректный hostname.', 'err');
      return;
    }
    vm.hostname = name;
    writeLine(`Hostname обновлён: ${vm.hostname}${vm.domain ? '.'+vm.domain : ''}`);
    saveState(state);
    return;
  }

  if (cmd === 'set' && sub === 'domain') {
    const dom = rest.join(' ').trim();
    if (dom && !/^[a-z0-9.-]+$/i.test(dom)) {
      writeLine('Некорректный domain-name.', 'err');
      return;
    }
    vm.domain = dom || '';
    writeLine(`Domain обновлён: ${vm.domain || '(пусто)'}`);
    saveState(state);
    return;
  }

  if (cmd === 'iface' && sub === 'add') {
    const ifname = rest[0];
    if (!ifname || !/^[a-zA-Z0-9_.:-]{1,16}$/.test(ifname)) {
      writeLine('Некорректное имя интерфейса.', 'err');
      return;
    }
    vm.ifaces ||= [];
    if (vm.ifaces.some(n => n.name === ifname)) {
      writeLine(`Интерфейс ${ifname} уже существует.`, 'err');
      return;
    }
    vm.ifaces.push({ name: ifname, mode: 'dhcp' });
    writeLine(`Интерфейс ${ifname} добавлен (mode: dhcp).`);
    saveState(state);
    return;
  }

  if (cmd === 'iface' && sub === 'del') {
    const ifname = rest[0];
    if (!ifname) {
      writeLine('Укажите имя интерфейса.', 'err');
      return;
    }
    vm.ifaces ||= [];
    const idx = vm.ifaces.findIndex(n => n.name === ifname);
    if (idx === -1) {
      writeLine(`Интерфейс ${ifname} не найден.`, 'err');
      return;
    }
    vm.ifaces.splice(idx, 1);
    writeLine(`Интерфейс ${ifname} удалён.`);
    saveState(state);
    return;
  }

  if (cmd === 'iface' && sub === 'mode') {
    const ifname = rest[0];
    const mode   = (rest[1] || '').toLowerCase();
    if (!ifname || !mode) {
      writeLine('Использование: iface mode <name> <dhcp|static|vlan>', 'err');
      return;
    }
    if (!['dhcp','static','vlan'].includes(mode)) {
      writeLine('Режим должен быть dhcp/static/vlan.', 'err');
      return;
    }
    vm.ifaces ||= [];
    const nic = vm.ifaces.find(n => n.name === ifname);
    if (!nic) {
      writeLine(`Интерфейс ${ifname} не найден.`, 'err');
      return;
    }
    nic.mode = mode;
    // адреса переназначим при vlan-команде
    writeLine(`Интерфейс ${ifname}: mode=${mode}`);
    saveState(state);
    return;
  }

  if (cmd === 'iface' && sub === 'vlan') {
    const ifname = rest[0];
    const vid    = +(rest[1] || 0);
    if (!ifname || !vid) {
      writeLine('Использование: iface vlan <name> <VID>', 'err');
      return;
    }
    if (!office.vlans || !office.vlans.length) {
      writeLine('В офисе нет VLAN. Настройте VLAN в офисе.', 'err');
      return;
    }
    const vlan = office.vlans.find(v => Number(v.vid) === vid);
    if (!vlan) {
      writeLine(`VLAN VID=${vid} не найден.`, 'err');
      return;
    }
    vm.ifaces ||= [];
    const nic = vm.ifaces.find(n => n.name === ifname);
    if (!nic) {
      writeLine(`Интерфейс ${ifname} не найден.`, 'err');
      return;
    }

    // выдаём IP из пула VLAN
    const ip = allocIP(office, vid);
    if (!ip) {
      writeLine(`В VLAN ${vid} (${vlan.role}) закончились адреса.`, 'err');
      return;
    }

    nic.vlanId   = vid;
    nic.ip       = ip;
    nic.addrMode = 'static';
    if (!nic.mode || nic.mode === 'dhcp') nic.mode = 'vlan';

    rebuildIpam(office);
    saveState(state);

    writeLine(`Интерфейс ${ifname}: VLAN ${vid} (${vlan.role}), IP ${ip}`);
    return;
  }

  writeLine('Неизвестная команда в режиме VM. Введите "show" или "exit".', 'err');
}


// редактирование VLAN из офиса
const modalVlan = document.getElementById('modalVlan');
document.getElementById('btnEditVlan').onclick = ()=>{
  const rows = document.getElementById('vlanRowsOffice');
  rows.innerHTML = '';
  (office.vlans||[]).forEach(v=> addVlanRowOffice(v.vid, v.role, v.cap));
  if(rows.children.length===0) addVlanRowOffice();
  modalVlan.classList.add('active');
};
document.querySelectorAll('#modalVlan [data-close]').forEach(b=> b.onclick=()=> modalVlan.classList.remove('active'));
document.getElementById('btnAddVlanOffice').onclick = ()=> addVlanRowOffice();

document.getElementById('btnSaveVlanOffice').onclick = ()=>{
  const rows = document.querySelectorAll('#vlanRowsOffice .vlan-row');
  const vlans = [];
  rows.forEach(r=>{
    const vid  = +(r.querySelector('.vid').value||0);
    const role = r.querySelector('.role').value||'Клиенты';
    const cap  = +(r.querySelector('.cap').value||0);
    if(vid>0 && cap>0) vlans.push({vid,role,cap});
  });
  office.vlans = vlans;
  rebuildIpam(office);
  persistOffice();        // твоя функция сохранения в localStorage/обновления
  modalVlan.classList.remove('active');
  // обнови UI статуса
  document.getElementById('infoVlanCnt').textContent = office.vlans.length;
};

function addVlanRowOffice(vid='',role='Клиенты',cap=''){
  const rows = document.getElementById('vlanRowsOffice');
  const row = document.createElement('div');
  row.className = 'vlan-row';
  row.innerHTML = `
    <input class="vid"  type="number" min="1" max="4094" placeholder="VID" value="${vid}">
    <select class="role">${VLAN_ROLES.map(r=>`<option ${r===role?'selected':''}>${r}</option>`).join('')}</select>
    <input class="cap" type="number" min="1" max="2000" placeholder="Вместимость" value="${cap}">
    <button class="del">×</button>
  `;
  row.querySelector('.del').onclick = ()=> row.remove();
  rows.appendChild(row);
}

// planner.js
const VM_ICON_BY_TYPE = {
  router:   '../custom/img/router.png',
  switch:   '../custom/img/switch.png',
  server:   '../custom/img/server.png',
  firewall: '../custom/img/firewall.png',
  client:   '../custom/img/client.png',
};

function getVmIcon(vm){
  const t = (vm?.type || '').toLowerCase();
  return VM_ICON_BY_TYPE[t] || VM_ICON_BY_TYPE.generic;
}

/* =============================
   Инициализация терминала
============================= */

// если история уже есть — просто восстанавливаем её
if (currentOfficeTermKey && officeTermHistory[currentOfficeTermKey]) {
  termBody.innerHTML = officeTermHistory[currentOfficeTermKey];
  termBody.scrollTop = termBody.scrollHeight;
} else {
  // первый заход в терминал этого офиса — показываем "boot"
  writeLine('Инициализация сетевого терминала ...');
  writeLine('Проверка состояния VLAN ...');
  if(!office.vlans || !office.vlans.length) writeLine('⚠ Внимание: VLAN не заданы', 'err');
  writeLine('Проверка CIDR и подсети ...');
  if(!office.cidr) writeLine('⚠ Внимание: CIDR не задан', 'err');
  writeLine('Состояние офиса получено успешно.');
  writeLine('Введите "help" для списка команд.');
}


