// Pure study helpers (no DOM), shared by app.js and the tests in test/.
(function(g){
const DAY=864e5,MIN=6e4;
const DECK_ORDER=['top','phr']; // words first, then phrases
// Saved deck choice: the old "Both" option (and anything unknown) becomes Top words.
const deckSel=s=>DECK_ORDER.includes(s)?s:'top';
const LISTEN_GAP=700; // ms between the word and its example sentence
// What a listening question plays: word cards say the word, pause, then the sentence; phrase cards just the sentence.
function listenQueue(c){if(!c)return [];const ex=c.ex?[{src:c.exAudio,text:c.ex}]:[];
if((c.deck||'top')==='phr')return ex;return [{src:c.audio,text:c.nl},...(ex.length?[{pause:LISTEN_GAP},...ex]:[])];}
// "Ready for phrases?" once at least 80% of top words are learned, or no new top words are left.
const phraseNudge=(sel,learned,total,freshLeft)=>sel==='top'&&total>0&&(learned/total>=.8||freshLeft===0);
// Spaced repetition (SM-2 style). Saved cards keep their interval, ease and due date; only future grades use these rules.
// q: 0 Again, 3 Hard, 4 Good, 5 Easy. Learning cards (reps 0): Again 1 min, Hard 10 min, Good 1 day, Easy 4 days.
// Review cards: Hard ~1.2x, Good x ease, Easy x ease x 1.3, always Hard < Good < Easy. Again lowers ease and relearns.
function sched(q,o,opt){opt=opt||{};const now=opt.now||Date.now(),s=Object.assign({ef:2.5,ivl:0,reps:0,due:0},o||{});
if(opt.ahead&&o&&o.due>now&&o.reps>0&&q>=3){const el=Math.max(1,(now-(o.t||now))/DAY),r=x=>Math.max(1,Math.round(el*s.ef*x));
const h=r(.8),gd=Math.max(r(1),h+1),e=Math.max(r(1.3),gd+1);s.reps++;s.ivl=Math.max(s.ivl,q==3?h:q==5?e:gd);s.due=now+s.ivl*DAY;return s;}
if(q<3){if(s.reps>0){s.ef=Math.max(1.3,s.ef-.2);s.lapses=(s.lapses||0)+1;}s.reps=0;s.ivl=0;s.due=now+MIN;return s;}
if(s.reps===0){if(q===3){s.ivl=0;s.due=now+10*MIN;return s;}s.reps=1;s.ivl=q===5?4:1;s.due=now+s.ivl*DAY;return s;}
const I=Math.max(1,s.ivl);let h,gd,e;
if(s.reps===1){h=Math.max(3,I+1);gd=Math.max(6,Math.round(I*s.ef));e=Math.max(10,Math.round(I*s.ef*1.3));}
else{h=Math.max(I+1,Math.round(I*1.2));gd=Math.round(I*s.ef);e=Math.round(I*s.ef*1.3);}
gd=Math.max(gd,h+1);e=Math.max(e,gd+1);s.ivl=q===3?h:q===5?e:gd;s.reps++;s.ef=Math.max(1.3,s.ef+(q===3?-.15:q===5?.15:0));s.due=now+s.ivl*DAY;return s;}
const fmtIvl=(s,now)=>{now=now||Date.now();if(s.ivl==0){const m=Math.max(1,Math.round((s.due-now)/MIN));return m+' min';}
return s.ivl==1?'1 day':s.ivl<31?s.ivl+' days':s.ivl<365?Math.round(s.ivl/30)+' mo':(s.ivl/365).toFixed(1)+' yr';};
// A card counts as learned once it has a review interval of a day or more (the same rule as before, so saved progress counts the same).
const isLearned=s=>!!s&&(s.stage||'rev')==='rev'&&s.ivl>=1;
// Still being learned today: new cards (intro/learn) and cards that were just forgotten (no interval yet).
const isLearning=s=>!!s&&(s.stage==='intro'||s.stage==='learn'||!s.ivl);
// Today's progress by card, not by answer: done = cards answered today that are no longer waiting.
function progress(cards,deck,seenToday,newLeft,now){now=now||Date.now();const pend=c=>{const s=cards[c.id];return !!s&&(s.due<=now||isLearning(s));};
const seen=new Set(seenToday||[]);let pending=0,done=0;for(const c of deck){if(pend(c))pending++;else if(seen.has(c.id))done++;}return {done,total:done+pending+(newLeft||0)};}
// Workload forecast: reviews falling due tomorrow (local calendar day) and over the next 7 days.
function forecast(cards,now){now=now||Date.now();const t=new Date(now);t.setHours(0,0,0,0);const a=t.getTime()+DAY,b=a+DAY;let tom=0,week=0;
for(const s of Object.values(cards||{})){if(!s||isLearning(s))continue;if(s.due>=a&&s.due<b)tom++;if(s.due>now&&s.due<now+7*DAY)week++;}return {tom,week};}
// Streak shown on screen: still alive if you studied today or yesterday, otherwise 0.
const dstr=ms=>new Date(ms).toLocaleDateString('en-CA');
const streakNow=(st,now)=>{now=now||Date.now();return st.last===dstr(now)||st.last===dstr(now-DAY)?(st.streak||0):0;};
// Gentle backup reminder: at most once every 30 days, once 20+ cards are learned.
const backupDue=(st,now)=>{now=now||Date.now();const n=Object.values(st.cards||{}).filter(isLearned).length;return n>=20&&now-Math.max(st.lastExport||0,st.backupAsk||0)>30*DAY;};
// Weak cards drill: cards forgotten (Again after being learned) at least WEAK_MIN times, worst first, at most WEAK_MAX per drill.
// Reads the saved lapses count only; never changes saved cards.
const WEAK_MIN=2,WEAK_MAX=15;
function weakIds(cards,ids,max){max=max||WEAK_MAX;const ok=ids?new Set(ids.map(String)):null;
return Object.entries(cards||{}).filter(([id,s])=>s&&(s.lapses||0)>=WEAK_MIN&&(!ok||ok.has(String(id))))
.sort((a,b)=>(b[1].lapses-a[1].lapses)||((a[1].ef||2.5)-(b[1].ef||2.5))||((a[1].due||0)-(b[1].due||0))).slice(0,max).map(([id])=>id);}
const api={WEAK_MIN,WEAK_MAX,weakIds,DECK_ORDER,deckSel,LISTEN_GAP,listenQueue,phraseNudge,sched,fmtIvl,isLearned,isLearning,progress,forecast,streakNow,backupDue,dstr};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(g,api);
})(this);
