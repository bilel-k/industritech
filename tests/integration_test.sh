#!/usr/bin/env bash
# tests/integration_test.sh – Tests d'intégration de la plateforme IoT
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "${GREEN}✅ PASS${RESET} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}❌ FAIL${RESET} $1"; FAIL=$((FAIL + 1)); }

echo -e "\n${BOLD}=== Tests d'intégration IoT Platform ===${RESET}\n"

# ── 1. Conteneurs actifs ─────────────────────────────────────────────────────
echo "-- Services Docker --"
for svc in iot-mosquitto iot-nodered iot-influxdb iot-grafana; do
  if docker ps --filter "name=$svc" --filter "status=running" --format "{{.Names}}" | grep -q "$svc"; then
    ok "$svc est running"
  else
    fail "$svc n'est PAS running"
  fi
done

# ── 2. Ports accessibles ──────────────────────────────────────────────────────
echo -e "\n-- Ports / Endpoints --"
check_port() {
  local name="$1" host="$2" port="$3"
  if nc -z -w3 "$host" "$port" 2>/dev/null; then
    ok "$name ($host:$port) accessible"
  else
    fail "$name ($host:$port) NON accessible"
  fi
}
check_port "Mosquitto MQTT"    localhost 1883
check_port "Mosquitto MQTT-TLS" localhost 8883
check_port "Node-RED"          localhost 1880
check_port "InfluxDB"          localhost 8086
check_port "Grafana"           localhost 3000

# ── 3. InfluxDB API ──────────────────────────────────────────────────────────
echo -e "\n-- InfluxDB --"
INFLUX_PING=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8086/ping)
[ "$INFLUX_PING" = "204" ] && ok "InfluxDB ping OK (204)" || fail "InfluxDB ping KO ($INFLUX_PING)"

INFLUX_HEALTH=$(curl -s http://localhost:8086/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null)
[ "$INFLUX_HEALTH" = "pass" ] && ok "InfluxDB health = pass" || fail "InfluxDB health = $INFLUX_HEALTH"

# ── 4. Grafana API ────────────────────────────────────────────────────────────
echo -e "\n-- Grafana --"
GF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://admin:admin@localhost:3000/api/health)
[ "$GF_STATUS" = "200" ] && ok "Grafana API health OK" || fail "Grafana API KO ($GF_STATUS)"

# ── 5. MQTT publish/subscribe ────────────────────────────────────────────────
echo -e "\n-- MQTT --"
TEST_TOPIC="factory/test/integration"
TEST_MSG='{"zone":"test","machine":"test","capteur":"test","valeur":1.0,"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
if docker exec iot-mosquitto mosquitto_pub -t "$TEST_TOPIC" -m "$TEST_MSG" -u admin -P admin123 2>/dev/null; then
  ok "MQTT publish réussi"
else
  fail "MQTT publish échoué"
fi

# ── 6. Fichier passwd créé ───────────────────────────────────────────────────
echo -e "\n-- Sécurité --"
[ -f "mosquitto/config/passwd" ] && [ -s "mosquitto/config/passwd" ] && \
  ok "Fichier passwd Mosquitto présent" || fail "Fichier passwd manquant"

# ── 7. Certificats TLS ───────────────────────────────────────────────────────
for f in ca.crt mosquitto.crt mosquitto.key; do
  [ -f "mosquitto/config/$f" ] && ok "Certificat $f présent" || fail "Certificat $f manquant"
done

# ── 8. Flows Node-RED────────────────────────────────────────────────────────
[ -f "node-red/flows/flows.json" ] && ok "flows.json présent" || fail "flows.json manquant"

# ── Résumé ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo -e "\n${BOLD}=== Résultat: $PASS/$TOTAL tests passés ===${RESET}"
[ $FAIL -eq 0 ] && exit 0 || exit 1
