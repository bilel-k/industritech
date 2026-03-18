<div align="center">
  <img src="logo-it.png" alt="IndustriTech Logo" width="160"/>

  # IndustriTech — Plateforme IoT de supervision industrielle

  > **Hackathon 2026 · Module 10 : Projet IoT complet**  
  > Stack complète de monitoring IoT en temps réel avec une approche **DevSecOps** intégrée.

  [![CI DevSecOps](https://github.com/bilel-k/industritech/actions/workflows/devsecops.yml/badge.svg)](https://github.com/bilel-k/industritech/actions/workflows/devsecops.yml)
  [![Démo vidéo](https://img.shields.io/badge/Démo-▶%20Voir%20la%20vidéo-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://youtu.be/OvhKvS_-88Q)

  ![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat-square&logo=docker&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
  ![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat-square&logo=python&logoColor=white)
  ![InfluxDB](https://img.shields.io/badge/InfluxDB_2.7-22ADF6?style=flat-square&logo=influxdb&logoColor=white)
  ![Grafana](https://img.shields.io/badge/Grafana_10-F46800?style=flat-square&logo=grafana&logoColor=white)
  ![MQTT](https://img.shields.io/badge/MQTT-Mosquitto-660066?style=flat-square&logo=mqtt&logoColor=white)
  ![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)
  ![OPA](https://img.shields.io/badge/OPA-Policy--as--Code-7D3C98?style=flat-square&logo=openpolicyagent&logoColor=white)
</div>

---

## Présentation

**IndustriTech** est une plateforme de supervision industrielle simulant une usine avec **14 machines**, **43 capteurs** et **3 zones de production**. Elle propose :

- 🏭 Visualisation **3D interactive** (Three.js) de l'atelier
- 📊 Tableaux de bord **temps réel** (Grafana + InfluxDB)
- 🔐 Flux **MQTT sécurisé** (Mosquitto TLS + ACL)
- ⚙️ Logique de traitement (Node-RED)
- 🛡️ **DevSecOps complet** : pipeline CI/CD 7 étapes, conteneurs durcis, policy-as-code

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

| Logo | Service | Image | Port |
|:----:|---------|-------|------|
| ![](https://img.shields.io/badge/-Mosquitto-660066?style=flat-square&logo=mqtt&logoColor=white) | `mosquitto` | `eclipse-mosquitto:2.0` | 1883 (MQTT), 8883 (TLS) |
| ![](https://img.shields.io/badge/-InfluxDB-22ADF6?style=flat-square&logo=influxdb&logoColor=white) | `influxdb` | `influxdb:2.7` | 8086 |
| ![](https://img.shields.io/badge/-Grafana-F46800?style=flat-square&logo=grafana&logoColor=white) | `grafana` | `grafana/grafana:10.2.0` | 3000 |
| ![](https://img.shields.io/badge/-Node--RED-8F0000?style=flat-square&logo=nodered&logoColor=white) | `node-red` | `nodered/node-red:3.1` | 1880 |
| ![](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) | `webapp` | `node:20-alpine` (multi-stage) | 8080 |
| ![](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white) | `simulator` | `python:3.11-slim` | — |

---

## Démarrage rapide

### Prérequis

![Docker](https://img.shields.io/badge/Docker_≥_24-required-2CA5E0?style=flat-square&logo=docker&logoColor=white)
![Make](https://img.shields.io/badge/GNU_Make-required-A42E2B?style=flat-square&logo=gnu&logoColor=white)
![Typst](https://img.shields.io/badge/Typst_0.14+-optionnel-239DAD?style=flat-square)

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

### Pipeline CI/CD

<div align="center">

```
Commit → Lint → SAST → SCA → Secrets → Image scan → DAST → Policy gate
```

[![CI DevSecOps](https://github.com/bilel-k/industritech/actions/workflows/devsecops.yml/badge.svg)](https://github.com/bilel-k/industritech/actions/workflows/devsecops.yml)

</div>

Fichier : [`.github/workflows/devsecops.yml`](.github/workflows/devsecops.yml)

| Étape | Outil | Logo | Seuil bloquant |
|-------|-------|:----:|----------------|
| **Lint** | ESLint (security) + flake8 | ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=flat-square&logo=eslint&logoColor=white) | 0 warning critique |
| **SAST** | Semgrep + Bandit | ![Semgrep](https://img.shields.io/badge/Semgrep-1B2D2A?style=flat-square&logo=semgrep&logoColor=white) | 0 HIGH/CRITICAL |
| **SCA** | npm audit + pip-audit | ![npm](https://img.shields.io/badge/npm_audit-CB3837?style=flat-square&logo=npm&logoColor=white) | 0 CVE HIGH/CRITICAL |
| **Secrets** | Gitleaks | ![Gitleaks](https://img.shields.io/badge/Gitleaks-secrets--scan-red?style=flat-square) | 0 secret détecté |
| **Image scan** | Trivy (SARIF) | ![Trivy](https://img.shields.io/badge/Trivy-1904DA?style=flat-square&logo=aquasecurity&logoColor=white) | 0 CRITICAL fixable |
| **DAST** | OWASP ZAP | ![ZAP](https://img.shields.io/badge/OWASP_ZAP-00549E?style=flat-square&logo=owasp&logoColor=white) | Informatif |
| **Policy gate** | OPA/Rego | ![OPA](https://img.shields.io/badge/OPA-7D3C98?style=flat-square&logo=openpolicyagent&logoColor=white) | `allow = true` requis |

### Hooks pre-commit

```bash
make pre-commit-install   # installe les hooks git locaux
# Inclut : gitleaks, detect-secrets, bandit, eslint, hadolint, trivy
```

### Conteneurs durcis

| Mesure | Détail |
|--------|--------|
| 🔨 **Multi-stage build** | Image finale minimale, sans outils de build |
| 👤 **Non-root** | `appuser` UID 1001 dans les deux conteneurs |
| 💓 **HEALTHCHECK** | Intégré aux Dockerfiles webapp et simulator |
| 🔒 **Install déterministe** | `npm ci --omit=dev --ignore-scripts` |

---

## Fonctionnalités

### Interface Web (port 8080)

| Fonctionnalité | Description |
|----------------|-------------|
| 🏭 **Vue 3D** | Usine Three.js avec 14 machines interactives |
| 📈 **Monitoring temps réel** | Graphiques Chart.js par capteur |
| 🔮 **Prédiction** | Badge de prédiction de panne (modèle heuristique) |
| 🔔 **Push notifications** | Alertes navigateur sur seuil critique |
| 📄 **Export PDF** | Rapport capteur avec jsPDF |
| 💥 **Demo failure** | Simulation de panne sur 6 machines |
| 🌙 **Mode sombre** | Dark mode complet |
| 📚 **Documentation** | PDF technique intégré (v2.1) |

### Sécurité MQTT

- 🔑 Authentification par utilisateurs dédiés (`admin`, `sensor`, `nodered`)
- 📋 ACL par topic (`sensor/+/+/+`, `#` restreint)
- 🔒 TLS port 8883 disponible

---

## Structure du projet

```
.
├── .github/workflows/devsecops.yml    # Pipeline CI/CD 7 étapes
├── .pre-commit-config.yaml            # Hooks git sécurité
├── .gitleaks.toml                     # Règles custom (MQTT, InfluxDB, Node-RED)
├── .hadolint.yaml                     # Lint Dockerfile
├── .zap-rules.tsv                     # Règles OWASP ZAP
├── .trivyignore                       # CVE ignorés (justifiés)
├── logo-it.png                        # Logo IndustriTech
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
│   ├── package-lock.json
│   └── public/
│       ├── index.html                 # SPA Three.js
│       ├── logo-it.png                # Logo interface
│       └── documentation.pdf          # Doc technique v2.1
├── grafana/                           # Dashboards + provisioning
├── mosquitto/                         # Config broker + ACL
├── node-red/                          # Flows IoT
├── influxdb/                          # Config InfluxDB
├── docker-compose.yml
├── Makefile
└── documentation.typ                  # Source doc Typst
```

---

## Documentation technique

La documentation complète (**v2.1**, ~950 Ko) est accessible depuis l'interface web via le bouton **Documentation** ou directement :

```
http://localhost:8080/documentation.pdf
```

Elle couvre : architecture, protocoles, sécurité DevSecOps (STRIDE, OWASP IoT Top 10, pipeline CI/CD, SCA/SAST, scan d'images).

```bash
make docs   # recompile depuis la source Typst
```

---

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète.  
**⚠️ Important** : ne jamais committer le fichier `.env` — il est dans `.gitignore`.

---

<div align="center">
  <img src="logo-it.png" alt="IndustriTech" width="64"/>
  <br/>
  <sub><b>Projet académique — Hackathon 2026</b></sub>
  <br/><br/>

  ![Made with](https://img.shields.io/badge/Made_with-DevSecOps-FF6B6B?style=flat-square)
  ![License](https://img.shields.io/badge/Licence-Académique-lightgrey?style=flat-square)
</div>
