import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from comparador import BYP, SHAPE
from exportar_bot import build


def item(store, product_id, name, brand, price, **extra):
    return {"loja": store, "id": str(product_id), "nome": name, "marca": brand, "preco": price, "disponivel": True, **extra}


class ExportTests(unittest.TestCase):
    def test_products_carry_what_the_chat_needs_and_groups_point_to_them(self):
        shape = item(SHAPE, 1, "GOLD TESTENAT X 10 ML.", "landerlan", 16, detalhe="enantato de testosterona", codigo="ST-1")
        byp = item(BYP, "a", "LANDERLAN Enantato Testenat 250mg/ml", "Landerlan", 15, codigo="BY-A", atacado=[{"min": 5, "preco": 14}])
        other = item(SHAPE, 2, "ZPHC OXANDROLONA 10 MG X 100 COMP", "", 40, codigo="ST-2")
        data = {
            "gerado_em": "2026-10-02T19:00:00+00:00",
            "cotacoes": {SHAPE: 5.0, BYP: 5.5},
            "produtos": [shape, byp, other],
            "grupos": [
                {"confianca": "alta", "itens": {SHAPE: shape, BYP: byp}},
                {"confianca": "baixa", "itens": {SHAPE: other, BYP: byp}},
            ],
        }

        payload = build(data)

        # Só o grupo confiável vira "mesmo produto"; os itens são posições na lista de produtos.
        self.assertEqual(payload["grupos"], [[0, 1]])
        first, second, third = payload["produtos"]
        self.assertEqual(first["chave_marca"], "landerlan")
        self.assertEqual(first["f"]["tokens"], ["enantato", "testosterona"])
        self.assertEqual(first["f"]["volume"], 10)
        self.assertEqual(second["f"]["doses"], ["250mg"])
        self.assertEqual(second["atacado"], [{"min": 5, "preco": 14}])
        # Sem marca cadastrada, vale a primeira palavra do nome; campos vazios não são publicados.
        self.assertEqual(third["chave_marca"], "zphc")
        self.assertNotIn("marca", third)
        self.assertEqual(third["f"]["count"], 100)
        self.assertEqual(payload["sinonimos"]["masteron"], ["drostanolona"])
        self.assertEqual(payload["lojas"][SHAPE], "Shape Total")


if __name__ == "__main__":
    unittest.main()
