
// Stars background
(function(){
  const c = document.getElementById('stars'); if(!c) return;
  const ctx = c.getContext('2d'); let w,h,stars=[];
  function resize(){ w=c.width=innerWidth; h=c.height=innerHeight; stars = Array.from({length: Math.max(120, Math.floor(w*h/12000))}, ()=>({
    x:Math.random()*w, y:Math.random()*h, r:Math.random()*1.5+.3, vx:(Math.random()-.5)*.06, vy:(Math.random()-.5)*.06
  })); }
  function draw(){
    ctx.clearRect(0,0,w,h);
    // bg glow
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/1.2); g.addColorStop(0,"#090922"); g.addColorStop(1,"#02020a");
    ctx.fillStyle=g; ctx.fillRect(0,0,w, h);
    for(const s of stars){ ctx.globalAlpha=.9; ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); s.x+=s.vx; s.y+=s.vy; if(s.x<0)s.x=w; if(s.x>w)s.x=0; if(s.y<0)s.y=h; if(s.y>h)s.y=0; }
    requestAnimationFrame(draw);
  }
  addEventListener('resize', resize); resize(); draw();
})();

// Loader statuses
function runLoaderThen(showSelector){
  const statuses = document.querySelectorAll('.loader__status');
  let i=0;
  const tick = ()=>{
    if(i<statuses.length){ statuses[i].classList.add('on'); i++; setTimeout(tick, 350); }
    else{ setTimeout(()=>{ document.querySelector('.loader').style.display='none'; document.querySelector(showSelector).style.visibility='visible'; }, 350); }
  };
  tick();
}
document.addEventListener('DOMContentLoaded', ()=> runLoaderThen('.page'));

async function loginSubmit(e){
  e.preventDefault();
  const msg = document.getElementById('msg');
  msg.textContent = "";
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;

  try{
    const res = await fetch('api/auth.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({login, password})
    });
    const data = await res.json();
    if(data.ok){
      location.href = 'dashboard.php';
    }else{
      msg.textContent = data.error || "Ошибка авторизации";
    }
  }catch(err){
    msg.textContent = "Сеть недоступна";
    console.error(err);
  }
}
