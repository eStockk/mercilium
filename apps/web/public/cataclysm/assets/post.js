function initPostObserver() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document
    .querySelectorAll(".quill-content > *")
    .forEach(el => observer.observe(el));
}

function initStars() {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let stars = [];
  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const count = Math.max(150, Math.floor(canvas.width / 7));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      a: Math.random() * 0.8 + 0.2
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#ffffff";
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
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
}

async function loadPost() {
  try {
    const res = await fetch(`/api/public/posts/${POST_ID}`, { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Ошибка API");

    const p = data.post || {};
    const titleEl = document.getElementById("postTitle");
    const dateEl = document.getElementById("postDate");
    const tagsWrap = document.getElementById("postTags");
    const contentEl = document.getElementById("postContent");

    if (titleEl) titleEl.textContent = p.title || "Без названия";
    if (dateEl) {
      dateEl.textContent = p.created_at
        ? new Date(p.created_at).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "";
    }

    if (tagsWrap) {
      const tagsArr = Array.isArray(p.tags)
        ? p.tags
        : String(p.tags || "")
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);
      tagsWrap.innerHTML = "";
      tagsArr.forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = `#${t}`;
        tagsWrap.appendChild(span);
      });
    }

    const catSwitch = document.getElementById("categorySwitch");
    const catContent = document.getElementById("categoryContent");
    const categories = Array.isArray(p.categories) ? p.categories : [];

    if (categories.length && catSwitch && catContent) {
      catSwitch.innerHTML = categories
        .map(
          (c, idx) =>
            `<button class="category-tab${idx === 0 ? " active" : ""}" data-index="${idx}">${c.name}</button>`
        )
        .join("");

      catContent.innerHTML = categories
        .map(
          (c, idx) =>
            `<div class="category-panel quill-content${idx === 0 ? " active" : ""}" data-index="${idx}">${c.content || ""}</div>`
        )
        .join("");

      catSwitch.style.display = "";
      catContent.style.display = "";
      if (contentEl) contentEl.style.display = "none";

      catSwitch.querySelectorAll(".category-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = btn.dataset.index;
          catSwitch.querySelectorAll(".category-tab").forEach(b =>
            b.classList.toggle("active", b === btn)
          );
          catContent.querySelectorAll(".category-panel").forEach(panel => {
            panel.classList.toggle("active", panel.dataset.index === idx);
          });
        });
      });
    } else {
      if (catSwitch) catSwitch.style.display = "none";
      if (catContent) catContent.style.display = "none";
      if (contentEl) {
        contentEl.style.display = "";
        contentEl.innerHTML = p.content_html || "<p><em>Контент пуст</em></p>";
      }
    }

    const srcWrap = document.getElementById("postSources");
    const srcTitle = document.getElementById("postSourceTitle");
    const srcTags = document.getElementById("postSourceTags");
    const srcDate = document.getElementById("postSourceDate");
    const srcs = data.linked_sources || [];

    if (Array.isArray(srcs) && srcs.length && srcWrap) {
      const s = srcs[0];
      srcWrap.style.display = "";
      if (srcTitle) srcTitle.textContent = s.title || `Источник #${s.id}`;
      if (srcDate) {
        srcDate.textContent = s.created_at
          ? new Date(s.created_at).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })
          : "";
      }
      if (srcTags) {
        const tagList = Array.isArray(s.tags)
          ? s.tags
          : String(s.tags || "")
              .split(",")
              .map(t => t.trim())
              .filter(Boolean);
        srcTags.innerHTML = "";
        tagList.forEach(t => {
          const span = document.createElement("span");
          span.className = "tag";
          span.textContent = t;
          srcTags.appendChild(span);
        });
      }
      srcWrap.onclick = () => {
        window.location.href = `/cataclysm/${s.id}`;
      };
    } else if (srcWrap) {
      srcWrap.style.display = "none";
    }
  } catch (e) {
    console.error(e);
    const titleEl = document.getElementById("postTitle");
    const contentEl = document.getElementById("postContent");
    if (titleEl) titleEl.textContent = "Ошибка загрузки";
    if (contentEl) contentEl.innerHTML = `<p>${e.message}</p>`;
  }
}

function initPostPage() {
  initStars();
  initPostObserver();
  const toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", () => {
      toTop.classList.toggle("visible", window.scrollY > 400);
    });
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  loadPost();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPostPage);
} else {
  initPostPage();
}
