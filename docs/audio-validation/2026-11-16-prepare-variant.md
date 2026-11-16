# Recorded prepare variant, November 16 22:14 NZDT

The user's phone video shows reverse-dumbbell-arm-circles,20reps,round1/4,
3items. Audio contains the exercise announcement, Nina's exact encouragement
'자세 좋게, 시작!', and a form tip, but no prepare speech. The figure also
matches Nina while the pre-Start bubble names Maya. This is consistent with
Random selection at Start, but settings themselves are not shown. Do not claim
Random was independently confirmed or that the user identified a wrong trainer.

First-run Nina prepare selects an uncovered personalized intro atom. The old
all-or-nothing coverage check therefore requests device speech, even though
another same-trainer recorded intro variant and this exercise-name clip exist.
The user suggests the phone may have been muted. That is plausible, not proven
as the cause of device-speech silence. The earlier fourfold repetition now seems
gone according to the user, not a full device regression suite.

Change: prepare cues may offer other same-trainer intro variants. Choose the
first completely covered variant before any media begins. If none exists, keep
original fallback. Do not retry alternatives after partial playback. Completed
atom progress includes selected atoms, preserving remainder-only fallback.

Real desktop browser check of exact exercise+Nina first-run prepare emitted
playing/ended for the existing intro350fe36e and name99d3ac09, no audible device
speech request. This is playback-path evidence, not physical iPhone proof.

Mute policy unchanged: Voice coach=false skips all announcements, including
recorded alternatives. No volume, audioSession, silent-switch, unlock or music
routing change. Existing recorded-media platform behavior is preserved, not a
new mute bypass. No assets generated or replaced;206 inventory gaps remain.

Validation:74files/1,815tests passed; an added mute regression then passed within
13 focused tests. Typecheck and production-base build passed,288 routes. Earlier
anti-repeat tests remain passing. The Random pre-Start UI wording is outside
this narrow audio-path release.
