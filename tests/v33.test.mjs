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
 assert.equal(makeDeck().length,125);assert.equal(makeDeck(false).length,105);
 for(const extended of [true,false]){
  const s=newGame({extended});delete s.strategyDeck;
  // Use a valid pre-expansion inventory and old opening.
  const old=makeDeck(extended).filter(id=>!CARD_MAP[id].strategy);
  s.hands=[old.splice(0,8),old.splice(0,8)];s.deck=old;
  const n=normalizeGame(s);assert.deepEqual(n.hands,s.hands);assert.deepEqual(n.boards,s.boards);
  assert.deepEqual(inv(n),makeDeck(extended).sort());assert.deepEqual(normalizeGame(n),n);
 }
});
test('retained expansion functions and reciprocal',()=>{
 const s=newGame();s.boards[1]=[fromCard('X2'),fromCard('SIN'),fromCard('EXP')];s.hands[0][0]='RECIP';
 const r=preview(s,{cardIndex:0,owner:1,target:0});assert.ok(r.ok,r.reason);eq(r.effect.result[0],pow(x(),-2));assert.deepEqual(inv(r.state),inv(s));
 for(const id of ['X3','ABS_X','ADD','SUB','SCALE','RECIP'])assert.notEqual(cardLatex(id),'\\text{?}');
});
