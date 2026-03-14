#!/usr/bin/env python3
"""
sensor_simulator.py
Simule les capteurs IoT des 3 zones (salle serveur, atelier, local électrique)
et publie les données via MQTT avec dérive progressive.
"""

import os, time, json, random, math
import paho.mqtt.client as mqtt

# ─── Config depuis env ──────────────────────────────────────────────────────
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "sensor")
MQTT_PASS = os.getenv("MQTT_PASS", "sensor123")
MQTT_TLS  = os.getenv("MQTT_TLS", "false").lower() == "true"
CA_CERT   = os.getenv("CA_CERT", "/certs/ca.crt")

# ─── Capteurs déclarés ──────────────────────────────────────────────────────
# Format: (zone, machine, capteur, unité, valeur_base, seuil_alerte, intervalle_sec)
SENSORS = [
    # ═══ Salle serveur ═══
    # Rack principal (Temp > 28°C, Hum > 70%)
    ("salle_serveur", "rack_principal",   "temperature",  "°C",    22.0,  28.0,  5),
    ("salle_serveur", "rack_principal",   "humidite",     "%",     45.0,  70.0,  5),
    # Rack secondaire
    ("salle_serveur", "rack_secondaire",  "temperature",  "°C",    23.0,  28.0,  5),
    ("salle_serveur", "rack_secondaire",  "humidite",     "%",     42.0,  70.0,  5),
    ("salle_serveur", "rack_secondaire",  "puissance",    "kW",     2.8,   5.0,  5),
    # Onduleur (UPS)
    ("salle_serveur", "onduleur",         "temperature",  "°C",    25.0,  35.0,  8),
    ("salle_serveur", "onduleur",         "puissance",    "kW",     4.5,   8.0,  8),
    ("salle_serveur", "onduleur",         "courant",      "A",     12.0,  20.0,  8),
    # Climatiseur
    ("salle_serveur", "climatiseur",      "temperature",  "°C",    18.0,  25.0, 10),
    ("salle_serveur", "climatiseur",      "debit",        "L/min", 15.0,   5.0, 10),

    # ═══ Atelier technique ═══
    # Presse hydraulique (Vib > 5.0 mm/s, Temp > 40°C, Pression > 250 bar)
    ("atelier",       "presse",           "vibration",    "mm/s",   2.0,   5.0,  2),
    ("atelier",       "presse",           "temperature",  "°C",    30.0,  40.0,  2),
    ("atelier",       "presse",           "pression",     "bar",  180.0, 250.0,  2),
    # Robot industriel
    ("atelier",       "robot",            "courant",      "A",      8.0,  15.0,  2),
    ("atelier",       "robot",            "vibration",    "mm/s",   1.0,   4.0,  2),
    ("atelier",       "robot",            "temperature",  "°C",    28.0,  38.0,  3),
    # Convoyeur
    ("atelier",       "convoyeur",        "vitesse",      "m/s",    1.0,   0.2,  2),
    ("atelier",       "convoyeur",        "vibration",    "mm/s",   0.8,   3.0,  3),
    # Tour CNC
    ("atelier",       "tour_cnc",         "vibration",    "mm/s",   1.5,   6.0,  2),
    ("atelier",       "tour_cnc",         "temperature",  "°C",    32.0,  45.0,  3),
    ("atelier",       "tour_cnc",         "courant",      "A",     10.0,  18.0,  3),
    ("atelier",       "tour_cnc",         "niveau_sonore","dB",    72.0,  90.0,  3),
    # Compresseur
    ("atelier",       "compresseur",      "pression",     "bar",    8.0,  12.0,  4),
    ("atelier",       "compresseur",      "temperature",  "°C",    35.0,  50.0,  4),
    ("atelier",       "compresseur",      "vibration",    "mm/s",   1.2,   5.0,  4),
    ("atelier",       "compresseur",      "debit",        "L/min", 80.0,  30.0,  4),
    # Poste de soudure
    ("atelier",       "poste_soudure",    "courant",      "A",    120.0, 200.0,  3),
    ("atelier",       "poste_soudure",    "temperature",  "°C",    40.0,  55.0,  3),
    ("atelier",       "poste_soudure",    "luminosite",   "lux",  800.0,1500.0,  5),

    # ═══ Local électrique ═══
    # Armoire 1
    ("local_elec",    "armoire_1",        "luminosite",   "lux",  200.0,  50.0, 10),
    ("local_elec",    "armoire_1",        "temperature",  "°C",    25.0,  35.0, 10),
    ("local_elec",    "armoire_1",        "courant",      "A",     30.0,  50.0, 10),
    # Armoire 2
    ("local_elec",    "armoire_2",        "temperature",  "°C",    26.0,  35.0, 10),
    ("local_elec",    "armoire_2",        "courant",      "A",     25.0,  45.0, 10),
    ("local_elec",    "armoire_2",        "puissance",    "kW",    18.0,  30.0, 10),
    # Transformateur
    ("local_elec",    "transformateur",   "temperature",  "°C",    40.0,  65.0,  6),
    ("local_elec",    "transformateur",   "puissance",    "kW",    45.0,  80.0,  6),
    ("local_elec",    "transformateur",   "vibration",    "mm/s",   0.5,   2.0,  6),
    ("local_elec",    "transformateur",   "niveau_sonore","dB",    55.0,  75.0,  8),
    # Groupe électrogène
    ("local_elec",    "groupe_electrogene","temperature",  "°C",   30.0,  50.0,  8),
    ("local_elec",    "groupe_electrogene","vibration",    "mm/s",  1.8,   5.0,  8),
    ("local_elec",    "groupe_electrogene","debit",        "L/min",  2.0,   0.5,  8),
    ("local_elec",    "groupe_electrogene","niveau_sonore","dB",    65.0,  85.0,  8),
]

# ─── État des dérives ───────────────────────────────────────────────────────
drifts = {f"{z}/{m}/{c}": 0.0 for z, m, c, *_ in SENSORS}
last_sent = {f"{z}/{m}/{c}": 0  for z, m, c, *_ in SENSORS}

# ─── Connexion MQTT ─────────────────────────────────────────────────────────
def connect_mqtt() -> mqtt.Client:
    client = mqtt.Client(client_id="sensor-simulator-py")
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    if MQTT_TLS:
        import ssl
        client.tls_set(ca_certs=CA_CERT, tls_version=ssl.PROTOCOL_TLS)
    client.on_connect = lambda c, u, f, rc: print(
        f"[MQTT] Connecté (rc={rc}) à {MQTT_HOST}:{MQTT_PORT}"
    )
    client.on_disconnect = lambda c, u, rc: print(f"[MQTT] Déconnecté (rc={rc})")

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except Exception as e:
            print(f"[MQTT] Connexion échouée ({e}), retry dans 5s…")
            time.sleep(5)
    client.loop_start()
    return client

# ─── Génération des valeurs ─────────────────────────────────────────────────
def generate_value(zone, machine, capteur, base, seuil, t):
    key = f"{zone}/{machine}/{capteur}"
    # Dérive progressive aléatoire (simule usure)
    if random.random() < 0.015:
        drifts[key] += 0.05
    drift = drifts[key]

    noise = random.gauss(0, base * 0.03)

    if capteur == "vibration":
        value = base + drift + math.sin(t * 2.5) * 0.3 + noise
    elif capteur == "temperature":
        value = base + drift * 1.5 + math.sin(t * 0.1) * 1.5 + noise
    elif capteur == "humidite":
        value = base + drift * 2.0 + math.sin(t * 0.05) * 3.0 + noise
    elif capteur == "courant":
        value = base + drift * 3.0 + math.sin(t * 1.0) * 0.5 + abs(noise)
    elif capteur == "luminosite":
        # Peut tomber en-dessous du seuil (anomalie simulée)
        value = max(0, base - drift * 10 + math.cos(t * 0.2) * 20 + noise * 5)
    elif capteur == "vitesse":
        value = max(0, base + math.sin(t * 0.8) * 0.1 + noise * 0.05)
    elif capteur == "pression":
        value = base + drift * 4.0 + math.sin(t * 0.3) * (base * 0.05) + noise
    elif capteur == "puissance":
        value = max(0, base + drift * 2.0 + math.sin(t * 0.15) * (base * 0.1) + noise)
    elif capteur == "debit":
        value = max(0, base - drift * 3.0 + math.sin(t * 0.4) * (base * 0.08) + noise)
    elif capteur == "niveau_sonore":
        value = max(0, base + drift * 1.5 + math.sin(t * 0.6) * 3.0 + noise * 2)
    else:
        value = base + drift + noise

    anomaly = (
        (value > seuil and capteur not in ("luminosite", "vitesse", "debit")) or
        (value < seuil and capteur in ("luminosite", "vitesse", "debit"))
    )
    return round(value, 3), anomaly

# ─── Boucle principale ──────────────────────────────────────────────────────
def main():
    print(f"[SIM] Démarrage simulation → {MQTT_HOST}:{MQTT_PORT}")
    client = connect_mqtt()
    t_start = time.time()

    while True:
        now = time.time()
        t   = now - t_start

        for (zone, machine, capteur, unit, base, seuil, interval) in SENSORS:
            key = f"{zone}/{machine}/{capteur}"
            if now - last_sent[key] < interval:
                continue

            value, anomaly = generate_value(zone, machine, capteur, base, seuil, t)
            payload = {
                "zone":      zone,
                "machine":   machine,
                "capteur":   capteur,
                "valeur":    value,
                "unite":     unit,
                "seuil":     seuil,
                "anomalie":  anomaly,
                "derive":    round(drifts[key], 4),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            topic = f"factory/{zone}/{machine}/{capteur}"
            client.publish(topic, json.dumps(payload), qos=1)
            last_sent[key] = now

            status = "⚠ ANOMALIE" if anomaly else "  ok"
            print(f"[{status}] {topic} = {value} {unit}")

        time.sleep(0.5)

if __name__ == "__main__":
    main()
