// ─────────────────────────────────────────────────────────────────────────────
// Documentation Technique — Plateforme IoT IndustriTech
// Hackathon 2026 · Module 10 : Projet IoT complet
// ─────────────────────────────────────────────────────────────────────────────

#set document(
  title: "Plateforme IoT IndustriTech — Documentation Technique",
  author: "Hackathon 2026",
  date: datetime(year: 2026, month: 3, day: 14),
)

// ── Palette ──────────────────────────────────────────────────────────────────
#let clr-navy   = rgb("#0f2744")   // fond titre h1
#let clr-blue   = rgb("#1a3a5c")   // bleu principal
#let clr-mid    = rgb("#2d6a9f")   // bleu moyen h3
#let clr-sky    = rgb("#0ea5e9")   // accent vif
#let clr-light  = rgb("#e8f2fb")   // fond zebre pair
#let clr-white  = rgb("#ffffff")

#set page(
  paper: "a4",
  margin: (top: 2.8cm, bottom: 2.5cm, left: 2.5cm, right: 2cm),
  header: context {
    if counter(page).get().first() > 1 {
      grid(
        columns: (auto, 1fr, auto),
        gutter: 8pt,
        align(horizon)[
          #image("logo-it.png", height: 14pt)
        ],
        align(horizon + left)[
          #set text(size: 8.5pt, fill: clr-mid, weight: "bold")
          Plateforme IoT IndustriTech
        ],
        align(horizon + right)[
          #set text(size: 8.5pt, fill: luma(150))
          Documentation Technique v2.1
        ],
      )
      line(length: 100%, stroke: 0.5pt + clr-sky)
    }
  },
  footer: context {
    if counter(page).get().first() > 1 {
      line(length: 100%, stroke: 0.5pt + luma(220))
      v(2pt)
      grid(
        columns: (1fr, 1fr, 1fr),
        align(horizon + left)[
          #set text(size: 8pt, fill: luma(150))
          IndustriTech IoT
        ],
        align(horizon + center)[
          #set text(size: 8pt, fill: luma(150))
          Hackathon 2026 · Module 10
        ],
        align(horizon + right)[
          #set text(size: 8pt, fill: luma(150))
          Page #counter(page).display("1 / 1", both: true)
        ],
      )
    }
  },
  numbering: "1",
)

#set text(font: "Liberation Sans", size: 10.5pt, lang: "fr")
#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.1.")

// ── H1 : bande navy avec accent sky sur la gauche ────────────────────────────
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  block(sticky: true)[
    v(0.4cm)
    grid(
      columns: (6pt, 1fr),
      gutter: 0pt,
      block(width: 6pt, height: 100%, fill: clr-sky, radius: (top-left: 4pt, bottom-left: 4pt)),
      block(
        width: 100%,
        fill: clr-navy,
        inset: (x: 14pt, y: 11pt),
        radius: (top-right: 6pt, bottom-right: 6pt),
      )[
        #set text(fill: white, weight: "extrabold", size: 13.5pt, tracking: 0.3pt)
        #it
      ],
    )
    v(0.35cm)
  ]
}

// ── H2 : texte bleu + filet dégradé ──────────────────────────────────────────
#show heading.where(level: 2): it => {
  v(0.5cm)
  block(sticky: true)[
    block[
      #set text(fill: clr-blue, weight: "bold", size: 12pt)
      #it
    ]
    v(1pt)
    stack(
      dir: ltr,
      block(width: 40pt, height: 2.5pt, fill: clr-sky, radius: 2pt),
      block(height: 2.5pt, fill: gradient.linear(clr-sky, luma(220)), radius: (top-right: 2pt, bottom-right: 2pt)),
    )
    v(0.2cm)
  ]
}

// ── H3 : tiret sky + texte moyen ─────────────────────────────────────────────
#show heading.where(level: 3): it => {
  v(0.3cm)
  block(sticky: true)[
    grid(
      columns: (10pt, 1fr),
      gutter: 5pt,
      align(horizon)[#block(width: 3pt, height: 11pt, fill: clr-sky, radius: 2pt)],
      align(horizon)[
        #block[
          #set text(fill: clr-mid, weight: "bold", size: 10.5pt)
          #it
        ]
      ],
    )
    v(0.1cm)
  ]
}

// ── Callout boxes ─────────────────────────────────────────────────────────────
#let note-box(body) = block(
  fill: rgb("#eff6ff"), stroke: (left: 3pt + clr-sky),
  inset: (left: 12pt, right: 10pt, top: 9pt, bottom: 9pt),
  radius: (right: 6pt), width: 100%,
)[
  #grid(columns: (auto, 1fr), gutter: 8pt,
    text(size: 14pt)[ℹ],
    text(fill: rgb("#1e40af"))[*Note :* #body],
  )
]

#let warning-box(body) = block(
  fill: rgb("#fffbeb"), stroke: (left: 3pt + rgb("#f59e0b")),
  inset: (left: 12pt, right: 10pt, top: 9pt, bottom: 9pt),
  radius: (right: 6pt), width: 100%,
)[
  #grid(columns: (auto, 1fr), gutter: 8pt,
    text(size: 14pt)[⚠],
    text(fill: rgb("#92400e"))[*Attention :* #body],
  )
]

#let success-box(body) = block(
  fill: rgb("#f0fdf4"), stroke: (left: 3pt + rgb("#22c55e")),
  inset: (left: 12pt, right: 10pt, top: 9pt, bottom: 9pt),
  radius: (right: 6pt), width: 100%,
)[
  #grid(columns: (auto, 1fr), gutter: 8pt,
    text(size: 14pt)[✅],
    text(fill: rgb("#14532d"))[*Succes :* #body],
  )
]

#let tip-box(body) = block(
  fill: rgb("#fdf4ff"), stroke: (left: 3pt + rgb("#a855f7")),
  inset: (left: 12pt, right: 10pt, top: 9pt, bottom: 9pt),
  radius: (right: 6pt), width: 100%,
)[
  #grid(columns: (auto, 1fr), gutter: 8pt,
    text(size: 14pt)[💡],
    text(fill: rgb("#581c87"))[*Astuce :* #body],
  )
]

// ══ PAGE DE TITRE ════════════════════════════════════════════════════════════
#set page(header: none, footer: none)

// Fond décoratif haut de page
#place(top + left, dx: -2.5cm, dy: -0cm,
  block(width: 21cm, height: 12cm,
    fill: gradient.linear(clr-navy, clr-blue, angle: 135deg),
    radius: (bottom-right: 60pt),
  )
)
// Accent sky en haut à droite
#place(top + right, dx: 0cm, dy: -0cm,
  block(width: 3cm, height: 1cm, fill: clr-sky, radius: (bottom-left: 8pt))
)

#v(1.4cm)

// Logo centré sur fond sombre
#align(center)[
  #block(
    fill: white,
    width: 90pt, height: 90pt,
    radius: 18pt,
    stroke: 1.5pt + rgb("#ffffff50"),
  )[
    #place(center + horizon)[
      #image("logo-it.png", width: 72pt)
    ]
  ]
]

#v(0.5cm)

// Titre principal
#align(center)[
  #text(fill: white, size: 30pt, weight: "extrabold", tracking: -0.5pt)[Plateforme IoT]
  #v(2pt)
  #text(fill: white, size: 30pt, weight: "extrabold", tracking: -0.5pt)[IndustriTech]
  #v(8pt)
  #text(fill: clr-sky, size: 13pt, weight: "bold", tracking: 1.5pt)[DOCUMENTATION TECHNIQUE]
  #v(6pt)
  #block(width: 60pt, height: 2pt, fill: clr-sky, radius: 2pt)
]

#v(0.8cm)

// Badges de méta-données
#align(center)[
  #grid(
    columns: (auto, auto, auto),
    gutter: 8pt,
    block(fill: rgb("#ffffff14"), stroke: 0.5pt + rgb("#ffffff28"),
          inset: (x: 14pt, y: 7pt), radius: 20pt)[
      #text(fill: white, size: 9pt, weight: "bold")[Hackathon 2026 · Module 10]
    ],
    block(fill: clr-sky, inset: (x: 14pt, y: 7pt), radius: 20pt)[
      #text(fill: white, size: 9pt, weight: "bold")[v2.1 — 14 mars 2026]
    ],
    block(fill: rgb("#22c55ec8"), inset: (x: 14pt, y: 7pt), radius: 20pt)[
      #text(fill: white, size: 9pt, weight: "bold")[● Production]
    ],
  )
]

#v(1.6cm)

// Métriques clés
#grid(
  columns: (1fr, 1fr, 1fr, 1fr),
  gutter: 0.5cm,
  ..(
    ("43", "Capteurs"),
    ("14", "Machines"),
    ("3", "Zones"),
    ("6", "Services"),
  ).map(((n, label)) => block(
    fill: rgb("#f8fafd"),
    stroke: 0.5pt + luma(215),
    inset: (x: 8pt, y: 12pt),
    radius: 10pt,
    width: 100%,
  )[
    #align(center)[
      #text(fill: clr-sky, size: 22pt, weight: "extrabold")[#n]
      #v(2pt)
      #text(fill: luma(120), size: 8.5pt, weight: "bold", tracking: 0.5pt)[#upper(label)]
    ]
  ])
)

#v(0.8cm)

// Résumé exécutif
#block(
  fill: rgb("#f8fafd"),
  stroke: (left: 3pt + clr-sky),
  inset: (left: 14pt, right: 12pt, top: 12pt, bottom: 12pt),
  radius: (right: 8pt),
  width: 100%,
)[
  #text(weight: "bold", size: 10.5pt, fill: clr-blue)[Resume executif]
  #v(5pt)
  La plateforme *IndustriTech IoT* est un systeme de supervision industrielle en temps reel deploye via Docker Compose. Elle collecte, traite et visualise les donnees de *43 capteurs* repartis sur *14 machines* dans 3 zones d'une usine, via la chaine MQTT → Node-RED → InfluxDB → Webapp. La webapp integre une interface moderne (themes sombre/clair, 6 couleurs) avec vue 3D, cartographie SVG, IA predictive (Z-score, regression lineaire), comparaison multi-machines, alertes push, export PDF/CSV et mode kiosque.
]
#v(0.8cm)
#table(
  columns: (3cm, 2.5cm, 5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  align: (col, row) => if row == 0 { center } else { left },
  text(fill: white, weight: "bold")[Service],
  text(fill: white, weight: "bold")[Port(s)],
  text(fill: white, weight: "bold")[URL],
  [Webapp (supervision)], [8080], [http://localhost:8080],
  [Node-RED], [1880], [http://localhost:1880],
  [InfluxDB], [8086], [http://localhost:8086],
  [Grafana], [3000], [http://localhost:3000],
  [MQTT], [1883 / 8883 / 9001], [Docker interne / TLS / WebSocket],
)

#pagebreak()
#set page(header: auto, footer: auto)

// ─────────────────────────────────────────────────────────────────────────────
= Table des matieres
// ─────────────────────────────────────────────────────────────────────────────

#outline(depth: 2, indent: 1em)

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Architecture generale
// ─────────────────────────────────────────────────────────────────────────────

== Vue d'ensemble

La plateforme repose sur six services Docker communicant via un reseau bridge prive `iot-network` :

#table(
  columns: (2.8cm, 2.5cm, 5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Service],
  text(fill: white, weight: "bold")[Image Docker],
  text(fill: white, weight: "bold")[Role],
  [Mosquitto], [`eclipse-mosquitto:2.0`], [Broker MQTT central -- 3 listeners (1883, 8883, 9001)],
  [Sensor Simulator], [`python:3.11-slim`], [Emulation de 43 capteurs sur 14 machines],
  [Node-RED], [`nodered/node-red:3.1`], [Routage MQTT -> InfluxDB + regles metier],
  [InfluxDB], [`influxdb:2.7`], [Base de donnees series temporelles (bucket `iot_data`)],
  [Grafana], [`grafana/grafana:10.2.0`], [Dashboards de visualisation avances],
  [Webapp], [`node:20-alpine`], [Interface supervision temps reel + IA -- port 8080],
)

== Flux de donnees

```
[Simulateur Python]
     | MQTT publish  factory/{zone}/{machine}/{capteur}
     v
[Mosquitto :1883]
     |  subscribe factory/#
     v
[Node-RED]  --format LineProtocol-->  [InfluxDB :8086]
     |                                        ^
     |  WebSocket MQTT :9001                  | API Flux
     v                                        |
[Webapp :8080] <-- /api/sensors/latest, /api/history --+
```

== Points d'acces

#table(
  columns: (1.8cm, 2cm, 2.5cm, 4.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Port],
  text(fill: white, weight: "bold")[Service],
  text(fill: white, weight: "bold")[Protocole],
  text(fill: white, weight: "bold")[Usage],
  [1880], [Node-RED], [HTTP], [Interface flows],
  [1883], [Mosquitto], [MQTT], [Broker interne Docker],
  [3000], [Grafana], [HTTP], [Dashboards],
  [8080], [Webapp], [HTTP], [Supervision temps reel],
  [8086], [InfluxDB], [HTTP], [API REST + UI],
  [8883], [Mosquitto], [MQTT/TLS], [Clients externes securises],
  [9001], [Mosquitto], [WebSocket], [Connexion MQTT depuis la webapp],
)

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Webapp de supervision -- IndustriTech
// ─────────────────────────────────────────────────────────────────────────────

== Description generale

La webapp (`webapp/`) est une application Node.js/Express servant une SPA vanilla JS avec Tailwind CSS. Elle se connecte directement a Mosquitto via WebSocket (port 9001) pour un affichage en temps reel, et interroge son propre backend (`/api/*`) pour les donnees historiques InfluxDB.

=== Technologies frontend

#table(
  columns: (4cm, 7cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Librairie],
  text(fill: white, weight: "bold")[Role],
  [Tailwind CSS (CDN)], [Styles utilitaires, themes dark/light],
  [MQTT.js], [Connexion WebSocket vers Mosquitto :9001],
  [Chart.js], [Graphiques temps reel (sparklines, historique)],
  [Three.js r128], [Vue 3D de l'usine avec heatmap thermique],
  [jsPDF 2.5.1], [Export rapport PDF],
  [jspdf-autotable 3.6.0], [Tables dans les PDF exportes],
)

== Pages et fonctionnalites

=== Dashboard principal

Affichage en temps reel de :
- *KPIs globaux* : capteurs actifs, points/seconde, nombre d'alertes totales
- *Grille de capteurs* : cartes avec valeur live, sparkline, barre de progression, badge anomalie IA, statut colore (vert/orange/rouge)
- *Journal d'evenements* : log chronologique des connexions, alertes et systeme
- *Compteur energie et CO2* : consommation estimee en kWh et emissions CO2 depuis le debut de session
- *Filtre par zone* : Salle Serveur / Atelier / Local Electrique / Tout
- *Recherche* par nom de capteur ou machine

=== Score de sante predictif

Chaque machine dispose d'un *score de sante [0-100]* calcule en temps reel :

#table(
  columns: (2cm, 2.5cm, 6cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Score],
  text(fill: white, weight: "bold")[Couleur],
  text(fill: white, weight: "bold")[Interpretation],
  [70 -- 100], [Emeraude], [Bon etat, fonctionnement normal],
  [40 -- 69], [Ambre], [Degradation detectee, surveillance recommandee],
  [0 -- 39], [Rouge], [Etat critique -- intervention preventive requise],
)

=== Detection d'anomalies par Z-score (IA)

Calcul de *Z-score glissant* sur l'historique de chaque capteur (40 derniers points). Un badge "*XX% IA*" (violet) apparait lorsque l'ecart a la moyenne est statistiquement significatif.

```
z = |valeur_actuelle - moyenne| / ecart-type
badge = min(99, round(z x 28))  [affiche si z >= 1.25]
```

=== Vue 3D de l'usine

La page *Vue 3D* (Three.js r128) affiche :
- Modele 3D avec les 3 zones colorees (bleu, violet, ambre)
- 14 machines avec *heatmap thermique* dynamique (couleur temperature normalisee)
- Ventilateurs animes en rotation sur les machines concernees
- Lumieres d'avertissement pulsantes (rouge) en cas d'alerte critique
- Survol (tooltip) avec nom et statut de la machine
- Controles OrbitControls (rotation, zoom, panoramique)

=== Cartographie SVG (plan usine)

Page *Cartographie* : plan 2D de l'usine en SVG genere dynamiquement :
- 3 zones delimitees avec couleurs de statut
- 14 machines positionnees avec indicateur colore
- Legende avec statut et comptage des capteurs par machine

=== Comparaison multi-machines

Page *Comparaison* : selection et affichage cote a cote de *2 a 4 machines* :
- Selecteur visuel avec indicateur de statut par machine
- Grille : score de sante, tous les capteurs avec barres de progression et badges IA
- Bouton "Retirer" pour deselectioner une machine

=== Alertes avancees

Page *Alertes* -- historique filtrable de toutes les alertes :
- Filtres par severite (critique / avertissement / info), zone et machine
- Accuse de reception individuel ("Acquitter") et global ("Tout acquitter")
- Badge en temps reel dans la navigation (alertes non acquittees)
- Suppression des alertes acquittees ("Purger acquittees")

=== Page Maintenance

Generation automatique :
- Tableau recapitulatif de l'etat de toutes les machines (score, statut, capteur le plus critique)
- Actions de maintenance recommandees par priorite (CRITIQUE / AVERTISSEMENT / OK)
- Top 3 des capteurs les plus anormaux (Z-score)

=== Export PDF

Rapport complet incluant :
- Resume global (capteurs actifs, alertes, energie, CO2, uptime)
- Tableau de tous les capteurs avec valeur actuelle et statut
- Score de sante par machine
- Rapport d'anomalies IA

=== Apparence et themes

- *Mode sombre / clair / systeme* (persiste en localStorage)
- *6 themes de couleur* : Azure, Emeraude, Violet, Rouge, Ambre, Cyan

=== Mode Kiosque

Defilement automatique entre les pages principales toutes les 30 secondes. Ideal pour affichage mural dans l'usine.

=== Modal d'accueil (onboarding)

Au premier chargement de chaque session, un modal presente les fonctionnalites principales :
- *"Commencer"* : ferme le modal pour la session
- *"Ne plus afficher"* : ferme definitivement (localStorage)

== Architecture backend (server.js)

=== Routes API

#table(
  columns: (4cm, 2cm, 5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Route],
  text(fill: white, weight: "bold")[Methode],
  text(fill: white, weight: "bold")[Description],
  [`/api/status`], [GET], [Statut de tous les services],
  [`/api/sensors/latest`], [GET], [Dernieres valeurs capteurs depuis InfluxDB],
  [`/api/history/:zone/:machine/:capteur`], [GET], [Historique d'un capteur],
  [`/api/alerts`], [GET], [Alertes recentes depuis InfluxDB],
  [`/api/stats`], [GET], [Statistiques globales],
  [`/documentation.pdf`], [GET], [Documentation technique (PDF statique)],
  [`/*`], [GET], [SPA fallback -> `index.html`],
)

=== Securite

- *Helmet.js* -- Headers HTTP (CSP, X-Frame-Options, HSTS)
- *CORS restreint* -- origines autorisees via variable `CORS_ORIGINS`
- *Rate Limiting* -- 120 req/min/IP sur toutes les routes `/api/*`
- *Validation des parametres* -- whitelist regex avant injection dans requetes Flux

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Composants de la plateforme
// ─────────────────────────────────────────────────────────────────────────────

== Mosquitto -- Broker MQTT

=== Role

Mosquitto 2.0 est le broker central. Il expose trois listeners :

#table(
  columns: (2cm, 2.5cm, 3cm, 3.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Port],
  text(fill: white, weight: "bold")[Protocole],
  text(fill: white, weight: "bold")[Auth],
  text(fill: white, weight: "bold")[Usage],
  [1883], [MQTT], [Anonyme], [Docker interne (Node-RED, simulateur)],
  [8883], [MQTT/TLS], [user + pwd], [Clients externes securises],
  [9001], [WebSocket], [Anonyme], [Webapp (MQTT.js direct)],
)

=== Configuration

```ini
listener 1883 0.0.0.0
protocol mqtt
allow_anonymous true

listener 8883 0.0.0.0
protocol mqtt
cafile  /mosquitto/config/ca.crt
certfile /mosquitto/config/mosquitto.crt
keyfile  /mosquitto/config/mosquitto.key
require_certificate false
allow_anonymous false
password_file /mosquitto/config/passwd

listener 9001 0.0.0.0
protocol websockets
allow_anonymous true

persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type all
```

#warning-box[
  Le fichier `passwd` doit etre present avant le demarrage du conteneur. Il est genere par `make certs` avec les comptes `admin:admin123` et `sensor:sensor123`.
]

== Node-RED -- Traitement des flux

=== Architecture des flows

#table(
  columns: (2.5cm, 4cm, 4.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Onglet],
  text(fill: white, weight: "bold")[Role],
  text(fill: white, weight: "bold")[Noeuds principaux],
  [Ingestion], [Collecte MQTT -> InfluxDB], [mqtt-in, function, http request],
  [Automation], [Regles metier + alertes], [mqtt-in, switch, function, mqtt-out],
  [Simulation], [Tests internes], [inject, function, mqtt-out],
)

=== Onglet Automation -- Regles metier

#table(
  columns: (1.5cm, 2cm, 3cm, 4cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 7pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Regle],
  text(fill: white, weight: "bold")[Capteur],
  text(fill: white, weight: "bold")[Condition],
  text(fill: white, weight: "bold")[Action],
  [R1], [Vibration], [> 5.0 mm/s], [Alerte debug + log InfluxDB],
  [R2], [Temperature], [> 40 deg C], [Avertissement debug],
  [R2b], [Temperature], [> 80 deg C], [Alerte critique + log],
  [R3], [Vibration], [> 8.0 mm/s], [Commande STOP machine],
  [R5], [Luminosite], [< 50 lux], [Alerte anomalie + log InfluxDB],
)

== InfluxDB 2 -- Base de donnees temporelle

=== Parametres de configuration

#table(
  columns: (3.5cm, 7cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Parametre],
  text(fill: white, weight: "bold")[Valeur],
  [Organisation], [`industritech`],
  [Bucket principal], [`iot_data`],
  [Token admin], [`mytoken123superlong`],
  [Utilisateur admin], [`admin`],
  [Mot de passe], [`admin123!`],
  [Port], [`8086`],
)

=== Schema de la measurement `machine_data`

```
machine_data
  tags:
    zone     = salle_serveur | atelier | local_elec
    machine  = rack_principal | rack_secondaire | onduleur | climatiseur
              | presse | robot | convoyeur | tour_cnc | compresseur
              | poste_soudure | armoire_1 | armoire_2
              | transformateur | groupe_electrogene
    capteur  = temperature | humidite | vibration | courant | vitesse
              | luminosite | pression | puissance | debit | niveau_sonore
    unite    = degC | % | mm/s | A | m/s | lux | bar | kW | L/min | dB

  fields:
    valeur   (float)    -- valeur mesuree
    seuil    (float)    -- seuil de declenchement alerte
    derive   (float)    -- derive progressive accumulee
    anomalie (integer)  -- 0 ou 1

  timestamp: nanoseconde (precision=ns)
```

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Simulateur de capteurs
// ─────────────────────────────────────────────────────────────────────────────

== Description

Le simulateur Python (`simulator/sensor_simulator.py`) emule *43 capteurs physiques* repartis sur *14 machines* dans les 3 zones de l'usine.

== Zone Salle Serveur -- 10 capteurs, 4 machines

#table(
  columns: (3cm, 2.8cm, 2cm, 1.2cm, 1.2cm, 1.2cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { rgb("#eff6ff") } else { white },
  inset: 6pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold", size: 9pt)[Machine],
  text(fill: white, weight: "bold", size: 9pt)[Capteur],
  text(fill: white, weight: "bold", size: 9pt)[Unite],
  text(fill: white, weight: "bold", size: 9pt)[Base],
  text(fill: white, weight: "bold", size: 9pt)[Seuil],
  text(fill: white, weight: "bold", size: 9pt)[Interv.],
  [rack_principal], [temperature], [deg C], [22.0], [28.0], [5s],
  [rack_principal], [humidite], [%], [45.0], [70.0], [5s],
  [rack_secondaire], [temperature], [deg C], [23.0], [28.0], [5s],
  [rack_secondaire], [humidite], [%], [42.0], [70.0], [5s],
  [rack_secondaire], [puissance], [kW], [2.8], [5.0], [5s],
  [onduleur], [temperature], [deg C], [25.0], [35.0], [8s],
  [onduleur], [puissance], [kW], [4.5], [8.0], [8s],
  [onduleur], [courant], [A], [12.0], [20.0], [8s],
  [climatiseur], [temperature], [deg C], [18.0], [25.0], [10s],
  [climatiseur], [debit], [L/min], [15.0], [5.0\*], [10s],
)
#text(size: 9pt, fill: luma(100))[\* anomalie si valeur < seuil]

== Zone Atelier -- 19 capteurs, 6 machines

#table(
  columns: (3cm, 2.8cm, 2cm, 1.2cm, 1.2cm, 1.2cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { rgb("#f5f0ff") } else { white },
  inset: 6pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold", size: 9pt)[Machine],
  text(fill: white, weight: "bold", size: 9pt)[Capteur],
  text(fill: white, weight: "bold", size: 9pt)[Unite],
  text(fill: white, weight: "bold", size: 9pt)[Base],
  text(fill: white, weight: "bold", size: 9pt)[Seuil],
  text(fill: white, weight: "bold", size: 9pt)[Interv.],
  [presse], [vibration], [mm/s], [2.0], [5.0], [2s],
  [presse], [temperature], [deg C], [30.0], [40.0], [2s],
  [presse], [pression], [bar], [180.0], [250.0], [2s],
  [robot], [courant], [A], [8.0], [15.0], [2s],
  [robot], [vibration], [mm/s], [1.0], [4.0], [2s],
  [robot], [temperature], [deg C], [28.0], [38.0], [3s],
  [convoyeur], [vitesse], [m/s], [1.0], [0.2\*], [2s],
  [convoyeur], [vibration], [mm/s], [0.8], [3.0], [3s],
  [tour_cnc], [vibration], [mm/s], [1.5], [6.0], [2s],
  [tour_cnc], [temperature], [deg C], [32.0], [45.0], [3s],
  [tour_cnc], [courant], [A], [10.0], [18.0], [3s],
  [tour_cnc], [niveau_sonore], [dB], [72.0], [90.0], [3s],
  [compresseur], [pression], [bar], [8.0], [12.0], [4s],
  [compresseur], [temperature], [deg C], [35.0], [50.0], [4s],
  [compresseur], [vibration], [mm/s], [1.2], [5.0], [4s],
  [compresseur], [debit], [L/min], [80.0], [30.0\*], [4s],
  [poste_soudure], [courant], [A], [120.0], [200.0], [3s],
  [poste_soudure], [temperature], [deg C], [40.0], [55.0], [3s],
  [poste_soudure], [luminosite], [lux], [800.0], [1500.0], [5s],
)
#text(size: 9pt, fill: luma(100))[\* anomalie si valeur < seuil]

== Zone Local Electrique -- 14 capteurs, 4 machines

#table(
  columns: (3.5cm, 2.8cm, 2cm, 1.2cm, 1.2cm, 1.2cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { rgb("#fffbeb") } else { white },
  inset: 6pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold", size: 9pt)[Machine],
  text(fill: white, weight: "bold", size: 9pt)[Capteur],
  text(fill: white, weight: "bold", size: 9pt)[Unite],
  text(fill: white, weight: "bold", size: 9pt)[Base],
  text(fill: white, weight: "bold", size: 9pt)[Seuil],
  text(fill: white, weight: "bold", size: 9pt)[Interv.],
  [armoire_1], [luminosite], [lux], [200.0], [50.0\*], [10s],
  [armoire_1], [temperature], [deg C], [25.0], [35.0], [10s],
  [armoire_1], [courant], [A], [30.0], [50.0], [10s],
  [armoire_2], [temperature], [deg C], [26.0], [35.0], [10s],
  [armoire_2], [courant], [A], [25.0], [45.0], [10s],
  [armoire_2], [puissance], [kW], [18.0], [30.0], [10s],
  [transformateur], [temperature], [deg C], [40.0], [65.0], [6s],
  [transformateur], [puissance], [kW], [45.0], [80.0], [6s],
  [transformateur], [vibration], [mm/s], [0.5], [2.0], [6s],
  [transformateur], [niveau_sonore], [dB], [55.0], [75.0], [8s],
  [groupe_electrogene], [temperature], [deg C], [30.0], [50.0], [8s],
  [groupe_electrogene], [vibration], [mm/s], [1.8], [5.0], [8s],
  [groupe_electrogene], [debit], [L/min], [2.0], [0.5\*], [8s],
  [groupe_electrogene], [niveau_sonore], [dB], [65.0], [85.0], [8s],
)
#text(size: 9pt, fill: luma(100))[\* anomalie si valeur < seuil]

== Format du payload MQTT

```json
{
  "zone":      "atelier",
  "machine":   "presse",
  "capteur":   "vibration",
  "valeur":    3.147,
  "unite":     "mm/s",
  "seuil":     5.0,
  "anomalie":  false,
  "derive":    0.05,
  "timestamp": "2026-03-13T09:30:00Z"
}
```

*Topic MQTT :* `factory/{zone}/{machine}/{capteur}`

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Securite
// ─────────────────────────────────────────────────────────────────────────────

== Certificats TLS

```bash
make certs       # genere certs + fichier passwd
```

Cree dans `mosquitto/config/` :
- `ca.key` / `ca.crt` -- cle privee et certificat CA (2048 bits RSA, 10 ans)
- `mosquitto.key` / `mosquitto.crt` -- cle et certificat broker (5 ans, signe par CA)
- `passwd` -- mots de passe Mosquitto (`admin:admin123`, `sensor:sensor123`)

== Authentification

#table(
  columns: (2.8cm, 2.5cm, 3cm, 2.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Service],
  text(fill: white, weight: "bold")[Utilisateur],
  text(fill: white, weight: "bold")[Credential],
  text(fill: white, weight: "bold")[Portee],
  [Mosquitto TLS], [admin], [admin123], [Administration],
  [Mosquitto TLS], [sensor], [sensor123], [Publication capteurs],
  [InfluxDB], [admin], [admin123!], [Administration],
  [InfluxDB API], [(token)], [mytoken123superlong], [API lecture/ecriture],
  [Grafana], [admin], [admin], [Interface web],
  [Node-RED], [(secret)], [iotsecret2026], [Credentials chiffres],
)

== Reseau Docker

Tous les services communiquent via le reseau bridge `iot-network`. Aucun trafic inter-services ne transite par l'interface hote.

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Docker Compose
// ─────────────────────────────────────────────────────────────────────────────

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: iot-mosquitto
    ports: ["1883:1883", "8883:8883", "9001:9001"]
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log

  node-red:
    image: nodered/node-red:3.1
    container_name: iot-nodered
    ports: ["1880:1880"]
    environment:
      - TZ=Europe/Paris
      - NODE_RED_CREDENTIAL_SECRET=iotsecret2026
    depends_on: [mosquitto, influxdb]

  influxdb:
    image: influxdb:2.7
    container_name: iot-influxdb
    ports: ["8086:8086"]
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=admin123!
      - DOCKER_INFLUXDB_INIT_ORG=industritech
      - DOCKER_INFLUXDB_INIT_BUCKET=iot_data
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=mytoken123superlong

  grafana:
    image: grafana/grafana:10.2.0
    container_name: iot-grafana
    ports: ["3000:3000"]
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin

  sensor-simulator:
    build: { context: ./simulator }
    container_name: iot-sensor-sim
    environment:
      - MQTT_HOST=mosquitto
      - MQTT_PORT=1883
      - MQTT_USER=sensor
      - MQTT_PASS=sensor123
    depends_on: [mosquitto]

  webapp:
    build: { context: ./webapp }
    container_name: iot-webapp
    ports: ["8080:8080"]
    environment:
      - INFLUX_URL=http://influxdb:8086
    depends_on: [influxdb, mosquitto]

networks:
  iot-network:
    driver: bridge
    name: iot-network
```

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Makefile -- Reference des commandes
// ─────────────────────────────────────────────────────────────────────────────

#table(
  columns: (3.5cm, 7.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Commande],
  text(fill: white, weight: "bold")[Description],
  [`make init`], [Genere les certificats TLS + structure de dossiers],
  [`make certs`], [Genere uniquement les certificats TLS et le fichier passwd],
  [`make start`], [Demarre tous les services],
  [`make stop`], [Arrete tous les services],
  [`make restart`], [Redemarre tous les services],
  [`make status`], [Affiche l'etat des conteneurs Docker],
  [`make logs`], [Logs en temps reel de tous les services],
  [`make logs-mosquitto`], [Logs Mosquitto uniquement],
  [`make logs-nodered`], [Logs Node-RED uniquement],
  [`make logs-sim`], [Logs du simulateur capteurs],
  [`make mqtt-sub`], [Ecoute tous les topics `factory/#`],
  [`make mqtt-pub-test`], [Publie un message de test MQTT],
  [`make influxdb-query`], [Requete Flux de test sur 5 dernieres minutes],
  [`make test`], [Execute la suite de tests d'integration (18 tests)],
  [`make clean`], [Supprime toutes les donnees persistees (volumes)],
  [`make clean-all`], [Supprime donnees + certificats],
)

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Tests d'integration
// ─────────────────────────────────────────────────────────────────────────────

#table(
  columns: (0.8cm, 5.5cm, 4.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 7pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[N],
  text(fill: white, weight: "bold")[Test],
  text(fill: white, weight: "bold")[Methode],
  [1], [iot-mosquitto est running], [docker ps filter],
  [2], [iot-nodered est running], [docker ps filter],
  [3], [iot-influxdb est running], [docker ps filter],
  [4], [iot-grafana est running], [docker ps filter],
  [5], [Mosquitto MQTT :1883 accessible], [netcat -z -w3],
  [6], [Mosquitto MQTT-TLS :8883 accessible], [netcat -z -w3],
  [7], [Node-RED :1880 accessible], [netcat -z -w3],
  [8], [InfluxDB :8086 accessible], [netcat -z -w3],
  [9], [Grafana :3000 accessible], [netcat -z -w3],
  [10], [InfluxDB ping -> 204], [curl /ping],
  [11], [InfluxDB health = pass], [curl /health + JSON],
  [12], [Grafana API health -> 200], [curl /api/health],
  [13], [MQTT publish reussi], [mosquitto_pub dans le conteneur],
  [14], [Fichier passwd Mosquitto present], [test -f -s],
  [15], [Certificat ca.crt present], [test -f],
  [16], [Certificat mosquitto.crt present], [test -f],
  [17], [Certificat mosquitto.key present], [test -f],
  [18], [flows.json present], [test -f],
)

#success-box[
  Resultat production : *18/18 PASS* -- pipeline complet operationnel.
]

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Exploitation et maintenance
// ─────────────────────────────────────────────────────────────────────────────

== Commandes de diagnostic

```bash
# Donnees InfluxDB en temps reel
curl -s "http://localhost:8086/api/v2/query?org=industritech" \
  -H "Authorization: Token mytoken123superlong" \
  -H "Content-Type: application/vnd.flux" \
  -d 'from(bucket:"iot_data") |> range(start: -5m)
      |> filter(fn:(r)=> r._measurement == "machine_data")
      |> group() |> count() |> sum(column:"_value")'

# Surveiller les messages MQTT
mosquitto_sub -h localhost -p 1883 -t "factory/#" -v

# Logs
make logs               # Tous les services
make logs-mosquitto     # MQTT
docker logs iot-nodered 2>&1 | grep -i error | tail -20
```

== Procedures de maintenance

```bash
make stop                              # Arret (donnees conservees)
make clean                             # Arret + suppression des donnees
docker compose up -d --build webapp    # Redeploy webapp uniquement
docker compose up -d --build sensor-simulator  # Redeploy simulateur
```

== Guide de depannage

#table(
  columns: (3.2cm, 3cm, 4.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { rgb("#fef2f2") } else { white },
  inset: 7pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Symptome],
  text(fill: white, weight: "bold")[Cause probable],
  text(fill: white, weight: "bold")[Solution],
  [Mosquitto ne demarre pas], ["Duplicate password_file"], [`password_file` uniquement dans listener 8883],
  [Permission denied certs], [`chmod 600` trop restrictif], [`chmod 644` sur les `.crt`/`.key`],
  [Grafana permission denied], [Conteneur uid 472], [`sudo chown -R 472:472 grafana/data`],
  [InfluxDB unauthorized], [Token invalide], [Verifier `mytoken123superlong`],
  [Simulateur connexion refusee], [Mosquitto pas encore pret], [`depends_on` deja configure -- attendre],
  [Webapp sans donnees], [MQTT WS non connecte], [Verifier port 9001 / Mosquitto demarre],
  [Bouton webapp sans effet], [Fonction hors scope], [Exposer via `window.maFonction = maFonction`],
)

// ─────────────────────────────────────────────────────────────────────────────
= DevSecOps
// ─────────────────────────────────────────────────────────────────────────────

#tip-box[
  *DevSecOps* = Dev + Sec + Ops. La securite n'est pas une couche rajoutee apres coup : elle est *integree a chaque etape* du cycle de vie — du code source jusqu'au conteneur en production. Cette platforme applique cette philosophie via des controles automatises, une surface d'attaque reduite et des secrets externalises.
]

== Pipeline CI/CD securise

Le pipeline *deploye* (`.github/workflows/devsecops.yml`) integre des *security gates* bloquants en 7 etapes sequentielles :

#block(
  fill: clr-light,
  stroke: (left: 3pt + clr-sky),
  inset: (left: 14pt, right: 12pt, top: 12pt, bottom: 12pt),
  radius: (right: 8pt),
  width: 100%,
)[
#set text(size: 9.5pt)
```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Commit  │──▶│  SAST    │──▶│   SCA    │──▶│  Docker  │──▶│  Deploy  │
│  + lint  │   │ (Semgrep)│   │(npm/pip) │   │  (Trivy) │   │  + DAST  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
      │               │               │               │               │
    ESLint        0 critical       0 HIGH/         Image            OWASP
   Bandit         findings        CRITICAL         signee           ZAP scan
```
]

#table(
  columns: (2.2cm, 2.8cm, 3cm, 3cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Etape],
  text(fill: white, weight: "bold")[Outil],
  text(fill: white, weight: "bold")[Cible],
  text(fill: white, weight: "bold")[Seuil bloquant],
  [Lint / SAST], [ESLint + Semgrep], [Node.js / JS frontend], [0 finding critique],
  [SAST Python], [Bandit], [simulator/], [Severity HIGH = fail],
  [SCA Node], [npm audit], [webapp/package.json], [0 vuln HIGH/CRITICAL],
  [SCA Python], [pip-audit], [requirements.txt], [0 CVE connu],
  [Image scan], [Trivy], [Images Docker buildees], [0 CRITICAL, max 5 HIGH],
  [DAST], [OWASP ZAP], [http://localhost:8080], [0 alerte High],
  [Secrets], [Gitleaks], [Repo complet], [0 secret detecte],
)

=== Fichiers DevSecOps implementes

#table(
  columns: (4.5cm, 6.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Fichier],
  text(fill: white, weight: "bold")[Role],
  [`.github/workflows/devsecops.yml`], [Pipeline GitHub Actions 7 etapes (lint SAST SCA secrets image DAST policy)],
  [`.pre-commit-config.yaml`], [Hooks git pre-commit : Gitleaks, Bandit, ESLint, Hadolint, Trivy],
  [`.eslintrc.security.json`], [Regles ESLint `plugin:security` (injection, eval, regex unsafe)],
  [`simulator/.bandit`], [Config Bandit SAST Python -- severity LOW+],
  [`.gitleaks.toml`], [Regles custom : token InfluxDB, mot de passe MQTT, secret Node-RED],
  [`.hadolint.yaml`], [Lint Dockerfile -- seuil warning, registries de confiance],
  [`.zap-rules.tsv`], [Regle OWASP ZAP baseline (IGNORE/WARN par ID)],
  [`security/policies/devsecops.rego`], [Policy OPA/Rego -- 7 controles bloquants avant deploy],
  [`Makefile` (targets DevSecOps)], [`lint` `sast` `audit` `secrets-scan` `scan-images` `sbom` `policy` `devsecops`],
)

#note-box[
  *Conteneurs durcis* : multi-stage build, utilisateur non-root `appuser` (UID 1001), `HEALTHCHECK` integre, `npm ci --omit=dev --ignore-scripts` pour install deterministe.
]

== Analyse des dependances (SCA)

=== Webapp Node.js -- `npm audit`

#success-box[
  Resultat audit (14 mars 2026) : *0 vulnerabilite* detectee. 7 dependances directes, toutes a jour.
]

#table(
  columns: (3.5cm, 2.5cm, 4.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Paquet],
  text(fill: white, weight: "bold")[Version],
  text(fill: white, weight: "bold")[Role securite],
  [`express`], [^4.18.2], [Framework HTTP -- maintenu activement],
  [`helmet`], [^7.1.0], [Headers securite (CSP, HSTS, X-Frame)],
  [`express-rate-limit`], [^7.2.0], [Protection brute-force / DDoS],
  [`cors`], [^2.8.5], [Controle origines cross-origin],
  [`mqtt`], [^4.3.7], [Client MQTT (scenario demo uniquement)],
  [`axios`], [^1.6.2], [Requetes HTTP vers InfluxDB],
  [`morgan`], [^1.10.0], [Journalisation acces HTTP],
)

=== Simulateur Python -- `pip-audit`

#success-box[
  `paho-mqtt==1.6.1` : *0 CVE* reference. Seule dependance Python du simulateur.
]

== SAST -- Analyse statique du code

=== Regles ESLint (webapp)

Regles de securite actives dans le backend Express :

#table(
  columns: (4.5cm, 6.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Controle],
  text(fill: white, weight: "bold")[Implementation actuelle],
  [Injection (SQL/Flux)], [Whitelist regex `VALID_ZONES`, `VALID_CAPTEURS`, `RE_MACHINE`],
  [Validation des entrees], [`validateParams()` bloquant sur toute route `/api/history`],
  [Rate limiting], [120 req/min/IP via `express-rate-limit`],
  [Headers HTTP], [`helmet()` : CSP, `X-Frame-Options: DENY`, `HSTS`, `nosniff`],
  [Eval / `Function()`], [Absents -- code vanilla sans eval dynamique],
  [Secrets en clair], [Aucun dans le code -- variables d'environnement uniquement],
)

=== Bandit (Python simulator)

```bash
bandit -r simulator/ -ll 2>&1
# >> No issues identified.   (severity >= LOW, confidence >= LOW)
```

== Scan d'image Docker (Trivy)

Integre dans le pipeline CI (`image-scan` job) et disponible via `make scan-images` :

```bash
# Installation Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# Scan de l'image webapp
trivy image --severity HIGH,CRITICAL --exit-code 1 iot-monitoring-webapp:latest

# Scan du simulateur
trivy image --severity HIGH,CRITICAL --exit-code 1 iot-sensor-sim:latest
```

Les images cibles utilisent des bases *distroless-like* (`node:20-alpine`, `python:3.11-slim`) qui minimisent la surface OS :

#table(
  columns: (3.5cm, 3.5cm, 4cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Image],
  text(fill: white, weight: "bold")[Base OS],
  text(fill: white, weight: "bold")[Strategie de reduction],
  [`iot-monitoring-webapp`], [`node:20-alpine`], [Alpine Linux -- moins de 20 paquets OS],
  [`iot-sensor-sim`], [`python:3.11-slim`], [Debian slim -- deps minimales],
  [`eclipse-mosquitto:2.0`], [Alpine], [Image officielle verifiee],
  [`influxdb:2.7`], [Debian slim], [Image officielle verifiee],
  [`grafana:10.2.0`], [Ubuntu minimal], [Image officielle verifiee],
)

== Conformite OWASP IoT Top 10

Application des recommandations OWASP IoT Top 10 (2024) :

#table(
  columns: (0.6cm, 4.2cm, 2.2cm, 4cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: (x: 7pt, y: 7pt), stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[No],
  text(fill: white, weight: "bold")[Risque OWASP IoT],
  text(fill: white, weight: "bold")[Statut],
  text(fill: white, weight: "bold")[Mesure implementee],
  [I1], [Mots de passe faibles par defaut], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [Credentials dans `.env` -- non committes],
  [I2], [Services reseau inutiles], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [Seuls les ports necessaires exposes],
  [I3], [Interfaces non securisees], [#text(fill: rgb("#f59e0b"), weight: "bold")[PARTIEL]], [TLS sur :8883 -- WebSocket :9001 sans TLS local],
  [I4], [Mecanismes de MAJ absents], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [Images versionnees, rebuild CI/CD],
  [I5], [Composants obsoletes], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [SCA npm + pip-audit en CI, 0 CVE connu],
  [I6], [Protection vie privee insuffisante], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [Donnees telemetrie industrielle non personnelles],
  [I7], [Transferts de donnees non securises], [#text(fill: rgb("#f59e0b"), weight: "bold")[PARTIEL]], [TLS sur MQTT externe -- HTTP interne Docker],
  [I8], [Gestion des secrets deficiente], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [`.env` hors Git, variables d'env Docker],
  [I9], [Systeme securise par defaut absent], [#text(fill: rgb("#22c55e"), weight: "bold")[OK]], [Helmet.js, rate-limit, CSP actifs par defaut],
  [I10], [Absence de durcissement physique], [#text(fill: rgb("#6b7280"), weight: "bold")[N/A]], [Environnement logiciel uniquement],
)

== Gestion des secrets

#warning-box[
  Le fichier `.env` contenant les credentials *ne doit jamais etre commite*. Il est reference dans `.gitignore` et fourni via `.env.example` comme modele.
]

Flux de gestion des secrets :

```
.env.example  (commite -- valeurs placeholder)
     │
     ▼  copie manuelle + remplacement
.env  (non commite -- credentials reels)
     │
     ▼  docker compose --env-file .env up
Variables d'environnement des conteneurs
     │
     ▼  process.env.INFLUX_TOKEN etc.
Code applicatif (aucun secret en clair)
```

Pour un deploiement production, les secrets sont injectes via un gestionnaire dedie :

#table(
  columns: (3.5cm, 7.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Outil],
  text(fill: white, weight: "bold")[Usage recommande],
  [HashiCorp Vault], [Injection de secrets au runtime via agent sidecar],
  [Docker Secrets (Swarm)], [Montage en fichier dans `/run/secrets/`],
  [GitHub Actions Secrets], [Variables chiffrees injectees dans le pipeline CI],
  [Azure Key Vault], [Integration native ACI / AKS pour deploiement cloud],
)

== Matrice de menaces (STRIDE)

Application du modele *STRIDE* sur le vecteur MQTT -- pipeline critique :

#table(
  columns: (1.8cm, 2.8cm, 3.2cm, 3.2cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: (x: 7pt, y: 7pt), stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Menace],
  text(fill: white, weight: "bold")[Scenario],
  text(fill: white, weight: "bold")[Impact],
  text(fill: white, weight: "bold")[Contre-mesure],
  [*Spoofing*], [Client usurpe un capteur legitime sur :1883], [Donnees falsifiees dans InfluxDB], [ACL par topic, auth sur :8883],
  [*Tampering*], [Modification payload MQTT en transit], [Fausse alerte ou silence d'alarme], [TLS :8883, signature HMAC (evolution)],
  [*Repudiation*], [Absence de log d'audit des publications], [Impossibilite de tracer l'origine], [Morgan HTTP logs + log_type Mosquitto],
  [*Info Discl.*], [Ecoute passive sur :9001 non chiffre], [Espionnage des valeurs capteurs], [TLS WebSocket (evolution)],
  [*DoS*], [Flood MQTT sur :1883], [Saturation broker -- perte donnees], [Rate-limit Mosquitto `max_inflight_messages`],
  [*Elevation*], [Injection Flux via `/api/history` non valide], [Exfiltration InfluxDB], [Whitelist stricte + rate-limit API],
)

== Surface d'attaque reseau

#table(
  columns: (1.5cm, 2cm, 2.5cm, 4.5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.4pt + luma(210),
  text(fill: white, weight: "bold")[Port],
  text(fill: white, weight: "bold")[Service],
  text(fill: white, weight: "bold")[Expose hote],
  text(fill: white, weight: "bold")[Recommandation prod],
  [1883], [Mosquitto MQTT], [Oui -- interne], [Restreindre au CIDR interne uniquement],
  [8883], [Mosquitto TLS], [Oui], [Conserver -- TLS obligatoire],
  [9001], [MQTT WebSocket], [Oui], [Passer en WSS (TLS) en production],
  [1880], [Node-RED UI], [Oui], [Fermer en production -- admin only via VPN],
  [3000], [Grafana], [Oui], [Derriere reverse proxy Nginx + auth LDAP/OIDC],
  [8080], [Webapp], [Oui], [Derriere Nginx + HTTPS (Let's Encrypt)],
  [8086], [InfluxDB], [Oui], [Fermer vers l'exterieur -- acces interne uniquement],
)

#pagebreak()

// ─────────────────────────────────────────────────────────────────────────────
= Annexes
// ─────────────────────────────────────────────────────────────────────────────

== Recapitulatif des versions

#table(
  columns: (3.5cm, 2.5cm, 5cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Composant],
  text(fill: white, weight: "bold")[Version],
  text(fill: white, weight: "bold")[Source],
  [Mosquitto], [2.0], [`eclipse-mosquitto:2.0`],
  [Node-RED], [3.1], [`nodered/node-red:3.1`],
  [InfluxDB], [2.7], [`influxdb:2.7`],
  [Grafana], [10.2.0], [`grafana/grafana:10.2.0`],
  [Python (simulateur)], [3.11-slim], [`python:3.11-slim`],
  [Node.js (webapp)], [20-alpine], [`node:20-alpine`],
  [paho-mqtt], [1.6.1], [pip],
  [Three.js], [r128], [CDN unpkg],
  [Chart.js], [4.x], [CDN jsdelivr],
  [jsPDF], [2.5.1], [CDN jsdelivr],
  [Typst], [0.14.2], [Compilateur documentation],
)

== Evolutions possibles

#table(
  columns: (4cm, 7cm),
  fill: (col, row) => if row == 0 { clr-navy } else if calc.odd(row) { clr-light } else { white },
  inset: 8pt, stroke: 0.5pt + luma(200),
  text(fill: white, weight: "bold")[Axe],
  text(fill: white, weight: "bold")[Description],
  [Securite avancee], [ACL Mosquitto par topic, JWT Node-RED, RBAC InfluxDB],
  [Haute disponibilite], [InfluxDB Cluster, Mosquitto bridge, reverse proxy Nginx],
  [Alerting], [Grafana Alerting + notifications Slack/SMTP],
  [Machine Learning], [Anomalies par LSTM / IsolationForest sur series temporelles],
  [Retention policies], [Downsampling Flux (5min pour +7j, 1h pour +30j)],
  [MQTT 5.0], [User Properties et Reason Codes],
  [Edge computing], [Deploiement Raspberry Pi / NUC avec images ARM],
  [Capteurs reels], [Integration capteurs physiques (Modbus, OPC-UA, BLE)],
)

#v(2em)
#line(length: 100%, stroke: 0.5pt + luma(200))
#v(0.5em)
#grid(
  columns: (auto, 1fr),
  gutter: 12pt,
  align(horizon)[#image("logo-it.png", height: 28pt)],
  align(horizon)[
    #text(size: 8.5pt, fill: luma(150))[
      Documentation Technique v2.1 — Plateforme IoT IndustriTech \
      Hackathon 2026 · Module 10 · 14 mars 2026
    ]
  ]
)
