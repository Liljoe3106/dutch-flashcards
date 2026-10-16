const NEW_PER_DAY=15,SESSION=15*60,K='dfc_v1';
const st=JSON.parse(localStorage.getItem(K)||'{"cards":{},"rev":false,"streak":0,"last":null,"newDay":null,"newCount":0,"show":true}');
const save=()=>localStorage.setItem(K,JSON.stringify(st));
const today=()=>new Date().toLocaleDateString('en-CA');const DAY=864e5;
let deck=[],cur=null,shown=false,left=SESSION,tick=null;
const $=id=>document.getElementById(id);
if(st.show===undefined)st.show=true;
if(st.newDay!==today()){st.newDay=today();st.newCount=0;save();}
function due(){const n=Date.now();return deck.filter(c=>st.cards[c.id]&&st.cards[c.id].due<=n);}
function fresh(){return deck.filter(c=>!st.cards[c.id]);}
function stats(){$('sDue').textContent=due().length;$('sNew').textContent=Math.max(0,Math.min(NEW_PER_DAY-st.newCount,fresh().length));
$('sLearned').textContent=Object.values(st.cards).filter(s=>s.reps>0&&s.ivl>=1).length;$('sStreak').textContent=st.streak;}
function next(){const d=due().sort((a,b)=>st.cards[a.id].due-st.cards[b.id].due);
cur=d[0]||(st.newCount<NEW_PER_DAY?fresh()[0]:null);shown=false;$('back').hidden=true;$('btns').hidden=true;
if(!cur||left<=0){$('front').textContent=left<=0?'⏰ 15 minutes done!':'🎉 All done for today!';$('hint').textContent='Come back tomorrow';stats();return;}
$('front').textContent=st.rev?cur.en:cur.nl;$('back').textContent=st.rev?cur.nl:cur.en;$('hint').textContent='Tap to reveal';stats();labels();
if(st.show||!st.cards[cur.id]){reveal(true);}
if(!st.rev)speak();}
function reveal(auto){if(!cur||shown)return;shown=true;$('back').hidden=false;$('btns').hidden=false;$('hint').textContent='';if(st.rev&&auto!==true)speak();}
function sched(q,o){const s=Object.assign({ef:2.5,ivl:0,reps:0,due:0},o||{});
if(q<3){s.reps=0;s.ivl=0;s.due=Date.now()+60e3;}else{
s.reps++;s.ivl=Math.max(1,s.reps==1?(q==5?4:1):s.reps==2?(q==3?3:6):Math.round(s.ivl*s.ef*(q==3?.8:q==5?1.3:1)));
s.ef=Math.max(1.3,s.ef+0.1-(5-q)*(0.08+(5-q)*0.02));s.due=Date.now()+s.ivl*DAY;}return s;}
const fmt=s=>s.ivl==0?'1 min':s.ivl==1?'1 day':s.ivl<31?s.ivl+' days':s.ivl<365?Math.round(s.ivl/30)+' mo':(s.ivl/365).toFixed(1)+' yr';
function labels(){[0,3,4,5].forEach(q=>$('n'+q).textContent=fmt(sched(q,st.cards[cur.id])));}
function grade(q){if(!st.cards[cur.id])st.newCount++;const s=sched(q,st.cards[cur.id]);
st.cards[cur.id]=s;
if(st.last!==today()){const y=new Date(Date.now()-DAY).toLocaleDateString('en-CA');st.streak=st.last===y?st.streak+1:1;st.last=today();}
save();next();}
function tts(){const u=new SpeechSynthesisUtterance(cur.nl);u.lang='nl-NL';const v=speechSynthesis.getVoices().find(v=>v.lang.replace('_','-').startsWith('nl'));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);}
function speak(){if(!cur)return;const a=$('aud');if(cur.audio){a.src=cur.audio;a.onerror=tts;a.play().catch(()=>{});}else tts();}
$('card').onclick=reveal;document.querySelectorAll('#btns button').forEach(b=>b.onclick=e=>{e.stopPropagation();grade(+b.dataset.q);});
$('say').onclick=speak;const setDir=()=>$('dir').textContent='Direction: '+(st.rev?'EN → NL':'NL → EN');
const setShow=()=>$('show').textContent='Always show translation: '+(st.show?'ON':'OFF');setShow();
$('show').onclick=()=>{st.show=!st.show;save();setShow();next();};
$('dir').onclick=()=>{st.rev=!st.rev;save();setDir();next();};setDir();
tick=setInterval(()=>{if(document.hidden||left<=0)return;left--;$('timer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');if(left==0)next();},1000);
fetch('deck.json').then(r=>r.json()).then(d=>{deck=d;next();});
