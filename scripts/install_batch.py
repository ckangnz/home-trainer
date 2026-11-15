#!/usr/bin/env python3
"""Install a speak-generated batch WAV into a voice pack (fails closed).

  python3 scripts/install_batch.py <trainer> <lang> <batch.wav> <expected.json> [--skip "atom text" ...]

Splits at <long pause> silences (atoms with inner sentence breaks span several
spans), ASR-checks every segment (scripts/batch_tools.py), copies only passing
segments to public/voices/<trainer>/<lang>/<hash>.wav and updates manifest.json.
Prints failed atoms as JSON for exact regeneration. Never assigns on mismatch.
"""
import json, os, re, shutil, subprocess, sys, tempfile
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)

def hash_atom(text):
    s = re.sub(r"\s+", " ", text.strip())
    h = 0x811C9DC5
    for ch in s:
        for u in ch.encode("utf-16-le")[::2] if False else [ord(ch)] if ord(ch) < 0x10000 else [0xD800 + ((ord(ch) - 0x10000) >> 10), 0xDC00 + ((ord(ch) - 0x10000) & 0x3FF)]:
            h ^= u
            h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"

def main():
    a = sys.argv[1:]
    trainer, lang, wav, exp = a[:4]
    skip = set(a[a.index("--skip") + 1:]) if "--skip" in a else set()
    atoms = json.load(open(exp, encoding="utf-8"))
    tmp = tempfile.mkdtemp()
    r = subprocess.run(["python3", os.path.join(here, "batch_tools.py"), "split", wav, exp, tmp], capture_output=True, text=True)
    info = json.loads(r.stdout)
    if not info.get("ok"):
        print(json.dumps({"ok": False, "split": info, "failed": atoms})); sys.exit(4)
    json.dump(atoms, open(os.path.join(tmp, "expected.json"), "w"), ensure_ascii=False)
    r = subprocess.run(["python3", os.path.join(here, "batch_tools.py"), "asr", lang, os.path.join(tmp, "expected.json"), tmp], capture_output=True, text=True)
    checks = json.loads(r.stdout[r.stdout.index("["):])
    d = os.path.join(root, "public", "voices", trainer, lang)
    mp = os.path.join(d, "manifest.json")
    os.makedirs(d, exist_ok=True)
    if os.path.exists(mp):
        m = json.load(open(mp))
    else:
        cfg = json.loads(subprocess.run(["node", "-e", "import('./voices.config.mjs').then(m=>console.log(JSON.stringify(m))))"], capture_output=True, text=True, cwd=root).stdout or "{}") if False else {}
        m = {"trainer": trainer, "language": lang, "model": "gemini-3.8-flash-tts", "voice": os.environ.get("VOICE", ""), "clips": {}}
    ok, failed = [], []
    for i, atom in enumerate(atoms):
        c = checks[i]
        if atom in skip:
            continue
        if not c.get("ok"):
            failed.append({"atom": atom, "heard": c.get("heard"), "reasons": c.get("reasons")}); continue
        h = hash_atom(atom)
        shutil.copy(os.path.join(tmp, f"seg-{i:03d}.wav"), os.path.join(d, f"{h}.wav"))
        m["clips"][h] = f"{h}.wav"; ok.append(atom)
    json.dump(m, open(mp, "w"), indent=2, ensure_ascii=False)
    print(json.dumps({"ok": True, "installed": len(ok), "failed": failed, "skipped": sorted(skip)}, ensure_ascii=False))
    shutil.rmtree(tmp, ignore_errors=True)
main()
