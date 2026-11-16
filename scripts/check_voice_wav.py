#!/usr/bin/env python3
"""Technical checks for individually requested voice WAVs, without an ASR veto.

One request must map to one atom outside this script. These checks do not certify
pronunciation, complete wording, speaker identity, dialect, or listening quality.
Usage: python3 scripts/check_voice_wav.py file.wav [...]
"""
import array
import json
import math
from pathlib import Path
import subprocess
import sys
import wave


def check(path):
    p = Path(path)
    result = {"file": p.name, "ok": False, "errors": [], "advisories": []}
    try:
        with wave.open(str(p), "rb") as w:
            channels, width, rate, frames = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
            payload = w.readframes(frames)
        if len(payload) != frames * channels * width:
            result["errors"].append("truncated PCM payload")
        result.update(channels=channels, sample_width=width, sample_rate=rate, frames=frames, duration_seconds=round(frames / rate, 4))
        decoded = subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(p), "-f", "s16le", "-ac", "1", "-ar", "24000", "-"], capture_output=True)
        if decoded.returncode:
            raise ValueError("audio decode failed: " + decoded.stderr.decode(errors="replace")[:200])
        pcm = array.array("h", decoded.stdout)
        if sys.byteorder != "little":
            pcm.byteswap()
        if not pcm:
            raise ValueError("empty decoded audio")
        rms = math.sqrt(sum(v * v for v in pcm) / len(pcm)) / 32768
        peak = max(abs(v) for v in pcm) / 32768
        clipped = sum(abs(v) >= 32760 for v in pcm) / len(pcm)
        active = sum(abs(v) >= 300 for v in pcm) / 24000
        result.update(rms=round(rms, 6), peak=round(peak, 6), clipping_fraction=round(clipped, 6), signal_above_threshold_seconds=round(active, 4))
        if frames / rate < 0.20 or frames / rate > 60:
            result["errors"].append("implausible cue duration")
        if rms < 0.001 or active < 0.04:
            result["errors"].append("silent or insufficient signal")
        if clipped > 0.05:
            result["errors"].append("severe clipping")
        # A hard waveform edge suggests review, but cannot prove a cut word.
        if abs(pcm[-1]) > 1200:
            result["advisories"].append("nonquiet last sample; inspect possible hard ending")
        result["ok"] = not result["errors"]
    except (OSError, ValueError, wave.Error, ZeroDivisionError) as exc:
        result["errors"].append(str(exc))
    return result


if __name__ == "__main__":
    results = [check(p) for p in sys.argv[1:]]
    print(json.dumps(results, ensure_ascii=False, indent=2))
    sys.exit(0 if results and all(r["ok"] for r in results) else 1)
