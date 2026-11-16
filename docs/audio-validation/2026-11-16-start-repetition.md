# Start repetition investigation, November 16 21:35 NZDT

Report: exercise name read about four times at workout start. Exact trainer and
exercise were not yet supplied at this checkpoint. Do not label the full device
report reproduced or solved.

Actual-browser baseline using coach/cues/machine and Korean Maya squat:
10-second prepare followed by 30-second work produced two name requests total,
once in introduction and once at work entry, with normal recorded playing
and ended events. No fourfold event or fallback replay was reproduced there.
Common name/duration/go files were separately machine-transcribed as squat,
30 seconds, and encouragement; this is not a listening signoff.

One concrete duplicate path WAS reproduced by an integration test: name atom
ends, a later duration atom errors, then the old coach falls back to the entire
announcement and says the already-completed exercise name again. The fix tracks
completed atoms and uses only the failed/remainder atoms for fallback. If none
completed, preserve original full fallback text. Cancellation still suppresses
late speech. No normal cue wording, voice assets or routing changed.

Real browser controlled-failure verification after fix: one actual recorded
squat playing/ended pair; intentional duration play rejection; actual device
speech start/end for only '30초, 할 수 있어요!'. The attached JSON files contain
these events. This proves the narrow repaired path, not the phone's exact four
repeats. No new recordings generated. Remaining voice-quality production stop
is unchanged.

Validation: 73 test files / 1,810 tests passed, typecheck passed. Production-base
build passed with 288 prerendered routes.
