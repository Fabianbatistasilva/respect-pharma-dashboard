import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from comparador import (
    BYP,
    SHAPE,
    features,
    match_products,
    match_score,
    normalize_bypharmacon,
    open_database,
    price_changes,
    record_history,
)


def item(store, product_id, name, brand, price=10, **extra):
    base = {
        "loja": store,
        "id": str(product_id),
        "nome": name,
        "marca": brand,
        "categoria": "",
        "detalhe": "",
        "apresentacao": "",
        "quantidade": "",
        "dose": "",
        "preco": price,
        "disponivel": True,
    }
    return {**base, **extra}


def score(shape_item, byp_item):
    return match_score(features(shape_item), features(byp_item))


class MatchingTests(unittest.TestCase):
    def test_trade_name_matches_active_ingredient(self):
        shape = item(SHAPE, 1, "GOLD DECALAND X 200 MG. X 10 ML.", "landerlan", detalhe="decanoato de nandrolona")
        byp = item(BYP, "a", "LANDERLAN Decaland Depot 200mg", "Landerlan")

        self.assertGreaterEqual(score(shape, byp), 0.85)

    def test_different_dose_does_not_match(self):
        shape = item(SHAPE, 1, "GEN RETATRUTIDE X 120 MG.", "Gen health")
        byp = item(BYP, "a", "GEN HEALTH RETATRUTIDE 60MG", "Gen Health")

        self.assertEqual(score(shape, byp), 0)

    def test_different_brand_does_not_match(self):
        shape = item(SHAPE, 1, "ZPHC NAD + 1000 MG 1 VIAL", "ZPHC")
        byp = item(BYP, "a", "OXYGEN NAD+ 1000MG", "Oxygen")

        self.assertEqual(score(shape, byp), 0)

    def test_similar_peptide_numbers_are_kept_apart(self):
        shape = item(SHAPE, 1, "ZPHC GHRP6 (25MG) 5MG X VIAL/5", "ZPHC")
        byp = item(BYP, "a", "ZPHC GHRP-2 25mg (5 Viais x 5mg)", "ZPHC")

        self.assertEqual(score(shape, byp), 0)

    def test_tablet_count_must_agree(self):
        shape = item(SHAPE, 1, "LANDER OXANDROLONA 10 MG. X 50 COMP.", "landerlan")
        byp = item(BYP, "a", "LANDERLAN Oxandroland 5mg 100 comp (Oxandrolona)", "Landerlan")

        self.assertEqual(score(shape, byp), 0)

    def test_manual_overrides_win_over_automatic_matching(self):
        shape_items = [item(SHAPE, 1, "ZPHC ZTROP X 200 UI.", "ZPHC"), item(SHAPE, 2, "ZPHC ZTROP GH 16 UI", "ZPHC")]
        byp_items = [item(BYP, "a", "ZPHC Ztrop 200", "ZPHC")]

        matches = match_products(shape_items, byp_items, {("1", "a")}, {("2", "a")}, 0.62)

        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0][SHAPE]["id"], "1")
        self.assertEqual(matches[0]["confianca"], "confirmada")

    def test_large_price_gap_is_flagged_as_low_confidence(self):
        shape_items = [item(SHAPE, 1, "OXYGEN GLOW X 70 MG.", "oxygen", price=100)]
        byp_items = [item(BYP, "a", "OXYGEN GLOW 70MG", "Oxygen", price=40)]

        matches = match_products(shape_items, byp_items, set(), set(), 0.62)

        self.assertEqual(matches[0]["confianca"], "baixa")


class BypharmaconTests(unittest.TestCase):
    def test_normalizes_price_tiers_and_promotion(self):
        product = normalize_bypharmacon(
            {
                "id": "prod_1",
                "name": "COOPER Flubolic 5x10",
                "brand": "Cooper",
                "category": "Hormonais e Anabolizantes",
                "stock": 0,
                "inStock": False,
                "priceRetail": 44,
                "priceTiersUSD": [
                    {"min_quantity": 1, "amount": 44},
                    {"min_quantity": 5, "amount": 40},
                ],
                "promo_prices": {"price_a_original": 50},
            }
        )

        self.assertEqual(product["preco"], 44)
        self.assertEqual(product["atacado"], [{"min": 5, "preco": 40}])
        self.assertEqual(product["preco_original"], 50)
        self.assertFalse(product["disponivel"])


class HistoryTests(unittest.TestCase):
    def test_records_only_changes_and_reports_them(self):
        connection = open_database(Path(":memory:"))
        first = [item(BYP, "a", "Produto A", "Marca", price=10)]

        self.assertEqual(record_history(connection, BYP, first), [])
        self.assertEqual(record_history(connection, BYP, first), [])

        changed = [item(BYP, "a", "Produto A", "Marca", price=12, disponivel=False)]
        summaries = record_history(connection, BYP, changed)

        self.assertEqual(len(summaries), 2)
        self.assertIn("US$ 10.00 → US$ 12.00", summaries[0])
        self.assertIn("ESGOTOU", summaries[1])
        self.assertEqual(connection.execute("SELECT COUNT(*) FROM historico").fetchone()[0], 2)
        self.assertEqual(price_changes(connection)[0]["depois"], 12)


if __name__ == "__main__":
    unittest.main()
