# ─────────────────────────────────────────────────────────────────────────────
# OPA Rego Policy — DevSecOps gate
# Évalue si le projet respecte les politiques de sécurité minimales
# Test local : opa eval --data security/policies/devsecops.rego \
#              --input security/policies/project-context.json \
#              --format pretty "data.devsecops.allow"
# ─────────────────────────────────────────────────────────────────────────────
package devsecops

import future.keywords.if
import future.keywords.in
import future.keywords.every

# ── Politique principale ──────────────────────────────────────────────────────
# Le pipeline ne passe QUE si toutes les vérifications sont vertes
allow if {
    no_critical_cves
    no_high_npm_vulns
    non_root_containers
    tls_configured
    secrets_not_committed
    rate_limiting_enabled
    helmet_enabled
}

# ── Pas de CVE CRITICAL dans les images ──────────────────────────────────────
no_critical_cves if {
    input.trivy.critical_cves == 0
}

# ── Pas de vulnérabilité HIGH/CRITICAL npm ────────────────────────────────────
no_high_npm_vulns if {
    input.npm_audit.high == 0
    input.npm_audit.critical == 0
}

# ── Tous les conteneurs tournent en non-root ──────────────────────────────────
non_root_containers if {
    every container in input.containers {
        container.user != "root"
        container.user != ""
    }
}

# ── TLS configuré sur le broker MQTT ─────────────────────────────────────────
tls_configured if {
    input.mosquitto.tls_port == 8883
    input.mosquitto.cert_present == true
}

# ── Aucun secret committé détecté ────────────────────────────────────────────
secrets_not_committed if {
    input.gitleaks.secrets_found == 0
}

# ── Rate limiting activé sur l'API ───────────────────────────────────────────
rate_limiting_enabled if {
    input.webapp.rate_limit_enabled == true
}

# ── Helmet.js activé ─────────────────────────────────────────────────────────
helmet_enabled if {
    input.webapp.helmet_enabled == true
}

# ── Rapport de violations ─────────────────────────────────────────────────────
violations[msg] if {
    not no_critical_cves
    msg := sprintf("CVE CRITICAL détectées : %d", [input.trivy.critical_cves])
}
violations[msg] if {
    not no_high_npm_vulns
    msg := sprintf("npm HIGH/CRITICAL : %d + %d", [input.npm_audit.high, input.npm_audit.critical])
}
violations[msg] if {
    not non_root_containers
    msg := "Conteneurs tournant en root détectés"
}
violations[msg] if {
    not tls_configured
    msg := "TLS MQTT non configuré"
}
violations[msg] if {
    not secrets_not_committed
    msg := sprintf("Secrets détectés par Gitleaks : %d", [input.gitleaks.secrets_found])
}
violations[msg] if {
    not rate_limiting_enabled
    msg := "Rate limiting API désactivé"
}
violations[msg] if {
    not helmet_enabled
    msg := "Helmet.js désactivé"
}
