import importlib.util
import math
from pathlib import Path
import struct
import tempfile
import unittest
import wave

spec = importlib.util.spec_from_file_location('check_voice_wav', Path(__file__).with_name('check_voice_wav.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class TechnicalWavChecks(unittest.TestCase):
    def test_structural_cases(self):
        with tempfile.TemporaryDirectory() as tmp:
            for name, amplitude, expected in [('valid', 4000, True), ('silence', 0, False), ('clipped', 32767, False)]:
                p = Path(tmp) / (name + '.wav')
                samples = [int(amplitude * math.sin(2 * math.pi * 330 * n / 24000)) for n in range(24000)] if name != 'clipped' else [amplitude] * 24000
                with wave.open(str(p), 'wb') as w:
                    w.setparams((1, 2, 24000, 0, 'NONE', 'not compressed'))
                    w.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
                self.assertEqual(mod.check(p)['ok'], expected, name)
            p = Path(tmp) / 'valid.wav'
            p.write_bytes(p.read_bytes()[:-4000])
            self.assertFalse(mod.check(p)['ok'])
            self.assertFalse(mod.check(Path(tmp) / 'missing.wav')['ok'])


if __name__ == '__main__':
    unittest.main()
