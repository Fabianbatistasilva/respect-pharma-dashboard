import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from monitor import detect_product_changes, normalize_product, render_template


def product(product_id=1, price=10, cde=0, pj=0, sg=0, name="Produto"):
    return normalize_product(
        {
            "id": product_id,
            "nombre": name,
            "marca": "Marca",
            "composicion": "Composição",
            "categoria": "Categoria",
            "precio": price,
            "stock_cde": cde,
            "stock_pj": pj,
            "stock_sg": sg,
        }
    )


class ChangeDetectionTests(unittest.TestCase):
    def setUp(self):
        self.watch = {
            "only_watchlist": False,
            "notify_new_products": True,
            "notify_removed_products": True,
            "notify_price_changes": True,
            "notify_stock_changes": True,
            "stock_change_mode": "availability",
        }

    def test_detects_price_and_stock_availability(self):
        before = {1: product(price=10, cde=0)}
        after = {1: product(price=12, cde=5)}

        changes = detect_product_changes(before, after, self.watch)

        self.assertEqual([item["kind"] for item in changes], ["price_change", "stock_availability"])
        self.assertIn("US$ 10.00 → US$ 12.00", changes[0]["summary"])
        self.assertIn("VOLTOU CDE", changes[1]["summary"])

    def test_restock_and_price_alerts_include_value_in_reais_when_rate_is_known(self):
        before = {1: product(price=10, cde=0)}
        after = {1: product(price=12, cde=5)}

        changes = detect_product_changes(before, after, self.watch, rate=5.25)

        self.assertIn("US$ 10.00 → US$ 12.00 (R$ 63,00)", changes[0]["summary"])
        self.assertIn("VOLTOU CDE: [ST-1] Produto — US$ 12.00 (R$ 63,00)", changes[1]["summary"])

    def test_quantity_change_is_ignored_in_availability_mode(self):
        before = {1: product(cde=3)}
        after = {1: product(cde=7)}

        changes = detect_product_changes(before, after, self.watch)

        self.assertEqual(changes, [])

    def test_watchlist_filters_by_term_without_accents(self):
        watch = dict(self.watch, only_watchlist=True, terms=["composicao"], product_ids=[])
        before = {1: product(price=10)}
        after = {1: product(price=12)}

        changes = detect_product_changes(before, after, watch)

        self.assertEqual(len(changes), 1)
        self.assertEqual(changes[0]["kind"], "price_change")


class TemplateTests(unittest.TestCase):
    def test_renders_nested_webhook_template(self):
        template = {"number": "{recipient}", "data": {"text": "{message}"}}

        rendered = render_template(template, {"recipient": "5511", "message": "Olá"})

        self.assertEqual(rendered, {"number": "5511", "data": {"text": "Olá"}})


if __name__ == "__main__":
    unittest.main()
