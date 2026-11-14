const NEW_PER_DAY=15,SESSION=15*60,K='dfc_v1',DAY=864e5,MC_NEED=1;
const st=JSON.parse(localStorage.getItem(K)||'{"cards":{},"streak":0,"last":null,"newDay":null,"newCount":0}');
if(!st.migr2){st.show=false;st.migr2=1;}
if(!st.dir)st.dir=st.rev?'en':'mix';
st.deckSel=deckSel(st.deckSel); // old "Both" option is gone: falls back to Top words
if(st.listen===undefined)st.listen=true;if(st.speak===undefined)st.speak=true;if(st.gaps===undefined)st.gaps=true;const LISTEN_P=.25;let lis=false,gap=false;
const save=()=>localStorage.setItem(K,JSON.stringify(st));
const today=()=>new Date().toLocaleDateString('en-CA');
// v3 (Oct 2026): saved cards are kept exactly as they are; only future answers use the new rules. Existing users skip the welcome.
if(!st.migr3){st.migr3=1;if(Object.keys(st.cards||{}).length)st.seenIntro=1;}
// New day (also while the app stays open): reset today's counters and the 15-minute session.
function newDay(){if(st.newDay!==today()){st.newDay=today();st.newCount=0;st.extra=0;st.doneToday=0;st.seenToday=[];st.left=SESSION;return true;}return false;}
newDay();if(st.left===undefined)st.left=SESSION;if(!st.seenToday)st.seenToday=[];
// Streak resets to 0 once a day has been missed, instead of showing the old number until the next answer.
const fixStreak=()=>{if(st.streak&&!streakNow(st))st.streak=0;};fixStreak();
save();
let all=[],deck=[],cur=null,mode=null,rev=false,shown=false,left=Math.max(0,st.left),ahead=false,drill=null,drillEnd=false,lastId=null,sug=null,saySug=null,lastAudio=null;
const dayCheck=()=>{if(newDay()){left=st.left;save();return true;}return false;};
const DESK=matchMedia('(hover:hover) and (pointer:fine)').matches;
const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m]);
const $=id=>document.getElementById(id);
const lim=()=>(st.npd??NEW_PER_DAY)+(st.extra||0);
const stage=c=>{const s=st.cards[c.id];return !s?'new':(s.stage||'rev');};
const due=()=>{const n=Date.now();return deck.filter(c=>st.cards[c.id]&&st.cards[c.id].due<=n);};
function fresh(){return deck.filter(c=>!st.cards[c.id]);}
// Weak cards: forgotten 2+ times (study.js weakIds). The drill grades with the normal buttons; cards not yet due use the review-ahead rule so intervals never jump.
const byId=id=>all.find(c=>String(c.id)===String(id));
const weakList=()=>weakIds(st.cards,all.map(c=>c.id)).map(byId).filter(Boolean);
const gopt=()=>({ahead:ahead||!!drill});
function weakUI(){const n=weakList().length;$('weakn').textContent=n?n+' card'+(n==1?'':'s')+' you have forgotten '+WEAK_MIN+'+ times':'None yet. Words you forget '+WEAK_MIN+' or more times will show up here.';
$('weakgo').hidden=!n;$('weak').hidden=!n;$('weak').textContent='💪 Practise weak cards ('+n+')';}
function startWeak(){const l=weakList();if(!l.length){weakUI();return;}drill={q:l,again:{}};drillEnd=false;openSet(false);next();}
function stats(){const du=due().length,nl=Math.max(0,Math.min(lim()-st.newCount,fresh().length)),lr=c=>isLearned(st.cards[c.id]);
const done=st.doneToday||0,pr=progress(st.cards,deck,st.seenToday,nl),fc=forecast(st.cards);
$('sTom').textContent=fc.tom;$('sWeek').textContent=fc.week;
$('sDue').textContent=du;$('sNew').textContent=nl;$('sLearned').textContent=deck.filter(lr).length;$('sStreak').textContent=streakNow(st);$('sToday').textContent=done;
$('sPhr').textContent=all.filter(c=>c.deck==='phr'&&lr(c)).length;$('sTop').textContent=all.filter(c=>c.deck!=='phr'&&lr(c)).length;
$('sMature').textContent=all.filter(c=>lr(c)&&st.cards[c.id].ivl>=21).length;$('sSeen').textContent=all.filter(c=>st.cards[c.id]).length;$('sTotal').textContent=all.length;
$('pbar').style.width=(pr.total?Math.round(pr.done/pr.total*100):100)+'%';$('ptext').textContent=pr.total&&pr.done<pr.total?pr.done+' / '+pr.total+' cards today':done?'All done today ✓':'Today';}
const seen=()=>{if(!st.seenToday.includes(cur.id))st.seenToday.push(cur.id);};
function anim(){const c=$('card');c.classList.remove('in');void c.offsetWidth;c.classList.add('in');}
function bumpStreak(){if(st.last!==today()){const y=new Date(Date.now()-DAY).toLocaleDateString('en-CA');st.streak=st.last===y?st.streak+1:1;st.last=today();}}
function hideAll(){gap=false;$('front').classList.remove('sent');$('say').hidden=false;$('tag').textContent='';seq++;micStop();['back','typebox','spkbox','exbox','showbtn','cont','btns','lisbox','donebox','fh','unmute','welcome','bkup','weak'].forEach(i=>$(i).hidden=true);$('mc').innerHTML='';$('more').style.display='none';$('hint').textContent='';$('check').innerHTML='';$('typed').value='';
$('front').lang=$('back').lang='en';$('cont').textContent='Continue';$('typed').placeholder='Type the Dutch (optional)';sug=saySug=null;suggest(null);}
const nlFront=()=>{$('front').lang='nl';if(cur.fh){$('fh').hidden=false;$('fh').textContent=cur.fh;}};
function pick(){const d=due().filter(c=>c.id!==lastId||due().length===1).sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
if(d.length)return d[0];
if(st.newCount<lim()&&fresh().length)return fresh()[0];
const intro=deck.filter(c=>isLearning(st.cards[c.id])).sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
const i2=intro.filter(c=>c.id!==lastId);if(i2.length)return i2[0];if(intro.length)return intro[0];
if(ahead){return deck.filter(c=>stage(c)==='rev').sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due)[0]||null;}
return null;}
function next(){dayCheck();fixStreak();hideAll();if(!st.seenIntro)return showWelcome();
if(drill){cur=drill.q.shift()||null;if(!cur){drill=null;drillEnd=true;}}else cur=left>0?pick():null;stats();anim();
if(!cur){mode='done';$('say').hidden=true;const fc=forecast(st.cards);
if(drillEnd){drillEnd=false;$('front').textContent='💪 Weak cards done';$('hint').textContent='Nice work. Those cards will come back on their normal schedule. Tomorrow: '+fc.tom+' review'+(fc.tom==1?'':'s')+' due.';}else{
$('front').textContent=left<=0?'⏰ 15 minutes done':'🎉 Done for today';
$('hint').textContent=(left<=0?'Nice work. Come back tomorrow, or keep going.':'Everything due is done. Want to keep going?')+' Tomorrow: '+fc.tom+' review'+(fc.tom==1?'':'s')+' due.';}
$('donebox').hidden=false;$('donebox').innerHTML='<div class="stat"><b>'+(st.doneToday||0)+'</b><span>Answered</span></div><div class="stat"><b>'+$('sLearned').textContent+'</b><span>Learned</span></div><div class="stat"><b>'+streakNow(st)+'🔥</b><span>Streak</span></div>';
$('more').style.display='flex';$('ahead').hidden=!deck.some(c=>isLearned(st.cards[c.id]));$('more10').hidden=!fresh().length;weakUI();
if(backupDue(st)){$('bkup').hidden=false;st.backupAsk=Date.now();save();}
const tw=all.filter(c=>c.deck!=='phr');$('tophr').hidden=!phraseNudge(st.deckSel,tw.filter(c=>stage(c)==='rev'&&st.cards[c.id].ivl>=1).length,tw.length,fresh().length);return;}
lastId=cur.id;
if(drill){showRecall(false);$('tag').textContent='Weak cards · '+(drill.q.length+1)+' left';return;}
if(stage(cur)==='new'){st.cards[cur.id]={stage:'intro',mc:0,ef:2.5,ivl:0,reps:0,due:Date.now(),t:Date.now()};st.newCount++;save();}
const sg=stage(cur);if(sg==='intro')showMC();else showRecall(sg==='learn');}
function typeOf(c){return c.en.startsWith('the ')?'n':c.en.startsWith('to ')?'v':'o';}
const STOP=new Set('the a an to you your i im it its is of for with that this me my be do does can could would some one up on in at and or so not are was what how be there here out please informal polite casual words'.split(' '));
const toks=c=>new Set(c.en.toLowerCase().replace(/[’']/g,'').split(/[^a-z]+/).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.replace(/(ing|s)$/,'')));
function overlap(a,b){if((a.grp||[]).some(g=>(b.grp||[]).includes(g)))return true;const ta=toks(a);for(const t of toks(b))if(ta.has(t))return true;return false;}
function showMC(){mode='mc';$('tag').textContent='New · '+(cur.deck==='phr'?'phrase':'word');$('front').textContent=cur.nl;nlFront();$('hint').textContent='Which is the meaning?';speak();
const t=typeOf(cur),same=cur.mcg?all.filter(c=>c.mcg===cur.mcg&&c.id!==cur.id&&c.en!==cur.en):all.filter(c=>(c.deck||'top')===(cur.deck||'top')&&c.id!==cur.id&&c.en!==cur.en);let pool=cur.deck==='phr'||cur.mcg?same:same.filter(c=>typeOf(c)===t);if(pool.length<2)pool=same;
pool=pool.sort(()=>Math.random()-.5);const ch=[];for(const c of pool){if(ch.length>=2)break;if(cur.mcg||[cur,...ch].every(o=>!overlap(o,c)))ch.push(c);}for(const c of pool){if(ch.length>=2)break;if(!ch.includes(c)&&!overlap(cur,c))ch.push(c);}pool=ch;const opts=[cur,...pool].sort(()=>Math.random()-.5);
opts.forEach(o=>{const b=document.createElement('button');b.className='opt';b.textContent=o.en;b.onclick=()=>answerMC(b,o.id===cur.id);$('mc').appendChild(b);});}
function answerMC(btn,ok){if(mode!=='mc')return;mode='mcdone';const s=st.cards[cur.id];
[...$('mc').children].forEach(b=>{b.disabled=true;if(b.textContent===cur.en)b.classList.add('right');});
// New words: one correct pick, then a recall check later in the same session before the card counts as learned.
if(ok){s.mc++;const dirTxt=st.dir==='nl'?'Next time: recall the meaning.':'Next time: say or type it from English.';$('hint').textContent=s.mc>=MC_NEED?'✅ Correct! '+dirTxt:'✅ Correct!';
if(s.mc>=MC_NEED){s.stage='learn';s.reps=0;s.ivl=0;s.due=Date.now()+60e3;}else s.due=Date.now()+90e3;}
else{btn.classList.add('wrong');$('hint').textContent='❌ Not quite. You will see this one again soon.';s.due=Date.now()+45e3;}
s.t=Date.now();st.doneToday=(st.doneToday||0)+1;seen();bumpStreak();save();stats();showEx();$('cont').hidden=false;spkShow();playEx();}
function showEx(){if(!cur.ex)return;$('exbox').hidden=false;$('ex').innerHTML=hl(cur);$('exEn').textContent=cur.exEn||'';}
function hl(c){const ex=c.ex||'',m=exTarget(c);if(!m)return esc(ex);
if(m.words){const ws=new Set(m.words);return ex.split(/([^\p{L}]+)/u).map(p=>ws.has(p.toLowerCase())?'<mark>'+esc(p)+'</mark>':esc(p)).join('');}
return esc(ex.slice(0,m.i))+'<mark>'+esc(ex.slice(m.i,m.i+m.L))+'</mark>'+esc(ex.slice(m.i+m.L));}
function showListen(){mode='recall';shown=false;lis=true;rev=false;$('front').textContent='🎧 Listen';$('tag').textContent='Listen';$('hint').textContent='What does the sentence mean?';
$('lisbox').hidden=false;$('listxt').hidden=true;$('listxt').textContent=cur.ex;labels();$('showbtn').hidden=false;playListen();}
// Sentence gap (learned words): the example sentence with the word blanked out. Type the missing word, then hear the full sentence.
function showGap(){const g=gapOf(cur);mode='recall';shown=false;gap=true;rev=false;$('say').hidden=true;
$('tag').textContent='Fill the gap · word';$('front').classList.add('sent');$('front').lang='nl';
$('front').innerHTML=esc(g.before)+'<span class="gap" aria-label="missing word">_____</span>'+esc(g.after);
$('fh').hidden=false;$('fh').textContent=cur.exEn||'';$('hint').textContent='Type the missing word. Meaning: '+cur.en;
$('typebox').hidden=false;$('typed').placeholder='Type the missing word';if(DESK)setTimeout(()=>{if(cur&&gap&&!shown)$('typed').focus();},50);
labels();$('showbtn').hidden=false;}
// learn=true: the same-session recall check for a new word (from English unless review direction is NL→EN).
function showRecall(learn){lis=false;gap=false;const kind=reviewKind(cur,st.cards[cur.id],{learn,gaps:st.gaps,listen:st.listen,listenP:LISTEN_P});
if(kind==='gap')return showGap();if(kind==='listen')return showListen();mode='recall';shown=false;rev=learn?st.dir!=='nl':(st.dir==='en'||(st.dir==='mix'&&Math.random()<.5));
$('tag').textContent=(learn?'Learning · ':'Review · ')+(cur.deck==='phr'?'phrase':'word');$('front').textContent=rev?cur.en:cur.nl;$('back').textContent=rev?cur.nl:cur.en;$('back').lang=rev?'nl':'en';
if(rev){$('typebox').hidden=false;$('hint').textContent=SR&&st.speak?'Say or type the Dutch':'Type the Dutch';if(DESK&&!st.show)setTimeout(()=>{if(cur&&mode==='recall'&&!shown)$('typed').focus();},50);}else{nlFront();$('hint').textContent='What does it mean?';speak();}
if(rev)spkShow();labels();if(st.show)reveal();else $('showbtn').hidden=false;}
function reveal(){if(mode!=='recall'||shown)return;if(gap){shown=true;const g=gapOf(cur),ty=$('typed').value.trim();$('typed').blur();$('showbtn').hidden=true;$('typebox').hidden=!ty;$('say').hidden=false;
$('front').innerHTML=esc(g.before)+'<mark>'+esc(g.answer)+'</mark>'+esc(g.after);$('back').hidden=false;$('back').lang='nl';$('back').textContent=cur.nl+' · '+cur.en;$('hint').textContent='';
if(ty){const m=gapCheck(ty,cur,typeMatch),d=()=>typeDiff(ty,g.answer).map(x=>x.ok?esc(x.t):'<del>'+esc(x.t)+'</del>').join('');
$('check').innerHTML=m.res==='correct'?'✅ Spot on!':m.why==='form'?'🟡 Right word. In this sentence it is <span lang="nl">'+esc(g.answer)+'</span>':m.res==='close'?'🟡 Close. You typed: <span class="diff" lang="nl">'+d()+'</span>':'✏️ You typed: <span class="diff" lang="nl">'+d()+'</span>';
$('check').style.color=m.res==='correct'?'var(--good)':m.res==='close'?'var(--hard)':'var(--again)';suggest(m.res==='correct'?4:m.res==='close'?3:0);}
$('btns').hidden=false;playEx();return;}
if(lis){shown=true;$('showbtn').hidden=true;$('lisbox').hidden=true;$('hint').textContent='';
$('front').textContent=cur.nl;$('front').lang='nl';$('back').hidden=false;$('back').textContent=cur.en;$('exbox').hidden=false;$('ex').innerHTML=hl(cur);$('exEn').textContent=cur.exEn||'';$('btns').hidden=false;spkShow();return;}
shown=true;$('showbtn').hidden=true;$('back').hidden=false;$('hint').textContent='';
// Typed answers: small typos and a wrong article count as Close, with the wrong letters marked. The result suggests a grade.
const ty=$('typed').value.trim();$('typed').blur();if(rev&&ty){const m=typeMatch(ty,cur.nl),d=()=>typeDiff(ty,cur.nl).map(x=>x.ok?esc(x.t):'<del>'+esc(x.t)+'</del>').join('');
$('check').innerHTML=m.res==='correct'?'✅ Spot on!':m.why==='article'?'🟡 Right word, wrong article: <span lang="nl">'+esc(cur.nl)+'</span>':m.res==='close'?'🟡 Close. You typed: <span class="diff" lang="nl">'+d()+'</span>':'✏️ You typed: <span class="diff" lang="nl">'+d()+'</span>';
$('check').style.color=m.res==='correct'?'var(--good)':m.res==='close'?'var(--hard)':'var(--again)';suggest(m.res==='correct'?4:m.res==='close'?3:0);}else if(rev&&saySug!==null)suggest(saySug);
if(rev)speak();else spkShow();showEx();$('btns').hidden=false;}
// Suggested grade: a ring and label on one button. All four buttons still work.
function suggest(q){sug=q;document.querySelectorAll('#btns button').forEach(b=>{const on=q!==null&&+b.dataset.q===q;b.classList.toggle('sug',on);b.setAttribute('aria-describedby',on?'sugl':'');});}
const fmt=s=>fmtIvl(s);
function labels(){[0,3,4,5].forEach(q=>$('n'+q).textContent=fmt(sched(q,st.cards[cur.id],gopt())));}
function grade(q){if(mode!=='recall'||!shown)return;const o=st.cards[cur.id],s=sched(q,o,gopt());
// Weak cards drill: Again brings the card back once more at the end of the drill.
if(drill&&q<3&&!drill.again[cur.id]){drill.again[cur.id]=1;drill.q.push(cur);}s.stage=s.reps>0?'rev':(o&&o.stage==='learn'?'learn':'rev');s.t=Date.now();st.cards[cur.id]=s;st.doneToday=(st.doneToday||0)+1;seen();bumpStreak();save();next();}
// Say it: speak the Dutch into the mic (Web Speech API, nl-NL). EN→NL recall: Correct/Close reveals the answer, then grade as usual.
// Other cards: pronunciation practice once the Dutch is on screen. Typing stays as the backup where recognition is missing.
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null;
const heard=(t,col)=>{$('heard').textContent=t;$('heard').style.color=col||'';};
function spkShow(){if(!st.speak||!cur||(!SR&&!(mode==='recall'&&rev)))return;$('spkbox').hidden=false;$('mic').disabled=!SR;
heard(SR?'':'🎤 Speaking practice isn’t available in this browser. Type instead.',SR?'':'var(--muted)');}
function micStop(){if(rec){const r=rec;rec=null;r.onresult=r.onerror=r.onend=null;try{r.abort();}catch(e){}}$('mic').classList.remove('on');$('mic').textContent='🎤 Say it';}
function micStart(){if(!SR||!cur)return;if(rec)return micStop();$('aud').pause();speechSynthesis.cancel();
const c=cur,r=new SR();let got=false;seq++;rec=r;r.lang='nl-NL';r.interimResults=false;r.continuous=false;r.maxAlternatives=5;
$('mic').classList.add('on');$('mic').textContent='● Listening…';heard('Say it in Dutch','var(--muted)');
r.onresult=e=>{got=true;if(c!==cur)return;const m=sayMatch([...e.results[0]].map(x=>x.transcript.trim()),c.nl),said='“'+m.heard+'”';
heard(m.res==='correct'?'✅ Correct! You said '+said:m.res==='close'?'🟡 Close. You said '+said:'❌ Try again. I heard '+said,m.res==='correct'?'var(--good)':m.res==='close'?'var(--hard)':'var(--again)');
if(mode==='recall'&&rev&&m.res!=='try'){saySug=m.res==='correct'?4:3;if(!shown)reveal();else if(!$('typed').value.trim())suggest(saySug);}};
r.onerror=e=>{got=true;const blocked='🎤 Microphone blocked. Allow mic access for this site in your browser settings, or type instead.';
const msg={'not-allowed':blocked,'service-not-allowed':blocked,'no-speech':'Didn’t catch that. Tap 🎤 and try again.','audio-capture':'No microphone found. Type instead.','network':'Speech recognition needs an internet connection. Type instead.','language-not-supported':'Dutch speech recognition isn’t available here. Type instead.'}[e.error];
if(msg!==undefined)heard(msg,'var(--muted)');else if(e.error!=='aborted')heard('Something went wrong with the mic. Tap 🎤 to try again.','var(--muted)');};
r.onend=()=>{if(rec!==r)return;rec=null;$('mic').classList.remove('on');$('mic').textContent='🎤 Say it';if(!got)heard('Didn’t catch that. Tap 🎤 and try again.','var(--muted)');};
try{r.start();}catch(e){rec=null;micStop();heard('Couldn’t start the mic. Tap 🎤 to try again.','var(--muted)');}}
$('mic').onclick=e=>{e.stopPropagation();micStart();};
$('spk').checked=!!st.speak&&!!SR;$('spk').disabled=!SR;if(!SR)$('spkn').textContent='Not available in this browser (try Chrome). Typing still works.';
$('spk').onchange=()=>{st.speak=$('spk').checked;save();if(!st.speak){micStop();$('spkbox').hidden=true;}else if(mode==='recall'&&(rev||shown)||mode==='mcdone')spkShow();};
function tts(t,done){const u=new SpeechSynthesisUtterance(t);if(done)u.onend=done;u.lang='nl-NL';const v=speechSynthesis.getVoices().find(v=>v.lang.replace('_','-').startsWith('nl'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);}
let seq=0; // bumped by every new playback so a pending word→sentence sequence stops
// Browsers block sound until the first tap: say so and offer a tap to play, instead of failing silently.
function blocked(e){if(e&&e.name==='NotAllowedError'&&lastAudio){$('unmute').hidden=false;}}
function play(src,text,done){seq++;const a=$('aud');a.onended=null;if(src){a.onended=done||null;a.onerror=()=>tts(text,done);a.src=src;a.play().then(()=>{$('unmute').hidden=true;},blocked);}else tts(text,done);}
function speak(){if(gap){if(shown)playEx();return;}if(cur){lastAudio=speak;play(cur.audio,cur.nl);}}
function playEx(){if(cur&&cur.ex){lastAudio=playEx;play(cur.exAudio,cur.ex);}}
// Listening questions: word cards say the word, pause, then the sentence (study.js listenQueue); phrase cards just the sentence.
function playListen(){lastAudio=playListen;const c=cur,q=listenQueue(c);let tok;const step=i=>{if(tok!==undefined&&tok!==seq||c!==cur||!lis||shown)return;const it=q[i];if(!it)return;
if(it.pause){setTimeout(()=>step(i+1),it.pause);return;}play(it.src,it.text,()=>step(i+1));tok=seq;};step(0);}
$('unmute').onclick=e=>{e.stopPropagation();$('unmute').hidden=true;if(lastAudio)lastAudio();};
$('showbtn').onclick=reveal;$('cont').onclick=()=>{if(mode==='welcome'){st.seenIntro=1;save();}next();};
$('typed').onkeydown=e=>{if(e.key==='Enter'&&!shown){e.preventDefault();e.stopPropagation();reveal();}};
document.querySelectorAll('#btns button').forEach(b=>b.onclick=e=>{e.stopPropagation();grade(+b.dataset.q);});
$('say').onclick=()=>lis&&!shown?playListen():speak();$('replay').onclick=playListen;$('showtxt').onclick=()=>$('listxt').hidden=false;
$('gapsw').checked=!!st.gaps;$('gapsw').onchange=()=>{st.gaps=$('gapsw').checked;save();};$('lis').checked=!!st.listen;$('lis').onchange=()=>{st.listen=$('lis').checked;save();};$('exsay').onclick=e=>{e.stopPropagation();playEx();};
$('more10').onclick=()=>{st.extra=(st.extra||0)+10;if(left<=0)left=st.left=SESSION;save();next();};
$('tophr').onclick=()=>setDeck('phr');$('weak').onclick=startWeak;$('weakgo').onclick=startWeak;
$('ahead').onclick=()=>{ahead=true;if(left<=0){left=st.left=SESSION;save();}next();};
$('show').checked=!!st.show;$('show').onchange=()=>{st.show=$('show').checked;save();if(mode==='recall'&&st.show)reveal();};
const setDir=()=>document.querySelectorAll('#dir button').forEach(b=>{b.classList.toggle('on',b.dataset.v===st.dir);b.setAttribute('aria-pressed',b.dataset.v===st.dir);});setDir();
document.querySelectorAll('#dir button').forEach(b=>b.onclick=()=>{st.dir=b.dataset.v;save();setDir();});
const setNpd=()=>$('npd').textContent=(st.npd??NEW_PER_DAY);setNpd();
const npd=d=>{st.npd=Math.max(5,Math.min(50,(st.npd??NEW_PER_DAY)+d));save();setNpd();if(mode==='done')next();else stats();};$('npdm').onclick=()=>npd(-5);$('npdp').onclick=()=>npd(5);
const isSet=()=>document.body.classList.contains('set');
const openSet=o=>{const was=isSet();document.body.classList.toggle('set',o);$('sheet').inert=!o;$('sheet').setAttribute('aria-hidden',!o);if(o){stats();weakUI();$('resetbox').hidden=true;setTimeout(()=>$('close').focus(),50);}else if(was)$('gear').focus();};
$('gear').onclick=()=>openSet(true);$('close').onclick=$('scrim').onclick=()=>openSet(false);
// Keyboard (desktop): Space/Enter show answer, 1-4 grade (Enter = suggested grade), 1-3 pick a meaning, Enter/Space continue, R replay.
document.addEventListener('keydown',e=>{if(e.key==='Escape'){openSet(false);return;}if(isSet()||e.metaKey||e.ctrlKey||e.altKey)return;
const t=e.target,inTyped=t===$('typed');if(!inTyped&&(t.tagName==='INPUT'||t.tagName==='BUTTON'&&(e.key===' '||e.key==='Enter')))return;if(e.repeat)return;
const k=e.key,go=f=>{e.preventDefault();f();};
if((k==='r'||k==='R')&&!inTyped&&cur&&mode!=='done'&&mode!=='welcome')return go(()=>lis&&!shown?playListen():speak());
if(mode==='mc'){const b=$('mc').children[+k-1];if(/^[1-3]$/.test(k)&&b)go(()=>b.click());return;}
if(mode==='mcdone'||mode==='welcome'){if(k==='Enter'||k===' ')go(()=>$('cont').click());return;}
if(mode!=='recall'||inTyped)return;
if(!shown){if(k===' '||k==='Enter')go(reveal);return;}
const q={'1':0,'2':3,'3':4,'4':5}[k];if(q!==undefined)go(()=>grade(q));else if(k==='Enter'||k===' ')go(()=>grade(sug??4));});
$('kbd').hidden=!DESK;
// Welcome (first visit, and from Settings): how the app works. The Start tap also unlocks sound.
function showWelcome(){hideAll();mode='welcome';cur=null;stats();anim();$('say').hidden=true;$('front').textContent='Welkom! 👋';$('welcome').hidden=false;$('cont').hidden=false;$('cont').textContent='Start learning';}
$('how').onclick=()=>{openSet(false);showWelcome();};
// Reset progress: confirm first, with a backup offered. Keeps your settings.
$('reset').onclick=()=>{$('resetbox').hidden=false;$('resetno').focus();};$('resetno').onclick=()=>$('resetbox').hidden=true;$('resetexp').onclick=()=>$('exp').click();
$('resetyes').onclick=()=>{for(const k of ['cards','streak','last','newDay','newCount','extra','doneToday','seenToday','left','backupAsk'])delete st[k];st.cards={};st.streak=0;st.newCount=0;newDay();left=st.left=SESSION;save();openSet(false);ahead=false;drill=null;lastId=null;next();};
$('bkup').onclick=()=>$('exp').click();
$('exp').onclick=async()=>{st.lastExport=Date.now();save();const code='DFC1:'+btoa(unescape(encodeURIComponent(JSON.stringify(st))));
try{await navigator.clipboard.writeText(code);}catch(e){}
const b=new Blob([code],{type:'text/plain'}),l=document.createElement('a');l.href=URL.createObjectURL(b);l.download='dutch-progress-'+today()+'.txt';l.click();
alert('Progress code copied to clipboard and downloaded as a file. On your other device, tap Import and paste the code (or pick the file).');};
function merge(txt){try{txt=txt.trim();const o=JSON.parse(decodeURIComponent(escape(atob(txt.replace(/^DFC1:/,'')))));let n=0;
for(const[id,c]of Object.entries(o.cards||{})){const m=st.cards[id];if(!m||(c.t||0)>(m.t||0)){st.cards[id]=c;n++;}}
if((o.last||'')>(st.last||'')){st.last=o.last;st.streak=o.streak;}else if(o.last===st.last)st.streak=Math.max(st.streak,o.streak);
if(o.newDay===st.newDay)st.newCount=Math.max(st.newCount,o.newCount);fixStreak();save();alert('Imported: '+n+' cards updated.');next();}catch(e){alert('That code did not work. Copy the whole code starting with DFC1:');}}
$('imp').onclick=()=>{const t=prompt('Paste your progress code (or press Cancel to choose a file):');if(t)merge(t);else $('impf').click();};
$('impf').onchange=e=>{const f=e.target.files[0];if(f)f.text().then(merge);};
// 15-minute session: counts down only while studying, survives a reload (per day), and never cuts off the card you're on.
const showT=()=>$('timer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');showT();
setInterval(()=>{if(dayCheck()&&mode==='done')next();showT();if(document.hidden||left<=0||mode==='done'||mode==='welcome')return;left--;st.left=left;save();showT();},1000);

function setDeck(k){st.deckSel=k;save();deck=all.filter(c=>(c.deck||'top')===k);
document.querySelectorAll('#decks button').forEach(b=>{b.classList.toggle('on',b.dataset.d===k);b.setAttribute('aria-pressed',b.dataset.d===k);});ahead=false;if(drill){drill=null;cur=null;}if(cur&&deck.includes(cur)&&(mode==='mc'||mode==='recall')){stats();return;}next();}
document.querySelectorAll('#decks button').forEach(b=>b.onclick=()=>setDeck(b.dataset.d));
Promise.all(['phrases.json','deck.json'].map(f=>fetch(f).then(r=>r.json()))).then(([p,d])=>{d=d.map(c=>Object.assign({deck:'top'},c));
// New-card order for Top words: days first, then months + time words, then the rest.
const isDay=c=>c.mcg==='day',cal=[...d.filter(c=>c.mcg==='month'),...d.filter(c=>/^t\d/.test(c.id)||[267,268,269].includes(c.id))];
const days=d.filter(isDay),rest=d.filter(c=>!isDay(c)&&!cal.includes(c));all=[...days,...cal,...p,...rest];setDeck(st.deckSel);});
