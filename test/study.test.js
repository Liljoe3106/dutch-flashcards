// Run: node --test test/
const test=require('node:test'),assert=require('node:assert');
const {deckSel,listenQueue,phraseNudge,LISTEN_GAP}=require('../study.js');
const deck=require('../deck.json'),phr=require('../phrases.json');
test('saved "both" migrates to Top words; valid choices kept',()=>{assert.equal(deckSel('both'),'top');assert.equal(deckSel(undefined),'top');assert.equal(deckSel('xyz'),'top');
assert.equal(deckSel('top'),'top');assert.equal(deckSel('phr'),'phr');});
test('word listening: word, pause, then sentence',()=>{const c=deck[0],q=listenQueue(c);
assert.deepEqual(q,[{src:c.audio,text:c.nl},{pause:LISTEN_GAP},{src:c.exAudio,text:c.ex}]);assert.ok(LISTEN_GAP>=600&&LISTEN_GAP<=800);});
test('every word card with a sentence starts with the word',()=>{for(const c of deck)if(c.ex){const q=listenQueue(c);assert.equal(q[0].text,c.nl);assert.equal(q[q.length-1].text,c.ex);}});
test('phrase listening unchanged: sentence only',()=>{for(const c of phr)assert.deepEqual(listenQueue(c),c.ex?[{src:c.exAudio,text:c.ex}]:[]);});
test('word card without a sentence just says the word',()=>{assert.deepEqual(listenQueue({nl:'ja',audio:'a.mp3'}),[{src:'a.mp3',text:'ja'}]);});
test('phrase nudge',()=>{assert.equal(phraseNudge('top',80,100,20),true);assert.equal(phraseNudge('top',10,100,0),true);assert.equal(phraseNudge('top',79,100,21),false);
assert.equal(phraseNudge('phr',100,100,0),false);assert.equal(phraseNudge('top',0,0,0),false);});
