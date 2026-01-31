document.addEventListener("DOMContentLoaded", () => {
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

  function matchesQuery(p, query) {
    if (!query) return true;
    const title = (p.title || "").toLowerCase();
    const tags = (p.tags || "").toLowerCase();
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
      const res = await fetch("/dbauth/pages/api/get_posts.php");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "?????? API");

      guidesData = Array.isArray(data.guides) ? data.guides : [];
      sourcesData = Array.isArray(data.sources) ? data.sources : [];
      renderLists();
    } catch (err) {
      console.error("?????? ???????? ??????:", err);
      guidesList.innerHTML = `<p class="error">? ${err.message}</p>`;
      sourcesList.innerHTML = "";
    }
  }

  function renderCard(p) {
    const tags = (p.tags || "")
      .split(",")
      .map(t => `<span class="tag">#${t.trim()}</span>`)
      .join(" " );
    return `
      <div class="post-card">
        <h4>${p.title || "??? ????????"}</h4>
        <div class="tags">${tags}</div>
        <p class="date">${new Date(p.created_at).toLocaleString("ru-RU")}</p>
        <div class="actions">
          <button class="edit-post" data-id="${p.id}">?????????????</button>
          <button class="delete-post" data-id="${p.id}">???????</button>
        </div>
      </div>`;
  }

  function bindEditButtons() {
    document.querySelectorAll(".delete-post").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("??????? ?????")) return;
        const id = btn.dataset.id;
        const res = await fetch(`/dbauth/pages/api/posts.php?action=delete&id=${id}`);
        const data = await res.json();
        if (data.ok) refreshPosts();
        else alert("?????? ????????");
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
});
