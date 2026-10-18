# HomeTrainer

A free, installable 7-minute-workout web app. People open a URL, follow animated exercise guides with a voice coach,
build their own routines with time, reps, sets, and rounds, and share routines with a short code. It runs entirely in
the browser as a PWA and is funded by Google AdSense units on some rest screens.

## Features

- **Animated exercise library** — ~70 bodyweight moves (cardio, strength, core, stretching, yoga, warm-up), each with
  a looping 2D animation, steps, form tips, and target muscles. Public, pre-rendered pages for every exercise.
- **Curated workouts** — Classic 7-Minute Workout (Klika & Jordan, 2013), HIIT, abs, legs, upper body, beginner,
  stretching, yoga, warm-up, cool-down, and desk break.
- **Routine builder** — routine defaults (work time, rest, rounds, rest between rounds, get-ready countdown, switch-sides
  pause) with per-exercise overrides (time or reps, sets, rest between sets, rest after). One-sided moves run per side.
- **Player** — get-ready countdown, timed exercises that auto-advance, self-paced rep exercises with a Done button,
  rests that preview the next move, voice coach (Web Speech), countdown beeps, vibration, screen wake lock, pause,
  skip, previous, +10 s rest, keyboard shortcuts (space, arrows, enter).
- **Share codes** — `HT-XXXX-XXXX` codes and `/r/<code>` links backed by an immutable Firestore snapshot. Recipients
  preview publicly and sign in to add an independent copy. Owners can stop sharing or issue a new code.
- **History and streaks** — completions sync to Firestore and work offline through Firestore's persistent cache.
- **Ads** — AdSense display units on rest, get-ready, and summary screens, plus one unit on each exercise page. See
  [Ads and AdSense policy](#ads-and-adsense-policy).

## Tech stack

TypeScript, React 19, Vite 6, React Router 7, Firebase Auth (Google) + Firestore, `vite-plugin-pwa` (Workbox),
Vitest + Testing Library. The exercise figure is a custom SVG engine in `src/figure` (forward kinematics, two-bone IK,
anchors, keyframe interpolation) with no 3D or animation dependencies.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Public pages (landing, exercises, workouts, privacy, terms) work without Firebase. Signing in, routines, the player,
history, and sharing need the Firebase configuration. During development, `/dev/play/workout/classic-7-minute` opens
the player without signing in.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config (client-visible). Set `VITE_FIREBASE_AUTH_DOMAIN` to your hosting domain (for example `home-trainer-pwa.web.app` or your custom domain) so redirect sign-in works in installed PWAs. |
| `VITE_ADSENSE_CLIENT` | AdSense publisher ID, `ca-pub-…`. Enables ads and generates `ads.txt` at build time. |
| `VITE_ADSENSE_SLOT_REST` | Ad unit ID for rest, get-ready, and summary screens. |
| `VITE_ADSENSE_SLOT_CONTENT` | Ad unit ID for exercise pages. |
| `VITE_SITE_URL` | Public origin, for example `https://home-trainer-pwa.web.app`. Used for share links, canonical tags, and `sitemap.xml`. |
| `VITE_CONTACT_EMAIL` | Contact address shown on the privacy and terms pages. |

Without `VITE_ADSENSE_CLIENT`, production builds render no ads and development builds show labeled placeholders.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server. |
| `npm test` | Vitest (`npm test -- --run` for a single run). |
| `npm run typecheck` | Strict TypeScript check. |
| `npm run build` | Type-check, client build, SSR build of `src/entry-server.tsx`, then `scripts/prerender.mjs` writes static HTML for every public route plus `robots.txt` and `sitemap.xml`. |
| `npm run preview` | Preview the production build. |
| `npm run figures` | Render contact sheets of every exercise animation to `figure-sheets/` (SVG) for visual review. `CATALOG=core`, `FRAMES=8`, and an id filter argument narrow the output. |

## Deploying to Firebase Hosting

AdSense only approves sites at a domain root, so the app is hosted on Firebase Hosting rather than a GitHub Pages
project path.

1. `npm run build`
2. `npx firebase-tools deploy --only hosting,firestore` (project `home-trainer-pwa` from `.firebaserc`).
3. In the Firebase console, add your hosting domain (and any custom domain) under Authentication → Settings →
   Authorized domains.

`firebase.json` serves pre-rendered pages directly, rewrites other routes to `app-shell.html`, and sets cache headers.
`.github/workflows/ci.yml` type-checks, tests, and builds on every push and pull request, and deploys `main` to
Firebase Hosting only when the `FIREBASE_SERVICE_ACCOUNT` secret is configured.

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

Before applying for AdSense: deploy to a domain root, set `VITE_SITE_URL` and `VITE_CONTACT_EMAIL`, and configure the
Google-certified consent message under Privacy & messaging for EEA, UK, and Swiss visitors. The privacy policy at
`/privacy` already includes the required advertising-cookie disclosures.

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
