import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,initialBoards,preview,legalMoves,normalizeGame,chooseComMove} from '../engine.js';
import {CARD_MAP,makeDeck} from '../cards.js';
import {fromCard,x,constant,add,mul,fn,pow,reduceBasis,simplify} from '../game-math.js';
import {cardLatex} from '../latex.js';
const inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
const eq=(a,b)=>assert.deepEqual(simplify(a),simplify(b));
test('asymmetric full-rank openings across deterministic seeds and fixed RNG',()=>{
 const seen=new Set();
 for(let seed=0;seed<48;seed++){
  let r=seed+1;const random=()=>((r=(Math.imul(r,1664525)+1013904223)>>>0)/4294967296);
  const boards=initialBoards(random);seen.add(JSON.stringify(boards));
  for(const b of boards){assert.equal(reduceBasis(b).kept.length,3);assert.ok(b.every(e=>e.t!=='n'));}
  for(let i=0;i<3;i++)assert.notDeepEqual(boards[0][i],boards[1][i]);
 }
 assert.ok(seen.size>12);
 for(const r of [0,.5,.999]){const s=newGame({random:()=>r});assert.notDeepEqual(s.boards[0],s.boards[1]);assert.deepEqual(inv(s),makeDeck().sort());}
});
test('new card inventory and one-time migration preserve existing hands and boards',()=>{
 assert.equal(makeDeck().length,127);assert.equal(makeDeck(false).length,105);
 for(const extended of [true,false]){
  const s=newGame({extended});delete s.strategyDeck;
  // Use a valid pre-expansion inventory and old opening.
  const old=makeDeck(extended).filter(id=>!CARD_MAP[id].strategy);
  s.hands=[old.splice(0,8),old.splice(0,8)];s.deck=old;
  const n=normalizeGame(s);assert.deepEqual(n.hands,s.hands);assert.deepEqual(n.boards,s.boards);
  assert.deepEqual(inv(n),makeDeck(extended).sort());assert.deepEqual(normalizeGame(n),n);
 }
});
test('addition, subtraction, shift and reciprocal use ordinary rules',()=>{
 const X=x(),s=newGame();s.boards[1]=[fromCard('X2'),fromCard('SIN'),fromCard('EXP')];
 s.hands[0]=['ADD','SUB','SHIFT','RECIP','X','X2','DIFF','SIN'];
 const moves=[
  [{cardIndex:0,partnerIndex:4,owner:1,target:0,direction:'basisOverCard'},add(pow(X,2),X)],
  [{cardIndex:1,partnerIndex:4,owner:1,target:0,direction:'basisOverCard'},add(pow(X,2),mul(constant(-1),X))],
  [{cardIndex:1,partnerIndex:4,owner:1,target:0,direction:'cardOverBasis'},add(X,mul(constant(-1),pow(X,2)))],
  [{cardIndex:2,C:1,owner:1,target:0},pow(add(X,constant(1)),2)],
  [{cardIndex:3,owner:1,target:0},pow(X,-2)]
 ];
 for(const [move,expected] of moves){const r=preview(s,move);assert.ok(r.ok,r.reason);eq(r.effect.result[0],expected);assert.deepEqual(inv(r.state),inv(s));}
 assert.equal(preview(s,{cardIndex:2,C:0,owner:1,target:0}).ok,false);
 const zero=preview(s,{cardIndex:1,partnerIndex:5,owner:1,target:0,direction:'basisOverCard'});assert.ok(zero.ok,zero.reason);assert.equal(zero.delta[1],-1);assert.equal(zero.state.pending.phase,'bonus');
 const candidates=legalMoves(s);for(const [move] of moves)assert.ok(candidates.some(m=>Object.entries(move).every(([k,v])=>m[k]===v)));
 assert.ok(preview(s,chooseComMove(s)).ok);
});
test('all added function cards have concrete ASTs and labels',()=>{
 for(const id of ['X3','ABS_X','SINH_X','COSH_X']){assert.ok(fromCard(id));assert.notEqual(cardLatex(id),'\\text{?}');}
 for(const id of ['ADD','SUB','SHIFT','RECIP'])assert.notEqual(cardLatex(id),'\\text{?}');
});
