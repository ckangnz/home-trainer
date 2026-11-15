"""Regression checks for coaching-number validation. Run: python -m unittest discover -s scripts -p test_batch_tools.py"""
import unittest
from unittest.mock import patch
from types import SimpleNamespace
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

class KoreanNumberTests(unittest.TestCase):
    def test_numeral_spellings_with_units(self):
        for atom, heard in [('105초', '백오초'), ('30초', '삼십 초'),
                            ('6세트 중 6세트', '육세트 중 육세트'),
                            ('3회', '세 회'), ('10회', '열 회')]:
            self.assertEqual(bt.numbers_in(atom, 'ko'), bt.numbers_in(heard, 'ko'))
            self.assertTrue(bt.check_atom(atom, heard, 'ko')['ok'], (atom, heard, bt.check_atom(atom, heard, 'ko')))
        self.assertEqual(bt.numbers_in('육세트 중 육세트', 'ko'), [6, 6])

    def test_classifier_tokens_share_normalization(self):
        for text in ['한쪽 다리를 다른 쪽 위에 올려 압력을 더해요.', '한 다리 햄스트링 스트레칭']:
            self.assertTrue(bt.check_atom(text, text, 'ko')['ok'])
        self.assertFalse(bt.check_atom('한쪽 다리', '두쪽 다리', 'ko')['ok'])

    def test_non_numeral_syllables_are_not_counts(self):
        for text in ['자세 바꿔요.', '가슴을 세우고', '스텝백 버피',
                     '바벨 백 스쿼트', '비둘기 자세', '네거티브 푸시업']:
            self.assertEqual(bt.numbers_in(text, 'ko'), [], text)

    def test_wrong_counts_remain_different(self):
        for atom, heard in [('105초', '십오초'), ('6세트 중 6세트', '육세트 중 오세트'),
                            ('10회', '아홉 회'), ('한 다리', '두 다리')]:
            self.assertNotEqual(bt.numbers_in(atom, 'ko'), bt.numbers_in(heard, 'ko'))

class SilenceDetectionTests(unittest.TestCase):
    def test_ffmpeg_failure_is_not_a_whole_file_span(self):
        with patch.object(bt.subprocess, 'run', return_value=SimpleNamespace(returncode=1, stderr='bad duration')):
            with self.assertRaisesRegex(RuntimeError, 'silence detection failed'):
                bt.detect_speech_spans('test.wav')

if __name__ == '__main__':
    unittest.main()
