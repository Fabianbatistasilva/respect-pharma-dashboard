"""Lojas que mandam o catálogo em PDF (a primeira é a Life Suplementos).

Alguém manda o PDF no grupo do WhatsApp; o bot reconhece a loja pelo conteúdo (ou pelo nome do arquivo), lê os
produtos e guarda o catálogo em data/catalogos/<loja>.json. O comparador lê esse arquivo a cada coleta, como se
fosse a lista de uma loja online: os produtos entram no /busca, no /comparar, nos PDFs e no histórico.

O catálogo só existe neste PC: não vai para o GitHub, para o painel publicado nem para o site do cliente.

Para importar um PDF à mão:  python catalogos_pdf.py caminho/do/catalogo.pdf
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from monitor import normalize_text

LIFE = "life"

PDF_STORES: dict[str, dict[str, Any]] = {
    LIFE: {
        "label": "Life Suplementos",
        "prefixo": "LF",
        # A capa traz o nome da loja e o título do catálogo; o nome do arquivo costuma trazer "life".
        "capa": ("life suplementos", "catalogo de produtos"),
        "arquivo": r"(?<![a-z])life(?![a-z])",
    },
}

DEFAULT_FOLDER = "data/catalogos"
# Abaixo disso a leitura falhou (outro layout, PDF cortado): melhor não trocar o catálogo que já existe.
MIN_PRODUCTS = 50

PRICE = re.compile(r"^US\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})$")
SECTION = re.compile(r"^(\d+)\s+(?:itens|item)\b", re.I)
GENERATED = re.compile(r"Gerado em (\d{2})/(\d{2})/(\d{4})")
TOTAL = re.compile(r"(\d+)\s+produtos")

# Marcas de duas palavras no começo do nome; nas outras, a marca é a primeira palavra.
TWO_WORD_BRANDS = {
    "alpha pharma", "body shape", "cooper pharma", "doctors best", "don capo", "dragon elite", "earths creation",
    "evolve biolabs", "golden lab", "good energy", "good protein", "life extension", "max titanium", "muscle premium",
    "natures bounty", "pharma balkan", "piping rock", "samurai nutrition", "shree venkatesh", "the best", "truvia labs",
}


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def to_price(text: str) -> float:
    return float(text.replace(".", "").replace(",", "."))


def brand_of(name: str) -> str:
    words = name.split()
    if len(words) > 1 and normalize_text(" ".join(words[:2])).replace("´", "").replace("'", "") in TWO_WORD_BRANDS:
        return " ".join(words[:2])
    return words[0] if words else ""


def identify(cover_text: str, filename: str = "") -> str | None:
    """A loja do catálogo, pela capa ou pelo nome do arquivo; None se não for de nenhuma loja conhecida."""
    cover = normalize_text(cover_text)
    for store, info in PDF_STORES.items():
        if all(mark in cover for mark in info["capa"]):
            return store
    name = normalize_text(Path(filename).name)
    for store, info in PDF_STORES.items():
        if re.search(info["arquivo"], name):
            return store
    return None


def parse_life(pages: list[list[str]], cover_text: str) -> dict[str, Any]:
    """Lê o catálogo da Life: cada produto é um bloco "NOME / [complemento] / US$ 0,00"; cada seção, "NOME / N itens".

    `pages` traz, por página (sem a capa), o texto de cada bloco na ordem em que aparece.
    """
    generated = GENERATED.search(cover_text)
    total = TOTAL.search(cover_text)
    # A capa lista as seções com a quantidade de itens: serve para conferir a leitura.
    cover_lines = [clean(line) for line in cover_text.splitlines() if clean(line)]
    expected = {
        label: int(count)
        for label, count in zip(cover_lines, cover_lines[1:])
        if count.isdigit() and not label.isdigit() and not label.lower().startswith("pagina")
    }
    labels = {normalize_text(label): label for label in expected}

    products: list[dict[str, Any]] = []
    category = ""
    for blocks in pages:
        for block in blocks:
            lines = [clean(line) for line in block.splitlines() if clean(line)]
            if len(lines) >= 2 and SECTION.match(lines[1]):
                category = labels.get(normalize_text(lines[0]), lines[0].title())
                continue
            found = PRICE.match(lines[-1]) if len(lines) >= 2 else None
            if not found:
                continue  # cabeçalho, rodapé, número da página
            name = clean(" ".join(lines[:-1]))
            products.append({"nome": name, "marca": brand_of(name), "categoria": category, "preco": to_price(found.group(1))})

    counts: dict[str, int] = {}
    for product in products:
        counts[product["categoria"]] = counts.get(product["categoria"], 0) + 1
    return {
        "loja": LIFE,
        "gerado_em": f"{generated.group(3)}-{generated.group(2)}-{generated.group(1)}" if generated else None,
        "total_informado": int(total.group(1)) if total else None,
        "secoes_informadas": expected,
        "secoes_lidas": counts,
        "produtos": products,
    }


PARSERS = {LIFE: parse_life}


def read_catalog(path: Path, filename: str = "") -> dict[str, Any] | None:
    """Lê o PDF e devolve o catálogo, ou None se não for o catálogo de uma loja conhecida."""
    import pymupdf  # só quando chega um PDF: a coleta do GitHub não precisa da biblioteca

    with pymupdf.open(str(path)) as document:
        if document.page_count == 0:
            return None
        cover = document[0].get_text()
        store = identify(cover, filename or path.name)
        if store is None:
            return None
        # Blocos de texto (tipo 0) na ordem do PDF; cada produto do catálogo é um bloco.
        pages = [[block[4] for block in page.get_text("blocks") if block[6] == 0] for page in list(document)[1:]]
    catalog = PARSERS[store](pages, cover)
    if len(catalog["produtos"]) < MIN_PRODUCTS:
        raise ValueError(
            f"Li só {len(catalog['produtos'])} produtos no catálogo da {PDF_STORES[store]['label']}; o formato do PDF pode ter mudado."
        )
    return catalog


def catalog_path(folder: Path, store: str) -> Path:
    return folder / f"{store}.json"


def load_catalog(folder: Path, store: str) -> dict[str, Any] | None:
    path = catalog_path(folder, store)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_catalog(folder: Path, catalog: dict[str, Any], pdf_path: Path | None = None, filename: str = "") -> dict[str, Any]:
    """Guarda o catálogo e devolve o que mudou em relação ao anterior.

    Cada produto ganha um número fixo pelo nome: o mesmo produto mantém o código (LF-12) em todos os catálogos,
    o que preserva o histórico de preço e os favoritos.
    """
    store = catalog["loja"]
    previous = load_catalog(folder, store)
    if previous and catalog["gerado_em"] and previous.get("gerado_em") and catalog["gerado_em"] < previous["gerado_em"]:
        return {"situacao": "antigo", "loja": store, "gerado_em": catalog["gerado_em"], "atual": previous["gerado_em"]}

    codes: dict[str, int] = dict((previous or {}).get("codigos") or {})
    next_number = max(codes.values(), default=0) + 1
    seen: dict[str, int] = {}
    products = []
    for product in catalog["produtos"]:
        key = normalize_text(product["nome"])
        seen[key] = seen.get(key, 0) + 1
        if seen[key] > 1:
            key = f"{key}#{seen[key]}"  # o mesmo nome duas vezes no catálogo: cada um com seu código
        if key not in codes:
            codes[key] = next_number
            next_number += 1
        products.append({"id": str(codes[key]), **product})

    before = {item["id"]: item for item in (previous or {}).get("produtos") or []}
    now = {item["id"]: item for item in products}
    prefix = PDF_STORES[store]["prefixo"]
    changed = [
        {"codigo": f"{prefix}-{key}", "nome": item["nome"], "antes": before[key]["preco"], "depois": item["preco"]}
        for key, item in now.items()
        if key in before and before[key]["preco"] != item["preco"]
    ]
    changed.sort(key=lambda change: -abs(change["depois"] - change["antes"]) / change["antes"] if change["antes"] else 0)

    folder.mkdir(parents=True, exist_ok=True)
    received = datetime.now().astimezone().isoformat(timespec="seconds")
    payload = {
        "loja": store,
        "arquivo": filename or (pdf_path.name if pdf_path else ""),
        "gerado_em": catalog["gerado_em"],
        "recebido_em": received,
        "total_informado": catalog["total_informado"],
        "secoes_informadas": catalog["secoes_informadas"],
        "secoes_lidas": catalog["secoes_lidas"],
        "codigos": codes,
        "produtos": products,
    }
    temporary = catalog_path(folder, store).with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    temporary.replace(catalog_path(folder, store))
    if pdf_path is not None:
        archive = folder / "arquivo"
        archive.mkdir(exist_ok=True)
        shutil.copyfile(pdf_path, archive / f"{store}-{catalog['gerado_em'] or received[:10]}.pdf")

    return {
        "situacao": "novo" if previous is None else "atualizado",
        "loja": store,
        "gerado_em": catalog["gerado_em"],
        "anterior": (previous or {}).get("gerado_em"),
        "produtos": len(products),
        "total_informado": catalog["total_informado"],
        "secoes_diferentes": {
            label: (count, catalog["secoes_lidas"].get(label, 0))
            for label, count in catalog["secoes_informadas"].items()
            if catalog["secoes_lidas"].get(label, 0) != count
        },
        "novos": len(now.keys() - before.keys()) if previous else 0,
        "sairam": len(before.keys() - now.keys()),
        "precos": changed,
    }


def short_date(iso: str | None) -> str:
    return datetime.strptime(iso, "%Y-%m-%d").strftime("%d/%m/%Y") if iso else "data não informada"


def usd(value: float) -> str:
    return "US$ " + f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def describe(summary: dict[str, Any], max_prices: int = 15) -> str:
    """Mensagem para o grupo depois de importar um catálogo."""
    label = PDF_STORES[summary["loja"]]["label"]
    if summary["situacao"] == "antigo":
        return (
            f"📥 Recebi o catálogo da *{label}* de {short_date(summary['gerado_em'])}, mas já tenho um mais novo "
            f"({short_date(summary['atual'])}). Mantive o atual."
        )
    lines = [f"📥 *Catálogo {label} importado* · gerado em {short_date(summary['gerado_em'])}"]
    informed = summary["total_informado"]
    if informed and informed != summary["produtos"] or summary["secoes_diferentes"]:
        detail = ", ".join(f"{name} {read}/{count}" for name, (count, read) in summary["secoes_diferentes"].items())
        lines.append(f"⚠️ Li {summary['produtos']} dos {informed} produtos que o catálogo informa ({detail}). Confira se falta algum.")
    else:
        lines.append(f"{summary['produtos']} produtos lidos, conferidos com a contagem do próprio catálogo.")
    if summary["situacao"] == "atualizado":
        lines.append(
            f"Em relação ao catálogo de {short_date(summary['anterior'])}: {summary['novos']} novos · "
            f"{summary['sairam']} saíram · {len(summary['precos'])} mudaram de preço."
        )
        if summary["precos"]:
            lines.append("")
            lines.append("*Maiores mudanças de preço*")
            for change in summary["precos"][:max_prices]:
                arrow = "🔻" if change["depois"] < change["antes"] else "🔺"
                lines.append(f"{arrow} [{change['codigo']}] {change['nome']} — {usd(change['antes'])} → *{usd(change['depois'])}*")
            if len(summary["precos"]) > max_prices:
                lines.append(f"_e mais {len(summary['precos']) - max_prices}._")
    lines.append("")
    lines.append(
        f"_Os preços entram no /busca em instantes, com o código {PDF_STORES[summary['loja']]['prefixo']}-. "
        "Valem os do catálogo: a loja não informa estoque._"
    )
    return "\n".join(lines)


def load_items(folder: Path, store: str) -> tuple[list[dict[str, Any]], str | None]:
    """Os produtos do último catálogo no formato das outras lojas do comparador, e a data do catálogo."""
    catalog = load_catalog(folder, store)
    if not catalog:
        return [], None
    prefix = PDF_STORES[store]["prefixo"]
    items = [
        {
            "loja": store,
            "id": product["id"],
            "codigo": f"{prefix}-{product['id']}",
            "nome": product["nome"],
            "marca": product.get("marca", ""),
            "categoria": product.get("categoria", ""),
            "detalhe": "",
            "apresentacao": "",
            "quantidade": "",
            "dose": "",
            "preco": float(product["preco"]),
            "preco_original": None,
            "atacado": [],
            # O catálogo só traz o que a loja tem para vender; não informa quantidade.
            "estoque": None,
            "estoque_detalhe": "",
            "disponivel": True,
            "url": "",
        }
        for product in catalog["produtos"]
    ]
    return items, catalog.get("gerado_em")


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa o catálogo em PDF de uma loja")
    parser.add_argument("pdf", help="Arquivo PDF do catálogo")
    parser.add_argument("--pasta", default=str(Path(__file__).parent / DEFAULT_FOLDER), help="Onde guardar os catálogos")
    parser.add_argument("--so-ler", action="store_true", help="Só mostra o que leu, sem guardar")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    path = Path(args.pdf)
    catalog = read_catalog(path)
    if catalog is None:
        print("Não reconheci a loja deste PDF.")
        return 1
    if args.so_ler:
        print(f"{PDF_STORES[catalog['loja']]['label']}: {len(catalog['produtos'])} produtos, gerado em {catalog['gerado_em']}")
        for product in catalog["produtos"][:10]:
            print(f"  {product['categoria']:15} | {product['marca']:15} | {product['nome']} | {usd(product['preco'])}")
        return 0
    print(describe(save_catalog(Path(args.pasta), catalog, path)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
