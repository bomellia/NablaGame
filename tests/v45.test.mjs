import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,chooseComMove,chooseLegacyComMove} from '../engine.js';
import {x,constant as n,fn,pow,mul} from '../game-math.js';
const X=x(),rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
test('multi-turn scenario search completes a five-turn horizon and produces a legal action',()=>{
 const s=newGame({difficulty:'hard',random:rng(2)}),diagnostics=[];
 const move=chooseComMove(s,{now:()=>0,onProgress:(m,d)=>{if(d?.phase==='future')diagnostics.push(d);}});
 assert.ok(preview(s,move).ok);
 assert.ok(diagnostics.some(d=>d.plies===5&&d.scenarios>=1));
});
test('actual unseen hands, deck order and RNG do not affect the decision',()=>{
 const s=newGame({difficulty:'normal',random:rng(2)}),t=JSON.parse(JSON.stringify(s));
 t.hands[1-s.turn].reverse();t.deck.reverse();t.rng=123;
 // Also exchange a hidden card with the deck without changing the public state.
 [t.hands[1-s.turn][0],t.deck[0]]=[t.deck[0],t.hands[1-s.turn][0]];
 const before=JSON.stringify(s),a=chooseComMove(s,{now:()=>0}),b=chooseComMove(t,{now:()=>0});
 assert.deepEqual(a,b);assert.equal(JSON.stringify(s),before);assert.ok(preview(s,a).ok);
});
test('turn-wide planning can exploit a bonus and chained operations to win',()=>{
 const s=newGame({difficulty:'hard',random:rng(9)});
 s.boards=[[X,fn('cos',X)],[n(1),fn('sin',mul(n(2),X))]];
 s.hands[0]=['DIFF','SCALE','DIFF2_PLUS','X','ONE','COS','EXP','NEGEXP'];
 // First kill the constant, then chain scale and the annihilator on the remaining basis.
 let a=s;
 for(let i=0;i<3&&!a.finished;i++){
  const move=chooseComMove(a,{now:()=>0});const p=preview(a,move);assert.ok(p.ok,p.reason);a=p.state;
 }
 assert.equal(a.winner,0);assert.equal(a.finished,true);
});
test('small work budget still returns legal fallback and does not inspect hidden draws',()=>{
 const s=newGame({difficulty:'hard',random:rng(3)}),m=chooseComMove(s,{now:()=>0,workBudget:1});
 assert.ok(preview(s,m).ok);assert.ok(preview(s,chooseLegacyComMove(s)).ok);
});
