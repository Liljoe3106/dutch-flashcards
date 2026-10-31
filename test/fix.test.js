const test=require('node:test'),assert=require('node:assert');
const {typeMatch,typeDiff}=require('../say.js');
const S=require('../study.js');
const DAY=864e5,MIN=6e4,now=Date.UTC(2026,9,31,12);

test('typed: wrong article is Close, missing article is fine',()=>{
 assert.deepEqual([typeMatch('het man','de man').res,typeMatch('het man','de man').why],['close','article']);
 assert.equal(typeMatch('man','de man').res,'correct');
 assert.equal(typeMatch('de man','de man').res,'correct');
 assert.equal(typeMatch('de huis','het huis').why,'article');
});
test('typed: small typos are Close, alternatives and open endings accepted',()=>{
 assert.equal(typeMatch('gecondoleert','gecondoleerd').res,'close');
 assert.equal(typeMatch('ik heet Joe','ik heet ...').res,'correct');
 assert.equal(typeMatch('dezelfde','dezelfde / hetzelfde').res,'correct');
 assert.equal(typeMatch('hetzelfde','dezelfde / hetzelfde').res,'correct');
 assert.equal(typeMatch('fiets','de auto').res,'wrong');
});
test('typeDiff marks the wrong letters',()=>{
 const d=typeDiff('gecondoleert','gecondoleerd');
 assert.deepEqual(d,[{t:'gecondoleer',ok:true},{t:'t',ok:false}]);
 assert.ok(typeDiff('gecondolee','gecondoleerd').some(x=>x.miss));
});
test('sched: learning steps',()=>{
 const n=q=>S.sched(q,undefined,{now});
 assert.equal(n(0).due,now+MIN);assert.equal(n(3).ivl,0);assert.equal(n(3).due,now+10*MIN);
 assert.equal(n(4).ivl,1);assert.equal(n(5).ivl,4);
});
test('sched: Hard < Good < Easy at every stage',()=>{
 for(const o of [{reps:1,ivl:1,ef:2.5},{reps:1,ivl:4,ef:2.5},{reps:3,ivl:15,ef:2.5},{reps:5,ivl:2,ef:1.3},{reps:2,ivl:6,ef:2.36}]){
  const [h,g,e]=[3,4,5].map(q=>S.sched(q,{...o,due:now},{now}).ivl);
  assert.ok(h<g&&g<e,JSON.stringify({o,h,g,e}));assert.ok(h>o.ivl,'hard still grows');
 }
 assert.deepEqual([3,4,5].map(q=>S.sched(q,{reps:1,ivl:1,ef:2.5,due:now},{now}).ivl),[3,6,10]);
 assert.ok(S.sched(3,{reps:3,ivl:15,ef:2.5,due:now},{now}).ivl<=18);
});
test('sched: Again lowers ease and relearns, saved fields kept',()=>{
 const s=S.sched(0,{reps:4,ivl:20,ef:2.5,due:now,stage:'rev',t:1},{now});
 assert.equal(s.reps,0);assert.equal(s.ivl,0);assert.equal(s.ef,2.3);assert.equal(s.due,now+MIN);assert.equal(s.stage,'rev');assert.equal(s.lapses,1);
 assert.equal(S.sched(0,{reps:0,ivl:0,ef:2.5},{now}).ef,2.5,'no ease penalty while still learning');
});
test('learned rule unchanged for saved cards',()=>{
 assert.ok(S.isLearned({stage:'rev',ivl:1}));assert.ok(S.isLearned({ivl:6}));
 assert.ok(!S.isLearned({stage:'learn',ivl:0}));assert.ok(!S.isLearned({stage:'intro',mc:1}));assert.ok(!S.isLearned({stage:'rev',ivl:0}));
});
test('progress counts cards, not answers',()=>{
 const deck=[1,2,3,4].map(id=>({id}));
 const cards={1:{stage:'rev',due:now-1},2:{stage:'rev',due:now+DAY,ivl:1},3:{stage:'learn',due:now+MIN}};
 assert.deepEqual(S.progress(cards,deck,[2,3],5,now),{done:1,total:8});
 assert.deepEqual(S.progress({},deck,[],15,now),{done:0,total:15});
});
test('forecast and streak',()=>{
 const t=new Date(now);t.setHours(0,0,0,0);const tom=t.getTime()+DAY+3600e3;
 assert.deepEqual(S.forecast({a:{stage:'rev',ivl:1,due:tom},b:{stage:'rev',ivl:3,due:now+3*DAY},c:{stage:'learn',due:now+MIN},d:{stage:'rev',ivl:20,due:now+20*DAY}},now),{tom:1,week:2});
 assert.equal(S.streakNow({last:S.dstr(now),streak:5},now),5);
 assert.equal(S.streakNow({last:S.dstr(now-DAY),streak:5},now),5);
 assert.equal(S.streakNow({last:S.dstr(now-4*DAY),streak:12},now),0);
});
test('backup reminder at most monthly, only with real progress',()=>{
 const cards={};for(let i=0;i<25;i++)cards[i]={stage:'rev',ivl:3};
 assert.ok(S.backupDue({cards},now));assert.ok(!S.backupDue({cards,lastExport:now-5*DAY},now));
 assert.ok(!S.backupDue({cards,backupAsk:now-DAY},now));assert.ok(!S.backupDue({cards:{a:{ivl:3}}},now));
});
