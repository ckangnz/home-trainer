# Coach voice packs

Natural per-trainer coaching voices, generated ahead of time with Gemini TTS
and shipped as static files. No server, no runtime API calls, no cost to app
users.

Status: **prototype** covering Maya, Marcus and Sofia (the three auditioned
characters), Korean and English. Other trainers keep the old browser
speechSynthesis voice until their segment banks and voices are added.

## How it works

- `src/player/cues.ts` builds each spoken announcement and, for trainers with a
  segment bank, also a list of **atoms** — short strings that each map to one
  pre-generated clip (`announcementAtoms`). The per-exercise form tip is one
  atom too, so tips play in the trainer voice once generated.
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

If the configured voice or model changes, existing clips are stale: the
generator detects the mismatch from `manifest.json`, logs it, and regenerates
every atom (hashes depend on the atom text, so stale WAVs are overwritten in
place).

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
(Zephyr), Marcus (Fenrir) and Sofia (Autonoe) were auditioned and accepted by
the app owner on 2026-11-14 (distinct base voices, energetic workout
delivery, EN+KO); the other four are draft picks from the official prebuilt
list and need an audition before bulk generation. Audition without code: <https://aistudio.google.com/generate-speech>.

Model/API reference: <https://ai.google.dev/gemini-api/docs/speech-generation>.
Generated content may be used in the app (Google claims no ownership of
generated content; see <https://ai.google.dev/gemini-api/terms>). The free tier
lets Google use submitted content to improve its products — only the coaching
lines in this repo are sent, never user data.

## Accent and dialect mapping

Direction approved by the app owner on 2026-11-13: English gets a regional
accent per character (US/UK/AU …) and Korean gets a regional dialect (사투리)
per character. The current mapping lives in `voices.config.mjs` (`accent` per
trainer) and is a proposal: Maya (US / 표준어), Marcus (US / 경상) and Sofia
(AU / 전라) are auditioned; Leo (UK / 충청), Zara (US / 표준 반말),
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

## Extending to the remaining trainers

1. Pick a prebuilt voice (audition first) and style in `voices.config.mjs`.
2. Write the trainer's segment bank in `src/player/cueSegments.ts` mirroring
   their phrase bank in `cues.ts`/`cues.ko.ts` (keep variant counts aligned —
   the same seed picks the variant).
3. Run the generator for that trainer and commit.


## Independently transcribed span recovery

When short-clip recognition loses words, keep the original WAV and obtain a
separate transcript for each isolated speech span. `scripts/install_transcribed_spans.py`
can recover only unique exact inventory matches (including exact numeric values
and units), rejects overlapping candidates, and never overwrites accepted clips.
Run its `--help`, prepare the documented input JSON, and use `--dry-run` first.
Keep evidence JSON with the atom text, actual heard text, time span, method and
clip hash. A transcript is machine evidence, not a listening or accent-quality
check. Do not copy the expected text into a transcript field. Ambiguous names,
merged atoms and wrong or uncertain counts must remain on device-voice fallback.
Any individually reviewed spelling/transliteration exception needs separate
explicit evidence; do not add blanket homophone or edit-distance acceptance.


## Context recognition and remaining fidelity limits (2026-11-16)

The seven English inventories now have 595 expected atoms each. This is file
coverage with machine evidence, not a claim of full listening, accent quality,
or natural joins. Korean still has missing atoms and uses device voice fallback.

Some clips fail isolated recognition but pass independent full-source recognition.
Those recoveries keep the full transcript and timing evidence. Two boundary
methods are recorded separately: word timestamps aligned to complete detected
speech spans, and exact unique neighboring speech-span anchors bracketing an
exact inventory cue. Source start/end can replace a neighbor only at the edge.
The app cue must still match exactly after documented number/spacing rules;
neighbor matching does not authorize fuzzy cue matching. Carrier sentences in
the contextual pilot are excluded from the installed clip.

Repeated pronunciation-directed pilots did not reliably fix Korean exercise
loanwords or body-part contrasts. A failed transcript is not proof that the audio
is wrong, but is not sufficient evidence to install it either. Keep these cues on
fallback until stronger phonetic/listening evidence or a genuinely different
recording approach is available. Do not repeatedly regenerate identical prompts
or silently accept a different exercise, count, unit, body part or instruction.

## Character-selection greeting preview

Settings plays a dedicated `voices/<trainer>/<language>/greeting.wav` when a
trainer is selected or the replay button is pressed. All seven trainers have
English and Korean greetings using their existing saved voice/style. The preview
is an explicit sound test, independent of the workout Voice coach toggle. It does
not autoplay on page load, change the workout voice preference, or fall back to a
different device voice if the character greeting cannot play. A failure is shown
with a retry prompt. Switching characters, stopping, changing language or leaving
settings cancels the old preview and ignores stale callbacks.

Greeting transcription evidence is in `docs/voice-validation/2026-11-16-greetings.json`.
The fourteen greetings are separate assets and do not change expected workout-atom
coverage. The 206 unresolved Korean workout cues remain on device fallback.
