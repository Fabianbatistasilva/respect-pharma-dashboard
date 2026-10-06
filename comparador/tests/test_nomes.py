import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nomes import clean_name


class CleanNameTests(unittest.TestCase):
    def test_removes_brand_and_store_separators(self):
        self.assertEqual(clean_name("ZPHC TREMBOLONE ACE. X 100 MG. X 10 ML.", "ZPHC"), "Trembolona Acetato 100mg 10ml")
        self.assertEqual(clean_name("M.P ANAVAR X 5 MG. X 100 COMP.", "muscle labs"), "Anavar 5mg 100 comprimidos")
        self.assertEqual(clean_name("Peptídeo ZPHC Retatrutide 80MG - 05 Vial (liofilizada)", "ZPHC"),
                         "Retatrutida 80mg · 5 frascos (Liofilizada)")

    def test_adds_active_ingredient_when_the_name_is_a_trade_name(self):
        self.assertEqual(clean_name("GOLD TESTENAT X 10 ML.", "landerlan", "enantato de testosterona"),
                         "Gold Testenat 10ml (Enantato de Testosterona)")
        self.assertEqual(clean_name("M.P MASTERON X 100MG /10ML", "muscle labs", "propionato de drostanolona"),
                         "Masteron 100mg 10ml (Propionato de Drostanolona)")
        self.assertEqual(clean_name("ZPHC Trembolone Acetato 100mg (10ml)", "ZPHC", "acetato de trembolona"),
                         "Trembolona Acetato 100mg (10ml)")

    def test_keeps_compound_spellings_and_product_named_like_its_brand(self):
        self.assertEqual(clean_name("ZPHC GHK CU 60 MG X 1 VIAL", "ZPHC"), "GHK-Cu 60mg 1 frasco")
        self.assertEqual(clean_name("OXYGEN GHK-CU 100 MG - PEN", "Oxygen"), "GHK-Cu 100mg · caneta")
        self.assertEqual(clean_name("DRAGON ELITE SLU PP 332 500MCG - 60 CAPSULE", "Dragon Elite"), "SLU-PP 332 500mcg · 60 cápsulas")
        self.assertEqual(clean_name("FARMACON ACNECUR 30 CAPS (ROACUTAN)", "Acnecur"), "Acnecur 30 cápsulas (Roacutan)")


if __name__ == "__main__":
    unittest.main()
