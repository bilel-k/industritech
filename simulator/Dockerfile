FROM python:3.11-slim
WORKDIR /app

# Sécurité : utilisateur non-root
RUN groupadd -g 1001 appgroup && \
    useradd  -u 1001 -g appgroup -s /usr/sbin/nologin -M appuser

COPY requirements.txt .
# pip install sans cache + pas de pip upgrade automatique
RUN pip install --no-cache-dir --require-hashes -r requirements.txt 2>/dev/null || \
    pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appgroup sensor_simulator.py .

USER appuser

# Healthcheck basique (le simulateur est un daemon sans port)
HEALTHCHECK --interval=60s --timeout=5s --start-period=15s --retries=2 \
  CMD pgrep -f sensor_simulator.py || exit 1

CMD ["python", "-u", "sensor_simulator.py"]
