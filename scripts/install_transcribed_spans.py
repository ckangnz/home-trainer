#!/usr/bin/env python3
"""Install independently transcribed WAV speech spans by exact inventory match.

Input JSON: {trainer, language, wav, inventory, spans:[{start,end,heard}]}
Inventory JSON: {atoms:[{atom,hash}]} from the current application inventory.
Run with --dry-run first. Transcripts must describe the supplied audio, not be
copied from expected text. This validates text/identity, not accent or delivery.
Uncertain words, numbers and boundaries stay out. Existing clips are untouched.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import batch_tools as bt


def atom_hash(text):
    h = 0x811C9DC5
    text = re.sub(r'\s+', ' ', text.strip())
    raw = text.encode('utf-16-le')
    for i in range(0, len(raw), 2):
        h = ((h ^ int.from_bytes(raw[i:i + 2], 'little')) * 0x01000193) & 0xffffffff
    return f'{h:08x}'


def exact_matches(atoms, spans, language):
    canon = {}
    for a in atoms:
        assert atom_hash(a['atom']) == a['hash'], 'inventory hash mismatch'
        canon.setdefault(bt.normalize(bt.canon_roman(a['atom'], language), language, True), []).append(a)
    matches = []
    for j in range(len(spans)):
        for k in range(1, 6):
            group = spans[j:j + k]
            if len(group) != k or any(not x['heard'].strip() for x in group):
                continue
            heard = ' '.join(x['heard'] for x in group)
            key = bt.normalize(bt.canon_roman(heard, language), language, True)
            candidates = canon.get(key, [])
            if len(candidates) == 1 and bt.check_atom(candidates[0]['atom'], heard, language)['ok']:
                matches.append((j, k, candidates[0], heard))
    return [m for m in matches if not any(
        (n[0], n[1]) != (m[0], m[1]) and
        set(range(m[0], m[0] + m[1])) & set(range(n[0], n[0] + n[1]))
        for n in matches)]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('input', type=Path)
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    p.add_argument('--evidence', type=Path, required=True)
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()
    data = json.loads(args.input.read_text())
    trainer, language = data['trainer'], data['language']
    if trainer not in ['female', 'marcus', 'sofia', 'male', 'zara', 'kai', 'nina'] or language not in ['en', 'ko']:
        raise ValueError('unknown trainer or language')
    spans = data['spans']
    assert all(0 <= x['start'] < x['end'] for x in spans)
    assert all(a['end'] <= b['start'] for a, b in zip(spans, spans[1:])), 'overlapping input spans'
    atoms = json.loads(Path(data['inventory']).read_text())['atoms']
    dest = args.root / 'public' / 'voices' / trainer / language
    mp = dest / 'manifest.json'
    manifest = json.loads(mp.read_text())
    evidence = []
    for j, k, atom, heard in exact_matches(atoms, spans, language):
        h = atom['hash']
        if h in manifest['clips']:
            continue
        start, end = spans[j]['start'], spans[j + k - 1]['end']
        item = dict(trainer=trainer, language=language, atom=atom['atom'], hash=h,
                    heard=heard, span=[start, end], method='independent exact ASR; not listened')
        if not args.dry_run:
            dest.mkdir(parents=True, exist_ok=True)
            out = dest / (h + '.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', data['wav'], '-ss', str(start),
                            '-to', str(end), '-c', 'copy', str(out)], check=True)
            item['sha256'] = hashlib.sha256(out.read_bytes()).hexdigest()
            manifest['clips'][h] = out.name
        evidence.append(item)
    if not args.dry_run:
        tmp = mp.with_suffix('.json.tmp')
        tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        os.replace(tmp, mp)
    # Never overwrite an existing evidence record with an empty repeat run.
    prior = json.loads(args.evidence.read_text()) if args.evidence.exists() else []
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(prior + evidence, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'dry_run': args.dry_run, 'new_candidates': len(evidence)}))


if __name__ == '__main__':
    main()
