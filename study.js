// Pure study helpers (no DOM), shared by app.js and test/study.test.js.
(function(g){
const DECK_ORDER=['top','phr']; // words first, then phrases
// Saved deck choice: the old "Both" option (and anything unknown) becomes Top words.
const deckSel=s=>DECK_ORDER.includes(s)?s:'top';
const LISTEN_GAP=700; // ms between the word and its example sentence
// What a listening question plays: word cards say the word, pause, then the sentence; phrase cards just the sentence.
function listenQueue(c){if(!c)return [];const ex=c.ex?[{src:c.exAudio,text:c.ex}]:[];
if((c.deck||'top')==='phr')return ex;return [{src:c.audio,text:c.nl},...(ex.length?[{pause:LISTEN_GAP},...ex]:[])];}
// "Ready for phrases?" once at least 80% of top words are learned, or no new top words are left.
const phraseNudge=(sel,learned,total,freshLeft)=>sel==='top'&&total>0&&(learned/total>=.8||freshLeft===0);
const api={DECK_ORDER,deckSel,LISTEN_GAP,listenQueue,phraseNudge};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(g,api);
})(this);
