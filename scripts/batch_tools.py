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
    if n < 1000:
        out = EN_DIGITS[n // 100] + " hundred"
        if n % 100:
            out += " " + en_number(n % 100)
        return out
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
    if n < 1000:
        out = ("" if n // 100 == 1 else KO_DIGITS[n // 100]) + "백"
        if n % 100:
            out += ko_number(n % 100)
        return out
    return str(n)


EN_WORD2NUM = {w: i for i, w in enumerate(EN_DIGITS)}
EN_WORD2NUM.update({w: (i + 2) * 10 for i, w in enumerate(EN_TENS) if w})
KO_WORD2NUM = {w: i for i, w in enumerate(KO_DIGITS) if w}
KO_WORD2NUM.update({"공": 0})
KO_NATIVE = {
    "하나": 1, "한": 1, "둘": 2, "두": 2, "셋": 3, "세": 3, "넷": 4, "네": 4,
    "다섯": 5, "여섯": 6, "일곱": 7, "여덟": 8, "아홉": 9, "열": 10,
    "스물": 20, "스무": 20, "서른": 30, "마흔": 40, "쉰": 50,
}


def numbers_in(text, lang):
    """Canonical integer values mentioned in text, from digits and number
    words. Ambiguous renderings (e.g. ASR writing '105' as '10, 5') yield
    different multisets on purpose: they must fail closed, not be reconciled."""
    values = [int(d) for d in re.findall(r"\d+", text)]
    if lang == "en":
        words = re.findall(r"[a-z]+", text.lower().replace("-", " "))
        total, current, consuming = 0, 0, False
        for w in words + [""]:
            if w in EN_WORD2NUM:
                current += EN_WORD2NUM[w]
                consuming = True
            elif w == "hundred" and consuming:
                current = max(current, 1) * 100
            elif w == "and" and consuming:
                continue
            else:
                if consuming:
                    values.append(total + current)
                    total, current, consuming = 0, 0, False
    else:
        s = re.sub(r"[^가-힣]", "", text)
        # Longest-match scan over sino/native Korean number words.
        pat = re.compile(
            "([일이삼사오육칠팔구]?십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구]?백[일이삼사오육칠팔구십백]*|"
            + "|".join(sorted(KO_NATIVE, key=len, reverse=True)) + ")")
        for m in pat.finditer(s):
            tok = m.group(1)
            if tok in KO_NATIVE:
                values.append(KO_NATIVE[tok])
            else:
                total = 0
                rest = tok
                if "백" in rest:
                    head, rest = rest.split("백", 1)
                    total += (KO_WORD2NUM.get(head, 1) if head else 1) * 100
                if "십" in rest:
                    head, rest = rest.split("십", 1)
                    total += (KO_WORD2NUM.get(head, 1) if head else 1) * 10
                if rest:
                    total += KO_WORD2NUM.get(rest, 0)
                values.append(total)
    return sorted(values)


UNIT_WORDS = {
    "en": ["second", "seconds", "sec", "secs", "minute", "minutes", "rep", "reps"],
    "ko": ["초", "분", "회", "번", "세트"],
}


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
        # A clip may be assigned to an atom only when EVERY check passes:
        #  1. exact numeric multiset (coaching numbers must be right -
        #     '105 seconds' heard as '10, 5 seconds' is a failure, not a
        #     normalization difference),
        #  2. every unit word of the atom present (seconds/reps/초/회...),
        #  3. every content token of the atom present in the transcript
        #     (exercise identity and command words),
        #  4. overall fuzzy similarity >= 0.7 as a sanity floor.
        # Anything less fails closed to review; audio is never assigned on a
        # partial match. Two decode passes are only a hedge against known
        # short-clip ASR instability (repetition loops, dropped digits); the
        # accepting pass must clear all four checks on its own.
        best = None
        prompt = (
            "Exercise timer cues: 105 seconds, 110 seconds, 12 reps, 30 seconds, halfway, switch sides."
            if lang == "en" else
            "운동 타이머 안내: 105초, 110초, 12회, 30초 남았어요, 절반 왔어요, 자세 바꿔요."
        )
        for kwargs in (
            dict(beam_size=5, condition_on_previous_text=False, vad_filter=True, initial_prompt=prompt),
            dict(beam_size=5, condition_on_previous_text=False, vad_filter=False, initial_prompt=prompt),
        ):
            segments, _ = model.transcribe(seg, language=lang, **kwargs)
            heard = "".join(s.text for s in segments)
            verdict = check_atom(atom, heard, lang)
            if best is None or (verdict["ok"] and not best["ok"]) or (
                verdict["ok"] == best["ok"] and verdict["ratio"] > best["ratio"]
            ):
                best = {**verdict, "heard": heard}
            if best["ok"] and best["ratio"] >= 0.9:
                break
        results.append(best)
    print(json.dumps(results, ensure_ascii=False))


def check_atom(atom, heard, lang):
    reasons = []
    if numbers_in(atom, lang) != numbers_in(heard, lang):
        reasons.append(f"numbers {numbers_in(atom, lang)} != {numbers_in(heard, lang)}")
    heard_variants = {normalize(heard, lang, e) for e in (False, True)}
    squashed = re.sub(r"\s+", " ", atom.lower())
    for unit in UNIT_WORDS[lang]:
        if re.search(rf"(?<![a-z가-힣]){unit}(?![a-z가-힣])", squashed if lang == "en" else atom):
            if not any(unit in h for h in heard_variants):
                reasons.append(f"unit '{unit}' not heard")
    for tok in re.findall(r"[\w가-힣]+", atom.lower()):
        if tok.isdigit() or tok in UNIT_WORDS[lang]:
            continue  # covered by the exact numeric/unit checks
        if len(tok) < 2:
            continue
        if not any(tok in h for h in heard_variants):
            reasons.append(f"token '{tok}' not heard")
    ratio = max(
        difflib.SequenceMatcher(None, normalize(atom, lang, e), normalize(heard, lang, h)).ratio()
        for e in (False, True) for h in (False, True)
    )
    if ratio < 0.7:
        reasons.append(f"similarity {ratio:.2f} < 0.7")
    return {"atom": atom, "ratio": round(ratio, 3), "ok": not reasons, "reasons": reasons}


if __name__ == "__main__":
    if sys.argv[1] == "split":
        cmd_split(sys.argv[2], int(sys.argv[3]), sys.argv[4])
    elif sys.argv[1] == "asr":
        cmd_asr(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        sys.exit("unknown subcommand")
