# 📱 SysMonitor — Material You

A beautiful Android-first system information and resource monitor built entirely with **Material Design 3 (Material You)** principles.

Live demo → **[your-username.github.io/system-monitor](https://your-username.github.io/system-monitor)**

![SysMonitor Preview](https://img.shields.io/badge/Material%20You-Design%203-006874?style=for-the-badge&logo=android&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-4CAF50?style=for-the-badge&logo=github)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

- **Material You design system** — M3 color tokens, dynamic theming, tonal surfaces
- **5 navigation sections** — Overview, Resources, Network, Processes, Sensors
- **Live animated gauges** — Arc rings for CPU, RAM, GPU utilization
- **Resource allocation bars** — Color-coded progress for all subsystems
- **Network throughput chart** — Sparkline history using Chart.js
- **Process list** — Top processes by CPU usage with live simulation
- **CPU core breakdown** — Per-core vertical bar visualization
- **Navigation drawer** — Slide-in side drawer + bottom navigation bar
- **Dark mode** — Full M3 dark palette, auto-detected from system preference
- **Responsive & mobile-first** — Designed for 360–480px viewport (Android phones)
- **No build tools required** — Pure HTML, CSS, and vanilla JavaScript

---

## 🗂️ Project Structure

```
system-monitor/
├── index.html          # App shell + markup
├── css/
│   └── style.css       # Material You design tokens + all components
├── js/
│   ├── data.js         # Device config + initial state
│   └── app.js          # Rendering, live simulation, Chart.js, navigation
└── README.md
```

---

## 🚀 Deploy to GitHub Pages (3 steps)

### 1. Create a new repository

Go to [github.com/new](https://github.com/new) and create a public repository named `system-monitor` (or any name you prefer).

### 2. Push the code

```bash
cd system-monitor
git init
git add .
git commit -m "Initial commit — SysMonitor Material You"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/system-monitor.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select `Deploy from a branch`
3. Choose `main` branch, `/ (root)` folder
4. Click **Save**

Your app will be live at:
```
https://YOUR_USERNAME.github.io/system-monitor
```

It may take 1–2 minutes for the first deployment.

---

## 📐 Design System

This project follows Material Design 3 tokens:

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#006874` | `#4DD8E8` |
| Primary Container | `#97F0FF` | `#004F58` |
| Surface | `#FAFDFD` | `#191C1D` |
| Surface Variant | `#DBE4E6` | `#3F484A` |
| Outline | `#6F797A` | `#899294` |

---

## 🔌 Connecting to Real Android Data

The simulation in `js/data.js` and `js/app.js` uses mock values. To connect to a real Android device via WebView bridge:

```javascript
// In a real Android WebView app (Kotlin side):
// webView.addJavascriptInterface(SystemBridge(), "Android")

// Then in data.js, replace mock values:
const cpu = window.Android?.getCpuUsage() ?? state.cpu;
const ram = window.Android?.getRamUsage() ?? state.ram;
```

This app is designed as the front-end layer of an Android WebView APK.

---

## 🛠️ Local Development

No build step needed. Just open `index.html` in a browser, or serve with:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open [localhost:8080](http://localhost:8080).

---

## 📄 License

MIT © 2025 — Free to use, modify, and distribute.
