async function loadPost() {
  try {
    const res = await fetch(`../../backside/api/get_post.php?id=${POST_ID}`, { cache: 'no-store' });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!data.ok) throw new Error(data.error || "Ошибка API");

    const p = data.post;
    document.getElementById("postTitle").textContent = p.title || "Без названия";
    document.getElementById("postDate").textContent = p.created_at
      ? new Date(p.created_at).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

    // Тэги
    const tagsWrap = document.getElementById("postTags");
    tagsWrap.innerHTML = "";
    (p.tags || "")
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)
      .forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = `#${t}`;
        tagsWrap.appendChild(span);
      });

    // Контент из API (уже HTML)
    const contentEl = document.getElementById("postContent");
    contentEl.innerHTML = p.content_html || "<p><em>Контент пуст</em></p>";

    // Источники
    const srcWrap = document.getElementById("postSources");
    const ul = document.getElementById("postSourcesList");
    ul.innerHTML = "";
    const srcs = data.linked_sources || [];
    if (Array.isArray(srcs) && srcs.length) {
      srcWrap.style.display = "";
      srcs.forEach(s => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `post.php?id=${s.id}`;
        a.textContent = s.title || `Источник #${s.id}`;
        li.appendChild(a);
        ul.appendChild(li);
      });
    } else {
      srcWrap.style.display = "none";
    }
  } catch (e) {
    console.error(e);
    document.getElementById("postTitle").textContent = "Ошибка загрузки";
    document.getElementById("postContent").innerHTML = `<p>${e.message}</p>`;
  }
}
document.addEventListener("DOMContentLoaded", loadPost);
