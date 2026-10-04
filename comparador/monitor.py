from __future__ import annotations

import argparse
import json
import logging
import os
import sqlite3
import sys
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable


BRANCHES = {
    "stock_cde": "CDE",
    "stock_pj": "PJ",
    "stock_sg": "SG",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat(timespec="seconds")


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(char for char in text if not unicodedata.combining(char)).casefold()


def number(value: Any, default: float = 0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def integer(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def normalize_product(product: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": integer(product.get("id")),
        "nombre": str(product.get("nombre") or "").strip(),
        "marca": str(product.get("marca") or "").strip(),
        "composicion": str(product.get("composicion") or "").strip(),
        "categoria": str(product.get("categoria") or "").strip(),
        "presentacion": str(product.get("presentacion") or "").strip(),
        "qty": str(product.get("qty") or "").strip(),
        "mg": str(product.get("mg") or "").strip(),
        "precio": number(product.get("precio")),
        "stock_cde": integer(product.get("stock_cde")),
        "stock_pj": integer(product.get("stock_pj")),
        "stock_sg": integer(product.get("stock_sg")),
    }


def format_price(value: float) -> str:
    return f"US$ {value:.2f}"


def format_value(value: float, rate: float = 0) -> str:
    """Preço em dólar e, quando há cotação do dia, também em reais."""
    if rate <= 0:
        return format_price(value)
    reais = f"{value * rate:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{format_price(value)} (R$ {reais})"


def is_watched(product: dict[str, Any], watch: dict[str, Any]) -> bool:
    if not watch.get("only_watchlist", False):
        return True

    ids = {integer(value) for value in watch.get("product_ids", [])}
    if product["id"] in ids:
        return True

    haystack = normalize_text(
        " ".join(
            str(product.get(key, ""))
            for key in ("nombre", "marca", "composicion", "categoria")
        )
    )
    return any(normalize_text(term) in haystack for term in watch.get("terms", []) if term)


def event(kind: str, summary: str, product_id: int | None = None, data: Any = None) -> dict[str, Any]:
    return {
        "kind": kind,
        "product_id": product_id,
        "summary": summary,
        "data": data or {},
    }


def detect_product_changes(
    previous: dict[int, dict[str, Any]],
    current: dict[int, dict[str, Any]],
    watch: dict[str, Any],
    rate: float = 0,
) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []

    if watch.get("notify_new_products", True):
        for product_id in sorted(current.keys() - previous.keys()):
            product = current[product_id]
            if is_watched(product, watch):
                changes.append(
                    event(
                        "new_product",
                        f"NOVO: [ST-{product_id}] {product['nombre']} — {format_value(product['precio'], rate)}",
                        product_id,
                        {"current": product},
                    )
                )

    if watch.get("notify_removed_products", True):
        for product_id in sorted(previous.keys() - current.keys()):
            product = previous[product_id]
            if is_watched(product, watch):
                changes.append(
                    event(
                        "removed_product",
                        f"REMOVIDO: [ST-{product_id}] {product['nombre']}",
                        product_id,
                        {"previous": product},
                    )
                )

    for product_id in sorted(previous.keys() & current.keys()):
        before = previous[product_id]
        after = current[product_id]
        if not is_watched(after, watch):
            continue

        if watch.get("notify_price_changes", True) and before["precio"] != after["precio"]:
            changes.append(
                event(
                    "price_change",
                    f"PREÇO: [ST-{product_id}] {after['nombre']} — {format_price(before['precio'])} → {format_value(after['precio'], rate)}",
                    product_id,
                    {"before": before["precio"], "after": after["precio"]},
                )
            )

        if not watch.get("notify_stock_changes", True):
            continue

        mode = watch.get("stock_change_mode", "availability")
        for field, branch in BRANCHES.items():
            old_stock = before[field]
            new_stock = after[field]
            if mode == "any" and old_stock != new_stock:
                changes.append(
                    event(
                        "stock_change",
                        f"ESTOQUE {branch}: [ST-{product_id}] {after['nombre']} — {old_stock} → {new_stock}",
                        product_id,
                        {"branch": branch, "before": old_stock, "after": new_stock},
                    )
                )
            elif mode != "any" and (old_stock > 0) != (new_stock > 0):
                status = "VOLTOU" if new_stock > 0 else "ESGOTOU"
                value = f" — {format_value(after['precio'], rate)}" if new_stock > 0 else ""
                changes.append(
                    event(
                        "stock_availability",
                        f"{status} {branch}: [ST-{product_id}] {after['nombre']}{value}",
                        product_id,
                        {"branch": branch, "before": old_stock, "after": new_stock},
                    )
                )

    return changes


def render_template(value: Any, variables: dict[str, str]) -> Any:
    if isinstance(value, dict):
        return {key: render_template(item, variables) for key, item in value.items()}
    if isinstance(value, list):
        return [render_template(item, variables) for item in value]
    if isinstance(value, str):
        rendered = value
        for key, replacement in variables.items():
            rendered = rendered.replace("{" + key + "}", replacement)
        return rendered
    return value


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def resolve_path(config_path: Path, configured_path: str) -> Path:
    candidate = Path(configured_path)
    return candidate if candidate.is_absolute() else config_path.parent / candidate


def setup_logging(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("shapetotal-monitor")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)
    return logger


def fetch_catalog(url: str, timeout: int) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "ShapeTotalLocalMonitor/1.0 (+personal-use)",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError(f"API respondeu HTTP {response.status}")
        payload = json.load(response)
    if not isinstance(payload, dict) or not isinstance(payload.get("productos"), list):
        raise ValueError("Resposta da API não contém a lista 'productos'.")
    return payload


def open_database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS current_products (
            product_id INTEGER PRIMARY KEY,
            payload TEXT NOT NULL,
            seen_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checked_at TEXT NOT NULL,
            status TEXT NOT NULL,
            catalog_updated TEXT,
            product_count INTEGER,
            event_count INTEGER NOT NULL DEFAULT 0,
            error TEXT
        );
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            kind TEXT NOT NULL,
            product_id INTEGER,
            summary TEXT NOT NULL,
            data TEXT NOT NULL,
            notified INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(run_id) REFERENCES runs(id)
        );
        CREATE INDEX IF NOT EXISTS idx_events_notified ON events(notified, id);
        """
    )
    return connection


def get_metadata(connection: sqlite3.Connection, key: str, default: Any = None) -> Any:
    row = connection.execute("SELECT value FROM metadata WHERE key = ?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def set_metadata(connection: sqlite3.Connection, key: str, value: Any) -> None:
    connection.execute(
        "INSERT INTO metadata(key, value) VALUES(?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, compact_json(value)),
    )


def load_previous_products(connection: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    return {
        row["product_id"]: json.loads(row["payload"])
        for row in connection.execute("SELECT product_id, payload FROM current_products")
    }


def insert_events(
    connection: sqlite3.Connection,
    run_id: int,
    changes: Iterable[dict[str, Any]],
) -> None:
    created_at = iso_now()
    connection.executemany(
        "INSERT INTO events(run_id, created_at, kind, product_id, summary, data) "
        "VALUES(?, ?, ?, ?, ?, ?)",
        [
            (
                run_id,
                created_at,
                change["kind"],
                change["product_id"],
                change["summary"],
                compact_json(change["data"]),
            )
            for change in changes
        ],
    )


def replace_current_products(
    connection: sqlite3.Connection,
    products: dict[int, dict[str, Any]],
) -> None:
    seen_at = iso_now()
    connection.execute("DELETE FROM current_products")
    connection.executemany(
        "INSERT INTO current_products(product_id, payload, seen_at) VALUES(?, ?, ?)",
        [(product_id, compact_json(product), seen_at) for product_id, product in products.items()],
    )


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def catalog_stale_change(
    connection: sqlite3.Connection,
    catalog_updated: str | None,
    stale_after_hours: float,
) -> list[dict[str, Any]]:
    updated_at = parse_datetime(catalog_updated)
    stale = updated_at is None or utc_now() - updated_at > timedelta(hours=stale_after_hours)
    was_stale = bool(get_metadata(connection, "catalog_stale", False))
    set_metadata(connection, "catalog_stale", stale)
    if stale and not was_stale:
        return [event("catalog_stale", f"CATÁLOGO DESATUALIZADO: última atualização {catalog_updated or 'desconhecida'}")]
    if not stale and was_stale:
        return [event("catalog_fresh", "CATÁLOGO NORMALIZADO: as atualizações voltaram.")]
    return []


def metadata_changes(
    connection: sqlite3.Connection,
    payload: dict[str, Any],
    watch: dict[str, Any],
    baseline_exists: bool,
) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    monitored = [
        ("promos", "notify_promotions", "PROMOÇÕES: lista atualizada"),
        ("productosDia", "notify_daily_products", "PRODUTOS DO DIA: lista atualizada"),
        ("cotizacion", "notify_exchange_rate_changes", "CÂMBIO: cotação atualizada"),
    ]
    for key, option, label in monitored:
        before = get_metadata(connection, f"payload:{key}")
        after = payload.get(key)
        set_metadata(connection, f"payload:{key}", after)
        if baseline_exists and watch.get(option, False) and compact_json(before) != compact_json(after):
            changes.append(event(f"metadata:{key}", label, data={"before": before, "after": after}))
    return changes


def format_alert_message(events: list[sqlite3.Row], max_items: int) -> str:
    displayed = events[:max_items]
    lines = [f"🔔 Shape Total: {len(events)} alteração(ões)", ""]
    lines.extend(f"• {row['summary']}" for row in displayed)
    if len(events) > len(displayed):
        lines.extend(["", f"… e mais {len(events) - len(displayed)} alteração(ões)."])
    lines.extend(["", f"Verificado em {datetime.now().astimezone().strftime('%d/%m/%Y %H:%M')}"])
    return "\n".join(lines)


def whatsapp_settings(config: dict[str, Any]) -> tuple[dict[str, Any], str, str]:
    settings = config.get("whatsapp", {})
    url = os.getenv(settings.get("webhook_url_env", ""), "") or settings.get("webhook_url", "")
    recipient = os.getenv(settings.get("recipient_env", ""), "") or settings.get("recipient", "")
    return settings, url, recipient


def send_whatsapp(config: dict[str, Any], message: str) -> None:
    settings, url, recipient = whatsapp_settings(config)
    if not settings.get("enabled", False):
        raise RuntimeError("Integração com WhatsApp ainda está desativada.")
    if not url or not recipient:
        raise RuntimeError("Configure a URL do webhook e o destinatário do WhatsApp.")

    body = render_template(
        settings.get("body_template", {"to": "{recipient}", "message": "{message}"}),
        {"recipient": recipient, "message": message},
    )
    headers = {"Content-Type": "application/json", **settings.get("headers", {})}
    token = os.getenv(settings.get("token_env", ""), "")
    if token:
        scheme = settings.get("auth_scheme", "Bearer").strip()
        headers[settings.get("auth_header", "Authorization")] = f"{scheme} {token}".strip()

    request = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=integer(settings.get("timeout_seconds"), 15)) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError(f"Servidor do WhatsApp respondeu HTTP {response.status}")


def deliver_pending_events(
    connection: sqlite3.Connection,
    config: dict[str, Any],
    logger: logging.Logger,
) -> None:
    rows = list(connection.execute("SELECT * FROM events WHERE notified = 0 ORDER BY id LIMIT 250"))
    if not rows:
        return

    message = format_alert_message(rows, integer(config.get("max_alert_items"), 30))
    logger.info("Alerta gerado:\n%s", message)
    whatsapp = config.get("whatsapp", {})
    if not whatsapp.get("enabled", False):
        connection.executemany("UPDATE events SET notified = 1 WHERE id = ?", [(row["id"],) for row in rows])
        connection.commit()
        return

    try:
        send_whatsapp(config, message)
    except Exception:
        logger.exception("Falha ao enviar alerta para o servidor do WhatsApp; será tentado novamente.")
        return

    connection.executemany("UPDATE events SET notified = 1 WHERE id = ?", [(row["id"],) for row in rows])
    connection.commit()
    logger.info("Alerta enviado ao servidor do WhatsApp.")


def record_failure(
    connection: sqlite3.Connection,
    config: dict[str, Any],
    logger: logging.Logger,
    error_message: str,
) -> None:
    previous_status = get_metadata(connection, "monitor_status", "new")
    connection.execute(
        "INSERT INTO runs(checked_at, status, error) VALUES(?, 'error', ?)",
        (iso_now(), error_message),
    )
    set_metadata(connection, "monitor_status", "error")
    connection.commit()
    if previous_status == "error":
        return

    message = f"⚠️ Shape Total: falha no monitor\n\n{error_message}"
    logger.error(message)
    if config.get("whatsapp", {}).get("enabled", False):
        try:
            send_whatsapp(config, message)
        except Exception:
            logger.exception("Também não foi possível enviar o aviso de falha pelo WhatsApp.")


def run_monitor(config_path: Path) -> int:
    config = load_config(config_path)
    log_path = resolve_path(config_path, config["log_path"])
    database_path = resolve_path(config_path, config["database_path"])
    logger = setup_logging(log_path)
    connection = open_database(database_path)

    try:
        payload = fetch_catalog(
            config["api_url"],
            integer(config.get("request_timeout_seconds"), 30),
        )
    except Exception as exc:
        record_failure(connection, config, logger, f"{type(exc).__name__}: {exc}")
        connection.close()
        return 1

    products = {
        normalized["id"]: normalized
        for raw in payload["productos"]
        if (normalized := normalize_product(raw))["id"] > 0
    }
    if len(products) < 100:
        record_failure(connection, config, logger, f"Catálogo suspeito: somente {len(products)} produtos.")
        connection.close()
        return 1

    previous = load_previous_products(connection)
    baseline_exists = bool(get_metadata(connection, "baseline_initialized", False))
    changes: list[dict[str, Any]] = []
    watch = config.get("watch", {})

    if baseline_exists:
        changes.extend(detect_product_changes(previous, products, watch, number(payload.get("cotizacion"))))
    changes.extend(metadata_changes(connection, payload, watch, baseline_exists))
    if baseline_exists:
        changes.extend(
            catalog_stale_change(
                connection,
                payload.get("actualizado"),
                number(config.get("stale_after_hours"), 36),
            )
        )
        if get_metadata(connection, "monitor_status", "ok") == "error":
            changes.append(event("monitor_recovered", "MONITOR NORMALIZADO: a API voltou a responder."))
    else:
        set_metadata(connection, "catalog_stale", False)

    cursor = connection.execute(
        "INSERT INTO runs(checked_at, status, catalog_updated, product_count, event_count) "
        "VALUES(?, 'ok', ?, ?, ?)",
        (iso_now(), payload.get("actualizado"), len(products), len(changes)),
    )
    run_id = cursor.lastrowid
    insert_events(connection, run_id, changes)
    replace_current_products(connection, products)
    set_metadata(connection, "baseline_initialized", True)
    set_metadata(connection, "monitor_status", "ok")
    set_metadata(connection, "last_success", iso_now())
    set_metadata(connection, "catalog_updated", payload.get("actualizado"))
    connection.commit()

    if baseline_exists:
        logger.info("Consulta concluída: %s produtos, %s alterações.", len(products), len(changes))
    else:
        logger.info("Linha de base criada com %s produtos; nenhum alerta foi enviado.", len(products))
    deliver_pending_events(connection, config, logger)
    connection.close()
    return 0


def show_status(config_path: Path) -> int:
    config = load_config(config_path)
    database_path = resolve_path(config_path, config["database_path"])
    if not database_path.exists():
        print("O monitor ainda não possui linha de base.")
        return 1
    connection = open_database(database_path)
    last_run = connection.execute("SELECT * FROM runs ORDER BY id DESC LIMIT 1").fetchone()
    total_events = connection.execute("SELECT COUNT(*) AS total FROM events").fetchone()["total"]
    pending = connection.execute("SELECT COUNT(*) AS total FROM events WHERE notified = 0").fetchone()["total"]
    products = connection.execute("SELECT COUNT(*) AS total FROM current_products").fetchone()["total"]
    print(f"Status: {last_run['status'] if last_run else 'sem execuções'}")
    print(f"Última verificação: {last_run['checked_at'] if last_run else '--'}")
    print(f"Atualização do catálogo: {get_metadata(connection, 'catalog_updated', '--')}")
    print(f"Produtos acompanhados: {products}")
    print(f"Eventos registrados: {total_events}")
    print(f"Alertas pendentes: {pending}")
    connection.close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Monitor local do catálogo Shape Total")
    parser.add_argument("--config", default="config.json", help="Caminho do arquivo de configuração")
    parser.add_argument("--status", action="store_true", help="Exibe o estado local sem consultar o site")
    parser.add_argument("--test-notification", action="store_true", help="Testa o webhook do WhatsApp")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    if args.status:
        return show_status(config_path)
    if args.test_notification:
        config = load_config(config_path)
        send_whatsapp(config, "✅ Teste do monitor Shape Total realizado com sucesso.")
        print("Notificação de teste enviada.")
        return 0
    return run_monitor(config_path)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as exc:
        print(f"ERRO: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(1)
