/**
 * SysMonitor — Application Logic
 * Uses real Web APIs via DeviceData, with clear N/A labels where unavailable.
 */

/* ─── State ─────────────────────────────────────────────── */
let uptimeStart = Date.now();
let netChart = null;
let activeSection = 'overview';
let storageInfo = null;

// Rolling network history (use real downlink when available)
const netHistory = {
  dl: Array(12).fill(0),
  ul: Array(12).fill(0),
  labels: Array.from({ length: 12 }, (_, i) => `-${(11 - i) * 5}s`),
};

/* ─── Helpers ───────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

function setText(id, val, fallback = 'N/A') {
  const el = $(id);
  if (el) el.textContent = (val !== null && val !== undefined) ? val : fallback;
}

function setWidth(id, pct) {
  const el = $(id);
  if (el) el.style.width = Math.round(pct) + '%';
}

function progressClass(pct) {
  if (pct === null) return '';
  if (pct >= 85) return 'crit';
  if (pct >= 65) return 'warn';
  return '';
}

function gaugeOffset(pct, r = 32) {
  const circ = 2 * Math.PI * r;
  return (circ * (1 - (pct || 0) / 100)).toFixed(1);
}

function formatUptime() {
  const s = Math.floor((Date.now() - uptimeStart) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/* ─── Clock ─────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  setText('status-time', `${h}:${m}`);
}

/* ─── Hero / Device Info ────────────────────────────────── */
function renderDeviceInfo() {
  const platform = DeviceData.getPlatform();
  const deviceName = DeviceData.getDeviceName();
  const cores = DeviceData.getCoreCount();
  const memGB = DeviceData.getDeviceMemoryGB();

  setText('device-name', deviceName);

  // Build model line
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  setText('device-model', `${platform.os} ${platform.version} · ${navigator.language} · ${screen.width}×${screen.height}`);

  // Chips
  setText('chip-cpu', cores ? `${cores} cores` : 'CPU');
  setText('chip-ram', memGB ? `${memGB} GB RAM` : 'RAM');
  setText('chip-stor', 'Storage');

  // Android version chip
  const androidChip = $('chip-android');
  if (androidChip) {
    androidChip.textContent = isAndroid
      ? `Android ${platform.version}`
      : platform.os;
  }
}

/* ─── Battery ───────────────────────────────────────────── */
function updateBattery() {
  const pct  = DeviceData.getBatteryLevel();
  const charging = DeviceData.isCharging();
  const timeStr  = DeviceData.getBatteryTimeLeft();

  setText('bat-pct', pct !== null ? `${pct}%` : 'N/A');
  setText('bat-time', timeStr || (pct !== null ? `${pct}% charged` : 'Battery API unavailable'));

  // Update resource bar
  updateResourceBar('bat', pct, false);

  // Gauge
  updateGauge('bat-ring', 'bat-gauge-text', pct, '#AD1457');

  // Battery icon in status bar
  const batIcon = $('bat-status-icon');
  if (batIcon && pct !== null) {
    if (charging) batIcon.className = 'ti ti-battery-charging';
    else if (pct > 80) batIcon.className = 'ti ti-battery-4';
    else if (pct > 50) batIcon.className = 'ti ti-battery-3';
    else if (pct > 20) batIcon.className = 'ti ti-battery-2';
    else batIcon.className = 'ti ti-battery-1';
  }

  // Metric card charging label
  const chargingEl = $('charging-status');
  if (chargingEl) {
    if (charging === null) chargingEl.textContent = '';
    else chargingEl.textContent = charging ? '⚡ Charging' : 'On battery';
  }
}

/* ─── Memory ────────────────────────────────────────────── */
function updateMemory() {
  const totalGB = DeviceData.getDeviceMemoryGB();
  const usedMB  = DeviceData.getUsedMemoryMB();
  const pct     = DeviceData.getMemoryPct();

  // RAM gauge & bar
  updateGauge('ram-ring', 'ram-gauge-text', pct, '#2E7D32');
  updateResourceBar('ram', pct, false);

  // Resource row label
  const ramLabel = $('ram-label');
  if (ramLabel) {
    if (usedMB !== null && totalGB) {
      ramLabel.textContent = `RAM · ${(usedMB / 1024).toFixed(1)} GB used · ${totalGB} GB device`;
    } else if (totalGB) {
      ramLabel.textContent = `RAM · ${totalGB} GB device memory`;
    } else {
      ramLabel.textContent = `RAM · deviceMemory API unavailable`;
    }
  }

  // Metric card
  setText('ram-metric', pct !== null ? `${pct}%` : (totalGB ? `${totalGB} GB` : 'N/A'));
  setText('ram-sub', usedMB !== null ? `${usedMB} MB JS heap used` : (totalGB ? `${totalGB} GB reported` : 'Limited in this browser'));
}

/* ─── Network ───────────────────────────────────────────── */
function updateNetwork() {
  const online   = DeviceData.isOnline();
  const type     = DeviceData.getConnectionType();
  const dl       = DeviceData.getDownlinkMbps();
  const rtt      = DeviceData.getRttMs();
  const saveData = DeviceData.isSaveData();

  setText('net-online', online ? 'Online' : 'Offline');
  setText('net-type', type ? type.toUpperCase() : (online ? 'Connected' : 'Offline'));
  setText('net-dl', dl !== null ? `↓ ${dl.toFixed(1)}` : '↓ --');
  setText('net-ul', '--');  // Upload speed not exposed by browser APIs
  setText('net-lat', rtt !== null ? `${rtt} ms` : '--');
  setText('net-save', saveData ? 'On' : 'Off');

  // Network connection type in detail
  const conn = DeviceData.connection;
  let detail = online ? 'Connected' : 'No connection';
  if (conn) {
    const parts = [];
    if (conn.type && conn.type !== 'unknown') parts.push(conn.type);
    if (conn.effectiveType) parts.push(conn.effectiveType);
    if (conn.downlink) parts.push(`${conn.downlink} Mbps`);
    if (parts.length) detail = parts.join(' · ');
  }
  setText('net-detail', detail);

  // SSID — browsers cannot read WiFi SSID (OS restriction)
  setText('net-ssid', 'Network');

  // Connection badge
  const badge = $('net-badge');
  if (badge) {
    badge.textContent = online ? 'Online' : 'Offline';
    badge.className   = `status-badge ${online ? 'connected' : 'disconnected'}`;
  }

  // Network chart history
  if (dl !== null) {
    netHistory.dl.shift(); netHistory.dl.push(parseFloat(dl.toFixed(1)));
  }
  // Upload not available from browser — pad with zero
  netHistory.ul.shift(); netHistory.ul.push(0);

  updateNetworkChart();
}

/* ─── CPU (limited) ─────────────────────────────────────── */
function updateCpu() {
  const cores = DeviceData.getCoreCount();

  // Browser cannot give CPU %, show core count only
  setText('cpu-metric', cores ? `${cores}` : 'N/A');
  setText('cpu-sub', cores ? `logical cores` : 'hardwareConcurrency N/A');

  // Gauge — cannot show real %, show indeterminate style
  const cpuGaugeText = $('cpu-gauge-text');
  if (cpuGaugeText) cpuGaugeText.textContent = cores ? `${cores}c` : 'N/A';

  // Resource row
  const cpuLabel = $('cpu-label');
  if (cpuLabel) cpuLabel.textContent = cores
    ? `CPU · ${cores} logical cores · usage unavailable in browser`
    : 'CPU · hardwareConcurrency unavailable';

  // Show a static shimmer bar so it's clearly labelled
  const bar = $('bar-cpu');
  if (bar) {
    bar.style.width = '0%';
    bar.style.background = 'var(--md-outline-variant)';
  }
  const pctEl = $('pct-cpu');
  if (pctEl) pctEl.textContent = 'N/A';
}

/* ─── Storage ───────────────────────────────────────────── */
async function updateStorage() {
  storageInfo = await DeviceData.getStorageEstimate();

  const storLabel = $('stor-label');
  if (storLabel) {
    if (storageInfo) {
      storLabel.textContent = `Storage · ${storageInfo.used} GB used · ${storageInfo.total} GB quota`;
    } else {
      storLabel.textContent = 'Storage · StorageManager API unavailable';
    }
  }

  const pct = storageInfo?.pct ?? null;
  updateResourceBar('stor', pct, false);
  const storPct = $('pct-stor');
  if (storPct) storPct.textContent = pct !== null ? `${pct}%` : 'N/A';
}

/* ─── Display & Platform ────────────────────────────────── */
function updateDisplaySensors() {
  const res = DeviceData.getLogicalRes();
  const physRes = DeviceData.getScreenRes();
  const dpr = DeviceData.getPixelRatio();
  const depth = DeviceData.getColorDepth();

  setText('display-res', `${physRes}`);
  setText('display-dpr', `${dpr}x DPR`);
  setText('display-depth', depth ? `${depth}-bit color` : '');

  // Screen orientation
  const orient = screen.orientation?.type || 'unknown';
  setText('display-orient', orient.replace('-primary', '').replace('-secondary', ''));

  // Touch support
  const touch = navigator.maxTouchPoints > 0;
  setText('touch-points', touch ? `${navigator.maxTouchPoints} touch points` : 'No touch');

  // Language & time zone
  setText('device-lang', navigator.language || 'N/A');
  setText('device-tz', Intl.DateTimeFormat().resolvedOptions().timeZone || 'N/A');

  // Cores card
  renderCoresCard();
}

/* ─── Cores Card ────────────────────────────────────────── */
function renderCoresCard() {
  const container = $('cores-card');
  if (!container) return;
  const cores = DeviceData.getCoreCount() || 4;

  container.innerHTML = Array.from({ length: cores }, (_, i) => `
    <div class="core-item">
      <div class="core-bar-wrap">
        <div class="core-bar-fill" id="core-bar-${i}" style="height:0%"></div>
      </div>
      <div class="core-label">C${i}</div>
      <div class="core-val" id="core-val-${i}">N/A</div>
    </div>`).join('');
}

/* ─── Resource Bar helper ───────────────────────────────── */
function updateResourceBar(id, pct, animate = true) {
  const bar = $(`bar-${id}`);
  const txt = $(`pct-${id}`);
  if (bar) {
    bar.style.width = pct !== null ? Math.round(pct) + '%' : '0%';
    bar.className   = `progress-fill ${progressClass(pct)}`;
    if (pct === null) bar.style.background = 'var(--md-outline-variant)';
  }
  if (txt) txt.textContent = pct !== null ? `${Math.round(pct)}%` : 'N/A';
}

/* ─── Gauge helper ──────────────────────────────────────── */
function updateGauge(ringId, textId, pct, color) {
  const ring = $(ringId);
  const txt  = $(textId);
  if (ring) {
    if (pct !== null) {
      ring.style.strokeDashoffset = gaugeOffset(pct);
      ring.style.stroke = color;
    } else {
      ring.style.strokeDashoffset = gaugeOffset(0);
      ring.style.stroke = 'var(--md-outline-variant)';
    }
  }
  if (txt) txt.textContent = pct !== null ? `${Math.round(pct)}%` : 'N/A';
}

/* ─── Network Chart ─────────────────────────────────────── */
function initNetworkChart() {
  const canvas = $('netChart');
  if (!canvas || netChart) return;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
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
          borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4,
        },
        {
          label: 'Upload (unavailable)',
          data: netHistory.ul,
          borderColor: '#E65100',
          backgroundColor: 'rgba(0,0,0,0)',
          borderWidth: 1, pointRadius: 0, fill: false, tension: 0.4,
          borderDash: [4, 3],
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.datasetIndex === 0
              ? `Download: ${ctx.parsed.y.toFixed(1)} Mbps`
              : `Upload: not available in browser`,
          },
        },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 10 }, maxTicksLimit: 6 } },
        y: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 10 }, callback: v => v + 'M' }, min: 0 },
      },
    },
  });
}

function updateNetworkChart() {
  if (!netChart) return;
  netChart.data.datasets[0].data = [...netHistory.dl];
  netChart.data.datasets[1].data = [...netHistory.ul];
  netChart.update('none');
}

/* ─── Uptime & Metrics ──────────────────────────────────── */
function updateMiscMetrics() {
  setText('uptime-val', formatUptime());
  // Page performance
  if (performance.memory) {
    const mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
    setText('perf-mem', `${mb} MB`);
  }
}

/* ─── Battery event listeners ───────────────────────────── */
function attachBatteryListeners() {
  if (!DeviceData.battery) return;
  DeviceData.battery.addEventListener('levelchange',  updateBattery);
  DeviceData.battery.addEventListener('chargingchange', updateBattery);
  DeviceData.battery.addEventListener('chargingtimechange', updateBattery);
  DeviceData.battery.addEventListener('dischargingtimechange', updateBattery);
}

/* ─── Network event listeners ───────────────────────────── */
function attachNetworkListeners() {
  window.addEventListener('online',  updateNetwork);
  window.addEventListener('offline', updateNetwork);
  if (DeviceData.connection) {
    DeviceData.connection.addEventListener('change', updateNetwork);
  }
}

/* ─── Navigation ────────────────────────────────────────── */
function navTo(btn, section) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.scroll-area section').forEach(el => el.classList.remove('active'));
  const target = $(section);
  if (target) target.classList.add('active');
  activeSection = section;
  if (section === 'network') setTimeout(initNetworkChart, 50);
  closeDrawer();
  $('main-content').scrollTop = 0;
}

function toggleDrawer() {
  const d = $('drawer'), o = $('drawer-overlay');
  const open = d.classList.contains('open');
  if (open) closeDrawer();
  else { d.classList.add('open'); o.classList.add('open'); }
}

function closeDrawer() {
  $('drawer')?.classList.remove('open');
  $('drawer-overlay')?.classList.remove('open');
}

document.querySelectorAll('.drawer-item[href]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const section = link.getAttribute('href').replace('#', '');
    const navBtn = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navBtn) navTo(navBtn, section);
    document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
    link.classList.add('active');
  });
});

/* ─── FAB Refresh ───────────────────────────────────────── */
function refresh() {
  const fab = document.querySelector('.fab');
  fab.classList.add('spinning');
  setTimeout(() => fab.classList.remove('spinning'), 600);
  updateBattery();
  updateMemory();
  updateNetwork();
  updateCpu();
  updateStorage();
  updateMiscMetrics();
}

/* ─── Live tick ─────────────────────────────────────────── */
function tick() {
  updateBattery();
  updateMemory();
  updateNetwork();
  updateMiscMetrics();
  updateClock();
}

/* ─── INIT ──────────────────────────────────────────────── */
async function init() {
  // Boot DeviceData
  await DeviceData.init();

  // Show overview
  $('overview')?.classList.add('active');

  // One-time renders
  renderDeviceInfo();
  updateDisplaySensors();
  await updateStorage();

  // Live data
  updateBattery();
  updateMemory();
  updateNetwork();
  updateCpu();
  updateMiscMetrics();
  updateClock();

  // Event listeners for real-time battery/network changes
  attachBatteryListeners();
  attachNetworkListeners();

  // Polling tick every 5s (battery/memory/network)
  setInterval(tick, 5000);

  // Clock every 30s
  setInterval(updateClock, 30000);

  // Uptime every second
  setInterval(() => setText('uptime-val', formatUptime()), 1000);
}

document.addEventListener('DOMContentLoaded', init);
