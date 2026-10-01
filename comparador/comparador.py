from __future__ import annotations

import argparse
import json
import logging
import re
import sqlite3
import sys
import urllib.request
import webbrowser
from datetime import datetime
from pathlib import Path
from typing import Any

from monitor import (
    fetch_catalog,
    format_price,
    integer,
    iso_now,
    load_config,
    normalize_product,
    normalize_text,
    number,
    resolve_path,
    send_whatsapp,
    setup_logging,
)


SHAPE = "shapetotal"
BYP = "bypharmacon"
STORE_LABELS = {SHAPE: "Shape Total", BYP: "ByPharmacon"}

DEFAULTS = {
    "bypharmacon_api_url": "https://bypharmacon.com/api/catalog",
    "bypharmacon_fx_url": "https://api.bypharmacon.com/store/fx/current",
    # Chave pública da vitrine, a mesma que o site envia pelo navegador.
    "bypharmacon_publishable_key": "pk_fe5d1274205100ac4ccf1532e9cfe4033759dd9206ae91e96a66b97503e9f9f7",
    # Reais por dólar. null = usar a cotação que cada loja publica no dia.
    "cotacao_fixa": None,
    # true = baixar o catálogo do Shape Total direto do site, sem depender do banco do monitor.
    "fetch_shape_directly": False,
    "database_path": "data/comparador.sqlite3",
    "panel_path": "data/painel.html",
    "matches_path": "correspondencias.json",
    "min_score": 0.62,
    "notify_bypharmacon_changes": True,
    "max_alert_items": 30,
}

BEST_MARGIN = 0.1
# Diferença de preço tão grande costuma indicar embalagens diferentes, não uma pechincha.
SUSPICIOUS_PRICE_RATIO = 1.6

# Nomes compostos que as lojas escrevem de formas diferentes ("BPC 157", "BPC-157", "BPC157").
COMPOUND_PATTERNS = [
    (r"bpc\W*157", " bpc157 "),
    (r"tb\W*500", " tb500 "),
    (r"ghk\W*cu", " ghkcu "),
    (r"ahk\W*cu", " ahkcu "),
    (r"pt\W*141", " pt141 "),
    (r"cjc\W*1295", " cjc1295 "),
    (r"aod\W*9604", " aod "),
    (r"nad\s*\+", " nad "),
    (r"mots\W*c\b", " motsc "),
    (r"igf\W*1", " igf1 "),
    (r"cbl\W*514", " cbl "),
    (r"176\W*191\s*(aa)?", " "),
    (r"ss\W*31", " ss31 "),
    (r"melanotan\W*2", " melanotan2 "),
    (r"slu\W*pp\W*332", " slupp332 "),
    (r"lr\W*3", " lr3 "),
    (r"ghrp\W*(\d)", r" ghrp\1 "),
]

# Nome comercial ou grafia alternativa -> princípio ativo padronizado.
SYNONYMS: dict[str, tuple[str, ...]] = {
    "decaland": ("nandrolona", "decanoato"),
    "decanbolic": ("nandrolona", "decanoato"),
    "decabolic": ("nandrolona", "decanoato"),
    "deca": ("decanoato",),
    "decano": ("decanoato",),
    "decanoate": ("decanoato",),
    "decanoat": ("decanoato",),
    "nandrolone": ("nandrolona",),
    "npp": ("nandrolona", "fenilpropionato"),
    "nanbolic": ("nandrolona", "fenilpropionato"),
    "fenil": ("fenilpropionato",),
    "phenil": ("fenilpropionato",),
    "phenilpropionato": ("fenilpropionato",),
    "ph": ("fenilpropionato",),
    "durateston": ("testosterona", "mix"),
    "susobolic": ("testosterona", "mix"),
    "dura": ("testosterona", "mix"),
    "sustan": ("testosterona", "mix"),
    "sustanon": ("testosterona", "mix"),
    "testenat": ("testosterona", "enantato"),
    "enanbolic": ("testosterona", "enantato"),
    "enant": ("enantato",),
    "enanthato": ("enantato",),
    "enanthate": ("enantato",),
    "testoland": ("testosterona", "cipionato"),
    "testolan": ("testosterona", "cipionato"),
    "cypobolic": ("testosterona", "cipionato"),
    "cypionate": ("cipionato",),
    "probolic": ("testosterona", "propionato"),
    "propio": ("propionato",),
    "propionate": ("propionato",),
    "testo": ("testosterona",),
    "masteron": ("drostanolona",),
    "masterbolic": ("drostanolona", "propionato"),
    "masteronbolic": ("drostanolona",),
    "drostenolona": ("drostanolona",),
    "drosta": ("drostanolona",),
    "drost": ("drostanolona",),
    "primobolan": ("metenolona",),
    "primo": ("metenolona",),
    "primogem": ("metenolona",),
    "primogen": ("metenolona",),
    "primobolic": ("metenolona",),
    "primobol": ("metenolona",),
    "methenolone": ("metenolona",),
    "hemogenin": ("oximetalona",),
    "hemogenim": ("oximetalona",),
    "oxitoland": ("oximetalona",),
    "oxybolic": ("oximetalona",),
    "oxandroland": ("oxandrolona",),
    "oxanbolic": ("oxandrolona",),
    "oxandrolone": ("oxandrolona",),
    "anavar": ("oxandrolona",),
    "stanozoland": ("estanozolol",),
    "stanozolol": ("estanozolol",),
    "winstrol": ("estanozolol",),
    "clenbolic": ("clembuterol",),
    "clenbuterol": ("clembuterol",),
    "androlic": ("mesterolona",),
    "provibolic": ("mesterolona",),
    "proviron": ("mesterolona",),
    "turbolic": ("turinabol",),
    "turina": ("turinabol",),
    "nolvabolic": ("tamoxifeno",),
    "flubolic": ("fluoximesterolona",),
    "fluoxymesterone": ("fluoximesterolona",),
    "halotestin": ("fluoximesterolona",),
    "metandrostenolona": ("metandienona",),
    "methandienone": ("metandienona",),
    "diabolic": ("metandienona",),
    "dianabol": ("metandienona",),
    "trenbolic": ("trembolona",),
    "trenbolona": ("trembolona",),
    "trenbolone": ("trembolona",),
    "boldenone": ("boldenona",),
    "bolbolic": ("boldenona",),
    "undecilato": ("undecilenato",),
    "undecanoato": ("undecilenato",),
    "retatrutide": ("retatrutida",),
    "retatrudide": ("retatrutida",),
    "retagen": ("retatrutida",),
    "tirzegen": ("tirzepatida",),
    "tirze": ("tirzepatida",),
    "tirz": ("tirzepatida",),
    "tirzepatide": ("tirzepatida",),
    "mounjaro": ("tirzepatida",),
    "gonadotropina": ("hcg",),
    "gonadotropin": ("hcg",),
    "cotropin": ("hcg",),
    "fragment": ("frag",),
    "fragmentado": ("frag",),
    "ipa": ("ipamorelin",),
    "bremelanotida": ("pt141",),
    "kisspeptin": ("kisspeptina",),
}

STOPWORDS = {
    "de", "do", "da", "em", "com", "para", "the", "and", "por",
    "mg", "ml", "mcg", "ui", "iu", "gr", "comp", "compr", "comprimidos", "comprimido",
    "tab", "tabs", "tablets", "caps", "capsulas", "amp", "ampollas", "ampolas",
    "vial", "viais", "vials", "kit", "depot", "plus", "gold", "pep", "labs", "lab",
    "healthcare", "health", "pharma", "farma", "accion", "prolongada", "inyectable",
    "caneta", "pen", "diluido", "liquido", "aquoso", "po", "polvo", "liofilizado",
    "sales", "tri", "deposteron", "somatropina",
}


def to_float(text: str) -> float:
    return float(text.replace(",", "."))


def clean_number(value: float) -> str:
    return f"{value:g}"


def brand_key(brand: str) -> str:
    words = re.findall(r"[a-z0-9]+", normalize_text(brand))
    return words[0] if words else ""


def features(item: dict[str, Any]) -> dict[str, Any]:
    """Extrai do nome o que permite reconhecer o mesmo produto em outra loja."""
    text = normalize_text(f"{item['nome']} {item.get('detalhe', '')}")
    text = re.sub(r"(?<=\d),(?=\d)", ".", text)
    for pattern, replacement in COMPOUND_PATTERNS:
        text = re.sub(pattern, replacement, text)

    doses: set[str] = set()
    for value, unit in re.findall(r"(\d+(?:\.\d+)?)\s*(mcg|mg|ui|iu)\b", text):
        amount = to_float(value)
        if unit == "mcg":
            doses.add(clean_number(amount / 1000) + "mg")
        elif unit in ("ui", "iu"):
            doses.add(clean_number(amount) + "ui")
        else:
            doses.add(clean_number(amount) + "mg")
    extra_dose = normalize_text(item.get("dose", "")).replace(",", ".")
    found = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*(mcg|mg|ui)?\s*", extra_dose)
    if found:
        amount = to_float(found.group(1))
        unit = found.group(2) or "mg"
        doses.add(clean_number(amount / 1000 if unit == "mcg" else amount) + ("ui" if unit == "ui" else "mg"))

    count = None
    found = re.search(r"(\d+)\s*x\s*(\d+)\s*(?:tab|comp)", text)
    if found:
        count = int(found.group(1)) * int(found.group(2))
    else:
        found = re.search(r"(\d+)\s*(?:comprimidos|compr|comp|tablets|tabs|tab|caps|capsulas)\b", text)
        if found:
            count = int(found.group(1))

    volume = None
    found = re.search(r"(\d+)\s*(?:amp\w*\.?)?\s*x\s*(\d+(?:\.\d+)?)\s*ml\b", text)
    if found:
        volume = int(found.group(1)) * to_float(found.group(2))
    else:
        found = re.search(r"(?<![/\d.])(\d+(?:\.\d+)?)\s*ml\b", text)
        if found:
            volume = to_float(found.group(1))

    quantity = normalize_text(item.get("quantidade", "")).replace(",", ".")
    found = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*(ml)?\s*", quantity)
    if found:
        if found.group(2):
            volume = volume if volume is not None else to_float(found.group(1))
        elif count is None and "comprim" in normalize_text(item.get("apresentacao", "")):
            count = int(to_float(found.group(1)))

    words = set(re.findall(r"[a-z0-9]+", text))
    presentation = normalize_text(item.get("apresentacao", ""))
    if words & {"caneta", "pen"}:
        form = "caneta"
    elif words & {"diluido", "liquido", "aquoso"} or presentation == "diluido":
        form = "diluido"
    elif words & {"po", "polvo", "vial", "viais", "vials"} or presentation == "liofilizado":
        form = "po"
    else:
        form = None

    pack = None
    for pattern in (r"(\d+)\s*(?:viais|vials?|amp\w*|canetas)\b", r"\b(\d+)\s*x(?=\s*\d)", r"\b(\d+)x\b"):
        found = re.search(pattern, text)
        if found:
            pack = int(found.group(1))
            break

    brand_words = set(re.findall(r"[a-z0-9]+", normalize_text(item.get("marca", ""))))
    tokens: set[str] = set()
    for word in re.findall(r"[a-z][a-z0-9]*", re.sub(r"\d+(?:\.\d+)?\s*(mcg|mg|ui|iu|ml)\b", " ", text)):
        if len(word) < 2 or word in STOPWORDS or word in brand_words or word == "lander":
            continue
        tokens.update(SYNONYMS.get(word, (word,)))

    return {
        "brand": brand_key(item.get("marca", "")),
        "name_words": words,
        "tokens": tokens,
        "doses": doses,
        "count": count,
        "volume": volume,
        "form": form,
        "pack": pack,
    }


def brands_compatible(a: dict[str, Any], b: dict[str, Any]) -> bool:
    if not a["brand"] or not b["brand"]:
        return True
    return a["brand"] == b["brand"] or a["brand"] in b["name_words"] or b["brand"] in a["name_words"]


def match_score(a: dict[str, Any], b: dict[str, Any]) -> float:
    """0 = produtos diferentes; 1 = mesmo princípio ativo, dose e embalagem."""
    if not a["tokens"] or not b["tokens"] or not brands_compatible(a, b):
        return 0.0
    common = a["tokens"] & b["tokens"]
    if not common:
        return 0.0
    if a["doses"] and b["doses"] and not a["doses"] & b["doses"]:
        return 0.0
    if a["count"] and b["count"] and a["count"] != b["count"]:
        return 0.0
    if a["volume"] and b["volume"] and a["volume"] != b["volume"]:
        return 0.0
    if a["form"] and b["form"] and a["form"] != b["form"]:
        return 0.0
    if a["pack"] and b["pack"] and a["pack"] != b["pack"]:
        return 0.0

    jaccard = len(common) / len(a["tokens"] | b["tokens"])
    overlap = len(common) / min(len(a["tokens"]), len(b["tokens"]))
    names = 0.5 * jaccard + 0.5 * overlap
    if a["doses"] and b["doses"]:
        dose = len(a["doses"] & b["doses"]) / len(a["doses"] | b["doses"])
    else:
        dose = 0.5
    return round(0.7 * names + 0.3 * dose, 3)


def load_matches(path: Path) -> tuple[set[tuple[str, str]], set[tuple[str, str]]]:
    if not path.exists():
        return set(), set()
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    def pairs(key: str) -> set[tuple[str, str]]:
        return {(str(entry[SHAPE]), str(entry[BYP])) for entry in data.get(key, [])}

    return pairs("confirmar"), pairs("rejeitar")


def match_products(
    shape_items: list[dict[str, Any]],
    byp_items: list[dict[str, Any]],
    confirmed: set[tuple[str, str]],
    rejected: set[tuple[str, str]],
    min_score: float,
) -> list[dict[str, Any]]:
    shape_by_id = {item["id"]: item for item in shape_items}
    byp_by_id = {item["id"]: item for item in byp_items}
    used_shape: set[str] = set()
    used_byp: set[str] = set()
    matches: list[dict[str, Any]] = []

    for shape_id, byp_id in sorted(confirmed):
        if shape_id in shape_by_id and byp_id in byp_by_id:
            matches.append({SHAPE: shape_by_id[shape_id], BYP: byp_by_id[byp_id], "score": 1.0, "confianca": "confirmada"})
            used_shape.add(shape_id)
            used_byp.add(byp_id)

    shape_features = {item["id"]: features(item) for item in shape_items}
    byp_features = {item["id"]: features(item) for item in byp_items}
    candidates = []
    for byp_id, byp_feature in byp_features.items():
        for shape_id, shape_feature in shape_features.items():
            if (shape_id, byp_id) in rejected:
                continue
            score = match_score(shape_feature, byp_feature)
            if score >= min_score:
                candidates.append((score, shape_id, byp_id))

    # Um par só vale se for (quase) a melhor opção dos dois lados; evita casar sobras.
    best_shape: dict[str, float] = {}
    best_byp: dict[str, float] = {}
    for score, shape_id, byp_id in candidates:
        best_shape[shape_id] = max(score, best_shape.get(shape_id, 0))
        best_byp[byp_id] = max(score, best_byp.get(byp_id, 0))

    for score, shape_id, byp_id in sorted(candidates, key=lambda entry: (-entry[0], entry[1], entry[2])):
        if shape_id in used_shape or byp_id in used_byp:
            continue
        if score < best_shape[shape_id] - BEST_MARGIN or score < best_byp[byp_id] - BEST_MARGIN:
            continue
        used_shape.add(shape_id)
        used_byp.add(byp_id)
        prices = sorted([shape_by_id[shape_id]["preco"], byp_by_id[byp_id]["preco"]])
        if prices[0] <= 0 or prices[1] / prices[0] > SUSPICIOUS_PRICE_RATIO:
            confidence = "baixa"
        else:
            confidence = "alta" if score >= 0.85 else "media"
        matches.append({SHAPE: shape_by_id[shape_id], BYP: byp_by_id[byp_id], "score": score, "confianca": confidence})
    return matches


def load_shape_items(monitor_database: Path) -> tuple[list[dict[str, Any]], float]:
    """Lê o catálogo e a cotação que o monitor acabou de salvar, sem consultar o site de novo."""
    if not monitor_database.exists():
        return [], 0.0
    connection = sqlite3.connect(monitor_database)
    rows = connection.execute("SELECT payload FROM current_products").fetchall()
    metadata = dict(connection.execute("SELECT key, value FROM metadata").fetchall())
    connection.close()
    rate = number(json.loads(metadata.get("payload:cotizacion", "0")))
    promos = json.loads(metadata.get("payload:promos", "null")) or []
    return build_shape_items([json.loads(payload) for (payload,) in rows], promos), rate


def fetch_shape_items(url: str, timeout: int) -> tuple[list[dict[str, Any]], float]:
    payload = fetch_catalog(url, timeout)
    products = [product for raw in payload["productos"] if (product := normalize_product(raw))["id"] > 0]
    if len(products) < 100:
        raise ValueError(f"Catálogo do Shape Total suspeito: somente {len(products)} produtos.")
    return build_shape_items(products, payload.get("promos") or []), number(payload.get("cotizacion"))


def build_shape_items(products: list[dict[str, Any]], promo_list: list[Any]) -> list[dict[str, Any]]:
    # "Promos do dia": o site cobra esse preço no lugar do preço de catálogo.
    promos = {
        str(promo.get("productoId")): number(promo.get("precio"))
        for promo in promo_list
        if isinstance(promo, dict)
    }
    items = []
    for product in products:
        stock = {
            "CDE": integer(product.get("stock_cde")),
            "PJ": integer(product.get("stock_pj")),
            "SG": integer(product.get("stock_sg")),
        }
        total = sum(stock.values())
        items.append(
            {
                "loja": SHAPE,
                "id": str(product["id"]),
                "nome": product["nombre"],
                "marca": product.get("marca", ""),
                "categoria": product.get("categoria", ""),
                "detalhe": product.get("composicion", ""),
                "apresentacao": product.get("presentacion", ""),
                "quantidade": product.get("qty", ""),
                "dose": product.get("mg", ""),
                "preco": number(product.get("precio")),
                "preco_original": None,
                "atacado": [],
                "estoque": total,
                "estoque_detalhe": " · ".join(f"{branch} {amount}" for branch, amount in stock.items()),
                "disponivel": total > 0,
                "url": "https://shapetotal.com/",
            }
        )
        promo_price = promos.get(items[-1]["id"], 0)
        if 0 < promo_price < items[-1]["preco"]:
            items[-1]["preco_original"] = items[-1]["preco"]
            items[-1]["preco"] = promo_price
    return items


def normalize_bypharmacon(product: dict[str, Any]) -> dict[str, Any]:
    price = number(product.get("priceRetail"))
    tiers = [
        {"min": integer(tier.get("min_quantity"), 1), "preco": number(tier.get("amount"))}
        for tier in product.get("priceTiersUSD") or []
        if integer(tier.get("min_quantity"), 1) > 1 and number(tier.get("amount")) != price
    ]
    original = number((product.get("promo_prices") or {}).get("price_a_original"))
    stock = integer(product.get("stock"))
    return {
        "loja": BYP,
        "id": str(product.get("id") or ""),
        "nome": str(product.get("name") or "").strip(),
        "marca": str(product.get("brand") or "").strip(),
        "categoria": str(product.get("category") or "").strip(),
        "detalhe": "",
        "apresentacao": "",
        "quantidade": "",
        "dose": "",
        "preco": price,
        "preco_original": original if original > price else None,
        "atacado": tiers,
        "estoque": stock,
        "estoque_detalhe": "",
        "disponivel": bool(product.get("inStock")),
        "url": "https://bypharmacon.com/produtos",
    }


def fetch_bypharmacon(url: str, timeout: int) -> list[dict[str, Any]]:
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0 ComparadorLocal/1.0 (+personal-use)"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.load(response)
    if not isinstance(payload, dict) or not isinstance(payload.get("products"), list):
        raise ValueError("Resposta do ByPharmacon não contém a lista 'products'.")
    items = [normalize_bypharmacon(product) for product in payload["products"]]
    items = [item for item in items if item["id"] and item["nome"]]
    if len(items) < 30:
        raise ValueError(f"Catálogo do ByPharmacon suspeito: somente {len(items)} produtos.")
    return items


def fetch_bypharmacon_rate(url: str, publishable_key: str, timeout: int) -> float:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 ComparadorLocal/1.0 (+personal-use)",
            "x-publishable-api-key": publishable_key,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.load(response)
    rate = number(payload.get("commercial_rate"))
    if payload.get("quote_currency") != "BRL" or rate <= 0:
        raise ValueError("Resposta de câmbio do ByPharmacon sem cotação em reais.")
    return rate


def open_database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loja TEXT NOT NULL,
            produto_id TEXT NOT NULL,
            nome TEXT NOT NULL,
            preco REAL NOT NULL,
            disponivel INTEGER NOT NULL,
            visto_em TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_historico_produto ON historico(loja, produto_id, id);
        CREATE TABLE IF NOT EXISTS alertas_pendentes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resumo TEXT NOT NULL
        );
        """
    )
    return connection


def last_states(connection: sqlite3.Connection, store: str) -> dict[str, sqlite3.Row]:
    rows = connection.execute(
        "SELECT * FROM historico WHERE id IN "
        "(SELECT MAX(id) FROM historico WHERE loja = ? GROUP BY produto_id)",
        (store,),
    )
    return {row["produto_id"]: row for row in rows}


def record_history(connection: sqlite3.Connection, store: str, items: list[dict[str, Any]]) -> list[str]:
    """Grava uma linha só quando preço ou disponibilidade mudam; devolve o resumo das mudanças."""
    previous = last_states(connection, store)
    seen_at = iso_now()
    summaries: list[str] = []
    label = STORE_LABELS[store]
    for item in items:
        before = previous.get(item["id"])
        if before is not None and before["preco"] == item["preco"] and bool(before["disponivel"]) == item["disponivel"]:
            continue
        connection.execute(
            "INSERT INTO historico(loja, produto_id, nome, preco, disponivel, visto_em) VALUES(?, ?, ?, ?, ?, ?)",
            (store, item["id"], item["nome"], item["preco"], int(item["disponivel"]), seen_at),
        )
        if not previous:
            continue
        if before is None:
            summaries.append(f"NOVO ({label}): {item['nome']} — {format_price(item['preco'])}")
            continue
        if before["preco"] != item["preco"]:
            summaries.append(
                f"PREÇO ({label}): {item['nome']} — {format_price(before['preco'])} → {format_price(item['preco'])}"
            )
        if bool(before["disponivel"]) != item["disponivel"]:
            status = "VOLTOU" if item["disponivel"] else "ESGOTOU"
            summaries.append(f"{status} ({label}): {item['nome']}")
    return summaries


def price_changes(connection: sqlite3.Connection, limit: int = 300) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT atual.loja, atual.nome, atual.preco, atual.visto_em, anterior.preco AS preco_anterior
        FROM historico AS atual
        JOIN historico AS anterior ON anterior.id = (
            SELECT MAX(id) FROM historico
            WHERE loja = atual.loja AND produto_id = atual.produto_id AND id < atual.id
        )
        WHERE atual.preco != anterior.preco
        ORDER BY atual.id DESC LIMIT ?
        """,
        (limit,),
    )
    return [
        {"loja": row["loja"], "nome": row["nome"], "antes": row["preco_anterior"], "depois": row["preco"], "quando": row["visto_em"]}
        for row in rows
    ]


def deliver_alerts(
    connection: sqlite3.Connection,
    config: dict[str, Any],
    logger: logging.Logger,
    max_items: int,
) -> None:
    rows = list(connection.execute("SELECT * FROM alertas_pendentes ORDER BY id LIMIT 250"))
    if not rows:
        return
    lines = [f"🔔 ByPharmacon: {len(rows)} alteração(ões)", ""]
    lines.extend(f"• {row['resumo']}" for row in rows[:max_items])
    if len(rows) > max_items:
        lines.extend(["", f"… e mais {len(rows) - max_items} alteração(ões)."])
    lines.extend(["", f"Verificado em {datetime.now().astimezone().strftime('%d/%m/%Y %H:%M')}"])
    message = "\n".join(lines)
    logger.info("Alerta gerado:\n%s", message)
    if config.get("whatsapp", {}).get("enabled", False):
        try:
            send_whatsapp(config, message)
        except Exception:
            logger.exception("Falha ao enviar alerta do ByPharmacon; será tentado novamente.")
            return
        logger.info("Alerta do ByPharmacon enviado ao servidor do WhatsApp.")
    connection.executemany("DELETE FROM alertas_pendentes WHERE id = ?", [(row["id"],) for row in rows])
    connection.commit()


PUBLIC_FIELDS = (
    "loja", "id", "nome", "marca", "categoria", "detalhe", "preco", "preco_original",
    "atacado", "estoque", "estoque_detalhe", "disponivel", "url",
)


def public_item(item: dict[str, Any]) -> dict[str, Any]:
    return {key: item[key] for key in PUBLIC_FIELDS}


def build_panel_data(
    shape_items: list[dict[str, Any]],
    byp_items: list[dict[str, Any]],
    matches: list[dict[str, Any]],
    changes: list[dict[str, Any]],
    errors: list[str],
    rates: dict[str, float],
) -> dict[str, Any]:
    return {
        "gerado_em": iso_now(),
        "lojas": STORE_LABELS,
        "cotacoes": rates,
        "erros": errors,
        "pares": [
            {
                SHAPE: public_item(match[SHAPE]),
                BYP: public_item(match[BYP]),
                "score": match["score"],
                "confianca": match["confianca"],
            }
            for match in matches
        ],
        "produtos": [public_item(item) for item in shape_items + byp_items],
        "mudancas": changes,
    }


def render_panel(data: dict[str, Any]) -> str:
    template = (Path(__file__).resolve().parent / "painel_template.html").read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return template.replace("__DADOS__", payload)


def run(config_path: Path, send_alerts: bool = True) -> int:
    config = load_config(config_path)
    settings = {**DEFAULTS, **config.get("comparador", {})}
    logger = setup_logging(resolve_path(config_path, config["log_path"]))
    connection = open_database(resolve_path(config_path, settings["database_path"]))
    errors: list[str] = []

    timeout = integer(config.get("request_timeout_seconds"), 30)
    if settings["fetch_shape_directly"]:
        try:
            shape_items, shape_rate = fetch_shape_items(config["api_url"], timeout)
        except Exception as exc:
            shape_items, shape_rate = [], 0.0
            errors.append(f"Shape Total: {type(exc).__name__}: {exc}")
    else:
        shape_items, shape_rate = load_shape_items(resolve_path(config_path, config["database_path"]))
        if not shape_items:
            errors.append("Shape Total: o monitor ainda não salvou o catálogo.")

    try:
        byp_items = fetch_bypharmacon(settings["bypharmacon_api_url"], timeout)
    except Exception as exc:
        byp_items = []
        errors.append(f"ByPharmacon: {type(exc).__name__}: {exc}")

    fixed_rate = number(settings["cotacao_fixa"])
    if fixed_rate > 0:
        rates = {SHAPE: fixed_rate, BYP: fixed_rate}
    else:
        try:
            byp_rate = fetch_bypharmacon_rate(
                settings["bypharmacon_fx_url"], settings["bypharmacon_publishable_key"], timeout
            )
        except Exception as exc:
            byp_rate = 0.0
            errors.append(f"Cotação do ByPharmacon indisponível ({type(exc).__name__}); valores em reais usam a do Shape Total.")
        if shape_rate <= 0 and byp_rate <= 0:
            errors.append("Nenhuma loja informou a cotação; defina 'cotacao_fixa' no config.json para ver valores em reais.")
        rates = {SHAPE: shape_rate or byp_rate, BYP: byp_rate or shape_rate}

    record_history(connection, SHAPE, shape_items)
    summaries = record_history(connection, BYP, byp_items)
    if send_alerts and settings["notify_bypharmacon_changes"]:
        connection.executemany("INSERT INTO alertas_pendentes(resumo) VALUES(?)", [(text,) for text in summaries])
    connection.commit()

    confirmed, rejected = load_matches(resolve_path(config_path, settings["matches_path"]))
    matches = match_products(shape_items, byp_items, confirmed, rejected, number(settings["min_score"], 0.62))
    data = build_panel_data(shape_items, byp_items, matches, price_changes(connection), errors, rates)
    panel_path = resolve_path(config_path, settings["panel_path"])
    panel_path.parent.mkdir(parents=True, exist_ok=True)
    panel_path.write_text(render_panel(data), encoding="utf-8")

    for error in errors:
        logger.error("Comparador: %s", error)
    logger.info(
        "Comparador: %s produtos Shape Total, %s ByPharmacon, %s pares, %s alterações no ByPharmacon.",
        len(shape_items),
        len(byp_items),
        len(matches),
        len(summaries),
    )
    if send_alerts:
        deliver_alerts(connection, config, logger, integer(settings["max_alert_items"], 30))
    connection.close()
    return 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Comparador de preços Shape Total x ByPharmacon")
    parser.add_argument("--config", default="config.json", help="Caminho do arquivo de configuração")
    parser.add_argument("--sem-alertas", action="store_true", help="Atualiza o painel sem enviar WhatsApp")
    parser.add_argument("--abrir", action="store_true", help="Abre o painel no navegador ao terminar")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    code = run(config_path, send_alerts=not args.sem_alertas)
    if args.abrir:
        config = load_config(config_path)
        settings = {**DEFAULTS, **config.get("comparador", {})}
        webbrowser.open(resolve_path(config_path, settings["panel_path"]).as_uri())
    return code


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as exc:
        print(f"ERRO: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(1)
