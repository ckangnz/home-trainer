"""Regression checks for coaching-number validation. Run: python -m unittest discover -s scripts -p test_batch_tools.py"""
import unittest
import batch_tools as bt

class EnglishNumberTests(unittest.TestCase):
    def test_tens_have_their_actual_values(self):
        for n in range(20, 100, 10):
            with self.subTest(n=n):
                self.assertEqual(bt.numbers_in(bt.en_number(n), 'en'), [n])
                self.assertTrue(bt.check_atom(f'{n} seconds', f'{bt.en_number(n)} seconds', 'en')['ok'])

    def test_wrong_tens_never_pass(self):
        for expected in range(20, 100, 10):
            for spoken in range(20, 100, 10):
                if expected != spoken:
                    with self.subTest(expected=expected, spoken=spoken):
                        self.assertFalse(bt.check_atom(f'{expected} seconds', f'{bt.en_number(spoken)} seconds', 'en')['ok'])

    def test_hundreds_and_compounds(self):
        for n in (100, 105, 110, 120, 135, 199, 200):
            self.assertEqual(bt.numbers_in(bt.en_number(n), 'en'), [n])
        self.assertEqual(bt.numbers_in('a hundred seconds', 'en'), [100])
        self.assertEqual(bt.numbers_in('one hundred and five seconds', 'en'), [105])

    def test_multiple_counts_remain_separate(self):
        self.assertEqual(bt.numbers_in('set four of six', 'en'), [4, 6])
        self.assertFalse(bt.check_atom('105 seconds', '10, 5 seconds', 'en')['ok'])
        self.assertFalse(bt.check_atom('30 seconds', '30 reps', 'en')['ok'])

if __name__ == '__main__':
    unittest.main()
