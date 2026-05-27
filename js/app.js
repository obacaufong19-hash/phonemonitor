/**
 * SysMonitor — Main Application
 * Handles rendering, live updates, navigation, and Chart.js
 */

/* ============================================================
   STATE
   ============================================================ */
let state = JSON.parse(JSON.stringify(INITIAL_STATE));
let netHistory = JSON.parse(JSON.stringify(NETWORK_HISTORY));
let netChart = null;
let uptimeSeconds = state.uptime.h * 3600 + state.uptime.m * 60;
let activeSection = 'overview';

/* ============================================================
   HELPERS
   ============================================================ */
function rnd(min, max, decimals = 0) {
  const val = Math.random() * (max - min) + min;
  return decimals === 0 ? Math.round(val) : parseFloat(val.toFixed(decimals));
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function jitter(val, delta, min = 0, max = 100) {
  return clamp(val + rnd(-delta, delta), min, max);
}

function gaugeOffset(pct, r = 32) {
  const circ = 2 * Math.PI * r;
  return (circ * (1 - pct / 100)).toFixed(1);
}

function progressClass(pct) {
  if (pct >= 85) return 'crit';
  if (pct >= 65) return 'warn';
  return '';
}

/* ============================================================
   CLOCK & UPTIME
   ============================================================ */
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('status-time').textContent = `${h}:${m}`;
}

function updateUptime() {
  uptimeSeconds++;
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  document.getElementById('uptime-val').textContent = `${h}h ${m}m`;
}

/* ============================================================
   RENDER GAUGES
   ============================================================ */
function updateGauges() {
  const fields = [
    { ring: 'cpu-ring', text: 'cpu-gauge-text', val: state.cpu },
    { ring: 'ram-ring', text: 'ram-gauge-text', val: state.ram },
    { ring: 'gpu-ring', text: 'gpu-gauge-text', val: state.gpu },
  ];
  fields.forEach(f => {
    const ring = document.getElementById(f.ring);
    const txt  = document.getElementById(f.text);
    if (ring) ring.style.strokeDashoffset = gaugeOffset(f.val);
    if (txt)  txt.textContent = Math.round(f.val) + '%';
  });
}

/* ============================================================
   RENDER RESOURCE LIST
   ============================================================ */
const RESOURCES = [
  { id: 'cpu',  label: n => `CPU · ${Math.round(DEVICE.cores * n / 100) + 1} cores active`, icon: 'ti-cpu',                   cls: 'ri-cpu',  key: 'cpu' },
  { id: 'ram',  label: n => `RAM · ${(DEVICE.totalRam * n / 100).toFixed(1)} GB / ${DEVICE.totalRam} GB`, icon: 'ti-database', cls: 'ri-ram',  key: 'ram' },
  { id: 'gpu',  label: () => `GPU · ${DEVICE.gpuModel}`,                                  icon: 'ti-device-desktop-analytics', cls: 'ri-gpu',  key: 'gpu' },
  { id: 'stor', label: () => `Storage · ${DEVICE.usedStorage} GB / ${DEVICE.totalStorage} GB`, icon: 'ti-device-sd-card',   cls: 'ri-stor', key: 'storage' },
  { id: 'bat',  label: () => `Battery · ${DEVICE.batteryCapacity} mAh · Charging`,        icon: 'ti-battery-3',               cls: 'ri-bat',  key: 'battery' },
];

function renderResourceList() {
  const container = document.getElementById('resource-list');
  if (!container) return;

  container.innerHTML = RESOURCES.map(r => {
    const val = Math.round(state[r.key]);
    const cls = progressClass(val);
    return `
      <div class="resource-row">
        <div class="resource-icon ${r.cls}" aria-hidden="true">
          <i class="ti ${r.icon}"></i>
        </div>
        <div class="resource-info">
          <div class="resource-name">${r.label(val)}</div>
          <div class="progress-track">
            <div class="progress-fill ${cls}" id="bar-${r.id}" style="width:${val}%"></div>
          </div>
        </div>
        <div class="resource-pct" id="pct-${r.id}">${val}%</div>
      </div>`;
  }).join('');
}

function updateResourceBars() {
  RESOURCES.forEach(r => {
    const val = Math.round(state[r.key]);
    const bar = document.getElementById(`bar-${r.id}`);
    const pct = document.getElementById(`pct-${r.id}`);
    if (bar) {
      bar.style.width = val + '%';
      bar.className = `progress-fill ${progressClass(val)}`;
    }
    if (pct) pct.textContent = val + '%';
  });
}

/* ============================================================
   RENDER METRICS
   ============================================================ */
function updateMetrics() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('cpu-temp', Math.round(state.cpuTemp) + '°C');
  set('bat-pct', Math.round(state.battery) + '%');
  set('bat-time', `~${Math.round((state.battery / 100) * 7.5 * 10) / 10}h left`);
  set('proc-count', state.procCount);
  set('proc-total', `${state.procCount} running`);
}

/* ============================================================
   RENDER PROCESSES
   ============================================================ */
function renderProcessList() {
  const container = document.getElementById('proc-list');
  if (!container) return;

  const sorted = [...state.processes].sort((a, b) => b.cpu - a.cpu);
  container.innerHTML = sorted.map(p => `
    <div class="proc-row">
      <div class="proc-dot" style="background:${p.color}"></div>
      <div class="proc-name">${p.name}</div>
      <div class="proc-bar-wrap">
        <div class="proc-bar" style="width:${Math.min(100, (p.cpu / 25) * 100).toFixed(0)}%; background:${p.color}"></div>
      </div>
      <div class="proc-val">${p.cpu.toFixed(1)}%</div>
    </div>`).join('');
}

/* ============================================================
   RENDER CPU CORES
   ============================================================ */
function renderCores() {
  const container = document.getElementById('cores-card');
  if (!container) return;

  container.innerHTML = state.cores.map((val, i) => `
    <div class="core-item">
      <div class="core-bar-wrap">
        <div class="core-bar-fill" style="height:${val}%"></div>
      </div>
      <div class="core-label">C${i}</div>
      <div class="core-val">${val}%</div>
    </div>`).join('');
}

/* ============================================================
   NETWORK CHART (Chart.js)
   ============================================================ */
function initNetworkChart() {
  const canvas = document.getElementById('netChart');
  if (!canvas || netChart) return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#899294' : '#6F797A';

  netChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: netHistory.labels,
      datasets: [
        {
          label: 'Download',
          data: netHistory.dl,
          borderColor: '#006874',
          backgroundColor: 'rgba(0,104,116,0.10)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Upload',
          data: netHistory.ul,
          borderColor: '#E65100',
          backgroundColor: 'rgba(230,81,0,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
          borderDash: [4, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} Mbps`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 10 }, maxTicksLimit: 6 },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 10 }, callback: v => v + 'M' },
          min: 0,
        },
      },
    },
  });
}

function updateNetworkChart() {
  if (!netChart) return;

  netHistory.dl.shift(); netHistory.dl.push(parseFloat(state.network.dl.toFixed(1)));
  netHistory.ul.shift(); netHistory.ul.push(parseFloat(state.network.ul.toFixed(1)));

  netChart.data.datasets[0].data = netHistory.dl;
  netChart.data.datasets[1].data = netHistory.ul;
  netChart.update('none');
}

function updateNetworkUI() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('net-dl', `↓ ${state.network.dl.toFixed(1)}`);
  set('net-ul', `↑ ${state.network.ul.toFixed(1)}`);
  set('net-lat', `${state.network.latency} ms`);
  set('net-data', `${state.network.dataUsed.toFixed(1)} GB`);
}

/* ============================================================
   SIMULATE LIVE DATA UPDATE
   ============================================================ */
function simulateTick() {
  // Jitter main stats
  state.cpu     = jitter(state.cpu, 4, 10, 95);
  state.ram     = jitter(state.ram, 2, 40, 90);
  state.gpu     = jitter(state.gpu, 5, 5, 80);
  state.cpuTemp = jitter(state.cpuTemp, 1.5, 32, 60);

  // Battery drains slightly (simulating)
  state.battery = Math.max(10, state.battery - 0.01);

  // Network
  state.network.dl = jitter(state.network.dl, 8, 5, 100);
  state.network.ul = jitter(state.network.ul, 4, 1, 50);
  state.network.latency = rnd(8, 28);
  state.network.dataUsed += 0.001;

  // Processes
  state.processes.forEach(p => {
    p.cpu = clamp(p.cpu + rnd(-2, 2, 1), 0.5, 30);
  });

  // Cores
  state.cores = state.cores.map(c => jitter(c, 8, 5, 98));

  // Process count occasionally shifts
  if (Math.random() < 0.1) state.procCount += rnd(-3, 3);
  state.procCount = clamp(state.procCount, 120, 180);

  // Update UI
  updateMetrics();
  updateGauges();
  updateResourceBars();
  updateNetworkUI();
  updateNetworkChart();
  renderProcessList();
  renderCores();
  updateUptime();
}

/* ============================================================
   FULL REFRESH (FAB button)
   ============================================================ */
function refresh() {
  const fab = document.querySelector('.fab');
  fab.classList.add('spinning');
  setTimeout(() => fab.classList.remove('spinning'), 600);

  // Randomize everything dramatically
  state.cpu     = rnd(20, 90);
  state.ram     = rnd(50, 85);
  state.gpu     = rnd(10, 75);
  state.battery = rnd(30, 100);
  state.cpuTemp = rnd(33, 58);
  state.network.dl = rnd(10, 100, 1);
  state.network.ul = rnd(5, 40, 1);

  state.processes.forEach(p => { p.cpu = rnd(0.5, 25, 1); });
  state.cores = state.cores.map(() => rnd(5, 95));

  updateMetrics();
  updateGauges();
  renderResourceList();
  renderProcessList();
  renderCores();
  updateNetworkUI();
  updateNetworkChart();
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function navTo(btn, section) {
  // Update nav buttons
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');

  // Update sections
  document.querySelectorAll('.scroll-area section').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(section);
  if (target) target.classList.add('active');

  activeSection = section;

  // Init chart when network tab shown
  if (section === 'network') {
    setTimeout(initNetworkChart, 50);
  }

  // Close drawer if open
  closeDrawer();

  // Scroll to top
  document.getElementById('main-content').scrollTop = 0;
}

/* ============================================================
   DRAWER
   ============================================================ */
function toggleDrawer() {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const isOpen  = drawer.classList.contains('open');
  if (isOpen) {
    closeDrawer();
  } else {
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// Handle drawer nav links
document.querySelectorAll('.drawer-item[href]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const section = link.getAttribute('href').replace('#', '');
    const navBtn = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navBtn) navTo(navBtn, section);
    // Update drawer active
    document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
    link.classList.add('active');
  });
});

/* ============================================================
   THEME TOGGLE
   ============================================================ */
function toggleTheme() {
  document.documentElement.classList.toggle('dark-override');
  closeDrawer();
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  // Show overview section by default
  const overview = document.getElementById('overview');
  if (overview) overview.classList.add('active');

  // Populate device info
  document.getElementById('device-name').textContent  = DEVICE.name;
  document.getElementById('device-model').textContent = DEVICE.model;
  document.getElementById('chip-cpu').textContent     = DEVICE.chipset;
  document.getElementById('chip-ram').textContent     = `${DEVICE.totalRam} GB RAM`;
  document.getElementById('chip-stor').textContent    = `${DEVICE.totalStorage} GB`;

  // Initial render
  updateMetrics();
  updateGauges();
  renderResourceList();
  renderProcessList();
  renderCores();
  updateNetworkUI();
  updateClock();

  // Live tick every 2.5s
  setInterval(simulateTick, 2500);

  // Clock every 30s
  setInterval(updateClock, 30000);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
