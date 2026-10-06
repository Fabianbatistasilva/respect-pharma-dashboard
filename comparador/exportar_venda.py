"""Gera o que o site de venda (chat para o cliente) publica: data/venda.json e data/tabela-precos.pdf.

Nada do que sai daqui mostra a origem do produto: não vai loja, custo, dólar, código nem faixa de atacado.
O preço é o de venda, já com a margem: menor custo em reais x (1 + margem/100), arredondado para cima.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from comparador import BRAND_ALIASES, SYNONYMS, brand_key, features
from relatorio_pdf import build_sales_pdf, sale_rows

DEFAULT_MARKUP = 110.0
# O chat usa a mesma estrutura dos dados de custo; aqui só existe uma "loja", sem nome.
STORE = "venda"


def combined_features(items: list[dict[str, Any]]) -> dict[str, Any]:
    """Junta o que cada loja informa do mesmo produto: uma diz a dose, outra a quantidade de frascos."""
    merged = features(max(items, key=lambda item: len(item.get("detalhe") or "")))
    for item in items:
        extra = features(item)
        merged["doses"] = merged["doses"] | extra["doses"]
        for field in ("count", "volume", "pack", "form"):
            merged[field] = merged[field] or extra[field]
    return merged


def export_row(number: int, row: dict[str, Any]) -> dict[str, Any]:
    items = row["itens"]
    extracted = combined_features(items)
    product = {
        "loja": STORE,
        "id": str(number),
        "nome": row["nome"],
        "marca": row["marca"],
        "secao": row["secao"],
        "preco": row["venda"],
        "disponivel": True,
        "chave_marca": brand_key(row["marca"]) or brand_key(row["nome"]) or "sem marca",
        # Só para a busca achar o produto pelo nome que as pessoas conhecem; não aparece na tela.
        "busca": " ".join(dict.fromkeys(item["nome"] for item in items)),
        "f": {
            "tokens": sorted(extracted["tokens"]),
            "doses": sorted(extracted["doses"]),
            "marcas": sorted(extracted["brands"]),
            "count": extracted["count"],
            "volume": extracted["volume"],
            "pack": extracted["pack"],
            "form": extracted["form"],
        },
    }
    detail = next((item["detalhe"] for item in items if item.get("detalhe")), "")
    if detail:
        product["detalhe"] = detail
    return product


def build(data: dict[str, Any], markup_percent: float = DEFAULT_MARKUP) -> dict[str, Any]:
    rows = sale_rows(data, markup_percent)
    return {
        "venda": True,
        "gerado_em": data["gerado_em"],
        "cotacoes": {STORE: 1},
        "lojas": {STORE: ""},
        "sinonimos": {name: list(canonical) for name, canonical in SYNONYMS.items()},
        "apelidos_marca": BRAND_ALIASES,
        "produtos": [export_row(number, row) for number, row in enumerate(rows, 1)],
        "grupos": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta os preços de venda e a tabela em PDF para o site do cliente")
    parser.add_argument("--painel", default="data/painel.json", help="JSON gerado pelo comparador")
    parser.add_argument("--saida", default="data/venda.json", help="Dados do chat de venda")
    parser.add_argument("--pdf", default="data/tabela-precos.pdf", help="Tabela de preços em PDF")
    parser.add_argument("--margem", type=float, default=DEFAULT_MARKUP, help="Lucro sobre o custo, em %% (110 = custo x 2,10)")
    args = parser.parse_args()

    data = json.loads(Path(args.painel).read_text(encoding="utf-8"))
    payload = build(data, args.margem)
    Path(args.saida).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    stats = build_sales_pdf(data, Path(args.pdf), args.margem)
    print(f"{args.saida}: {len(payload['produtos'])} produtos; {args.pdf}: {stats['paginas']} páginas; margem {args.margem:g}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
