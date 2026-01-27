(() => {
  const canvas = document.getElementById("network");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const maxFPS = 30;
  let lastFrame = 0;
  let running = true;

  let w = 0;
  let h = 0;
  let dpr = 1;

  let points = [];
  let lines = [];
  let digits = [];
  let ripples = [];
  let mouse = { x: -9999, y: -9999 };
  let time = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = w < 600 ? 24 : w < 1000 ? 36 : 50;
    points = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25
      });
    }

    lines = [];
    const connectChance = w < 800 ? 0.05 : 0.07;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (Math.random() < connectChance) {
          lines.push({ a: i, b: j, offset: Math.random() });
        }
      }
    }

    digits = [];
    const digitCount = w < 600 ? 28 : w < 1000 ? 50 : 80;
    for (let i = 0; i < digitCount; i++) {
      digits.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 10 + Math.random() * 7,
        speed: 0.12 + Math.random() * 0.2,
        char: Math.floor(Math.random() * 10),
        alpha: 0.12 + Math.random() * 0.35
      });
    }
  }

  function drawBackground() {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 1.2);
    gradient.addColorStop(0, "rgba(15, 0, 40, 1)");
    gradient.addColorStop(0.5, "rgba(5, 0, 20, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 10, 1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  function drawFrame(ts) {
    if (!running) return;
    if (!prefersReduced) {
      if (ts - lastFrame < 1000 / maxFPS) {
        requestAnimationFrame(drawFrame);
        return;
      }
      lastFrame = ts;
    }

    drawBackground();
    time += 0.01;

    // ripples
    for (let r of ripples) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200,150,255,${r.alpha * 0.25})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(200,120,255,${r.alpha * 0.4})`;
      ctx.shadowBlur = 12;
      ctx.stroke();
      r.radius += 5;
      r.alpha -= 0.012;
    }
    ripples = ripples.filter(r => r.alpha > 0);

    // lines
    for (let line of lines) {
      const a = points[line.a];
      const b = points[line.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const alpha = Math.max(0.05, 1 - dist / 260);

      let mx = (a.x + b.x) / 2;
      let my = (a.y + b.y) / 2;
      const mDist = Math.hypot(mx - mouse.x, my - mouse.y);

      let waveForce = 0;
      for (let r of ripples) {
        const d = Math.hypot(mx - r.x, my - r.y);
        const diff = Math.abs(d - r.radius);
        if (diff < 40) waveForce += (40 - diff) / 40 * r.alpha;
      }

      if (mDist < 160) {
        const force = 1 - mDist / 160;
        mx += Math.sin(time * 2 + mDist / 24) * 4 * force;
        my += Math.cos(time * 2 + mDist / 30) * 4 * force;
      }

      mx += Math.sin(time + waveForce * 5) * waveForce * 8;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = `rgba(200,150,255,${alpha * (0.7 + waveForce)})`;
      ctx.lineWidth = 1 + waveForce * 1.6;
      ctx.shadowColor = `rgba(180,80,255,${alpha * (0.25 + waveForce)})`;
      ctx.shadowBlur = 6 + waveForce * 10;
      ctx.stroke();

      const t = (time * 0.5 + line.offset) % 1;
      const x = a.x + dx * t;
      const y = a.y + dy * t;
      ctx.save();
      ctx.shadowColor = "rgba(210,120,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(240,220,255,${alpha + 0.2 + waveForce * 0.5})`;
      ctx.font = "12px 'Courier New'";
      ctx.fillText(Math.floor((t * 10) % 10), x, y);
      ctx.restore();
    }

    // points
    for (let p of points) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,220,255,0.9)";
      ctx.shadowColor = "rgba(180,0,255,0.6)";
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    // floating digits
    for (let f of digits) {
      f.y -= f.speed;
      if (f.y < -10) {
        f.y = h + 10;
        f.x = Math.random() * w;
        f.char = Math.floor(Math.random() * 10);
        f.alpha = 0.15 + Math.random() * 0.35;
      }
      const pulse = Math.sin(time * 2.5 + f.x / 40) * 0.3 + 0.7;
      ctx.save();
      ctx.fillStyle = `rgba(200,150,255,${f.alpha * pulse})`;
      ctx.font = `${f.size}px 'Courier New'`;
      ctx.fillText(f.char, f.x, f.y);
      ctx.restore();
    }

    if (!prefersReduced) {
      requestAnimationFrame(drawFrame);
    }
  }

  function createRipple(x, y) {
    ripples.push({ x, y, radius: 0, alpha: 1 });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", e => (mouse = { x: e.clientX, y: e.clientY }));
  window.addEventListener("mouseleave", () => (mouse = { x: -9999, y: -9999 }));
  window.addEventListener("click", e => createRipple(e.clientX, e.clientY));
  window.addEventListener("touchstart", e => {
    const t = e.touches[0];
    createRipple(t.clientX, t.clientY);
  });

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running && !prefersReduced) requestAnimationFrame(drawFrame);
  });

  resize();
  if (prefersReduced) {
    drawFrame(0);
  } else {
    requestAnimationFrame(drawFrame);
  }
})();
