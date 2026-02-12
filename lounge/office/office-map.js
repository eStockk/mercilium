/* office-map.js
 * Data-driven Office Graph Map using Cytoscape.js
 *
 * Экспортирует API:
 *  - initOfficeMap(container, options)
 *  - setOfficeData(model)
 *  - updateOfficeData(patch)
 *  - on(event, handler)
 *  - exportState()
 */

let cy = null;
const handlers = new Map();
let currentModel = null;

export function initOfficeMap(container, options = {}) {
  if (!container) throw new Error("initOfficeMap: container is required");

  cy = cytoscape({
    container,
    elements: [],
    layout: { name: "preset" },        // позиции берём из данных
    wheelSensitivity: 0.18,
    minZoom: 0.2,
    maxZoom: 3,
    style: buildBaseStyle(options),
  });

  wireBaseEvents();
  return cy;
}

export function setOfficeData(model) {
  assertCy();
  currentModel = normalizeModel(model);

  const elements = modelToElements(currentModel);

  cy.batch(() => {
    cy.elements().remove();
    cy.add(elements);
  });

  applyLayoutFromData();
  fitIfRequested(currentModel?.view?.fit !== false);
}

export function updateOfficeData(patch) {
  assertCy();
  if (!currentModel) currentModel = normalizeModel({});

  currentModel = {
    ...currentModel,
    ...patch,
    rooms: patch.rooms ?? currentModel.rooms,
    nodes: patch.nodes ?? currentModel.nodes,
    links: patch.links ?? currentModel.links,
  };

  setOfficeData(currentModel);
}

export function on(event, handler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(handler);
  return () => handlers.get(event)?.delete(handler);
}

export function exportState() {
  assertCy();
  return {
    model: currentModel,
    viewport: {
      zoom: cy.zoom(),
      pan: cy.pan(),
    }
  };
}

/* ---------------- internals ---------------- */

function assertCy() {
  if (!cy) throw new Error("Office map is not initialized. Call initOfficeMap() first.");
}

function emit(event, payload) {
  const set = handlers.get(event);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); } catch (e) { console.error(e); }
  }
}

function normalizeModel(model) {
  return {
    rooms: Array.isArray(model.rooms) ? model.rooms : [],
    nodes: Array.isArray(model.nodes) ? model.nodes : [],
    links: Array.isArray(model.links) ? model.links : [],
    view: model.view || {},
  };
}

/**
 * modelToElements(model)
 * Поддерживает два формата:
 * 1) "плоский" формат:
 *    rooms: [{id,name,x,y,w,h,type}]
 *    nodes: [{id,label,kind,x,y,icon,w,h,status,roomId}]
 *    links: [{source,target,id,kind,bandwidth,status,label}]
 *
 * 2) готовые элементы Cytoscape:
 *    nodes/links/rooms уже в виде { data:{...}, position:{...}, classes:"..." }
 */
function modelToElements(model) {
  const els = [];

  // rooms
  for (const r of model.rooms || []) {
    if (r && r.data && (r.position || r.renderedPosition)) {
      els.push(r);
      continue;
    }
    els.push({
      data: {
        id: r.id,
        label: r.name,
        kind: "room",
        width: r.w,
        height: r.h
      },
      position: { x: r.x || 0, y: r.y || 0 },
      classes: `room room-${r.type || "generic"}`
    });
  }

  // nodes
  for (const n of model.nodes || []) {
    if (n && n.data && (n.position || n.renderedPosition)) {
      els.push(n);
      continue;
    }
    els.push({
      data: {
        id: n.id,
        label: n.label || n.id,
        infoText: n.infoText,
        kind: n.kind || "device",
        vlan: n.vlan ?? null,
        ip: n.ip ?? null,
        status: n.status || "ok",
        parent: n.roomId || undefined,
        icon: n.icon,
        w: n.w,
        h: n.h
      },
      position: { x: n.x || 0, y: n.y || 0 },
      classes: n.classes || `device status-${n.status || "ok"}`
    });
  }

  // links / edges
  for (const e of model.links || []) {
    if (e && e.data && (e.position || e.renderedPosition || e.group === "edges")) {
      els.push(e);
      continue;
    }
    els.push({
      data: {
        id: e.id || `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        kind: e.kind || "link",
        bandwidth: e.bandwidth ?? null,
        status: e.status || "ok",
        label: e.label || ""
      },
      classes: e.classes || `edge edge-${e.kind || "link"} status-${e.status || "ok"}`
    });
  }

  return els;
}

function applyLayoutFromData() {
  cy.layout({ name: "preset", fit: false }).run();
}

function fitIfRequested(doFit) {
  if (doFit) cy.fit(cy.elements(), 40);
}

/* ============================================================
   STYLE
   ============================================================ */

function buildBaseStyle() {
  return [

    /* ============================================================
       ОСНОВНОЙ БЛОК УСТРОЙСТВА (node.device)
       ============================================================ */
    {
      selector: "node.device",
      style: {
        "shape": "round-rectangle",
        "background-color": "rgba(18,22,32,0.9)",
        "border-color": "rgba(140,150,170,0.35)",
        "border-width": 2,
        "width": "data(w)",
        "height": "data(h)",

        /* Иконка устройства слева */
        "background-image": "data(icon)",
        "background-fit": "contain",
        "background-repeat": "no-repeat",
        "background-position-x": "8px",
        "background-position-y": "50%",
        "background-width": "42px",
        "background-height": "42px",

        /* Текстовая часть справа */
        "label": "data(infoText)",
        "color": "#E7ECF7",
        "font-size": 12,
        "font-weight": 700,
        "text-valign": "center",
        "text-halign": "left",
        "text-margin-x": 58,
        "text-wrap": "wrap",
        "text-max-width": 220,

        "text-outline-width": 2,
        "text-outline-color": "rgba(10,12,18,0.85)",

        /* Мягкая пульсация */
        "transition-property": "background-color, border-color",
        "transition-duration": "1.4s",
        "transition-timing-function": "ease-in-out"
      }
    },

    /* ============================================================
       ПОРТЫ (STATIC / DYNAMIC) — node.port  
       ============================================================ */
    {
      selector: "node.port",
      style: {
        "shape": "round-rectangle",
        "width": 74,
        "height": 22,
        "label": "data(label)",
        "font-size": 9,
        "color": "#D7DEEA",
        "text-valign": "center",
        "text-halign": "center",
        "text-outline-width": 2,
        "text-outline-color": "rgba(10,12,18,0.9)",

        /* Базовый порт */
        "background-color": "rgba(130,160,255,0.12)",
        "border-color": "rgba(130,160,255,0.55)",
        "border-width": 1
      }
    },

    /* STATIC-порты */
    {
      selector: "node.port-static",
      style: {
        "background-color": "rgba(120,220,255,0.20)",
        "border-color": "rgba(120,220,255,0.65)",
        "border-width": 1.5
      }
    },

    /* DYNAMIC (DHCP) порты */
    {
      selector: "node.port-dynamic",
      style: {
        "background-color": "rgba(130,255,150,0.22)",
        "border-color": "rgba(130,255,160,0.65)",
        "border-width": 1.5
      }
    },

    /* ============================================================
       VLAN-порты (левитация)
       ============================================================ */
    {
      selector: "node.port-vlan",
      style: {
        "shape": "round-rectangle",
        "background-color": "rgba(200,120,255,0.18)",
        "border-color": "rgba(200,120,255,0.8)",
        "width": 150,
        "height": "label",
        "padding": 6,
        "text-wrap": "wrap",
        "text-max-width": 140,
        "font-size": 9,
        "color": "#E5D9FF",
        "text-outline-width": 2,
        "text-outline-color": "rgba(10,12,18,0.9)",

        /* Анимация левитации */
        "transition-property": "background-color, border-color",
        "transition-duration": "1.8s",
        "transition-timing-function": "ease-in-out"
      }
    },

    /* ============================================================
       FLOATING-НОДЫ (информационные блоки интерфейсов)
       ============================================================ */
    {
      selector: "node.floating",
      style: {
        "shape": "round-rectangle",
        "background-color": "rgba(34,211,238,0.10)",
        "border-color": "rgba(34,211,238,0.7)",
        "border-width": 1,
        "width": 160,
        "height": "label",
        "padding": 6,
        "label": "data(label)",
        "font-size": 9,
        "color": "#DCE6F2",
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "text-max-width": 150,
        "text-outline-width": 2,
        "text-outline-color": "rgba(10,12,18,0.9)",

        /* Мягкое движение */
        "transition-property": "background-color, border-color",
        "transition-duration": "1.8s",
        "transition-timing-function": "ease-in-out"
      }
    },

    /* ============================================================
       Линии соединений
       ============================================================ */
    {
      selector: "edge",
      style: {
        "curve-style": "straight",
        "line-color": "rgba(173,183,199,0.9)",
        "width": 2,
        "target-arrow-shape": "none",

        /* подпись */
        "label": "data(label)",
        "font-size": 9,
        "color": "#C8D0E0",
        "text-background-color": "rgba(8,10,14,0.7)",
        "text-background-opacity": 1,
        "text-background-shape": "round-rectangle",
        "text-background-padding": 2
      }
    },

    /* ============================================================
       Статусы устройств и линков
       ============================================================ */
    { selector: "node.status-warn", style: { "border-color": "#FFB454" } },
    { selector: "node.status-down", style: { "opacity": 0.45, "border-color": "#FF6B6B" } },

    { selector: "edge.status-warn", style: { "line-color": "#FFB454" } },
    { selector: "edge.status-down", style: { "line-color": "#FF6B6B", "line-style": "dashed" } },

    /* ============================================================
       Выделение элементов
       ============================================================ */
    {
      selector: ":selected",
      style: {
        "overlay-color": "#8B5CF6",
        "overlay-opacity": 0.12,
        "border-width": 3,
        "border-color": "#A78BFA"
      }
    }
  ];
}

/* ============================================================
   EVENTS
   ============================================================ */

function wireBaseEvents() {
  // click node
  cy.on("tap", "node", (evt) => {
    const n = evt.target;
    emit("select", {
      type: n.hasClass("device") ? "node" : (n.hasClass("port") || n.hasClass("floating") ? "port" : "node"),
      data: n.data(),
      position: n.position()
    });
  });

  // click edge
  cy.on("tap", "edge", (evt) => {
    const e = evt.target;
    emit("select", { type: "edge", data: e.data() });
  });

  // drag device nodes only
  cy.on("dragfree", "node.device", (evt) => {
    const n = evt.target;
    emit("move", { id: n.id(), position: n.position() });
  });
}
/* -------------------------------------------------------------
   DEVICE BREATHING (on-canvas pulse)
------------------------------------------------------------- */
let pulseT = 0;
function tickPulse(){
  if (!cy) return;
  pulseT += 0.04;

  const glow = 0.35 + Math.sin(pulseT) * 0.25;
  const border = 0.30 + Math.sin(pulseT + 1.5) * 0.22;

  const nodes = cy.nodes(".device");
  nodes.forEach(n => {
    n.style({
      "border-color": `rgba(140,150,255,${border})`,
      "background-color": `rgba(18,22,32,${0.85 + glow*0.15})`
    });
  });

  requestAnimationFrame(tickPulse);
}
requestAnimationFrame(tickPulse);

/* -------------------------------------------------------------
   ORBITAL FLOATING FOR VLAN PORTS
------------------------------------------------------------- */
const floatState = new Map(); // nodeId → {angle, radius}

function tickFloating(){
  if (!cy) return;

  const dt = 0.008;

  cy.nodes(".port-vlan").forEach(node => {
    const id = node.id();
    const devId = node.connectedEdges().filter(e => e.target().id() !== id)[0]?.target().id();
    const dev = devId ? cy.getElementById(devId) : null;
    if (!dev || !dev.isNode()) return;

    let st = floatState.get(id);
    if (!st){
      st = {
        angle: Math.random() * Math.PI * 2,
        radius: 60 + Math.random()*40
      };
      floatState.set(id, st);
    }

    st.angle += dt * (0.3 + Math.random()*0.2);

    // device center
    const dx = dev.position("x");
    const dy = dev.position("y");

    // orbital position
    const x = dx + Math.cos(st.angle) * st.radius * 1.3;
    const y = dy + Math.sin(st.angle) * st.radius * 0.8;

    node.position({ x, y });
  });

  requestAnimationFrame(tickFloating);
}
requestAnimationFrame(tickFloating);
