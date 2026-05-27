/**
 * SysMonitor — Device Data Configuration
 * Simulates real Android system data.
 * Replace these with actual Android WebView bridge calls
 * (window.Android.getCpuUsage(), etc.) in a real APK.
 */

const DEVICE = {
  name: 'Pixel 9 Pro',
  model: 'Android 15 · Tensor G4 · Build UPB5.241205.006',
  chipset: 'Tensor G4',
  totalRam: 12,       // GB
  totalStorage: 256,  // GB
  usedStorage: 148,   // GB
  batteryCapacity: 4700, // mAh
  cores: 9,
  cpuModel: 'Tensor G4',
  gpuModel: 'Mali-G715 MC7',
  display: { hz: 120, res: '2992×1344', nits: 1600 },
  bluetooth: { version: '5.3', paired: 3 },
  android: '15.0',
};

const INITIAL_STATE = {
  cpu: 62,        // %
  ram: 74,        // %
  gpu: 41,        // %
  storage: 58,    // %
  battery: 84,    // %
  cpuTemp: 38,    // °C
  procCount: 148,
  uptime: { h: 3, m: 42 },
  network: {
    ssid: 'HomeNetwork_5G',
    ip: '192.168.1.42',
    type: 'WiFi 6',
    signal: -52,
    dl: 42.8,
    ul: 18.3,
    latency: 12,
    dataUsed: 3.2, // GB
  },
  processes: [
    { name: 'com.android.chrome',              cpu: 18.4, color: '#4285F4' },
    { name: 'com.google.android.gms',          cpu: 12.1, color: '#006874' },
    { name: 'com.google.android.apps.maps',    cpu: 8.7,  color: '#0F9D58' },
    { name: 'com.spotify.music',               cpu: 5.3,  color: '#1DB954' },
    { name: 'android.process.media',           cpu: 3.9,  color: '#FF6D00' },
    { name: 'system_server',                   cpu: 3.2,  color: '#9C27B0' },
    { name: 'com.google.android.youtube',      cpu: 2.8,  color: '#FF0000' },
    { name: 'com.android.systemui',            cpu: 1.6,  color: '#0288D1' },
  ],
  cores: [74, 58, 81, 43, 65, 52, 38, 71, 60],
};

// Network throughput history (last 12 ticks)
const NETWORK_HISTORY = {
  dl: [28, 35, 42, 38, 55, 47, 43, 61, 50, 44, 48, 42.8],
  ul: [12, 18, 15, 22, 19, 16, 20, 17, 14, 21, 18, 18.3],
  labels: Array.from({ length: 12 }, (_, i) => `${i * 5}s`),
};
