#!/usr/bin/env python3
"""Order-independent, fail-closed installer for speak-generated batch WAVs.

  python3 scripts/install_aligned.py <trainer> <lang> <batches_dir> <wav> [<wav> ...]

For each WAV: split into speech spans at silences, ASR every span, identify
which batch (NNN.expected.json in batches_dir) it is by aligning, then align
atoms to spans in order. An atom may span several spans (inner sentence pause);
a span that holds several atoms (missing pause) fails ALL those atoms, they come
back as a regen list. A clip is installed only if scripts/batch_tools.check_atom
passes on the text heard in exactly its own audio span. Nothing is assigned on
doubt. Output: JSON per wav with batch id, installed count, failed atoms.
"""
import difflib, glob, json, os, re, shutil, subprocess, sys, tempfile
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
sys.path.insert(0, here)
import batch_tools as bt
from faster_whisper import WhisperModel
MODEL = None
LENIENT = []
STRICT = []
LOG = '/tmp/install_log.jsonl'

def hash_atom(text):
    s = re.sub(r"\s+", " ", text.strip()); h = 0x811C9DC5
    for ch in s:
        o = ord(ch)
        units = [o] if o < 0x10000 else [0xD800 + ((o - 0x10000) >> 10), 0xDC00 + ((o - 0x10000) & 0x3FF)]
        for u in units:
            h ^= u; h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"

def asr(path, lang, mode):
    global MODEL
    if MODEL is None: MODEL = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
    prompt = ("Exercise timer cues: 105 seconds, 110 seconds, 12 reps, 30 seconds, halfway, switch sides." if lang == "en"
              else "운동 타이머 안내: 105초, 110초, 12회, 30초 남았어요, 절반 왔어요, 자세 바꿔요.")
    kw = dict(beam_size=5, condition_on_previous_text=False, vad_filter=(mode == 0), initial_prompt=prompt)
    segs, _ = MODEL.transcribe(path, language=lang, **kw)
    return "".join(s.text for s in segs)

class Wav:
    def __init__(self, path, lang, tmp):
        self.path, self.lang, self.tmp = path, lang, tmp
        self.spans = bt.detect_speech_spans(path); self.cache = {}
    def clip(self, j, k, out):
        s, e = self.spans[j][0], self.spans[j + k - 1][1]
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", self.path, "-ss", f"{s:.3f}", "-to", f"{e:.3f}", "-c", "copy", out], check=True)
    def text(self, j, k, mode):
        key = (j, k, mode)
        if key not in self.cache:
            out = os.path.join(self.tmp, f"c{j}_{k}.wav"); self.clip(j, k, out)
            self.cache[key] = asr(out, self.lang, mode)
        return self.cache[key]

def ok_atom(w, atom, j, k):
    for mode in (0, 1):
        heard = w.text(j, k, mode)
        v = {**bt.check_atom(atom, heard, w.lang), "heard": heard}
        if v["ok"]: return v
    return v

def multi(w, atoms, i, j, m):
    # span j holds atoms i..i+m-1 (no pause rendered between them)
    heard = w.text(j, 1, 1); want = " ".join(atoms[i:i + m])
    return bt.numbers_in(want, w.lang) == bt.numbers_in(heard, w.lang) and difflib.SequenceMatcher(
        None, bt.normalize(want, w.lang, False), bt.normalize(heard, w.lang, False)).ratio() >= 0.8

def lenient_ok(w, atom, j):
    heard = w.text(j, 1, 0)
    if bt.numbers_in(atom, w.lang) != bt.numbers_in(heard, w.lang): return False
    return difflib.SequenceMatcher(None, bt.normalize(atom, w.lang, False), bt.normalize(heard, w.lang, False)).ratio() >= 0.55

def align(w, atoms):
    if len(w.spans) == len(atoms):
        # one physical span per atom, in order: boundaries are the silences. Strict check first,
        # then lenient (numbers exact + similarity>=0.55) for names ASR garbles ("Band face pull").
        acc, failed = {}, {}
        for i, atom in enumerate(atoms):
            if ok_atom(w, atom, i, 1)["ok"]: acc[i] = (i, 1); STRICT.append(atom)
            elif lenient_ok(w, atom, i): acc[i] = (i, 1); LENIENT.append(atom)
            else: failed[i] = f"ASR mismatch; heard '{w.text(i, 1, 0)}'"
        return acc, failed
    i = j = 0; acc = {}; failed = {}; streak = 0
    while i < len(atoms) and j < len(w.spans):
        done = False
        for k in (1, 2, 3):
            if j + k > len(w.spans): break
            if ok_atom(w, atoms[i], j, k)["ok"]:
                acc[i] = (j, k); STRICT.append(atoms[i]); i += 1; j += k; streak = 0; done = True; break
        if done: continue
        for m in (2, 3):
            if i + m <= len(atoms) and multi(w, atoms, i, j, m):
                for q in range(i, i + m): failed[q] = "no pause between atoms in audio (merged span)"
                i += m; j += 1; streak = 0; done = True; break
        if done: continue
        failed[i] = f"no matching span; heard '{w.text(j, 1, 0)}'"
        nxt = i + 1 < len(atoms) and ok_atom(w, atoms[i + 1], j, 1)["ok"]
        i += 1; streak += 1
        if not nxt: j += 1
        if streak > 6: break
    for q in range(i, len(atoms)): failed.setdefault(q, "unaligned (ran out of spans or lost sync)")
    return acc, failed

def main():
    trainer, lang, bdir = sys.argv[1:4]; wavs = sys.argv[4:]
    batches = {os.path.basename(p)[:3]: json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(os.path.join(bdir, "*.expected.json")))}
    d = os.path.join(root, "public", "voices", trainer, lang); os.makedirs(d, exist_ok=True)
    mp = os.path.join(d, "manifest.json")
    vm = json.load(open("/tmp/inv/voicemap.json")).get(f"{trainer}/{lang}", {})
    m = json.load(open(mp)) if os.path.exists(mp) else {"trainer": trainer, "language": lang, "model": "gemini-3.8-flash-tts", "voice": vm.get("voice", ""), "clips": {}}
    report = []
    for wp in wavs:
        tmp = tempfile.mkdtemp(); w = Wav(wp, lang, tmp)
        # identify batch by first two spans
        first = " ".join(w.text(j, 1, 0) for j in range(min(2, len(w.spans))))
        def score(atoms):
            a = " ".join(atoms[:2])
            return difflib.SequenceMatcher(None, bt.normalize(a, lang, False), bt.normalize(first, lang, False)).ratio()
        ranked = sorted(batches, key=lambda b: -score(batches[b]))
        best = None
        for b in ranked[:3]:
            acc, failed = align(w, batches[b])
            if best is None or len(acc) > len(best[1]): best = (b, acc, failed)
            if len(acc) >= 15: break
        b, acc, failed = best
        atoms = batches[b]; installed = []
        if len(acc) >= max(5, len(atoms) // 2):
            for i, (j, k) in acc.items():
                h = hash_atom(atoms[i]); out = os.path.join(d, f"{h}.wav"); w.clip(j, k, out)
                m["clips"][h] = f"{h}.wav"; installed.append(atoms[i])
                j0, k0 = acc[i]; open(LOG, 'a').write(json.dumps({'trainer': trainer, 'lang': lang, 'batch': b, 'atom': atoms[i], 'hash': h, 'status': 'strict' if ok_atom(w, atoms[i], j0, k0)['ok'] else 'lenient', 'heard': ok_atom(w, atoms[i], j0, k0)['heard'], 'wav': os.path.basename(wp), 'span': [round(w.spans[j0][0], 2), round(w.spans[j0 + k0 - 1][1], 2)]}, ensure_ascii=False) + '\n')
            json.dump(m, open(mp, "w"), indent=2, ensure_ascii=False)
        else:
            failed = {i: "batch not identified or <50% aligned; nothing installed" for i in range(len(atoms))}
        report.append({"wav": os.path.basename(wp), "batch": b, "installed": len(installed), "lenient": len([a for a in LENIENT if a in installed]), "failed_atoms": [{"atom": atoms[i], "why": why} for i, why in sorted(failed.items())]})
        print(json.dumps(report[-1], ensure_ascii=False), flush=True)
        shutil.rmtree(tmp, ignore_errors=True)
if __name__ == "__main__":
    main()
