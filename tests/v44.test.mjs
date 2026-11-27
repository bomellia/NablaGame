import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,legalMoves,chooseComMove} from '../engine.js';
import {CARD_MAP,makeDeck} from '../cards.js';
import {x,constant as n,pow,fn,add,mul,div,simplify} from '../game-math.js';
const X=x(),inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
const eq=(a,b)=>assert.deepEqual(simplify(a),simplify(b));
const go=(s,m)=>{const r=preview(s,m);assert.ok(r.ok,r.reason);return r;};
test('all four arithmetic cards use ordered field operands and consume one card',()=>{
 const s=newGame();s.boards[1]=[pow(X,2),fn('sin',X),fn('exp',X)];s.hands[0]=['MUL','DIV','ADD','SUB','DIFF','ONE','X','COMPOSE'];
 for(const [cardIndex,expect] of [[0,mul(s.boards[1][0],s.boards[1][1])],[1,div(s.boards[1][0],s.boards[1][1])],[2,add(s.boards[1][0],s.boards[1][1])],[3,add(s.boards[1][0],mul(n(-1),s.boards[1][1]))]]){
  const move={cardIndex,owner:1,target:0,otherTarget:1};
  const r=go(s,{...move,continue:true});
  eq(r.effect.result[0],expect);eq(r.state.boards[1][1],s.boards[1][1]);eq(r.state.boards[1][2],s.boards[1][2]);
  assert.equal(r.state.hands[0].length,7);assert.equal(r.state.pending.spent.length,1);assert.deepEqual(inv(r.state),inv(s));
  for(const otherTarget of [undefined,0,-1,3])assert.equal(preview(s,{...move,otherTarget}).ok,false);
  assert.ok(legalMoves(s).some(m=>m.cardIndex===cardIndex&&m.owner===1&&m.target===0&&m.otherTarget===1));
  assert.equal(CARD_MAP[s.hands[0][cardIndex]].kind,'boardBinary');
 }
 assert.equal(preview(s,{cardIndex:0,owner:1,target:0,partnerIndex:6}).ok,false);
 assert.equal(CARD_MAP.COMPOSE.kind,'binary');assert.equal(makeDeck().length,129);
});
test('dependent rewritten basis is removed rather than the second operand',()=>{
 const s=newGame();s.boards[1]=[pow(X,2),X,fn('sin',X)];s.hands[0][0]='DIV';s.hands[0][1]='DIFF';
 const r=go(s,{cardIndex:0,owner:1,target:0,otherTarget:1});
 eq(r.effect.result[0],X);assert.deepEqual(r.effect.removed,[0]);assert.deepEqual(r.state.boards[1],[X,fn('sin',X)]);
 assert.equal(r.state.pending.phase,'bonus');assert.equal(r.state.pending.spent.length,1);assert.deepEqual(inv(r.state),inv(s));
 const a=newGame();a.boards[1]=[n(1),X];a.hands[0][0]='MUL';a.hands[0][1]='DIFF';
 const b=go(a,{cardIndex:0,owner:1,target:0,otherTarget:1});assert.deepEqual(b.effect.removed,[0]);assert.deepEqual(b.state.boards[1],[X]);
});
test('ordered division and chains preserve original target, legal COM actions',()=>{
 const s=newGame({difficulty:'hard'});s.boards[1]=[X,pow(X,2),fn('sin',X)];s.hands[0]=['MUL','DIV','DIFF','X','SIN','COS','ONE','EXP'];
 const a=go(s,{cardIndex:0,owner:1,target:0,otherTarget:1,continue:true}).state;eq(a.boards[1][0],pow(X,3));
 assert.equal(preview(a,{cardIndex:0,owner:1,target:1,otherTarget:0}).ok,false);
 const b=go(a,{cardIndex:0,owner:1,target:0,otherTarget:1,continue:true}).state;eq(b.boards[1][0],X);
 assert.equal(b.pending.spent.length,2);assert.deepEqual(inv(b),inv(s));
 assert.ok(preview(s,chooseComMove(s)).ok);
 const one=newGame();one.boards[1]=[X];one.hands[0][0]='DIV';assert.ok(!legalMoves(one).some(m=>m.cardIndex===0&&m.owner===1));
});
