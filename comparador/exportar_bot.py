"""Gera data/bot.json: os dados que o chat de busca (site separado) usa para responder no navegador.

O chat não repete as regras de leitura dos nomes: recebe de cada produto o que `features` já extraiu
(princípio ativo, dose, quantidade) e a lista de sinônimos, e só faz a busca e a comparação.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from comparador import BRAND_ALIASES, STORE_LABELS, SYNONYMS, brand_key, features

PRODUCT_FIELDS = ("loja", "id", "codigo", "nome", "marca", "detalhe", "preco", "disponivel", "atacado")


def export_product(item: dict[str, Any]) -> dict[str, Any]:
    extracted = features(item)
    product = {field: item.get(field) for field in PRODUCT_FIELDS if item.get(field) not in (None, "", [])}
    product["disponivel"] = bool(item.get("disponivel"))
    product["chave_marca"] = brand_key(item.get("marca", "")) or brand_key(item["nome"]) or "sem marca"
    product["f"] = {
        "tokens": sorted(extracted["tokens"]),
        "doses": sorted(extracted["doses"]),
        "marcas": sorted(extracted["brands"]),
        "count": extracted["count"],
        "volume": extracted["volume"],
        "pack": extracted["pack"],
        "form": extracted["form"],
    }
    return product


def build(data: dict[str, Any]) -> dict[str, Any]:
    products = data["produtos"]
    position = {(item["loja"], item["id"]): index for index, item in enumerate(products)}
    # Grupos de confiança baixa não são tratados como o mesmo produto na busca.
    groups = [
        [position[(item["loja"], item["id"])] for item in group["itens"].values()]
        for group in data.get("grupos", [])
        if group["confianca"] != "baixa"
    ]
    return {
        "gerado_em": data["gerado_em"],
        "cotacoes": data.get("cotacoes") or {},
        "lojas": STORE_LABELS,
        "sinonimos": {name: list(canonical) for name, canonical in SYNONYMS.items()},
        "apelidos_marca": BRAND_ALIASES,
        "produtos": [export_product(item) for item in products],
        "grupos": groups,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta os dados do chat de busca")
    parser.add_argument("--painel", default="data/painel.json", help="JSON gerado pelo comparador")
    parser.add_argument("--saida", default="data/bot.json", help="Arquivo publicado para o chat")
    args = parser.parse_args()

    data = json.loads(Path(args.painel).read_text(encoding="utf-8"))
    payload = build(data)
    Path(args.saida).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{args.saida}: {len(payload['produtos'])} produtos, {len(payload['grupos'])} grupos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
