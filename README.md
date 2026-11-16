# Physio

Her physio exercises, every day, on GitHub Pages: https://jmlalande.github.io/Physio/ (repo `JmLalande/Physio`). Same base as Loop, stripped to three jobs: time the rests, log the reps, keep her coming back.

## The routine

Four exercises from the physio's handwritten sheet, same order every day, 45 seconds of rest between every set:

| Exercise | Sets | Reps, each side |
|---|---|---|
| Montée de marche | 3 | 10–15 |
| Abduction de hanche, élastique | 3 | 10 |
| Hip thrust unilatéral | 3 | 10–15 |
| Levée du talon | 2 | 15 → 20 |

All of it lives in `program.js`. The cues are the physio's words, kept close to verbatim. No progressions, no weigh-ins, no effort rating.

## The streak

Every day, no rest days, no freezes. A day counts once one set is logged, or when she marks it by hand from the History calendar ("Je l'ai faite sans l'app").

A missed day costs the streak two, never below zero, and never resets it. The count is rebuilt from the first day on every render, never stored. Beside it sit two numbers that never go down: the record and the total days done.

`facts.js` is the reward: a fact a day, in French. `DAYS` is keyed to an exact streak count and talks about a span that matches it. `POOL` fills the other days and the bonus line, `BREAKS` shows after a missed day. Different facts from Loop's bank, since she runs both. Every one has to be true.

Run `node check.js` after touching `program.js` or `facts.js`. It replays calendars through the streak rule and checks the copy's punctuation.

## How a session runs

Five-second lead-in, then each set counts up until she taps. Tapping opens the log (right and left, seeded with last time's numbers) while the 45-second rest counts down behind it. The rest auto-advances: double low beep at ten seconds, four ticks, go tone. Same sounds as Loop.

## Data

IndexedDB, this browser only. Export from Réglages now and then. `DB_NAME`, `CACHE_NAME` and the cache prefix all start with `physio-`, because every app on jmlalande.github.io shares one origin. Import only accepts a Physio export (`app:"physio"`), so a Loop backup can't land here by mistake.

## Deploying

`APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js` bump together, every time. Out of sync means phones keep serving stale files.
