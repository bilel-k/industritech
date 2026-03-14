#!/usr/bin/env bash
# generate_certs.sh – Génère CA + certificat Mosquitto + fichier passwd
set -euo pipefail

CERT_DIR="mosquitto/config"
mkdir -p "$CERT_DIR"

echo "== [1/4] Génération de l'autorité de certification (CA) =="
openssl req -new -x509 -days 3650 -extensions v3_ca \
  -keyout "$CERT_DIR/ca.key" \
  -out    "$CERT_DIR/ca.crt" \
  -subj "/C=FR/ST=France/L=Paris/O=IndustriTech/CN=IoT-CA" \
  -nodes

echo "== [2/4] Génération de la clé et du certificat Mosquitto =="
openssl genrsa -out "$CERT_DIR/mosquitto.key" 2048

openssl req -new \
  -key "$CERT_DIR/mosquitto.key" \
  -out "$CERT_DIR/mosquitto.csr" \
  -subj "/C=FR/ST=France/L=Paris/O=IndustriTech/CN=mosquitto"

openssl x509 -req -in "$CERT_DIR/mosquitto.csr" \
  -CA    "$CERT_DIR/ca.crt" \
  -CAkey "$CERT_DIR/ca.key" \
  -CAcreateserial \
  -out  "$CERT_DIR/mosquitto.crt" \
  -days 3650

echo "== [3/4] Création du fichier de mots de passe Mosquitto =="
# Ajoute users : admin, sensor, nodered
touch "$CERT_DIR/passwd"
for user_pass in "admin:admin123" "sensor:sensor123" "nodered:nodered123"; do
  user="${user_pass%%:*}"
  pass="${user_pass##*:}"
  docker run --rm -i eclipse-mosquitto:2.0 \
    mosquitto_passwd -b /dev/stdin "$user" "$pass" >> "$CERT_DIR/passwd" 2>/dev/null || \
  mosquitto_passwd -b "$CERT_DIR/passwd" "$user" "$pass" 2>/dev/null || true
done

# Fallback si mosquitto_passwd non disponible en natif
if [ ! -s "$CERT_DIR/passwd" ]; then
  echo "INFO: génération passwd via Docker..."
  docker run --rm \
    -v "$(pwd)/$CERT_DIR:/certs" \
    eclipse-mosquitto:2.0 \
    sh -c "
      mosquitto_passwd -b -c /certs/passwd admin admin123  &&
      mosquitto_passwd -b    /certs/passwd sensor sensor123 &&
      mosquitto_passwd -b    /certs/passwd nodered nodered123
    "
fi

echo "== [4/4] Nettoyage CSR =="
rm -f "$CERT_DIR/mosquitto.csr" "$CERT_DIR/ca.srl"

echo ""
echo "✅ Certificats générés dans $CERT_DIR :"
ls -lh "$CERT_DIR/"
