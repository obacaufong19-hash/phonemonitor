/**
 * SysMonitor — Real Device Data via Web APIs
 *
 * APIs used:
 *  - Battery Status API       (navigator.getBattery)
 *  - Network Information API  (navigator.connection)
 *  - Device Memory API        (navigator.deviceMemory)
 *  - Hardware Concurrency     (navigator.hardwareConcurrency)
 *  - User Agent / Platform    (navigator.userAgent)
 *  - Performance Memory       (performance.memory — Chrome only)
 *  - Online/Offline events    (navigator.onLine)
 *  - Page Visibility API      (document.visibilityState)
 *  - Screen API               (screen.width/height, colorDepth)
 *  - Geolocation API          (navigator.geolocation — optional)
 *
 * What browsers CANNOT expose (OS security boundary):
 *  - Per-core CPU usage %
 *  - GPU utilization %
 *  - Running process list
 *  - CPU temperature
 *  - Individual RAM app breakdown
 *
 * For those we show "N/A" or a clearly-labelled estimate.
 */

const DeviceData = {
  battery: null,       // BatteryManager object
  connection: null,    // NetworkInformation object

  /** Call once at startup */
  async init() {
    // Battery API
    if ('getBattery' in navigator) {
      try {
        this.battery = await navigator.getBattery();
      } catch (e) { console.warn('Battery API unavailable', e); }
    }
    // Network API
    this.connection = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection
      || null;
  },

  /* ── BATTERY ─────────────────────────────────── */
  getBatteryLevel() {
    if (this.battery) return Math.round(this.battery.level * 100);
    return null;
  },
  isCharging() {
    if (this.battery) return this.battery.charging;
    return null;
  },
  getBatteryTimeLeft() {
    if (!this.battery) return null;
    if (this.battery.charging) {
      const t = this.battery.chargingTime;
      if (t === Infinity || isNaN(t)) return 'Calculating…';
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      return h > 0 ? `~${h}h ${m}m to full` : `~${m}m to full`;
    } else {
      const t = this.battery.dischargingTime;
      if (t === Infinity || isNaN(t)) return 'Calculating…';
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      return h > 0 ? `~${h}h ${m}m left` : `~${m}m left`;
    }
  },

  /* ── MEMORY ──────────────────────────────────── */
  getDeviceMemoryGB() {
    // navigator.deviceMemory returns nearest power-of-2 bucket (1,2,4,8,16...)
    return navigator.deviceMemory || null;
  },
  getUsedMemoryMB() {
    // Only available in Chrome with --enable-precise-memory-info or normally
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1048576);
    }
    return null;
  },
  getTotalMemoryMB() {
    if (performance.memory) {
      return Math.round(performance.memory.jsHeapSizeLimit / 1048576);
    }
    return null;
  },
  getMemoryPct() {
    if (performance.memory) {
      const pct = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
      return Math.round(pct);
    }
    return null;
  },

  /* ── CPU ─────────────────────────────────────── */
  getCoreCount() {
    return navigator.hardwareConcurrency || null;
  },

  /* ── NETWORK ─────────────────────────────────── */
  getConnectionType() {
    if (!this.connection) return null;
    return this.connection.effectiveType || this.connection.type || null;
  },
  getDownlinkMbps() {
    if (this.connection && this.connection.downlink != null) {
      return this.connection.downlink; // already in Mbps
    }
    return null;
  },
  getRttMs() {
    if (this.connection && this.connection.rtt != null) {
      return this.connection.rtt;
    }
    return null;
  },
  isSaveData() {
    return this.connection?.saveData || false;
  },
  isOnline() {
    return navigator.onLine;
  },

  /* ── DISPLAY ─────────────────────────────────── */
  getScreenRes() {
    return `${screen.width * (window.devicePixelRatio || 1) | 0}×${screen.height * (window.devicePixelRatio || 1) | 0}`;
  },
  getLogicalRes() {
    return `${screen.width}×${screen.height}`;
  },
  getPixelRatio() {
    return window.devicePixelRatio || 1;
  },
  getColorDepth() {
    return screen.colorDepth || null;
  },

  /* ── PLATFORM ────────────────────────────────── */
  getPlatform() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) {
      const m = ua.match(/Android ([\d.]+)/);
      return { os: 'Android', version: m ? m[1] : '?', icon: 'ti-brand-android' };
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return { os: 'iOS', version: '', icon: 'ti-brand-apple' };
    }
    if (/Windows/i.test(ua)) return { os: 'Windows', version: '', icon: 'ti-brand-windows' };
    if (/Mac/i.test(ua)) return { os: 'macOS', version: '', icon: 'ti-brand-apple' };
    if (/Linux/i.test(ua)) return { os: 'Linux', version: '', icon: 'ti-brand-ubuntu' };
    return { os: 'Unknown', version: '', icon: 'ti-device-desktop' };
  },
  getDeviceName() {
    const ua = navigator.userAgent;
    // Try to extract Android device model
    const m = ua.match(/\(Linux;.*?;\s*([^)]+)\)/);
    if (m) {
      const parts = m[1].split(';');
      const model = parts[parts.length - 1].trim();
      if (model && model !== 'wv') return model;
    }
    const p = this.getPlatform();
    return `${p.os} ${p.version}`.trim() || 'This Device';
  },
  getStorageEstimate: async function() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return {
          used: Math.round(est.usage / (1024 ** 3) * 100) / 100,   // GB
          total: Math.round(est.quota / (1024 ** 3) * 100) / 100,  // GB
          pct: Math.round((est.usage / est.quota) * 100),
        };
      } catch (e) { return null; }
    }
    return null;
  },
};
