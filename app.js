"use strict";
/* ---------------------------------------------------------------- storage */
/* Every app on jmlalande.github.io shares one origin, so IndexedDB and the
   Cache API are shared across Reps, Loop and this one. Every name here carries
   the `physio-` prefix and must never collide with theirs. */
const DB_NAME="physio-tracker", DB_VER=1;
let db=null;
function open(){return new Promise((res,rej)=>{
  const r=indexedDB.open(DB_NAME,DB_VER);
  r.onupgradeneeded=e=>{const d=e.target.result;
    if(!d.objectStoreNames.contains("sessions"))d.createObjectStore("sessions",{keyPath:"date"});
    if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"k"});};
  r.onsuccess=e=>{db=e.target.result;res();};r.onerror=()=>rej(r.error);});}
function tx(store,mode){return db.transaction(store,mode).objectStore(store);}
function put(store,val){return new Promise((res,rej)=>{const q=tx(store,"readwrite").put(val);
  q.onsuccess=()=>res();q.onerror=()=>rej(q.error);});}
function all(store){return new Promise((res,rej)=>{const q=tx(store,"readonly").getAll();
  q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);});}
function get(store,key){return new Promise((res,rej)=>{const q=tx(store,"readonly").get(key);
  q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);});}
function del(store,key){return new Promise((res,rej)=>{const q=tx(store,"readwrite").delete(key);
  q.onsuccess=()=>res();q.onerror=()=>rej(q.error);});}

/* ------------------------------------------------------------------ state */
let SESSIONS={}, META={k:"app",poolSeen:[],sound:true,vol:1,facts:null};
const $=id=>document.getElementById(id);
const iso=isoOf;
const todayISO=()=>iso(new Date());
const noon=k=>new Date(k+"T12:00:00");
/* A countdown is ceil, so "4" means four seconds or less are left and the digit
   changes at the same instant the beep for it fires. A stopwatch is floor.
   Round is for a finished duration, where there is nothing to line up against. */
const clock=(s,f)=>{s=Math.max(0,f(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
const fmt=s=>clock(s,Math.round);
const cdn=s=>clock(s,v=>Math.ceil(v-1e-6));
const upn=s=>clock(s,Math.floor);
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("on");
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2600);}

const APP_VERSION="v1";
/* Each set writes a row per side, so a row is not a set. */
const setCount=a=>new Set((a||[]).map(x=>x.m+"#"+x.set)).size;
const TOTAL_SETS=ROUTINE.reduce((a,b)=>a+b.sets,0);
const streak=()=>streakState(SESSIONS,todayISO());

/* The main line is keyed to the day count and has to stay that way, or the
   number on the screen stops matching the number in the sentence. */
function showBonus(el,text){
  el.textContent="";
  const lbl=document.createElement("b");
  lbl.textContent="Bonus";
  el.appendChild(lbl);
  el.appendChild(document.createTextNode(text));
  el.style.display="block";
}
/* Picked once a day. Finishing a session marks the pool entries as spent, so
   picking twice would swap the fact out from under her the moment the done
   screen closed. */
function dayFacts(day){
  if(META.facts&&META.facts.day===day&&META.facts.date===todayISO())return META.facts;
  const ms=milestoneFor(day,META.poolSeen);
  const bn=bonusFor(day,META.poolSeen,ms.poolIndex);
  META.facts={day,date:todayISO(),text:ms.text,
    mainIndex:typeof ms.poolIndex==="number"?ms.poolIndex:null,
    bonus:bn.text,bonusIndex:bn.poolIndex};
  put("meta",META);
  return META.facts;
}
function spendFacts(f){
  let touched=false;
  for(const i of [f.mainIndex,f.bonusIndex]){
    if(typeof i==="number"&&!META.poolSeen.includes(i)){META.poolSeen.push(i);touched=true;}
  }
  if(touched){
    if(META.poolSeen.length>=POOL.length)META.poolSeen=[];
    put("meta",META);
  }
}

/* ------------------------------------------------------------------ today */
const DOW=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const plural=(n,one,many)=>n+" "+(n===1?one:many);
const firstDay=()=>Object.keys(SESSIONS).filter(k=>counts(SESSIONS[k])).sort()[0]||null;
const daysDone=()=>Object.values(SESSIONS).filter(counts).length;

function renderToday(){
  const now=new Date(), today=todayISO();
  $("todayDate").textContent=DOW[now.getDay()]+" · "+now.toLocaleDateString("fr-CA",{month:"long",day:"numeric"});
  const st=streak(), n=st.n;
  $("streakN").textContent=n;
  $("streakN").classList.toggle("zero",n===0);
  $("streakL").innerHTML=(n===1?"jour":"jours")+"<br>de suite";

  /* A count that can go down needs two numbers beside it that never do. */
  const total=daysDone();
  $("tally").innerHTML=total
    ?(st.best>n?"Record <b>"+st.best+"</b> · ":"")+"<b>"+total+"</b> "+(total===1?"jour fait":"jours faits")+" en tout"
    :"";

  renderChain();

  const msEl=$("mstone"), bnEl=$("bonus");
  bnEl.style.display="none";
  /* The fact for the day she is on, never the day after. It is handed over
     first on the done screen of the session that earned it. */
  if(st.broke&&st.broke.cost>0){
    msEl.textContent="−"+st.broke.cost+". "+breakMessage(st.breaks);
    msEl.style.display="block";
  }else if(n>0){
    const f=dayFacts(n);
    msEl.textContent=f.text;msEl.style.display="block";
    showBonus(bnEl,f.bonus);
  }else{
    msEl.textContent="Quatre exercices, tous les jours. Un jour manqué enlève deux jours à la série, mais elle retombe jamais à zéro d'un coup.";
    msEl.style.display="block";
  }

  const s=SESSIONS[today];
  const complete=!!(s&&s.complete);
  $("startBtn").style.display=complete?"none":"block";
  $("startBtn").textContent=counts(s)&&!s.manual?"Reprends":"Commence";
  $("doneTag").classList.toggle("on",complete);
  const ec=$("editToday");
  if(s&&s.sets&&s.sets.length){const c=setCount(s.sets);
    ec.style.display="block";ec.textContent="Corriger aujourd'hui, "+plural(c,"série","séries");}
  else ec.style.display="none";
}

/* Five weeks, oldest top left, today bottom right. Days before her first one are
   left blank rather than counted as missed. */
function renderChain(){
  const first=firstDay(), today=todayISO(), N=28, d=new Date();
  d.setDate(d.getDate()-(N-1));
  let h="";
  for(let i=0;i<N;i++){
    const k=iso(d), s=SESSIONS[k];
    let c="";
    if(s&&s.complete)c="done";
    else if(counts(s))c="part";
    else if(!first||k<first)c="before";
    else if(k<today)c="miss";
    if(k===today)c+=" today";
    h+="<i class='"+c.trim()+"'></i>";
    d.setDate(d.getDate()+1);
  }
  $("chain").innerHTML=h;
  $("chain").style.display=first?"grid":"none";
}

function renderPlan(){
  $("planList").innerHTML=ROUTINE.map((b,i)=>"<li><span class='n'>"+(i+1)+"</span><span class='nm'>"+M[b.m].name+
    (M[b.m].load?" <span class='s'>· "+M[b.m].load+"</span>":"")+"</span><span class='s'>"+b.sets+" × "+M[b.m].reps+"</span></li>").join("");
  $("cueList").innerHTML=ROUTINE.map(b=>"<p><b>"+M[b.m].name+"</b>"+M[b.m].cue.join("<br>")+"</p>").join("");
}

/* ---------------------------------------------------------------- history */
let calCursor=new Date();calCursor.setDate(1);
function renderHistory(){
  const y=calCursor.getFullYear(), mo=calCursor.getMonth(), today=todayISO(), first=firstDay();
  $("calMonth").textContent=calCursor.toLocaleDateString("fr-CA",{month:"long",year:"numeric"});
  const start=new Date(y,mo,1).getDay(), days=new Date(y,mo+1,0).getDate();
  let h=["D","L","M","M","J","V","S"].map(d=>"<div class='h'>"+d+"</div>").join("");
  for(let i=0;i<start;i++)h+="<div></div>";
  for(let d=1;d<=days;d++){
    const key=iso(new Date(y,mo,d)), s=SESSIONS[key], future=key>today;
    let cls="c";
    if(s&&s.complete)cls+=" done"; else if(counts(s))cls+=" part";
    else if(!future&&first&&key>=first&&key<today)cls+=" miss";
    if(future)cls+=" future";
    if(key===today)cls+=" today";
    h+="<div class='"+cls+"'"+(future?"":" data-edit='"+key+"' style='cursor:pointer'")+">"+d+"</div>";
  }
  $("cal").innerHTML=h;

  /* Totals only ever go up. The streak can drop by two, these never do. */
  const st=streak(), sum={};
  Object.values(SESSIONS).forEach(s=>(s.sets||[]).forEach(x=>{sum[x.m]=(sum[x.m]||0)+x.reps;}));
  const rows=[["Jours faits",daysDone(),""],["Plus longue série",st.best,st.best===1?"jour":"jours"]];
  ROUTINE.forEach(b=>{if(sum[b.m])rows.push([M[b.m].name,sum[b.m],"reps"]);});
  $("totals").innerHTML=rows.map(r=>"<div class='stat'><span>"+r[0]+"</span><span class='v mono'>"+
    r[1].toLocaleString("fr-CA")+(r[2]?" <small>"+r[2]+"</small>":"")+"</span></div>").join("");

  const list=Object.values(SESSIONS).filter(counts).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
  $("recent").innerHTML=list.length?list.map(s=>{
    const dt=noon(s.date).toLocaleDateString("fr-CA",{weekday:"short",month:"short",day:"numeric"});
    const st=s.startedAt?new Date(s.startedAt):null, t=st?st.getHours()+" h "+String(st.getMinutes()).padStart(2,"0"):"";
    const what=s.manual&&!(s.sets&&s.sets.length)?"Faite sans l'app"
      :plural(setCount(s.sets),"série","séries")+" sur "+TOTAL_SETS+(t?" · "+t:"");
    return "<div class='stat' data-edit='"+s.date+"' style='cursor:pointer'><span>"+dt+
      "<br><span class='muted'>"+what+"</span></span>"+
      "<span class='v mono'>"+(s.actualSec?fmt(s.actualSec):"")+"</span></div>";
  }).join(""):"<p class='muted'>Rien encore.</p>";
}
/* One delegated listener instead of wiring every cell on every render. */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-edit]");
  if(t)openEditor(t.dataset.edit);
});

/* ---------------------------------------------------------------- session */
let PH=[],idx=0,el=0,holding=false,done=false,startedAt=0,drift=0,pendingWork=null;
let PLANNED=0,CARRY=0;
let logged=[],sound=true,finishing=false,raf=null,cued=0,warned=false,anchor=0;
const THEME={work:{bg:"#2E0E22",ink:"#FFE6F2",mut:"#CF8FB0",acc:"#FF6FAE"},
             rest:{bg:"#072421",ink:"#DEF6F0",mut:"#78AFA5",acc:"#54DFC3"}};
const appEl=$("app"),ring=$("ring"),track=ring.querySelector(".track"),bar=ring.querySelector(".bar");
let RLEN=0;
function sizeRing(){
  const w=appEl.clientWidth,h=appEl.clientHeight;
  const rx=parseFloat(getComputedStyle(appEl).borderTopLeftRadius)||0;
  ring.setAttribute("viewBox","0 0 "+w+" "+h);ring.setAttribute("width",w);ring.setAttribute("height",h);
  [track,bar].forEach(r=>{r.setAttribute("x",2.5);r.setAttribute("y",2.5);
    r.setAttribute("width",Math.max(0,w-5));r.setAttribute("height",Math.max(0,h-5));
    r.setAttribute("rx",Math.max(0,rx-2.5));});
  RLEN=bar.getTotalLength();bar.style.strokeDasharray=RLEN;
}
if(window.ResizeObserver)new ResizeObserver(sizeRing).observe(appEl);else addEventListener("resize",sizeRing);

/* The sounds are Loop's, tuned on her phone: sine tones, a limiter that only
   bites past 100%, and a 30 Hz primer held under the session so the phone's
   output stage never powers down and clips the first beep of a countdown. */
let actx=null,lim=null,VOL=1,prime=null;
function audio(){
  if(!actx){
    actx=new (window.AudioContext||window.webkitAudioContext)();
    lim=actx.createDynamicsCompressor();
    lim.threshold.value=-3;lim.knee.value=6;lim.ratio.value=12;
    lim.attack.value=.003;lim.release.value=.1;
    lim.connect(actx.destination);
  }
  if(actx.state==="suspended")actx.resume();
  if(!prime&&sound)startPrime();
  return actx;
}
function tone(f,d,g){
  if(!sound)return;
  try{
    const a=audio(),t=a.currentTime,dur=d||.1;
    const o=a.createOscillator(),v=a.createGain();
    o.type="sine";o.frequency.value=f;
    v.gain.value=0;o.connect(v);v.connect(lim);
    v.gain.linearRampToValueAtTime(Math.max(.0002,(g||.5)*VOL),t+.012);
    v.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.start(t);o.stop(t+dur+.02);
  }catch(e){}
}
function startPrime(){
  if(prime||!actx)return;
  try{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type="sine";o.frequency.value=30;g.gain.value=.012;
    o.connect(g);g.connect(actx.destination);o.start();
    prime=o;
  }catch(e){}
}
function stopPrime(){try{prime&&prime.stop();}catch(e){}prime=null;}
/* Four beeps on the beat in the last four seconds, then the go tone at zero.
   Ten seconds out, a lower double beep: get back into position. */
const CUE_AT=[4,3,2,1], WARN_AT=10;
function tick(){tone(880,.075,.5);if(navigator.vibrate)navigator.vibrate(14);}
function warn(){tone(660,.09,.5);setTimeout(()=>tone(660,.09,.5),140);if(navigator.vibrate)navigator.vibrate(14);}
function goTone(){tone(1320,.22,.77);if(navigator.vibrate)navigator.vibrate([26,50,26]);}

let wake=null;
async function keepAwake(){
  if(!("wakeLock" in navigator)||wake)return;
  try{wake=await navigator.wakeLock.request("screen");
    wake.addEventListener("release",()=>{wake=null;});}catch(e){}
}
function dropAwake(){try{wake&&wake.release();}catch(e){}wake=null;}
addEventListener("visibilitychange",()=>{
  if(!document.hidden&&$("sess").classList.contains("on")&&!done)keepAwake();
});

/* Five seconds between the tap and the first rep, to get into position. */
const LEAD=5;
function startSession(){
  if(sound){try{audio();}catch(e){}}
  const existing=SESSIONS[todayISO()];
  const resuming=!!(existing&&!existing.complete&&existing.sets&&existing.sets.length);
  PH=buildPhases();
  PLANNED=LEAD+PH.reduce((a,p)=>a+p.dur,0);
  logged=resuming?existing.sets.slice():[];
  CARRY=resuming?(existing.activeSec||0):0;
  /* Resume at the first set never logged. Rows are matched on exercise and
     set, never counted, because each set writes one row per side. */
  if(logged.length){
    const had=new Set(logged.map(r=>r.m+"#"+r.set));
    let cut=0;
    while(cut<PH.length&&PH[cut].type==="work"&&had.has(PH[cut].m+"#"+PH[cut].set)){
      cut++;
      if(PH[cut]&&PH[cut].type==="rest")cut++;
    }
    if(cut>0&&cut<PH.length)PH=PH.slice(cut);
  }
  PH.unshift(Object.assign({},PH[0],{type:"rest",lead:true,dur:LEAD}));
  idx=0;el=0;holding=false;done=false;finishing=false;drift=0;pendingWork=null;cued=0;warned=false;
  anchor=Date.now();
  startedAt=existing&&existing.startedAt?existing.startedAt:Date.now();
  $("sStreak").textContent=streak().n;
  $("doneview").classList.remove("on");
  $("log").classList.remove("on");
  $("sess").classList.add("on");
  sizeRing();render();keepAwake();
  if(!raf)raf=requestAnimationFrame(loop);
}
const plannedTotal=()=>PH.reduce((a,p)=>a+p.dur,0);
function activeSoFar(){
  let a=0;for(let i=0;i<idx;i++)a+=PH[i].dur;
  return CARRY+a+Math.max(0,el)+drift;
}
function remaining(){let r=Math.max(0,PH[idx].dur-el);for(let i=idx+1;i<PH.length;i++)r+=PH[i].dur;return r;}
const setLbl=p=>"série "+p.set+" sur "+p.sets;
function setPips(n,cur){let h="";for(let i=1;i<=n;i++)h+='<i class="'+(i<cur?"done":(i===cur?"cur":""))+'"></i>';$("pips").innerHTML=h;}

function render(){
  if(done)return;
  const p=PH[idx],work=p.type==="work",th=work?THEME.work:THEME.rest;
  appEl.style.setProperty("--bg",th.bg);appEl.style.setProperty("--ink",th.ink);
  appEl.style.setProperty("--mut",th.mut);appEl.style.setProperty("--acc",th.acc);
  let nextW=null;for(let i=idx+1;i<PH.length;i++){if(PH[i].type==="work"){nextW=PH[i];break;}}
  $("phaseLbl").textContent=work?"À toi":(p.lead?"Prépare-toi":"Repos");
  /* The set has no time limit, so it counts up. The rest is the one thing
     that is timed, so it counts down. */
  const ct=work?upn(el):cdn(p.dur-el);
  $("clock").textContent=ct;
  $("clock").className="big mono"+(ct.length>=5?" wide":"");
  const show=work?p:(nextW||p),sm=M[show.m];
  $("exName").textContent=work||nextW?sm.name:"Fin de la séance";
  setPips(show.sets,show.set);
  $("setNow").textContent="Série "+show.set+" sur "+show.sets;
  $("target").innerHTML="<b>"+sm.reps+"</b> reps · chaque côté"+(sm.load?" · <b>"+sm.load+"</b>":"");
  const cueHtml=sm.cue.map(c=>"<span>"+c+"</span>").join("");
  if($("cues")._for!==show.m+show.set){$("cues").innerHTML=cueHtml;$("cues")._for=show.m+show.set;}
  $("nextLbl").textContent=work
    ?(PH[idx+1]?"Repos "+fmt(PH[idx+1].dur)+(nextW?", puis "+M[nextW.m].name.toLowerCase()+", "+setLbl(nextW):""):"Dernière série")
    :(nextW?M[nextW.m].name+", "+setLbl(nextW):"Fin de la séance");
  const end=new Date(Date.now()+remaining()*1000);
  $("endAt").textContent=String(end.getHours()).padStart(2,"0")+":"+String(end.getMinutes()).padStart(2,"0");
  const green=Object.keys(SESSIONS).length<4;
  $("hint").firstChild.nodeValue=p.lead?"Touche l'écran pour commencer tout de suite · fin à "
    :(green?(work?"Touche l'écran quand la série est finie · fin à ":"Touche l'écran pour repartir plus tôt · fin à "):"Fin à ");
  bar.style.strokeDashoffset=work?RLEN:RLEN*Math.min(1,Math.max(0,el/p.dur));
  $("logRest").textContent=cdn(Math.max(0,PH[idx].dur-el));
}
function endWork(){
  const p=PH[idx];
  drift+=el-p.dur;
  pendingWork={m:p.m,set:p.set,sets:p.sets,def:p.def};
  idx++;el=0;anchor=Date.now();
  if(idx>=PH.length)finishing=true;else holding=true;
  openLog();tone(520,.14,.66);
  if(!finishing)render();
}
function endRest(){
  const p=PH[idx];drift+=(el-p.dur);
  /* Whatever the rest ran over belongs to the set after it, so a phone that
     slept through the end of a rest does not hand back a fresh one. */
  const carry=Math.max(0,el-p.dur);
  idx++;el=0;cued=0;warned=false;anchor=Date.now()-carry*1000;
  if(idx>=PH.length){finish();return;}
  goTone();render();
}
/* Seed each side with what she did last time on that set, not a default. */
function lastReps(mKey,set,side){
  const prev=Object.values(SESSIONS).filter(s=>s.date!==todayISO()&&(s.sets||[]).some(x=>x.m===mKey))
    .sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(!prev)return null;
  const mine=prev.sets.filter(x=>x.m===mKey&&x.side===side);
  if(!mine.length)return null;
  return (mine.find(x=>x.set===set)||mine[mine.length-1]).reps;
}
let sideVal=null;
function openLog(){
  const m=M[pendingWork.m], host=$("sides");
  $("logName").textContent=m.name;
  $("logSet").textContent="Série "+pendingWork.set+" sur "+pendingWork.sets;
  $("log").querySelector(".top .t").textContent=finishing?"Dernière série":"Repos";
  $("logRest").style.visibility=finishing?"hidden":"visible";
  sideVal={};host.innerHTML="";
  SIDES.forEach(sd=>{
    const cell={reps:lastReps(pendingWork.m,pendingWork.set,sd.k)||pendingWork.def};
    sideVal[sd.k]=cell;
    const wrap=document.createElement("div");wrap.className="side";
    wrap.innerHTML="<div class='h'><span>"+sd.lbl+"</span><span>reps</span></div>"+
      "<div class='cnt'><button aria-label='Une de moins'>−</button>"+
      "<div class='v mono'>"+cell.reps+"</div>"+
      "<button aria-label='Une de plus'>+</button></div>";
    const pads=wrap.querySelectorAll(".cnt button"), v=wrap.querySelector(".v");
    const bump=d=>{cell.reps=Math.max(0,Math.min(60,cell.reps+d));v.textContent=cell.reps;};
    pads[0].addEventListener("click",()=>bump(-1));
    pads[1].addEventListener("click",()=>bump(1));
    host.appendChild(wrap);
  });
  $("log").classList.add("on");$("log").setAttribute("aria-hidden","false");
}
function commitLog(){
  if(!pendingWork)return;
  const ts=Date.now();
  SIDES.forEach(sd=>logged.push({m:pendingWork.m,set:pendingWork.set,side:sd.k,reps:sideVal[sd.k].reps,ts}));
  holding=false;pendingWork=null;sideVal=null;
  $("log").classList.remove("on");$("log").setAttribute("aria-hidden","true");
  tone(880,.12,.66);
  saveSession(false);
  if(finishing){finish();return;}
  render();
}
function finish(){
  done=true;
  const actual=CARRY+plannedTotal()+drift;
  $("doneview").classList.add("on");
  $("doneTime").textContent=fmt(actual);
  saveSession(true,actual);
  const n=streak().n;
  $("sStreak").textContent=n;
  const c=setCount(logged);
  $("doneNote").textContent=plural(c,"série enregistrée","séries enregistrées")+". "+
    (n>0?(n===1?"Premier jour.":n+" jours de suite."):"");
  const f=n>0?dayFacts(n):null;
  $("doneMs").textContent=f?f.text:"";
  if(f)spendFacts(f);
  dropAwake();
}
async function saveSession(complete,actual){
  const date=todayISO();
  const rec={date,startedAt,endedAt:Date.now(),
    plannedSec:PLANNED,actualSec:actual||null,activeSec:activeSoFar(),
    sets:logged.slice(),complete:!!complete};
  SESSIONS[date]=rec;
  await put("sessions",rec);
}
/* Pausing and quitting are the same act: the sets are saved, the day already
   counts, and the only difference is whether she comes back. */
function pauseSession(){
  const some=logged.length>0;
  leaveSession();
  if(!done)toast(some?"En pause. Reprends depuis l'accueil.":"Séance abandonnée.");
}
function leaveSession(){
  $("sess").classList.remove("on");
  dropAwake();
  if(logged.length&&!done)saveSession(false);
  renderAll();
}
/* The clock reads the wall, not the frame counter, so a phone that sleeps
   wakes up where the session should be, not where it froze. */
function loop(){
  if($("sess").classList.contains("on")&&!done&&!finishing){
    const p=PH[idx];
    el=(Date.now()-anchor)/1000;
    if(p.type==="rest"&&holding){
      el=Math.min(el,p.dur);
    }else if(p.type==="rest"&&el>=p.dur){
      endRest();raf=requestAnimationFrame(loop);return;
    }else if(p.type==="rest"){
      const lft=p.dur-el;
      /* A beep already well past its moment is one the phone slept through. */
      if(!warned&&lft<=WARN_AT){warned=true;if(lft>WARN_AT-.6&&!p.lead)warn();}
      while(cued<CUE_AT.length&&lft<=CUE_AT[cued]){const k=CUE_AT[cued++];if(lft>k-.6)tick();}
    }
    render();
  }
  raf=requestAnimationFrame(loop);
}

/* ----------------------------------------------------------------- editor */
let edDate=null;
function openEditor(date){
  if(date>todayISO())return;
  edDate=date;
  $("edDate").textContent=noon(date).toLocaleDateString("fr-CA",{weekday:"long",month:"long",day:"numeric"});
  renderEditor();
  $("editor").classList.add("on");
}
function renderEditor(){
  const s=SESSIONS[edDate], sets=(s&&s.sets)||[];
  $("edTitle").textContent=counts(s)?(sets.length?plural(setCount(sets),"série","séries")+" sur "+TOTAL_SETS:"Faite sans l'app"):"Rien d'enregistré";
  /* Marking a day by hand is for the day she did it and the phone was not
     there. It is offered only where nothing is logged, and today only once
     there is nothing to resume. */
  $("edManual").style.display=counts(s)?"none":"block";
  $("edDel").style.display=s?"block":"none";
  if(!sets.length){$("edList").innerHTML="";return;}
  $("edList").innerHTML=sets.map((x,i)=>{
    const sd=x.side==="L"?"Gauche":(x.side==="R"?"Droite":"");
    return "<div class='edrow'><span class='who'>"+M[x.m].name+"<small>Série "+x.set+(sd?" · "+sd:"")+"</small></span>"+
      "<input type='number' inputmode='numeric' value='"+x.reps+"' data-i='"+i+"' aria-label='Reps'>"+
      "<button class='x' data-del='"+i+"' aria-label='Retirer'>"+
      "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round'><path d='M6 6l12 12M18 6L6 18'/></svg></button></div>";
  }).join("");
  $("edList").querySelectorAll("input[data-i]").forEach(inp=>inp.addEventListener("change",async()=>{
    const v=parseInt(inp.value,10);if(isNaN(v))return;
    SESSIONS[edDate].sets[+inp.dataset.i].reps=Math.max(0,v);
    await persistEdit();
  }));
  $("edList").querySelectorAll("button[data-del]").forEach(b=>b.addEventListener("click",async()=>{
    SESSIONS[edDate].sets.splice(+b.dataset.del,1);
    await persistEdit();renderEditor();
  }));
}
async function persistEdit(){
  const s=SESSIONS[edDate];
  if(!s.manual&&!s.sets.length){delete SESSIONS[edDate];await del("sessions",edDate);}
  else{s.complete=s.manual||(s.complete&&s.sets.length>0);await put("sessions",s);}
  renderAll();
}
$("edManual").addEventListener("click",async()=>{
  const prev=SESSIONS[edDate]||{date:edDate,sets:[]};
  const rec=Object.assign(prev,{manual:true,complete:true});
  SESSIONS[edDate]=rec;await put("sessions",rec);
  closeEditor();renderAll();toast("Journée comptée");
});
$("edDel").addEventListener("click",async()=>{
  if(!edDate||!confirm("Effacer tout ce qui est noté cette journée-là ?"))return;
  delete SESSIONS[edDate];await del("sessions",edDate);
  closeEditor();renderAll();toast("Journée effacée");
});
function closeEditor(){$("editor").classList.remove("on");edDate=null;}
$("edClose").addEventListener("click",closeEditor);
$("editor").addEventListener("click",e=>{if(e.target.id==="editor")closeEditor();});

/* ------------------------------------------------------------------- wire */
function renderAll(){renderToday();renderHistory();}
$("field").addEventListener("click",()=>{
  if(done||holding)return;
  if(sound){try{audio();}catch(e){}}
  if(PH[idx].type==="work")endWork();else endRest();
});
$("logSave").addEventListener("click",commitLog);
function setSound(on){
  sound=on;
  $("sndBtn").setAttribute("aria-pressed",on?"true":"false");
  $("sndToggle").textContent=on?"Bips activés":"Bips désactivés";
  META.sound=on;put("meta",META);
  if(on){tone(660,.08,.55);startPrime();}
  else stopPrime();
}
$("sndBtn").addEventListener("click",()=>setSound(!sound));
$("sndToggle").addEventListener("click",()=>setSound(!sound));
$("quitBtn").addEventListener("click",pauseSession);
$("doneBtn").addEventListener("click",leaveSession);
$("startBtn").addEventListener("click",startSession);
$("editToday").addEventListener("click",()=>openEditor(todayISO()));
document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("on",x===b));
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("on"));
  $("p-"+b.dataset.go).classList.add("on");
  if(b.dataset.go==="history")renderHistory();
  scrollTo(0,0);
}));
$("calPrev").addEventListener("click",()=>{calCursor.setMonth(calCursor.getMonth()-1);renderHistory();});
$("calNext").addEventListener("click",()=>{calCursor.setMonth(calCursor.getMonth()+1);renderHistory();});

const dump=()=>JSON.stringify({app:"physio",sessions:Object.values(SESSIONS),meta:META},null,2);
$("expBtn").addEventListener("click",()=>{
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([dump()],{type:"application/json"}));
  a.download="physio-"+todayISO()+".json";a.click();URL.revokeObjectURL(a.href);
});
/* Reading the clipboard needs a permission Android quietly refuses inside an
   installed app. A box she pastes into always works. */
$("pstBtn").addEventListener("click",()=>{
  const b=$("pasteBox"),shown=b.style.display==="block";
  b.style.display=shown?"none":"block";
  if(!shown)$("pasteIn").focus();
});
$("pasteGo").addEventListener("click",async()=>{
  const raw=$("pasteIn").value.trim().replace(/^```[a-z]*/i,"").replace(/```$/,"").trim();
  if(!raw){toast("La boîte est vide");return;}
  let d;
  try{d=JSON.parse(raw);}catch(e){toast("Ce texte-là est pas du JSON valide");return;}
  try{await ingest(d);}catch(e){toast("Du JSON valide, mais pas un export de Physio");return;}
  $("pasteIn").value="";$("pasteBox").style.display="none";toast("Importé");
});
$("cpyBtn").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(dump());toast("Copié");}
  catch(e){toast("Ton navigateur a bloqué le presse-papiers");}
});
$("volIn").addEventListener("input",e=>{VOL=(+e.target.value)/100;$("volNote").textContent=e.target.value+" %";});
$("volIn").addEventListener("change",async e=>{META.vol=(+e.target.value)/100;await put("meta",META);tone(880,.085,.6);});
/* The test plays the same five seconds a rest ends with. */
let testing=false;
$("volTest").addEventListener("click",()=>{
  if(testing)return;
  testing=true;audio();
  CUE_AT.forEach(k=>setTimeout(tick,(5-k)*1000));
  setTimeout(()=>{goTone();testing=false;},5000);});
$("impBtn").addEventListener("click",()=>$("impFile").click());
$("impFile").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{await ingest(JSON.parse(await f.text()));toast("Importé");}
  catch(err){toast("Impossible de lire ce fichier");}
  e.target.value="";
});
/* A Loop or Reps export is also an object with a sessions array, and loading
   one here would fill the calendar with somebody else's workouts. */
async function ingest(d){
  if(!d||d.app!=="physio"||!Array.isArray(d.sessions))throw new Error("not a physio export");
  for(const s of d.sessions)await put("sessions",s);
  if(d.meta){META=Object.assign(META,d.meta,{k:"app"});await put("meta",META);}
  await load();
}
async function load(){
  const s=await all("sessions");SESSIONS={};s.forEach(x=>SESSIONS[x.date]=x);
  const m=await get("meta","app");if(m)META=Object.assign(META,m);
  sound=META.sound!==false;
  $("sndBtn").setAttribute("aria-pressed",sound?"true":"false");
  $("sndToggle").textContent=sound?"Bips activés":"Bips désactivés";
  VOL=(typeof META.vol==="number"&&META.vol>=.2)?META.vol:1;
  $("volIn").value=Math.round(VOL*100);$("volNote").textContent=Math.round(VOL*100)+" %";
  $("verNote").textContent=APP_VERSION;
  renderAll();
}
renderPlan();
open().then(load).catch(()=>{toast("Ce navigateur laisse pas l'app enregistrer quoi que ce soit");renderToday();});
/* Midnight passes while the app sits open: yesterday becomes a missed day or
   a done one, and the screen has to say so when she comes back to it. */
let shownDay=todayISO();
addEventListener("visibilitychange",()=>{
  if(!document.hidden&&todayISO()!==shownDay&&!$("sess").classList.contains("on")){shownDay=todayISO();renderAll();}
});
if("serviceWorker" in navigator)addEventListener("load",async()=>{
  const had=!!navigator.serviceWorker.controller;
  let reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!had||reloading)return;
    reloading=true;location.reload();
  });
  try{
    const reg=await navigator.serviceWorker.register("./sw.js");
    reg.update();
    addEventListener("visibilitychange",()=>{if(!document.hidden)reg.update();});
  }catch(e){}
});
