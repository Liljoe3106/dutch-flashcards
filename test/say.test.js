// Run: node --test test/
const test=require('node:test'),assert=require('node:assert');
const {sayNorm,sayTargets,sayMatch,lev}=require('../say.js');
const deck=[...require('../deck.json'),...require('../phrases.json')];
test('levenshtein',()=>{assert.equal(lev('kitten','sitting'),3);assert.equal(lev('',''),0);assert.equal(lev('abc',''),3);});
test('normalise: case, punctuation, accents, article, digits',()=>{
assert.equal(sayNorm('Het Café!'),'cafe');assert.equal(sayNorm('  Dank je   wel. '),'dank je wel');
assert.equal(sayNorm('3'),'drie');assert.equal(sayNorm('de 100'),'honderd');assert.equal(sayNorm("z’n"),'zn');assert.equal(sayNorm('de'),'de');});
test('exact answers are correct',()=>{for(const [h,nl] of [['Gecondoleerd','Gecondoleerd.'],['hoe gaat het','hoe gaat het?'],['man','de man'],['de man','de man'],['3','drie'],['cafe','het café'],['eet smakelijk','Eet smakelijk!']])
assert.equal(sayMatch(h,nl).res,'correct',h+' vs '+nl);});
test('small slips are close',()=>{assert.equal(sayMatch('gecondoleert','Gecondoleerd.').res,'close');assert.equal(sayMatch('hoe gaat het met jou','Hoe gaat het met je?').res,'close');
assert.equal(sayMatch('dank je wel hoor','Dank je wel.').res,'close');});
test('wrong answers are try again',()=>{assert.equal(sayMatch('dinsdag','vrijdag').res,'try');assert.equal(sayMatch('nee','ja').res,'try');assert.equal(sayMatch('','ja').res,'try');assert.equal(sayMatch([],'ja').res,'try');});
test('ellipsis means anything may follow',()=>{assert.equal(sayMatch('ik heet Joe','ik heet ...').res,'correct');assert.equal(sayMatch('ik heet','ik heet ...').res,'correct');});
test('slash alternatives and brackets',()=>{assert.deepEqual(sayTargets('a / b').map(x=>x.t),['a','b']);assert.equal(sayMatch('zijn','zijn (hun)').res,'correct');assert.equal(sayMatch('b','a / b').res,'correct');});
test('best of recogniser alternatives wins',()=>{const r=sayMatch(['dag maand','vrijdag'],'vrijdag');assert.equal(r.res,'correct');assert.equal(r.heard,'vrijdag');});
test('every card matches its own Dutch',()=>{for(const c of deck)assert.equal(sayMatch(c.nl.replace(/\.\.\./g,''),c.nl).res,'correct',c.nl);});
