let quillGuide = null;
let quillSource = null;
let quillEdit = null;

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function openPopup(el) {
  if (!el) return;
  el.classList.add("active");
  el.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closePopup(el) {
  if (!el) return;
  el.classList.remove("active");
  el.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// --- image handler for Quill ---
function imageHandler() {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/*");
  input.click();
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const id =
      $("#update-post")?.dataset.id ||
      Date.now(); // если редактирование — берём id поста, иначе временный
    const fd = new FormData();
    fd.append("image", file);
    fd.append("post_id", id);

    try {
      const resp = await fetch("/dbauth/pages/api/upload.php", {
        method: "POST",
        body: fd
      });
      const json = await resp.json();
      if (json.ok) {
        const range = this.quill.getSelection();
        this.quill.insertEmbed(range.index, "image", json.url);
      } else {
        alert("Ошибка загрузки изображения: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при загрузке изображения");
    }
  };
}

// init editors
function ensureEditors() {
  if (!quillGuide && $("#guide-editor")) {
    quillGuide = new Quill("#guide-editor", {
      theme: "snow",
      placeholder: "Начинайте писать здесь...",
      modules: {
        toolbar: {
          container: [
            ["bold", "italic", "underline", "strike"],
            [{ header: [1, 2, 3, false] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            [{ color: [] }, { background: [] }]
          ],
          handlers: { image: imageHandler }
        }
      }
    });
  }
  if (!quillSource && $("#source-editor")) {
    quillSource = new Quill("#source-editor", {
      theme: "snow",
      placeholder: "Описание источника...",
      modules: {
        toolbar: {
          container: [
            ["bold", "italic", "underline", "strike"],
            [{ header: [1, 2, 3, false] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            [{ color: [] }, { background: [] }]
          ],
          handlers: { image: imageHandler }
        }
      }
    });
  }
  if (!quillEdit && $("#edit-editor")) {
    quillEdit = new Quill("#edit-editor", {
      theme: "snow",
      placeholder: "Редактируйте пост...",
      modules: {
        toolbar: {
          container: [
            ["bold", "italic", "underline", "strike"],
            [{ header: [1, 2, 3, false] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            [{ color: [] }, { background: [] }]
          ],
          handlers: { image: imageHandler }
        }
      }
    });
  }
}

// ajax save
async function savePost({ action, id, type, title, content, tags, mode, source_id }) {
  const fd = new FormData();
  fd.append("action", action);
  if (id) fd.append("id", id);
  fd.append("type", type);
  fd.append("title", title);
  fd.append("content", content);
  fd.append("mode", mode);
  fd.append("tags", JSON.stringify(tags));
  if (type === "guide") {
    fd.append("source_id", source_id || "");
  }

  try {
    const resp = await fetch("/dbauth/pages/api/posts.php", { method: "POST", body: fd });
    const json = await resp.json();
    if (json.ok) {
      alert("Сохранено");
      location.reload();
    } else {
      alert("Ошибка: " + (json.error || "unknown"));
      console.error(json);
    }
  } catch (err) {
    console.error(err);
    alert("Ошибка сети при сохранении");
  }
}

// --- TAGS ---
async function loadTagsList(dropdown, listSelector) {
  try {
    const res = await fetch("/dbauth/pages/api/tags.php?action=list");
    const data = await res.json();
    if (!data.ok) return;
    dropdown.innerHTML = "";
    data.tags.forEach(t => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-option";
      btn.textContent = `${t.name} (${t.cnt})`;
      btn.addEventListener("click", () => {
        addTagToList(t.name, listSelector);
        dropdown.style.display = "none";
      });
      dropdown.appendChild(btn);
    });
  } catch (e) {
    console.error(e);
  }
}

function addTagToList(name, listSelector) {
  const listEl = document.querySelector(listSelector);
  if (!listEl) return;
  const exists = Array.from(listEl.querySelectorAll(".tag")).some(
    el => el.dataset.tag === name
  );
  if (exists) return;
  const span = document.createElement("span");
  span.className = "tag";
  span.dataset.tag = name;
  span.textContent = name + " ×";
  span.addEventListener("click", () => span.remove());
  listEl.appendChild(span);
}

// --- Main ---
document.addEventListener("DOMContentLoaded", () => {
  // openers
  $("#btnAddGuide")?.addEventListener("click", () => {
    ensureEditors();
    openPopup($("#popup-guide"));
  });
  $("#btnAddSource")?.addEventListener("click", () => {
    ensureEditors();
    openPopup($("#popup-source"));
  });

  // closers
  $$(".close-btn").forEach(btn =>
    btn.addEventListener("click", () => closePopup(btn.closest(".popup")))
  );
  $$(".popup").forEach(p =>
    p.addEventListener("click", e => {
      if (e.target === p) closePopup(p);
    })
  );

  // --- TAG BUTTONS ---
  document.querySelectorAll(".btn-select-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      const field = btn.closest(".field");
      const dropdown = field.querySelector(".tags-dropdown");
      const listSel = "#" + field.querySelector(".tags-list").id;
      if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
      } else {
        dropdown.style.display = "block";
        loadTagsList(dropdown, listSel);
      }
    });
  });

  document.querySelectorAll(".btn-create-tag").forEach(btn => {
    btn.addEventListener("click", async () => {
      const field = btn.closest(".field");
      const input = field.querySelector(".input-create-tag");
      const val = input.value.trim();
      if (!val) return alert("Введите название тэга");
      try {
        const fd = new FormData();
        fd.append("action", "create");
        fd.append("name", val);
        const res = await fetch("/dbauth/pages/api/tags.php", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          addTagToList(val, "#" + field.querySelector(".tags-list").id);
          input.value = "";
        } else {
          alert("Ошибка: " + (data.error || ""));
        }
      } catch (e) {
        console.error(e);
      }
    });
  });

  // --- SAVE buttons ---
  $("#publish-guide")?.addEventListener("click", () => {
    const title = $("#guide-title").value.trim();
    const content = quillGuide ? quillGuide.root.innerHTML : "";
    const tags = Array.from($("#guide-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id = $("#guide-source-select")?.value || "";
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "create",
      type: "guide",
      title,
      content,
      tags,
      mode: "published",
      source_id
    });
  });

  $("#save-draft-guide")?.addEventListener("click", () => {
    const title = $("#guide-title").value.trim();
    const content = quillGuide ? quillGuide.root.innerHTML : "";
    const tags = Array.from($("#guide-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id = $("#guide-source-select")?.value || "";
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "create",
      type: "guide",
      title,
      content,
      tags,
      mode: "draft",
      source_id
    });
  });

  $("#publish-source")?.addEventListener("click", () => {
    const title = $("#source-title").value.trim();
    const content = quillSource ? quillSource.root.innerHTML : "";
    const tags = Array.from(
      $("#source-tags-list").querySelectorAll(".tag")
    ).map(t => t.dataset.tag);
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "create",
      type: "source",
      title,
      content,
      tags,
      mode: "published"
    });
  });

  $("#save-draft-source")?.addEventListener("click", () => {
    const title = $("#source-title").value.trim();
    const content = quillSource ? quillSource.root.innerHTML : "";
    const tags = Array.from(
      $("#source-tags-list").querySelectorAll(".tag")
    ).map(t => t.dataset.tag);
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "create",
      type: "source",
      title,
      content,
      tags,
      mode: "draft"
    });
  });

  // --- EDIT mode ---
  $$(".edit-post").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/api/posts.php?action=get&id=${id}`);
        const data = await res.json();
        if (!data.ok) return alert("Не удалось загрузить пост");
        ensureEditors();

        $("#edit-title").value = data.post.title;
        quillEdit.root.innerHTML = data.post.content;

        const tagsList = $("#edit-tags-list");
        tagsList.innerHTML = "";
        (data.post.tags || []).forEach(t => addTagToList(t, "#edit-tags-list"));

        if (data.post.type === "guide") {
          $("#edit-source-block").style.display = "block";
          $("#edit-source-select").value = data.post.source_id || "";
        } else {
          $("#edit-source-block").style.display = "none";
        }

        $("#update-post").dataset.id = id;
        $("#update-post").dataset.type = data.post.type;

        openPopup($("#popup-edit"));
      } catch (e) {
        console.error(e);
        alert("Ошибка при загрузке поста");
      }
    });
  });

  $("#update-post")?.addEventListener("click", () => {
    const id = $("#update-post").dataset.id;
    const type = $("#update-post").dataset.type;
    const title = $("#edit-title").value.trim();
    const content = quillEdit ? quillEdit.root.innerHTML : "";
    const tags = Array.from($("#edit-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id =
      type === "guide" ? $("#edit-source-select")?.value || "" : "";
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "update",
      id,
      type,
      title,
      content,
      tags,
      mode: "published",
      source_id
    });
  });

  $("#save-draft-edit")?.addEventListener("click", () => {
    const id = $("#update-post").dataset.id;
    const type = $("#update-post").dataset.type;
    const title = $("#edit-title").value.trim();
    const content = quillEdit ? quillEdit.root.innerHTML : "";
    const tags = Array.from($("#edit-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id =
      type === "guide" ? $("#edit-source-select")?.value || "" : "";
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "update",
      id,
      type,
      title,
      content,
      tags,
      mode: "draft",
      source_id
    });
  });
});