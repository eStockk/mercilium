/* =========================================================
   Mercilium Lounge — Link/Tunnel v2
   File: /public_html/lounge/link/link.js
   PART 1/4 — D3 CORE ENGINE + base helpers
   ========================================================= */

/* ---------- Storage / base state ---------- */
const STORE_KEY = "lounge_offices_v1";
const state = (() => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { links: [], offices: [] }; }
  catch { return { links: [], offices: [] }; }
})();
const saveState = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));

/* ---------- DOM helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const byId = (arr, id) => arr.find(x => String(x?.id) === String(id));

/* ---------- Runtime globals ---------- */
let current = null;   // текущий туннель (объект из state.links)
let graph   = null;   // { nodes:[], edges:[], zoom:{k,x,y}|null }
let boardApi = null;  // createD3Board() API
let pendingLinkFrom = null; // node.id ожидающий соединения кликом
let sideChangeMode = null; // "a" | "b" | null


/* =========================================================
   PART 1 — D3 CORE ENGINE
   ========================================================= */

function createD3Board(svgSelector, g, saveCb) {
  const svg = d3.select(svgSelector);
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth;
  const H = svg.node().clientHeight;

  // Layers
  const root = svg.append("g").attr("class", "root");
  const linksLayer = root.append("g").attr("class", "links");
  const nodesLayer = root.append("g").attr("class", "nodes");

  // Zoom / pan
  const zoom = d3.zoom()
    .scaleExtent([0.25, 2.5])
    .on("zoom", (ev) => {
      root.attr("transform", ev.transform);
      g.zoom = { k: ev.transform.k, x: ev.transform.x, y: ev.transform.y };
      saveCb();
    });

  svg.call(zoom);

  if (g.zoom) {
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(g.zoom.x, g.zoom.y).scale(g.zoom.k)
    );
  }

  // Force simulation
  const sim = d3.forceSimulation(g.nodes)
    .force("charge", d3.forceManyBody().strength(-420))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide().radius(n => n.kind === "vm" ? 50 : 86))
    .force("link", d3.forceLink(g.edges)
      .id(d => d.id)
      .distance(e => e.role === "office-vm" ? 110 : 220)
      .strength(0.85)
    );

  // Selections (объявляем ДО ticked)
  let linkSel = linksLayer.selectAll("line");
  let nodeSel = nodesLayer.selectAll("g.node");

  // Tick handler (использует уже объявленные переменные)
  sim.on("tick", ticked);

  // Initial render
  refresh();

  function nodeEnter(enter) {
    const gr = enter.append("g")
      .attr("class", d => "node " + (d.kind || "external"))
      .call(d3.drag()
        .on("start", dragStart)
        .on("drag", dragged)
        .on("end", dragEnd)
      );

    // base rect
    gr.append("rect")
      .attr("width", d => d.kind === "vm" ? 140 : 180)
      .attr("height", d => d.kind === "vm" ? 44 : 56)
      .attr("x", d => d.kind === "vm" ? -70 : -90)
      .attr("y", d => d.kind === "vm" ? -22 : -28);

    gr.select("rect")
      .style("fill", d => d.kind === "vm" ? "rgba(120,255,180,0.18)" : null)
      .style("stroke", d => d.kind === "vm" ? "rgba(120,255,180,0.95)" : null)
      .style("stroke-width", d => d.kind === "vm" ? 2 : null);

    // watermark icon (SVG/PNG)
    gr.append("image")
      .attr("class", "wm-icon")
      .attr("href", d => (typeof watermarkHref === "function" ? watermarkHref(d) : ""))
      .attr("width", d => d.kind === "vm" ? 56 : 72)
      .attr("height", d => d.kind === "vm" ? 56 : 72)
      .attr("x", d => d.kind === "vm" ? -28 : -36)
      .attr("y", d => d.kind === "vm" ? -28 : -36);

    // title
    gr.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-2")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(0,0,0,0.85)")
      .style("stroke-width", 3.2)
      .style("fill", "#fff")
      .text(d => d.name);

    // click for link-creation
    gr.on("click", (ev, d) => {
      ev.stopPropagation();
      if (typeof onNodeClick === "function") onNodeClick(d);
    });

    // right click for context menu
    gr.on("contextmenu", (ev, d) => {
      if (typeof onNodeContext === "function") onNodeContext(ev, d);
    });

    return gr;
  }

  function ticked() {
    linkSel
      .attr("x1", d => pos(d.source).x)
      .attr("y1", d => pos(d.source).y)
      .attr("x2", d => pos(d.target).x)
      .attr("y2", d => pos(d.target).y);

    nodeSel.attr("transform", d => `translate(${d.x}, ${d.y})`);
  }

  function pos(ref) {
    const id = (typeof ref === "object") ? ref.id : ref;
    return g.nodes.find(n => n.id === id) || { x: 0, y: 0 };
  }

  function dragStart(ev, d) {
    if (!ev.active) sim.alphaTarget(0.22).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(ev, d) {
    d.fx = ev.x; d.fy = ev.y;
  }
  function dragEnd(ev, d) {
    if (!ev.active) sim.alphaTarget(0);
    d.fx = null; d.fy = null;
    saveCb();
  }

  function refresh() {
    // links
    linkSel = linksLayer.selectAll("line")
      .data(g.edges, d => d.id)
      .join(
        enter => enter.append("line")
          .attr("class", d => "link-line " + (d.role || "link")),
        update => update
          .attr("class", d => "link-line " + (d.role || "link")),
        exit => exit.remove()
      );

    // nodes
    nodeSel = nodesLayer.selectAll("g.node")
      .data(g.nodes, d => d.id)
      .join(
        enter => nodeEnter(enter),
        update => update,
        exit => exit.remove()
      );

    sim.nodes(g.nodes);
    sim.force("link").links(g.edges);
    sim.alpha(0.4).restart();

    saveCb();
  }

  function zoomBy(f) { svg.transition().duration(120).call(zoom.scaleBy, f); }

  function center() {
    svg.transition().duration(160)
      .call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(1));
  }

  function fitToView() {
    if (!g.nodes.length) return;
    const xs = g.nodes.map(n => n.x);
    const ys = g.nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 120;
    const boxW = (maxX - minX) + pad * 2;
    const boxH = (maxY - minY) + pad * 2;
    const scale = Math.min(W / boxW, H / boxH);
    const tx = (W / 2) - scale * (minX + maxX) / 2;
    const ty = (H / 2) - scale * (minY + maxY) / 2;
    svg.transition().duration(200)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  // background click: cancel pending links
  svg.on("click", () => {
    pendingLinkFrom = null;
    highlightPending(null);
  });

  function highlightPending(nodeId) {
    nodeSel.selectAll("rect")
      .style("stroke", d => d.id === nodeId ? "rgba(255,255,255,0.9)" : null)
      .style("stroke-width", d => d.id === nodeId ? 2.4 : null);
  }

  function highlightSideCandidates(side){
  if (!side) {
    nodeSel.selectAll("rect")
      .style("stroke", null)
      .style("stroke-width", null)
      .style("filter", null);
    return;
  }

  const curEp = g.nodes.find(n => n.side === side && n.kind !== "vm");
  const curId = curEp?.id;

  nodeSel.selectAll("rect")
    .style("stroke", d => {
      if (d.kind === "vm") return null;                 // VM не кандидаты
      if (d.id === curId) return "rgba(120,255,170,0.95)"; // текущая сторона — зелёная
      return "rgba(255,255,255,0.95)";                 // остальные кандидаты — белые
    })
    .style("stroke-width", d => (d.kind !== "vm") ? 2.6 : null)
    .style("filter", d => (d.kind !== "vm") ? "drop-shadow(0 0 8px rgba(255,255,255,0.35))" : null);
  }


  return {
    refresh,
    zoomBy,
    center,
    fitToView,
    highlightPending,
    highlightSideCandidates,
    get svg() { return svg; },
    get root() { return root; },
    get nodesLayer() { return nodesLayer; },
    get linksLayer() { return linksLayer; },
    get sim() { return sim; }
  };
}


function watermarkHref(d) {
  const base = "/lounge/custom/img/";
  if (!d || !d.kind) return base + "router.svg";

  const kind = d.kind.toLowerCase();

  // Словарь маппинга: просто добавляешь новые типы сюда
  const map = {
    office:   "server.svg",
    isp:      "isp.png",
    emach:    "Emach.png",
    vm:       "client.svg",
    client:   "client.svg",
    server:   "server.svg",
    router:   "router.svg",
    switch:   "switch.svg",
    firewall: "firewall.svg"
  };


  return base + (map[kind] || "router.svg");
}




function nodeTypeLabel(n){
  if (n.kind === "office") return "Office";
  if (n.kind === "vm") return "VM";
  if (n.kind === "isp") return "ISP";
  if (n.kind === "emach") return "Emach";
  return "Node";
}

/* =========================================================
   Base graph persistence (used by all parts)
   ========================================================= */

function persistGraph(){
  if (!current || !graph) return;
  current.layout ||= {};
  current.layout.nodes = graph.nodes.map(n => ({
    ...n, fx: undefined, fy: undefined
  }));
  current.layout.edges = graph.edges.map(e => ({
    id: e.id,
    source: (typeof e.source === "object") ? e.source.id : e.source,
    target: (typeof e.target === "object") ? e.target.id : e.target,
    role: e.role
  }));
  current.layout.zoom = graph.zoom || null;
  saveState();
}

/* =========================================================
   Utilities
   ========================================================= */
function uid(prefix="") { return prefix + Math.random().toString(36).slice(2,9); }
function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => (
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]
  ));
}
function idOf(ref){ return (typeof ref === "object") ? ref.id : ref; }

function ipToInt(ip){ return ip.split('.').reduce((a,p)=> (a<<8) + (+p), 0)>>>0; }
function intToIp(int){ return [24,16,8,0].map(s=> (int>>>s)&255 ).join('.'); }
function cidrInfo(cidr){
  const [ip, bitsStr] = cidr.trim().split('/');
  const bits = +bitsStr;
  if(!ip || isNaN(bits) || bits<0 || bits>32) throw new Error('CIDR');
  const base = ipToInt(ip);
  const mask = bits===0 ? 0 : (~0 << (32-bits))>>>0;
  const net  = base & mask;
  const bcast= net | (~mask>>>0);
  const first= bits>=31 ? net : (net+1)>>>0;
  const last = bits>=31 ? bcast : (bcast-1)>>>0;
  const usable = bits>=31 ? 0 : (last - first + 1)>>>0;
  return { net, first, last, mask, usable };
}


/* 
  Hooks (назначаются позже):
  - onNodeClick(node)
  - onNodeContext(event,node)
*/
let onNodeClick = null;
let onNodeContext = null;
let dndState = {
  dragging: false,
  kind: null,
  objId: null
};

const dragGhostEl = document.getElementById("dragGhost");

function initDnD(poolSelector, svgSelector, g, api, buildNodeFn, saveFn) {
  const pool = document.querySelector(poolSelector);
  const svgEl = document.querySelector(svgSelector);
  if (!pool || !svgEl) return;

  // enable draggable for pool items via delegation
  pool.addEventListener("mousedown", (ev) => {
    const item = ev.target.closest(".item");
    if (!item) return;
    item.setAttribute("draggable", "true");
  });

  pool.addEventListener("dragstart", (ev) => {
    const item = ev.target.closest(".item");
    if (!item) return;

    dndState.dragging = true;
    dndState.kind = item.dataset.kind; // office / ISP / EMach
    dndState.objId = item.dataset.id;

    if (dragGhostEl) {
      const title = item.querySelector(".title")?.textContent || item.textContent || "Node";
      dragGhostEl.textContent = title.trim();
      dragGhostEl.classList.remove("hidden");
      dragGhostEl.style.left = ev.clientX + "px";
      dragGhostEl.style.top = ev.clientY + "px";
    }

    ev.dataTransfer.setData("text/plain", "node");
    ev.dataTransfer.effectAllowed = "copy";
  });

  pool.addEventListener("dragend", () => {
    dndState.dragging = false;
    if (dragGhostEl) dragGhostEl.classList.add("hidden");
  });

  svgEl.addEventListener("dragover", (ev) => {
    if (!dndState.dragging) return;
    ev.preventDefault();

    if (dragGhostEl) {
      dragGhostEl.style.left = ev.clientX + "px";
      dragGhostEl.style.top = ev.clientY + "px";
    }
  });

  svgEl.addEventListener("drop", (ev) => {
    if (!dndState.dragging) return;
    ev.preventDefault();
    if (dragGhostEl) dragGhostEl.classList.add("hidden");

    const pt = getSvgCoordinates(svgEl, ev.clientX, ev.clientY);
    const node = buildNodeFn(dndState.kind, dndState.objId, null);
    if (!node) {
      resetDnd();
      return;
    }

    node.x = pt.x;
    node.y = pt.y;

    g.nodes.push(node);

    saveFn();
    api.refresh();

    resetDnd();
  });

  function resetDnd() {
    dndState.dragging = false;
    dndState.kind = null;
    dndState.objId = null;
  }
}

function getSvgCoordinates(svgElement, clientX, clientY) {
  const pt = svgElement.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;

  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };

  const inv = ctm.inverse();
  const res = pt.matrixTransform(inv);
  return { x: res.x, y: res.y };
}

/* =========================================================
   PART 3 — Context Menu Engine (RMB on nodes)
   ========================================================= */

function initContextMenu(api, g, callbacks) {
  // callbacks: { setSideA, setSideB, pickVm, deleteNode, deleteEdges }
  const ctx = document.getElementById("ctxMenu");
  if (!ctx) return;

  let currentNode = null;

  function showCtx(ev, node) {
    currentNode = node;

    ctx.style.left = ev.clientX + "px";
    ctx.style.top  = ev.clientY + "px";
    ctx.classList.remove("hidden");

    const vmItem = ctx.querySelector("[data-action='pickVm']");
    if (vmItem) {
      vmItem.style.display = (node.kind === "office") ? "" : "none";
    }
  }

  function hideCtx() {
    ctx.classList.add("hidden");
    currentNode = null;
  }

  // hide on click outside
  document.addEventListener("click", (ev) => {
    if (ctx.classList.contains("hidden")) return;
    if (!ctx.contains(ev.target)) hideCtx();
  });

  // bind RMB hook into D3 (Part 1 uses onNodeContext)
  onNodeContext = (ev, node) => {
    ev.preventDefault();
    showCtx(ev, node);
  };

  // menu actions
  ctx.addEventListener("click", (ev) => {
    const item = ev.target.closest(".ctx-item");
    if (!item || !currentNode) return;

    const action = item.dataset.action;

    switch (action) {
      case "makeA":
        callbacks.setSideA && callbacks.setSideA(currentNode);
        break;
      case "makeB":
        callbacks.setSideB && callbacks.setSideB(currentNode);
        break;
      case "pickVm":
        callbacks.pickVm && callbacks.pickVm(currentNode);
        break;
      case "deleteNode":
        callbacks.deleteNode && callbacks.deleteNode(currentNode);
        break;
      case "deleteEdges":
        callbacks.deleteEdges && callbacks.deleteEdges(currentNode);
        break;
    }

    hideCtx();
  });
}

function makeSideCallbacks(api){
  return {
    setSideA: (node) => assignSide("a", node, api),
    setSideB: (node) => assignSide("b", node, api),
    deleteNode: (node) => deleteNodeFromGraph(node, api),
    deleteEdges: (node) => deleteEdgesOfNode(node, api),
  };
}

function assignSide(side, node, api){
  if (!current || !graph) return;
  if (node.kind === "vm") return; // VM нельзя назначать стороной

  cleanupTunnelIfaceForSide(side);
  // 1) удалить старый endpoint этой стороны
  const oldEp = graph.nodes.find(n => n.side === side && n.kind !== "vm");
  if (oldEp){
    graph.edges = graph.edges.filter(e =>
      idOf(e.source) !== oldEp.id && idOf(e.target) !== oldEp.id
    );
    graph.nodes = graph.nodes.filter(n => n.id !== oldEp.id);
  }

  // 2) построить новый endpoint по типу выбранного узла
  const ref = nodeToPoolRef(node);
  if (!ref) return;
  const ep = buildNode(ref.kind, ref.refId, side);
  if (!ep) return;


  ep.x = node.x;
  ep.y = node.y;
  ep.ip = (side === "a") ? (current.a?.ip || "") : (current.b?.ip || "");

  graph.nodes.push(ep);

  // 3) обновить current.a/current.b
  if (kind === "office"){
    current[side] = { officeId: refId, node: refId, ip: ep.ip };
    current.endpoints ||= {};
    current.endpoints[side] ||= { vmId: null, iface: "tunnel.0" };
  } else {
    current[side] = { linkId: refId, linkType: kind, node: refId, ip: ep.ip };
    current.endpoints ||= {};
    current.endpoints[side] = null;
  }

  // 4) пересобрать main-edge
  rebuildMainTunnelEdge();

  // 5) если офис — добавить VM-детей (если их ещё нет)
  if (ep.kind === "office"){
    generateVmNodesForOffice(ep);
  }

  // 6) обновить интерфейсы
  syncTunnelIfaces();

  // 7) сохранить/обновить
  persistGraph();
  saveState();
  renderPool();
  api.refresh();
}

function rebuildMainTunnelEdge(){
  const epA = graph.nodes.find(n => n.side === "a" && n.kind !== "vm");
  const epB = graph.nodes.find(n => n.side === "b" && n.kind !== "vm");

  graph.edges = graph.edges.filter(e => e.role !== "tunnel-main");

  if (epA && epB){
    graph.edges.push({
      id: uid("E_"),
      source: epA.id,
      target: epB.id,
      role: "tunnel-main"
    });
  }
}

function deleteNodeFromGraph(node, api){
  if (!graph) return;
  if (node.side) return; // endpoint удалять нельзя

  graph.nodes = graph.nodes.filter(n => n.id !== node.id);
  graph.edges = graph.edges.filter(e =>
    idOf(e.source) !== node.id && idOf(e.target) !== node.id
  );

  persistGraph();
  saveState();
  renderPool();
  api.refresh();
}

function deleteEdgesOfNode(node, api){
  if (!graph) return;

  graph.edges = graph.edges.filter(e => {
    const s = idOf(e.source), t = idOf(e.target);
    const touches = (s === node.id || t === node.id);
    if (!touches) return true;
    return e.role === "tunnel-main"; // main-edge оставляем
  });

  persistGraph();
  saveState();
  api.refresh();
}

/* convert current graph node to pool kind/refId */
function nodeToPoolRef(node){
  if (node.kind === "office") return { kind: "office", refId: node.officeId };
  if (node.kind === "isp")    return { kind: "ISP",    refId: node.linkId };
  if (node.kind === "emach")  return { kind: "EMach",  refId: node.linkId };
  return null; // никакого автоподбора EMach
}


function initVmLogic(api){
  return {
    pickVM: (officeNode) => pickVmCallback(officeNode, api)
  };
}

function pickVmCallback(node, api){
  if (node.kind !== "office") return;

  const office = byId(state.offices || [], node.officeId);
  if (!office || !office.vms || !office.vms.length){
    alert("У этого офиса нет виртуальных машин.");
    return;
  }

  openVmPicker(node, office.vms, api);
}

function openVmPicker(officeNode, vmList, api){
  // простая модалка
  const overlay = document.createElement("div");
  overlay.className = "vm-picker-overlay";
  overlay.innerHTML = `
    <div class="vm-picker">
      <h2>Выбор VM для tunnel.0</h2>
      <div class="vm-list">
        ${vmList.map(v => `
          <div class="vm-item" data-id="${v.id}">
            ${escapeHtml(v.name || ("VM#" + v.id))}
          </div>
        `).join("")}
      </div>
      <button class="btn ghost vm-picker-close">Закрыть</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector(".vm-picker-close").onclick = () => overlay.remove();

  overlay.addEventListener("click", (ev) => {
    const item = ev.target.closest(".vm-item");
    if (!item) return;

    overlay.remove();
    applyVmSelection(officeNode, item.dataset.id, api);
  });
}

function applyVmSelection(officeNode, vmId, api){
  const side = officeNode.side;
  if (!side){
    alert("Этот офис не является стороной туннеля.");
    return;
  }

  current.endpoints ||= {};
  current.endpoints[side] ||= {};
  current.endpoints[side].vmId = vmId;

  syncTunnelIfaces();
  highlightActiveVMs(api);

  persistGraph();
  saveState();
  api.refresh();
}

/* create VM children under office if absent */
function generateVmNodesForOffice(officeNode){
  if (!graph) return;

  const office = byId(state.offices || [], officeNode.officeId);
  if (!office || !office.vms) return;

  const already = graph.nodes.filter(n =>
    n.kind === "vm" && n.parentOfficeId === officeNode.officeId
  );
  if (already.length) return;

  office.vms.forEach(vm => {
    const vmNodeId = `vm_${office.id}_${vm.id}`;
    graph.nodes.push({
      id: vmNodeId,
      kind: "vm",
      name: resolveVmName(vm, office),
      parentOfficeId: office.id,
      vmId: vm.id,
      type: selectedDeviceType,
      x: officeNode.x + (Math.random()*120 - 60),
      y: officeNode.y + 140 + (Math.random()*80),
    });
    graph.edges.push({
      id: uid("E_"),
      source: officeNode.id,
      target: vmNodeId,
      role: "office-vm"
    });
  });
}


/* highlight active VM nodes */
function highlightActiveVMs(api){
  const ep = current.endpoints || {};
  const vmA = ep.a?.vmId;
  const vmB = ep.b?.vmId;

  // снять классы
  api.nodesLayer.selectAll("g.node.vm").classed("vm-active", false);

  // добавить активным
  api.nodesLayer.selectAll("g.node.vm").each(function(d){
    if (String(d.vmId) === String(vmA) || String(d.vmId) === String(vmB)){
      d3.select(this).classed("vm-active", true);
    }
  });
}

/* =========================================================
   QUICK CHANGE A/B (VM only, does NOT change tun.a/tun.b)
   ========================================================= */

function highlightVmCandidates(side){
  if (!boardApi || !graph || !current) return;

  const activeVmId = current.endpoints?.[side]?.vmId;
  const offId = current?.[side]?.officeId || current?.[side]?.node;
  const extId = current?.[side]?.linkId;

  // сброс классов
  boardApi.nodesLayer.selectAll("g.node")
    .classed("vm-candidate", false)
    .classed("vm-current", false);

  boardApi.nodesLayer.selectAll("g.node").each(function(d){
    const sel = d3.select(this);

    const isOfficeVm = (d.kind === "vm")
      && offId != null
      && String(d.parentOfficeId) === String(offId);

    const isExternalMachine = (d.kind === "isp" || d.kind === "emach")
      && extId != null
      && String(d.linkId) === String(extId);

    if (isOfficeVm || isExternalMachine){
      sel.classed("vm-candidate", true);

      const isActive =
        (d.kind === "vm" && String(d.vmId) === String(activeVmId));

      if (isActive) sel.classed("vm-current", true);
      if (isExternalMachine) sel.classed("vm-current", true); 
      // если сторона внешняя — текущим считается сам ext
    }
  });
}

function clearVmCandidates(){
  if (!boardApi) return;
  boardApi.nodesLayer.selectAll("g.node")
    .classed("vm-candidate", false)
    .classed("vm-current", false);
}

function replaceTunnelSideVm(side, vmNode){
  if (!current || !graph) return;

  const offId = current?.[side]?.officeId || current?.[side]?.node;
  if (!offId){
    alert("Сторона " + side.toUpperCase() + " не офисная, VM тут не выбирается.");
    return;
  }

  if (vmNode.kind !== "vm" || String(vmNode.parentOfficeId) !== String(offId)){
    alert("Эта VM не относится к стороне " + side.toUpperCase());
    return;
  }

  // убрать старый tunnel.0 с предыдущей VM/стороны
  cleanupTunnelIfaceForSide(side);

  current.endpoints ||= {};
  current.endpoints[side] ||= { iface: "tunnel.0", vmId: null };
  current.endpoints[side].vmId = vmNode.vmId;

  // перезаписать ifaces по новой VM
  syncTunnelIfaces();

  // main-edge должен вести к новой VM
  rebuildMainTunnelEdgeToSelectedVms();

  highlightActiveVMs(boardApi);
  persistGraph();
  saveState();
  boardApi.refresh();
}

function rebuildMainTunnelEdgeToSelectedVms(){
  if (!graph || !current) return;

  graph.edges = graph.edges.filter(e => e.role !== "tunnel-main");

  const aEnd = getEndpointNodeId("a");
  const bEnd = getEndpointNodeId("b");

  if (aEnd && bEnd){
    graph.edges.push({
      id: `link_${current.id}`,
      source: aEnd,
      target: bEnd,
      role: "tunnel-main",
      linkId: current.id,
      linkType: current.type
    });
  }
}

function getEndpointNodeId(side){
  const info = normalizeEndpointForTopology(side, current);
  if (!info) return null;

  if (info.kind === "office"){
    const vmId = current.endpoints?.[side]?.vmId;
    if (vmId){
      const n = graph.nodes.find(x => x.id === `vm_${info.officeId}_${vmId}`);
      if (n) return n.id;
    }
    return `office_${info.officeId}`;
  }

  // external side
  return `ext_${info.linkId}`;
}


/* =========================================================
   Tunnel iface sync (offices + ISP/Emach)
   ========================================================= */

function syncTunnelIfaces(){
  const l = current;
  if (!l) return;

  // офис A
  if (l.a && (l.a.officeId || l.a.node) && l.endpoints?.a?.vmId){
    const offId = l.a.officeId || l.a.node;
    const off   = byId(state.offices || [], offId);
    const vm    = off?.vms?.find(v => String(v.id) === String(l.endpoints.a.vmId));
    if (vm){
      vm.ifaces ||= [];
      const data = { name:"tunnel.0", mode:"tunnel", ip:l.a.ip, cidr:l.cidr, linkId:l.id };
      let ex = vm.ifaces.find(i => i.name==="tunnel.0" && i.mode==="tunnel" && i.linkId===l.id);
      if (ex) Object.assign(ex, data); else vm.ifaces.push(data);
    }
  }

  // офис B
  if (l.b && (l.b.officeId || l.b.node) && l.endpoints?.b?.vmId){
    const offId = l.b.officeId || l.b.node;
    const off   = byId(state.offices || [], offId);
    const vm    = off?.vms?.find(v => String(v.id) === String(l.endpoints.b.vmId));
    if (vm){
      vm.ifaces ||= [];
      const data = { name:"tunnel.0", mode:"tunnel", ip:l.b.ip, cidr:l.cidr, linkId:l.id };
      let ex = vm.ifaces.find(i => i.name==="tunnel.0" && i.mode==="tunnel" && i.linkId===l.id);
      if (ex) Object.assign(ex, data); else vm.ifaces.push(data);
    }
  }

  // внешняя A (ISP/Emach)
  if (l.a && l.a.linkId && l.a.linkType){
    const ext = byId(state.links || [], l.a.linkId);
    if (ext){
      ext.tunnelIfaces ||= [];
      let nic = ext.tunnelIfaces.find(n => n.tunnelId === l.id);
      if (!nic){
        nic = { tunnelId:l.id, name:"tun" + ext.tunnelIfaces.length };
        ext.tunnelIfaces.push(nic);
      }
      nic.cidr = l.cidr;
      nic.ip   = l.a.ip;
    }
  }

  // внешняя B
  if (l.b && l.b.linkId && l.b.linkType){
    const ext = byId(state.links || [], l.b.linkId);
    if (ext){
      ext.tunnelIfaces ||= [];
      let nic = ext.tunnelIfaces.find(n => n.tunnelId === l.id);
      if (!nic){
        nic = { tunnelId:l.id, name:"tun" + ext.tunnelIfaces.length };
        ext.tunnelIfaces.push(nic);
      }
      nic.cidr = l.cidr;
      nic.ip   = l.b.ip;
    }
  }

  saveState();
}

function cleanupTunnelIfaceForSide(side){
  const l = current;
  if (!l) return;

  const old = l[side];
  if (!old) return;

  // Старый офисный endpoint
  if (old.officeId || (old.node && byId(state.offices || [], old.node))){
    const offId = old.officeId || old.node;
    const off = byId(state.offices || [], offId);
    const vmId = l.endpoints?.[side]?.vmId;
    const vm = off?.vms?.find(v => String(v.id) === String(vmId));
    if (vm?.ifaces){
      vm.ifaces = vm.ifaces.filter(i =>
        !(i.name==="tunnel.0" && i.mode==="tunnel" && i.linkId===l.id)
      );
    }
  }

  // Старый внешний endpoint (ISP/EMach)
  if (old.linkId){
    const ext = byId(state.links || [], old.linkId);
    if (ext?.tunnelIfaces){
      ext.tunnelIfaces = ext.tunnelIfaces.filter(n => n.tunnelId !== l.id);
    }
  }
}


function removeTunnelIfaces(tunnelId){
  // 1) У офисных VM удаляем tunnel.0 этого туннеля
  (state.offices || []).forEach(off => {
    (off.vms || []).forEach(vm => {
      if (!vm.ifaces) return;
      vm.ifaces = vm.ifaces.filter(i =>
        !(i && i.mode === "tunnel" && String(i.linkId) === String(tunnelId))
      );
    });
  });

  // 2) У ISP/Emach удаляем tunnelIfaces этого туннеля
  (state.links || [])
    .filter(l => l.type === "ISP" || l.type === "EMach")
    .forEach(ext => {
      if (!ext.tunnelIfaces) return;
      ext.tunnelIfaces = ext.tunnelIfaces.filter(n =>
        String(n.tunnelId) !== String(tunnelId)
      );
    });
}

function initTunnelPage(){
  const qs = new URLSearchParams(location.search);
  const id = qs.get("id");
  const t = byId(state.links || [], id);

  if (!t){
    $("#pageTitle").textContent = `Туннель #${id || "?"} не найден`;
    return;
  }
  current = t;

  $("#pageTitle").textContent = current.name || `Туннель #${current.id}`;

  // sidebar values
  $("#ipA").value  = current.a?.ip || "";
  $("#ipB").value  = current.b?.ip || "";
  $("#cidr").value = current.cidr  || "";
  $("#ipA").readOnly = true;
  $("#ipB").readOnly = true;


  // build/load graph
  graph = loadOrBuildGraph(current);

  // create board
  boardApi = createD3Board("#board", graph, persistGraph);

  initStarsBackground("starsBg");


  // click creation of edges (hook into Part 1)
  onNodeClick = (node) => handleNodeClickForEdge(node);

  // right-click on line to delete (event delegation on linksLayer)
  boardApi.linksLayer.on("contextmenu", (ev) => {
    ev.preventDefault();
    const line = ev.target.closest("line");
    if (!line) return;
    const datum = d3.select(line).datum();
    if (!datum) return;

    // don't delete tunnel-main via RMB (only via reassign side)
    if (datum.role === "tunnel-main") return;

    graph.edges = graph.edges.filter(e => e.id !== datum.id);
    persistGraph();
    saveState();
    boardApi.refresh();
  });

  // change side buttons -> open quick side pick mode
  $("#btnChangeA")?.addEventListener("click", () => {
    sideChangeMode = "a";
    pendingLinkFrom = null;
    boardApi.highlightPending(null);

    highlightVmCandidates("a");
    alert("Кликни по выделенной машине, чтобы заменить узел A (интерфейс tunnel.0).");
  });


  $("#btnChangeB")?.addEventListener("click", () => {
    sideChangeMode = "b";
    pendingLinkFrom = null;
    boardApi.highlightPending(null);

    highlightVmCandidates("b");
    alert("Кликни по выделенной машине, чтобы заменить узел B (интерфейс tunnel.0).");
  });


  // buttons
  $("#btnBack")?.addEventListener("click", () => history.back());

  $("#btnDelete")?.addEventListener("click", () => {
    if (!confirm("Удалить туннель?")) return;

    // сначала чистим все интерфейсы, которые он создал
    removeTunnelIfaces(current.id);

    const idx = (state.links || []).indexOf(current);
    if (idx >= 0) state.links.splice(idx, 1);

    saveState();
    location.href = "/lounge/custom/";
  });


  $("#btnSaveAddrs")?.addEventListener("click", () => {
  try{
    const newCidr = $("#cidr").value.trim();
    const ci = cidrInfo(newCidr);
    if (ci.usable < 2) {
      alert("Подсеть слишком маленькая для туннеля. Используй /30 или больше.");
      return;
    }

    const ipA = intToIp(ci.first);
    const ipB = intToIp(ci.first + 1);

    current.a ||= {};
    current.b ||= {};
    current.cidr = newCidr;
    current.a.ip = ipA;
    current.b.ip = ipB;

    $("#ipA").value = ipA;
    $("#ipB").value = ipB;

    // обновить ip на endpoint-нодах
    graph.nodes.forEach(n => {
      if (n.side === "a") n.ip = ipA;
      if (n.side === "b") n.ip = ipB;
    });

    // это обновит tunnel.0 на ВМ и tunnelIfaces на ISP/EMach
    syncTunnelIfaces();
    persistGraph();
    saveState();
    boardApi.refresh();
  }catch(e){
    alert("CIDR некорректен.");
  }
});


  $("#zoomIn")?.addEventListener("click", () => boardApi.zoomBy(1.2));
  $("#zoomOut")?.addEventListener("click", () => boardApi.zoomBy(1/1.2));
  $("#btnFitView")?.addEventListener("click", () => boardApi.fitToView());
  $("#btnRecenter")?.addEventListener("click", () => boardApi.center());

  // side callbacks (Part 4)
  const sideCbs = makeSideCallbacks(boardApi);

  // vm callbacks (Part 5)
  const vmCbs = initVmLogic(boardApi);

  // context menu (Part 3)
  initContextMenu(boardApi, graph, {
    setSideA: sideCbs.setSideA,
    setSideB: sideCbs.setSideB,
    deleteNode: sideCbs.deleteNode,
    deleteEdges: sideCbs.deleteEdges,
    pickVm: vmCbs.pickVM
  });

  // highlight active VMs if already chosen
  highlightActiveVMs(boardApi);
}

/* =========================================================
   Graph load/build
   ========================================================= */

function loadOrBuildGraph(tunnel){
  // если у выбранного туннеля есть layout — используем его как “seed” позиций
  const seedLayout = tunnel.layout || null;
  return buildFullTopologyGraph(seedLayout, tunnel.id);
}

function resolveDeviceKindFromVm(vm){
  const raw = (vm?.type || vm?.deviceType || vm?.kind || vm?.role || "")
    .toString().trim().toLowerCase();

  // допустимые типы под твои иконки
  const allowed = new Set(["router","switch","firewall","server","client","vm"]);

  return allowed.has(raw) ? raw : "vm";
}

function resolveDeviceKindFromVm(vm){
  const raw = (vm?.type || vm?.deviceType || vm?.kind || vm?.role || "")
    .toString().trim().toLowerCase();

  // допустимые типы под твои иконки
  const allowed = new Set(["router","switch","firewall","server","client","vm"]);

  return allowed.has(raw) ? raw : "vm";
}


function buildFullTopologyGraph(seedLayout, selectedTunnelId){
  const nodes = [];
  const edges = [];
  const nodeIndex = new Map(); // key -> node

  const addNode = (node, key) => {
    if (nodeIndex.has(key)) return nodeIndex.get(key);
    nodeIndex.set(key, node);
    nodes.push(node);
    return node;
  };

  // 0) выбранный туннель
  const tun = byId(state.links || [], selectedTunnelId);
  if (!tun) return { nodes: [], edges: [], zoom: seedLayout?.zoom || null };

  // 1) нормализованные стороны
  const aInfo = normalizeEndpointForTopology("a", tun);
  const bInfo = normalizeEndpointForTopology("b", tun);
  if (!aInfo || !bInfo) return { nodes: [], edges: [], zoom: seedLayout?.zoom || null };

  // 2) добавить участников
  const participants = [aInfo, bInfo];

  participants.forEach(info => {
    if (info.kind === "office"){
      const off = byId(state.offices || [], info.officeId);
      if (!off) return;

      const offNode = addNode({
        id: `office_${off.id}`,
        kind: "office",
        name: resolveOfficeName(off),
        officeId: off.id,
        x: 560 + (Math.random()*260 - 130),
        y: 360 + (Math.random()*220 - 110)
      }, `office:${off.id}`);

      // все ВМ офиса
      (off.vms || []).forEach((vm, i) => {
        const vmKey = `vm:${off.id}:${vm.id}`;
        const vmNode = addNode({
          id: `vm_${off.id}_${vm.id}`,
          kind: resolveDeviceKindFromVm(vm),
          name: resolveVmName(vm, off),
          parentOfficeId: off.id,
          vmId: vm.id,
          x: offNode.x + (i * 90 - 45),
          y: offNode.y + 140
        }, vmKey);

        edges.push({
          id: uid("E_"),
          source: offNode.id,
          target: vmNode.id,
          role: "office-vm"
        });
      });
    }

    if (info.kind === "external"){
      ensureNodeFromEndpoint(info, addNode);
    }
  });

  // 3) вычислить реальные концы туннеля (VM если выбрана)
  const baseA = ensureNodeFromEndpoint(aInfo, addNode);
  const baseB = ensureNodeFromEndpoint(bInfo, addNode);

  let endA = baseA.id;
  let endB = baseB.id;

  if (aInfo.kind === "office" && tun.endpoints?.a?.vmId){
    const key = `vm:${aInfo.officeId}:${tun.endpoints.a.vmId}`;
    if (nodeIndex.has(key)) endA = nodeIndex.get(key).id;
  }
  if (bInfo.kind === "office" && tun.endpoints?.b?.vmId){
    const key = `vm:${bInfo.officeId}:${tun.endpoints.b.vmId}`;
    if (nodeIndex.has(key)) endB = nodeIndex.get(key).id;
  }

  // 4) одно главное ребро
  edges.push({
    id: `link_${tun.id}`,
    source: endA,
    target: endB,
    role: "tunnel-main",
    linkId: tun.id,
    linkType: tun.type
  });

  // 5) применить seedLayout
  if (seedLayout?.nodes?.length){
    const seedMap = new Map(seedLayout.nodes.map(n => [n.id, n]));
    nodes.forEach(n => {
      const s = seedMap.get(n.id);
      if (s && typeof s.x === "number" && typeof s.y === "number"){
        n.x = s.x; n.y = s.y;
      }
    });
  }

  return { nodes, edges, zoom: seedLayout?.zoom || null };
}





/* Normalize endpoint from tunnel state */
function normalizeEndpoint(side, t){
  const ep = t[side];
  if (!ep) return null;

  // office endpoint
  if (ep.officeId || (ep.node && byId(state.offices || [], ep.node))){
    const officeId = ep.officeId || ep.node;
    const off = byId(state.offices || [], officeId);
    return {
      id: `office_${officeId}_${side}`,
      kind: "office",
      name: off?.name || `Office ${officeId}`,
      officeId,
      side,
      ip: ep.ip || "",
      x: side === "a" ? 260 : 860,
      y: 260
    };
  }

  // external endpoint (ISP/EMach)
  if (ep.linkId || ep.node){
    const linkId = ep.linkId || ep.node;
    const ext = byId(state.links || [], linkId);
    const type = ep.linkType || ext?.type || "EMach";
    const kind = type === "ISP" ? "isp" : "emach";

    return {
      id: `ext_${linkId}_${side}`,
      kind,
      name: ext?.name || type || `Node ${linkId}`,
      linkId,
      linkType: type,
      side,
      ip: ep.ip || "",
      x: side === "a" ? 260 : 860,
      y: 260
    };
  }

  return null;
}

// Нормализует endpoint туннеля/связи в унифицированный вид
// side: "a" | "b"
// l: объект линка из state.links
function normalizeEndpointForTopology(side, link){
  // link.a / link.b могут быть строкой/числом или объектом
  const raw = link?.[side];
  if (!raw) return null;

  // привести к объекту
  const ep = (typeof raw === "object") ? raw : { node: raw };

  const offices = state.offices || [];
  const externals = (state.links || []).filter(l => l.type === "ISP" || l.type === "EMach");

  // 1) офис: явный officeId
  if (ep.officeId != null){
    const off = byId(offices, ep.officeId);
    if (off){
      return {
        kind: "office",
        officeId: off.id
      };
    }
  }

  // 2) офис: ep.node указывает на офис
  if (ep.node != null){
    const off = byId(offices, ep.node);
    if (off){
      return {
        kind: "office",
        officeId: off.id
      };
    }
  }

  // 3) внешняя ВМ: явный linkId (ISP/Emach)
  if (ep.linkId != null){
    const ext = byId(externals, ep.linkId);
    if (ext){
      return {
        kind: "external",
        linkId: ext.id,
        linkType: ext.type // ISP | EMach
      };
    }
  }

  // 4) внешняя ВМ: ep.node указывает на ISP/Emach
  if (ep.node != null){
    const ext = byId(externals, ep.node);
    if (ext){
      return {
        kind: "external",
        linkId: ext.id,
        linkType: ext.type
      };
    }
  }

  return null;
}




function ensureNodeFromEndpoint(info, addNode){
  if (info.kind === "office"){
    const off = byId(state.offices || [], info.officeId);
    return addNode({
      id: `office_${info.officeId}`,
      kind: "office",
      name: resolveOfficeName(off) || off?.name || `OF-${info.officeId}`,
      officeId: info.officeId,
      x: 560 + (Math.random()*260-130),
      y: 360 + (Math.random()*220-110)
    }, `office:${info.officeId}`);
  }

  // external ISP/Emach as VM-like node
  const ext = byId(state.links || [], info.linkId);
  const extKind = (ext?.type === "ISP") ? "isp" : "emach";

  return addNode({
    id: `ext_${info.linkId}`,
    kind: extKind,
    name: resolveExternalName(ext, ext?.type) || ext?.name || `${extKind.toUpperCase()}-${info.linkId}`,
    linkId: info.linkId,
    linkType: ext?.type,
    x: 560 + (Math.random()*360-180),
    y: 360 + (Math.random()*260-130)
  }, `ext:${info.linkId}`);
}





/* =========================================================
   Pool (unused nodes)
   ========================================================= */

let sidePickMode = null;

function openSidePick(side){
  sidePickMode = side;
  $("#unusedList")?.classList.remove("hidden");
  renderPool(true);
}

function renderPool(isSidePick=false){
  const wrap = $("#unusedNodes");
  if (!wrap) return;

  wrap.innerHTML = "";

  const used = new Set();

  graph.nodes.forEach(n => {
    if (n.kind === "office") used.add(String(n.officeId));
    if (n.kind === "isp" || n.kind === "emach") used.add(String(n.linkId));
  });

  // offices
  (state.offices || []).forEach(off => {
    if (used.has(String(off.id))) return;
    wrap.appendChild(poolItem(off.id, "office", off.name || `Office ${off.id}`));
  });

  // ISP / EMach
  (state.links || [])
    .filter(l => l.type === "ISP" || l.type === "EMach")
    .forEach(l => {
      if (used.has(String(l.id))) return;
      wrap.appendChild(poolItem(l.id, l.type, l.name || l.type));
    });

  if (!wrap.children.length){
    const empty = document.createElement("div");
    empty.className = "muted small";
    empty.textContent = "Дополнительных узлов нет.";
    wrap.appendChild(empty);
  }

  const hint = $(".pool__hint");
  if (hint){
    hint.textContent = isSidePick
      ? "Выбери узел — он будет стороной туннеля."
      : "Перетащи или кликни, чтобы добавить в карту.";
  }
}

function poolItem(id, kind, name){
  const d = document.createElement("div");
  d.className = "item";
  d.dataset.id = id;
  d.dataset.kind = kind;
  d.setAttribute("draggable","true");

  d.innerHTML = `
    <div class="left">
      <div class="title">${escapeHtml(name)}</div>
      <div class="meta">${kind}</div>
    </div>
    <div class="tag">+</div>
  `;
  return d;
}

function addNodeFromPool(kind, id){
  if (sidePickMode){
    const tempNode = buildNode(kind, id, sidePickMode);
    // назначение стороны делаем через assignSide (Part 4)
    assignSide(sidePickMode, tempNode, boardApi);
    sidePickMode = null;
    $("#unusedList")?.classList.add("hidden");
    return;
  }

  const node = buildNode(kind, id, null);
  if (!node) return;

  graph.nodes.push(node);
  persistGraph();
  saveState();
  $("#unusedList")?.classList.add("hidden");
  renderPool();
  boardApi.refresh();
}

/* =========================================================
   Edge creation by click
   ========================================================= */

function handleNodeClickForEdge(node){
  // РЕЖИМ СМЕНЫ СТОРОНЫ
    if (sideChangeMode){
    // Кликаем ТОЛЬКО по машинам (VM или внешний узел)
    if (node.kind === "vm"){
      replaceTunnelSideVm(sideChangeMode, node);
    } else if (node.kind === "isp" || node.kind === "emach"){
      // внешняя сторона меняется только через контекстное меню "Сделать стороной",
      // тут ничего не делаем
      alert("Внешнюю сторону меняй через ПКМ → Сделать стороной A/B.");
    }

    sideChangeMode = null;
    clearVmCandidates();
    return;
  }


  if (!pendingLinkFrom){
    pendingLinkFrom = node.id;
    boardApi.highlightPending(node.id);
    return;
  }

  if (pendingLinkFrom === node.id){
    pendingLinkFrom = null;
    boardApi.highlightPending(null);
    return;
  }

  // don't create duplicate edges
  const exists = graph.edges.some(e => {
    const s = idOf(e.source), t = idOf(e.target);
    return (s === pendingLinkFrom && t === node.id) || (s === node.id && t === pendingLinkFrom);
  });
  if (!exists){
    graph.edges.push({
      id: uid("E_"),
      source: pendingLinkFrom,
      target: node.id
    });
  }

  pendingLinkFrom = null;
  boardApi.highlightPending(null);

  persistGraph();
  saveState();
  boardApi.refresh();
}

/* =========================================================
   Build graph nodes from pool kind
   ========================================================= */

function buildNode(kind, id, side=null){
  if (kind === "office"){
    const off = byId(state.offices || [], id);
    if (!off) return null;
    return {
      id: `office_${id}`,
      kind: "office",
      name: off.name || `Office ${id}`,
      officeId: id,
      side,
      ip: "",
      x: side === "a" ? 260 : (side === "b" ? 860 : 560),
      y: side ? 260 : 420
    };

  }

  if (kind === "ISP" || kind === "EMach"){
    const ext = byId(state.links || [], id);
    if (!ext || String(ext.type) !== String(kind)) return null;

    const k = kind === "ISP" ? "isp" : "emach";
    return {
      id: `ext_${id}`,
      kind: k,
      name: ext?.name || kind,
      linkId: id,
      linkType: kind,
      side,
      ip: "",
      x: side === "a" ? 260 : (side === "b" ? 860 : 560),
      y: side ? 260 : 420
    };
  }


  return null;
}
/* =========================================================
   Stars / Constellations background
   ========================================================= */

function initStarsBackground(canvasId){
  const cvs = document.getElementById(canvasId);
  if (!cvs) return;
  const ctx = cvs.getContext("2d");

  function resize(){
    const r = cvs.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cvs.width = r.width * dpr;
    cvs.height = r.height * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }

  let stars = [];
  function seed(){
    const w = cvs.getBoundingClientRect().width;
    const h = cvs.getBoundingClientRect().height;
    const count = Math.floor((w*h)/9000); // плотность
    stars = Array.from({length: count}).map(()=>({
      x: Math.random()*w,
      y: Math.random()*h,
      r: Math.random()*1.4 + 0.4,
      a: Math.random()*0.6 + 0.2
    }));
  }

  function draw(){
    const w = cvs.getBoundingClientRect().width;
    const h = cvs.getBoundingClientRect().height;
    ctx.clearRect(0,0,w,h);

    // фон лёгкой туманности
    const g1 = ctx.createRadialGradient(w*0.15,h*0.1,0,w*0.15,h*0.1,w*0.9);
    g1.addColorStop(0,"rgba(176,115,255,0.10)");
    g1.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0,0,w,h);

    // звезды
    stars.forEach(s=>{
      ctx.beginPath();
      ctx.fillStyle = `rgba(230,230,255,${s.a})`;
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fill();
    });

    // созвездия: соединяем близкие звезды
    for (let i=0;i<stars.length;i++){
      for (let j=i+1;j<stars.length;j++){
        const a = stars[i], b = stars[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const dist = Math.hypot(dx,dy);
        if (dist < 140){ // радиус "созвездий"
          const alpha = (1 - dist/140) * 0.18;
          ctx.strokeStyle = `rgba(176,115,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }
  }

  seed();
  resize();
  window.addEventListener("resize", () => { seed(); resize(); });
}

/* =========================================================
   Layer filters (visibility)
   ========================================================= */

const layerState = {
  links: true,
  tunnels: true,
  offices: true,
  externals: true,
  vms: true
};

function initLayerFilters(api){
  const panel = document.getElementById("layerPanel");
  if (!panel) return;

  panel.addEventListener("change", (e) => {
    const cb = e.target.closest("input[type='checkbox']");
    if (!cb) return;

    const key = cb.dataset.layer;
    layerState[key] = cb.checked;

    applyLayerFilters(api);
  });

  applyLayerFilters(api);
}

function applyLayerFilters(api){
  if (!api) return;

  // Nodes
  api.nodesLayer.selectAll("g.node").style("display", d => {
    if (d.kind === "vm") return layerState.vms ? null : "none";
    if (d.kind === "office") return layerState.offices ? null : "none";
    if (d.kind === "isp" || d.kind === "emach")
      return layerState.externals ? null : "none";
    return null;
  });

  // Edges
  api.linksLayer.selectAll("line").style("display", d => {
    const role = (d.role || "link").toLowerCase();

    if (role === "tunnel-main" || role === "tunnel")
      return layerState.tunnels ? null : "none";

    if (role === "office-vm")
      return layerState.vms ? null : "none";

    // обычные связи
    return layerState.links ? null : "none";
  });
}

/* =========================================================
   Naming helpers (real names)
   ========================================================= */

function resolveOfficeName(off){
  return (off?.name || off?.title || `Office ${off?.id ?? "?"}`).toString();
}

function resolveVmName(vm, office){
  const cand = [vm?.name, vm?.title, vm?.hostname, vm?.host, vm?.role]
    .map(x => (x||"").toString().trim()).find(Boolean);
  if (cand) return cand;
  if (office?.name) return `${office.name}: VM ${vm?.id ?? "?"}`;
  return `VM ${vm?.id ?? "?"}`;
}

function resolveExternalName(ext, fallbackType){
  const cand = [ext?.name, ext?.title, ext?.hostname, ext?.role]
    .map(x => (x||"").toString().trim()).find(Boolean);
  return cand || (fallbackType || `Node ${ext?.id ?? "?"}`);
}

/* =========================================================
   Boot
   ========================================================= */

window.addEventListener("DOMContentLoaded", initTunnelPage);
