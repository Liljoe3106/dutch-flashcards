const NEW_PER_DAY=15,SESSION=15*60,K='dfc_v1',DAY=864e5,MC_NEED=2;
const st=JSON.parse(localStorage.getItem(K)||'{"cards":{},"streak":0,"last":null,"newDay":null,"newCount":0}');
if(!st.migr2){st.show=false;st.migr2=1;}
if(!st.dir)st.dir=st.rev?'en':'mix';
if(!st.deckSel)st.deckSel='both';
if(st.listen===undefined)st.listen=true;const LISTEN_P=.25;let lis=false;
const save=()=>localStorage.setItem(K,JSON.stringify(st));
const today=()=>new Date().toLocaleDateString('en-CA');
if(st.newDay!==today()){st.newDay=today();st.newCount=0;st.extra=0;st.doneToday=0;}
save();
let all=[],deck=[],cur=null,mode=null,rev=false,shown=false,left=SESSION,ahead=false,lastId=null;
const $=id=>document.getElementById(id);
const lim=()=>(st.npd??NEW_PER_DAY)+(st.extra||0);
const stage=c=>{const s=st.cards[c.id];return !s?'new':(s.stage||'rev');};
const due=()=>{const n=Date.now();return deck.filter(c=>st.cards[c.id]&&st.cards[c.id].due<=n);};
let CAL=new Set();
function fresh(){const f=deck.filter(c=>!st.cards[c.id]);if(st.deckSel!=='both')return f;
// Both: this week's phrases lead (2 phrases : 1 day/month/time word), so funeral phrases come first and days still come early; then other top words.
const ph=f.filter(c=>c.deck==='phr'),ca=[...f.filter(c=>c.mcg==='day'),...f.filter(c=>CAL.has(c.id))],o=[];
for(let i=0,j=0;i<ph.length||j<ca.length;){if(i<ph.length)o.push(ph[i++]);if(i<ph.length)o.push(ph[i++]);if(j<ca.length)o.push(ca[j++]);}
return o.concat(f.filter(c=>c.mcg!=='day'&&c.deck!=='phr'&&!CAL.has(c.id)));}
function stats(){const du=due().length,nl=Math.max(0,Math.min(lim()-st.newCount,fresh().length)),lr=c=>stage(c)==='rev'&&st.cards[c.id].ivl>=1;
const intro=deck.filter(c=>stage(c)==='intro').length,done=st.doneToday||0,tot=done+du+nl+intro;
$('sDue').textContent=du;$('sNew').textContent=nl;$('sLearned').textContent=deck.filter(lr).length;$('sStreak').textContent=st.streak;$('sToday').textContent=done;
$('sPhr').textContent=all.filter(c=>c.deck==='phr'&&lr(c)).length;$('sTop').textContent=all.filter(c=>c.deck!=='phr'&&lr(c)).length;
$('sMature').textContent=all.filter(c=>lr(c)&&st.cards[c.id].ivl>=21).length;$('sSeen').textContent=all.filter(c=>st.cards[c.id]).length;$('sTotal').textContent=all.length;
$('pbar').style.width=(tot?Math.round(done/tot*100):100)+'%';$('ptext').textContent=tot&&done<tot?done+' / '+tot+' today':done?'All done today ✓':'Today';}
function anim(){const c=$('card');c.classList.remove('in');void c.offsetWidth;c.classList.add('in');}
function bumpStreak(){if(st.last!==today()){const y=new Date(Date.now()-DAY).toLocaleDateString('en-CA');st.streak=st.last===y?st.streak+1:1;st.last=today();}}
function hideAll(){$('say').hidden=false;$('tag').textContent='';['back','typebox','exbox','showbtn','cont','btns','lisbox','donebox'].forEach(i=>$(i).hidden=true);$('mc').innerHTML='';$('more').style.display='none';$('hint').textContent='';$('check').textContent='';$('typed').value='';}
function pick(){const d=due().filter(c=>c.id!==lastId||due().length===1).sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
if(d.length)return d[0];
if(st.newCount<lim()&&fresh().length)return fresh()[0];
const intro=deck.filter(c=>stage(c)==='intro').sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
const i2=intro.filter(c=>c.id!==lastId);if(i2.length)return i2[0];if(intro.length)return intro[0];
if(ahead){return deck.filter(c=>stage(c)==='rev').sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due)[0]||null;}
return null;}
function next(){hideAll();cur=left>0?pick():null;stats();anim();
if(!cur){mode='done';$('say').hidden=true;$('front').textContent=left<=0?'⏰ 15 minutes done':'🎉 Done for today';$('hint').textContent=left<=0?'Nice work. Come back tomorrow, or keep going.':'Everything due is done. Want to keep going?';
$('donebox').hidden=false;$('donebox').innerHTML='<div class="stat"><b>'+(st.doneToday||0)+'</b><span>Answered</span></div><div class="stat"><b>'+$('sLearned').textContent+'</b><span>Learned</span></div><div class="stat"><b>'+st.streak+'🔥</b><span>Streak</span></div>';
$('more').style.display='flex';$('ahead').hidden=!deck.some(c=>stage(c)==='rev');return;}
lastId=cur.id;
if(stage(cur)==='new'){st.cards[cur.id]={stage:'intro',mc:0,ef:2.5,ivl:0,reps:0,due:Date.now(),t:Date.now()};st.newCount++;save();}
if(stage(cur)==='intro')showMC();else showRecall();}
function typeOf(c){return c.en.startsWith('the ')?'n':c.en.startsWith('to ')?'v':'o';}
const STOP=new Set('the a an to you your i im it its is of for with that this me my be do does can could would some one up on in at and or so not are was what how be there here out please informal polite casual words'.split(' '));
const toks=c=>new Set(c.en.toLowerCase().replace(/[’']/g,'').split(/[^a-z]+/).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.replace(/(ing|s)$/,'')));
function overlap(a,b){if((a.grp||[]).some(g=>(b.grp||[]).includes(g)))return true;const ta=toks(a);for(const t of toks(b))if(ta.has(t))return true;return false;}
function showMC(){mode='mc';$('tag').textContent='New · '+(cur.deck==='phr'?'phrase':'word');$('front').textContent=cur.nl;$('hint').textContent='Which is the meaning?';speak();
const t=typeOf(cur),same=cur.mcg?all.filter(c=>c.mcg===cur.mcg&&c.id!==cur.id&&c.en!==cur.en):all.filter(c=>(c.deck||'top')===(cur.deck||'top')&&c.id!==cur.id&&c.en!==cur.en);let pool=cur.deck==='phr'||cur.mcg?same:same.filter(c=>typeOf(c)===t);if(pool.length<2)pool=same;
pool=pool.sort(()=>Math.random()-.5);const ch=[];for(const c of pool){if(ch.length>=2)break;if(cur.mcg||[cur,...ch].every(o=>!overlap(o,c)))ch.push(c);}for(const c of pool){if(ch.length>=2)break;if(!ch.includes(c)&&!overlap(cur,c))ch.push(c);}pool=ch;const opts=[cur,...pool].sort(()=>Math.random()-.5);
opts.forEach(o=>{const b=document.createElement('button');b.className='opt';b.textContent=o.en;b.onclick=()=>answerMC(b,o.id===cur.id);$('mc').appendChild(b);});}
function answerMC(btn,ok){if(mode!=='mc')return;mode='mcdone';const s=st.cards[cur.id];
[...$('mc').children].forEach(b=>{b.disabled=true;if(b.textContent===cur.en)b.classList.add('right');});
if(ok){s.mc++;$('hint').textContent=s.mc>=MC_NEED?'✅ Correct! Moving to recall practice.':'✅ Correct!';
if(s.mc>=MC_NEED){s.stage='rev';s.reps=1;s.ivl=1;s.due=Date.now()+DAY;}else s.due=Date.now()+90e3;}
else{btn.classList.add('wrong');$('hint').textContent='❌ Not quite. You will see this one again soon.';s.due=Date.now()+45e3;}
s.t=Date.now();st.doneToday=(st.doneToday||0)+1;bumpStreak();save();stats();showEx();$('cont').hidden=false;playEx();}
function showEx(){if(!cur.ex)return;$('exbox').hidden=false;$('ex').innerHTML=hl(cur);$('exEn').textContent=cur.exEn||'';}
function hl(c){const esc=t=>t.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]),ex=c.ex||'';
let t=c.nl.replace(/\.\.\./g,'').replace(/[.!?,]+$/,'').replace(/^(de|het|een)\s+/i,'').trim();if(c.deck!=='phr')t=t.split(/\s*[\/(]/)[0].trim();if(c.hl)t=c.hl;
const re=s=>new RegExp('(^|[^\\p{L}])('+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?=[^\\p{L}]|$)','iu');
let m=t&&ex.match(re(t));if(!m&&t&&!t.includes(' ')&&t.length>3)m=ex.match(new RegExp('(^|[^\\p{L}])('+t.slice(0,Math.max(3,t.length-2)).replace(/[.*+?^${}()|[\]\\]/g,'')+'\\p{L}*)','iu'));
if(!m&&t.includes(' ')){const ws=new Set(t.toLowerCase().split(/[^\p{L}]+/u).filter(w=>w.length>1));if(ws.size)return ex.split(/([^\p{L}]+)/u).map(p=>ws.has(p.toLowerCase())?'<mark>'+esc(p)+'</mark>':esc(p)).join('');}
if(!m)return esc(ex);const i=m.index+m[1].length,L=m[2].length;return esc(ex.slice(0,i))+'<mark>'+esc(ex.slice(i,i+L))+'</mark>'+esc(ex.slice(i+L));}
function showListen(){mode='recall';shown=false;lis=true;rev=false;$('front').textContent='🎧 Listen';$('tag').textContent='Listen';$('hint').textContent='What does the sentence mean?';
$('lisbox').hidden=false;$('listxt').hidden=true;$('listxt').textContent=cur.ex;labels();$('showbtn').hidden=false;playEx();}
function showRecall(){lis=false;if(st.listen&&cur.ex&&Math.random()<LISTEN_P)return showListen();mode='recall';shown=false;rev=st.dir==='en'||(st.dir==='mix'&&Math.random()<.5);
$('tag').textContent='Review · '+(cur.deck==='phr'?'phrase':'word');$('front').textContent=rev?cur.en:cur.nl;$('back').textContent=rev?cur.nl:cur.en;
if(rev){$('typebox').hidden=false;$('hint').textContent='Say or type the Dutch';}else{$('hint').textContent='What does it mean?';speak();}
labels();if(st.show)reveal();else $('showbtn').hidden=false;}
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/^\s*(de|het|een)\s+/,'').replace(/\s+/g,' ').trim();
function reveal(){if(mode!=='recall'||shown)return;if(lis){shown=true;$('showbtn').hidden=true;$('lisbox').hidden=true;$('hint').textContent='';
$('front').textContent=cur.nl;$('back').hidden=false;$('back').textContent=cur.en;$('exbox').hidden=false;$('ex').innerHTML=hl(cur);$('exEn').textContent=cur.exEn||'';$('btns').hidden=false;return;}
shown=true;$('showbtn').hidden=true;$('back').hidden=false;$('hint').textContent='';
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
function grade(q){const s=sched(q,st.cards[cur.id]);s.stage='rev';s.t=Date.now();st.cards[cur.id]=s;st.doneToday=(st.doneToday||0)+1;bumpStreak();save();next();}
function tts(t){const u=new SpeechSynthesisUtterance(t);u.lang='nl-NL';const v=speechSynthesis.getVoices().find(v=>v.lang.replace('_','-').startsWith('nl'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);}
function play(src,text){const a=$('aud');if(src){a.onerror=()=>tts(text);a.src=src;a.play().catch(()=>{});}else tts(text);}
function speak(){if(cur)play(cur.audio,cur.nl);}
function playEx(){if(cur&&cur.ex)play(cur.exAudio,cur.ex);}
$('showbtn').onclick=reveal;$('cont').onclick=next;
$('typed').onkeydown=e=>{if(e.key==='Enter')reveal();};
document.querySelectorAll('#btns button').forEach(b=>b.onclick=e=>{e.stopPropagation();grade(+b.dataset.q);});
$('say').onclick=()=>lis&&!shown?playEx():speak();$('replay').onclick=playEx;$('showtxt').onclick=()=>$('listxt').hidden=false;
$('lis').checked=!!st.listen;$('lis').onchange=()=>{st.listen=$('lis').checked;save();};$('exsay').onclick=e=>{e.stopPropagation();playEx();};
$('more10').onclick=()=>{st.extra=(st.extra||0)+10;save();if(left<=0)left=SESSION;next();};
$('ahead').onclick=()=>{ahead=true;if(left<=0)left=SESSION;next();};
$('show').checked=!!st.show;$('show').onchange=()=>{st.show=$('show').checked;save();if(mode==='recall'&&st.show)reveal();};
const setDir=()=>document.querySelectorAll('#dir button').forEach(b=>b.classList.toggle('on',b.dataset.v===st.dir));setDir();
document.querySelectorAll('#dir button').forEach(b=>b.onclick=()=>{st.dir=b.dataset.v;save();setDir();});
const setNpd=()=>$('npd').textContent=(st.npd??NEW_PER_DAY);setNpd();
const npd=d=>{st.npd=Math.max(5,Math.min(50,(st.npd??NEW_PER_DAY)+d));save();setNpd();if(mode==='done')next();else stats();};$('npdm').onclick=()=>npd(-5);$('npdp').onclick=()=>npd(5);
const openSet=o=>{document.body.classList.toggle('set',o);if(o)stats();};$('gear').onclick=()=>openSet(true);$('close').onclick=$('scrim').onclick=()=>openSet(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape')openSet(false);});
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
const DECKS={both:'Both (phrases first)',phr:'📌 Phrases this week',top:'📚 Top words'};
function setDeck(k){st.deckSel=k;save();deck=k==='both'?all:all.filter(c=>(c.deck||'top')===k);
document.querySelectorAll('#decks button').forEach(b=>b.classList.toggle('on',b.dataset.d===k));ahead=false;if(cur&&deck.includes(cur)&&(mode==='mc'||mode==='recall')){stats();return;}next();}
document.querySelectorAll('#decks button').forEach(b=>b.onclick=()=>setDeck(b.dataset.d));
Promise.all(['phrases.json','deck.json'].map(f=>fetch(f).then(r=>r.json()))).then(([p,d])=>{d=d.map(c=>Object.assign({deck:'top'},c));
// New-card order: days first, then months + time words; in Both mode days lead, then phrases alternate with months/time words.
const isDay=c=>c.mcg==='day',cal=[...d.filter(c=>c.mcg==='month'),...d.filter(c=>/^t\d/.test(c.id)||[267,268,269].includes(c.id))];
const days=d.filter(isDay),rest=d.filter(c=>!isDay(c)&&!cal.includes(c));CAL=new Set(cal.map(c=>c.id));all=[...days,...cal,...p,...rest];setDeck(DECKS[st.deckSel]?st.deckSel:'both');});
