/* The routine and the streak rule. Edit here, everything else follows. ----- */
"use strict";

/* The four exercises from her physio's sheet, in the order she does them, every
   day. The cues are the physio's own words, kept close to verbatim on purpose:
   she was shown what they mean in the clinic, and a rewrite could drift from it.

   `work` is the estimated seconds a set takes, both sides included. It only
   feeds the projected end time, the set itself never times out. `def` seeds the
   rep counter the first time, after that it starts at what she did last time. */
const M = {
  stepup: {name:"Montée de marche",       reps:"10–15",   lo:10, hi:15, def:10, work:80,
           cue:["Garde le genou droit.","Replace la hanche.","Force avec la fesse en montant."]},
  abd:    {name:"Abduction de hanche",    reps:"10",      lo:10, hi:10, def:10, work:50, load:"élastique",
           cue:["Les deux pieds dans le loop.","Petit mouvement, sans creuser le dos.","Le pied à 45°."]},
  thrust: {name:"Hip thrust unilatéral",  reps:"10–15",   lo:10, hi:15, def:10, work:75,
           cue:["Au sol.","Éloigne le talon, progressivement."]},
  calf:   {name:"Levée du talon",         reps:"15 → 20", lo:15, hi:20, def:15, work:60,
           cue:["Le genou barré.","Tu peux te tenir, c'est pas un exercice d'équilibre."]}
};

/* Every exercise is done on both sides, so every set is logged as two numbers. */
const SIDES = [{k:"R",lbl:"Droite"},{k:"L",lbl:"Gauche"}];

/* 45 seconds between every set, and between exercises too. */
const REST = 45;
const ROUTINE = [
  {m:"stepup", sets:3},
  {m:"abd",    sets:3},
  {m:"thrust", sets:3},
  {m:"calf",   sets:2}
];

function buildPhases(){
  const ph = [];
  ROUTINE.forEach((b, bi) => {
    const m = M[b.m];
    for(let s = 1; s <= b.sets; s++){
      const base = {m:b.m, bi, set:s, sets:b.sets, reps:m.reps, def:m.def};
      ph.push(Object.assign({type:"work", dur:m.work}, base));
      const last = bi === ROUTINE.length - 1 && s === b.sets;
      if(!last) ph.push(Object.assign({type:"rest", dur:REST}, base));
    }
  });
  return ph;
}

/* ---------------------------------------------------------------- streak
   Every day, no rest days, no freezes. A day counts as soon as one set is
   logged, or when she marks a day she did without the app.

   A missed day costs two, never below zero, and never resets the count.
   Back to zero after twenty days is a reason to quit; eighteen is a reason to
   come back tomorrow. The number is rebuilt from the first day forward every
   time, never stored, so it cannot drift: a done day adds one, each missed day
   takes two. Today is not missed until it is over.

   `broke` is the break still open and what it has cost, so the home screen
   can say so until the next session. `best` is the highest the count has
   ever been, which a break never takes away. */
const BREAK_COST = 2;
const counts = s => !!(s && (s.manual || (s.sets && s.sets.length >= 1)));

function isoOf(d){
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function streakState(sessions, today){
  const first = Object.keys(sessions).filter(k => counts(sessions[k])).sort()[0];
  let n = 0, best = 0, breaks = 0, broke = null;
  if(!first) return {n, best, breaks, broke};
  for(let d = new Date(first + "T12:00:00"), k = first; k <= today; d.setDate(d.getDate()+1), k = isoOf(d)){
    if(counts(sessions[k])){ n++; broke = null; }
    else if(k < today){
      if(!broke){ broke = {from:n}; breaks++; }
      n = Math.max(0, n - BREAK_COST);
    }
    best = Math.max(best, n);
  }
  if(broke) broke.cost = broke.from - n;
  return {n, best, breaks, broke};
}
