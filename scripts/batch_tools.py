#!/usr/bin/env python3
"""Batch-mode helpers for generate-voices.ts.

split:  split a batch WAV at TTS pause-tag silences into per-atom segments.
        FAILS CLOSED: if the segment count does not equal the atom count,
        nothing is written for assignment and the exit code is 4.
asr:    transcribe segments with a local Whisper model and compare each
        transcript to its expected atom text. Never assigns audio to the
        wrong atom: any mismatch is reported, not forced.

Usage:
  python3 scripts/batch_tools.py split <batch.wav> <expected_count> <out_dir>
  python3 scripts/batch_tools.py asr <lang:en|ko> <expected.json> <seg_dir>
      expected.json: ["atom text in segment order", ...]
"""
import difflib
import json
import re
import subprocess
import sys
import os

# ffmpeg silence detection tuned for TTS pause tags: pauses render as clean
# digital silence well below -45dB and >= 0.35s.
SILENCE_NOISE_DB = "-45"
SILENCE_MIN_DUR = "0.35"
MIN_SEGMENT_SEC = 0.25


def detect_speech_spans(wav_path):
    """Return [(start, end)] of non-silent spans via ffmpeg silencedetect."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", wav_path, "-af",
         f"silencedetect=noise={SILENCE_NOISE_DB}dB:d={SILENCE_MIN_DUR}",
         "-f", "null", "-"],
        capture_output=True, text=True)
    log = proc.stderr
    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", log)]
    duration = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).groups()
                     and sum(float(a) * b for a, b in
                             zip(re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).groups(),
                                 (3600, 60, 1))))
    spans = []
    cursor = 0.0
    for s, e in zip(starts, ends):
        if s > cursor:
            spans.append((cursor, s))
        cursor = e
    if cursor < duration - 0.05:
        spans.append((cursor, duration))
    return [(s, e) for s, e in spans if e - s >= MIN_SEGMENT_SEC]


def cmd_split(wav_path, expected_count, out_dir):
    spans = detect_speech_spans(wav_path)
    result = {"segments": len(spans), "expected": expected_count,
              "spans": [(round(s, 3), round(e, 3)) for s, e in spans]}
    if len(spans) != expected_count:
        # Fail closed: write nothing, report the mismatch for review.
        print(json.dumps({**result, "ok": False,
                          "error": "segment count mismatch"}))
        sys.exit(4)
    os.makedirs(out_dir, exist_ok=True)
    for i, (s, e) in enumerate(spans):
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-i", wav_path, "-ss", f"{s:.3f}", "-to", f"{e:.3f}",
             "-c", "copy", os.path.join(out_dir, f"seg-{i:03d}.wav")],
            check=True)
    print(json.dumps({**result, "ok": True}))


EN_DIGITS = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
]
EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
KO_DIGITS = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]


def en_number(n):
    if n < 20:
        return EN_DIGITS[n]
    if n < 100:
        return EN_TENS[n // 10] + ((" " + EN_DIGITS[n % 10]) if n % 10 else "")
    return str(n)


def ko_number(n):
    if n < 10:
        return KO_DIGITS[n]
    if n < 100:
        tens, ones = n // 10, n % 10
        out = ("" if tens == 1 else KO_DIGITS[tens]) + "십"
        if ones:
            out += KO_DIGITS[ones]
        return out
    return str(n)


def normalize(text, lang, expand):
    # Numbers are spoken as words; TTS prompts carry digits, and ASR output
    # mixes both forms. Compare with digits kept AND with digits expanded to
    # the language's number words, and keep the best match.
    if expand:
        conv = en_number if lang == "en" else ko_number
        text = re.sub(r"\d+", lambda m: conv(int(m.group())), text)
    text = text.lower()
    text = re.sub(r"[^\w가-힣]+", "", text)
    return text


def cmd_asr(lang, expected_path, seg_dir):
    from faster_whisper import WhisperModel
    expected = json.load(open(expected_path, encoding="utf-8"))
    # "small" (int8): larger models do not fit in typical CI/laptop memory.
    model = WhisperModel("small", device="cpu", compute_type="int8")
    results = []
    for i, atom in enumerate(expected):
        seg = os.path.join(seg_dir, f"seg-{i:03d}.wav")
        if not os.path.exists(seg):
            results.append({"atom": atom, "ok": False, "error": "missing segment"})
            continue
        # Small models can be unstable on very short clips (digit/word
        # confusion, repetition loops). Take the best of two decode passes
        # and keep the final call conservative: still fail closed.
        best_heard, best_ratio = "", 0.0
        for kwargs in (
            dict(beam_size=5, condition_on_previous_text=False, vad_filter=True),
            dict(beam_size=5, condition_on_previous_text=False, vad_filter=False),
        ):
            segments, _ = model.transcribe(seg, language=lang, **kwargs)
            heard = "".join(s.text for s in segments)
            ratio = max(
                difflib.SequenceMatcher(None, normalize(atom, lang, e), normalize(heard, lang, h)).ratio()
                for e in (False, True) for h in (False, True)
            )
            if ratio > best_ratio:
                best_heard, best_ratio = heard, ratio
            if best_ratio >= 0.9:
                break
        results.append({"atom": atom, "heard": best_heard, "ratio": round(best_ratio, 3),
                        "ok": best_ratio >= 0.7})
    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    if sys.argv[1] == "split":
        cmd_split(sys.argv[2], int(sys.argv[3]), sys.argv[4])
    elif sys.argv[1] == "asr":
        cmd_asr(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        sys.exit("unknown subcommand")
