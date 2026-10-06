import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from comparador import BYP, SHAPE
from relatorio_pdf import product_type, sale_rows, sale_section


def item(store, product_id, name, brand, price, available=True):
    return {"loja": store, "id": str(product_id), "nome": name, "marca": brand, "preco": price, "disponivel": available}


class SaleRowsTests(unittest.TestCase):
    def test_uses_cheapest_in_stock_cost_and_applies_markup_rounding_up(self):
        shape = item(SHAPE, 1, "Gold Testenat X 10 ML.", "landerlan", 16)
        byp = item(BYP, "a", "LANDERLAN Enantato Testenat", "Landerlan", 15)
        sold_out = item(SHAPE, 2, "Outro produto", "ZPHC", 5, available=False)
        placeholder = item(SHAPE, 3, "Item de centavos", "ZPHC", 0.01)
        data = {
            "cotacoes": {SHAPE: 5.0, BYP: 5.5},
            "produtos": [shape, byp, sold_out, placeholder],
            "grupos": [{"confianca": "alta", "itens": {SHAPE: shape, BYP: byp}}],
        }

        rows = sale_rows(data, 110)

        # 16 x 5,00 = R$ 80,00 (Shape Total) ganha de 15 x 5,50 = R$ 82,50; 80 x 2,10 = 168.
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]["marca"], rows[0]["nome"], rows[0]["custo"], rows[0]["venda"]),
                         ("LANDERLAN", "Gold Testenat 10ml", 80.0, 168.0))
        self.assertEqual(sale_rows(data, 10)[0]["venda"], 88.0)


    def test_brands_are_split_into_premium_imported_and_others(self):
        self.assertEqual(sale_section("ZPHC"), "MARCAS PREMIUM")
        self.assertEqual(sale_section("alpha pharma"), "MARCAS PREMIUM")
        self.assertEqual(sale_section("Oxygen Kw Phama"), "MARCAS IMPORTADAS")
        self.assertEqual(sale_section("MusclePharm"), "MARCAS IMPORTADAS")
        self.assertEqual(sale_section("Biogenesis"), "OUTRAS MARCAS")
        self.assertEqual(sale_section(""), "OUTRAS MARCAS")

    def test_rows_come_ordered_by_section_then_brand(self):
        data = {
            "cotacoes": {SHAPE: 5.0},
            "grupos": [],
            "produtos": [
                item(SHAPE, 1, "Produto B", "Biogenesis", 10),
                item(SHAPE, 2, "Produto O", "Oxygen", 10),
                item(SHAPE, 3, "Produto Z", "ZPHC", 10),
            ],
        }

        rows = sale_rows(data, 110)
        self.assertEqual([row["secao"] for row in rows], ["OUTROS PRODUTOS"] * 3)

    def test_product_types(self):
        def kind(name, brand="ZPHC", category="", detail=""):
            return product_type([dict(item(SHAPE, 1, name, brand, 10), categoria=category, detalhe=detail)])

        self.assertEqual(kind("ZPHC RETATRUTIDE 120MG - 05 VIAL"), "RETATRUTIDA")
        self.assertEqual(kind("OXYGEN RETAGEN 40MG", "Oxygen"), "RETATRUTIDA")
        self.assertEqual(kind("TIRZEC MD 15MG", "Tirzec"), "TIRZEPATIDA")
        self.assertEqual(kind("GEN-TIRZ X 10 MG.", "Gen health", detail="tirzepatida (mounjaro)"), "TIRZEPATIDA")
        self.assertEqual(kind("BIOGENESIS BPC-157 10MG", "Biogenesis"), "PEPTÍDEOS")
        self.assertEqual(kind("ZPHC ZTROP GH 16 UI", category="hgh"), "PEPTÍDEOS")
        self.assertEqual(kind("ZPHC TEST ENANTATO 250MG/ML", category="anabolizante"), "ESTEROIDES")
        self.assertEqual(kind("LANDERLAN Decaland Depot 200mg", "Landerlan"), "ESTEROIDES")
        self.assertEqual(kind("ACNECUR X 20 MG X 30 CAPS", "catedral", category="anti acne"), "OUTROS PRODUTOS")

    def test_steroids_keep_premium_and_imported_groups_in_that_order(self):
        data = {
            "cotacoes": {SHAPE: 5.0},
            "grupos": [],
            "produtos": [
                item(SHAPE, 1, "BIOGENESIS TESTO ENANTATO 250MG", "Biogenesis", 10),
                item(SHAPE, 2, "OXYGEN TESTO ENANTATO 250MG", "Oxygen", 10),
                item(SHAPE, 3, "ZPHC TESTO ENANTATO 250MG", "ZPHC", 10),
                item(SHAPE, 4, "ZPHC RETATRUTIDE 40MG", "ZPHC", 10),
            ],
        }

        rows = sale_rows(data, 110)

        self.assertEqual([(row["secao"], row["grupo"]) for row in rows], [
            ("RETATRUTIDA", ""),
            ("ESTEROIDES", "MARCAS PREMIUM"),
            ("ESTEROIDES", "MARCAS IMPORTADAS"),
            ("ESTEROIDES", "OUTRAS MARCAS"),
        ])


if __name__ == "__main__":
    unittest.main()
