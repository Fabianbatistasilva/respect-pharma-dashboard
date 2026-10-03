import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from comparador import (
    ATACADO,
    BYP,
    SHAPE,
    features,
    history_series,
    match_products,
    match_score,
    normalize_atacado,
    normalize_bypharmacon,
    open_database,
    price_changes,
    prune_history,
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
        stores = {
            SHAPE: [item(SHAPE, 1, "ZPHC ZTROP X 200 UI.", "ZPHC"), item(SHAPE, 2, "ZPHC ZTROP GH 16 UI", "ZPHC")],
            BYP: [item(BYP, "a", "ZPHC Ztrop 200", "ZPHC")],
        }

        matches = match_products(stores, [[(SHAPE, "1"), (BYP, "a")]], {frozenset({(SHAPE, "2"), (BYP, "a")})}, 0.62)

        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["itens"][SHAPE]["id"], "1")
        self.assertEqual(matches[0]["confianca"], "confirmada")

    def test_large_price_gap_is_flagged_as_low_confidence(self):
        stores = {
            SHAPE: [item(SHAPE, 1, "OXYGEN GLOW X 70 MG.", "oxygen", price=100)],
            BYP: [item(BYP, "a", "OXYGEN GLOW 70MG", "Oxygen", price=40)],
        }

        matches = match_products(stores, [], set(), 0.62)

        self.assertEqual(matches[0]["confianca"], "baixa")

    def test_same_product_in_three_stores_forms_one_group(self):
        stores = {
            SHAPE: [item(SHAPE, 1, "OXYGEN NAD+ X 1000 MG.", "oxygen")],
            BYP: [item(BYP, "a", "OXYGEN NAD+ 1000MG", "Oxygen")],
            ATACADO: [item(ATACADO, "x", "OXYGEN NAD+ 1000MG", "Oxygen")],
        }

        matches = match_products(stores, [], set(), 0.62)

        self.assertEqual(len(matches), 1)
        self.assertEqual(set(matches[0]["itens"]), {SHAPE, BYP, ATACADO})

    def test_group_never_joins_incompatible_products(self):
        # O item sem dose casa com os dois, mas 40 mg e 120 mg não podem ficar no mesmo grupo.
        stores = {
            SHAPE: [item(SHAPE, 1, "GEN RETATRUTIDE X 40 MG.", "Gen health")],
            BYP: [item(BYP, "a", "GEN HEALTH RETATRUTIDE", "Gen Health")],
            ATACADO: [item(ATACADO, "x", "GEN HEALTH RETATRUTIDE 120MG", "Gen Health")],
        }

        matches = match_products(stores, [], set(), 0.5)

        self.assertEqual(len(matches), 1)
        self.assertEqual(len(matches[0]["itens"]), 2)


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


class AtacadoTests(unittest.TestCase):
    def test_normalizes_minor_units_brand_and_sale_price(self):
        product = normalize_atacado(
            {
                "id": 45220,
                "name": "OXYGEN GLOW 70MG &#8211; PEN",
                "permalink": "https://atacadoparaguai.com.py/produto/oxygen-glow/",
                "prices": {"price": "9000", "regular_price": "9500", "currency_minor_unit": 2, "currency_code": "USD"},
                "brands": [{"name": "Oxygen"}],
                "categories": [{"name": "Farma"}],
                "is_in_stock": True,
            }
        )

        self.assertEqual(product["nome"], "OXYGEN GLOW 70MG - PEN")
        self.assertEqual(product["preco"], 90)
        self.assertEqual(product["preco_original"], 95)
        self.assertEqual(product["marca"], "Oxygen")
        self.assertIsNone(product["estoque"])
        self.assertTrue(product["disponivel"])


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
        points = history_series(connection)[BYP]["a"]
        self.assertEqual([point[1:] for point in points], [[10, 1], [12, 0]])


    def test_price_and_restock_alerts_carry_the_value_in_both_currencies(self):
        connection = open_database(Path(":memory:"))
        record_history(connection, BYP, [item(BYP, "a", "Produto A", "Marca", price=10, disponivel=False)])

        summaries = record_history(connection, BYP, [item(BYP, "a", "Produto A", "Marca", price=12)], rate=5.5)

        self.assertEqual(
            summaries,
            [
                "PREÇO (ByPharmacon): Produto A — US$ 10.00 → US$ 12.00 (R$ 66,00)",
                "VOLTOU (ByPharmacon): Produto A — US$ 12.00 (R$ 66,00)",
            ],
        )

    def test_removed_product_is_reported_once_and_again_when_it_returns(self):
        connection = open_database(Path(":memory:"))
        both = [item(BYP, "a", "Produto A", "Marca"), item(BYP, "b", "Produto B", "Marca")]
        only_a = both[:1]
        record_history(connection, BYP, both)

        self.assertEqual(record_history(connection, BYP, only_a), ["REMOVIDO (ByPharmacon): Produto B"])
        self.assertEqual(record_history(connection, BYP, only_a), [])
        self.assertEqual(record_history(connection, BYP, both), ["VOLTOU AO CATÁLOGO (ByPharmacon): Produto B — US$ 10.00"])

    def test_mass_disappearance_is_not_treated_as_removal(self):
        connection = open_database(Path(":memory:"))
        full = [item(BYP, str(number), f"Produto {number}", "Marca") for number in range(40)]
        record_history(connection, BYP, full)

        self.assertEqual(record_history(connection, BYP, full[:5]), [])

    def test_prune_keeps_recent_rows_and_current_price_of_each_product(self):
        connection = open_database(Path(":memory:"))
        rows = [
            (BYP, "a", "Produto A", 10, 1, "2020-01-01T00:00:00+00:00"),
            (BYP, "a", "Produto A", 11, 1, "2020-02-01T00:00:00+00:00"),
            (BYP, "b", "Produto B", 20, 1, "2020-01-01T00:00:00+00:00"),
            (BYP, "b", "Produto B", 21, 1, "2999-01-01T00:00:00+00:00"),
        ]
        connection.executemany(
            "INSERT INTO historico(loja, produto_id, nome, preco, disponivel, visto_em) VALUES(?, ?, ?, ?, ?, ?)", rows
        )

        removed = prune_history(connection, 90)

        remaining = [tuple(row) for row in connection.execute("SELECT produto_id, preco FROM historico ORDER BY id")]
        self.assertEqual(removed, 2)
        self.assertEqual(remaining, [("a", 11.0), ("b", 21.0)])


if __name__ == "__main__":
    unittest.main()
