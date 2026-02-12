document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const guidesList = document.getElementById("guidesList");
  const sourcesList = document.getElementById("sourcesList");

  // === Убираем загрузчик после старта ===
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = "0";
      loader.style.transition = "opacity 0.8s ease";
      setTimeout(() => loader.remove(), 900);
    }, 1800);
  }

  // === Получаем посты ===
  async function refreshPosts() {
    if (!guidesList || !sourcesList) return;
    try {
      const res = await fetch("/dbauth/pages/api/get_posts.php");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Ошибка API");

      guidesList.innerHTML = data.guides.map(renderCard).join("");
      sourcesList.innerHTML = data.sources.map(renderCard).join("");

      // Привязка кнопок редактирования
      bindEditButtons();
    } catch (err) {
      console.error("Ошибка получения постов:", err);
      guidesList.innerHTML = `<p class="error">⚠ ${err.message}</p>`;
      sourcesList.innerHTML = "";
    }
  }

  function renderCard(p) {
    const tags = (p.tags || "")
      .split(",")
      .map(t => `<span class="tag">#${t.trim()}</span>`)
      .join(" ");
    return `
      <div class="post-card">
        <h4>${p.title || "Без названия"}</h4>
        <div class="tags">${tags}</div>
        <p class="date">${new Date(p.created_at).toLocaleString("ru-RU")}</p>
        <div class="actions">
          <button class="edit-post" data-id="${p.id}">✏️ Редактировать</button>
          <button class="delete-post" data-id="${p.id}">🗑 Удалить</button>
        </div>
      </div>`;
  }

  // === Удаление поста ===
  function bindEditButtons() {
    document.querySelectorAll(".delete-post").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Удалить пост?")) return;
        const id = btn.dataset.id;
        const fd = new FormData();
        fd.append("action", "delete");
        fd.append("id", id);
        const res = await fetch("/api/posts.php", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) refreshPosts();
        else alert("Ошибка удаления");
      };
    });
  }

  // === Добавление нового ===
  document.getElementById("btnAddGuide")?.addEventListener("click", () => {
    ensureEditors();
    openPopup(document.getElementById("popup-guide"));
  });
  document.getElementById("btnAddSource")?.addEventListener("click", () => {
    ensureEditors();
    openPopup(document.getElementById("popup-source"));
  });

  refreshPosts();
});
