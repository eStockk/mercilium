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

const categoryState = {
  guide: { categories: [], activeId: null, counter: 0 },
  edit: { categories: [], activeId: null, counter: 0 }
};

function getCategoryElements(prefix) {
  return {
    layout: document.getElementById(`${prefix}-category-layout`),
    tabs: document.getElementById(`${prefix}-category-tabs`),
    addTab: document.getElementById(`${prefix}-category-add-tab`),
    current: document.getElementById(`${prefix}-category-current`),
    input: document.getElementById(`${prefix}-category-input`),
    addBtn: document.getElementById(`${prefix}-category-add`),
    removeBtn: document.getElementById(`${prefix}-category-remove`),
    selectBtn: document.getElementById(`${prefix}-category-select`),
    dropdown: document.getElementById(`${prefix}-category-dropdown`)
  };
}

function getEditor(prefix) {
  return prefix === "guide" ? quillGuide : quillEdit;
}

function getEditorContent(prefix) {
  const editor = getEditor(prefix);
  return editor ? editor.root.innerHTML : "";
}

function setEditorContent(prefix, html) {
  const editor = getEditor(prefix);
  if (editor) editor.root.innerHTML = html || "";
}

function setEditorEnabled(prefix, enabled) {
  const editorEl = document.getElementById(`${prefix}-editor`);
  if (!editorEl) return;
  editorEl.classList.toggle("editor-disabled", !enabled);
}

function syncCategoryContent(prefix) {
  const state = categoryState[prefix];
  if (!state.activeId) return;
  const active = state.categories.find(c => c.id === state.activeId);
  if (active) active.content = getEditorContent(prefix);
}

function renderCategoryTabs(prefix) {
  const state = categoryState[prefix];
  const els = getCategoryElements(prefix);
  if (!els.tabs) return;
  const addTab = els.addTab;
  els.tabs.innerHTML = "";
  state.categories.forEach((cat, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-tab" + (cat.id === state.activeId ? " active" : "");
    btn.dataset.id = cat.id;
    btn.textContent = String(index + 1);
    els.tabs.appendChild(btn);
  });
  if (addTab) els.tabs.appendChild(addTab);
}

function setActiveCategory(prefix, id) {
  const state = categoryState[prefix];
  syncCategoryContent(prefix);
  state.activeId = id || null;
  const active = state.categories.find(c => c.id === id);
  renderCategoryTabs(prefix);
  const els = getCategoryElements(prefix);
  if (els.current && active) els.current.textContent = active.name;
  if (els.current && !active) els.current.textContent = "Категория не выбрана";
  if (els.layout) els.layout.classList.toggle("is-empty", !active);
  setEditorEnabled(prefix, !!active);
  setEditorContent(prefix, active ? active.content : "");
}

function addCategory(prefix, name, content = "") {
  const state = categoryState[prefix];
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  const existing = state.categories.find(cat => cat.name === trimmed);
  if (existing) {
    setActiveCategory(prefix, existing.id);
    return;
  }
  state.counter += 1;
  const id = `${prefix}-cat-${state.counter}`;
  const catName = trimmed;
  state.categories.push({ id, name: catName, content });
  setActiveCategory(prefix, id);
}

function removeActiveCategory(prefix) {
  const state = categoryState[prefix];
  if (!state.activeId) return;
  const idx = state.categories.findIndex(cat => cat.id === state.activeId);
  if (idx === -1) return;
  state.categories.splice(idx, 1);
  if (state.categories.length) {
    const next = state.categories[Math.min(idx, state.categories.length - 1)];
    setActiveCategory(prefix, next.id);
  } else {
    setActiveCategory(prefix, null);
    renderCategoryTabs(prefix);
  }
}

function initCategories(prefix, initialCategories, options = {}) {
  const allowEmpty = options.allowEmpty === true;
  const state = categoryState[prefix];
  state.categories = [];
  state.activeId = null;
  state.counter = 0;
  if (Array.isArray(initialCategories) && initialCategories.length) {
    initialCategories.forEach(cat => {
      state.counter += 1;
      const id = `${prefix}-cat-${state.counter}`;
      const name = cat.name || `Категория ${state.counter}`;
      state.categories.push({ id, name, content: cat.content || "" });
    });
    setActiveCategory(prefix, state.categories[0].id);
  } else {
    if (allowEmpty) {
      renderCategoryTabs(prefix);
      setActiveCategory(prefix, null);
    } else {
      addCategory(prefix, "Категория 1", "");
    }
  }
}

function getCategoriesPayload(prefix) {
  const state = categoryState[prefix];
  if (!state.categories.length) return null;
  syncCategoryContent(prefix);
  return state.categories.map(cat => ({
    name: cat.name,
    content: cat.content || ""
  }));
}

function bindCategoryControls(prefix) {
  const els = getCategoryElements(prefix);
  if (!els.tabs) return;

  els.tabs.addEventListener("click", e => {
    const btn = e.target.closest(".category-tab");
    if (!btn) return;
    if (btn.classList.contains("category-add")) {
      const name = els.input?.value.trim() || "";
      if (name) {
        createCategory(prefix, name);
        if (els.input) els.input.value = "";
      } else if (els.dropdown) {
        loadCategoriesList(els.dropdown, prefix);
        els.dropdown.style.display = "block";
      }
      return;
    }
    if (btn.dataset.id) setActiveCategory(prefix, btn.dataset.id);
  });

  els.addBtn?.addEventListener("click", () => {
    const name = els.input?.value.trim() || "";
    createCategory(prefix, name);
    if (els.input) els.input.value = "";
  });

  els.removeBtn?.addEventListener("click", () => {
    removeActiveCategory(prefix);
  });

  els.selectBtn?.addEventListener("click", () => {
    if (!els.dropdown) return;
    if (els.dropdown.style.display === "block") {
      els.dropdown.style.display = "none";
      return;
    }
    loadCategoriesList(els.dropdown, prefix);
    els.dropdown.style.display = "block";
  });
}

// ajax save
async function savePost({ action, id, type, title, content, tags, mode, source_id, categories }) {
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
    if (categories) fd.append("categories", JSON.stringify(categories));
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

// --- CATEGORIES ---
async function loadCategoriesList(dropdown, prefix) {
  try {
    const res = await fetch("/dbauth/pages/api/categories.php?action=list");
    const data = await res.json();
    if (!data.ok) return;
    dropdown.innerHTML = "";
    data.categories.forEach(c => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-option";
      btn.textContent = `${c.name} (${c.cnt})`;
      btn.addEventListener("click", () => {
        addCategory(prefix, c.name);
        dropdown.style.display = "none";
      });
      dropdown.appendChild(btn);
    });
  } catch (e) {
    console.error(e);
  }
}

async function createCategory(prefix, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  try {
    const fd = new FormData();
    fd.append("action", "create");
    fd.append("name", trimmed);
    const res = await fetch("/dbauth/pages/api/categories.php", { method: "POST", body: fd });
    const data = await res.json();
    if (data.ok) {
      addCategory(prefix, trimmed);
    } else if ((data.error || "").toLowerCase().includes("already")) {
      addCategory(prefix, trimmed);
    } else {
      alert("Ошибка: " + (data.error || ""));
    }
  } catch (e) {
    console.error(e);
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
  bindCategoryControls("guide");
  bindCategoryControls("edit");

  // openers
  $("#btnAddGuide")?.addEventListener("click", () => {
    ensureEditors();
    if (!categoryState.guide.categories.length) initCategories("guide", [], { allowEmpty: true });
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
    const content = getEditorContent("guide");
    const tags = Array.from($("#guide-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id = $("#guide-source-select")?.value || "";
    const categories = getCategoriesPayload("guide");
    if (!categories || !categories.length) return alert("Добавьте категорию");
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "create",
      type: "guide",
      title,
      content,
      tags,
      mode: "published",
      source_id,
      categories
    });
  });

  $("#save-draft-guide")?.addEventListener("click", () => {
    const title = $("#guide-title").value.trim();
    const content = getEditorContent("guide");
    const tags = Array.from($("#guide-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id = $("#guide-source-select")?.value || "";
    const categories = getCategoriesPayload("guide");
    if (!categories || !categories.length) return alert("Добавьте категорию");
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "create",
      type: "guide",
      title,
      content,
      tags,
      mode: "draft",
      source_id,
      categories
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
  document.addEventListener("click", async e => {
    const btn = e.target.closest(".edit-post");
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      const res = await fetch(`/dbauth/pages/api/posts.php?action=get&id=${id}`);
      const data = await res.json();
      if (!data.ok) return alert("Failed to load post");
      ensureEditors();

      $("#edit-title").value = data.post.title;

      const tagsList = $("#edit-tags-list");
      tagsList.innerHTML = "";
      (data.post.tags || []).forEach(t => addTagToList(t, "#edit-tags-list"));

      const editLayout = $("#edit-category-layout");
      if (data.post.type === "guide") {
        editLayout?.classList.remove("simple");
        $("#edit-source-block").style.display = "block";
        $("#edit-source-select").value = data.post.source_id || "";
        const categories =
          typeof data.post.categories === "string"
            ? JSON.parse(data.post.categories || "[]")
            : data.post.categories;
        if (Array.isArray(categories) && categories.length) {
          initCategories("edit", categories);
        } else {
          initCategories("edit", [{ name: "Категория 1", content: data.post.content }]);
        }
      } else {
        editLayout?.classList.add("simple");
        $("#edit-source-block").style.display = "none";
        setEditorContent("edit", data.post.content);
      }

      $("#update-post").dataset.id = id;
      $("#update-post").dataset.type = data.post.type;

      openPopup($("#popup-edit"));
    } catch (e) {
      console.error(e);
      alert("Error loading post");
    }
  });

  $("#update-post")?.addEventListener("click", () => {
    const id = $("#update-post").dataset.id;
    const type = $("#update-post").dataset.type;
    const title = $("#edit-title").value.trim();
    const content = getEditorContent("edit");
    const tags = Array.from($("#edit-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id =
      type === "guide" ? $("#edit-source-select")?.value || "" : "";
    const categories = type === "guide" ? getCategoriesPayload("edit") : null;
    if (type === "guide" && (!categories || !categories.length)) return alert("Добавьте категорию");
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "update",
      id,
      type,
      title,
      content,
      tags,
      mode: "published",
      source_id,
      categories
    });
  });

  $("#save-draft-edit")?.addEventListener("click", () => {
    const id = $("#update-post").dataset.id;
    const type = $("#update-post").dataset.type;
    const title = $("#edit-title").value.trim();
    const content = getEditorContent("edit");
    const tags = Array.from($("#edit-tags-list").querySelectorAll(".tag")).map(
      t => t.dataset.tag
    );
    const source_id =
      type === "guide" ? $("#edit-source-select")?.value || "" : "";
    const categories = type === "guide" ? getCategoriesPayload("edit") : null;
    if (type === "guide" && (!categories || !categories.length)) return alert("Добавьте категорию");
    if (!title) return alert("Введите заголовок");
    savePost({
      action: "update",
      id,
      type,
      title,
      content,
      tags,
      mode: "draft",
      source_id,
      categories
    });
  });
});
