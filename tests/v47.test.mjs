import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,legalMoves,chooseComMove,chooseLegacyComMove,swapMove} from '../engine.js';
import {LIMIT_CARDS} from '../cards.js';
import {x,pow,fn} from '../game-math.js';
const X=x(), inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
test('four arithmetic cards target only the opposing field for both actors',()=>{
 for(const actor of [0,1]){
  const s=newGame({startingPlayer:actor});
  s.boards=[[X,pow(X,2)],[X,pow(X,2)]];
  s.hands[actor]=['ADD','SUB','MUL','DIV','DIFF','SIN','COS','EXP'];
  for(let cardIndex=0;cardIndex<4;cardIndex++){
   const move={cardIndex,target:0,otherTarget:1,owner:actor};
   assert.equal(preview(s,move).ok,false);
   assert.match(preview(s,move).reason,/相手の場/);
   assert.ok(preview(s,{...move,owner:1-actor}).ok);
  }
  assert.ok(legalMoves(s).filter(m=>m.cardIndex<4).every(m=>m.owner===1-actor));
 }
});
test('swap includes all five limit types and preserves unselected nonlimits and inventory',()=>{
 const s=newGame();s.hands[0]=[...LIMIT_CARDS,'DIFF','SIN','COS'];
 assert.equal(preview(s,{discard:true,cardIndices:[5]}).ok,false);
 assert.equal(preview(s,{discard:true,cardIndices:[0,1,2,3,5]}).ok,false);
 const m=swapMove(s,[5]);assert.deepEqual(m.cardIndices,[0,1,2,3,4,5]);
 const r=preview(s,m);assert.ok(r.ok,r.reason);assert.deepEqual(r.state.hands[0].slice(0,2),['SIN','COS']);assert.deepEqual(inv(r.state),inv(s));
 assert.deepEqual(r.state.hands[0].slice(2),s.deck.slice(-6).reverse());
 assert.equal(r.state.turn,1);
});
test('repeated swaps never retain old limit cards; normal draw and bonus remain',()=>{
 let s=newGame();s.hands[0]=['LIM_PLUS','DIFF','LIM_ZERO','SIN','COS','EXP','X','X2'];
 for(let i=0;i<4;i++){
  const old=s.hands[0],m=swapMove(s,[old.findIndex(id=>!LIMIT_CARDS.includes(id))]);
  assert.ok(old.every((id,j)=>!LIMIT_CARDS.includes(id)||m.cardIndices.includes(j)));
  const r=preview(s,m);assert.ok(r.ok,r.reason);s=r.state;s.turn=0;
 }
 s.hands[0][0]='LIM_PLUS';s.hands[0][1]='DIFF';s.boards[1]=[X,fn('cos',X)];
 const r=preview(s,{cardIndex:0,owner:1,target:0});assert.ok(r.ok,r.reason);assert.equal(r.state.pending.phase,'bonus');
});
test('COM emergency fallback and no-action exchange obey mandatory limits',()=>{
 const s=newGame();s.hands[0]=['LIM_ZERO','DIFF','LIMINF','SIN','COS','EXP','X','X2'];
 const m=chooseComMove(s,{workBudget:1,now:()=>0});assert.ok(preview(s,m).ok);assert.ok(m.cardIndices.includes(0));assert.ok(m.cardIndices.includes(2));
 const a=chooseLegacyComMove(s);assert.ok(preview(s,a).ok);
});
