// Sentence-gap cards. Run: node --test test/*.test.js
const test=require('node:test'),assert=require('node:assert');
const S=require('../study.js'),{typeMatch}=require('../say.js');
const deck=require('../deck.json').map(c=>Object.assign({deck:'top'},c)),phr=require('../phrases.json');
const DAY=864e5,learned={stage:'rev',ef:2.5,ivl:3,reps:2,due:Date.now()+DAY},learning={stage:'learn',ef:2.5,ivl:0,reps:0,due:0};
const kat=deck.find(c=>c.nl==='de'),slapen=deck.find(c=>c.nl==='slapen');
test('gap blanks the word in its own example sentence',()=>{const g=S.gapOf(kat);assert.deepEqual(g,{before:'',answer:'De',after:' kat slaapt.'});
 const s=S.gapOf(slapen);assert.equal(s.before+s.answer+s.after,slapen.ex);assert.equal(s.answer,'slaap');});
test('nearly every word card gets a clean gap, and the pieces rebuild the sentence',()=>{let n=0;for(const c of deck){const g=S.gapOf(c);if(!g)continue;n++;
 assert.equal(g.before+g.answer+g.after,c.ex,c.nl);assert.ok(g.answer.length>0);assert.ok(/\p{L}/u.test(g.before+g.after),c.nl);}
 assert.ok(n/deck.length>.95,'gap cards: '+n+'/'+deck.length);});
test('phrases and cards without a sentence never become gaps',()=>{for(const c of phr)assert.equal(S.gapOf(c),null);assert.equal(S.gapOf({nl:'ja',en:'yes',deck:'top'}),null);
 assert.equal(S.gapOf({nl:'kat',ex:'kat',deck:'top'}),null,'sentence is only the word');});
test('only learned words come back as gaps; new and learning checks stay normal',()=>{const one=()=>0;
 assert.equal(S.reviewKind(kat,learned,{},one),'gap');assert.equal(S.reviewKind(kat,learning,{},one),'recall');assert.equal(S.reviewKind(kat,undefined,{},one),'recall');
 assert.equal(S.reviewKind(kat,learned,{learn:true},one),'recall');assert.equal(S.reviewKind(phr[0],learned,{},one),'recall');});
test('gaps can be switched off, and listening still works alongside',()=>{const zero=()=>0;
 assert.equal(S.reviewKind(kat,learned,{gaps:false,listen:true},zero),'listen');assert.equal(S.reviewKind(kat,learned,{gaps:false,listen:false},zero),'recall');
 const hi=()=>.99;assert.equal(S.reviewKind(kat,learned,{listen:true},hi),'recall');});
test('about GAP_P of learned-word reviews are gaps',()=>{let n=0,r=0;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280;};for(let i=0;i<5000;i++)if(S.reviewKind(kat,learned,{},rnd)==='gap')n++;
 assert.ok(Math.abs(n/5000-S.GAP_P)<.05,String(n));assert.ok(S.GAP_P>0&&S.GAP_P<.5);});
test('typed gap answers: sentence form correct, dictionary form or typo close, wrong word wrong',()=>{
 assert.equal(S.gapCheck('slaap',slapen,typeMatch).res,'correct');assert.equal(S.gapCheck('Slaap',slapen,typeMatch).res,'correct');
 assert.deepEqual(S.gapCheck('slapen',slapen,typeMatch),{res:'close',why:'form'});
 assert.equal(S.gapCheck('slap',slapen,typeMatch).res,'close');assert.equal(S.gapCheck('fiets',slapen,typeMatch).res,'wrong');
 assert.equal(S.gapCheck('de',kat,typeMatch).res,'correct');});
test('highlight target unchanged for multi-word cards',()=>{const c={nl:'graag gedaan',ex:'Graag gedaan!',deck:'top'};const t=S.exTarget(c);assert.ok(t&&(t.words||t.L));});
test('reading gaps never changes saved progress',()=>{const s=JSON.stringify(learned);S.reviewKind(kat,learned,{},()=>0);S.gapOf(kat);assert.equal(JSON.stringify(learned),s);});
