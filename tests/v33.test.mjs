import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,initialBoards,openingPool,preview,legalMoves,normalizeGame,chooseComMove} from '../engine.js';
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
  assert.equal(new Set(boards.flat().map(e=>JSON.stringify(e))).size,6);
 }
 assert.ok(seen.size>12);
 for(const r of [0,.5,.999]){const s=newGame({random:()=>r});assert.notDeepEqual(s.boards[0],s.boards[1]);assert.deepEqual(inv(s),makeDeck().sort());}
});
test('new card inventory and one-time migration preserve existing hands and boards',()=>{
 assert.equal(makeDeck().length,129);assert.equal(makeDeck(false).length,109);
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

test('diverse openings sample all families, allow moderate imbalance and retain independent constant direction',()=>{
 const pool=openingPool(),family=new Map(pool.map(({family,expr})=>[JSON.stringify(expr),family]));
 assert.equal(pool.length,32);assert.equal(new Set(pool.map(z=>z.family)).size,7);
 const seen=new Set(),used=new Set();let repeated=0;
 for(let seed=0;seed<200;seed++){
  let a=seed+1;const random=()=>((a=(Math.imul(a,1664525)+1013904223)>>>0)/4294967296);
  const boards=initialBoards(random);
  assert.equal(new Set(boards.flat().map(e=>JSON.stringify(e))).size,6);
  for(const board of boards){
   assert.equal(board.length,3);assert.equal(reduceBasis([constant(1),...board]).kept.length,4);
   const keys=board.map(e=>JSON.stringify(e)),groups=keys.map(k=>family.get(k));
   assert.ok(groups.every(Boolean));assert.ok(groups.every(g=>groups.filter(h=>h===g).length<=2));
   if(new Set(groups).size===2)repeated++;
   keys.forEach(k=>used.add(k));seen.add(keys.sort().join('|'));
  }
 }
 assert.equal(used.size,pool.length);assert.ok(repeated>50);assert.ok(seen.size>300);
});
