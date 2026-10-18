# HomeTrainer

A free, installable 7-minute-workout web app. People open a URL, follow animated exercise guides with a voice coach,
build their own routines with time, reps, sets, and rounds, and share routines with a short code. It runs entirely in
the browser as a PWA and is funded by Google AdSense units on some rest screens.

## Features

- **Animated exercise library** — 72 bodyweight moves (cardio, strength, core, stretching, yoga, warm-up), each with
  an illustrated trainer animation, steps, form tips, and target muscles. Public, pre-rendered pages for every exercise.
- **Trainers** — Maya and Leo, illustrated in workout gear with three skin tones, chosen in Settings. Each has their
  own coaching personality and a matching voice where the device offers one.
- **Curated workouts** — Classic 7-Minute Workout (Klika & Jordan, 2013), HIIT, abs, legs, upper body, beginner,
  stretching, yoga, warm-up, cool-down, and desk break.
- **Routine builder** — routine defaults (work time, rest, rounds, rest between rounds, get-ready countdown, switch-sides
  pause) with per-exercise overrides (time or reps, sets, rest between sets, rest after). One-sided moves run per side.
- **Player** — get-ready countdown, timed exercises that auto-advance, self-paced rep exercises with a Done button,
  rests that preview the next move, a voice coach that introduces itself, cheers you on, reads form tips and calls
  halfway and the last ten seconds (Web Speech), countdown beeps, vibration, screen wake lock, pause, skip, previous,
  +10 s rest, keyboard shortcuts (space, arrows, enter), and a celebration screen with sharing.
- **Share codes** — `HT-XXXX-XXXX` codes and `/r/<code>` links backed by an immutable Firestore snapshot. Recipients
  preview publicly and sign in to add an independent copy. Owners can stop sharing or issue a new code.
- **History and streaks** — completions sync to Firestore and work offline through Firestore's persistent cache.
- **Monetization** — AdSense display units on rest, get-ready, and summary screens plus one on each exercise page
  (see [Ads and AdSense policy](#ads-and-adsense-policy)), and an optional support/donation button.

## Tech stack

TypeScript, React 19, Vite 6, React Router 7, Firebase Auth (Google) + Firestore, `vite-plugin-pwa` (Workbox),
Vitest + Testing Library. The exercise figure is a custom SVG engine in `src/figure` (forward kinematics, two-bone IK,
anchors, keyframe interpolation) with no 3D or animation dependencies.

## Getting started

```bash
npm install
cp env.example .env.local   # then fill in the values below
npm run dev
```

Public pages (landing, exercises, workouts, privacy, terms) work without Firebase. Signing in, routines, the player,
history, and sharing need the Firebase configuration. During development, `/dev/play/workout/classic-7-minute` opens
the player without signing in.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config (client-visible). Sign-in uses a Google popup, so the default `<project>.firebaseapp.com` auth domain works on GitHub Pages. |
| `VITE_ADSENSE_CLIENT` | AdSense publisher ID, `ca-pub-…`. Enables ads and generates `ads.txt` at build time. |
| `VITE_ADSENSE_SLOT_REST` | Ad unit ID for rest, get-ready, and summary screens. |
| `VITE_ADSENSE_SLOT_CONTENT` | Ad unit ID for exercise pages. |
| `VITE_SITE_URL` | Public origin, for example `https://home-trainer-pwa.web.app`. Used for share links, canonical tags, and `sitemap.xml`. |
| `VITE_CONTACT_EMAIL` | Contact address shown on the privacy and terms pages. |
| `VITE_SUPPORT_URL` | Optional donation link (Ko-fi, Buy Me a Coffee, GitHub Sponsors). |
| `VITE_BASE_PATH` | Public base path; the deploy workflow sets `/<repo>/`. Leave `/` locally. |

Without `VITE_ADSENSE_CLIENT`, production builds render no ads and development builds show labeled placeholders.
`VITE_SUPPORT_URL` (an `https://` link) enables the support button. `env.example` lists every variable.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server. |
| `npm test` | Vitest (`npm test -- --run` for a single run). |
| `npm run typecheck` | Strict TypeScript check. |
| `npm run build` | Type-check, client build, SSR build of `src/entry-server.tsx`, then `scripts/prerender.mjs` writes static HTML for every public route plus `robots.txt` and `sitemap.xml`. |
| `npm run preview` | Preview the production build. |
| `npm run figures` | Render contact sheets of every exercise animation to `figure-sheets/` (SVG) for visual review. `CATALOG=core`, `FRAMES=8`, and an id filter argument narrow the output. |

## Deploying (GitHub Pages)

The live site is https://ckangnz.github.io/home-trainer/. `.github/workflows/deploy.yml` type-checks, tests, builds, and
deploys to GitHub Pages on every push to `main` (pull requests build and test only). The build sets
`VITE_BASE_PATH=/<repo>/`, writes static HTML for every public page plus `404.html` (the single-page app fallback that
GitHub Pages serves for `/app/...` and `/r/<code>` links), and generates `sitemap.xml`.

Configure the build in the repository settings:

| Where | Name | Value |
| --- | --- | --- |
| Secrets | `VITE_FIREBASE_*` (six values) | Firebase web config. From a local `.env.local`: `gh secret set -f .env.local` |
| Variables | `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_REST`, `VITE_ADSENSE_SLOT_CONTENT` | AdSense ids (see below) |
| Variables | `VITE_SUPPORT_URL` | Optional Ko-fi / Buy Me a Coffee / GitHub Sponsors link; shows a support button |
| Variables | `VITE_CONTACT_EMAIL`, `VITE_SITE_URL` | Optional; the site URL defaults to the GitHub Pages address |

Firebase stays on the free Spark plan: Google sign-in plus Firestore (routines, history, share codes). Add
`ckangnz.github.io` under Authentication → Settings → Authorized domains, and publish the security rules once with
`npx firebase-tools deploy --only firestore`.

## Ads and AdSense policy

AdSense does not allow web publishers to trigger interstitial or video ads at moments they choose, forbids overlays
and ads next to navigation buttons, and does not allow refreshing ads without a user request. The player therefore:

- shows a standard responsive display unit labeled "Advertisement" on rest, get-ready, and summary screens, below the
  next-exercise preview and instructions and away from the controls;
- never shows ads during an exercise or a switch-sides pause, or on rests shorter than 10 seconds;
- requests a new rest or get-ready ad only when the user's own tap led to that screen (Start, Done, Skip) and at least
  30 seconds after the previous request (`src/ads/policy.ts`). Rests started by the countdown show the same content
  without a new ad. The one-off workout summary shows an ad whenever 30 seconds have passed since the last one.
  Changing `REST_AD_TRIGGER` to `'every-rest'` loads ads on every rest, so confirm that with AdSense first.

Setting up AdSense for this site:

1. Sign up at https://adsense.google.com with your Google account and add the site `ckangnz.github.io`. AdSense only
   accepts a domain without a path, so the account covers this app at `/home-trainer/`.
2. Set the repository variable `VITE_ADSENSE_CLIENT` to your `ca-pub-…` publisher id. The next deploy adds the AdSense
   script and the `google-adsense-account` verification tag to every page.
3. AdSense looks for `ads.txt` and the verification tag at the domain root, which is the `ckangnz.github.io` portfolio
   repository: add `google.com, pub-…, DIRECT, f08c47fec0942fa0` as `ads.txt` there, plus the meta tag and a link to
   this app. A custom domain for this repository avoids that step and gives reviewers the workout content directly.
4. Request review, keep Auto ads off (the manual units are placed to stay clear of controls), and publish a GDPR
   consent message under Privacy & messaging.
5. After approval, create two display ad units and set `VITE_ADSENSE_SLOT_REST` and `VITE_ADSENSE_SLOT_CONTENT`.

The privacy policy at `/privacy` already includes the required advertising-cookie disclosures.

## Adding an exercise

1. Add an entry to the matching file in `src/exercises/catalog/` (ids are permanent: routines and share codes store
   them).
2. Build poses from the base poses and helpers in `src/exercises/kit.ts` (`STAND`, `HIGH_PLANK`, `SUPINE_KNEES`,
   `flat()`, `toes()`, `palm()`, `pose()`, `key()`, `anim()`, `breathe()`). Side view faces right with the figure's left
   side nearest; one-sided moves animate the left side and the player mirrors the second side.
3. Keep planted hands and feet on identical IK targets in consecutive keyframes so they stay put, and add lift
   keyframes for steps and jumps. Joint angles interpolate along the shortest arc, so split rotations of 180° or more
   into intermediate keyframes; a keyframe with `ms: 0` is an instant cut. IK limbs bend noticeably even a few
   millimeters short of full reach, so place straight-limb targets at full length. Front view draws legs behind the
   torso, so seated poses with knees toward the viewer read better in side view.
4. Run `CATALOG=<file> npx vitest run src/exercises/catalog.test.ts` (floor penetration, unreachable contacts, props,
   and content rules) and `CATALOG=<file> npm run figures` to review the contact sheet.

## Project layout

```
src/
  figure/     2D figure engine, renderer, tests
  exercises/  exercise catalog (one file per category), authoring kit, catalog invariants test
  workouts/   routine model, playback-step expansion, curated workouts
  player/     player state machine, coach cues, speech/beeps, wake lock, player page
  ads/        AdSense unit and request policy
  data/       Firebase client, auth, Firestore repository, validators, data provider
  sharing/    share codes, share dialog, import and preview pages
  history/    streak calculations
  pages/      public and signed-in pages
  app/        shell, routes, providers, page meta, icons
```

## Firestore rules

`firestore.rules` restricts `users/{uid}/routines` and `users/{uid}/completions` to their owner with basic shape
checks. `shares/{code}` documents are publicly readable by exact code (no listing), creatable only by a signed-in owner
with a valid code and payload, immutable, and deletable only by their owner.
