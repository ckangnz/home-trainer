# Workout element reuse candidate, November 16

## What is checked

The workout created a new HTMLAudioElement for every recorded atom, after an
asynchronous manifest read and often from a timer. Start/Resume previously
unlocked Web Audio and device speech but not those individual media elements.
WebKit documents per-element gesture permission and recommends reusing one
source-changing element. This is a plausible independent cause of missing
later cues after unmuting, not a reproduced iPhone diagnosis.

- https://bugs.webkit.org/show_bug.cgi?id=134925 (iOS, 2014)
- https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/ (macOS, 2017)
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

The candidate loads a real existing greeting into a single element during the
Start/Resume handler. It does not play the greeting, an extra sound, a silent
loop, or a hidden media track. Later recorded atoms reuse that same element.

The 42-second real-time desktop-browser check used actual coach, cues and player
machine: prepare 6 seconds, left 8, switch 6, right 8, rest 6, final 8.
The JSON records seven native playing/ended pairs on element 1, Korean device
speech starts for three uncovered work cues, countdown Web Audio context running,
and the finish clip ending at 3.4 seconds. Pixels in the QA screenshot were also
inspected; the screenshot is only a fixture/event display, not audio proof.

Full candidate: 71 files / 1,804 tests passed, typecheck and production-base build
passed (288 prerender routes). An additional old-error/new-handler regression
then passed in the focused suite. No physical iPhone speaker or external music
coexistence check was available. Device speech mixing remains unverified.

## Routing decision

The ambient-mode code was tested locally but held on a separate candidate
branch. It is NOT part of the element-reuse release. Ambient can mix media but
obeys silent mode and does not support background workout audio in the same way.
The user explicitly requires that music must not stop; preserving existing auto
routing is not a guarantee of that requirement. Neither exclusive playback nor
a silent-media-loop workaround is allowed. The mixing/finish incident is OPEN.

- https://bugs.webkit.org/show_bug.cgi?id=252746
- https://bugs.webkit.org/show_bug.cgi?id=264473
- https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type
