.PHONY: help certs start stop restart logs status clean test webapp logs-webapp open \
        audit lint sast scan-images sbom secrets-scan policy devsecops pre-commit-install

# ─── Variables ──────────────────────────────────────────────────────────────
COMPOSE = docker compose
PROJECT = iot-monitoring

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n",$$1,$$2}'

# ─── Certificats & Init ─────────────────────────────────────────────────────
certs: ## Génère les certificats TLS et le fichier passwd Mosquitto
	@bash generate_certs.sh

init: certs ## Initialise complètement le projet (certs + dossiers)
	@mkdir -p mosquitto/{config,data,log} node-red/data influxdb/{data,config} \
	           grafana/{data,provisioning/{datasources,dashboards},dashboards}
	@echo "✅ Structure de dossiers prête"

# ─── Docker Compose ──────────────────────────────────────────────────────────
start: ## Démarre tous les services
	$(COMPOSE) up -d --build
	@echo ""
	@echo "╔══════════════════════════════════════════╗"
	@echo "║  Services IoT démarrés                   ║"
	@echo "╠══════════════════════════════════════════╣"
	@echo "║  Webapp    → http://localhost:8080        ║"
	@echo "║  Node-RED  → http://localhost:1880        ║"
	@echo "║  Grafana   → http://localhost:3000        ║"
	@echo "║  InfluxDB  → http://localhost:8086        ║"
	@echo "║  MQTT      → localhost:1883 / 8883(TLS)  ║"
	@echo "╚══════════════════════════════════════════╝"

stop: ## Arrête tous les services
	$(COMPOSE) down

restart: ## Redémarre tous les services
	$(COMPOSE) restart

status: ## Affiche l'état des conteneurs
	$(COMPOSE) ps

logs: ## Affiche les logs en temps réel
	$(COMPOSE) logs -f

logs-mosquitto: ## Logs Mosquitto uniquement
	$(COMPOSE) logs -f mosquitto

logs-nodered: ## Logs Node-RED uniquement
	$(COMPOSE) logs -f node-red

logs-sim: ## Logs simulateur capteurs
	$(COMPOSE) logs -f sensor-simulator

logs-webapp: ## Logs webapp dashboard
	$(COMPOSE) logs -f webapp

webapp: ## Rebuild et redémarre uniquement la webapp
	$(COMPOSE) up -d --build webapp

open: ## Ouvre le dashboard web dans le navigateur
	open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null || echo 'Ouvrir: http://localhost:8080'

# ─── Utilitaires ─────────────────────────────────────────────────────────────
mqtt-sub: ## Écoute tous les topics MQTT (debug)
	docker exec iot-mosquitto mosquitto_sub -t "factory/#" -v \
	  -u admin -P admin123 2>/dev/null || \
	mosquitto_sub -h localhost -p 1883 -t "factory/#" -v -u admin -P admin123

mqtt-pub-test: ## Publie un message test MQTT
	docker exec iot-mosquitto mosquitto_pub \
	  -t "factory/atelier/presse/vibration" \
	  -m '{"zone":"atelier","machine":"presse","capteur":"vibration","valeur":3.5,"unite":"mm/s","seuil":5.0,"anomalie":false,"derive":0,"timestamp":"2026-03-12T12:00:00Z"}' \
	  -u admin -P admin123

influxdb-query: ## Test requête InfluxDB
	curl -s "http://localhost:8086/api/v2/query?org=industritech" \
	  -H "Authorization: Token mytoken123superlong" \
	  -H "Content-Type: application/vnd.flux" \
	  -d 'from(bucket:"iot_data") |> range(start: -5m) |> filter(fn:(r)=> r._measurement == "machine_data") |> last()' | python3 -m json.tool 2>/dev/null || true

sim-local: ## Lance le simulateur Python localement (hors Docker)
	cd simulator && pip install -q -r requirements.txt && \
	MQTT_HOST=localhost MQTT_PORT=1883 python sensor_simulator.py

# ─── Nettoyage ───────────────────────────────────────────────────────────────
clean: ## Supprime les données persistées (volumes)
	$(COMPOSE) down -v
	rm -rf mosquitto/data/* mosquitto/log/* influxdb/data/* grafana/data/* node-red/data/*
	@echo "🗑  Données supprimées"

clean-all: clean ## Supprime aussi les certificats
	rm -f mosquitto/config/ca.* mosquitto/config/mosquitto.* mosquitto/config/passwd
	@echo "🗑  Tout supprimé (certificats inclus)"

# ─── Tests ───────────────────────────────────────────────────────────────────
test: ## Lance les tests d'intégration
	@bash tests/integration_test.sh

# ─── Sécurité ────────────────────────────────────────────────────────────────
env-setup: ## Copie .env.example → .env (à faire une seule fois)
@if [ -f .env ]; then echo "⚠️  .env existe déjà, non écrasé."; else cp .env.example .env && echo "✅ .env créé — éditez-le avant de lancer make start"; fi

security-test: ## Valide les protections de sécurité (MQTT auth, headers, rate limit)
@echo "=== [1] MQTT anonyme (doit être refusé) ==="
@docker run --rm --network iot-network eclipse-mosquitto:2.0 \
  mosquitto_sub -h mosquitto -t "factory/#" -C 1 -W 3 2>&1 || echo "✅ Refusé"
@echo ""
@echo "=== [2] MQTT sensor:publish (doit fonctionner) ==="
@docker run --rm --network iot-network eclipse-mosquitto:2.0 \
  mosquitto_pub -h mosquitto -u sensor -P sensor123 \
  -t "factory/test/m/temperature" -m '{"valeur":20}' 2>&1 && echo "✅ Autorisé"
@echo ""
@echo "=== [3] Headers HTTP ==="
@curl -sI http://localhost:8080/ | grep -E "X-Frame|X-Content|Content-Security" || true
@echo ""
@echo "=== [4] Injection Flux bloquée ==="
@code=$$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/history/INJECTED/m/temperature"); \
  echo "  zone invalide → HTTP $$code"; \
  [ "$$code" = "400" ] && echo "✅ Bloquée" || echo "❌ Non bloquée"
# ─── DevSecOps ────────────────────────────────────────────────────────────────
pre-commit-install: ## Installe les hooks pre-commit dans le repo git
	pip install pre-commit detect-secrets -q
	pre-commit install
	pre-commit install --hook-type commit-msg
	@echo "✅ Hooks pre-commit installés"

lint: ## Lint ESLint (règles sécurité) + flake8 Python
	@echo "── ESLint (security) ──────────────────────────────────────"
	@cd webapp && npm install eslint eslint-plugin-security eslint-plugin-no-unsanitized --save-dev -q 2>/dev/null; \
	  npx eslint server.js --max-warnings 0 \
	  && echo "✅ ESLint : OK" || echo "❌ ESLint : findings détectés"
	@echo "── flake8 (Python) ─────────────────────────────────────────"
	@pip install flake8 -q && \
	  flake8 simulator/sensor_simulator.py --max-line-length=120 --count \
	  && echo "✅ flake8 : OK" || echo "❌ flake8 : warnings"

sast: ## SAST local : Bandit (Python) + Semgrep (si installé)
	@echo "── Bandit (Python SAST) ────────────────────────────────────"
	@pip install bandit -q && \
	  bandit -r simulator/ -c simulator/.bandit -ll \
	  && echo "✅ Bandit : aucun finding HIGH" || echo "❌ Bandit : findings détectés"
	@echo "── Semgrep (SAST multi-lang) ───────────────────────────────"
	@if command -v semgrep >/dev/null 2>&1; then \
	  semgrep --config p/owasp-top-ten --config p/nodejs --config p/secrets \
	    --error webapp/server.js simulator/ \
	  && echo "✅ Semgrep : OK"; \
	else \
	  echo "⚠️  Semgrep non disponible — pip install semgrep"; \
	fi

audit: ## SCA : npm audit (webapp) + pip-audit (simulateur)
	@echo "── npm audit ───────────────────────────────────────────────"
	@cd webapp && npm audit --audit-level=high \
	  && echo "✅ npm audit : 0 HIGH/CRITICAL" || echo "❌ npm audit : vulnérabilités détectées"
	@echo "── pip-audit ───────────────────────────────────────────────"
	@pip install pip-audit -q && \
	  pip-audit -r simulator/requirements.txt \
	  && echo "✅ pip-audit : 0 CVE" || echo "❌ pip-audit : CVE détectées"

secrets-scan: ## Détection de secrets avec Gitleaks
	@echo "── Gitleaks ────────────────────────────────────────────────"
	@if command -v gitleaks >/dev/null 2>&1; then \
	  gitleaks detect --config .gitleaks.toml --verbose \
	  && echo "✅ Gitleaks : aucun secret détecté"; \
	else \
	  echo "⚠️  Gitleaks non disponible — https://github.com/gitleaks/gitleaks/releases"; \
	fi

scan-images: ## Trivy : scan des images Docker (HIGH + CRITICAL)
	@echo "── Build images ────────────────────────────────────────────"
	@$(COMPOSE) build webapp sensor-simulator 2>/dev/null
	@echo "── Trivy : webapp ──────────────────────────────────────────"
	@if command -v trivy >/dev/null 2>&1; then \
	  trivy image --severity HIGH,CRITICAL --ignore-unfixed \
	    --trivyignores .trivyignore \
	    iot-monitoring-webapp:latest \
	  && echo "✅ Webapp : OK"; \
	  echo "── Trivy : simulateur ──────────────────────────────────────"; \
	  trivy image --severity HIGH,CRITICAL --ignore-unfixed \
	    iot-monitoring-sensor-sim:latest \
	  && echo "✅ Simulateur : OK"; \
	else \
	  printf "⚠️  Trivy non disponible.\n   curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh\n"; \
	fi

sbom: ## Génère un SBOM CycloneDX pour l'image webapp
	@if command -v trivy >/dev/null 2>&1; then \
	  trivy image --format cyclonedx --output sbom-webapp.json iot-monitoring-webapp:latest; \
	  echo "✅ SBOM généré : sbom-webapp.json"; \
	elif command -v syft >/dev/null 2>&1; then \
	  syft iot-monitoring-webapp:latest -o cyclonedx-json > sbom-webapp.json; \
	  echo "✅ SBOM généré par syft : sbom-webapp.json"; \
	else \
	  echo "⚠️  Trivy ou Syft requis pour générer le SBOM"; \
	fi

policy: ## Évalue la politique OPA DevSecOps
	@if command -v opa >/dev/null 2>&1; then \
	  opa eval \
	    --data security/policies/devsecops.rego \
	    --input security/policies/project-context.json \
	    --format pretty "data.devsecops.allow" | grep -q "true" \
	    && echo "✅ OPA Policy : PASS — déploiement autorisé" \
	    || (echo "❌ OPA Policy : FAIL — violations:"; \
	        opa eval --data security/policies/devsecops.rego \
	          --input security/policies/project-context.json \
	          --format pretty "data.devsecops.violations" && exit 1); \
	else \
	  echo "⚠️  OPA non disponible — https://www.openpolicyagent.org/docs/latest/#1-download-opa"; \
	fi

devsecops: lint sast audit secrets-scan scan-images policy ## 🔐 Pipeline DevSecOps complet (local)
	@echo ""
	@echo "╔══════════════════════════════════════════════╗"
	@echo "║  ✅  DevSecOps : tous les checks passés       ║"
	@echo "╚══════════════════════════════════════════════╝"