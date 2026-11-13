# Coach voice packs

Natural per-trainer coaching voices, generated ahead of time with Gemini TTS
and shipped as static files. No server, no runtime API calls, no cost to app
users.

Status: **prototype** covering Maya and Marcus (the two auditioned characters),
Korean and English. Other trainers keep the old browser speechSynthesis voice
until their segment banks and voices are added.

## How it works

- `src/player/cues.ts` builds each spoken announcement and, for trainers with a
  segment bank, also a list of **atoms** — short strings that each map to one
  pre-generated clip (`announcementAtoms`).
- `src/player/cueSegments.ts` holds the segment banks: the fixed parts of
  intros, rests, last-exercise and round announcements, plus enumerations for
  target phrases (`30초`, `10 reps`), set phrases, sides and round numbers.
- `src/player/voicepack.ts` looks each atom up in the pack's `manifest.json`
  (hashed with `src/player/voicehash.ts`) and plays the clips in order. If any
  atom is missing, the whole announcement falls back to the browser's
  speechSynthesis voice — degraded, but never silent.
- Clips live in `public/voices/<trainer>/<language>/` and deploy with the
  static site.

Exercise names are atoms too, so **adding an exercise only needs 2 new clips
per trainer per language** (the name) — run the generator and commit.

## Generating clips

1. Create a free Google AI Studio API key (no card/billing) and export it:
   `export GEMINI_API_KEY=...` (see `env.example`; never commit the value).
2. Generate one pack:

   ```sh
   npm run voices -- --trainer=female --lang=ko
   ```

   Flags: `--trainer=all`, `--lang=all`, `--limit=N` (stop after N clips;
   re-run to continue), `--delay-ms=N` (default 4000), `--dry-run`,
   `--atoms-file=path` (only the listed atoms), `--batch-size=N` (batch mode).
3. Commit `public/voices/`.

The script is resumable: it only generates clips missing from the manifest.
On HTTP 429 (free-tier daily/minute limits) it backs off and retries; if the
day's quota runs out, re-run tomorrow — nothing is lost.

### Free-tier quota and batch mode

Observed on the free tier (verify against your own key's response headers):
~3 requests/minute and 10 requests/day for this model; the daily counter
resets at midnight US Pacific. One request per atom makes a full pack take
weeks, so batch mode exists: `--batch-size=N` joins N atoms in ONE request,
separated by the API's official `<long pause>` inline tag, then splits the
returned WAV at the rendered silences and ASR-verifies every segment before
assigning it to an atom.

Batch mode is fail-closed by design — the pause tags are hints the model
usually honours, not guaranteed boundaries:

- If the segment count differs from the atom count (omitted pause, natural
  intra-sentence silence, merged phrase), nothing is assigned; the batch WAV
  and a `*.review.json` stay under `public/voices/<trainer>/<lang>/.batches/`
  (gitignored) for manual review.
- Each segment is transcribed locally (`scripts/batch_tools.py asr`,
  faster-whisper "small") and fuzzy-matched against the expected atom
  (digit/word number forms normalized); mismatches stay missing and are
  logged for review. Audio is never silently assigned to the wrong atom.
- Every assigned clip is traceable via the `*.map.json` mapping next to the
  batch original.

Batch mode needs `ffmpeg` and `pip install faster-whisper` locally. Because a
batch mixes atoms in one request, only batch atoms that share the same
trainer, language and style (the script always batches within one pack).

The **Generate coach voice clips** GitHub workflow does the same thing
manually-triggered, using a `GEMINI_API_KEY` repo secret, and commits the
result. Public-repo Actions minutes are free.

## Voices and styles

`voices.config.mjs` defines the model (`gemini-3.8-flash-tts`), each trainer's
prebuilt voice, per-language style prompt, and dialect direction. Maya
(Laomedeia) and Marcus (Alnilam) were auditioned on 2026-11-13; the other five
are draft picks from the official prebuilt list and need an audition before
bulk generation. Audition without code: <https://aistudio.google.com/generate-speech>.

Model/API reference: <https://ai.google.dev/gemini-api/docs/speech-generation>.
Generated content may be used in the app (Google claims no ownership of
generated content; see <https://ai.google.dev/gemini-api/terms>). The free tier
lets Google use submitted content to improve its products — only the coaching
lines in this repo are sent, never user data.

## Accent and dialect mapping

Direction approved by the app owner on 2026-11-13: English gets a regional
accent per character (US/UK/AU …) and Korean gets a regional dialect (사투리)
per character. The current mapping lives in `voices.config.mjs` (`accent` per
trainer) and is a proposal: Maya (US / 표준어) and Marcus (US / 경상) are
auditioned; Leo (UK / 충청), Sofia (AU / 전라), Zara (US / 표준 반말),
Kai (AU / 강원), Nina (UK / 표준) are proposed and need auditions. 제주 and
North Korean dialects are deliberately unused (caricature/oddity risk).
Dialect/accent realism from style prompting is not guaranteed — audition every
character before bulk generation, and write dialect wording into the segment
banks themselves (style prompts steer intonation, not vocabulary).

## Decisions still open (need the app owner)

- Exercise-name audio: this prototype splices a fixed lead-in clip plus the
  name clip (`다음은` + `스쿼트`). The seam is audible but small; the
  alternative (one full sentence per exercise per trainer) multiplies the
  generation count by ~227 and is deliberately not the default.
- Tips (`tipOf`) and other long dynamic text stay on speechSynthesis for now;
  they are per-exercise fixed text and could be pre-generated later.

## Extending to the remaining trainers

1. Pick a prebuilt voice (audition first) and style in `voices.config.mjs`.
2. Write the trainer's segment bank in `src/player/cueSegments.ts` mirroring
   their phrase bank in `cues.ts`/`cues.ko.ts` (keep variant counts aligned —
   the same seed picks the variant).
3. Run the generator for that trainer and commit.
