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
   re-run to continue), `--delay-ms=N` (default 4000), `--dry-run`.
3. Commit `public/voices/`.

The script is resumable: it only generates clips missing from the manifest.
On HTTP 429 (free-tier daily/minute limits) it backs off and retries; if the
day's quota runs out, re-run tomorrow — nothing is lost.

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

## Decisions still open (need the app owner)

- Dialect (사투리) mapping for all seven trainers. Marcus's Korean pack tries a
  restrained Gyeongsang intonation via the style prompt; whether to keep it and
  what the other six get is the owner's call after auditions. Dialect wording
  in the lines themselves lives in the segment/phrase banks.
- Exercise-name audio: this prototype splices a fixed lead-in clip plus the
  name clip (`다음은` + `스쿼트`). The seam is audible but small; the
  alternative (one full sentence per exercise per trainer) multiplies the
  generation count by ~227 and is deliberately not the default.
- Tips (`tipOf`) and other long dynamic text stay on speechSynthesis for now;
  they are per-exercise fixed text and could be pre-generated later.
- English regional accents per character: currently standard American for all;
  remap in `voices.config.mjs` if wanted.

## Extending to the remaining trainers

1. Pick a prebuilt voice (audition first) and style in `voices.config.mjs`.
2. Write the trainer's segment bank in `src/player/cueSegments.ts` mirroring
   their phrase bank in `cues.ts`/`cues.ko.ts` (keep variant counts aligned —
   the same seed picks the variant).
3. Run the generator for that trainer and commit.
