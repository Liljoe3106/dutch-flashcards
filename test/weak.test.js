// Run: node --test test/
const test=require('node:test'),assert=require('node:assert');
const S=require('../study.js');
const DAY=864e5,now=Date.UTC(2026,10,7,12);
const cards=()=>({1:{lapses:3,ef:1.7,ivl:2,reps:2,due:now+DAY,stage:'rev',t:now-DAY},2:{lapses:1,ef:2.3,ivl:5,reps:3,due:now},
 3:{lapses:2,ef:2.1,ivl:1,reps:1,due:now-DAY,stage:'rev'},4:{ef:2.5,ivl:10,reps:4,due:now},p01:{lapses:5,ef:1.3,ivl:0,reps:0,due:now}});
test('weak cards: 2+ lapses only, worst first',()=>{assert.deepEqual(S.weakIds(cards()),['p01','1','3']);assert.equal(S.WEAK_MIN,2);});
test('weak cards: limited to known card ids and a maximum',()=>{assert.deepEqual(S.weakIds(cards(),[1,3,4]),['1','3']);assert.deepEqual(S.weakIds(cards(),null,2),['p01','1']);});
test('weak cards: none gives an empty list (friendly empty state)',()=>{assert.deepEqual(S.weakIds({}),[]);assert.deepEqual(S.weakIds(undefined),[]);assert.deepEqual(S.weakIds({9:{ef:2.5,ivl:3}}),[]);});
test('weak cards: reading never changes saved progress',()=>{const c=cards(),before=JSON.stringify(c);S.weakIds(c);assert.equal(JSON.stringify(c),before);});
test('drill grade on a card not yet due never shortens the interval, Again still counts a lapse',()=>{const o=cards()[1];
 for(const q of [3,4,5]){const s=S.sched(q,o,{ahead:true,now});assert.ok(s.ivl>=o.ivl);assert.equal(s.lapses,3);}
 const a=S.sched(0,o,{ahead:true,now});assert.equal(a.lapses,4);assert.equal(a.ivl,0);
 assert.equal(o.lapses,3);});
