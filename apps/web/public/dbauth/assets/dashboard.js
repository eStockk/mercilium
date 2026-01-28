const initDashboard = () => {
  const loader = document.getElementById("loader");
  const guidesList = document.getElementById("guidesList");
  const sourcesList = document.getElementById("sourcesList");
  const globalSearch = document.getElementById("globalSearch");
  let guidesData = [];
  let sourcesData = [];

  if (loader) {
    setTimeout(() => {
      loader.style.opacity = "0";
      loader.style.transition = "opacity 0.8s ease";
      setTimeout(() => loader.remove(), 900);
    }, 1800);
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
    }
    return [];
  }

  function matchesQuery(p, query) {
    if (!query) return true;
    const title = (p.title || "").toLowerCase();
    const tags = normalizeTags(p.tags).join(" ").toLowerCase();
    return title.includes(query) || tags.includes(query);
  }

  function renderLists() {
    const query = (globalSearch?.value || "").trim().toLowerCase();
    const guideFiltered = guidesData.filter(p => matchesQuery(p, query));
    const sourceFiltered = sourcesData.filter(p => matchesQuery(p, query));

    guidesList.innerHTML = guideFiltered.map(renderCard).join("");
    sourcesList.innerHTML = sourceFiltered.map(renderCard).join("");
    bindEditButtons();
  }

  async function refreshPosts() {
    if (!guidesList || !sourcesList) return;
    try {
      const res = await fetch("/api/admin/summary");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Ошибка API");

      guidesData = Array.isArray(data.guides) ? data.guides : [];
      sourcesData = Array.isArray(data.sources) ? data.sources : [];
      renderLists();
    } catch (err) {
      console.error("Ошибка загрузки постов:", err);
      guidesList.innerHTML = `<p class="error">⚠ ${err.message}</p>`;
      sourcesList.innerHTML = "";
    }
  }

  function renderCard(p) {
    const tags = normalizeTags(p.tags)
      .map(t => `<span class="tag">#${t}</span>`)
      .join(" ");
    return `
      <div class="post-card">
        <h4>${p.title || "Без названия"}</h4>
        <div class="tags">${tags}</div>
        <p class="date">${new Date(p.created_at).toLocaleString("ru-RU")}</p>
        <div class="actions">
          <button class="btn btn-mini edit-post" data-id="${p.id}">Редактировать</button>
          <button class="btn btn-mini btn-danger delete-post" data-id="${p.id}">Удалить</button>
        </div>
      </div>`;
  }

  function bindEditButtons() {
    document.querySelectorAll(".delete-post").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Удалить пост?")) return;
        const id = btn.dataset.id;
        const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.ok) refreshPosts();
        else alert("Не удалось удалить");
      };
    });
  }

  document.getElementById("btnAddGuide")?.addEventListener("click", () => {
    ensureEditors();
    openPopup(document.getElementById("popup-guide"));
  });
  document.getElementById("btnAddSource")?.addEventListener("click", () => {
    ensureEditors();
    openPopup(document.getElementById("popup-source"));
  });

  globalSearch?.addEventListener("input", () => renderLists());

  refreshPosts();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}
