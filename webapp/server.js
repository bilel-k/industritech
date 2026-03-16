'use strict';

const express      = require('express');
const axios        = require('axios');
const cors         = require('cors');
const morgan       = require('morgan');
const path         = require('path');
const net          = require('net');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const mqttLib      = require('mqtt');

const app = express();

// ── Sécurité : Headers HTTP (XSS, clickjacking, sniffing…) ───────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      styleSrc:       ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      fontSrc:        ["'self'", 'fonts.gstatic.com', 'fonts.googleapis.com'],
      imgSrc:         ["'self'", 'data:'],
      connectSrc:     ["'self'", 'ws:', 'wss:', 'cdn.jsdelivr.net'],
      workerSrc:      ["'self'", 'blob:'],
      childSrc:       ["'self'", 'blob:'],
      objectSrc:      ["'none'"],
      mediaSrc:       ["'self'"],
      frameSrc:       ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Sécurité : CORS restreint (origines autorisées) ───────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:8080')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Autoriser requêtes sans origin (curl, serveur-à-serveur)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    secLog('CORS_BLOCKED', { origin });
    cb(new Error('CORS non autorisé'));
  },
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Sécurité : Rate limiting (anti-flood) ─────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 120,                   // max 120 req / minute / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans 1 minute.' },
  handler: (req, res, next, options) => {
    secLog('RATE_LIMIT', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});
app.use('/api/', apiLimiter);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('tiny'));
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Journal de sécurité ───────────────────────────────────────────────────────
function secLog(event, data = {}) {
  const entry = { ts: new Date().toISOString(), event, ...data };
  console.warn('[SEC]', JSON.stringify(entry));
}

// ── Validation des paramètres (contre injection Flux) ────────────────────────
const VALID_ZONES     = new Set(['salle_serveur', 'atelier', 'local_elec']);
const VALID_CAPTEURS  = new Set(['temperature', 'humidite', 'vibration', 'courant', 'vitesse', 'luminosite', 'motion', 'distance', 'pression', 'puissance', 'debit', 'niveau_sonore']);
const RE_MACHINE      = /^[\w-]{1,64}$/;
const RE_START        = /^-\d{1,6}[smhd]$/;
const RE_EVERY        = /^\d{1,6}[smh]$/;

function validateParams(req, res, next) {
  const { zone, machine, capteur } = req.params;
  const { start, every }           = req.query;

  if (zone    && !VALID_ZONES.has(zone))     return reject(res, req, 'zone',    zone);
  if (capteur && !VALID_CAPTEURS.has(capteur)) return reject(res, req, 'capteur', capteur);
  if (machine && !RE_MACHINE.test(machine))  return reject(res, req, 'machine', machine);
  if (start   && !RE_START.test(start))      return reject(res, req, 'start',   start);
  if (every   && !RE_EVERY.test(every))      return reject(res, req, 'every',   every);

  next();
}

function reject(res, req, field, value) {
  secLog('INVALID_PARAM', { ip: req.ip, field, value });
  return res.status(400).json({ error: `Paramètre invalide : ${field}` });
}

// ── Config ────────────────────────────────────────────────────────────────────
const INFLUX_URL   = process.env.INFLUX_URL   || 'http://influxdb:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || 'mytoken123superlong';
const INFLUX_ORG   = process.env.INFLUX_ORG   || 'industritech';
const INFLUX_BUCKET= process.env.INFLUX_BUCKET|| 'iot_data';
const PORT         = process.env.PORT          || 8080;

// Vérification TCP pour les services non-HTTP
function tcpCheck(host, port, timeoutMs = 3000) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error',   () => { resolve(false); });
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

// Services externes à monitorer
const SERVICES = [
  { name: 'MQTT Broker',  host: 'mosquitto', port: 1883, type: 'tcp',  url: 'tcp://mosquitto:1883' },
  { name: 'Node-RED',     url: 'http://node-red:1880',   type: 'http' },
  { name: 'InfluxDB',     url: `${INFLUX_URL}/ping`,     type: 'http' },
  { name: 'Grafana',      url: 'http://grafana:3000/api/health', type: 'http' },
];

// ── Helpers Flux ──────────────────────────────────────────────────────────────
async function fluxQuery(query) {
  try {
    const res = await axios.post(
      `${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}`,
      query,
      {
        headers: {
          'Authorization': `Token ${INFLUX_TOKEN}`,
          'Content-Type': 'application/vnd.flux',
          'Accept': 'application/csv',
        },
        timeout: 8000,
      }
    );
    return parseFluxCSV(res.data);
  } catch (e) {
    console.error('Flux query error:', e.message);
    return [];
  }
}

function parseFluxCSV(csv) {
  const lines  = csv.split('\n').filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1)
    .map(line => {
      const vals = line.split(',');
      const obj  = {};
      headers.forEach((h, i) => { obj[h.trim()] = vals[i] ? vals[i].trim() : ''; });
      return obj;
    })
    .filter(r => r._value !== undefined && r._value !== '');
}

// ── API : état des services ───────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  const checks = await Promise.all(
    SERVICES.map(async svc => {
      if (svc.type === 'tcp') {
        const ok = await tcpCheck(svc.host, svc.port);
        return { name: svc.name, url: svc.url, status: ok ? 'up' : 'down', code: ok ? 0 : -1 };
      }
      try {
        const r = await axios.get(svc.url, { timeout: 3000 });
        return { name: svc.name, url: svc.url, status: 'up', code: r.status };
      } catch (e) {
        const code = e.response?.status;
        // 204 = InfluxDB ping ok
        if (code && code < 500) return { name: svc.name, url: svc.url, status: 'up',   code };
        return { name: svc.name, url: svc.url, status: 'down', code: code || 0 };
      }
    })
  );
  res.json(checks);
});

// ── API : dernières valeurs tous les capteurs ─────────────────────────────────
app.get('/api/sensors/latest', async (req, res) => {
  const data = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "machine_data" and r._field == "valeur")
  |> group(columns: ["zone", "machine", "capteur", "unite"])
  |> last()
  |> yield(name: "last")
`);

  const anomData = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "machine_data" and r._field == "anomalie")
  |> group(columns: ["zone", "machine", "capteur"])
  |> last()
`);

  const deriveData = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "machine_data" and r._field == "derive")
  |> group(columns: ["zone", "machine", "capteur"])
  |> last()
`);

  // Construire une map pour enrichir
  const anomMap   = {};
  const deriveMap = {};
  anomData.forEach(r  => { anomMap[`${r.zone}/${r.machine}/${r.capteur}`]   = r._value; });
  deriveData.forEach(r => { deriveMap[`${r.zone}/${r.machine}/${r.capteur}`] = r._value; });

  const result = data.map(r => ({
    zone:     r.zone,
    machine:  r.machine,
    capteur:  r.capteur,
    unite:    r.unite,
    valeur:   parseFloat(r._value),
    anomalie: anomMap[`${r.zone}/${r.machine}/${r.capteur}`] === '1',
    derive:   parseFloat(deriveMap[`${r.zone}/${r.machine}/${r.capteur}`] || 0),
    time:     r._time,
  }));

  res.json(result);
});

// ── API : historique d'un capteur ─────────────────────────────────────────────
app.get('/api/history/:zone/:machine/:capteur', validateParams, async (req, res) => {
  const { zone, machine, capteur } = req.params;
  const start = req.query.start || '-1h';
  const every  = req.query.every || '1m';

  const data = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: ${start})
  |> filter(fn: (r) => r._measurement == "machine_data"
                    and r._field == "valeur"
                    and r.zone == "${zone}"
                    and r.machine == "${machine}"
                    and r.capteur == "${capteur}")
  |> aggregateWindow(every: ${every}, fn: mean, createEmpty: false)
  |> yield(name: "history")
`);

  res.json(data.map(r => ({
    time:  r._time,
    value: parseFloat(r._value),
  })));
});

// ── API : alertes récentes ────────────────────────────────────────────────────
app.get('/api/alerts', validateParams, async (req, res) => {
  const start = req.query.start || '-24h';
  const data  = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: ${start})
  |> filter(fn: (r) => r._measurement == "machine_data"
                    and r._field == "anomalie"
                    and r._value == 1)
  |> group(columns: ["zone", "machine", "capteur"])
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 50)
`);

  // Enrichir avec la valeur réelle au même moment
  res.json(data.map(r => ({
    time:    r._time,
    zone:    r.zone,
    machine: r.machine,
    capteur: r.capteur,
    unite:   r.unite || '',
  })));
});

// ── API : statistiques résumées ───────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const points = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "machine_data" and r._field == "valeur")
  |> group()
  |> count()
`);

  const alerts = await fluxQuery(`
from(bucket: "${INFLUX_BUCKET}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "machine_data"
                    and r._field == "anomalie"
                    and r._value == 1)
  |> group()
  |> count()
`);

  const totalPoints = points[0] ? parseInt(points[0]._value) : 0;
  const totalAlerts = alerts[0] ? parseInt(alerts[0]._value) : 0;

  res.json({
    pointsLastHour: totalPoints,
    alertsLastHour: totalAlerts,
    activeSensors:  8,
    uptime:         process.uptime(),
  });
});

// ── API : scénario démo panne ────────────────────────────────────────────────
const DEMO_SCENARIOS = {
  presse:     [{ c:'vibration', base:2.0, target:9.0, seuil:5.0, u:'mm/s' }, { c:'temperature', base:30, target:46, seuil:40, u:'degC' }],
  robot:      [{ c:'courant',   base:8.0, target:17.0, seuil:15.0, u:'A' },  { c:'vibration', base:1.0, target:5.5, seuil:4.0, u:'mm/s' }],
  compresseur:[{ c:'pression',  base:8.0, target:13.5, seuil:12.0, u:'bar' },{ c:'temperature', base:35, target:53, seuil:50, u:'degC' }],
  onduleur:   [{ c:'puissance', base:4.5, target:9.0,  seuil:8.0, u:'kW' }, { c:'courant', base:12, target:22, seuil:20, u:'A' }],
  default:    [{ c:'vibration', base:1.5, target:8.0,  seuil:5.0, u:'mm/s' },{ c:'temperature', base:28, target:48, seuil:40, u:'degC' }],
};

const ZONE_MAP = { presse:'atelier', robot:'atelier', compresseur:'atelier', tour_cnc:'atelier',
                   poste_soudure:'atelier', convoyeur:'atelier',
                   rack_principal:'salle_serveur', rack_secondaire:'salle_serveur', onduleur:'salle_serveur', climatiseur:'salle_serveur',
                   armoire_1:'local_elec', armoire_2:'local_elec', transformateur:'local_elec', groupe_electrogene:'local_elec' };

app.post('/api/demo/trigger', (req, res) => {
  const { machine = 'presse', duration = 30 } = req.body || {};
  const zone = ZONE_MAP[machine] || 'atelier';
  const sensors = DEMO_SCENARIOS[machine] || DEMO_SCENARIOS.default;
  const totalSteps = Math.max(10, Math.min(60, parseInt(duration) || 30));

  const mqttHost = process.env.MQTT_HOST || 'mosquitto';
  const demoClient = mqttLib.connect(`mqtt://${mqttHost}:1883`, { clientId: 'webapp-demo-' + Date.now() });

  demoClient.on('connect', () => {
    let step = 0;
    const iv = setInterval(() => {
      if (step > totalSteps) { clearInterval(iv); demoClient.end(); return; }
      const progress = step / totalSteps; // 0 → 1
      sensors.forEach(({ c, base, target, seuil, u }) => {
        const valeur = parseFloat((base + (target - base) * progress).toFixed(2));
        const payload = JSON.stringify({
          zone, machine, capteur: c, valeur,
          unite: u, seuil, anomalie: valeur > seuil,
          derive: parseFloat((progress * 0.5).toFixed(3)),
          timestamp: new Date().toISOString(),
        });
        demoClient.publish(`factory/${zone}/${machine}/${c}`, payload, { qos: 1 });
      });
      step++;
    }, 1000);
  });

  demoClient.on('error', err => console.error('[Demo]', err.message));
  res.json({ ok: true, machine, zone, duration: totalSteps });
});

// ── API : Chatbot IA (Groq) ──────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';

const CHAT_SYSTEM_PROMPT = `Tu es un assistant IA intégré à IndustriTech, \
une plateforme de supervision industrielle IoT.

Contexte de l'usine :
- 14 machines réparties en 3 zones :
  • Atelier : presse, robot, compresseur, tour_cnc, poste_soudure, convoyeur
  • Salle Serveur : rack_principal, rack_secondaire, onduleur, climatiseur
  • Local Électrique : armoire_1, armoire_2, transformateur, groupe_electrogene
- 43 capteurs : température, humidité, vibration, courant, vitesse, luminosité,
  pression, puissance, débit, niveau_sonore, motion, distance
- Stack : Mosquitto 2.0 (MQTT/TLS), InfluxDB 2.7, Grafana 10.2, Node-RED 3.1,
  Express.js (port 8080), Three.js 3D
- Pipeline DevSecOps 7 étapes : Lint, SAST, SCA, Secrets, Trivy, ZAP, OPA/Rego

Réponds aux questions sur l'état des machines, anomalies, architecture, sécurité IoT.
Sois concis, professionnel, toujours en français.`;

const chatLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 500)
    return res.status(400).json({ error: 'Message invalide (max 500 caractères)' });
  if (!GROQ_API_KEY)
    return res.status(503).json({ error: 'Chatbot non configuré — ajoutez GROQ_API_KEY dans .env' });

  const messages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({ role: h.role, content: String(h.content).slice(0, 500) })),
    { role: 'user', content: message },
  ];

  try {
    const resp = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model: GROQ_MODEL, messages, max_tokens: 512, temperature: 0.7 },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    res.json({ reply: resp.data.choices[0].message.content });
  } catch (err) {
    console.error('[Chat]', err.response?.data || err.message);
    res.status(502).json({ error: 'Erreur lors de la génération de la réponse' });
  }
});

// ── SPA catch-all ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[IoT WebApp] Démarré sur http://0.0.0.0:${PORT}`);
  console.log(`[IoT WebApp] InfluxDB: ${INFLUX_URL} | org: ${INFLUX_ORG} | bucket: ${INFLUX_BUCKET}`);
});
