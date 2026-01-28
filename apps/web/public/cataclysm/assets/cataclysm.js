document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("loader");
  const main = document.getElementById("main");
  const guidesContainer = document.getElementById("guides");
  const sourcesContainer = document.getElementById("sources");

  setTimeout(async () => {
    loader.classList.add("fade-out");
    setTimeout(() => loader.remove(), 600);
    main.classList.remove("hidden");

    try {
      const res = await fetch("/api/public/posts");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїРѕСЃС‚РѕРІ");

      const guides = Array.isArray(data.guides) ? data.guides : [];
      const sources = Array.isArray(data.sources) ? data.sources : [];

      const makeList = arr => arr.map(p => {
        const tags = Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "Р‘РµР· С‚РµРіРѕРІ");
        return `
        <div class="post">
          <h3>${p.title}</h3>
          <p>${(p.content || "").replace(/<[^>]*>?/gm, '').slice(0, 100)}...</p>
          <div class="tags">${tags} вЂ” ${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
      `;
      }).join('');

      guidesContainer.innerHTML = makeList(guides);
      sourcesContainer.innerHTML = makeList(sources);

      startInfiniteScroll(guidesContainer, "down");
      startInfiniteScroll(sourcesContainer, "up");

    } catch (err) {
      guidesContainer.innerHTML = `<div class="error">${err.message}</div>`;
    }
  }, 1600);

  // Р¤СѓРЅРєС†РёСЏ Р°РІС‚РѕРїСЂРѕРєСЂСѓС‚РєРё (РІ РїСЂРµРґРµР»Р°С… 100vh)
  function startInfiniteScroll(el, direction = "down") {
    let speed = 0.3;
    let paused = false;
    let offset = 0;
    const content = el.innerHTML;
    el.innerHTML += content; // РґСѓР±Р»РёСЂСѓРµРј РґР»СЏ Р·Р°С†РёРєР»РёРІР°РЅРёСЏ

    el.addEventListener("mouseenter", () => paused = true);
    el.addEventListener("mouseleave", () => paused = false);
    el.addEventListener("wheel", e => {
      paused = true;
      offset += e.deltaY * 0.5;
      setTimeout(() => paused = false, 1200);
    });

    function loop() {
      if (!paused) {
        offset += (direction === "down" ? speed : -speed);
        const scrollHeight = el.scrollHeight / 2;
        el.scrollTop = (offset % scrollHeight + scrollHeight) % scrollHeight;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
});
