const NEW_PER_DAY=15,SESSION=15*60,K='dfc_v1',DAY=864e5,MC_NEED=2;
const st=JSON.parse(localStorage.getItem(K)||'{"cards":{},"streak":0,"last":null,"newDay":null,"newCount":0}');
if(!st.migr2){st.show=false;st.migr2=1;}
if(!st.dir)st.dir=st.rev?'en':'mix';
const save=()=>localStorage.setItem(K,JSON.stringify(st));
const today=()=>new Date().toLocaleDateString('en-CA');
if(st.newDay!==today()){st.newDay=today();st.newCount=0;st.extra=0;}
save();
let deck=[],cur=null,mode=null,rev=false,shown=false,left=SESSION,ahead=false,lastId=null;
const $=id=>document.getElementById(id);
const lim=()=>NEW_PER_DAY+(st.extra||0);
const stage=c=>{const s=st.cards[c.id];return !s?'new':(s.stage||'rev');};
const due=()=>{const n=Date.now();return deck.filter(c=>st.cards[c.id]&&st.cards[c.id].due<=n);};
const fresh=()=>deck.filter(c=>!st.cards[c.id]);
function stats(){$('sDue').textContent=due().length;$('sNew').textContent=Math.max(0,Math.min(lim()-st.newCount,fresh().length));
$('sLearned').textContent=deck.filter(c=>stage(c)==='rev'&&st.cards[c.id].ivl>=1).length;$('sStreak').textContent=st.streak;}
function bumpStreak(){if(st.last!==today()){const y=new Date(Date.now()-DAY).toLocaleDateString('en-CA');st.streak=st.last===y?st.streak+1:1;st.last=today();}}
function hideAll(){['back','typebox','exbox','showbtn','cont','btns'].forEach(i=>$(i).hidden=true);$('mc').innerHTML='';$('more').style.display='none';$('hint').textContent='';$('check').textContent='';$('typed').value='';}
function pick(){const d=due().filter(c=>c.id!==lastId||due().length===1).sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
if(d.length)return d[0];
if(st.newCount<lim()&&fresh().length)return fresh()[0];
const intro=deck.filter(c=>stage(c)==='intro').sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
const i2=intro.filter(c=>c.id!==lastId);if(i2.length)return i2[0];if(intro.length)return intro[0];
if(ahead){return deck.filter(c=>stage(c)==='rev').sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due)[0]||null;}
return null;}
function next(){hideAll();cur=left>0?pick():null;stats();
if(!cur){$('front').textContent=left<=0?'⏰ 15 minutes done!':'🎉 Done for today!';$('hint').textContent=left<=0?'Come back tomorrow, or keep going:':'Want to keep going?';
$('more').style.display='flex';$('ahead').hidden=!deck.some(c=>stage(c)==='rev');return;}
lastId=cur.id;
if(stage(cur)==='new'){st.cards[cur.id]={stage:'intro',mc:0,ef:2.5,ivl:0,reps:0,due:Date.now(),t:Date.now()};st.newCount++;save();}
if(stage(cur)==='intro')showMC();else showRecall();}
function typeOf(c){return c.en.startsWith('the ')?'n':c.en.startsWith('to ')?'v':'o';}
function showMC(){mode='mc';$('front').textContent=cur.nl;$('hint').textContent='Which is the meaning?';speak();
const t=typeOf(cur);let pool=deck.filter(c=>c.id!==cur.id&&c.en!==cur.en&&typeOf(c)===t);if(pool.length<2)pool=deck.filter(c=>c.id!==cur.id&&c.en!==cur.en);
pool=pool.sort(()=>Math.random()-.5).slice(0,2);const opts=[cur,...pool].sort(()=>Math.random()-.5);
opts.forEach(o=>{const b=document.createElement('button');b.className='opt';b.textContent=o.en;b.onclick=()=>answerMC(b,o.id===cur.id);$('mc').appendChild(b);});}
function answerMC(btn,ok){if(mode!=='mc')return;mode='mcdone';const s=st.cards[cur.id];
[...$('mc').children].forEach(b=>{b.disabled=true;if(b.textContent===cur.en)b.classList.add('right');});
if(ok){s.mc++;$('hint').textContent=s.mc>=MC_NEED?'✅ Correct! Moving to recall practice.':'✅ Correct!';
if(s.mc>=MC_NEED){s.stage='rev';s.reps=1;s.ivl=1;s.due=Date.now()+DAY;}else s.due=Date.now()+90e3;}
else{btn.classList.add('wrong');$('hint').textContent='❌ Not quite. You will see this one again soon.';s.due=Date.now()+45e3;}
s.t=Date.now();bumpStreak();save();showEx();$('cont').hidden=false;playEx();}
function showEx(){if(!cur.ex)return;$('exbox').hidden=false;$('ex').textContent=cur.ex;$('exEn').textContent=cur.exEn||'';}
function showRecall(){mode='recall';shown=false;rev=st.dir==='en'||(st.dir==='mix'&&Math.random()<.5);
$('front').textContent=rev?cur.en:cur.nl;$('back').textContent=rev?cur.nl:cur.en;
if(rev){$('typebox').hidden=false;$('hint').textContent='Say or type the Dutch';}else{$('hint').textContent='What does it mean?';speak();}
labels();if(st.show)reveal();else $('showbtn').hidden=false;}
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/^\s*(de|het|een)\s+/,'').replace(/\s+/g,' ').trim();
function reveal(){if(mode!=='recall'||shown)return;shown=true;$('showbtn').hidden=true;$('back').hidden=false;$('hint').textContent='';
const ty=$('typed').value.trim();if(rev&&ty){const ok=norm(ty)===norm(cur.nl.replace(/\.\.\./g,''));$('check').textContent=ok?'✅ Spot on!':'✏️ You typed: '+ty;$('check').style.color=ok?'#27ae60':'#c0392b';}
if(rev)speak();showEx();$('btns').hidden=false;}
function sched(q,o){const s=Object.assign({ef:2.5,ivl:0,reps:0,due:0},o||{});
const early=ahead&&o&&o.due>Date.now()&&o.reps>0;
if(early&&q>=3){const el=Math.max(1,(Date.now()-(o.t||Date.now()))/DAY);s.reps++;s.ivl=Math.max(s.ivl,Math.round(el*s.ef*(q==3?.8:q==5?1.3:1)));s.due=Date.now()+s.ivl*DAY;return s;}
if(q<3){s.reps=0;s.ivl=0;s.due=Date.now()+60e3;}else{
s.reps++;s.ivl=Math.max(1,s.reps==1?(q==5?4:1):s.reps==2?(q==3?3:6):Math.round(s.ivl*s.ef*(q==3?.8:q==5?1.3:1)));
s.ef=Math.max(1.3,s.ef+0.1-(5-q)*(0.08+(5-q)*0.02));s.due=Date.now()+s.ivl*DAY;}return s;}
const fmt=s=>s.ivl==0?'1 min':s.ivl==1?'1 day':s.ivl<31?s.ivl+' days':s.ivl<365?Math.round(s.ivl/30)+' mo':(s.ivl/365).toFixed(1)+' yr';
function labels(){[0,3,4,5].forEach(q=>$('n'+q).textContent=fmt(sched(q,st.cards[cur.id])));}
function grade(q){const s=sched(q,st.cards[cur.id]);s.stage='rev';s.t=Date.now();st.cards[cur.id]=s;bumpStreak();save();next();}
function tts(t){const u=new SpeechSynthesisUtterance(t);u.lang='nl-NL';const v=speechSynthesis.getVoices().find(v=>v.lang.replace('_','-').startsWith('nl'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);}
function play(src,text){const a=$('aud');if(src){a.onerror=()=>tts(text);a.src=src;a.play().catch(()=>{});}else tts(text);}
function speak(){if(cur)play(cur.audio,cur.nl);}
function playEx(){if(cur&&cur.ex)play(cur.exAudio,cur.ex);}
$('showbtn').onclick=reveal;$('cont').onclick=next;
$('typed').onkeydown=e=>{if(e.key==='Enter')reveal();};
document.querySelectorAll('#btns button').forEach(b=>b.onclick=e=>{e.stopPropagation();grade(+b.dataset.q);});
$('say').onclick=speak;$('exsay').onclick=e=>{e.stopPropagation();playEx();};
$('more10').onclick=()=>{st.extra=(st.extra||0)+10;save();if(left<=0)left=SESSION;next();};
$('ahead').onclick=()=>{ahead=true;if(left<=0)left=SESSION;next();};
const setShow=()=>$('show').textContent='Show answers immediately (easy mode): '+(st.show?'ON':'OFF');setShow();
$('show').onclick=()=>{st.show=!st.show;save();setShow();if(mode==='recall'&&st.show)reveal();};
const DIRS={mix:'Mixed',nl:'NL → EN',en:'EN → NL'};const setDir=()=>$('dir').textContent='Direction (reviews): '+DIRS[st.dir];setDir();
$('dir').onclick=()=>{st.dir=st.dir==='mix'?'nl':st.dir==='nl'?'en':'mix';save();setDir();};
$('exp').onclick=async()=>{const code='DFC1:'+btoa(unescape(encodeURIComponent(JSON.stringify(st))));
try{await navigator.clipboard.writeText(code);}catch(e){}
const b=new Blob([code],{type:'text/plain'}),l=document.createElement('a');l.href=URL.createObjectURL(b);l.download='dutch-progress-'+today()+'.txt';l.click();
alert('Progress code copied to clipboard and downloaded as a file. On your other device, tap Import and paste the code (or pick the file).');};
function merge(txt){try{txt=txt.trim();const o=JSON.parse(decodeURIComponent(escape(atob(txt.replace(/^DFC1:/,'')))));let n=0;
for(const[id,c]of Object.entries(o.cards||{})){const m=st.cards[id];if(!m||(c.t||0)>(m.t||0)){st.cards[id]=c;n++;}}
if((o.last||'')>(st.last||'')){st.last=o.last;st.streak=o.streak;}else if(o.last===st.last)st.streak=Math.max(st.streak,o.streak);
if(o.newDay===st.newDay)st.newCount=Math.max(st.newCount,o.newCount);save();alert('Imported: '+n+' cards updated.');next();}catch(e){alert('That code did not work. Copy the whole code starting with DFC1:');}}
$('imp').onclick=()=>{const t=prompt('Paste your progress code (or press Cancel to choose a file):');if(t)merge(t);else $('impf').click();};
$('impf').onchange=e=>{const f=e.target.files[0];if(f)f.text().then(merge);};
setInterval(()=>{if(document.hidden||left<=0)return;left--;$('timer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');if(left==0&&mode!=='mcdone')next();},1000);
fetch('deck.json').then(r=>r.json()).then(d=>{deck=d;next();});
