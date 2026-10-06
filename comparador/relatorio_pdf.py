"""PDF com todos os produtos das lojas, pensado para ser lido por pessoas e importado numa IA."""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from fpdf import FPDF
from fpdf.fonts import FontFace

from comparador import STORE_LABELS, STORES, brand_key, features
from monitor import normalize_text
from nomes import clean_name


FONT = "Arial"
# Normal e negrito. No Windows, Arial; no Linux (coleta no GitHub), DejaVu ou Liberation, que têm os mesmos acentos.
FONT_FILES = [
    (Path(r"C:\Windows\Fonts\arial.ttf"), Path(r"C:\Windows\Fonts\arialbd.ttf")),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    (
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ),
]


def font_files() -> tuple[Path, Path]:
    for regular, bold in FONT_FILES:
        if regular.exists() and bold.exists():
            return regular, bold
    raise FileNotFoundError("Nenhuma fonte para o PDF: instale Arial, DejaVu Sans ou Liberation Sans.")


def brl(value: float) -> str:
    return "R$ " + f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def usd(value: float) -> str:
    return "US$ " + f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


class Report(FPDF):
    def __init__(self, subtitle: str) -> None:
        super().__init__(orientation="L", unit="mm", format="A4")
        self.subtitle = subtitle
        regular, bold = font_files()
        self.add_font(FONT, "", str(regular))
        self.add_font(FONT, "B", str(bold))
        self.set_auto_page_break(auto=True, margin=12)
        self.set_margins(10, 10, 10)

    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font(FONT, "", 7)
        self.set_text_color(110, 110, 110)
        self.cell(0, 5, self.subtitle, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)

    def footer(self) -> None:
        self.set_y(-9)
        self.set_font(FONT, "", 7)
        self.set_text_color(110, 110, 110)
        self.cell(0, 5, f"Página {self.page_no()}/{{nb}}", align="R")
        self.set_text_color(0, 0, 0)

    def section(self, title: str, text: str = "") -> None:
        self.set_font(FONT, "B", 13)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        if text:
            self.set_font(FONT, "", 8.5)
            self.multi_cell(0, 4.2, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)


def tiers_text(item: dict[str, Any]) -> str:
    return " · ".join(f"{tier['min']}+ un.: {usd(tier['preco'])}" for tier in item.get("atacado") or [])


def stock_text(item: dict[str, Any]) -> str:
    if not item["disponivel"]:
        return "sem estoque"
    if item.get("estoque") in (None, ""):
        return "em estoque"
    return f"{item['estoque']} un."


def build_pdf(data: dict[str, Any], path: Path) -> dict[str, int]:
    rates = data.get("cotacoes") or {}
    collected = datetime.fromisoformat(data["gerado_em"]).astimezone()
    products = data["produtos"]
    counts = Counter(item["loja"] for item in products)
    groups = [group for group in data.get("grupos", []) if group["confianca"] != "baixa"]

    def reais(item: dict[str, Any]) -> float:
        return item["preco"] * rates.get(item["loja"], 0)

    pdf = Report(f"Catálogo comparado das lojas · coleta de {collected:%d/%m/%Y %H:%M}")
    pdf.alias_nb_pages()
    pdf.add_page()

    # Capa: o que é, de quando é e como ler.
    pdf.set_font(FONT, "B", 20)
    pdf.cell(0, 11, "Catálogo comparado das lojas", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(FONT, "", 10)
    pdf.cell(0, 6, f"Coleta de {collected:%d/%m/%Y às %H:%M} · {len(products)} produtos · {len(groups)} produtos vendidos em mais de uma loja",
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font(FONT, "", 9)
    with pdf.table(col_widths=(45, 25, 30, 40, 137), text_align=("LEFT", "RIGHT", "RIGHT", "RIGHT", "LEFT"),
                   headings_style=FontFace(emphasis="BOLD", fill_color=(225, 232, 229)), line_height=5) as table:
        table.row(("Loja", "Produtos", "Com estoque", "Cotação (US$ 1)", "Observação"))
        notes = {
            "shapetotal": "Estoque por filial (CDE, PJ, SG). Informa o princípio ativo (coluna Composição).",
            "bypharmacon": "Preço de 1 unidade; faixas de 5+ e 20+ unidades com desconto.",
            "atacadoparaguai": "Só a categoria Farma. Informa apenas se tem ou não estoque.",
            "atacadobrasil": "Grupo Medicamentos. Preço de 1 a 2 unidades; faixas de 3+, 5+ e 10+ unidades. Só lista o que tem estoque.",
        }
        for store in STORES:
            available = sum(1 for item in products if item["loja"] == store and item["disponivel"])
            rate = rates.get(store, 0)
            table.row((STORE_LABELS[store], str(counts[store]), str(available), brl(rate) if rate else "—", notes.get(store, "")))
    pdf.ln(4)
    pdf.set_font(FONT, "", 8.5)
    pdf.multi_cell(0, 4.2, (
        "Como ler: todos os preços são de 1 unidade, em dólar (como a loja informa) e em reais pela cotação do dia da própria loja. "
        "Faixas de atacado aparecem na coluna Faixas. A seção 1 junta o mesmo produto vendido em lojas diferentes "
        "(cruzamento automático por marca, princípio ativo, dose e embalagem; confira antes de decidir). "
        "A seção 2 lista todos os produtos, de todas as lojas, um por linha, ordenados por marca e nome. "
        "Cada produto tem um código único: ST- (Shape Total), BY- (ByPharmacon), AP- (Atacado Paraguai), AB- (Atacado Brasil)."
    ), new_x="LMARGIN", new_y="NEXT")

    # Seção 1: comparação entre lojas.
    pdf.add_page()
    pdf.section("1. Produtos vendidos em mais de uma loja",
                "Uma linha por produto. Preço de 1 unidade em reais; a loja mais barata entre as que têm estoque aparece na coluna Mais barata.")
    rows = []
    for group in groups:
        items = list(group["itens"].values())
        available = [item for item in items if item["disponivel"]]
        cheapest = min(available, key=reais) if available else None
        reference = cheapest or items[0]
        prices = {}
        for store in STORES:
            item = group["itens"].get(store)
            prices[store] = "—" if not item else (brl(reais(item)) + ("" if item["disponivel"] else " (sem)"))
        values = sorted(reais(item) for item in available)
        gap = f"{(values[-1] - values[0]) / values[-1] * 100:.0f}%" if len(values) > 1 and values[-1] else "—"
        codes = " ".join(item.get("codigo") or "" for item in items)
        rows.append(((reference.get("marca") or "").upper(), f"{reference['nome']}\n{codes}", prices,
                     STORE_LABELS[cheapest["loja"]] if cheapest else "sem estoque", gap, group["confianca"]))
    rows.sort(key=lambda row: (row[0].lower(), row[1].lower()))
    pdf.set_font(FONT, "", 6.8)
    with pdf.table(col_widths=(24, 64, 25, 25, 25, 25, 26, 15, 18),
                   headings_style=FontFace(emphasis="BOLD", fill_color=(225, 232, 229)), line_height=3.6,
                   text_align=("LEFT", "LEFT", "RIGHT", "RIGHT", "RIGHT", "RIGHT", "LEFT", "RIGHT", "LEFT")) as table:
        table.row(("Marca", "Produto", *[STORE_LABELS[store] for store in STORES], "Mais barata", "Diferença", "Cruzamento"))
        for brand, name, prices, cheapest, gap, confidence in rows:
            table.row((brand, name, *[prices[store] for store in STORES], cheapest, gap, confidence))

    # Seção 2: todos os produtos.
    pdf.add_page()
    pdf.section("2. Todos os produtos",
                "Um produto por linha, de todas as lojas, separados em Retatrutida, Tirzepatida, Peptídeos, Esteroides e Outros. "
                "Composição só é informada pelo Shape Total. Estoque: quantidade quando a loja informa.")
    # O mesmo produto em lojas diferentes cai sempre no mesmo tipo (o do grupo dele).
    type_of: dict[tuple[str, str], str] = {}
    for group in groups:
        kind = product_type(list(group["itens"].values()))
        for item in group["itens"].values():
            type_of[(item["loja"], item["id"])] = kind
    by_type: dict[str, list[dict[str, Any]]] = {kind: [] for kind in TYPE_ORDER}
    for item in products:
        by_type[type_of.get((item["loja"], item["id"])) or product_type([item])].append(item)
    for number, kind in enumerate([kind for kind in TYPE_ORDER if by_type[kind]], start=1):
      ordered = sorted(by_type[kind], key=lambda item: ((item.get("marca") or "").lower(), item["nome"].lower(), item["loja"]))
      if number > 1:
          pdf.add_page()
      pdf.set_font(FONT, "B", 11)
      pdf.cell(0, 7, f"2.{number} {kind.capitalize()} — {len(ordered)} produtos", new_x="LMARGIN", new_y="NEXT")
      pdf.set_font(FONT, "", 6.5)
      with pdf.table(col_widths=(16, 22, 20, 66, 22, 36, 19, 21, 35, 20),
                   headings_style=FontFace(emphasis="BOLD", fill_color=(225, 232, 229)), line_height=3.4,
                   text_align=("LEFT", "LEFT", "LEFT", "LEFT", "LEFT", "LEFT", "RIGHT", "RIGHT", "LEFT", "LEFT")) as table:
        table.row(("Código", "Loja", "Marca", "Produto", "Categoria", "Composição", "Preço US$", "Preço R$", "Faixas (US$)", "Estoque"))
        for item in ordered:
            original = f" (era {usd(item['preco_original'])})" if item.get("preco_original") else ""
            table.row((
                item.get("codigo") or "",
                STORE_LABELS[item["loja"]],
                (item.get("marca") or "").upper(),
                item["nome"],
                item.get("categoria") or "",
                item.get("detalhe") or "",
                usd(item["preco"]) + original,
                brl(reais(item)) if rates.get(item["loja"]) else "—",
                tiers_text(item),
                stock_text(item),
            ))

    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))
    return {"produtos": len(products), "grupos": len(groups), "paginas": pdf.page_no()}


MIN_COST_USD = 1  # preço de centavos é marcador da loja, não oferta

# Seções da tabela de venda, na ordem em que aparecem. A marca é reconhecida pela primeira palavra
# ("alpha" vale para Alpha e Alpha Pharma). A divisão segue a que a concorrência usa na vitrine.
SALE_SECTIONS = [
    ("MARCAS PREMIUM", {
        "zphc", "cooper", "pharmacom", "alpha", "eminence", "royal", "canada", "idn", "geniqs", "genic",
        "balkan", "actiza", "spectrum",
    }),
    ("MARCAS IMPORTADAS", {"oxygen", "king", "muscle", "landerlan", "rx", "bratva", "red"}),
]
OTHER_SECTION = "OUTRAS MARCAS"


# Tipos de produto, na ordem em que viram seção nos PDFs.
TYPE_RETA, TYPE_TIRZE, TYPE_PEPS, TYPE_STEROID, TYPE_OTHER = "RETATRUTIDA", "TIRZEPATIDA", "PEPTÍDEOS", "ESTEROIDES", "OUTROS PRODUTOS"
TYPE_ORDER = [TYPE_RETA, TYPE_TIRZE, TYPE_PEPS, TYPE_STEROID, TYPE_OTHER]
# Nomes comerciais de tirzepatida que não trazem a palavra no nome.
TIRZE_WORDS = {"tirzepatida", "tirzec", "tirzedral", "lipoless", "lipoland", "t36", "slimex", "gluconex", "tirzegen", "mounjaro"}
PEPTIDE_WORDS = {
    "peptideo", "bpc157", "tb500", "ghkcu", "ahkcu", "glow", "klow", "nad", "cjc1295", "cjc", "ipamorelin", "tesamorelin",
    "sermorelin", "selank", "semax", "epitalon", "motsc", "ss31", "kpv", "dsip", "aod", "frag", "ghrp2", "ghrp6", "igf1",
    "igf", "pt141", "melanotan", "melanotan2", "kisspeptina", "thymosin", "thymalin", "oxytocin", "cbl", "wolverine",
    "ztrop", "hgh", "somatropin", "gh", "cagrisema", "cagrilintide", "hexarelin", "mgf", "amino", "snap8",
}
STEROID_WORDS = {
    "testosterona", "nandrolona", "trembolona", "boldenona", "drostanolona", "metenolona", "oxandrolona", "estanozolol",
    "oximetalona", "metandienona", "mesterolona", "turinabol", "fluoximesterolona", "trestolona", "trestolone",
    "dihydroboldenona", "equipoise", "anadrol", "winstrol", "halotestin", "mastebolin", "testobolin", "nandrobolin",
    "sustanon", "primobolan", "decanoato", "enantato", "cipionato", "propionato", "undecilenato", "fenilpropionato",
}
STEROID_CATEGORIES = {"anabolizante", "hormonais e anabolizantes", "hormonios"}
PEPTIDE_CATEGORIES = {"peptideo", "peptideos e compostos", "hgh"}


def product_type(items: list[dict[str, Any]]) -> str:
    """Reta, Tirze, Peps, Esteroides ou Outros, pelo que o nome, a composição e a categoria das lojas dizem."""
    tokens: set[str] = set()
    categories: set[str] = set()
    for item in items:
        tokens |= features(item)["tokens"]
        tokens |= set(normalize_text(item["nome"]).replace("-", "").split())
        categories.add(normalize_text(item.get("categoria") or ""))
    if tokens & {"retatrutida", "reta"} or "reta." in categories:
        return TYPE_RETA
    if tokens & TIRZE_WORDS or "tirzep." in categories:
        return TYPE_TIRZE
    if tokens & PEPTIDE_WORDS or categories & PEPTIDE_CATEGORIES:
        return TYPE_PEPS
    if tokens & STEROID_WORDS or categories & STEROID_CATEGORIES:
        return TYPE_STEROID
    return TYPE_OTHER


def sale_section(brand: str) -> str:
    key = brand_key(brand)
    return next((title for title, brands in SALE_SECTIONS if key in brands), OTHER_SECTION)


def sale_rows(data: dict[str, Any], markup_percent: float) -> list[dict[str, Any]]:
    """Uma linha por produto com estoque: o custo mais barato entre as lojas e o preço de venda.

    Venda = custo em reais x (1 + margem/100), arredondado para cima no real inteiro.
    """
    rates = data.get("cotacoes") or {}

    def cost(item: dict[str, Any]) -> float:
        return item["preco"] * rates.get(item["loja"], 0)

    entries: list[list[dict[str, Any]]] = []
    grouped: set[tuple[str, str]] = set()
    for group in data.get("grupos", []):
        if group["confianca"] == "baixa":
            continue
        items = list(group["itens"].values())
        grouped.update((item["loja"], item["id"]) for item in items)
        entries.append(items)
    entries.extend([item] for item in data["produtos"] if (item["loja"], item["id"]) not in grouped)

    # A mesma marca vem escrita de vários jeitos ("Alpha", "alpha pharma"): fica o nome mais usado.
    spellings: dict[str, Counter[str]] = {}
    for item in data["produtos"]:
        if item.get("marca"):
            spellings.setdefault(brand_key(item["marca"]), Counter())[item["marca"].upper()] += 1
    labels = {key: min(c.most_common(), key=lambda e: (-e[1], -len(e[0])))[0] for key, c in spellings.items()}

    rows = []
    for items in entries:
        available = [item for item in items if item["disponivel"] and item["preco"] >= MIN_COST_USD and cost(item) > 0]
        if not available:
            continue
        cheapest = min(available, key=cost)
        brand = next((item["marca"] for item in [cheapest, *items] if item.get("marca")), "")
        # Nome limpo: sem a marca (que vira título), unidades padronizadas e o princípio ativo quando a loja informa.
        detail = next((item["detalhe"] for item in items if item.get("detalhe")), "")
        name = clean_name(cheapest["nome"], brand or cheapest.get("marca", ""), detail)
        kind = product_type(items)
        rows.append({
            "secao": kind,
            # Dentro de Esteroides, as marcas continuam separadas em Premium, Importadas e Outras.
            "grupo": sale_section(brand) if kind == TYPE_STEROID else "",
            "marca": labels.get(brand_key(brand), brand.upper()) if brand else "SEM MARCA",
            "nome": name,
            "custo": cost(cheapest),
            "venda": float(math.ceil(cost(cheapest) * (1 + markup_percent / 100))),
            "loja": cheapest["loja"],
            "codigo": cheapest.get("codigo") or "",
            # Os cadastros de origem: o chat de venda tira deles as palavras da busca e a dose.
            "itens": items,
        })
    # Depois da limpeza, dois cadastros do mesmo produto ficam com o mesmo nome: fica só o mais barato.
    cheapest_by_name: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in rows:
        key = (row["secao"], row["marca"], normalize_text(row["nome"]))
        if key not in cheapest_by_name or row["venda"] < cheapest_by_name[key]["venda"]:
            cheapest_by_name[key] = row
    rows = list(cheapest_by_name.values())

    order = [""] + [title for title, _ in SALE_SECTIONS] + [OTHER_SECTION]
    rows.sort(key=lambda row: (TYPE_ORDER.index(row["secao"]), order.index(row["grupo"]), row["marca"], row["nome"]))
    return rows


def build_sales_pdf(data: dict[str, Any], path: Path, markup_percent: float = 110) -> dict[str, Any]:
    """Tabela para o cliente: só marca, produto e preço de venda. Sem loja de origem, custo ou código."""
    rows = sale_rows(data, markup_percent)
    generated = datetime.fromisoformat(data["gerado_em"]).astimezone()

    pdf = Report(f"Tabela de preços · {generated:%d/%m/%Y}")
    pdf.alias_nb_pages()
    pdf.add_page(orientation="P")
    pdf.set_font(FONT, "B", 20)
    pdf.cell(0, 11, "Tabela de preços", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(FONT, "", 10)
    pdf.cell(0, 6, f"Atualizada em {generated:%d/%m/%Y} · {len(rows)} produtos disponíveis", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(FONT, "", 8.5)
    pdf.set_text_color(90, 90, 90)
    pdf.multi_cell(0, 4.5, "Preços em reais, por unidade. Valores e disponibilidade podem mudar sem aviso; confirme antes de fechar o pedido.",
                   new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(3)

    brand_style = FontFace(emphasis="BOLD", fill_color=(225, 232, 229))
    sections: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        sections.setdefault(row["secao"], []).append(row)
    for index, (title, section_rows) in enumerate(sections.items()):
        if index:
            pdf.add_page(orientation="P")
        # Faixa escura com o nome da seção e quantas marcas e produtos ela tem.
        brands = len({row["marca"] for row in section_rows})
        pdf.set_fill_color(19, 32, 28)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font(FONT, "B", 14)
        pdf.cell(0, 10, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_fill_color(255, 255, 255)  # senão a faixa escura vaza para as linhas da tabela
        pdf.set_text_color(90, 90, 90)
        pdf.set_font(FONT, "", 8.5)
        pdf.cell(0, 6, f"{brands} marcas · {len(section_rows)} produtos", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(FONT, "", 8.5)
        with pdf.table(col_widths=(150, 40), text_align=("LEFT", "RIGHT"), line_height=5, first_row_as_headings=False,
                       borders_layout="HORIZONTAL_LINES") as table:
            current = None
            current_group = ""
            for row in section_rows:
                if row["grupo"] != current_group:
                    current_group = row["grupo"]
                    current = None
                    subheading = table.row(style=FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=(70, 86, 79)))
                    subheading.cell(current_group, colspan=2)
                if row["marca"] != current:
                    current = row["marca"]
                    heading = table.row(style=brand_style)
                    heading.cell(current, colspan=2)
                table.row((row["nome"], brl(row["venda"])))

    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))
    return {
        "produtos": len(rows),
        "marcas": len({row["marca"] for row in rows}),
        "paginas": pdf.page_no(),
        "secoes": {title: len(section_rows) for title, section_rows in sections.items()},
        "custo_total": sum(row["custo"] for row in rows),
        "venda_total": sum(row["venda"] for row in rows),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera o PDF com todos os produtos das lojas")
    parser.add_argument("--dados", default="data/painel.json", help="JSON gerado pelo comparador")
    parser.add_argument("--saida", required=True, help="Caminho do PDF")
    parser.add_argument("--venda", type=float, metavar="MARGEM", help="Gera a tabela de venda com essa margem em %% (ex.: 110)")
    args = parser.parse_args()
    with open(args.dados, "r", encoding="utf-8") as handle:
        data = json.load(handle)
        stats = build_sales_pdf(data, Path(args.saida), args.venda) if args.venda is not None else build_pdf(data, Path(args.saida))
    print(stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())
