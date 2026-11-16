/* Run with `node check.js` after touching program.js or facts.js.

   The streak rule is the whole point of the app and it breaks quietly, so
   these replay real calendars through it. Then the fact bank and the copy get
   the punctuation check: no em dash, no en dash outside a number range. */
"use strict";
const fs = require("fs");
const load = (f, names) => new Function(fs.readFileSync(__dirname + "/" + f, "utf8") + "\nreturn {" + names + "};")();
const { streakState, buildPhases, ROUTINE, M, REST } = load("program.js", "streakState, buildPhases, ROUTINE, M, REST");
const { DAYS, POOL, BREAKS } = load("facts.js", "DAYS, POOL, BREAKS");

const fail = [];
const eq = (what, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(what + ": got " + JSON.stringify(got) + ", want " + JSON.stringify(want)); };

/* Build a calendar from a string, one char per day starting 2026-01-01:
   x = done, . = missed, m = marked by hand. */
function cal(pattern){
  const s = {}, d = new Date("2026-01-01T12:00:00");
  for (const c of pattern){
    const k = d.toISOString().slice(0, 10);
    if (c === "x") s[k] = { date: k, sets: [{ m: "stepup", set: 1, side: "R", reps: 10 }] };
    if (c === "m") s[k] = { date: k, manual: true, sets: [] };
    d.setDate(d.getDate() + 1);
  }
  return { s, today: d.toISOString().slice(0, 10), last: new Date(d - 864e5).toISOString().slice(0, 10) };
}
const run = p => { const c = cal(p); return streakState(c.s, c.today).n; };
const runOn = p => { const c = cal(p); return streakState(c.s, c.last); };

eq("nothing yet", run(""), 0);
eq("ten days in a row", run("xxxxxxxxxx"), 10);
eq("one miss costs two", run("xxxxxxxxxx.x"), 9);
eq("two misses cost four", run("xxxxxxxxxx..x"), 7);
eq("never below zero", run("xx.....x"), 1);
eq("a manual day counts", run("xxmxx"), 5);
eq("days before the first one are not missed", run("....xxx"), 3);
eq("today is not missed until it is over", runOn("xxxxx.").n, 5);
eq("an empty session counts as missed", (() => { const c = cal("xxx"); c.s["2026-01-02"].sets = []; return streakState(c.s, c.today).n; })(), 1);
const b = runOn("xxxxxxxxxx...x".slice(0, 13) + ".");
eq("open break reports its cost", [b.n, b.broke && b.broke.cost, b.best], [4, 6, 10]);
eq("best survives a break", runOn("xxxxxxxxxx..xx").best, 10);
eq("a session closes the break", runOn("xxxxx..x").broke, null);

/* The routine the sheet asks for: 3, 3, 3, 2 sets, 45 s between every set. */
const ph = buildPhases();
eq("set counts", ROUTINE.map(b => b.sets), [3, 3, 3, 2]);
eq("work phases", ph.filter(p => p.type === "work").length, 11);
eq("rests", ph.filter(p => p.type === "rest").map(p => p.dur), Array(10).fill(REST));
eq("rest length", REST, 45);
eq("ends on work", ph[ph.length - 1].type, "work");

/* What she reads. */
const text = [...Object.values(DAYS), ...POOL, ...BREAKS, ...Object.values(M).flatMap(m => m.cue)];
text.forEach(t => { if (/—/.test(t)) fail.push("em dash: " + t.slice(0, 50)); });
text.forEach(t => { if (/–/.test(t.replace(/\d–\d/g, ""))) fail.push("en dash outside a range: " + t.slice(0, 50)); });
Object.keys(DAYS).forEach(k => { if (!/^\d+$/.test(k)) fail.push("DAYS key not a number: " + k); });
eq("no duplicate facts", new Set(text).size, text.length);

const total = ph.reduce((a, p) => a + p.dur, 0);
console.log("routine: " + ph.filter(p => p.type === "work").length + " sets, about " + Math.round(total / 60) + " min");
console.log("facts: " + Object.keys(DAYS).length + " keyed days, " + POOL.length + " in the pool, " + BREAKS.length + " after a break");
if (fail.length){ console.log("\nFAIL\n- " + fail.join("\n- ")); process.exit(1); }
console.log("ok");
