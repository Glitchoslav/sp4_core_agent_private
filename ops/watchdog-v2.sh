#!/usr/bin/env bash
set -u

LOG_FILE="${SP4_WATCHDOG_LOG:-/tmp/sp4-watchdog.log}"
SERVICE_CONFIG="${SP4_WATCHDOG_CONFIG:-/home/dhzpc/sp4/services.linux.json}"
CORE_PORTS=(3002 3003 9010 9000)

# Cron does not always provide the user systemd environment.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XDG_RUNTIME_DIR}/bus}"

log_message() {
    printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*" >> "$LOG_FILE"
}

port_is_open() {
    local port="$1"
    timeout 3 bash -c ": </dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1
}

health_is_ok() {
    local url="$1"
    curl -sf --max-time 5 "$url" >/dev/null 2>&1
}

restart_user_service() {
    local service="$1"
    if systemctl --user restart "$service" >> "$LOG_FILE" 2>&1; then
        log_message "Restarted ${service}."
    else
        log_message "ERROR: failed to restart ${service}."
    fi
}

read_config_ports() {
    if [[ ! -f "$SERVICE_CONFIG" ]]; then
        log_message "INFO: config not found at ${SERVICE_CONFIG}; using canonical ports."
        return 0
    fi
    if ! command -v python3 >/dev/null 2>&1; then
        log_message "WARN: python3 unavailable; ignoring ${SERVICE_CONFIG}."
        return 0
    fi

    python3 - "$SERVICE_CONFIG" <<'PY'
import json
import sys

path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as handle:
        payload = json.load(handle)
    services = payload.get("services", payload) if isinstance(payload, dict) else payload
    if not isinstance(services, list):
        raise ValueError("expected a services array")
    for service in services:
        if not isinstance(service, dict):
            continue
        if service.get("enabled") is False or service.get("autostart") is False:
            continue
        port = service.get("port")
        if isinstance(port, int) and 1 <= port <= 65535:
            print(port)
except (OSError, ValueError, json.JSONDecodeError) as error:
    print(f"watchdog config error: {error}", file=sys.stderr)
    sys.exit(1)
PY
}

main() {
    local launcher_failed=0
    local port
    local config_ports

    log_message "Watchdog v2 check started."

    config_ports="$(read_config_ports 2>> "$LOG_FILE")" || {
        log_message "WARN: invalid service config; using canonical ports."
        config_ports=""
    }

    for port in "${CORE_PORTS[@]}"; do
        if ! port_is_open "$port"; then
            log_message "FAIL: core port ${port} is not listening."
            launcher_failed=1
        fi
    done

    while IFS= read -r port; do
        [[ "$port" =~ ^[0-9]+$ ]] || continue
        if [[ ! " ${CORE_PORTS[*]} " =~ " ${port} " ]] && ! port_is_open "$port"; then
            log_message "FAIL: configured launcher port ${port} is not listening."
            launcher_failed=1
        fi
    done <<< "$config_ports"

    if ! health_is_ok "http://127.0.0.1:3002/health"; then
        log_message "FAIL: bridge health endpoint is unavailable."
        launcher_failed=1
    fi
    if ! health_is_ok "http://127.0.0.1:9010/api/stats"; then
        log_message "FAIL: operator stats endpoint is unavailable."
        launcher_failed=1
    fi

    if (( launcher_failed )); then
        restart_user_service "sp4-launcher.service"
    else
        log_message "OK: launcher-managed ports and health endpoints are healthy."
    fi

    if ! port_is_open 11434; then
        log_message "FAIL: Ollama port 11434 is not listening; ollama.service should recover it."
    fi

    if ! port_is_open 4000; then
        log_message "FAIL: LiteLLM port 4000 is not listening."
        restart_user_service "sp4-litellm.service"
    fi

    if ! port_is_open 18789; then
        log_message "FAIL: gateway port 18789 is not listening; gateway systemd supervision should recover it."
    fi

    log_message "Watchdog v2 check finished."
    return 0
}

main "$@"
exit 0
