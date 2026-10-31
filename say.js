// "Say it" speaking practice: pure matching helpers (no DOM), shared by app.js and test/say.test.js.
(function(g){
const NUM={0:'nul',1:'een',2:'twee',3:'drie',4:'vier',5:'vijf',6:'zes',7:'zeven',8:'acht',9:'negen',10:'tien',11:'elf',12:'twaalf',13:'dertien',14:'veertien',15:'vijftien',16:'zestien',17:'zeventien',18:'achttien',19:'negentien',20:'twintig',30:'dertig',40:'veertig',50:'vijftig',60:'zestig',70:'zeventig',80:'tachtig',90:'negentig',100:'honderd',1000:'duizend'};
// Lowercase, drop accents and punctuation, spell out numbers the recogniser writes as digits, drop a leading article.
const sayNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'')
.replace(/\d+/g,n=>NUM[+n]?' '+NUM[+n]+' ':' '+n+' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().replace(/^(de|het|een) (?=\S)/,'');
function lev(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;let p=[...Array(b.length+1).keys()];
for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[b.length];}
const ratio=(a,b)=>{const m=Math.max(a.length,b.length);return m?1-lev(a,b)/m:1;};
// Accepted answers for a card's Dutch: "a / b" alternatives, text in brackets optional, "..." means anything may follow.
function sayTargets(nl){const out=[];String(nl||'').split('/').forEach(p=>{const open=/\.\.\.|…/.test(p),base=p.replace(/\.\.\.|…/g,' ');
[base.replace(/\([^)]*\)/g,' '),base.replace(/[()]/g,' ')].forEach(t=>{t=sayNorm(t);if(t&&!out.some(o=>o.t===t))out.push({t,open});});});return out;}
// heard: string or array of recogniser alternatives. Returns {res:'correct'|'close'|'try', score, heard}.
function sayMatch(heard,nl,close){close=close||.8;const hs=(Array.isArray(heard)?heard:[heard]).filter(Boolean),ts=sayTargets(nl);let best={res:'try',score:0,heard:hs[0]||''};
for(const h of hs){const n=sayNorm(h);if(!n)continue;for(const {t,open} of ts){let sc=ratio(n,t);
if(open&&n.startsWith(t))sc=1;else if(open)sc=Math.max(sc,ratio(n.slice(0,t.length),t));
if(sc<close&&(' '+n+' ').includes(' '+t+' '))sc=close; // said the answer plus extra words
if(sc>best.score)best={res:sc>=1?'correct':sc>=close?'close':'try',score:sc,heard:h};}}
return best;}
const api={sayNorm,sayTargets,sayMatch,lev,ratio};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(g,api);
})(this);
