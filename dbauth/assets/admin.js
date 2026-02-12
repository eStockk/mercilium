// ===== Звёздный фон
const starsCanvas = document.getElementById('stars');
const ctx = starsCanvas?.getContext('2d');
let STARS = [];

function resizeStars(){
  if(!starsCanvas) return;
  starsCanvas.width = innerWidth;
  starsCanvas.height = innerHeight;

  const count = Math.max(180, Math.floor((innerWidth*innerHeight)/12000));
  STARS = Array.from({length: count}, () => ({
    x: Math.random()*starsCanvas.width,
    y: Math.random()*starsCanvas.height,
    r: Math.random()*1.4 + .4,
    vx:(Math.random()-.5)*.08,
    vy:(Math.random()-.5)*.08,
    a:Math.random()*.7+.3
  }));
}
function drawStars(){
  if(!ctx) return;
  ctx.clearRect(0,0,starsCanvas.width,starsCanvas.height);
  ctx.fillStyle="#fff";
  for(const s of STARS){
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fill();
    s.x+=s.vx; s.y+=s.vy;
    if(s.x<0) s.x=starsCanvas.width; if(s.x>starsCanvas.width) s.x=0;
    if(s.y<0) s.y=starsCanvas.height; if(s.y>starsCanvas.height) s.y=0;
  }
  requestAnimationFrame(drawStars);
}
addEventListener('resize', resizeStars);

// ===== Лоадер с ореолом и статусами
const loader = document.getElementById('loader');
const page = document.getElementById('page');

const statusLines = [
  'Инициализация интерфейса…',
  'Проверка токена сессии…',
  'Подключение к БД…',
  'Загрузка модулей редактора…',
  'Подготовка панели…'
];

function mountStatuses(){
  const box = document.querySelector('.loader-status');
  if(!box) return;
  box.innerHTML = '';
  for(let i=0;i<5;i++){
    const row = document.createElement('div');
    row.className = 'status-line';
    row.innerHTML = `<span class="status-dot"></span><span class="status-text">${statusLines[i%statusLines.length]}</span>`;
    box.appendChild(row);
  }
  // лёгкая анимация текста
  let idx = 0;
  setInterval(()=>{
    const nodes = box.querySelectorAll('.status-text');
    nodes[idx%nodes.length].textContent = statusLines[(idx++)%statusLines.length];
  }, 1200);
}

function showContentNow(){
  if(!loader || !page) return;
  loader.style.transition = 'opacity .7s ease';
  loader.style.opacity = '0';
  setTimeout(()=>{ loader.style.display='none'; }, 700);
  page.style.transition = 'opacity .9s ease';
  page.style.opacity = '1';
  document.body.style.overflow = 'auto';
}

document.addEventListener('DOMContentLoaded', ()=>{
  resizeStars(); drawStars();
  mountStatuses();

  // гарант: лоадер виден первым
  document.body.style.overflow = 'hidden';
  page.style.opacity = '0';
  loader.style.display = 'grid';

  // Минимальная и максимальная длительность лоадера
  const minT = 900, maxT = 1800;
  const t = Math.random()*(maxT-minT)+minT;
  setTimeout(showContentNow, t);

  // Защита от зависаний
  setTimeout(showContentNow, 4500);
});
