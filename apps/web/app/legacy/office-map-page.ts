import { initOfficeMap, on, setOfficeData } from './office-map';

export function initOfficeMapPage() {
  const STORE_KEY = 'lounge_offices_v1';
  const container = document.getElementById('officeGraph');
  if (!container) return;

  const cvs = document.getElementById('spaceCanvas') as HTMLCanvasElement | null;
  const ctx = cvs?.getContext('2d');

  const resizeCanvas = () => {
    if (!cvs) return;
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const stars: Array<{ x: number; y: number; r: number; s: number; t: number; tw: number }> = [];
  const STAR_COUNT = 220;
  for (let i = 0; i < STAR_COUNT; i += 1) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.4 + Math.random() * 1.6,
      s: 0.001 + Math.random() * 0.003,
      t: Math.random() * Math.PI * 2,
      tw: Math.random() * 0.6 + 0.2
    });
  }

  const drawCosmos = () => {
    if (!cvs || !ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    for (const s of stars) {
      s.t += s.s;
      const pulse = 0.5 + Math.sin(s.t) * 0.5;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${170 + pulse * 60},${190 + pulse * 50},255,${0.18 + pulse * 0.25})`;
      ctx.arc(s.x, s.y, s.r + pulse * 1.2, 0, Math.PI * 2);
      ctx.fill();

      if (Math.random() < 0.0006) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(140,190,255,0.25)';
        ctx.lineWidth = 1.2;
        ctx.arc(s.x, s.y, 18 + Math.random() * 25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (let i = 0; i < 32; i += 1) {
      const a = stars[(Math.random() * stars.length) | 0];
      const b = stars[(Math.random() * stars.length) | 0];

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(120,170,255,0.10)';
      ctx.lineWidth = 1;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      ctx.fillStyle = 'rgba(170,220,255,0.12)';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(String((Math.random() * 999) | 0).padStart(3, '0'), midX, midY);
    }

    requestAnimationFrame(drawCosmos);
  };
  drawCosmos();

  const loadState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '') || { offices: [] };
    } catch {
      return { offices: [] };
    }
  };

  const getOfficeFromUrlOrFallback = () => {
    const params = new URLSearchParams(location.search);
    const officeId = params.get('id');
    const state = loadState();
    let office = state.offices.find((o: any) => String(o.id) === String(officeId));
    if (!office) office = state.offices[0];
    return office;
  };

  const ICONS = {
    switch: { icon: '../custom/img/switch.svg' },
    router: { icon: '../custom/img/router.svg' },
    server: { icon: '../custom/img/server.svg' },
    firewall: { icon: '../custom/img/firewall.svg' },
    client: { icon: '../custom/img/client.svg' },
    isp: { icon: '../custom/img/isp.png' },
    emach: { icon: '../custom/img/Emach.png' }
  };
  const DEFAULT_ICON = ICONS.server.icon;

  const vmId = (vm: any) => String(vm.id ?? vm.hostname ?? vm.name);

  const vmKind = (vm: any) => {
    const t = String(vm.type || vm.kind || '').toLowerCase();
    if (t.includes('router')) return 'router';
    if (t.includes('firewall') || t.includes('fw')) return 'firewall';
    if (t.includes('switch') || t.includes('sw')) return 'switch';
    if (t.includes('client') || t.includes('pc') || t.includes('admin')) return 'client';
    return 'server';
  };

  const findVmByKind = (office: any, kind: string) => {
    const vms = office?.vms || [];
    return vms.find((v: any) => vmKind(v) === kind) || null;
  };

  const vmInfoText = (vm: any) => {
    if (!vm || typeof vm !== 'object') return '';
    const lines: string[] = [];
    for (const key of Object.keys(vm)) {
      if (key === 'ifaces' || key === 'id') continue;
      if (typeof vm[key] === 'object') {
        try {
          lines.push(`${key}: ${JSON.stringify(vm[key])}`);
        } catch {
          lines.push(`${key}: [object]`);
        }
        continue;
      }
      lines.push(`${key}: ${vm[key]}`);
    }
    return lines.join('\n');
  };

  const makeDeviceNode = (vm: any, { id, kind, x, y }: any) => {
    const icon = (ICONS as any)[kind]?.icon || DEFAULT_ICON;
    return {
      data: {
        id,
        infoText: vmInfoText(vm),
        kind,
        icon,
        w: 290,
        h: 90,
        _vm: vm
      },
      position: { x, y },
      classes: 'device'
    };
  };

  const ifaceId = (iface: any) => iface.name || iface.id || JSON.stringify(iface);

  const shortIfaceLabel = (iface: any) => {
    const name = iface.name || 'if';
    const vlan = iface.vlanId != null ? `v${iface.vlanId}` : '';
    return vlan ? `${name} ${vlan}` : name;
  };

  const fullIfaceLabel = (iface: any) => {
    const parts: string[] = [];
    if (iface.name) parts.push(iface.name);
    if (iface.vlanId != null) parts.push(`VLAN ${iface.vlanId}`);
    if (iface.ip) parts.push(`IP ${iface.ip}`);
    if (iface.mode) parts.push(String(iface.mode));
    if (iface.dynamic != null) parts.push(iface.dynamic ? 'dynamic' : 'static');
    return parts.join(' • ');
  };

  const decideSide = (_vm: any, iface: any) => {
    if (iface.vlanId != null) return 'floating';
    const n = String(iface.name || '').toLowerCase();
    if (n.includes('wan') || n.includes('uplink') || n.includes('isp')) return 'top';
    if (n.includes('eth0') || n.includes('en0')) return 'right';
    if (n.includes('eth1') || n.includes('en1')) return 'left';
    return 'right';
  };

  const ifaceClass = (iface: any) => {
    if (iface.vlanId != null) return 'port-vlan';
    if (iface.mode === 'static') return 'port-static';
    if (iface.mode === 'dhcp' || iface.mode === 'dynamic') return 'port-dynamic';
    return 'port-static';
  };

  const officeToCytoscapeModel = (office: any) => {
    if (!office) return { rooms: [], nodes: [], links: [], view: { fit: true } };

    const title = document.getElementById('officeTitle');
    if (title) title.textContent = `Карта офиса — ${office.name || office.id}`;

    const nodes: any[] = [];
    const links: any[] = [];

    const centerX = 520;
    const routerVM = findVmByKind(office, 'router');
    const fwVM = findVmByKind(office, 'firewall');
    const swVM = findVmByKind(office, 'switch');

    const chain: string[] = [];

    if (routerVM) {
      const id = vmId(routerVM);
      chain.push(id);
      nodes.push(makeDeviceNode(routerVM, { id, kind: 'router', x: centerX, y: 90 }));
    }
    if (fwVM) {
      const id = vmId(fwVM);
      chain.push(id);
      nodes.push(makeDeviceNode(fwVM, { id, kind: 'firewall', x: centerX, y: 220 }));
    }
    if (swVM) {
      const id = vmId(swVM);
      chain.push(id);
      nodes.push(makeDeviceNode(swVM, { id, kind: 'switch', x: centerX, y: 350 }));
    }

    for (let i = 0; i < chain.length - 1; i += 1) {
      links.push({ source: chain[i], target: chain[i + 1], label: '' });
    }

    const coreId = chain[chain.length - 1];

    const vms = office.vms || [];
    const servers = vms.filter((vm: any) => {
      const k = vmKind(vm);
      return k !== 'router' && k !== 'firewall' && k !== 'switch' && k !== 'client';
    });

    const startY = 210;
    const gapY = 105;
    servers.forEach((vm: any, i: number) => {
      const id = vmId(vm);
      nodes.push(makeDeviceNode(vm, { id, kind: 'server', x: 220, y: startY + i * gapY }));
      if (coreId) links.push({ source: id, target: coreId, label: '' });
    });

    const clients = vms.filter((vm: any) => vmKind(vm) === 'client');
    const clientY = 500;
    const clientStartX = 430;
    const clientGapX = 220;

    clients.forEach((vm: any, i: number) => {
      const id = vmId(vm);
      nodes.push(makeDeviceNode(vm, { id, kind: 'client', x: clientStartX + i * clientGapX, y: clientY }));
      if (coreId) links.push({ source: id, target: coreId, label: '' });
    });

    const deviceNodes = nodes.filter((n) => n.classes.includes('device'));
    deviceNodes.forEach((dev) => {
      const vm = dev.data._vm;
      const ifaces = vm?.ifaces || [];
      if (!ifaces.length) return;

      const bySide: Record<string, any[]> = { top: [], right: [], bottom: [], left: [], floating: [] };
      ifaces.forEach((iface: any) => {
        const side = decideSide(vm, iface);
        bySide[side].push(iface);
      });

      const placePorts = (devNode: any, list: any[], side: string) => {
        if (!list.length) return;
        const x0 = devNode.position.x;
        const y0 = devNode.position.y;
        const w = devNode.data.w;
        const h = devNode.data.h;
        const step = 28;

        list.slice(0, 2).forEach((iface: any, idx: number) => {
          const pid = `${devNode.data.id}::${ifaceId(iface)}`;
          const label = shortIfaceLabel(iface);

          let px = x0;
          let py = y0;

          if (side === 'top') {
            px = x0 - w / 2 + 55 + idx * step;
            py = y0 - h / 2 - 18;
          }
          if (side === 'bottom') {
            px = x0 - w / 2 + 55 + idx * step;
            py = y0 + h / 2 + 18;
          }
          if (side === 'left') {
            px = x0 - w / 2 - 44;
            py = y0 - h / 2 + 28 + idx * step;
          }
          if (side === 'right') {
            px = x0 + w / 2 + 44;
            py = y0 - h / 2 + 28 + idx * step;
          }

          nodes.push({
            data: { id: pid, label, kind: 'port' },
            position: { x: px, y: py },
            classes: `port ${ifaceClass(iface)}`
          });
          links.push({ source: pid, target: devNode.data.id, label: '' });
        });
      };

      const makeFloating = (devNode: any, list: any[]) => {
        if (!list.length) return;
        const x0 = devNode.position.x;
        const y0 = devNode.position.y;
        const w = devNode.data.w;
        list.forEach((iface: any, i: number) => {
          const fid = `${devNode.data.id}::float::${ifaceId(iface)}::${i}`;
          const label = fullIfaceLabel(iface);
          nodes.push({
            data: { id: fid, label, kind: 'floating' },
            position: { x: x0 + w / 2 + 182, y: y0 - 30 + i * 50 },
            classes: 'floating port-vlan'
          });
          links.push({ source: fid, target: devNode.data.id, label: '' });
        });
      };

      placePorts(dev, bySide.top, 'top');
      placePorts(dev, bySide.right, 'right');
      placePorts(dev, bySide.bottom, 'bottom');
      placePorts(dev, bySide.left, 'left');
      makeFloating(dev, bySide.floating);

      ['top', 'right', 'bottom', 'left'].forEach((side) => {
        if (bySide[side].length > 2) {
          makeFloating(dev, bySide[side].slice(2));
        }
      });
    });

    return { rooms: [], nodes, links, view: { fit: true } };
  };

  initOfficeMap(container as HTMLElement);

  const office = getOfficeFromUrlOrFallback();
  const model = officeToCytoscapeModel(office);
  setOfficeData(model as any);

  on('select', (evt: any) => console.log('selected:', evt));
}
