window.onload = () => {
const CONFIG = {wsUrl: `ws://${window.location.hostname}:9001`,maxDataPoints: 40, mainChartPoints: 60 };
const SENSOR_META = {temperature: { icon: '🌡️', name: 'Température', min: 10, max: 60, unit: '°C', color: '#ef4444' }, humidite: { icon: '💧', name: 'Humidité', min: 0, max: 100, unit: '%', color: '#3b82f6' }, vibration: { icon: '〰️', name: 'Vibration', min: 0, max: 15, unit: 'mm/s', color: '#8b5cf6' }, courant: { icon: '⚡', name: 'Courant', min: 0, max: 200, unit: 'A', color: '#eab308' }, vitesse: { icon: '💨', name: 'Vitesse', min: 0, max: 5, unit: 'm/s', color: '#10b981' }, luminosite: { icon: '💡', name: 'Luminosité', min: 0, max: 1500, unit: 'lx', color: '#f59e0b' }, pression: { icon: '🔵', name: 'Pression', min: 0, max: 300, unit: 'bar', color: '#6366f1' }, puissance: { icon: '🔋', name: 'Puissance', min: 0, max: 100, unit: 'kW', color: '#14b8a6' }, debit: { icon: '🌊', name: 'Débit', min: 0, max: 100, unit: 'L/min', color: '#0ea5e9' }, niveau_sonore: { icon: '🔊', name: 'Niveau sonore', min: 0, max: 120, unit: 'dB', color: '#a855f7' } };
const ZONES = { salle_serveur: 'Salle Serveur', atelier: 'Atelier Principal', local_elec: 'Local Électrique' };

const ZONE_3D_CONFIG = {
    salle_serveur: { color: 0x3b82f6, cx: -10, cz: -6, w: 12, d: 10, label: 'Salle Serveur' },
    atelier:       { color: 0x8b5cf6, cx:   6, cz: -4, w: 16, d: 14, label: 'Atelier Principal' },
    local_elec:    { color: 0xf59e0b, cx: -10, cz:  8, w: 12, d:  8, label: 'Local Électrique' },
};

const _3dState = {
    scene: null, camera: null, renderer: null, controls: null,
    machineMeshes: new Map(),
    zonePads: {},
    labelDivs: [],
    raycaster: null,
    mouse: { x: 0, y: 0 },
    hoveredMachine: null,
    animFrame: null,
    resizeObs: null,
    _fans: [],
    _warningLights: [],
};

const appState = {filterZone: 'all', currentTheme: localStorage.getItem('iot_theme_color') || 'blue', currentPage: 'dashboard', _sessionStart: Date.now(), _reconnectCount: 0, sensors: new Map(), kpis: { pointsThisSec: 0, trafficCurrent: 0, alertsTotal: 0 }, mainChart: null, globalHistory: Array(CONFIG.mainChartPoints).fill(0), energyKWh: 0, co2Kg: 0, _zoneTemps: {}, _anomalyAlerts: 0};

const els = {
    grid: document.getElementById('sensors-grid'),
    sensorCount: document.getElementById('sensor-count-label'),
    kpiSensors: document.getElementById('kpi-sensors'),
    kpiPoints: document.getElementById('kpi-points'),
    kpiAlerts: document.getElementById('kpi-alerts'),
    clockTime: document.getElementById('clock-time'),
    clockDate: document.getElementById('clock-date'),
    mqttDot: document.getElementById('mqtt-dot'),
    mqttPing: document.getElementById('mqtt-ping'),
    mqttStatus: document.getElementById('mqtt-status'),
    themeToggle: document.getElementById('theme-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    soundOffIcon: document.getElementById('sound-off-icon'),
    soundOnIcon: document.getElementById('sound-on-icon'),
    navBtns: document.querySelectorAll('.nav-btn'),
    eventList: document.getElementById('event-list'),
    logEmpty: document.getElementById('log-empty'),
    searchInput: document.getElementById('sensor-search'),
    exportBtn: document.getElementById('export-csv'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    saveSettings: document.getElementById('save-settings'),
    resetSettings: document.getElementById('reset-settings'),
    settingsModal: document.getElementById('settings-modal'),
    thresholdsList: document.getElementById('thresholds-list')
};

if (!els.grid) return;

// ── Theme system ──────────────────────────────────────────────
const THEMES = {
    blue:    {name:'Azure',    emoji:'🌊', c50:'#eff6ff', c400:'#60a5fa', c500:'#3b82f6', c600:'#2563eb', rgb:'59,130,246'},
    emerald: {name:'Émeraude', emoji:'🌿', c50:'#ecfdf5', c400:'#34d399', c500:'#10b981', c600:'#059669', rgb:'16,185,129'},
    violet:  {name:'Violet',   emoji:'🔮', c50:'#f5f3ff', c400:'#a78bfa', c500:'#8b5cf6', c600:'#7c3aed', rgb:'139,92,246'},
    rose:    {name:'Rouge',    emoji:'🌹', c50:'#fff1f2', c400:'#fb7185', c500:'#f43f5e', c600:'#e11d48', rgb:'244,63,94'},
    amber:   {name:'Ambre',   emoji:'🔶', c50:'#fffbeb', c400:'#fbbf24', c500:'#f59e0b', c600:'#d97706', rgb:'245,158,11'},
    cyan:    {name:'Cyan',     emoji:'💠', c50:'#ecfeff', c400:'#22d3ee', c500:'#06b6d4', c600:'#0891b2', rgb:'6,182,212'},
};

function getAccent() { return THEMES[appState.currentTheme] || THEMES.blue; }

function applyTheme(key) {
    const t = THEMES[key] || THEMES.blue;
    appState.currentTheme = key;
    localStorage.setItem('iot_theme_color', key);
    const isDark = document.documentElement.classList.contains('dark');
    const navBg   = isDark ? `rgba(${t.rgb},0.12)` : t.c50;
    const navText = isDark ? t.c400 : t.c600;
    document.getElementById('theme-style').textContent = `
        .nav-btn.active{background-color:${navBg}!important;color:${navText}!important;box-shadow:inset 0 0 12px rgba(${t.rgb},.08),0 0 0 1px rgba(${t.rgb},.2)!important;}
        .accent-logo-gradient{background:linear-gradient(to right,rgba(${t.rgb},.12),transparent)!important;}
        .accent-live-ping{background-color:${t.c400}!important;}
        .accent-live-dot{background-color:${t.c500}!important;}
        .accent-live-text{color:${isDark?t.c400:t.c600}!important;}
        #sensor-count-label{color:${t.c500}!important;}
        #save-settings{background-color:${t.c500}!important;}#save-settings:hover{background-color:${t.c600}!important;}
        .theme-preview-active-card{background-color:rgba(${t.rgb},.08)!important;border-color:rgba(${t.rgb},.25)!important;}
        .theme-preview-text-accent{color:${isDark?t.c400:t.c500}!important;}
        .theme-preview-badge{background-color:rgba(${t.rgb},.15)!important;color:${isDark?t.c400:t.c600}!important;}
        .theme-preview-btn{background-color:${t.c500}!important;color:#fff!important;}
        .theme-preview-outline-btn{border-color:${t.c500}!important;color:${isDark?t.c400:t.c500}!important;}
        .theme-card[data-theme="${key}"]{border-color:${t.c500}!important;box-shadow:0 0 0 3px rgba(${t.rgb},.2)!important;}
    `;
    updateChartsTheme();
    renderThemeCards();
    updateModeBtns();
}

function renderThemeCards() {
    const container = document.getElementById('theme-cards-container');
    if (!container) return;
    const current = appState.currentTheme;
    container.innerHTML = Object.entries(THEMES).map(([key, t]) => {
        const isActive = current === key;
        return `<button class="theme-card flex items-center gap-3 p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${isActive ? '' : 'border-gray-200 dark:border-dark-border'}" data-theme="${key}">
            <div class="w-10 h-10 rounded-xl flex-shrink-0 shadow-sm" style="background:linear-gradient(135deg,${t.c400},${t.c600})"></div>
            <div class="text-left min-w-0 flex-1">
                <p class="text-sm font-bold text-gray-900 dark:text-white">${t.emoji} ${t.name}</p>
                <p class="text-xs text-gray-400 font-mono">${t.c500}</p>
            </div>
            ${isActive ? `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="${t.c500}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>` : ''}
        </button>`;
    }).join('');
    container.querySelectorAll('.theme-card').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

function showPage(page) {
    const pageIds = ['page-dashboard','page-appearance','page-3d','page-maintenance','page-carte','page-compare','page-alerts'];
    pageIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.classList.remove('page-enter'); }
    });
    // Nav active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const bp = btn.dataset.page, bz = btn.dataset.zone;
        if (bp) btn.classList.toggle('active', bp === page);
        else if (bz !== undefined) btn.classList.toggle('active', page === 'dashboard' && (bz === appState.filterZone || (bz === 'all' && appState.filterZone === 'all')));
    });
    const target = document.getElementById('page-' + page);
    if (target) {
        target.classList.remove('hidden');
        void target.offsetWidth;
        target.classList.add('page-enter');
    }
    appState.currentPage = page;
    if (page === 'appearance')  { renderThemeCards(); updateModeBtns(); }
    if (page === '3d')          { requestAnimationFrame(() => requestAnimationFrame(init3DView)); }
    if (page === 'maintenance') { requestAnimationFrame(renderMaintenancePage); }
    if (page === 'carte')       { requestAnimationFrame(renderCartePage); }
    if (page === 'compare')     { requestAnimationFrame(renderCompareSelectorPage); }
    if (page === 'alerts')      { requestAnimationFrame(renderAlertsPage); }
    if (page !== '3d')          { stopRender3D(); }
}

function updateModeBtns() {
    const savedMode = localStorage.theme;
    const activeMode = savedMode === 'dark' ? 'dark' : savedMode === 'light' ? 'light' : 'system';
    const t = getAccent();
    document.querySelectorAll('.mode-btn').forEach(btn => {
        const isActive = btn.dataset.mode === activeMode;
        btn.style.borderColor  = isActive ? t.c500 : '';
        btn.style.boxShadow    = isActive ? `0 0 0 3px rgba(${t.rgb},.2)` : '';
    });
}

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {document.documentElement.classList.add('dark');}
els.themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(appState.currentTheme);
});

// ── Sound alerts ──────────────────────────────────────────────
let soundEnabled = false;
let audioCtx = null;

function playAlert(freq = 880, duration = 120) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration / 1000);
    } catch(e) {}
}

els.soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    els.soundOffIcon.classList.toggle('hidden', soundEnabled);
    els.soundOnIcon.classList.toggle('hidden', !soundEnabled);
    els.soundToggle.classList.toggle('text-brand-500', soundEnabled);
    els.soundToggle.title = soundEnabled ? 'Désactiver les alertes sonores' : 'Activer les alertes sonores';
    if (soundEnabled) playAlert(660, 80); // confirm beep
});

// ── Threshold management ──────────────────────────────────────
const DEFAULT_THRESHOLDS = {};
Object.entries(SENSOR_META).forEach(([type, m]) => {
    DEFAULT_THRESHOLDS[type] = { warn: 0.75, crit: 0.9, min: m.min, max: m.max };
});

function getThresholds() {
    try { return Object.assign({}, DEFAULT_THRESHOLDS, JSON.parse(localStorage.getItem('iot_thresholds') || '{}')); }
    catch { return { ...DEFAULT_THRESHOLDS }; }
}
function saveThresholds(data) {
    localStorage.setItem('iot_thresholds', JSON.stringify(data));
}

function renderThresholdsModal() {
    const thresholds = getThresholds();
    els.thresholdsList.innerHTML = Object.entries(SENSOR_META).map(([type, m]) => {
        const t = thresholds[type] || DEFAULT_THRESHOLDS[type];
        return `<div class="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-border">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0">${m.icon}</div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 dark:text-white">${m.name}</p>
                <p class="text-xs text-gray-400">${m.unit ? m.unit : ''} &bull; min ${m.min} &bull; max ${m.max}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <label class="text-xs font-bold text-amber-500 uppercase tracking-wider">Warn</label>
                <input type="number" step="0.01" min="0" max="1" value="${t.warn}" data-type="${type}" data-level="warn"
                    class="w-16 px-2 py-1 text-xs text-center rounded-lg bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <label class="text-xs font-bold text-rose-500 uppercase tracking-wider">Crit</label>
                <input type="number" step="0.01" min="0" max="1" value="${t.crit}" data-type="${type}" data-level="crit"
                    class="w-16 px-2 py-1 text-xs text-center rounded-lg bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-rose-500/30">
            </div>
        </div>`;
    }).join('');
}

function openSettingsModal() {
    renderThresholdsModal();
    els.settingsModal.classList.remove('hidden');
    els.settingsModal.classList.add('flex');
}
function closeSettingsModal() {
    els.settingsModal.classList.add('hidden');
    els.settingsModal.classList.remove('flex');
}

els.openSettings.addEventListener('click', openSettingsModal);
els.closeSettings.addEventListener('click', closeSettingsModal);
els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettingsModal(); });

els.saveSettings.addEventListener('click', () => {
    const thresholds = getThresholds();
    els.thresholdsList.querySelectorAll('input').forEach(input => {
        const type = input.dataset.type;
        const level = input.dataset.level;
        if (!thresholds[type]) thresholds[type] = { ...DEFAULT_THRESHOLDS[type] };
        thresholds[type][level] = parseFloat(input.value);
    });
    saveThresholds(thresholds);
    logEvent('Paramètres', 'Seuils d\'alerte mis à jour', 'info');
    closeSettingsModal();
});

els.resetSettings.addEventListener('click', () => {
    localStorage.removeItem('iot_thresholds');
    renderThresholdsModal();
    logEvent('Paramètres', 'Seuils réinitialisés aux valeurs par défaut', 'info');
});

// ── CSV export ────────────────────────────────────────────────
function exportCSV() {
    if (appState.sensors.size === 0) { alert('Aucune donnée à exporter.'); return; }
    const rows = [['Timestamp', 'Zone', 'Machine', 'Capteur', 'Dernière valeur', 'Unité', 'Statut']];
    const now = new Date().toISOString();
    appState.sensors.forEach((sData, key) => {
        const [zone, machine, type] = key.split('/');
        const meta = SENSOR_META[type] || { name: type, unit: '', min: 0, max: 100 };
        const val = sData.valEl.innerText;
        const time = sData.timeEl.innerText;
        const statusClass = sData.statusEl.className;
        const status = statusClass.includes('rose') ? 'CRITIQUE' : statusClass.includes('amber') ? 'AVERTISSEMENT' : 'OK';
        rows.push([time, ZONES[zone] || zone, machine, meta.name, val, meta.unit, status]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot_capteurs_${now.slice(0,19).replace(/:/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent('Export', `${appState.sensors.size} capteurs exportés en CSV`, 'info');
}

els.exportBtn.addEventListener('click', exportCSV);
document.getElementById('export-pdf')?.addEventListener('click', generatePDF);
document.getElementById('kiosk-btn')?.addEventListener('click', toggleKioskMode);
// Initialize onboarding on load
requestAnimationFrame(initOnboarding);
document.getElementById('log-clear-btn').addEventListener('click', () => {
    els.eventList.innerHTML = '';
    els.logEmpty.style.display = '';
});

els.searchInput.addEventListener('input', filterGrid);

setInterval(() => {
    const d = new Date();
    els.clockTime.innerText = d.toLocaleTimeString('fr-FR');
    els.clockDate.innerText = d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}, 1000);

setInterval(() => {
    appState.kpis.trafficCurrent = appState.kpis.pointsThisSec;
    els.kpiPoints.innerText = appState.kpis.trafficCurrent;
    appState.kpis.pointsThisSec = 0;
}, 1000);

function logEvent(type, message, level='info') {
    els.logEmpty.style.display = 'none';
    const li = document.createElement('li');
    li.className = 'log-item flex items-start gap-4 p-3.5 rounded-2xl bg-gray-50/50 dark:bg-dark-800/50 border border-gray-100 dark:border-dark-border/50 text-sm';
    const time = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    let icon = 'ℹ️', colorClass = 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
    if(level === 'warn'){ icon = '⚠️'; colorClass = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'; }
    if(level === 'crit'){ icon = '🚨'; colorClass = 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-500/30'; }
    li.innerHTML = `<div class="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass} shadow-sm">${icon}</div><div class="flex-1 min-w-0"><div class="flex justify-between items-center mb-1"><span class="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide text-[10px]">${type}</span><span class="text-[10px] font-mono text-gray-400">${time}</span></div><p class="text-gray-600 dark:text-gray-400 text-xs leading-relaxed font-medium truncate whitespace-normal line-clamp-2">${message}</p></div>`;
    els.eventList.prepend(li);
    if(els.eventList.children.length > 50) els.eventList.lastChild.remove();
}

let _chartUpdateId = null;
function startChartUpdates() {
    if (_chartUpdateId) return;
    function tick() {
        if (!appState.mainChart) { _chartUpdateId = null; return; }
        appState.globalHistory.shift();
        appState.globalHistory.push(appState.kpis.trafficCurrent);
        appState.mainChart.update();
        _chartUpdateId = setTimeout(tick, 1000);
    }
    _chartUpdateId = setTimeout(tick, 1000);
}
function stopChartUpdates() {
    if (_chartUpdateId) { clearTimeout(_chartUpdateId); _chartUpdateId = null; }
}

function initMainChart() {
    if (!document.getElementById('main-chart') || !window.Chart) return;
    const ctx = document.getElementById('main-chart').getContext('2d');
    const t = getAccent();
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `rgba(${t.rgb}, 0.4)`);
    gradient.addColorStop(1, `rgba(${t.rgb}, 0.0)`);
    appState.mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array(CONFIG.mainChartPoints).fill(''), datasets: [{ data: appState.globalHistory, borderColor: t.c500, backgroundColor: gradient, borderWidth: 3, fill: true, tension: 0.4, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: true, border: { display: false }, grid: { color: 'rgba(156, 163, 175, 0.1)' }, suggestedMin: 0, suggestedMax: 10 } }, animation: { duration: 0 } }
    });
    startChartUpdates();
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopChartUpdates(); else startChartUpdates();
    });
}

if(window.Chart) {
    Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
    Chart.defaults.color = document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280';
    initMainChart();
}

function updateChartsTheme() {
    if (!window.Chart || !appState.mainChart) return;
    const t = getAccent();
    const isDark = document.documentElement.classList.contains('dark');
    Chart.defaults.color = isDark ? '#9ca3af' : '#6b7280';
    const ctx = appState.mainChart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `rgba(${t.rgb}, 0.4)`);
    gradient.addColorStop(1, `rgba(${t.rgb}, 0.0)`);
    appState.mainChart.data.datasets[0].borderColor = t.c500;
    appState.mainChart.data.datasets[0].backgroundColor = gradient;
    appState.mainChart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    appState.mainChart.update();
}

els.navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        els.navBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (page) {
            showPage(page);
        } else {
            appState.filterZone = e.currentTarget.dataset.zone || 'all';
            if (appState.currentPage !== 'dashboard') showPage('dashboard');
            filterGrid();
        }
    });
});

// ── Toast notifications ───────────────────────────────────────────
const toastContainer = document.getElementById('toast-container');
function showToast(title, message, level = 'info') {
    if (!toastContainer) return;
    const cfg = {
        info: { icon: 'ℹ️', cls: 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-900 dark:text-white' },
        warn: { icon: '⚠️', cls: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200' },
        crit: { icon: '🚨', cls: 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200' }
    }[level] || { icon: 'ℹ️', cls: 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border' };
    const t = document.createElement('div');
    t.className = `toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl text-sm ${cfg.cls}`;
    t.innerHTML = `<span class="text-base flex-shrink-0 mt-0.5">${cfg.icon}</span><div class="flex-1 min-w-0"><p class="font-bold text-[10px] uppercase tracking-widest mb-0.5">${title}</p><p class="font-medium opacity-80 text-xs leading-relaxed">${message}</p></div><button class="opacity-40 hover:opacity-80 transition-opacity ml-1 flex-shrink-0 text-lg leading-none" onclick="this.closest('.toast-enter').remove()">&times;</button>`;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(110%)'; setTimeout(() => t.remove(), 400); }, 5000);
}

// ── Zone count badges ───────────────────────────────────────────
function updateZoneCounts() {
    const counts = { all: 0 };
    appState.sensors.forEach((_, key) => {
        const zone = key.split('/')[0];
        counts.all++;
        counts[zone] = (counts[zone] || 0) + 1;
    });
    document.querySelectorAll('.zone-count').forEach(badge => {
        badge.textContent = counts[badge.dataset.zone] || 0;
    });
}

function filterGrid() {
    let visible = 0;
    const search = els.searchInput ? els.searchInput.value.toLowerCase().trim() : '';
    appState.sensors.forEach((sData, key) => {
        const [zone, machine, type] = key.split('/');
        const meta = SENSOR_META[type] || {};
        const matchesZone = appState.filterZone === 'all' || appState.filterZone === zone;
        const matchesSearch = !search ||
            machine.toLowerCase().includes(search) ||
            (meta.name || type).toLowerCase().includes(search) ||
            (ZONES[zone] || zone).toLowerCase().includes(search);
        if (matchesZone && matchesSearch) {
            sData.card.style.display = 'flex';
            visible++;
        } else {
            sData.card.style.display = 'none';
        }
    });
    els.sensorCount.innerText = visible;
    const noResults = document.getElementById('grid-no-results');
    if (noResults) {
        const hasSensors = appState.sensors.size > 0;
        noResults.classList.toggle('hidden', !hasSensors || visible > 0);
        noResults.classList.toggle('flex', hasSensors && visible === 0);
    }
}

function createCard(key, zoneRaw, machine, type) {
    const meta = SENSOR_META[type] || { icon: '⚙️', name: type, min: 0, max: 100, unit: '', color: '#6b7280' };
    const zoneName = ZONES[zoneRaw] || zoneRaw.toUpperCase();
    const card = document.createElement('div');
    const idKey = key.replace(/[/]/g, '-');
    card.id = `card-${idKey}`;
    card.className = 'card-in flex flex-col bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group min-h-[190px]';
    card.innerHTML = `
        <div class="flex items-start justify-between z-10 mb-1">
            <div class="flex gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-border" style="color:${meta.color}">${meta.icon}</div>
                <div class="min-w-0">
                    <span class="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase block truncate">${zoneName} · ${machine}</span>
                    <h3 class="font-extrabold text-gray-900 dark:text-white text-sm leading-tight truncate">${meta.name}</h3>
                </div>
            </div>
            <div id="status-${idKey}" class="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 mt-1 flex-shrink-0 transition-all duration-500"></div>
        </div>
        <div class="absolute inset-x-0 h-12 bottom-11 opacity-50 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none">
            <canvas id="chart-${idKey}"></canvas>
        </div>
        <div class="mt-auto z-10 flex items-end justify-between">
            <div class="flex items-baseline gap-1.5 min-w-0">
                <span id="val-${idKey}" class="text-4xl font-extrabold tracking-tighter text-gray-900 dark:text-white tabular-nums">--</span>
                <span class="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">${meta.unit}</span>
                <span id="trend-${idKey}" class="text-sm font-bold mb-1 transition-colors"></span>
            </div>
            <span id="time-${idKey}" class="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">--:--</span>
        </div>
        <div class="mt-2.5 z-10 flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div id="progress-${idKey}" class="h-full rounded-full transition-[width] duration-700 ease-out" style="width:0%;background-color:${meta.color}"></div>
            </div>
            <span id="anomaly-${idKey}" class="hidden text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 whitespace-nowrap flex-shrink-0"></span>
            <span id="predict-${idKey}" class="hidden text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 whitespace-nowrap flex-shrink-0"></span>
        </div>`;

    // Hide loading state on first real card
    const loadingEl = document.getElementById('grid-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    els.grid.appendChild(card);
    const ctx = document.getElementById(`chart-${idKey}`).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array(CONFIG.maxDataPoints).fill(''), datasets: [{ data: Array(CONFIG.maxDataPoints).fill(null), borderColor: meta.color, borderWidth: 2, tension: 0.4, pointRadius: 0, fill: true, backgroundColor: meta.color + '18' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: meta.min, max: meta.max } }, animation: { duration: 0 } }
    });
    appState.sensors.set(key, {
        card,
        valEl:      document.getElementById(`val-${idKey}`),
        timeEl:     document.getElementById(`time-${idKey}`),
        statusEl:   document.getElementById(`status-${idKey}`),
        progressEl: document.getElementById(`progress-${idKey}`),
        trendEl:    document.getElementById(`trend-${idKey}`),
        anomalyEl:  document.getElementById(`anomaly-${idKey}`),
        chart,
        history:      Array(CONFIG.maxDataPoints).fill(null),
        lastAlertTime: 0,
        lastValue:    null,
        alertCount:   0,
        seuil:        null,
        predictEl:    document.getElementById(`predict-${idKey}`),
    });
    els.kpiSensors.innerText = appState.sensors.size;
    updateZoneCounts();
    filterGrid();
    logEvent('Système', `Nouveau capteur détecté : ${machine} (${meta.name})`, 'info');
}


// ── Analytics & AI Functions ───────────────────────────────────────

function computeZScore(history) {
    const vals = history.filter(v => v !== null && !isNaN(v));
    if (vals.length < 6) return 0;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);
    if (std < 0.001) return 0;
    const current = vals[vals.length - 1];
    const z = Math.abs(current - mean) / std;
    return Math.min(99, Math.round(z * 28));
}

function predictFailure(history, seuil, intervalSec = 3) {
    const vals = history.filter(v => v !== null && !isNaN(v));
    if (vals.length < 10 || seuil == null || seuil <= 0) return null;
    const n = vals.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) { sumX += i; sumY += vals[i]; sumXY += i * vals[i]; sumX2 += i * i; }
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-10) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const current = vals[n - 1];
    if (current >= seuil || slope <= 0) return null;
    const stepsLeft = (seuil - intercept) / slope - (n - 1);
    if (stepsLeft <= 0) return 'imminent';
    return Math.round(stepsLeft * intervalSec);
}

function formatDuration(sec) {
    if (sec < 60) return `~${sec}s`;
    if (sec < 3600) return `~${Math.round(sec / 60)}min`;
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return `~${h}h${m > 0 ? m + 'min' : ''}`;
}

function computeHealthScore(zone, machine) {
    const thresholds = getThresholds();
    const scores = [];
    appState.sensors.forEach((sData, key) => {
        const parts = key.split('/');
        if (parts[0] !== zone || parts[1] !== machine) return;
        const type = parts[2];
        const meta = SENSOR_META[type] || { min: 0, max: 100 };
        const v = sData.lastValue;
        if (v === null) return;
        const progress = (v - meta.min) / (meta.max - meta.min);
        const thr = thresholds[type] || { warn: 0.75, crit: 0.9 };
        let score;
        if (progress >= thr.crit || progress < 0) score = 0;
        else if (progress >= thr.warn) score = 40 + (thr.crit - progress) / (thr.crit - thr.warn) * 30;
        else score = 70 + (1 - progress / thr.warn) * 30;
        scores.push(Math.max(0, Math.min(100, score)));
    });
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function topAnomalySensor() {
    let best = null, bestScore = 0;
    appState.sensors.forEach((sData, key) => {
        const score = computeZScore(sData.history);
        if (score > bestScore) { bestScore = score; best = key; }
    });
    return { key: best, score: bestScore };
}

function updateEnergyKPIs() {
    const el = document.getElementById('kpi-energy');
    const co2El = document.getElementById('kpi-co2');
    if (el) el.textContent = appState.energyKWh.toFixed(3);
    if (co2El) co2El.textContent = (appState.co2Kg * 1000).toFixed(1);
}

function updateAnomalyKPI() {
    const { key, score } = topAnomalySensor();
    const labelEl = document.getElementById('kpi-anomaly');
    const scoreEl = document.getElementById('kpi-anomaly-score');
    if (!labelEl || !scoreEl) return;
    if (!key || score < 5) {
        labelEl.textContent = 'Aucune anomalie';
        scoreEl.textContent = '\u2014';
        scoreEl.className = 'text-2xl font-extrabold text-gray-400 tabular-nums';
    } else {
        const parts = key.split('/');
        labelEl.textContent = parts[1].replace(/_/g,' ') + ' \u00b7 ' + (SENSOR_META[parts[2]]?.name || parts[2]);
        scoreEl.textContent = score;
        scoreEl.className = 'text-2xl font-extrabold tabular-nums ' + (score > 70 ? 'text-rose-500' : score > 40 ? 'text-amber-500' : 'text-violet-500');
    }
}

function update3DHeatmap() {
    if (!_3dState.scene) return;
    Object.keys(ZONE_3D_CONFIG).forEach(zoneName => {
        const pad = _3dState.zonePads[zoneName];
        if (!pad) return;
        const temps = [];
        appState.sensors.forEach((sData, key) => {
            if (key.startsWith(zoneName + '/') && key.endsWith('/temperature') && sData.lastValue !== null) {
                temps.push(sData.lastValue);
            }
        });
        if (temps.length === 0) return;
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        const t = Math.max(0, Math.min(1, (avg - 20) / 40));
        const r = Math.round(t * 255);
        const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 200);
        const b = Math.round((1 - t) * 255);
        pad.material.color.setRGB(r / 255, g / 255, b / 255);
        pad.material.opacity = 0.22;
    });
}

function renderMaintenancePage() {
    const machines = new Map();
    appState.sensors.forEach((sData, key) => {
        const [zone, machine] = key.split('/');
        const mKey = zone + '/' + machine;
        if (!machines.has(mKey)) machines.set(mKey, { zone, machine, sensors: [], alertCount: 0 });
        const m = machines.get(mKey);
        m.sensors.push(sData);
        m.alertCount += sData.alertCount || 0;
    });

    const machineList = [...machines.values()];
    const allScores = machineList.map(m => computeHealthScore(m.zone, m.machine)).filter(s => s !== null);
    const avgHealth = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const critCount = allScores.filter(s => s < 40).length;
    const warnCount = allScores.filter(s => s >= 40 && s < 70).length;
    const goodCount = allScores.filter(s => s >= 70).length;

    const kpisEl = document.getElementById('maint-kpis');
    if (kpisEl) {
        kpisEl.innerHTML = [
            { label: 'Sant\u00e9 Globale',  value: avgHealth+'%', icon: '\u2764\ufe0f',  color: avgHealth > 70 ? 'emerald' : avgHealth > 40 ? 'amber' : 'rose' },
            { label: 'Machines OK',     value: goodCount,      icon: '\u2705',  color: 'emerald' },
            { label: 'En alerte',       value: warnCount+critCount, icon: '\u26a0\ufe0f', color: 'amber' },
            { label: '\u00c9nergie session', value: appState.energyKWh.toFixed(2)+' kWh', icon: '\u26a1', color: 'teal' },
        ].map(k => '<div class="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-5 shadow-sm"><div class="flex items-center gap-3 mb-2"><span class="text-2xl">'+k.icon+'</span><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">'+k.label+'</p></div><p class="text-3xl font-extrabold text-'+k.color+'-500">'+k.value+'</p></div>').join('');
    }

    const tbody = document.getElementById('maint-tbody');
    if (!tbody) return;
    if (machineList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400 text-sm">Aucune donn\u00e9e \u2014 en attente MQTT\u2026</td></tr>';
        return;
    }

    tbody.innerHTML = machineList.sort((a, b) =>
        (computeHealthScore(a.zone, a.machine) ?? 100) - (computeHealthScore(b.zone, b.machine) ?? 100)
    ).map(m => {
        const score = computeHealthScore(m.zone, m.machine);
        const scoreDisplay = score ?? '\u2014';
        const scoreColor = score === null ? 'gray' : score < 40 ? 'rose' : score < 70 ? 'amber' : 'emerald';
        const maxZ = m.sensors.length ? Math.max(...m.sensors.map(sd => computeZScore(sd.history))) : 0;
        const zColor = maxZ > 70 ? 'rose' : maxZ > 40 ? 'amber' : 'violet';
        let maintText = '> 30 jours';
        if (score !== null) {
            if (score < 30) maintText = '\u26a1 Imm\u00e9diat';
            else if (score < 50) maintText = '\ud83d\udd34 < 48h';
            else if (score < 65) maintText = '\ud83d\udfe0 1 semaine';
            else if (score < 80) maintText = '\ud83d\udfe1 1 mois';
        }
        const statusBadge = score === null
            ? '<span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">Inconnu</span>'
            : score < 40
            ? '<span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">Critique</span>'
            : score < 70
            ? '<span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">Attention</span>'
            : '<span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Bon</span>';
        const machineLabel = m.machine.replace(/_/g, ' ');
        const zoneLbl = ZONES[m.zone] || m.zone;
        return '<tr class="hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors">' +
            '<td class="px-6 py-4 font-bold text-gray-900 dark:text-white capitalize">' + machineLabel + '</td>' +
            '<td class="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">' + zoneLbl + '</td>' +
            '<td class="px-4 py-4 text-center"><div class="flex items-center justify-center gap-2"><div class="w-16 h-1.5 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden"><div class="h-full rounded-full bg-'+scoreColor+'-500 transition-all" style="width:'+((score??0))+'%"></div></div><span class="font-extrabold text-'+scoreColor+'-500 text-sm w-8 text-right">'+scoreDisplay+'</span></div></td>' +
            '<td class="px-4 py-4 text-center"><span class="font-bold text-'+zColor+'-500 text-sm">'+( maxZ > 0 ? maxZ+'%' : '\u2014')+'</span></td>' +
            '<td class="px-4 py-4 text-center font-bold text-gray-700 dark:text-gray-300">' + m.alertCount + '</td>' +
            '<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">' + maintText + '</td>' +
            '<td class="px-4 py-4 text-center">' + statusBadge + '</td></tr>';
    }).join('');

    const zoneCards = document.getElementById('maint-zone-cards');
    if (zoneCards) {
        zoneCards.innerHTML = Object.entries(ZONES).map(([zoneKey, zoneName]) => {
            const zoneMachines = machineList.filter(m => m.zone === zoneKey);
            const zoneScores = zoneMachines.map(m => computeHealthScore(m.zone, m.machine)).filter(s => s !== null);
            const zoneHealth = zoneScores.length ? Math.round(zoneScores.reduce((a, b) => a + b, 0) / zoneScores.length) : null;
            const cfg = ZONE_3D_CONFIG[zoneKey];
            const colorHex = cfg ? cfg.color.toString(16).padStart(6, '0') : '6b7280';
            return '<div class="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl p-6 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-3 h-3 rounded-full" style="background:#'+colorHex+'"></div><h3 class="font-bold text-gray-900 dark:text-white text-sm">'+zoneName+'</h3></div><p class="text-4xl font-extrabold mb-1" style="color:#'+colorHex+'">' + (zoneHealth !== null ? zoneHealth+'%' : '\u2014')+'</p><p class="text-xs text-gray-500">'+zoneMachines.length+' machine'+( zoneMachines.length>1?'s':'')+'</p><div class="mt-3 h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all" style="width:'+(zoneHealth??0)+'%;background:#'+colorHex+'"></div></div></div>';
        }).join('');
    }
}

function generatePDF() {
    if (!window.jspdf) { showToast('PDF', 'Biblioth\u00e8que jsPDF non charg\u00e9e', 'warn'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const accent = [59, 130, 246];
    const now = new Date();

    doc.setFillColor(...accent);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('IndustriTech \u2014 Rapport de supervision', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('G\u00e9n\u00e9r\u00e9 le '+now.toLocaleDateString('fr-FR')+' \u00e0 '+now.toLocaleTimeString('fr-FR'), 14, 20);
    doc.text('Dur\u00e9e session : '+Math.round((Date.now()-appState._sessionStart)/60000)+' min', 14, 25);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('R\u00e9sum\u00e9 ex\u00e9cutif', 14, 38);
    [['Capteurs actifs', appState.sensors.size],['Alertes totales', appState.kpis.alertsTotal],['\u00c9nergie consomm\u00e9e', appState.energyKWh.toFixed(3)+' kWh'],['\u00c9missions CO\u2082', (appState.co2Kg*1000).toFixed(1)+' g']].forEach(([label, value], i) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(label+' :', 14, 46+i*7);
        doc.setFont('helvetica', 'normal'); doc.text(String(value), 75, 46+i*7);
    });

    const machines2 = new Map();
    appState.sensors.forEach((sData, key) => {
        const [zone, machine] = key.split('/');
        const mKey = zone+'/'+machine;
        if (!machines2.has(mKey)) machines2.set(mKey, { zone, machine, alertCount: 0, sensors: [] });
        const m = machines2.get(mKey);
        m.alertCount += sData.alertCount || 0;
        m.sensors.push(sData);
    });
    const tableData = [...machines2.values()].map(m => {
        const score = computeHealthScore(m.zone, m.machine);
        const maxZ = m.sensors.length ? Math.max(...m.sensors.map(sd => computeZScore(sd.history))) : 0;
        let maint = '> 30j';
        if (score !== null) { if (score < 30) maint = 'URGENT'; else if (score < 50) maint = '< 48h'; else if (score < 65) maint = '1 sem.'; else if (score < 80) maint = '1 mois'; }
        const status = score === null ? '\u2014' : score < 40 ? 'Critique' : score < 70 ? 'Attention' : 'OK';
        return [m.machine.replace(/_/g,' '), ZONES[m.zone]||m.zone, score!==null?score+'%':'\u2014', maxZ>0?maxZ+'%':'\u2014', String(m.alertCount), maint, status];
    }).sort((a,b) => parseInt(a[2])-parseInt(b[2]));

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('\u00c9tat des machines', 14, 80);
    if (doc.autoTable) {
        doc.autoTable({ startY: 85,
            head: [['Machine','Zone','Sant\u00e9','Anomalie','Alertes','Maintenance','Statut']],
            body: tableData,
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            headStyles: { fillColor: accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
            didParseCell: ({ section, column, cell }) => {
                if (section==='body' && column.index===6) {
                    if (cell.raw==='Critique') cell.styles.textColor = [220,38,38];
                    else if (cell.raw==='Attention') cell.styles.textColor = [217,119,6];
                    else if (cell.raw==='OK') cell.styles.textColor = [5,150,105];
                }
            },
        });
    }
    const pageCount = doc.getNumberOfPages();
    for (let pg=1; pg<=pageCount; pg++) {
        doc.setPage(pg); doc.setFontSize(8); doc.setTextColor(150,150,150);
        doc.text('IndustriTech IoT Monitoring \u2014 Page '+pg+'/'+pageCount, 14, 290);
        doc.text('Confidentiel', 180, 290);
    }
    doc.save('rapport_iot_'+now.toISOString().slice(0,10)+'.pdf');
    showToast('PDF', 'Rapport t\u00e9l\u00e9charg\u00e9', 'info');
}



// ── Alert History + Cartographie + Comparaison + UX ──────────────
// ── Feature: Alert History ─────────────────────────────────────────
appState.alertHistory = [];

function addAlertToHistory(zone, machine, type, level, value, unit) {
    const meta = SENSOR_META[type] || { name: type };
    const entry = {
        id: Date.now() + Math.random(),
        time: new Date(),
        zone, machine, type, level,
        value: typeof value === 'number' ? value : 0,
        unit: unit || '',
        msg: `${machine.replace(/_/g,' ')} \u2014 ${meta.name}: ${Number(value).toFixed(1)} ${unit || ''}`,
        acked: false,
    };
    appState.alertHistory.unshift(entry);
    if (appState.alertHistory.length > 300) appState.alertHistory.pop();
    _updateAlertsBadge();
    if (appState.currentPage === 'alerts') renderAlertsPage();
}

function _updateAlertsBadge() {
    const unacked = appState.alertHistory.filter(a => !a.acked).length;
    const badge = document.getElementById('alerts-badge');
    if (!badge) return;
    badge.textContent = unacked > 99 ? '99+' : unacked;
    if (unacked > 0) { badge.classList.remove('hidden'); badge.classList.add('flex'); }
    else { badge.classList.add('hidden'); badge.classList.remove('flex'); }
}

function acknowledgeAlert(id) {
    const a = appState.alertHistory.find(x => Math.abs(x.id - id) < 1);
    if (a) { a.acked = true; _updateAlertsBadge(); renderAlertsPage(); }
}

function acknowledgeAllAlerts() {
    appState.alertHistory.forEach(a => a.acked = true);
    _updateAlertsBadge(); renderAlertsPage();
}

function clearAckedAlerts() {
    appState.alertHistory = appState.alertHistory.filter(a => !a.acked);
    renderAlertsPage();
}

function renderAlertsPage() {
    const container = document.getElementById('alerts-list');
    if (!container) return;
    const filterZone  = document.getElementById('alert-filter-zone')?.value || 'all';
    const filterLevel = document.getElementById('alert-filter-level')?.value || 'all';
    const filterUnacked = document.getElementById('alert-filter-unacked')?.checked || false;

    let list = [...appState.alertHistory];
    if (filterZone  !== 'all') list = list.filter(a => a.zone === filterZone);
    if (filterLevel !== 'all') list = list.filter(a => a.level === filterLevel);
    if (filterUnacked)         list = list.filter(a => !a.acked);

    const countEl = document.getElementById('alerts-count-label');
    if (countEl) countEl.textContent = list.length + ' alerte(s)';

    if (list.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 text-sm py-12">Aucune alerte correspondant aux filtres</p>';
        return;
    }

    container.innerHTML = list.map(a => {
        const isToday = a.time.toDateString() === new Date().toDateString();
        const tStr = isToday
            ? a.time.toLocaleTimeString('fr-FR')
            : a.time.toLocaleDateString('fr-FR') + ' ' + a.time.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
        const zoneLbl = ZONES[a.zone] || a.zone;
        const bg  = a.level === 'crit'
            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
        const icon = a.level === 'crit' ? '\ud83d\udea8' : '\u26a0\ufe0f';
        const idStr = String(a.id).replace('.', '_');
        return `<div data-alert-id="${a.id}" class="flex items-start gap-4 p-4 rounded-2xl border ${bg} ${a.acked ? 'opacity-50' : ''} transition-all">
            <span class="text-xl flex-shrink-0 mt-0.5">${icon}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                    <span class="font-bold text-sm text-gray-900 dark:text-white">${a.machine.replace(/_/g,' ')}</span>
                    <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 dark:bg-dark-800 text-gray-500">${zoneLbl}</span>
                    ${a.acked ? '<span class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">\u2713 Acquitt\u00e9e</span>' : ''}
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">${a.msg}</p>
                <p class="text-[11px] text-gray-400 mt-1 font-mono">${tStr}</p>
            </div>
            ${!a.acked ? `<button onclick="acknowledgeAlert(${a.id})" class="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-border text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">Acquitter</button>` : ''}
        </div>`;
    }).join('');
}

// ── Feature: SVG Cartographie ──────────────────────────────────────
const MAP_MACHINES = [
    { key: 'salle_serveur/rack_principal',  label: 'Rack Prin.',   x: 158, y:  85 },
    { key: 'salle_serveur/rack_secondaire', label: 'Rack Sec.',    x: 225, y:  85 },
    { key: 'salle_serveur/onduleur',        label: 'Onduleur',     x: 293, y:  85 },
    { key: 'salle_serveur/climatiseur',     label: 'Climat.',      x: 225, y: 170 },
    { key: 'atelier/presse',                label: 'Presse',       x: 473, y:  85 },
    { key: 'atelier/robot',                 label: 'Robot',        x: 563, y:  85 },
    { key: 'atelier/tour_cnc',              label: 'Tour CNC',     x: 653, y:  85 },
    { key: 'atelier/convoyeur',             label: 'Convoyeur',    x: 563, y: 175 },
    { key: 'atelier/soudure',               label: 'Soudure',      x: 473, y: 250 },
    { key: 'atelier/compresseur',           label: 'Compress.',    x: 653, y: 250 },
    { key: 'local_elec/tableau_principal',  label: 'Tableau',      x: 158, y: 323 },
    { key: 'local_elec/batterie',           label: 'Batterie',     x: 225, y: 323 },
    { key: 'local_elec/transformateur',     label: 'Transfo',      x: 293, y: 323 },
    { key: 'local_elec/ups',               label: 'UPS',          x: 225, y: 391 },
];

function getMachineStatus(zone, machine) {
    let hasCrit = false, hasWarn = false, hasOk = false;
    appState.sensors.forEach((sData, key) => {
        if (!key.startsWith(zone + '/' + machine + '/')) return;
        const cls = sData.statusEl ? sData.statusEl.className : '';
        if (cls.includes('rose')) hasCrit = true;
        else if (cls.includes('amber')) hasWarn = true;
        else if (cls.includes('emerald')) hasOk = true;
    });
    if (hasCrit) return 'crit';
    if (hasWarn) return 'warn';
    if (hasOk)   return 'ok';
    return 'inactive';
}

function renderCartePage() {
    const container = document.getElementById('carte-svg-container');
    if (!container) return;
    const isDark = document.documentElement.classList.contains('dark');
    const bg       = isDark ? '#111827' : '#f8fafc';
    const wallClr  = isDark ? '#374151' : '#cbd5e1';
    const textClr  = isDark ? '#94a3b8' : '#64748b';
    const STATUS_COLOR = {
        ok:       '#10b981',
        warn:     '#f59e0b',
        crit:     '#ef4444',
        inactive: isDark ? '#4b5563' : '#d1d5db',
    };
    const ZONE_DEF = [
        { key: 'salle_serveur', label: 'SALLE SERVEUR',   color: '#3b82f6', x:  90, y:  30, w: 265, h: 175 },
        { key: 'atelier',       label: 'ATELIER PRINCIPAL', color: '#8b5cf6', x: 400, y:  30, w: 360, h: 248 },
        { key: 'local_elec',    label: 'LOCAL \u00c9LEC.',  color: '#f59e0b', x:  90, y: 290, w: 265, h: 140 },
    ];
    const zonesSVG = ZONE_DEF.map(z => {
        const crits = MAP_MACHINES.filter(m => m.key.startsWith(z.key+'/')).filter(m => getMachineStatus(z.key, m.key.split('/')[1]) === 'crit').length;
        const warns = MAP_MACHINES.filter(m => m.key.startsWith(z.key+'/')).filter(m => getMachineStatus(z.key, m.key.split('/')[1]) === 'warn').length;
        const badge = crits > 0
            ? `<text x="${z.x+z.w-8}" y="${z.y+22}" font-size="11" font-weight="800" fill="#ef4444" text-anchor="end" font-family="sans-serif">${crits} CRIT</text>`
            : warns > 0
            ? `<text x="${z.x+z.w-8}" y="${z.y+22}" font-size="11" font-weight="800" fill="#f59e0b" text-anchor="end" font-family="sans-serif">${warns} WARN</text>`
            : '';
        return `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="12" fill="${z.color}" fill-opacity="${isDark?'0.06':'0.07'}" stroke="${z.color}" stroke-width="2" stroke-opacity="0.7"/>
<text x="${z.x+10}" y="${z.y+22}" font-size="10" font-weight="800" letter-spacing="1" fill="${z.color}" font-family="sans-serif">${z.label}</text>${badge}`;
    }).join('\n');

    const machinesSVG = MAP_MACHINES.map(m => {
        const [zone, machine] = m.key.split('/');
        const status = getMachineStatus(zone, machine);
        const fill   = STATUS_COLOR[status];
        const hs     = computeHealthScore(zone, machine);
        const tip    = `${m.label} | Sant\u00e9: ${hs !== null ? hs+'%' : '--'} | ${status === 'crit' ? 'CRITIQUE' : status === 'warn' ? 'Avertissement' : status === 'ok' ? 'Normal' : 'Inactif'}`;
        const pulse  = status !== 'inactive'
            ? `<circle cx="${m.x}" cy="${m.y}" r="20" fill="${fill}" fill-opacity="0.2"><animate attributeName="r" values="16;22;16" dur="${status==='crit'?'0.9s':'2.5s'}" repeatCount="indefinite"/><animate attributeName="fill-opacity" values="0.2;0;0.2" dur="${status==='crit'?'0.9s':'2.5s'}" repeatCount="indefinite"/></circle>` : '';
        const opacity = status === 'inactive' ? '0.35' : '1';
        return `<g style="cursor:default"><title>${tip}</title>
${pulse}
<circle cx="${m.x}" cy="${m.y}" r="15" fill="${fill}" opacity="${opacity}"/>
<circle cx="${m.x}" cy="${m.y}" r="9"  fill="white" fill-opacity="0.2"/>
<text x="${m.x}" y="${m.y+28}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${textClr}" font-family="sans-serif">${m.label}</text>
</g>`;
    }).join('\n');

    container.innerHTML = `<svg viewBox="0 0 800 455" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-4xl mx-auto block" style="min-height:260px">
<rect width="800" height="455" fill="${bg}" rx="16"/>
<rect x="80" y="20" width="690" height="415" rx="16" fill="none" stroke="${wallClr}" stroke-width="2.5" stroke-dasharray="10,5" opacity="0.5"/>
${zonesSVG}
<rect x="374" y="30" width="24" height="415" fill="${isDark?'#0f172a':'#f1f5f9'}" opacity="0.8"/>
<text x="386" y="260" text-anchor="middle" font-size="9" fill="${isDark?'#374151':'#94a3b8'}" font-family="sans-serif" transform="rotate(-90,386,260)">COULOIR</text>
${machinesSVG}
<g opacity="0.45"><circle cx="758" cy="430" r="14" fill="none" stroke="${textClr}" stroke-width="1.5"/>
<text x="758" y="426" text-anchor="middle" font-size="10" font-weight="800" fill="${textClr}" font-family="sans-serif">N</text>
<path d="M758,416 L762,426 L758,424 L754,426 Z" fill="${textClr}"/></g>
<text x="400" y="446" text-anchor="middle" font-size="10" fill="${textClr}" font-family="sans-serif" opacity="0.5">B\u00e2timent principal \u2014 vue de dessus \u2014 cliquer sur le plan pour naviguer</text>
</svg>`;
    renderCarteZoneSummary();
}

function renderCarteZoneSummary() {
    const container = document.getElementById('carte-zone-summary');
    if (!container) return;
    const ZCFG = [
        { key: 'salle_serveur', label: 'Salle Serveur',    icon: '\ud83d\udda5\ufe0f', color: 'blue' },
        { key: 'atelier',       label: 'Atelier Principal', icon: '\u2699\ufe0f',       color: 'violet' },
        { key: 'local_elec',    label: 'Local \u00c9lec.',  icon: '\u26a1',             color: 'amber' },
    ];
    container.innerHTML = ZCFG.map(z => {
        const mKeys   = MAP_MACHINES.filter(m => m.key.startsWith(z.key+'/')).map(m => m.key.split('/')[1]);
        const statuses = mKeys.map(m => getMachineStatus(z.key, m));
        const crit = statuses.filter(s=>s==='crit').length;
        const warn = statuses.filter(s=>s==='warn').length;
        const ok   = statuses.filter(s=>s==='ok').length;
        const scores = mKeys.map(m=>computeHealthScore(z.key,m)).filter(s=>s!==null);
        const avg  = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
        const hClr = avg===null?'gray':avg>=70?'emerald':avg>=40?'amber':'rose';
        return `<div class="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl p-5 shadow-sm">
  <div class="flex items-center gap-3 mb-4"><span class="text-2xl">${z.icon}</span><h3 class="font-bold text-gray-900 dark:text-white text-sm">${z.label}</h3></div>
  <div class="flex gap-3 text-center">
    <div class="flex-1"><p class="text-2xl font-extrabold text-emerald-500">${ok}</p><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">OK</p></div>
    <div class="flex-1"><p class="text-2xl font-extrabold text-amber-500">${warn}</p><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Warn</p></div>
    <div class="flex-1"><p class="text-2xl font-extrabold text-rose-500">${crit}</p><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Crit</p></div>
    <div class="flex-1 border-l border-gray-100 dark:border-dark-border pl-3"><p class="text-2xl font-extrabold text-${hClr}-500">${avg!==null?avg+'%':'--'}</p><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sant\u00e9</p></div>
  </div>
</div>`;
    }).join('');
}

// ── Feature: Comparaison Multi-Machines ───────────────────────────
const _compareSelected = new Set();

function renderCompareSelectorPage() {
    const selector = document.getElementById('compare-selector');
    if (!selector) return;
    const machines = new Map();
    appState.sensors.forEach((_, key) => {
        const [zone, machine] = key.split('/');
        machines.set(zone+'/'+machine, { zone, machine });
    });
    if (machines.size === 0) {
        selector.innerHTML = '<p class="text-gray-400 text-sm py-4 text-center">En attente de donn\u00e9es MQTT\u2026</p>';
        return;
    }
    selector.innerHTML = [...machines.entries()].map(([mKey, {zone, machine}]) => {
        const sel = _compareSelected.has(mKey);
        const st  = getMachineStatus(zone, machine);
        const dot = st==='crit'?'bg-rose-500':st==='warn'?'bg-amber-500':st==='ok'?'bg-emerald-500':'bg-gray-400';
        return `<button data-mkey="${mKey}" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all ${sel?'bg-brand-500 border-brand-500 text-white shadow-[0_0_14px_rgba(59,130,246,0.4)]':'bg-gray-50 dark:bg-dark-800 border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:border-brand-500 dark:hover:border-brand-500'}">
<span class="w-2.5 h-2.5 rounded-full ${dot} flex-shrink-0"></span>${machine.replace(/_/g,' ')}</button>`;
    }).join('');
    renderCompareGrid();
}

function toggleCompare(mKey) {
    if (_compareSelected.has(mKey)) _compareSelected.delete(mKey);
    else if (_compareSelected.size < 4) _compareSelected.add(mKey);
    renderCompareSelectorPage();
}

function renderCompareGrid() {
    const grid = document.getElementById('compare-grid');
    if (!grid) return;
    if (_compareSelected.size < 2) {
        grid.innerHTML = '<p class="col-span-2 text-center text-gray-400 text-sm py-12">\u2192 S\u00e9lectionnez au moins 2 machines pour afficher la comparaison</p>';
        return;
    }
    const thresholds = getThresholds();
    grid.innerHTML = [..._compareSelected].map(mKey => {
        const [zone, machine] = mKey.split('/');
        const score  = computeHealthScore(zone, machine);
        const sClr   = score===null?'gray':score<40?'rose':score<70?'amber':'emerald';
        const st     = getMachineStatus(zone, machine);
        const border = st==='crit'?'border-rose-400 dark:border-rose-500':st==='warn'?'border-amber-400 dark:border-amber-500':'border-gray-100 dark:border-dark-border';
        const sensors = [];
        appState.sensors.forEach((sData, key) => { if (key.startsWith(mKey+'/')) sensors.push({sData, type:key.split('/')[2]}); });
        const sensHtml = sensors.map(({sData, type}) => {
            const meta = SENSOR_META[type] || { name:type, unit:'', min:0, max:100, color:'#6b7280', icon:'•' };
            const v  = sData.lastValue !== null ? sData.lastValue.toFixed(1) : '--';
            const pct = sData.lastValue !== null ? Math.max(0, Math.min(100, ((sData.lastValue-meta.min)/(meta.max-meta.min))*100)) : 0;
            const az = computeZScore(sData.history);
            const thr = thresholds[type] || {warn:0.75, crit:0.9};
            const prog = sData.lastValue !== null ? (sData.lastValue-meta.min)/(meta.max-meta.min) : 0;
            const barClr = prog >= thr.crit ? '#ef4444' : prog >= thr.warn ? '#f59e0b' : meta.color;
            return `<div class="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-dark-700 last:border-0">
<span class="text-base w-6 flex-shrink-0 text-center">${meta.icon||'\u2022'}</span>
<div class="flex-1 min-w-0">
  <div class="flex justify-between items-center mb-1.5">
    <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">${meta.name}</span>
    <span class="text-sm font-extrabold tabular-nums ml-2 whitespace-nowrap" style="color:${barClr}">${v} <span class="text-[10px] font-normal text-gray-400">${meta.unit}</span></span>
  </div>
  <div class="h-1.5 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-500" style="width:${pct}%;background:${barClr}"></div></div>
</div>
${az>=35?`<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex-shrink-0">${az}% IA</span>`:''}
</div>`;
        }).join('');
        return `<div class="bg-white dark:bg-dark-card border-2 ${border} rounded-3xl p-6 shadow-sm page-enter">
<div class="flex items-start justify-between mb-5">
  <div><h3 class="font-extrabold text-gray-900 dark:text-white capitalize text-lg">${machine.replace(/_/g,' ')}</h3>
  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${ZONES[zone]||zone}</p></div>
  <div class="text-right"><p class="text-3xl font-extrabold text-${sClr}-500">${score!==null?score:'--'}</p><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sant\u00e9</p></div>
</div>
<div>${sensHtml||'<p class="text-xs text-gray-400 text-center py-4">Aucun capteur actif</p>'}</div>
<button data-remove="${mKey}" class="mt-5 w-full py-2 rounded-xl bg-gray-100 dark:bg-dark-800 text-gray-500 text-xs font-bold hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors">\u2715 Retirer de la comparaison</button>
</div>`;
    }).join('');
}

// ── Feature: UX — Kiosk Mode & Onboarding ─────────────────────────
let _kioskInterval = null;
const KIOSK_PAGES = ['dashboard', 'carte', '3d', 'maintenance', 'alerts', 'compare'];
let _kioskIdx = 0;

function toggleKioskMode() {
    const btn = document.getElementById('kiosk-btn');
    if (_kioskInterval) {
        clearInterval(_kioskInterval);
        _kioskInterval = null;
        if (btn) { btn.classList.remove('active-kiosk'); btn.title='Mode kiosque (d\u00e9mo automatique)'; }
        showToast('Kiosque', 'Mode kiosque d\u00e9sactiv\u00e9', 'info');
    } else {
        _kioskIdx = KIOSK_PAGES.indexOf(appState.currentPage);
        if (_kioskIdx < 0) _kioskIdx = 0;
        _kioskInterval = setInterval(() => {
            _kioskIdx = (_kioskIdx + 1) % KIOSK_PAGES.length;
            showPage(KIOSK_PAGES[_kioskIdx]);
        }, 12000);
        if (btn) { btn.classList.add('active-kiosk'); btn.title='Arr\u00eater le mode kiosque'; }
        showToast('Kiosque', 'Mode kiosque activ\u00e9 \u2014 rotation toutes les 12s', 'info');
    }
}

function initOnboarding() {
    // Show every new browser session unless user clicked "Ne plus afficher"
    if (sessionStorage.getItem('iot_onboarded_session')) return;
    const el = document.getElementById('onboarding');
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
    document.getElementById('onboarding-start')?.addEventListener('click', () => closeOnboarding(false));
    document.getElementById('onboarding-never')?.addEventListener('click', () => closeOnboarding(true));
}

function closeOnboarding(permanent) {
    sessionStorage.setItem('iot_onboarded_session', '1');
    if (permanent) localStorage.setItem('iot_onboarded', '1');
    const el = document.getElementById('onboarding');
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}

// Expose functions used in inline onclick handlers to global scope
// (all code is inside window.onload so functions are not global by default)
window.closeOnboarding      = closeOnboarding;
window.acknowledgeAlert     = acknowledgeAlert;
window.acknowledgeAllAlerts = acknowledgeAllAlerts;
window.clearAckedAlerts     = clearAckedAlerts;
window.renderCartePage      = renderCartePage;
window.renderMaintenancePage= renderMaintenancePage;
window.toggleCompare        = toggleCompare;

// ── Compare page: event delegation (avoids inline onclick scope issues) ──────
document.getElementById('compare-selector')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-mkey]');
    if (btn) toggleCompare(btn.dataset.mkey);
});
document.getElementById('compare-grid')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (btn) { _compareSelected.delete(btn.dataset.remove); renderCompareSelectorPage(); }
});


// ── 3D Factory View (complete) ─────────────────────────────────────

/* ─── Machine placement map (explicit positions per machine) ────── */
const MACHINE_POS_MAP = {
    // Salle serveur (4 machines)
    'salle_serveur/rack_principal':  { x: -13, z: -8 },
    'salle_serveur/rack_secondaire': { x: -10, z: -8 },
    'salle_serveur/onduleur':        { x: -7,  z: -8 },
    'salle_serveur/climatiseur':     { x: -10, z: -3 },
    // Atelier (6 machines)
    'atelier/presse':              { x: 1,   z: -8 },
    'atelier/robot':               { x: 5,   z: -8 },
    'atelier/tour_cnc':            { x: 9,   z: -8 },
    'atelier/convoyeur':           { x: 5,   z: -3 },
    'atelier/compresseur':         { x: 1,   z: -3 },
    'atelier/poste_soudure':       { x: 10,  z: -3 },
    // Local électrique (4 machines)
    'local_elec/armoire_1':        { x: -13, z: 6 },
    'local_elec/armoire_2':        { x: -11, z: 6 },
    'local_elec/transformateur':   { x: -8,  z: 6 },
    'local_elec/groupe_electrogene': { x: -8, z: 10 },
};
let _machineAutoIdx = {};

function get3DMachinePos(zone, machine) {
    const key = `${zone}/${machine}`;
    if (MACHINE_POS_MAP[key]) return MACHINE_POS_MAP[key];
    const cfg = ZONE_3D_CONFIG[zone];
    if (!cfg) return null;
    const idx = _machineAutoIdx[zone] || 0;
    _machineAutoIdx[zone] = idx + 1;
    const cols = 3, col = idx % cols, row = Math.floor(idx / cols);
    return { x: cfg.cx - cfg.w/2 + 1.6 + col*2.8, z: cfg.cz - cfg.d/2 + 1.6 + row*2.8 };
}

/* ─── Helper: create wall segment (translucent) ───────────────── */
function _wall(scene, x, y, z, w, h, d, color, isDark) {
    const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0.35, depthWrite: false })
    );
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    // Wall edge outline for visibility
    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(m.geometry),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
    );
    edges.position.copy(m.position);
    scene.add(edges);
    return m;
}

/* ─── Helper: glass pane ───────────────────────────────────────── */
function _glass(scene, x, y, z, w, h, d, color) {
    const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.6 })
    );
    m.position.set(x, y, z);
    scene.add(m);
    return m;
}

/* ─── Helper: pipe (cylinder) ──────────────────────────────────── */
function _pipe(scene, x1, y1, z1, x2, y2, z2, radius, color) {
    const dir = new THREE.Vector3(x2-x1, y2-y1, z2-z1);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    const mid = new THREE.Vector3((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
    mesh.position.copy(mid);
    // orient the cylinder along the direction
    const up = new THREE.Vector3(0,1,0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    mesh.quaternion.copy(quat);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
}

/* ─── Helper: cable tray (thin boxes) ──────────────────────────── */
function _cableTray(scene, x1, y, z1, x2, z2, color) {
    const dx = x2-x1, dz = z2-z1;
    const len = Math.sqrt(dx*dx + dz*dz);
    const geo = new THREE.BoxGeometry(len, 0.05, 0.3);
    const mat = new THREE.MeshStandardMaterial({ color, roughness:0.4, metalness:0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x1+x2)/2, y, (z1+z2)/2);
    mesh.rotation.y = Math.atan2(dz, dx);
    scene.add(mesh);
    return mesh;
}

/* ─── Build detailed machine model ─────────────────────────────── */
function _buildMachineModel(scene, machine, pos, isDark) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    const bodyColor = isDark ? 0x1e293b : 0xdde2ea;
    const metalColor = isDark ? 0x374151 : 0x94a3b8;
    const accentMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.6 });

    switch (machine) {
        case 'rack_principal': {
            // Server rack: tall narrow with shelves and LED strips
            const rW = 1.4, rH = 3.2, rD = 1.0;
            const body = new THREE.Mesh(new THREE.BoxGeometry(rW, rH, rD),
                new THREE.MeshStandardMaterial({ color: isDark? 0x111827 : 0x334155, roughness:0.4, metalness:0.6 }));
            body.position.y = rH/2;
            body.castShadow = true;
            body.receiveShadow = true;
            group.add(body);
            // Shelves
            for (let s = 0; s < 6; s++) {
                const shelf = new THREE.Mesh(new THREE.BoxGeometry(rW-0.1, 0.08, rD-0.05),
                    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness:0.3, metalness:0.8 }));
                shelf.position.y = 0.4 + s * 0.45;
                group.add(shelf);
            }
            // Front LED strips
            for (let s = 0; s < 6; s++) {
                const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02),
                    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8 }));
                led.position.set(-rW/2 + 0.15, 0.5 + s * 0.45, rD/2 + 0.01);
                led.userData._isLed = true;
                group.add(led);
            }
            // Top ventilation grille (represented by thin lines)
            const ventGeo = new THREE.BoxGeometry(rW - 0.2, 0.03, rD - 0.2);
            const ventMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.3 });
            const vent = new THREE.Mesh(ventGeo, ventMat);
            vent.position.y = rH + 0.02;
            group.add(vent);
            group.userData._machineH = rH;
            break;
        }
        case 'presse': {
            // Industrial press: wide base + two pillars + top crossbar + ram
            const baseW = 2.2, baseH = 0.4, baseD = 1.6;
            const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD),
                new THREE.MeshStandardMaterial({ color: isDark? 0x1e3a5f : 0x64748b, roughness:0.6, metalness:0.5 }));
            base.position.y = baseH/2;
            base.castShadow = true;
            group.add(base);
            // Pillars
            const pH = 2.6;
            for (const sx of [-0.8, 0.8]) {
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.25, pH, 0.25),
                    accentMat(isDark? 0x374151 : 0x475569));
                pillar.position.set(sx, baseH + pH/2, 0);
                pillar.castShadow = true;
                group.add(pillar);
            }
            // Crossbar top
            const cross = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.2),
                accentMat(isDark? 0x374151 : 0x475569));
            cross.position.y = baseH + pH + 0.15;
            cross.castShadow = true;
            group.add(cross);
            // Ram (moves in animation)
            const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.0, 12),
                accentMat(0xef4444));
            ram.position.y = baseH + pH * 0.55;
            ram.userData._isRam = true;
            group.add(ram);
            // Warning stripes (yellow accents)
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(baseW + 0.02, 0.08, baseD + 0.02),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 }));
            stripe.position.y = baseH + 0.04;
            group.add(stripe);
            group.userData._machineH = baseH + pH + 0.45;
            break;
        }
        case 'robot': {
            // Robot arm: base platform + rotating base + arm segments
            const platH = 0.3;
            const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, platH, 16),
                new THREE.MeshStandardMaterial({ color: isDark? 0x1e293b : 0x64748b, roughness:0.5, metalness:0.6 }));
            plat.position.y = platH/2;
            plat.castShadow = true;
            group.add(plat);
            // Rotating base
            const rotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 12),
                accentMat(0x8b5cf6));
            rotBase.position.y = platH + 0.25;
            rotBase.userData._isRotBase = true;
            group.add(rotBase);
            // Lower arm
            const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2),
                accentMat(isDark? 0x4338ca : 0x6366f1));
            arm1.position.set(0, platH + 0.5 + 0.7, 0);
            arm1.userData._isArm1 = true;
            group.add(arm1);
            // Upper arm
            const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.15),
                accentMat(isDark? 0x6366f1 : 0x818cf8));
            arm2.position.set(0, platH + 0.5 + 1.4 + 0.3, 0.3);
            arm2.rotation.x = -0.4;
            group.add(arm2);
            // End effector (gripper)
            const grip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
                accentMat(0xf59e0b));
            grip.position.set(0, platH + 0.5 + 1.4 + 1.1, 0.6);
            group.add(grip);
            group.userData._machineH = platH + 0.5 + 1.4 + 1.3;
            break;
        }
        case 'convoyeur': {
            // Conveyor belt: long flat with rollers and moving belt
            const beltW = 4.0, beltH = 0.8, beltD = 1.2;
            // Frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(beltW, 0.15, beltD),
                new THREE.MeshStandardMaterial({ color: metalColor, roughness:0.4, metalness:0.7 }));
            frame.position.y = beltH;
            frame.castShadow = true;
            group.add(frame);
            // Legs
            for (const lx of [-beltW/2+0.15, 0, beltW/2-0.15]) {
                for (const lz of [-beltD/2+0.1, beltD/2-0.1]) {
                    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, beltH, 0.1),
                        accentMat(metalColor));
                    leg.position.set(lx, beltH/2, lz);
                    group.add(leg);
                }
            }
            // Belt surface (dark rubber)
            const belt = new THREE.Mesh(new THREE.BoxGeometry(beltW - 0.1, 0.06, beltD - 0.2),
                new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.95, metalness: 0.0 }));
            belt.position.y = beltH + 0.1;
            belt.userData._isBelt = true;
            group.add(belt);
            // Rollers at ends
            for (const rx of [-beltW/2+0.1, beltW/2-0.1]) {
                const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, beltD-0.1, 10),
                    accentMat(0x9ca3af));
                roller.rotation.x = Math.PI/2;
                roller.position.set(rx, beltH + 0.12, 0);
                roller.userData._isRoller = true;
                group.add(roller);
            }
            // Direction arrow on belt
            const arrowGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
            const arrow = new THREE.Mesh(arrowGeo, accentMat(0x22c55e));
            arrow.rotation.z = -Math.PI/2;
            arrow.position.set(0, beltH + 0.2, 0);
            group.add(arrow);
            // Side guards
            for (const gz of [-beltD/2, beltD/2]) {
                const guard = new THREE.Mesh(new THREE.BoxGeometry(beltW, 0.25, 0.04),
                    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness:0.5 }));
                guard.position.set(0, beltH + 0.2, gz);
                group.add(guard);
            }
            group.userData._machineH = beltH + 0.4;
            break;
        }
        case 'armoire_1': {
            // Electrical cabinet: tall box with door handle, breaker rows, indicator lights
            const cW = 1.6, cH = 2.4, cD = 0.8;
            const body = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cD),
                new THREE.MeshStandardMaterial({ color: isDark? 0x1c1917 : 0xd4d4d8, roughness:0.5, metalness:0.4 }));
            body.position.y = cH/2;
            body.castShadow = true;
            body.receiveShadow = true;
            group.add(body);
            // Door outline
            const door = new THREE.Mesh(new THREE.BoxGeometry(cW-0.15, cH-0.15, 0.02),
                new THREE.MeshStandardMaterial({ color: isDark? 0x292524 : 0xa8a29e, roughness:0.4, metalness:0.5 }));
            door.position.set(0, cH/2, cD/2+0.01);
            group.add(door);
            // Handle
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06),
                accentMat(0x9ca3af));
            handle.position.set(cW/2-0.2, cH/2, cD/2+0.04);
            group.add(handle);
            // Breaker rows (small rectangles on front)
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 4; c++) {
                    const breaker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.02),
                        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness:0.3, metalness:0.7 }));
                    breaker.position.set(-0.35 + c*0.25, cH*0.3 + r*0.25, cD/2+0.02);
                    group.add(breaker);
                }
            }
            // Top indicator lights
            for (let i = 0; i < 3; i++) {
                const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
                    new THREE.MeshStandardMaterial({ color: [0x10b981, 0xfbbf24, 0xef4444][i], emissive: [0x10b981, 0xfbbf24, 0xef4444][i], emissiveIntensity: i === 0 ? 0.9 : 0.15 }));
                light.position.set(-0.3 + i*0.3, cH - 0.15, cD/2+0.02);
                light.userData._isCabinetLed = true;
                light.userData._ledIdx = i;
                group.add(light);
            }
            // Warning label
            const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness:0.9 }));
            label.position.set(0, cH*0.7, cD/2+0.015);
            group.add(label);
            // Lightning bolt on label (triangle)
            const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 3),
                new THREE.MeshStandardMaterial({ color: 0x000000 }));
            bolt.position.set(0, cH*0.7, cD/2+0.025);
            group.add(bolt);
            group.userData._machineH = cH;
            break;
        }
        case 'rack_secondaire': {
            // Second server rack — similar to rack_principal but slightly different
            const rW = 1.2, rH = 2.8, rD = 0.9;
            const body = new THREE.Mesh(new THREE.BoxGeometry(rW, rH, rD),
                new THREE.MeshStandardMaterial({ color: isDark? 0x0f172a : 0x475569, roughness:0.4, metalness:0.6 }));
            body.position.y = rH/2;
            body.castShadow = true; body.receiveShadow = true;
            group.add(body);
            for (let s = 0; s < 5; s++) {
                const shelf = new THREE.Mesh(new THREE.BoxGeometry(rW-0.1, 0.06, rD-0.05),
                    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness:0.3, metalness:0.8 }));
                shelf.position.y = 0.35 + s * 0.48;
                group.add(shelf);
            }
            for (let s = 0; s < 5; s++) {
                const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02),
                    new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.7 }));
                led.position.set(-rW/2 + 0.12, 0.4 + s * 0.48, rD/2 + 0.01);
                led.userData._isLed = true;
                group.add(led);
            }
            group.userData._machineH = rH;
            break;
        }
        case 'onduleur': {
            // UPS unit — wide box with battery indicator bars, status panel
            const uW = 1.2, uH = 1.8, uD = 0.8;
            const body = new THREE.Mesh(new THREE.BoxGeometry(uW, uH, uD),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x1c1917 : 0x1e293b, roughness:0.4, metalness:0.5 }));
            body.position.y = uH/2; body.castShadow = true;
            group.add(body);
            // Battery level bars
            for (let i = 0; i < 5; i++) {
                const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.02),
                    new THREE.MeshStandardMaterial({ color: i < 4 ? 0x10b981 : 0x6b7280, emissive: i < 4 ? 0x10b981 : 0x000000, emissiveIntensity: 0.5 }));
                bar.position.set(-0.25 + i * 0.13, uH * 0.7, uD/2 + 0.01);
                bar.userData._isLed = true;
                group.add(bar);
            }
            // Status LED
            const sLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8 }));
            sLed.position.set(0, uH * 0.85, uD/2 + 0.01);
            sLed.userData._isLed = true;
            group.add(sLed);
            // Ventilation slots
            for (let i = 0; i < 4; i++) {
                const slot = new THREE.Mesh(new THREE.BoxGeometry(uW * 0.6, 0.02, 0.02),
                    new THREE.MeshStandardMaterial({ color: 0x374151 }));
                slot.position.set(0, 0.3 + i * 0.12, uD/2 + 0.01);
                group.add(slot);
            }
            group.userData._machineH = uH;
            break;
        }
        case 'climatiseur': {
            // AC indoor unit — wide flat box on wall sim, with fan grille
            const acW = 2.5, acH = 0.8, acD = 0.6;
            // Main body
            const body = new THREE.Mesh(new THREE.BoxGeometry(acW, acH, acD),
                new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness:0.3, metalness:0.2 }));
            body.position.y = 1.8; body.castShadow = true;
            group.add(body);
            // Front grille
            for (let i = 0; i < 6; i++) {
                const grill = new THREE.Mesh(new THREE.BoxGeometry(acW - 0.3, 0.015, 0.02),
                    new THREE.MeshStandardMaterial({ color: 0xd1d5db }));
                grill.position.set(0, 1.55 + i * 0.08, acD/2 + 0.01);
                group.add(grill);
            }
            // Support bracket
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, acD),
                accentMat(0x9ca3af));
            bracket.position.set(-acW/2 + 0.15, 1.4, 0);
            group.add(bracket);
            const bracket2 = bracket.clone();
            bracket2.position.set(acW/2 - 0.15, 1.4, 0);
            group.add(bracket2);
            // Pipe coming out
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6),
                accentMat(0x64748b));
            pipe.position.set(acW/2 - 0.1, 1.0, 0);
            group.add(pipe);
            // Status LED
            const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
                new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8 }));
            led.position.set(acW/2 - 0.2, 2.1, acD/2 + 0.01);
            led.userData._isLed = true;
            group.add(led);
            group.userData._machineH = 2.2;
            break;
        }
        case 'tour_cnc': {
            // CNC lathe — wide base, spindle housing, chuck, control panel
            const bW = 2.4, bH = 1.6, bD = 1.8;
            // Base
            const base = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.5, bD),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x1e3a5f : 0x374151, roughness:0.6, metalness:0.6 }));
            base.position.y = 0.25; base.castShadow = true;
            group.add(base);
            // Main housing
            const housing = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.6, bH - 0.5, bD * 0.8),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0x64748b, roughness:0.4, metalness:0.5 }));
            housing.position.set(-bW * 0.15, 0.5 + (bH-0.5)/2, 0);
            housing.castShadow = true;
            group.add(housing);
            // Spindle (cylinder)
            const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 12),
                accentMat(0x9ca3af));
            spindle.rotation.z = Math.PI/2;
            spindle.position.set(bW * 0.2, 0.9, 0);
            spindle.userData._isRoller = true;
            group.add(spindle);
            // Chuck
            const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.15, 8),
                accentMat(0x6b7280));
            chuck.rotation.z = Math.PI/2;
            chuck.position.set(bW * 0.35, 0.9, 0);
            group.add(chuck);
            // Control panel (angled)
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness:0.3 }));
            panel.position.set(bW/2 - 0.1, 1.2, bD/2 - 0.1);
            panel.rotation.x = -0.3;
            group.add(panel);
            // Screen on panel
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25),
                new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.3 }));
            screen.position.set(bW/2 - 0.1, 1.35, bD/2 - 0.03);
            screen.rotation.x = -0.3;
            group.add(screen);
            // Safety stripe
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.02, 0.06, bD + 0.02),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.2 }));
            stripe.position.y = 0.53;
            group.add(stripe);
            group.userData._machineH = bH;
            break;
        }
        case 'compresseur': {
            // Air compressor — cylindrical tank + motor + gauges
            const tankR = 0.6, tankL = 1.8;
            // Tank (horizontal cylinder)
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(tankR, tankR, tankL, 16),
                new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness:0.3, metalness:0.6 }));
            tank.rotation.z = Math.PI/2;
            tank.position.set(0, tankR + 0.3, 0);
            tank.castShadow = true;
            group.add(tank);
            // Legs
            for (const lx of [-0.6, 0.6]) {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.8),
                    accentMat(0x374151));
                leg.position.set(lx, 0.15, 0);
                group.add(leg);
            }
            // Motor on top
            const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 10),
                accentMat(isDark ? 0x374151 : 0x475569));
            motor.position.set(0.5, tankR*2 + 0.4, 0);
            motor.userData._isRoller = true;
            group.add(motor);
            // Pressure gauge
            const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.2 }));
            gauge.rotation.x = Math.PI/2;
            gauge.position.set(-0.4, tankR + 0.7, tankR - 0.05);
            group.add(gauge);
            const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12),
                new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
            gaugeFace.position.set(-0.4, tankR + 0.7, tankR + 0.01);
            group.add(gaugeFace);
            // Pressure hose
            _pipe(group, 0.7, tankR + 0.3, 0, 0.7, 0.1, 0.5, 0.03, 0x1f2937);
            group.userData._machineH = tankR * 2 + 0.6;
            break;
        }
        case 'poste_soudure': {
            // Welding station — table + welding machine + arm + sparks area
            const tW = 1.8, tH = 0.9, tD = 1.2;
            // Work table
            const table = new THREE.Mesh(new THREE.BoxGeometry(tW, 0.08, tD),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0x78716c, roughness:0.7, metalness:0.6 }));
            table.position.y = tH;
            table.castShadow = true;
            group.add(table);
            // Table legs
            for (const lx of [-tW/2+0.1, tW/2-0.1]) {
                for (const lz of [-tD/2+0.1, tD/2-0.1]) {
                    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, tH, 0.08), accentMat(0x6b7280));
                    leg.position.set(lx, tH/2, lz);
                    group.add(leg);
                }
            }
            // Welding machine (box beside table)
            const welder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.5),
                new THREE.MeshStandardMaterial({ color: 0xef4444, roughness:0.5, metalness:0.4 }));
            welder.position.set(tW/2 + 0.4, 0.4, 0);
            welder.castShadow = true;
            group.add(welder);
            // Welder cable
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6),
                new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
            cable.rotation.z = -0.5;
            cable.position.set(tW/2 + 0.1, 0.9, 0);
            group.add(cable);
            // Welding mask on table
            const mask = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness:0.8 }));
            mask.position.set(-0.3, tH + 0.19, 0.2);
            group.add(mask);
            // Sparks area glow
            const sparkGlow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.6 }));
            sparkGlow.position.set(0.2, tH + 0.15, 0);
            sparkGlow.userData._isLed = true;
            group.add(sparkGlow);
            // Ventilation hood above
            const hood = new THREE.Mesh(new THREE.BoxGeometry(tW + 0.2, 0.06, tD + 0.2),
                accentMat(0x6b7280));
            hood.position.y = 2.2;
            group.add(hood);
            const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8),
                accentMat(0x6b7280));
            duct.position.set(0, 2.7, 0);
            group.add(duct);
            group.userData._machineH = 2.3;
            break;
        }
        case 'armoire_2': {
            // Second electrical cabinet — narrower, different color
            const cW = 1.2, cH = 2.2, cD = 0.7;
            const body = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cD),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x292524 : 0xc4b5a4, roughness:0.5, metalness:0.4 }));
            body.position.y = cH/2; body.castShadow = true; body.receiveShadow = true;
            group.add(body);
            const door = new THREE.Mesh(new THREE.BoxGeometry(cW-0.1, cH-0.1, 0.02),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x1c1917 : 0xa8a29e, roughness:0.4, metalness:0.5 }));
            door.position.set(0, cH/2, cD/2+0.01);
            group.add(door);
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 3; c++) {
                    const breaker = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.02),
                        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness:0.3, metalness:0.7 }));
                    breaker.position.set(-0.2 + c*0.2, cH*0.25 + r*0.2, cD/2+0.02);
                    group.add(breaker);
                }
            }
            for (let i = 0; i < 2; i++) {
                const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8),
                    new THREE.MeshStandardMaterial({ color: [0x10b981, 0xfbbf24][i], emissive: [0x10b981, 0xfbbf24][i], emissiveIntensity: 0.5 }));
                light.position.set(-0.15 + i*0.3, cH - 0.12, cD/2+0.02);
                light.userData._isCabinetLed = true;
                light.userData._ledIdx = i;
                group.add(light);
            }
            group.userData._machineH = cH;
            break;
        }
        case 'transformateur': {
            // Transformer — large box with cooling fins, bushings on top
            const tW = 2.0, tH = 2.0, tD = 1.2;
            const body = new THREE.Mesh(new THREE.BoxGeometry(tW, tH, tD),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x365314 : 0x4d7c0f, roughness:0.5, metalness:0.5 }));
            body.position.y = tH/2; body.castShadow = true;
            group.add(body);
            // Cooling fins on sides
            for (let i = 0; i < 6; i++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, tH - 0.3, 0.6),
                    accentMat(isDark ? 0x3f6212 : 0x65a30d));
                fin.position.set(tW/2 + 0.03, tH/2, -tD/3 + i * (tD*0.7/5));
                group.add(fin);
                const fin2 = fin.clone();
                fin2.position.x = -tW/2 - 0.03;
                group.add(fin2);
            }
            // Bushings on top (porcelain insulators)
            for (let i = 0; i < 3; i++) {
                const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8),
                    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness:0.2, metalness:0.1 }));
                bushing.position.set(-0.4 + i * 0.4, tH + 0.25, 0);
                group.add(bushing);
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8),
                    accentMat(0x9ca3af));
                cap.position.set(-0.4 + i * 0.4, tH + 0.52, 0);
                group.add(cap);
            }
            // Warning sign
            const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness:0.9 }));
            sign.position.set(0, tH * 0.5, tD/2 + 0.01);
            group.add(sign);
            const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 3),
                new THREE.MeshStandardMaterial({ color: 0x000000 }));
            bolt.position.set(0, tH * 0.5, tD/2 + 0.02);
            group.add(bolt);
            group.userData._machineH = tH + 0.55;
            break;
        }
        case 'groupe_electrogene': {
            // Diesel generator — engine block + alternator + exhaust + fuel tank
            const gW = 2.8, gH = 1.5, gD = 1.4;
            // Base frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(gW, 0.15, gD),
                accentMat(isDark ? 0x374151 : 0x6b7280));
            frame.position.y = 0.08; frame.castShadow = true;
            group.add(frame);
            // Engine block
            const engine = new THREE.Mesh(new THREE.BoxGeometry(gW * 0.55, gH * 0.7, gD * 0.8),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0x334155, roughness:0.5, metalness:0.6 }));
            engine.position.set(-gW * 0.15, 0.15 + gH*0.35, 0);
            engine.castShadow = true;
            group.add(engine);
            // Alternator (cylinder)
            const alt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12),
                accentMat(0x0ea5e9));
            alt.rotation.z = Math.PI/2;
            alt.position.set(gW * 0.25, 0.15 + gH*0.35, 0);
            alt.userData._isRoller = true;
            group.add(alt);
            // Exhaust pipe
            const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8),
                accentMat(0x6b7280));
            exhaust.position.set(-gW * 0.35, gH * 0.7 + 0.6, -gD * 0.3);
            group.add(exhaust);
            // Exhaust cap
            const exCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.08, 8),
                accentMat(0x374151));
            exCap.position.set(-gW * 0.35, gH * 0.7 + 1.2, -gD * 0.3);
            group.add(exCap);
            // Fuel tank
            const fuelTank = new THREE.Mesh(new THREE.BoxGeometry(gW * 0.9, 0.3, gD * 0.6),
                new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness:0.6 }));
            fuelTank.position.set(0, 0.3, gD/2 - 0.1);
            group.add(fuelTank);
            // Control panel
            const cpanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08),
                new THREE.MeshStandardMaterial({ color: 0x1e1e1e }));
            cpanel.position.set(gW/2 - 0.1, 0.8, gD/2 + 0.04);
            group.add(cpanel);
            for (let i = 0; i < 3; i++) {
                const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
                    new THREE.MeshStandardMaterial({ color: [0x10b981, 0xfbbf24, 0xef4444][i], emissive: [0x10b981, 0xfbbf24, 0xef4444][i], emissiveIntensity: 0.5 }));
                led.position.set(gW/2 - 0.2 + i*0.1, 1.0, gD/2 + 0.05);
                led.userData._isLed = true;
                group.add(led);
            }
            group.userData._machineH = gH;
            break;
        }
        default: {
            // Generic machine box
            const gW = 1.6, gH = 1.4, gD = 1.4;
            const body = new THREE.Mesh(new THREE.BoxGeometry(gW, gH, gD),
                new THREE.MeshStandardMaterial({ color: bodyColor, roughness:0.5, metalness:0.3 }));
            body.position.y = gH/2;
            body.castShadow = true;
            body.receiveShadow = true;
            group.add(body);
            group.userData._machineH = gH;
            break;
        }
    }

    scene.add(group);
    return group;
}

/* ─── Ensure machine exists in 3D ──────────────────────────────── */
function ensure3DMachine(zone, machine) {
    if (!_3dState.scene) return;
    const key = `${zone}/${machine}`;
    if (_3dState.machineMeshes.has(key)) return;
    const cfg = ZONE_3D_CONFIG[zone];
    if (!cfg) return;
    const pos = get3DMachinePos(zone, machine);
    if (!pos) return;
    const isDark = document.documentElement.classList.contains('dark');

    const group = _buildMachineModel(_3dState.scene, machine, pos, isDark);
    const machineH = group.userData._machineH || 1.5;

    // Invisible hitbox for raycaster
    const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, machineH + 0.5, 2.4),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.set(pos.x, machineH / 2, pos.z);
    hitbox.userData = { zone, machine, key };
    _3dState.scene.add(hitbox);

    // Accent strip under machine (glow indicator)
    const stripGeo = new THREE.BoxGeometry(2.0, 0.06, 2.0);
    const stripMat = new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.4, roughness: 0.3 });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(pos.x, 0.03, pos.z);
    _3dState.scene.add(strip);

    _3dState.machineMeshes.set(key, { group, hitbox, strip, machineH, pos, sensors: new Map() });

    // HTML label above machine
    const labelsDiv = document.getElementById('labels-3d');
    if (labelsDiv) {
        const div = document.createElement('div');
        div.className = 'absolute text-[10px] font-bold uppercase tracking-widest text-white pointer-events-none px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm whitespace-nowrap';
        div.textContent = machine.replace(/_/g, ' ');
        div.dataset.key3d = key;
        labelsDiv.appendChild(div);
        _3dState.labelDivs.push({ div, worldPos: new THREE.Vector3(pos.x, machineH + 0.8, pos.z) });
    }
}

/* ─── Update sensor sphere ─────────────────────────────────────── */
function update3DSensor(zone, machine, type, status) {
    if (!_3dState.scene) return;
    const machineKey = `${zone}/${machine}`;
    ensure3DMachine(zone, machine);
    const mData = _3dState.machineMeshes.get(machineKey);
    if (!mData) return;

    const COLOR = { ok: 0x10b981, warn: 0xf59e0b, crit: 0xef4444, idle: 0x6b7280 };
    const EMIT_INT = { ok: 0.3, warn: 0.6, crit: 1.0, idle: 0.05 };
    const col = COLOR[status] || COLOR.idle;
    const emi = EMIT_INT[status] || 0.05;

    let sphere = mData.sensors.get(type);
    if (!sphere) {
        const allTypes = Object.keys(SENSOR_META);
        const idx = allTypes.indexOf(type);
        const total = allTypes.length || 1;
        const angle = (idx / total) * Math.PI * 2;
        const r = 0.7;
        const sGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const sMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: emi, roughness: 0.15, metalness: 0.15 });
        sphere = new THREE.Mesh(sGeo, sMat);
        sphere.position.set(mData.pos.x + Math.cos(angle) * r, mData.machineH + 0.5, mData.pos.z + Math.sin(angle) * r);
        sphere.userData = { zone, machine, type, machineKey, baseEI: emi };
        sphere.castShadow = true;
        _3dState.scene.add(sphere);
        mData.sensors.set(type, sphere);

        // Sensor stand (thin cylinder from machine top to sphere)
        _pipe(_3dState.scene, mData.pos.x + Math.cos(angle)*r, mData.machineH, mData.pos.z + Math.sin(angle)*r,
              mData.pos.x + Math.cos(angle)*r, mData.machineH + 0.4, mData.pos.z + Math.sin(angle)*r, 0.02, 0x6b7280);
    } else {
        sphere.material.color.setHex(col);
        sphere.material.emissive.setHex(col);
        sphere.material.emissiveIntensity = emi;
        sphere.userData.baseEI = emi;
        sphere.scale.setScalar(1);
    }

    // Compute worst status for machine glow
    let worst = 'idle';
    mData.sensors.forEach(s => {
        const ei = s.userData.baseEI || s.material.emissiveIntensity;
        if (ei >= 0.9) worst = 'crit';
        else if (ei >= 0.5 && worst !== 'crit') worst = 'warn';
        else if (ei >= 0.2 && worst !== 'crit' && worst !== 'warn') worst = 'ok';
    });
    const STRIP_EMIT_INT = { crit: 1.0, warn: 0.6, ok: 0.3, idle: 0.1 };
    mData.strip.material.color.setHex(COLOR[worst] || COLOR.idle);
    mData.strip.material.emissive.setHex(COLOR[worst] || COLOR.idle);
    mData.strip.material.emissiveIntensity = STRIP_EMIT_INT[worst];

    // Update stats overlay
    _update3DStats();
}

/* ─── Update 3D stats overlay ──────────────────────────────────── */
function _update3DStats() {
    let ok = 0, warn = 0, crit = 0;
    _3dState.machineMeshes.forEach(mData => {
        mData.sensors.forEach(s => {
            const ei = s.userData.baseEI || 0;
            if (ei >= 0.9) crit++;
            else if (ei >= 0.5) warn++;
            else if (ei >= 0.2) ok++;
        });
    });
    const elOk = document.getElementById('stat-3d-ok');
    const elWarn = document.getElementById('stat-3d-warn');
    const elCrit = document.getElementById('stat-3d-crit');
    if (elOk) elOk.textContent = ok;
    if (elWarn) elWarn.textContent = warn;
    if (elCrit) elCrit.textContent = crit;
}

/* ─── Enhanced tooltip on mouse move ───────────────────────────── */
function on3DMouseMove(e) {
    if (!_3dState.raycaster || !_3dState.camera) return;
    const canvas = document.getElementById('canvas-3d');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    _3dState.mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    _3dState.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    _3dState.raycaster.setFromCamera(_3dState.mouse, _3dState.camera);
    const hitboxes = [];
    _3dState.machineMeshes.forEach(({ hitbox }) => hitboxes.push(hitbox));
    const hits = _3dState.raycaster.intersectObjects(hitboxes);
    const tooltip = document.getElementById('tooltip-3d');

    if (hits.length > 0) {
        const { zone, machine, key } = hits[0].object.userData;
        _3dState.hoveredMachine = key;

        // Header
        document.getElementById('tooltip-3d-title').textContent = machine.replace(/_/g, ' ');
        document.getElementById('tooltip-3d-zone').textContent = ZONES[zone] || zone;

        // Sensor rows
        const sensorsDiv = document.getElementById('tooltip-3d-sensors');
        sensorsDiv.innerHTML = '';
        let worstStatus = 'ok';
        appState.sensors.forEach((sData, sKey) => {
            if (!sKey.startsWith(`${zone}/${machine}/`)) return;
            const type = sKey.split('/')[2];
            const meta = SENSOR_META[type];
            if (!meta) return;
            const val = sData.valEl ? sData.valEl.innerText : '--';
            // Determine status
            let dotColor = 'bg-emerald-500';
            if (sData.statusEl) {
                if (sData.statusEl.className.includes('rose')) { dotColor = 'bg-rose-500'; worstStatus = 'crit'; }
                else if (sData.statusEl.className.includes('amber')) { dotColor = 'bg-amber-500'; if (worstStatus !== 'crit') worstStatus = 'warn'; }
            }
            sensorsDiv.innerHTML += `<div class="flex justify-between items-center gap-4 text-xs">
                <span class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span class="w-1.5 h-1.5 rounded-full ${dotColor} inline-block"></span>${meta.icon} ${meta.name}</span>
                <span class="font-bold tabular-nums text-gray-900 dark:text-white">${val}<span class="text-gray-400 font-normal ml-0.5 text-[10px]">${meta.unit}</span></span>
            </div>`;
        });

        // Footer status
        const statusDot = document.getElementById('tooltip-3d-status-dot');
        const statusText = document.getElementById('tooltip-3d-status-text');
        if (statusDot && statusText) {
            const SC = { ok: ['bg-emerald-500', 'Normal'], warn: ['bg-amber-500', 'Avertissement'], crit: ['bg-rose-500', 'Critique'] };
            statusDot.className = `w-2 h-2 rounded-full ${SC[worstStatus][0]}`;
            statusText.textContent = SC[worstStatus][1];
        }

        // Position tooltip
        const w = canvas.clientWidth;
        const tx = Math.min(e.clientX - rect.left + 18, w - 270);
        tooltip.style.left = tx + 'px';
        tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
        tooltip.classList.remove('hidden');

        // Highlight hitbox
        canvas.style.cursor = 'pointer';
    } else {
        _3dState.hoveredMachine = null;
        tooltip.classList.add('hidden');
        canvas.style.cursor = 'grab';
    }
}

/* ─── Smooth camera animation ──────────────────────────────────── */
let _camAnim = null;
function animateCamera(targetPos, targetLookAt, duration) {
    if (_camAnim) cancelAnimationFrame(_camAnim);
    const cam = _3dState.camera;
    const ctrl = _3dState.controls;
    if (!cam) return;
    const startPos = cam.position.clone();
    const startTarget = ctrl ? ctrl.target.clone() : new THREE.Vector3(0,0,0);
    const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    const endTarget = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        let t = Math.min(elapsed / duration, 1);
        // Ease out cubic
        t = 1 - Math.pow(1 - t, 3);
        cam.position.lerpVectors(startPos, endPos, t);
        if (ctrl) {
            ctrl.target.lerpVectors(startTarget, endTarget, t);
            ctrl.update();
        }
        if (t < 1) _camAnim = requestAnimationFrame(step);
        else _camAnim = null;
    }
    _camAnim = requestAnimationFrame(step);
}

/* ─── Animation loop ───────────────────────────────────────────── */
let _3dAnimFrame = null;
function startRender3D() {
    if (_3dAnimFrame) return;
    let t = 0;
    const clock = { prev: performance.now() };

    function animate(now) {
        _3dAnimFrame = requestAnimationFrame(animate);
        const dt = (now - clock.prev) / 1000;
        clock.prev = now;
        t += dt;

        // ── Animate machine parts ──
        _3dState.machineMeshes.forEach(({ group, sensors }) => {
            if (!group) return;
            group.children.forEach(child => {
                // Robot rotating base
                if (child.userData._isRotBase) child.rotation.y = t * 1.2;
                // Robot arm sway
                if (child.userData._isArm1) child.rotation.z = Math.sin(t * 0.8) * 0.15;
                // Press ram motion
                if (child.userData._isRam) child.position.y = 1.2 + Math.abs(Math.sin(t * 1.5)) * 0.8;
                // Conveyor roller rotation
                if (child.userData._isRoller) child.rotation.z += dt * 3;
                // Server LED blink
                if (child.userData._isLed) {
                    child.material.emissiveIntensity = 0.4 + Math.sin(t * 4 + child.position.y * 3) * 0.5;
                }
                // Cabinet LED
                if (child.userData._isCabinetLed) {
                    const idx = child.userData._ledIdx;
                    if (idx === 0) child.material.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.3;
                }
            });

            // Pulsate critical sensor spheres
            sensors.forEach(sphere => {
                const ei = sphere.userData.baseEI || 0;
                if (ei >= 0.9) {
                    sphere.material.emissiveIntensity = 0.9 + Math.sin(t * 7) * 0.3;
                    sphere.scale.setScalar(1 + Math.sin(t * 7) * 0.15);
                } else if (ei >= 0.5) {
                    sphere.material.emissiveIntensity = ei + Math.sin(t * 3) * 0.1;
                }
            });
        });

        // ── Animate decorative elements ──
        if (_3dState._fans) {
            _3dState._fans.forEach(fan => { fan.rotation.y += dt * 8; });
        }
        if (_3dState._warningLights) {
            _3dState._warningLights.forEach(light => {
                light.material.emissiveIntensity = 0.3 + Math.sin(t * 4) * 0.7;
            });
        }

        // ── Project HTML labels ──
        if (_3dState.camera) {
            const canvas = document.getElementById('canvas-3d');
            if (canvas) {
                _3dState.labelDivs.forEach(({ div, worldPos }) => {
                    const v = worldPos.clone().project(_3dState.camera);
                    if (v.z < 1) {
                        div.style.left = ((v.x * 0.5 + 0.5) * canvas.clientWidth  - div.offsetWidth / 2) + 'px';
                        div.style.top  = ((-v.y * 0.5 + 0.5) * canvas.clientHeight) + 'px';
                        div.style.display = 'block';
                        // Fade based on distance
                        const dist = _3dState.camera.position.distanceTo(worldPos);
                        div.style.opacity = dist > 30 ? '0' : dist > 20 ? '0.5' : '1';
                    } else {
                        div.style.display = 'none';
                    }
                });
            }
        }

        if (_3dState.controls) _3dState.controls.update();
        if (_3dState.renderer && _3dState.scene && _3dState.camera) {
            _3dState.renderer.render(_3dState.scene, _3dState.camera);
        }
    }
    _3dAnimFrame = requestAnimationFrame(animate);
}

function stopRender3D() {
    if (_3dAnimFrame) { cancelAnimationFrame(_3dAnimFrame); _3dAnimFrame = null; }
    if (_camAnim) { cancelAnimationFrame(_camAnim); _camAnim = null; }
}

/* ─── Build zone structures (walls, roofs, details) ────────────── */
function _buildZoneStructures(scene, isDark) {
    const wallColor = isDark ? 0x1e293b : 0xd1d5db;
    const roofColor = isDark ? 0x0f172a : 0x9ca3af;
    const wallH = 4.0;
    const wallT = 0.12;

    _3dState._fans = [];
    _3dState._warningLights = [];
    const accentMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.6 });

    // ═══════════════════════════════════════════════════════════════
    // ═══ Salle Serveur (enclosed, glass, climate-controlled) ═════
    // ═══════════════════════════════════════════════════════════════
    const ss = ZONE_3D_CONFIG.salle_serveur;
    const ssL = ss.cx - ss.w/2, ssR = ss.cx + ss.w/2;
    const ssF = ss.cz - ss.d/2, ssB = ss.cz + ss.d/2;

    // Walls (translucent)
    _wall(scene, ss.cx, wallH/2, ssF, ss.w, wallH, wallT, wallColor, isDark);
    _wall(scene, ssL, wallH/2, ss.cz, wallT, wallH, ss.d, wallColor, isDark);
    _wall(scene, ssR, wallH/2, ss.cz, wallT, wallH, ss.d, wallColor, isDark);
    _wall(scene, ss.cx, wallH/2, ssB, ss.w, wallH, wallT, wallColor, isDark);

    // Glass panels on all sides
    _glass(scene, ssL + 0.07, wallH/2, ss.cz, 0.06, wallH, ss.d - 0.3, 0x60a5fa);
    _glass(scene, ssR - 0.07, wallH/2, ss.cz, 0.06, wallH, ss.d - 0.3, 0x60a5fa);
    _glass(scene, ss.cx, wallH/2, ssF + 0.07, ss.w - 3, wallH, 0.06, 0x60a5fa);

    // Door frame in front wall
    for (const dx of [-0.7, 0.7]) {
        const df = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.7 }));
        df.position.set(ss.cx + dx, 1.4, ssF);
        scene.add(df);
    }

    // Transparent roof with wireframe
    const ssRoofEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(ss.w, 0.04, ss.d)),
        new THREE.LineBasicMaterial({ color: isDark ? 0x334155 : 0x94a3b8, transparent: true, opacity: 0.4 }));
    ssRoofEdges.position.set(ss.cx, wallH, ss.cz);
    scene.add(ssRoofEdges);
    const ssRoof = new THREE.Mesh(new THREE.BoxGeometry(ss.w, 0.04, ss.d),
        new THREE.MeshStandardMaterial({ color: roofColor, transparent: true, opacity: 0.08, depthWrite: false }));
    ssRoof.position.set(ss.cx, wallH, ss.cz);
    scene.add(ssRoof);

    // Raised floor (data center style)
    const ssFloor = new THREE.Mesh(new THREE.BoxGeometry(ss.w - 0.3, 0.12, ss.d - 0.3),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x1a1a2e : 0xbfdbfe, roughness: 0.8 }));
    ssFloor.position.set(ss.cx, 0.06, ss.cz);
    scene.add(ssFloor);
    // Floor tiles pattern
    for (let tx = 0; tx < 5; tx++) {
        for (let tz = 0; tz < 4; tz++) {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.01, 2.2),
                new THREE.LineBasicMaterial({ color: isDark ? 0x1e293b : 0x93c5fd, transparent: true, opacity: 0.3 }));
            tile.position.set(ssL + 1.3 + tx * 2.3, 0.13, ssF + 1.3 + tz * 2.3);
            scene.add(tile);
        }
    }

    // AC units on roof (x2)
    for (let i = 0; i < 2; i++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.0),
            new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5, metalness: 0.5 }));
        ac.position.set(ss.cx - 2 + i * 4, wallH + 0.3, ss.cz);
        ac.castShadow = true;
        scene.add(ac);
        const fanMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.3, metalness: 0.6 });
        const fan1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.15), fanMat);
        fan1.position.set(ss.cx - 2 + i * 4, wallH + 0.65, ss.cz);
        scene.add(fan1);
        _3dState._fans.push(fan1);
        const fan2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.6), fanMat.clone());
        fan2.position.copy(fan1.position);
        scene.add(fan2);
        _3dState._fans.push(fan2);
    }

    // Ceiling lights (LED strips)
    for (let i = 0; i < 3; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(ss.w - 1, 0.03, 0.15),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: isDark ? 0.6 : 0.3 }));
        strip.position.set(ss.cx, wallH - 0.1, ssF + 2 + i * 3);
        scene.add(strip);
    }

    // Interior point lights
    { const pl = new THREE.PointLight(0x60a5fa, isDark ? 0.5 : 0.3, 14); pl.position.set(ss.cx, wallH - 0.3, ss.cz); scene.add(pl); }

    // Cable management trays on ceiling inside
    for (const cz of [ss.cz - 2, ss.cz + 2]) {
        const tray = new THREE.Mesh(new THREE.BoxGeometry(ss.w - 1, 0.05, 0.4),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0x9ca3af, roughness: 0.4, metalness: 0.5 }));
        tray.position.set(ss.cx, wallH - 0.5, cz);
        scene.add(tray);
    }

    // Fire suppression system (red pipe along ceiling)
    const firePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ss.w - 1, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.6 }));
    firePipe.rotation.z = Math.PI/2;
    firePipe.position.set(ss.cx, wallH - 0.3, ssF + 1);
    scene.add(firePipe);
    // Sprinkler heads
    for (let i = 0; i < 4; i++) {
        const sprinkler = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.08, 6),
            new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        sprinkler.position.set(ssL + 2 + i * 3, wallH - 0.35, ssF + 1);
        scene.add(sprinkler);
    }

    // Access control panel at door
    const acPanel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x1e1e1e }));
    acPanel.position.set(ss.cx + 1.2, 1.3, ssF + 0.1);
    scene.add(acPanel);
    const acLed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8 }));
    acLed.position.set(ss.cx + 1.2, 1.45, ssF + 0.13);
    acLed.userData._isLed = true;
    scene.add(acLed);

    // Fire extinguisher
    const ssExt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    ssExt.position.set(ssR - 0.3, 0.35, ssF + 0.5);
    scene.add(ssExt);

    // ═══════════════════════════════════════════════════════════════
    // ═══ Atelier Principal (industrial, open, large) ═════════════
    // ═══════════════════════════════════════════════════════════════
    const at = ZONE_3D_CONFIG.atelier;
    const atL = at.cx - at.w/2, atR = at.cx + at.w/2;
    const atF = at.cz - at.d/2, atB = at.cz + at.d/2;

    // Walls (translucent)
    _wall(scene, at.cx, wallH/2, atF, at.w, wallH, wallT, wallColor, isDark);
    _wall(scene, atR, wallH/2, at.cz, wallT, wallH, at.d, wallColor, isDark);
    _wall(scene, atL, wallH*0.3, at.cz, wallT, wallH*0.6, at.d, wallColor, isDark);
    // Back wall with rolling door gap
    _wall(scene, at.cx - 4, wallH/2, atB, at.w - 8, wallH, wallT, wallColor, isDark);
    _wall(scene, at.cx + 5, wallH/2, atB, 6, wallH, wallT, wallColor, isDark);
    // Rolling door frame
    const rollingDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: 0.2, depthWrite: false }));
    rollingDoorFrame.position.set(at.cx, wallH/2, atB);
    scene.add(rollingDoorFrame);

    // Roof steel beams (I-beam pattern)
    for (let i = 0; i < 5; i++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(at.w, 0.18, 0.22),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0x78716c, roughness: 0.6, metalness: 0.5 }));
        beam.position.set(at.cx, wallH, atF + 1.5 + i * 2.8);
        scene.add(beam);
    }
    for (let i = 0; i < 3; i++) {
        const cbeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, at.d),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0x78716c, roughness: 0.6, metalness: 0.5 }));
        cbeam.position.set(atL + 3 + i * 5, wallH, at.cz);
        scene.add(cbeam);
    }
    // Diagonal bracing on walls (X pattern)
    for (const xp of [atL + 0.2, atR - 0.2]) {
        const brace1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.5, 0.06),
            accentMat(isDark ? 0x475569 : 0x78716c));
        brace1.rotation.z = 0.6;
        brace1.position.set(xp, wallH/2, at.cz);
        scene.add(brace1);
    }

    // Floor markings — safety zones, walkways, machine areas
    // Central walkway
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(at.w - 1, 0.01, 1.5),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x1e3a5f : 0xbfdbfe, emissive: isDark ? 0x1e3a5f : 0x000000, emissiveIntensity: 0.1, transparent: true, opacity: 0.5 }));
    walkway.position.set(at.cx, 0.01, at.cz);
    scene.add(walkway);
    // Safety lines (yellow dashed)
    for (const zOff of [-0.8, 0.8]) {
        for (let i = 0; i < 8; i++) {
            const dash = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.01, 0.08),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.2 }));
            dash.position.set(atL + 1.5 + i * 1.8, 0.015, at.cz + zOff);
            scene.add(dash);
        }
    }
    // Machine area outlines (white corners)
    const machineAreas = [
        { x: 1, z: -8, w: 3, d: 3 },
        { x: 5, z: -8, w: 2.5, d: 2.5 },
        { x: 9, z: -8, w: 3, d: 3 },
        { x: 5, z: -3, w: 5, d: 2 },
        { x: 1, z: -3, w: 2.5, d: 2.5 },
        { x: 10, z: -3, w: 2.5, d: 2.5 },
    ];
    machineAreas.forEach(area => {
        const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(area.w, 0.01, area.d)),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
        outline.position.set(area.x, 0.02, area.z);
        scene.add(outline);
    });

    // Overhead crane rail
    const craneRail = new THREE.Mesh(new THREE.BoxGeometry(at.w - 1, 0.1, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.8 }));
    craneRail.position.set(at.cx, wallH - 0.3, at.cz - 2);
    scene.add(craneRail);
    // Second rail
    const craneRail2 = craneRail.clone();
    craneRail2.position.set(at.cx, wallH - 0.3, at.cz + 2);
    scene.add(craneRail2);
    // Crane bridge between rails
    const craneBridge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 4.3),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.7 }));
    craneBridge.position.set(at.cx + 2, wallH - 0.35, at.cz);
    scene.add(craneBridge);
    // Crane hook
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 12, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8 }));
    hook.position.set(at.cx + 2, wallH - 0.8, at.cz);
    hook.rotation.x = Math.PI;
    scene.add(hook);

    // Ceiling lights (industrial pendant)
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 2; j++) {
            const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.15, 8),
                new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.6 }));
            pendant.position.set(atL + 3 + i * 3.5, wallH - 0.5, at.cz - 3 + j * 6);
            scene.add(pendant);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: isDark ? 0.5 : 0.2 }));
            bulb.position.set(atL + 3 + i * 3.5, wallH - 0.6, at.cz - 3 + j * 6);
            scene.add(bulb);
        }
    }

    // Interior lights
    { const pl = new THREE.PointLight(0xfef3c7, isDark ? 0.5 : 0.3, 18); pl.position.set(at.cx, wallH - 0.5, at.cz); scene.add(pl); }
    { const pl = new THREE.PointLight(0xfef3c7, isDark ? 0.3 : 0.15, 12); pl.position.set(atL + 3, wallH - 0.5, at.cz - 3); scene.add(pl); }
    { const pl = new THREE.PointLight(0xfef3c7, isDark ? 0.3 : 0.15, 12); pl.position.set(atR - 3, wallH - 0.5, at.cz + 3); scene.add(pl); }

    // Warning lights on pillars
    for (const pos of [{x: atR - 0.3, z: atF + 0.3}, {x: atL + 0.3, z: atB - 0.3}]) {
        const wl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.5 }));
        wl.position.set(pos.x, wallH - 0.5, pos.z);
        scene.add(wl);
        _3dState._warningLights.push(wl);
    }

    // Tool cabinet
    const toolCab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5, metalness: 0.4 }));
    toolCab.position.set(atR - 0.5, 1.0, atF + 0.5);
    toolCab.castShadow = true;
    scene.add(toolCab);

    // Parts storage shelving
    const shelfUnit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 0.6),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0x9ca3af, roughness: 0.5, metalness: 0.5 }));
    shelfUnit.position.set(atR - 0.5, 1.25, at.cz + 4);
    shelfUnit.castShadow = true;
    scene.add(shelfUnit);
    for (let sh = 0; sh < 4; sh++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.55),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x475569 : 0x78716c }));
        shelf.position.set(atR - 0.5, 0.5 + sh * 0.6, at.cz + 4);
        scene.add(shelf);
    }

    // Pallet stack
    for (let p = 0; p < 2; p++) {
        const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 }));
        pallet.position.set(atL + 1.5, 0.06 + p * 0.15, atB - 1.5);
        scene.add(pallet);
    }
    // Boxes on pallet
    for (let b = 0; b < 3; b++) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35),
            new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 }));
        box.position.set(atL + 1.2 + b * 0.4, 0.5, atB - 1.5);
        scene.add(box);
    }

    // Forklift (simplified)
    const forkBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.3 }));
    forkBody.position.set(atL + 2, 0.5, atF + 2.5);
    forkBody.castShadow = true;
    scene.add(forkBody);
    const forkMast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.5),
        accentMat(0x6b7280));
    forkMast.position.set(atL + 2 + 0.55, 0.9, atF + 2.5);
    scene.add(forkMast);
    // Wheels
    for (const wOff of [{x: -0.35, z: -0.25}, {x: -0.35, z: 0.25}, {x: 0.35, z: 0}]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8),
            new THREE.MeshStandardMaterial({ color: 0x1e1e1e }));
        wheel.rotation.x = Math.PI/2;
        wheel.position.set(atL + 2 + wOff.x, 0.15, atF + 2.5 + wOff.z);
        scene.add(wheel);
    }

    // First aid kit on wall
    const firstAid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    firstAid.position.set(atR - 0.15, 1.5, atF + 3);
    scene.add(firstAid);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
    cross.position.set(atR - 0.15, 1.5, atF + 3 + 0.06);
    scene.add(cross);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
    crossV.position.set(atR - 0.15, 1.5, atF + 3 + 0.06);
    scene.add(crossV);

    // Fire extinguisher
    const atExt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.3 }));
    atExt.position.set(atR - 0.4, 0.25, atF + 0.4);
    scene.add(atExt);
    const atExtTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 }));
    atExtTop.position.set(atR - 0.4, 0.55, atF + 0.4);
    scene.add(atExtTop);

    // Compressed air piping along walls
    _pipe(scene, atL + 0.3, wallH - 0.8, atF + 0.3, atL + 0.3, wallH - 0.8, atB - 0.3, 0.04, 0x3b82f6);
    _pipe(scene, atL + 0.3, wallH - 0.8, atB - 0.3, atR - 0.3, wallH - 0.8, atB - 0.3, 0.04, 0x3b82f6);
    // Drop-down air connections
    for (let i = 0; i < 3; i++) {
        _pipe(scene, atL + 0.3, wallH - 0.8, atF + 3 + i * 3, atL + 0.3, 1.5, atF + 3 + i * 3, 0.03, 0x3b82f6);
    }

    // ═══════════════════════════════════════════════════════════════
    // ═══ Local Électrique (hazardous, restricted) ════════════════
    // ═══════════════════════════════════════════════════════════════
    const le = ZONE_3D_CONFIG.local_elec;
    const leL = le.cx - le.w/2, leR = le.cx + le.w/2;
    const leF = le.cz - le.d/2, leB = le.cz + le.d/2;

    // Walls
    _wall(scene, le.cx, wallH/2, leF, le.w, wallH, wallT, wallColor, isDark);
    _wall(scene, leL, wallH/2, le.cz, wallT, wallH, le.d, wallColor, isDark);
    _wall(scene, leR, wallH/2, le.cz, wallT, wallH, le.d, wallColor, isDark);
    _wall(scene, le.cx - 3, wallH/2, leB, le.w - 6, wallH, wallT, wallColor, isDark);
    _wall(scene, le.cx + 4, wallH/2, leB, 4, wallH, wallT, wallColor, isDark);

    // Metal door
    const leDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.08),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x451a03 : 0x92400e, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.5 }));
    leDoor.position.set(le.cx + 1, 1.4, leB);
    scene.add(leDoor);
    const leDoorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xd4d4d4, metalness: 0.9, roughness: 0.1 }));
    leDoorHandle.position.set(le.cx + 1.7, 1.3, leB + 0.05);
    scene.add(leDoorHandle);

    // Transparent roof with wireframe
    const leRoofEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(le.w, 0.04, le.d)),
        new THREE.LineBasicMaterial({ color: isDark ? 0x334155 : 0x94a3b8, transparent: true, opacity: 0.4 }));
    leRoofEdges.position.set(le.cx, wallH, le.cz);
    scene.add(leRoofEdges);
    const leRoof = new THREE.Mesh(new THREE.BoxGeometry(le.w, 0.04, le.d),
        new THREE.MeshStandardMaterial({ color: roofColor, transparent: true, opacity: 0.08, depthWrite: false }));
    leRoof.position.set(le.cx, wallH, le.cz);
    scene.add(leRoof);

    // Hazard stripes at entrance
    for (let i = 0; i < 8; i++) {
        const hz = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, le.d - 0.5),
            new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xfbbf24 : 0x1f2937, emissive: i % 2 === 0 ? 0xfbbf24 : 0x000000, emissiveIntensity: 0.15 }));
        hz.position.set(leL + 0.3 + i * 0.22, 0.01, le.cz);
        scene.add(hz);
    }
    // Floor hazard boundary (overall)
    const leFloorBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(le.w - 0.5, 0.01, le.d - 0.5)),
        new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.5 }));
    leFloorBorder.position.set(le.cx, 0.02, le.cz);
    scene.add(leFloorBorder);

    // Interior light (warm fluorescent)
    { const pl = new THREE.PointLight(0xfbbf24, isDark ? 0.6 : 0.3, 12); pl.position.set(le.cx, wallH - 0.3, le.cz); scene.add(pl); }
    // Ceiling fluorescent strips
    for (let i = 0; i < 2; i++) {
        const fluor = new THREE.Mesh(new THREE.BoxGeometry(le.w - 2, 0.04, 0.12),
            new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: isDark ? 0.5 : 0.2 }));
        fluor.position.set(le.cx, wallH - 0.1, leF + 2 + i * 4);
        scene.add(fluor);
    }

    // Cable trays on ceiling
    _cableTray(scene, leL + 1, wallH - 0.6, leF + 1, leR - 1, leB - 1, isDark ? 0x374151 : 0x78716c);

    // Bus bar trunking along wall (thick copper colored)
    _pipe(scene, leL + 0.3, 2.5, leF + 0.5, leL + 0.3, 2.5, leB - 0.5, 0.08, 0xb45309);
    _pipe(scene, leL + 0.3, 2.2, leF + 0.5, leL + 0.3, 2.2, leB - 0.5, 0.06, 0xb45309);

    // Earth grounding bar
    const groundBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, le.d - 1),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x16a34a, emissiveIntensity: 0.1 }));
    groundBar.position.set(leL + 0.3, 0.5, le.cz);
    scene.add(groundBar);

    // Warning signs on walls
    for (let i = 0; i < 2; i++) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.9 }));
        sign.position.set(le.cx - 2 + i * 4, 2.2, leF + 0.08);
        scene.add(sign);
        const boltSign = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 3),
            new THREE.MeshStandardMaterial({ color: 0x000000 }));
        boltSign.position.set(le.cx - 2 + i * 4, 2.2, leF + 0.1);
        scene.add(boltSign);
    }

    // Insulation mats on floor (gray rubber)
    for (let i = 0; i < 3; i++) {
        const mat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.03, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.95 }));
        mat.position.set(leL + 2 + i * 3.5, 0.015, le.cz - 1);
        scene.add(mat);
    }

    // Fire extinguisher
    const leExt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    leExt.position.set(leR - 0.3, 0.25, leB - 0.5);
    scene.add(leExt);

    // Emergency stop button on wall
    const eStop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 }));
    eStop.position.set(le.cx + 1, 1.2, leF + 0.08);
    scene.add(eStop);
    const eStopBg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    eStopBg.position.set(le.cx + 1, 1.2, leF + 0.05);
    scene.add(eStopBg);

    // ═══════════════════════════════════════════════════════════════
    // ═══ Inter-zone connections & outdoor elements ═══════════════
    // ═══════════════════════════════════════════════════════════════

    // Cable trays between zones
    _cableTray(scene, ssR, wallH - 0.6, ss.cz, atL, at.cz, isDark ? 0x374151 : 0x78716c);
    _cableTray(scene, ss.cx, wallH - 0.6, ssB, le.cx, leF, isDark ? 0x374151 : 0x78716c);

    // Pipes from salle serveur to local elec (cooling)
    _pipe(scene, ss.cx + 3, 0.3, ssB, le.cx + 3, 0.3, leF, 0.08, 0x3b82f6);
    _pipe(scene, ss.cx + 3.5, 0.3, ssB, le.cx + 3.5, 0.3, leF, 0.06, 0xef4444);

    // Power lines from local elec to atelier (underground represented as floor markings)
    for (let i = 0; i < 3; i++) {
        const powerLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 8),
            new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.1 }));
        powerLine.position.set(leR + 1 + i * 0.15, 0.01, (leF + atB) / 2);
        powerLine.rotation.y = Math.atan2(atL - leR, atB - leF);
        scene.add(powerLine);
    }

    // Outdoor storage container
    const container = new THREE.Mesh(new THREE.BoxGeometry(4, 2.0, 2.0),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6, metalness: 0.4 }));
    container.position.set(16, 1.0, 5);
    container.castShadow = true;
    scene.add(container);
    for (let i = 0; i < 6; i++) {
        const corrLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.8, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x1e40af }));
        corrLine.position.set(14.2 + i * 0.7, 1.0, 5);
        scene.add(corrLine);
    }

    // Second container
    const container2 = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6, metalness: 0.4 }));
    container2.position.set(16, 0.75, 9);
    container2.castShadow = true;
    scene.add(container2);

    // ═══════════════════════════════════════════════════════════════
    // ═══ Parking devant l'usine ═════════════════════════════════
    // ═══════════════════════════════════════════════════════════════
    const parkX = 0, parkZ = 23, parkW = 28, parkD = 9;

    // Asphalte
    const asphalt = new THREE.Mesh(new THREE.BoxGeometry(parkW, 0.06, parkD),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x1a1a2e : 0x6b7280, roughness: 0.95 }));
    asphalt.position.set(parkX, 0.03, parkZ);
    asphalt.receiveShadow = true;
    scene.add(asphalt);

    // Bordures de parking (trottoir)
    for (const side of [-1, 1]) {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(parkW + 0.5, 0.15, 0.25),
            new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0xd1d5db, roughness: 0.8 }));
        curb.position.set(parkX, 0.075, parkZ + side * (parkD / 2 + 0.12));
        scene.add(curb);
    }

    // Places de parking — lignes blanches (10 places)
    const spotCount = 10;
    const spotW = 2.4, spotD = 4.5;
    const startX = parkX - (spotCount * spotW) / 2;
    for (let i = 0; i <= spotCount; i++) {
        const lineX = startX + i * spotW;
        const pLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, spotD),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15 }));
        pLine.position.set(lineX, 0.065, parkZ);
        scene.add(pLine);
    }
    // Ligne de fond de place
    const backLine = new THREE.Mesh(new THREE.BoxGeometry(spotCount * spotW, 0.01, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15 }));
    backLine.position.set(parkX, 0.065, parkZ - spotD / 2);
    scene.add(backLine);

    // Numéros de place (petits carrés)
    for (let i = 0; i < spotCount; i++) {
        const num = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
        num.position.set(startX + i * spotW + spotW / 2, 0.065, parkZ - spotD / 2 + 0.5);
        scene.add(num);
    }

    // Place handicapé (place 1) — logo bleu
    const hcSpot = new THREE.Mesh(new THREE.BoxGeometry(spotW - 0.3, 0.01, spotD - 0.5),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 }));
    hcSpot.position.set(startX + spotW / 2, 0.066, parkZ);
    scene.add(hcSpot);

    // ── Voitures (7 voitures sur 10 places) ──
    function _buildCar(scene, x, z, color, rot) {
        const carG = new THREE.Group();
        // Carrosserie basse
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.9),
            new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 }));
        body.position.set(0, 0.35, 0);
        body.castShadow = true;
        carG.add(body);
        // Cabine (toit)
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.85),
            new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }));
        cabin.position.set(-0.1, 0.7, 0);
        cabin.castShadow = true;
        carG.add(cabin);
        // Vitres
        const winMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 });
        // Pare-brise
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.78), winMat);
        windshield.position.set(0.39, 0.7, 0);
        carG.add(windshield);
        // Lunette arrière
        const rearWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.75), winMat.clone());
        rearWin.position.set(-0.59, 0.68, 0);
        carG.add(rearWin);
        // Vitres latérales
        for (const s of [-1, 1]) {
            const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.04), winMat.clone());
            sideWin.position.set(-0.1, 0.72, s * 0.42);
            carG.add(sideWin);
        }
        // Roues (4)
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.1 });
        for (const wx of [-0.55, 0.55]) {
            for (const wz of [-0.45, 0.45]) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), wheelMat);
                wheel.rotation.x = Math.PI / 2;
                wheel.position.set(wx, 0.18, wz);
                carG.add(wheel);
                const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 6), rimMat);
                rim.rotation.x = Math.PI / 2;
                rim.position.set(wx, 0.18, wz);
                carG.add(rim);
            }
        }
        // Phares avant
        for (const pz of [-0.3, 0.3]) {
            const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.18),
                new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: 0.2 }));
            headlight.position.set(0.92, 0.35, pz);
            carG.add(headlight);
        }
        // Feux arrière
        for (const pz of [-0.3, 0.3]) {
            const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.15),
                new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.15 }));
            taillight.position.set(-0.92, 0.35, pz);
            carG.add(taillight);
        }
        // Plaque
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.35),
            new THREE.MeshStandardMaterial({ color: 0xffffff }));
        plate.position.set(-0.92, 0.22, 0);
        carG.add(plate);

        carG.position.set(x, 0, z);
        if (rot) carG.rotation.y = rot;
        scene.add(carG);
        return carG;
    }

    // Couleurs variées pour les voitures
    const carColors = [0x1e40af, 0xdc2626, 0x374151, 0xf5f5f4, 0x15803d, 0x7c3aed, 0xb45309];
    const occupiedSpots = [0, 1, 3, 4, 6, 7, 9]; // places occupées (pas toutes)
    occupiedSpots.forEach((spotIdx, i) => {
        const cx = startX + spotIdx * spotW + spotW / 2;
        const cz = parkZ + 0.3;
        // légère variation de position pour le réalisme
        const offX = (Math.sin(spotIdx * 2.7) * 0.15);
        const offZ = (Math.cos(spotIdx * 1.3) * 0.1);
        _buildCar(scene, cx + offX, cz + offZ, carColors[i % carColors.length], Math.PI / 2 + (Math.sin(spotIdx) * 0.05));
    });

    // ── Éléments de parking ──
    // Lampadaires de parking (3) — côté entrée
    for (let i = 0; i < 3; i++) {
        const lx = startX + 3 + i * 9;
        const lz = parkZ - parkD / 2 - 0.8;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 5, 8),
            new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7 }));
        pole.position.set(lx, 2.5, lz);
        scene.add(pole);
        const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7 }));
        lampArm.position.set(lx, 5, lz + 0.5);
        scene.add(lampArm);
        const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.15, 8),
            new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
        lampShade.position.set(lx, 4.95, lz + 1.1);
        scene.add(lampShade);
        const lampLight = new THREE.PointLight(0xfef3c7, isDark ? 0.5 : 0.15, 10);
        lampLight.position.set(lx, 4.8, lz + 1.1);
        scene.add(lampLight);
    }

    // Entrée du parking côté route (z = parkZ - parkD/2)
    const entryZ = parkZ - parkD / 2;

    // Panneau "P" parking
    const pSignPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7 }));
    pSignPole.position.set(startX - 1, 1.5, entryZ - 0.6);
    scene.add(pSignPole);
    const pSign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    pSign.position.set(startX - 1, 2.8, entryZ - 0.6);
    scene.add(pSign);
    const pLetter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pLetter.position.set(startX - 1, 2.8, entryZ - 0.57);
    scene.add(pLetter);

    // Borne de paiement (côté entrée, droite)
    const payStation = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.5 }));
    payStation.position.set(parkX + parkW / 2 - 1, 0.7, entryZ - 0.5);
    scene.add(payStation);
    const payScreen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.3 }));
    payScreen.position.set(parkX + parkW / 2 - 1, 1.1, entryZ - 0.34);
    scene.add(payScreen);

    // Poubelle (côté entrée, gauche)
    const trashCan = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6 }));
    trashCan.position.set(parkX - parkW / 2 + 1, 0.3, entryZ - 0.5);
    scene.add(trashCan);
    const trashLid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    trashLid.position.set(parkX - parkW / 2 + 1, 0.62, entryZ - 0.5);
    scene.add(trashLid);

    // Barrière d'entrée (côté route)
    const barrierPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    barrierPost.position.set(parkX + 5, 0.6, entryZ - 0.3);
    scene.add(barrierPost);
    const barrierArm = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    barrierArm.position.set(parkX + 7, 1.15, entryZ - 0.3);
    scene.add(barrierArm);
    // Bandes rouges/blanches sur la barrière
    for (let b = 0; b < 7; b++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.11),
            new THREE.MeshStandardMaterial({ color: 0xffffff }));
        stripe.position.set(parkX + 5.5 + b * 0.55, 1.15, entryZ - 0.3);
        scene.add(stripe);
    }

    // Outdoor lighting poles
    for (const px of [14, 20]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8),
            new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7 }));
        pole.position.set(px, 2.5, 0);
        scene.add(pole);
        const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
        lampHead.position.set(px, 5, 0);
        scene.add(lampHead);
        const lampBulb = new THREE.PointLight(0xfef3c7, isDark ? 0.3 : 0.1, 10);
        lampBulb.position.set(px, 4.9, 0);
        scene.add(lampBulb);
    }

    // Road / access path markings
    const road = new THREE.Mesh(new THREE.BoxGeometry(30, 0.01, 3),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0x9ca3af, roughness: 0.95 }));
    road.position.set(5, 0.005, 15);
    scene.add(road);
    // Center line dashes
    for (let i = 0; i < 12; i++) {
        const roadDash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.08),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.1 }));
        roadDash.position.set(-8 + i * 2.2, 0.015, 15);
        scene.add(roadDash);
    }

    // Perimeter fence posts
    for (let i = 0; i < 8; i++) {
        const fPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6),
            new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7 }));
        fPost.position.set(-18 + i * 5.5, 1, -12);
        scene.add(fPost);
    }
    // Fence wire
    const fenceWire = new THREE.Mesh(new THREE.BoxGeometry(40, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
    fenceWire.position.set(0, 1.5, -12);
    scene.add(fenceWire);
    const fenceWire2 = fenceWire.clone();
    fenceWire2.position.y = 0.8;
    scene.add(fenceWire2);

    // Company sign
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3, 1.0, 0.08),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0xffffff, roughness: 0.3 }));
    signBoard.position.set(0, 3, -12);
    scene.add(signBoard);
    const signBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(signBoard.geometry),
        new THREE.LineBasicMaterial({ color: 0x3b82f6 }));
    signBorder.position.copy(signBoard.position);
    scene.add(signBorder);

    // Trees / vegetation
    for (const tp of [{x: -18, z: -8}, {x: -18, z: 2}, {x: -18, z: 10}, {x: 20, z: -8}, {x: 20, z: 12}]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x78350f }));
        trunk.position.set(tp.x, 0.75, tp.z);
        scene.add(trunk);
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 }));
        foliage.position.set(tp.x, 2.0, tp.z);
        scene.add(foliage);
    }
}

/* ─── Init 3D View ─────────────────────────────────────────────── */
function init3DView() {
    const canvas = document.getElementById('canvas-3d');
    if (!canvas || !window.THREE) return;

    const page3dEl = document.getElementById('page-3d');
    if (_3dState.scene) {
        // Already built — resize & resume
        const w = page3dEl.clientWidth || window.innerWidth;
        const h = page3dEl.clientHeight || (window.innerHeight - 80);
        _3dState.camera.aspect = w / h;
        _3dState.camera.updateProjectionMatrix();
        _3dState.renderer.setSize(w, h, false);
        startRender3D();
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? 0x0B0F19 : 0xf1f5f9;
    const w = page3dEl.clientWidth || window.innerWidth;
    const h = page3dEl.clientHeight || (window.innerHeight - 80);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.012);
    _3dState.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(5, 22, 28);
    camera.lookAt(0, 0, 0);
    _3dState.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 0.9 : 1.1;
    _3dState.renderer = renderer;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.35 : 0.55));
    // Main directional (sun)
    const sun = new THREE.DirectionalLight(0xfff5e6, isDark ? 0.8 : 1.3);
    sun.position.set(15, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25;
    sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    // Fill
    const fill = new THREE.DirectionalLight(isDark ? 0x4488cc : 0x8899bb, 0.3);
    fill.position.set(-12, 8, -12);
    scene.add(fill);
    // Hemisphere light for natural feel
    scene.add(new THREE.HemisphereLight(isDark ? 0x1e3a5f : 0x87ceeb, isDark ? 0x080c14 : 0x8B7355, 0.25));

    // ── Ground ──
    // Large ground plane
    const groundGeo = new THREE.PlaneGeometry(80, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x0f172a : 0xd1d5db, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Factory floor (slightly raised, colored)
    const factoryFloor = new THREE.Mesh(
        new THREE.BoxGeometry(28, 0.08, 22),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x111827 : 0xcbd5e1, roughness: 0.85 })
    );
    factoryFloor.position.set(-1, 0.04, 0);
    factoryFloor.receiveShadow = true;
    scene.add(factoryFloor);

    // Grid (subtle)
    const grid = new THREE.GridHelper(50, 50, isDark ? 0x1a2332 : 0xbdc3c7, isDark ? 0x151d2a : 0xc8cfd6);
    grid.position.y = 0.01;
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    scene.add(grid);

    // ── Zone pads + labels ──
    Object.entries(ZONE_3D_CONFIG).forEach(([zoneName, cfg]) => {
        // Coloured transparent slab
        const pad = new THREE.Mesh(
            new THREE.BoxGeometry(cfg.w, 0.06, cfg.d),
            new THREE.MeshStandardMaterial({ color: cfg.color, transparent: true, opacity: isDark ? 0.10 : 0.15, roughness: 0.9 })
        );
        pad.position.set(cfg.cx, 0.05, cfg.cz);
        scene.add(pad);
        _3dState.zonePads[zoneName] = pad; // heatmap reference
        // Border edges
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(pad.geometry),
            new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.5 })
        );
        edges.position.copy(pad.position);
        scene.add(edges);
        // Zone HTML label
        const labelsDiv = document.getElementById('labels-3d');
        if (labelsDiv) {
            const c6 = cfg.color.toString(16).padStart(6, '0');
            const r = parseInt(c6.slice(0,2),16), g = parseInt(c6.slice(2,4),16), b = parseInt(c6.slice(4,6),16);
            const div = document.createElement('div');
            div.className = 'absolute text-[11px] font-extrabold uppercase tracking-widest pointer-events-none px-3 py-1 rounded-full backdrop-blur-sm border whitespace-nowrap';
            div.style.color = `#${c6}`;
            div.style.borderColor = `rgba(${r},${g},${b},0.3)`;
            div.style.backgroundColor = `rgba(${r},${g},${b},0.1)`;
            div.textContent = cfg.label;
            labelsDiv.appendChild(div);
            _3dState.labelDivs.push({ div, worldPos: new THREE.Vector3(cfg.cx, 4.2, cfg.cz - cfg.d/2 - 0.5) });
        }
    });

    // ── Build zone structures (walls, roofs, details) ──
    _buildZoneStructures(scene, isDark);

    // ── OrbitControls ──
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 5;
        controls.maxDistance = 55;
        controls.maxPolarAngle = Math.PI / 2.1;
        controls.target.set(0, 1, 0);
        _3dState.controls = controls;
    }

    // ── Raycaster ──
    _3dState.raycaster = new THREE.Raycaster();
    canvas.addEventListener('mousemove', on3DMouseMove);
    canvas.style.cursor = 'grab';

    // ── Pre-build ALL machines from MACHINE_POS_MAP (populate rooms immediately) ──
    _machineAutoIdx = {};
    Object.keys(MACHINE_POS_MAP).forEach(key => {
        const [zone, machine] = key.split('/');
        ensure3DMachine(zone, machine);
    });

    // ── Sync existing sensors ──
    appState.sensors.forEach((_, sKey) => {
        const parts = sKey.split('/');
        if (parts.length >= 3) ensure3DMachine(parts[0], parts[1]);
    });
    appState.sensors.forEach((sData, sKey) => {
        const parts = sKey.split('/');
        if (parts.length < 3) return;
        const [zone, machine, type] = parts;
        const statusEl = sData.statusEl;
        if (!statusEl) return;
        let status = 'ok';
        if (statusEl.className.includes('rose')) status = 'crit';
        else if (statusEl.className.includes('amber')) status = 'warn';
        update3DSensor(zone, machine, type, status);
    });

    // ── Camera buttons ──
    document.getElementById('btn-3d-reset').addEventListener('click', () => {
        animateCamera({ x:5, y:22, z:28 }, { x:0, y:1, z:0 }, 800);
    });
    document.getElementById('btn-3d-top').addEventListener('click', () => {
        animateCamera({ x:0, y:38, z:0.01 }, { x:0, y:0, z:0 }, 800);
    });

    // Zone focus buttons
    const zoneBtn = (id, zone) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', () => {
            const cfg = ZONE_3D_CONFIG[zone];
            if (!cfg) return;
            animateCamera(
                { x: cfg.cx + 6, y: 10, z: cfg.cz + 8 },
                { x: cfg.cx, y: 1, z: cfg.cz },
                800
            );
        });
    };
    zoneBtn('btn-3d-zone-ss', 'salle_serveur');
    zoneBtn('btn-3d-zone-at', 'atelier');
    zoneBtn('btn-3d-zone-le', 'local_elec');

    // ── Click to focus machine ──
    canvas.addEventListener('click', (e) => {
        if (!_3dState.hoveredMachine) return;
        const mData = _3dState.machineMeshes.get(_3dState.hoveredMachine);
        if (!mData) return;
        animateCamera(
            { x: mData.pos.x + 4, y: mData.machineH + 4, z: mData.pos.z + 5 },
            { x: mData.pos.x, y: mData.machineH / 2, z: mData.pos.z },
            600
        );
    });

    // ── Resize observer ──
    if (_3dState.resizeObs) _3dState.resizeObs.disconnect();
    _3dState.resizeObs = new ResizeObserver(() => {
        if (!_3dState.renderer || !_3dState.camera) return;
        const w2 = page3dEl.clientWidth, h2 = page3dEl.clientHeight;
        if (!w2 || !h2) return;
        _3dState.camera.aspect = w2 / h2;
        _3dState.camera.updateProjectionMatrix();
        _3dState.renderer.setSize(w2, h2, false);
    });
    _3dState.resizeObs.observe(page3dEl);

    startRender3D();
}

// ── RAF message queue ──────────────────────────────────────────────
let _msgQueue = [];
let _rafPending = false;

function processMessage(topic, msgStr) {
    if (!topic.startsWith('factory/')) return;
    const key = topic.substring('factory/'.length);
    try {
        const payload = JSON.parse(msgStr);
        const v = payload.valeur !== undefined ? payload.valeur : payload.value;
        if (v !== undefined && v !== null) {
            if (!appState.sensors.has(key)) {
                const parts = key.split('/');
                if (parts.length >= 3) createCard(key, parts[0], parts[1], parts[2]);
                else return;
            }
            const s = appState.sensors.get(key);
            const meta = SENSOR_META[key.split('/')[2]] || { min: 0, max: 100, name: 'Capteur' };
            const machineName = key.split('/')[1];
            const zone = key.split('/')[0];
            const machine = key.split('/')[1];
            const sensorKey = key.split('/')[2];
            appState.kpis.pointsThisSec++;
            s.valEl.innerText = Number(v).toFixed(1);
            s.timeEl.innerText = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});

            // Trend arrow
            if (s.lastValue !== null) {
                const delta = v - s.lastValue;
                const threshold = (meta.max - meta.min) * 0.01;
                if (delta > threshold)       { s.trendEl.textContent = '↑'; s.trendEl.className = 'text-xs font-bold mb-1 text-rose-400'; }
                else if (delta < -threshold) { s.trendEl.textContent = '↓'; s.trendEl.className = 'text-xs font-bold mb-1 text-sky-400'; }
                else                         { s.trendEl.textContent = '→'; s.trendEl.className = 'text-xs font-bold mb-1 text-gray-400'; }
            }
            s.lastValue = v;
            if (payload.seuil != null) s.seuil = payload.seuil;
            else if (payload.threshold != null) s.seuil = payload.threshold;

            s.history.shift();
            s.history.push(v);
            s.chart.data.datasets[0].data = s.history;
            s.chart.update();

            // ── Energy tracking (puissance sensors, 3s interval) ──
            if (sensorKey === 'puissance') {
                const kwhThisMsg = v * (3 / 3600); // kW * hours
                appState.energyKWh += kwhThisMsg;
                appState.co2Kg += kwhThisMsg * 0.048; // 48g CO2 per kWh (FR mix)
                updateEnergyKPIs();
            }

            // ── Zone temperature heatmap ──
            if (sensorKey === 'temperature') {
                if (!appState._zoneTemps[zone]) appState._zoneTemps[zone] = { sum: 0, count: 0 };
                // Rolling average: replace old contribution
                appState._zoneTemps[zone].sum += v;
                appState._zoneTemps[zone].count++;
                update3DHeatmap();
            }

            // ── Anomaly Z-score badge ──
            const az = computeZScore(s.history);
            if (s.anomalyEl) {
                if (az >= 35) {
                    s.anomalyEl.textContent = az + '% IA';
                    s.anomalyEl.classList.remove('hidden');
                } else {
                    s.anomalyEl.classList.add('hidden');
                }
            }

            // ── Prediction badge ──
            if (s.predictEl) {
                const predSec = predictFailure(s.history, s.seuil);
                if (predSec === 'imminent' || (typeof predSec === 'number' && predSec < 7200)) {
                    const label = predSec === 'imminent' ? 'IMMINENT !' : ('⏱ Seuil ' + formatDuration(predSec));
                    const isRed = predSec === 'imminent' || predSec < 1800;
                    s.predictEl.textContent = label;
                    s.predictEl.className = isRed
                        ? 'text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 whitespace-nowrap flex-shrink-0'
                        : 'text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 whitespace-nowrap flex-shrink-0';
                    s.predictEl.classList.remove('hidden');
                } else {
                    s.predictEl.classList.add('hidden');
                }
            }

            // Progress bar
            const progress = (v - meta.min) / (meta.max - meta.min);
            const pct = Math.max(0, Math.min(100, progress * 100));
            s.progressEl.style.width = pct + '%';

            const now = Date.now();
            const thresholds = getThresholds();
            const sensorType = key.split('/')[2];
            const thr = thresholds[sensorType] || { warn: 0.75, crit: 0.9 };

            if (progress > thr.crit || progress < 0) {
                s.statusEl.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] status-alert mt-1 flex-shrink-0';
                s.card.style.boxShadow = '0 0 0 1.5px rgba(244,63,94,0.4), 0 8px 30px rgba(244,63,94,0.12)';
                s.card.classList.remove('update-flash');
                s.card.classList.add('error-flash');
                if (now - s.lastAlertTime > 5000) {
                    appState.kpis.alertsTotal++;
                    s.alertCount = (s.alertCount || 0) + 1;
                    els.kpiAlerts.innerText = appState.kpis.alertsTotal;
                    const alertMsg = `Dépassement de seuil sur ${machineName} (${v.toFixed(1)} ${meta.unit || ''})`;
                    logEvent('Alerte Critique', alertMsg, 'crit');
                    showToast('🚨 Alerte Critique', alertMsg, 'crit');
                    playAlert(880, 150);
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        new Notification('\uD83D\uDEA8 Alerte Critique — IndustriTech', {
                            body: `${machineName} : ${meta.name || sensorKey} = ${v.toFixed(1)} ${meta.unit || ''}`,
                            tag: key,
                        });
                    }
                    s.lastAlertTime = now;
                    addAlertToHistory(zone, machine, sensorKey, 'crit', v, meta.unit || '');
                }
                update3DSensor(zone, machine, sensorType, 'crit');
            } else if (progress > thr.warn) {
                s.statusEl.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] mt-1 flex-shrink-0';
                s.card.style.boxShadow = '0 0 0 1.5px rgba(245,158,11,0.35), 0 8px 30px rgba(245,158,11,0.08)';
                s.card.classList.remove('error-flash');
                s.card.classList.add('update-flash');
                if (now - s.lastAlertTime > 15000) {
                    const warnMsg = `${machineName} approche la limite (${v.toFixed(1)} ${meta.unit || ''})`;
                    logEvent('Avertissement', warnMsg, 'warn');
                    playAlert(440, 80);
                    s.lastAlertTime = now;
                    addAlertToHistory(zone, machine, sensorKey, 'warn', v, meta.unit || '');
                }
                update3DSensor(zone, machine, sensorType, 'warn');
            } else {
                s.statusEl.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] mt-1 flex-shrink-0';
                s.card.style.boxShadow = '';
                s.card.classList.remove('error-flash');
                s.card.classList.add('update-flash');
                update3DSensor(zone, machine, sensorType, 'ok');
            }
            setTimeout(() => {
                s.card.classList.remove('update-flash');
                s.card.classList.remove('error-flash');
            }, 700);

            // Update anomaly KPI banner (throttled)
            if (!processMessage._lastAnomalyUpdate || Date.now() - processMessage._lastAnomalyUpdate > 3000) {
                updateAnomalyKPI();
                processMessage._lastAnomalyUpdate = Date.now();
            }
        }
    } catch (e) { }
}

if(window.mqtt) {
    const client = mqtt.connect(CONFIG.wsUrl, {
        username: 'readonly',
        password: 'readonly123',
        reconnectPeriod: 3000,
        connectTimeout: 10000
    });
    client.on('connect', () => {
        els.mqttStatus.innerText = 'Online';
        els.mqttStatus.className = 'text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400';
        els.mqttDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
        els.mqttPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
        client.subscribe('factory/#');
        logEvent('Réseau', 'Connexion MQTT WebSocket établie', 'info');
    });

    client.on('message', (topic, message) => {
        _msgQueue.push({topic, msg: message.toString()});
        if (!_rafPending) {
            _rafPending = true;
            requestAnimationFrame(() => {
                _rafPending = false;
                const batch = _msgQueue.splice(0);
                batch.forEach(({topic, msg}) => processMessage(topic, msg));
            });
        }
    });

    client.on('close', () => {
        els.mqttStatus.innerText = 'Offline';
        els.mqttStatus.className = 'text-[11px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400';
        els.mqttDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
        els.mqttPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75';
        logEvent('Réseau', 'Perte de la connexion au broker MQTT', 'crit');
    });

    client.on('reconnect', () => {
        appState._reconnectCount++;
        logEvent('Réseau', `Tentative de reconnexion MQTT #${appState._reconnectCount}`, 'warn');
    });
}

// ── Mode button listeners ──────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === 'system') {
            delete localStorage.theme;
            document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
        } else {
            localStorage.theme = mode;
            document.documentElement.classList.toggle('dark', mode === 'dark');
        }
        applyTheme(appState.currentTheme);
    });
});

// ── Uptime counter ─────────────────────────────────────────────────
setInterval(() => {
    const elapsed = Math.floor((Date.now() - appState._sessionStart) / 1000);
    const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    const el = document.getElementById('uptime-text');
    if (el) el.textContent = `uptime ${h}:${m}:${s}`;
}, 1000);

// ── Apply initial theme ────────────────────────────────────────────
applyTheme(appState.currentTheme);
window.applyTheme = applyTheme;

// ── Browser notification permission ───────────────────────────────
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ── Initial InfluxDB pre-load ──────────────────────────────────────
async function loadInitialSensors() {
    try {
        const resp = await fetch('/api/sensors/latest');
        if (!resp.ok) return;
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) return;
        data.forEach(row => {
            processMessage(
                `factory/${row.zone}/${row.machine}/${row.capteur}`,
                JSON.stringify({
                    zone: row.zone, machine: row.machine, capteur: row.capteur,
                    valeur: row.valeur, unite: row.unite,
                    seuil: 0, anomalie: row.anomalie, derive: row.derive,
                })
            );
        });
        logEvent('Système', `${data.length} capteurs pré-chargés depuis InfluxDB`, 'info');
    } catch (e) {
        console.warn('[loadInitialSensors]', e);
    }
}
loadInitialSensors();

// ── Demo failure scenario ──────────────────────────────────────────
window.triggerDemoFailure = async function (machine) {
    try {
        const resp = await fetch('/api/demo/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machine, duration: 30 }),
        });
        if (resp.ok) {
            const d = await resp.json();
            logEvent('Démo', `Scénario de panne : ${d.machine} (${d.zone}) — ${d.duration}s`, 'warn');
            showToast('🎭 Mode Démo', `Dégradation progressive de ${d.machine} sur ${d.duration}s`, 'warn');
        }
    } catch (e) {
        console.error('[triggerDemoFailure]', e);
    }
};
};
