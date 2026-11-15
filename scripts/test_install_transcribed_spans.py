import unittest
from install_transcribed_spans import atom_hash, exact_matches


class SpanMatchTests(unittest.TestCase):
    def atoms(self, *texts):
        return [{'atom': text, 'hash': atom_hash(text)} for text in texts]

    def spans(self, *texts):
        return [{'start': i * 2, 'end': i * 2 + 1, 'heard': text} for i, text in enumerate(texts)]

    def test_unique_exact_match(self):
        matches = exact_matches(self.atoms('30 seconds'), self.spans('thirty seconds'), 'en')
        self.assertEqual(len(matches), 1)

    def test_wrong_count_rejected(self):
        self.assertEqual(exact_matches(self.atoms('50 seconds'), self.spans('thirty seconds'), 'en'), [])

    def test_combined_span(self):
        matches = exact_matches(self.atoms('Good work. Breathe.'), self.spans('Good work.', 'Breathe.'), 'en')
        self.assertEqual([(m[0], m[1]) for m in matches], [(0, 2)])

    def test_overlapping_candidates_rejected(self):
        self.assertEqual(exact_matches(self.atoms('Good work.', 'Good work. Breathe.'), self.spans('Good work.', 'Breathe.'), 'en'), [])

    def test_no_expected_words_in_silent_span(self):
        self.assertEqual(exact_matches(self.atoms('Good work. Breathe.'), self.spans('Good work.', '', 'Breathe.'), 'en'), [])

    def test_korean_numeric_equivalent(self):
        self.assertEqual(len(exact_matches(self.atoms('6세트 중 6세트'), self.spans('육세트 중 육세트'), 'ko')), 1)

    def test_no_homophone_substitution(self):
        self.assertEqual(exact_matches(self.atoms('Forward lunge'), self.spans('forward lunch'), 'en'), [])


if __name__ == '__main__':
    unittest.main()
