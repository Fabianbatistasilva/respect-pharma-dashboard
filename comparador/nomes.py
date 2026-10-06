"""Nomes limpos para a tabela de venda.

As lojas escrevem "GOLD TESTENAT X 10 ML." ou "ALPHA NANDROBOLIN 250 X 250M /10AMP.1ML". Aqui o nome vira algo
que o cliente lê de primeira: nome do produto, princípio ativo quando o nome é comercial, dose e apresentação.
"""
from __future__ import annotations

import re

from comparador import SYNONYMS, brand_key
from monitor import normalize_text


# Palavras que ficam em maiúsculas (siglas) ou com a grafia própria.
KEEP = {
    "hcg": "HCG", "hgh": "HGH", "gh": "GH", "npp": "NPP", "nad": "NAD", "nad+": "NAD+", "igf": "IGF", "igf-1": "IGF-1",
    "lr3": "LR3", "dsip": "DSIP", "kpv": "KPV", "aod": "AOD", "cjc": "CJC", "ghrp": "GHRP", "mgf": "MGF", "tb": "TB",
    "bpc": "BPC", "ghk-cu": "GHK-Cu", "ahk-cu": "AHK-Cu", "ghk": "GHK", "cu": "Cu", "pt-141": "PT-141", "mots-c": "MOTS-C",
    "ss-31": "SS-31", "t3": "T3", "t4": "T4", "dhb": "DHB", "sarm": "SARM", "mk": "MK", "rad": "RAD", "lgd": "LGD",
    "ui": "UI", "md": "MD", "xt": "XT", "la": "LA", "b12": "B12", "glp1": "GLP-1", "dac": "DAC", "uk": "UK", "ph": "PH",
    "slu-pp": "SLU-PP", "cbl": "CBL", "cbd": "CBD", "zptrop": "Ztrop", "tb500": "TB-500", "bpc157": "BPC-157",
}
SMALL = {"de", "do", "da", "e", "em", "com", "para", "x", "por"}
KEEP.update({"tg": "TG", "t36": "T36", "usa": "USA", "mt-2": "MT-2", "sarms": "SARMs", "aq": "AQ", "ii": "II", "iii": "III"})
# Grafias em inglês ou abreviadas que as lojas usam, passadas para o nome em português.
TRANSLATE = {
    "trembolone": "Trembolona", "trenbolone": "Trembolona", "trenbolona": "Trembolona", "trembo": "Trembolona", "tren": "Trembolona",
    "nandrolone": "Nandrolona", "testosterone": "Testosterona", "testo": "Testosterona", "boldenone": "Boldenona",
    "oxandrolone": "Oxandrolona", "drostanolone": "Drostanolona", "methenolone": "Metenolona", "metanolona": "Metenolona",
    "acetate": "Acetato", "ace": "Acetato", "acet": "Acetato", "enanthate": "Enantato", "enanthato": "Enantato", "enant": "Enantato",
    "cypionate": "Cipionato", "cypionato": "Cipionato", "propionate": "Propionato", "propio": "Propionato", "propianate": "Propionato",
    "decanoate": "Decanoato", "decanoat": "Decanoato", "retatrutide": "Retatrutida", "retatrudide": "Retatrutida",
    "tirzepatide": "Tirzepatida", "fluoxymesterolona": "Fluoximesterolona", "fluoxymesterone": "Fluoximesterolona",
    "clenbuterol": "Clembuterol", "gonadotropin": "Gonadotropina", "cannabidiol": "Canabidiol", "oxymetholone": "Oximetalona",
    "diluyente": "Diluente", "polvo": "Pó", "hemogenim": "Hemogenin", "stano": "Stanozolol", "mots": "MOTS-C",
}
# Compostos que as lojas escrevem de vários jeitos.
COMPOUNDS = [
    (r"bpc\W*157", "BPC-157"), (r"tb\W*500", "TB-500"), (r"ghk\W*cu", "GHK-Cu"), (r"ahk\W*cu", "AHK-Cu"),
    (r"pt\W*141", "PT-141"), (r"cjc\W*1295", "CJC-1295"), (r"aod\W*9604", "AOD-9604"), (r"nad\s*\+", "NAD+"),
    (r"mots\W*c\b", "MOTS-C"), (r"ss\W*31", "SS-31"), (r"igf\W*1\b", "IGF-1"), (r"slu\W*pp\W*332", "SLU-PP 332"),
    (r"slupp\W*332", "SLU-PP 332"), (r"mt\W*2\b", "MT-2"), (r"ghrp\W*(\d)", r"GHRP-\1"), (r"cbl\W*514", "CBL-514"),
    (r"mk\W*677", "MK-677"), (r"rad\W*140", "RAD-140"),
]
PROTECTED = {compound for _, compound in COMPOUNDS if chr(92) not in compound} | {"GHRP-2", "GHRP-6"}
# Sobra da loja no começo do nome: prefixo de cadastro, não parte do nome do produto.
LEADING_NOISE = ("FARMACON", "PEPTÍDEO", "PEPTIDEO", "SUPLEMENTO", "BOTOX", "SIN MARCA")
UNIT = r"(MG|MCG|ML|UI|IU|GR?|KG)"


def strip_brand(name: str, brand: str) -> str:
    """Tira a marca do começo do nome: ela já aparece como título do bloco."""
    text = name.strip()
    for noise in LEADING_NOISE:
        if text.upper().startswith(noise + " "):
            text = text[len(noise) + 1:].strip()
    brand_words = re.findall(r"[A-Za-zÀ-ÿ0-9+.]+", brand)
    aliases = {normalize_text(word) for word in brand_words} | {brand_key(brand)}
    aliases |= {"m.p", "mp", "lander", "pharma", "labs", "lab", "e."} if brand else set()
    words = text.split()
    while len(words) > 1 and normalize_text(words[0]).strip(".,-") in aliases | {a.strip(".") for a in aliases}:
        words.pop(0)
    stripped = " ".join(words)
    # Se o que sobrou começa com número, a "marca" era o próprio nome do produto (Acnecur, Mounjaro).
    return stripped if re.match(r"[A-Za-zÀ-ÿ(]", stripped) else text


def tidy_units(text: str) -> str:
    text = re.sub(r"(?<=\d),(?=\d)", ".", text)
    text = re.sub(r"\.(?=[A-Za-zÀ-ÿ])", " ", text)
    for pattern, compound in COMPOUNDS:
        text = re.sub(pattern, compound, text, flags=re.I)
    # "10AMP.1ML", "10 AMP. X 1 ML" -> "10 ampolas de 1ml"
    text = re.sub(rf"(\d+)\s*AMP\w*\.?\s*(?:X\s*)?(\d+(?:\.\d+)?)\s*ML\b\.?", r"\1 ampolas de \2ml", text, flags=re.I)
    text = re.sub(rf"(\d+(?:\.\d+)?)\s*{UNIT}\b\.?", lambda m: m.group(1) + m.group(2).lower().replace("iu", "ui").replace("gr", "g"), text, flags=re.I)
    text = re.sub(r"(\d+)\s*(?:COMPRIMIDOS?|COMPR?|COMP|COPM|TABLETS?|TABS?)\b\.?", r"\1 comprimidos", text, flags=re.I)
    text = re.sub(r"(\d+)\s*(?:C[AÁ]PSULAS?|CAPSULES?|CAPS?)\b\.?", r"\1 cápsulas", text, flags=re.I)
    text = re.sub(r"(\d+)\s*(?:AMPOLLAS?|AMPOLAS?|AMP)\b\.?", r"\1 ampolas", text, flags=re.I)
    text = re.sub(r"0*(\d+)\s*(?:VIALS?|VIAIS|FRASCOS?|BUJ\w*)\b\.?", lambda m: f"{int(m.group(1))} frasco" + ("s" if int(m.group(1)) > 1 else ""), text, flags=re.I)
    text = re.sub(r"0*(\d+)\s*(?:PENS?|CANETAS?)\b", lambda m: f"{int(m.group(1))} caneta" + ("s" if int(m.group(1)) > 1 else ""), text, flags=re.I)
    text = re.sub(r"\b(?:PEN|CANETA)\b", "caneta", text, flags=re.I)
    text = re.sub(r"\bUI\b", "UI", text, flags=re.I)
    text = re.sub(r"(\d)ui\b", r"\1 UI", text)
    # separadores das lojas: " X ", "/", pontos soltos, asteriscos
    text = re.sub(r"\*", " ", text)
    text = re.sub(r"\s+X\s+", " ", text, flags=re.I)
    text = re.sub(r"(?<=[A-Za-zÀ-ÿ])\.(?=\s|$)", "", text)
    text = re.sub(r"\s*/\s*(?=\d+\s*(?:comprimidos|cápsulas|ampolas|frasco))", " ", text)
    text = re.sub(r"\s*/\s*(?=\d)", " ", text)
    text = re.sub(r"\s+-\s*$|^\s*-\s+", "", text)
    text = re.sub(r"\s+[-–]\s+", " · ", text)
    return re.sub(r"\s{2,}", " ", text).strip(" .-/·")


def title_case(text: str) -> str:
    def fix(word: str) -> str:
        core = word.strip("()[],")
        lowered = normalize_text(core)
        if core in PROTECTED or core.upper() in PROTECTED:
            return word
        if lowered in KEEP:
            return word.replace(core, KEEP[lowered])
        if lowered in TRANSLATE:
            return word.replace(core, TRANSLATE[lowered])
        if "-" in core and all(part in TRANSLATE for part in lowered.split("-")):
            return word.replace(core, " ".join(TRANSLATE[part] for part in lowered.split("-")))
        if re.fullmatch(r"\d+x", lowered):
            return word.lower()
        if re.search(r"\d", core) and re.fullmatch(r"[\d.,]+(mg|mcg|ml|g|kg|ui)?(/ml)?", core, flags=re.I):
            return word.lower()
        if re.fullmatch(r"(comprimidos|cápsulas|ampolas|frascos?|canetas?|de)", core, flags=re.I):
            return word.lower()
        if lowered in SMALL:
            return word.lower()
        if re.search(r"\d", core) and len(core) <= 8:
            return word.upper()
        return word[:1].upper() + word[1:].lower() if word[:1] != "(" else "(" + word[1:2].upper() + word[2:].lower()

    return " ".join(fix(word) for word in text.split())


def ingredient_note(name: str, detail: str) -> str:
    """Princípio ativo entre parênteses, quando a loja informa e o nome ainda não diz."""
    if not detail:
        return ""
    def canonical(text: str) -> set[str]:
        return set(re.findall(r"[a-z]{4,}", normalize_text(text))) - {"com", "para"}

    main = re.sub(r"\(.*?\)", "", detail).strip() or detail
    have = canonical(name)
    # "gonadotropin" no nome já cobre "gonadotropina" da composição: compara pelo começo da palavra.
    missing = {word for word in canonical(main) - have if not any(word[:6] == other[:6] for other in have)}
    if not missing:
        return ""
    return f" ({title_case(main)})"


def clean_name(name: str, brand: str = "", detail: str = "") -> str:
    text = strip_brand(name, brand)
    text = tidy_units(text)
    text = title_case(text)
    return (text + ingredient_note(text, detail)).strip()
