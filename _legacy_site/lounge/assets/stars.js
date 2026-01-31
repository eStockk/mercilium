const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
let w, h, stars = [], lines = [];

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;

  const count = w < 700 ? 60 : 120;
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: Math.random() * 0.7 + 0.3,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15
  }));

  lines = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (Math.random() < 0.045) {
        lines.push([i, j]);
      }
    }
  }
}
window.addEventListener("resize", resize);
resize();

let pulse = 0;

function animate() {
  ctx.fillStyle = "rgba(5, 0, 20, 0.9)";
  ctx.fillRect(0, 0, w, h);

  pulse += 0.02;

  // линии-созвездия
  for (const [i, j] of lines) {
    const a = stars[i], b = stars[j];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist < 250) {
      const alpha = 0.25 - dist / 800;
      ctx.strokeStyle = `rgba(180,130,255,${alpha})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // звёзды
  for (let s of stars) {
    s.x += s.vx; s.y += s.vy;
    if (s.x < 0 || s.x > w) s.vx *= -1;
    if (s.y < 0 || s.y > h) s.vy *= -1;

    const glow = 0.8 + Math.sin(pulse + s.x / 50) * 0.2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * glow, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,180,255,${s.z})`;
    ctx.shadowColor = `rgba(180,100,255,${s.z})`;
    ctx.shadowBlur = 10;
    ctx.fill();
  }

  requestAnimationFrame(animate);
}
animate();
