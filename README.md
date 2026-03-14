# IndustriTech — Plateforme IoT de supervision industrielle

> **Hackathon 2026 · Module 10 : Projet IoT complet**  
> Stack complète de monitoring IoT en temps réel avec une approche **DevSecOps** intégrée.

---

## Présentation

**IndustriTech** est une plateforme de supervision industrielle simulant une usine avec **14 machines**, **43 capteurs** et **3 zones de production**. Elle propose :

- Visualisation 3D interactive (Three.js) de l'atelier
- Tableaux de bord temps réel (Grafana + InfluxDB)
- Flux MQTT sécurisé (Mosquitto TLS + ACL)
- Logique de traitement (Node-RED)
- **DevSecOps complet** : pipeline CI/CD sécurisé 7 étapes, conteneurs durcis, policy-as-code

---

## Architecture

```
┌─────────────┐     MQTT/TLS      ┌──────────────┐     Flux      ┌──────────┐
│  Simulateur │ ────────────────▶ │  Mosquitto   │ ────────────▶ │ Node-RED │
│  Python     │                   │  (broker)    │               └────┬─────┘
└─────────────┘                   └──────────────┘                    │ write
                                                                       ▼
┌─────────────────────────────────────────────────────────────┐ ┌──────────┐
│                    Webapp (Express.js)                       │ │ InfluxDB │
│  · Vue 3D Three.js · Graphiques Chart.js · Export PDF       │ │  2.7     │
│  · Prédictions · Push notifs · Demo failure mode            │ └────┬─────┘
└─────────────────────────────────────────────────────────────┘      │ query
                                                                       ▼
                                                               ┌──────────┐
                                                               │ Grafana  │
                                                               │  10.2.0  │
                                                               └──────────┘
```

### Services Docker

| Service | Image | Port |
|---------|-------|------|
| `mosquitto` | `eclipse-mosquitto:2.0` | 1883 (MQTT), 8883 (TLS) |
| `influxdb` | `influxdb:2.7` | 8086 |
| `grafana` | `grafana/grafana:10.2.0` | 3000 |
| `node-red` | `nodered/node-red:3.1` | 1880 |
| `webapp` | `node:20-alpine` (multi-stage) | 8080 |
| `simulator` | `python:3.11-slim` | — |

---

## Démarrage rapide

### Prérequis

- Docker ≥ 24 et Docker Compose ≥ 2.20
- `make` (GNU Make)
- `typst` 0.14+ (optionnel, pour recompiler la documentation)

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/bilel-k/industritech.git
cd industritech

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditez .env et changez TOUS les mots de passe !

# 3. Démarrer la stack
make up

# 4. Attendre ~30s puis accéder à l'interface
xdg-open http://localhost:8080   # Webapp 3D
xdg-open http://localhost:3000   # Grafana
xdg-open http://localhost:1880   # Node-RED
```

### Commandes Make disponibles

```bash
make up              # Démarre tous les services
make down            # Arrête la stack
make logs            # Logs temps réel
make restart         # Redémarre
make build           # Rebuild les images
make test            # Lance les tests d'intégration
make docs            # Recompile la documentation PDF
make clean           # Supprime volumes et images
```

---

## DevSecOps

La plateforme intègre un pipeline de sécurité complet, reflétant une approche **Security-as-Code** :

### Pipeline CI/CD (GitHub Actions)

```
Commit → Lint → SAST → SCA → Secrets → Image scan → DAST → Policy gate → Deploy
```

Fichier : [`.github/workflows/devsecops.yml`](.github/workflows/devsecops.yml)

| Étape | Outil | Seuil bloquant |
|-------|-------|----------------|
| Lint | ESLint (security) + Hadolint | 0 finding critique |
| SAST | Semgrep + Bandit | 0 HIGH/CRITICAL |
| SCA | npm audit + pip-audit | 0 CVE HIGH/CRITICAL |
| Secrets | Gitleaks | 0 secret détecté |
| Image scan | Trivy (SARIF → GitHub Security) | 0 CRITICAL |
| DAST | OWASP ZAP baseline | 0 alerte High |
| Policy gate | OPA/Rego | `allow = true` requis |

### Hooks pre-commit

```bash
make pre-commit-install   # installe les hooks git locaux
# Inclut : gitleaks, detect-secrets, bandit, eslint, hadolint, trivy
```

### Pipeline DevSecOps local (sans CI)

```bash
make devsecops   # lint → sast → audit → secrets-scan → scan-images → policy
```

### Conteneurs durcis

- **Multi-stage build** : image finale minimale (sans outils de build)
- **Non-root** : `appuser` UID 1001 dans les deux conteneurs applicatifs
- **HEALTHCHECK** intégré aux deux Dockerfiles
- **Install déterministe** : `npm ci --omit=dev --ignore-scripts`

---

## Fonctionnalités

### Interface Web (port 8080)

| Fonctionnalité | Description |
|----------------|-------------|
| **Vue 3D** | Usine Three.js avec 14 machines interactives |
| **Monitoring temps réel** | Graphiques Chart.js par capteur |
| **Prédiction** | Badge de prédiction de panne (modèle heuristique) |
| **Push notifications** | Alertes navigateur sur seuil critique |
| **Export PDF** | Rapport capteur avec jsPDF |
| **Demo failure** | Simulation de panne sur 6 machines |
| **Mode sombre** | Dark mode complet |
| **Documentation** | PDF technique intégré (v2.1) |

### Sécurité MQTT

- Authentification par utilisateurs dédiés (`admin`, `sensor`, `nodered`)
- ACL par topic (`sensor/+/+/+`, `#` restreint)
- TLS port 8883 disponible

---

## Structure du projet

```
.
├── .github/workflows/devsecops.yml    # Pipeline CI/CD 7 étapes
├── .pre-commit-config.yaml            # Hooks git sécurité
├── .eslintrc.security.json            # ESLint plugin:security
├── .gitleaks.toml                     # Règles custom (MQTT, InfluxDB, Node-RED)
├── .hadolint.yaml                     # Lint Dockerfile
├── .zap-rules.tsv                     # Règles OWASP ZAP
├── security/
│   └── policies/
│       ├── devsecops.rego             # Policy OPA (7 contrôles)
│       └── project-context.json      # Input OPA
├── simulator/
│   ├── sensor_simulator.py            # Simulateur 43 capteurs
│   ├── Dockerfile                     # Image durcie non-root
│   └── requirements.txt
├── webapp/
│   ├── server.js                      # API Express.js
│   ├── Dockerfile                     # Multi-stage + non-root
│   ├── package.json
│   ├── package-lock.json              # Lockfile (requis pour npm ci)
│   └── public/
│       ├── index.html                 # SPA Three.js
│       └── documentation.pdf          # Doc technique v2.1
├── grafana/                           # Dashboards + provisioning
├── mosquitto/                         # Config broker + ACL
├── node-red/                          # Flows IoT
├── influxdb/                          # Config InfluxDB
├── docker-compose.yml
├── Makefile
├── .env.example                       # Template variables (ne jamais committer .env !)
└── documentation.typ                  # Source doc Typst
```

---

## Documentation technique

La documentation complète (v2.1, ~950 Ko) est accessible depuis l'interface web via le bouton **Documentation** ou directement :

```
http://localhost:8080/documentation.pdf
```

Elle couvre : architecture, protocoles, sécurité DevSecOps (STRIDE, OWASP IoT Top 10, pipeline CI/CD, SCA/SAST, scan d'images).

Pour recompiler :

```bash
make docs
```

---

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète.  
**Important** : ne jamais committer le fichier `.env` — il est dans `.gitignore`.

---

## Licence

Projet académique — Hackathon 2026.
