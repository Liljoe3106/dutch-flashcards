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
// Typed answers: same tolerance as Say it, plus articles. Leaving the article out is fine; the wrong one is Close.
const artOf=s=>{const m=String(s||'').toLowerCase().trim().match(/^(de|het)\s+\S/);return m?m[1]:null;};
function typeMatch(typed,nl){const r=sayMatch(typed,nl);if(r.res==='try')return {res:'wrong',why:null,score:r.score};
const ta=artOf(String(nl).split('/')[0]),ha=artOf(typed);if(ta&&ha&&ta!==ha)return {res:'close',why:'article',score:r.score};
return {res:r.res,why:r.res==='close'?'typo':null,score:r.score};}
// Letter-by-letter diff of what was typed against the nearest accepted answer, for wrong/close feedback.
// Returns [{t, ok}] where ok=false marks a wrong or extra letter, and {t:'_', ok:false, miss:true} a missing one.
function typeDiff(typed,nl){const low=x=>String(x||'').toLowerCase().replace(/[.!?,;:¿¡…]+/g,'').replace(/\.\.\./g,'').replace(/\s+/g,' ').trim();
const flat=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'');let a=low(typed);const ha=artOf(a);
let best=null;for(let t of String(nl||'').split('/')){t=low(t.replace(/\([^)]*\)/g,' '));if(!ha)t=t.replace(/^(de|het|een)\s+(?=\S)/,'');
const d=lev(flat(a),flat(t));if(!best||d<best.d)best={t,d};}
const b=best?best.t:'',A=flat(a),B=flat(b),D=[...Array(A.length+1)].map(()=>Array(B.length+1).fill(0));
for(let i=0;i<=A.length;i++)D[i][0]=i;for(let j=0;j<=B.length;j++)D[0][j]=j;
for(let i=1;i<=A.length;i++)for(let j=1;j<=B.length;j++)D[i][j]=Math.min(D[i-1][j]+1,D[i][j-1]+1,D[i-1][j-1]+(A[i-1]===B[j-1]?0:1));
const out=[];let i=A.length,j=B.length;while(i>0||j>0){
if(i>0&&j>0&&D[i][j]===D[i-1][j-1]+(A[i-1]===B[j-1]?0:1)){out.unshift({t:a[i-1],ok:A[i-1]===B[j-1]});i--;j--;}
else if(i>0&&D[i][j]===D[i-1][j]+1){out.unshift({t:a[i-1],ok:false});i--;}else{out.unshift({t:'_',ok:false,miss:true});j--;}}
const m=[];for(const x of out){const l=m[m.length-1];if(l&&l.ok===x.ok&&!l.miss&&!x.miss)l.t+=x.t;else m.push(Object.assign({},x));}return m;}
const api={sayNorm,sayTargets,sayMatch,lev,ratio,typeMatch,typeDiff,artOf};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(g,api);
})(this);
