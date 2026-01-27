/* Mercilium cosmic background + adaptive stars + loader */

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const loader = document.getElementById("loader");
  const starsCanvas = document.getElementById("stars");
  const ctx = starsCanvas.getContext("2d");

  // === 1. Показываем экран загрузки первым ===
  loader.style.display = "flex";
  body.style.overflow = "hidden";
  const main = document.getElementById("main");
  main.style.opacity = "0";

  // === 2. Размер и адаптация ===
  function resizeCanvas() {
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;

    // Кол-во звёзд рассчитываем динамически
    const area = starsCanvas.width * starsCanvas.height;
    // Базовое значение: 1 звезда на каждые 12000 пикселей площади
    STAR_COUNT = Math.max(50, Math.floor(area / 12000));
    MAX_DISTANCE = Math.min(200, Math.max(100, starsCanvas.width / 8));

    // Пересоздаём массив звёзд
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.07,
        vy: (Math.random() - 0.5) * 0.07,
      });
    }
  }

  let STAR_COUNT = 100;
  let MAX_DISTANCE = 150;
  const stars = [];
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // === 3. Отрисовка звёзд и созвездий ===
  function drawStars() {
    ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);

    // Глубокий космос
    const gradient = ctx.createRadialGradient(
      starsCanvas.width / 2,
      starsCanvas.height / 2,
      0,
      starsCanvas.width / 2,
      starsCanvas.height / 2,
      starsCanvas.width / 1.2
    );
    gradient.addColorStop(0, "#090922");
    gradient.addColorStop(1, "#02020a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, starsCanvas.width, starsCanvas.height);

    // Соединяем звёзды (созвездия)
    ctx.lineWidth = 0.5;
    for (let i = 0; i < STAR_COUNT; i++) {
      for (let j = i + 1; j < STAR_COUNT; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DISTANCE) {
          const alpha = 1 - dist / MAX_DISTANCE;
          ctx.strokeStyle = `rgba(148, 0, 211, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }

    // Отрисовываем звёзды
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = starsCanvas.width;
      if (s.x > starsCanvas.width) s.x = 0;
      if (s.y < 0) s.y = starsCanvas.height;
      if (s.y > starsCanvas.height) s.y = 0;
    }

    requestAnimationFrame(drawStars);
  }

  // === 4. Эмуляция загрузки ===
  const minTime = 1200, maxTime = 2500;
  const loadTime = Math.random() * (maxTime - minTime) + minTime;

  setTimeout(() => {
    loader.style.transition = "opacity 0.8s ease";
    loader.style.opacity = "0";

    setTimeout(() => {
      loader.style.display = "none";
      main.style.transition = "opacity 1s ease";
      main.style.opacity = "1";
      body.style.overflow = "auto";
    }, 700);
  }, loadTime);

  // === 5. Защита от зависаний ===
  setTimeout(() => {
    loader.style.display = "none";
    main.style.opacity = "1";
    body.style.overflow = "auto";
  }, 5000);

  // === 6. Стартуем анимацию ===
  setTimeout(drawStars, 100);
});
