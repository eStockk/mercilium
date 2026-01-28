async function loadPost() {
  try {
    const res = await fetch(`/api/public/posts/${POST_ID}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "РћС€РёР±РєР° API");

    const p = data.post || {};
    document.getElementById("postTitle").textContent = p.title || "Р‘РµР· РЅР°Р·РІР°РЅРёСЏ";
    document.getElementById("postDate").textContent = p.created_at
      ? new Date(p.created_at).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

    // РўСЌРіРё
    const tagsWrap = document.getElementById("postTags");
    tagsWrap.innerHTML = "";
    const tagList = Array.isArray(p.tags)
      ? p.tags
      : String(p.tags || "")
          .split(",")
          .map(t => t.trim())
          .filter(Boolean);
    tagList.forEach(t => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = `#${t}`;
      tagsWrap.appendChild(span);
    });

    // РљРѕРЅС‚РµРЅС‚ РёР· API (СѓР¶Рµ HTML)
    const contentEl = document.getElementById("postContent");
    contentEl.innerHTML = p.content_html || "<p><em>РљРѕРЅС‚РµРЅС‚ РїСѓСЃС‚</em></p>";

    // РСЃС‚РѕС‡РЅРёРєРё
    const srcWrap = document.getElementById("postSources");
    const ul = document.getElementById("postSourcesList");
    ul.innerHTML = "";
    const srcs = data.linked_sources || [];
    if (Array.isArray(srcs) && srcs.length) {
      srcWrap.style.display = "";
      srcs.forEach(s => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `/cataclysm/${s.id}`;
        a.textContent = s.title || `РСЃС‚РѕС‡РЅРёРє #${s.id}`;
        li.appendChild(a);
        ul.appendChild(li);
      });
    } else {
      srcWrap.style.display = "none";
    }
  } catch (e) {
    console.error(e);
    document.getElementById("postTitle").textContent = "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё";
    document.getElementById("postContent").innerHTML = `<p>${e.message}</p>`;
  }
}
document.addEventListener("DOMContentLoaded", loadPost);
