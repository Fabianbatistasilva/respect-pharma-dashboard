import json
import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from comparador import BYP, SHAPE
from exportar_venda import build


def item(store, product_id, name, brand, price, available=True, **extra):
    return {
        "loja": store, "id": str(product_id), "nome": name, "marca": brand, "preco": price, "disponivel": available,
        "codigo": f"{'ST' if store == SHAPE else 'BY'}-{product_id}", **extra,
    }


class SaleExportTests(unittest.TestCase):
    def setUp(self):
        shape = item(SHAPE, 1, "GOLD TESTENAT X 10 ML.", "landerlan", 16, detalhe="enantato de testosterona")
        byp = item(BYP, "a", "LANDERLAN Enantato Testenat 250mg/ml", "Landerlan", 15, atacado=[{"min": 5, "preco": 14}])
        sold_out = item(SHAPE, 2, "ZPHC OXANDROLONA 10 MG X 100 COMP", "ZPHC", 40, available=False)
        self.data = {
            "gerado_em": "2026-10-02T19:00:00+00:00",
            "cotacoes": {SHAPE: 5.0, BYP: 5.5},
            "produtos": [shape, byp, sold_out],
            "grupos": [{"confianca": "alta", "itens": {SHAPE: shape, BYP: byp}}],
        }

    def test_one_product_per_group_with_the_sale_price(self):
        payload = build(self.data, 110)

        # Só o que tem estoque; o grupo vira um produto, com o menor custo: 16 x 5,00 = R$ 80 -> x 2,10 = R$ 168.
        self.assertEqual(len(payload["produtos"]), 1)
        product = payload["produtos"][0]
        self.assertEqual(product["preco"], 168.0)
        self.assertEqual(product["marca"], "LANDERLAN")
        self.assertEqual(product["chave_marca"], "landerlan")
        self.assertNotIn("landerlan", product["nome"].lower())
        # O nome original fica só para a busca; a dose vem da outra loja do grupo.
        self.assertIn("GOLD TESTENAT", product["busca"])
        self.assertEqual(product["f"]["doses"], ["250mg"])
        self.assertEqual(product["f"]["volume"], 10)
        self.assertTrue(payload["venda"])
        self.assertEqual(payload["grupos"], [])

    def test_nothing_tells_where_the_product_comes_from(self):
        payload = build(self.data, 110)
        text = json.dumps(payload["produtos"], ensure_ascii=False).lower()

        for hidden in ("shapetotal", "shape total", "bypharmacon", "atacado", "st-1", "by-a", "codigo", "custo"):
            self.assertNotIn(hidden, text)
        # O único preço que sai é o de venda: nem o custo em reais (80) nem o preço em dólar (16, 15).
        self.assertEqual([product["preco"] for product in payload["produtos"]], [168.0])
        self.assertNotIn("atacado", payload["produtos"][0])
        # A única "cotação" é 1: o preço já está em reais, e a cotação das lojas não sai daqui.
        self.assertEqual(payload["cotacoes"], {"venda": 1})
        self.assertEqual(payload["lojas"], {"venda": ""})

    def test_other_margin(self):
        self.assertEqual(build(self.data, 50)["produtos"][0]["preco"], 120.0)


if __name__ == "__main__":
    unittest.main()
