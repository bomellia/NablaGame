import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyMove,preview,legalMoves,chooseComMove} from '../engine.js';
import {fromCard,derivative,integrate,limit,oscillatoryLimit,reduceBasis,display,fn,x,constant,add,mul,pow,inverse,hasEmptyRealDomain} from '../symbolic.js';
import {makeDeck} from '../cards.js';
function scenario(hand,boards=[['ONE','X','X2'],['ONE','X','X2']]){
  const s=newGame();s.hands[0]=hand;s.boards=boards.map(b=>b.map(fromCard));s.turn=0;s.turns=1;return s;
}
test('deck composition and fixed hand sizes',()=>{
  assert.equal(makeDeck(false).length,105);assert.equal(makeDeck(true).length,113);
  assert.equal(newGame({extended:false}).deck.length,89);
});
test('initial boards are mirrored, nonconstant and three dimensional; hands draw randomly',()=>{
  const s=newGame();assert.equal(s.boards[0].length,3);assert.equal(s.boards[1].length,3);
  assert.deepEqual(s.boards[0],s.boards[1]);
  assert.equal(s.boards[0].some(e=>e.t==='n'),false);
  assert.deepEqual(s.hands.map(h=>h.length),[8,8]);
});
test('d/dx of x squared is 2x and reduces one dimension',()=>{
  const s=scenario(['DIFF']);const t=applyMove(s,{cardIndex:0,owner:1,target:2});
  assert.equal(t.boards[1].length,2);assert.equal(t.turn,1);
});
test('delta eliminates 1 and x at the start',()=>{
  const s=scenario(['DELTA']);const t=applyMove(s,{cardIndex:0,owner:1});
  assert.equal(t.boards[1].length,1);
});
test('nabla eliminates constant',()=>{
  const s=scenario(['NABLA']);const t=applyMove(s,{cardIndex:0,owner:1});
  assert.equal(t.boards[1].length,2);
});
test('integral of sin is negative cosine with C=1',()=>{
  const v=integrate(fromCard('SIN'),1);
  assert.equal(display(derivative(v)),display(fromCard('SIN')));
});
test('linear dependence catches x+1 given 1,x',()=>{
  const b=[fromCard('ONE'),fromCard('X'),add(fromCard('ONE'),fromCard('X'))];
  assert.equal(reduceBasis(b).kept.length,2);
});
test('limit of x^2 at plus infinity diverges',()=>{
  const v=limit(fromCard('X2'),'plus');assert.equal(v.type,'infinity');assert.equal(v.sign,1);
});
test('limsup of a sin + b cos + 1 is 1+sqrt(a²+b²)',()=>{
  const v=oscillatoryLimit(add(mul(constant(3),fromCard('SIN')),mul(constant(4),fromCard('COS')),constant(1)),'sup');
  assert.equal(v.type,'finite');assert.equal(v.v,6);
});
test('invalid ratio by zero is rejected',()=>{
  const s=scenario(['DIV','ZERO']);const result=preview(s,{cardIndex:0,owner:1,target:1,partnerIndex:1,direction:'basisOverCard'});
  assert.equal(result.ok,false);
});
test('log of a negative constant and sqrt of negative even power vanish',()=>{
  assert.ok(hasEmptyRealDomain(constant(-2),'log'));
  assert.ok(hasEmptyRealDomain(mul(constant(-1),fromCard('X2')),'sqrt'));
});
test('inverse of sin and e^x supported',()=>{
  assert.equal(display(inverse(fromCard('SIN'))),'arcsin(x)');
  assert.equal(display(inverse(fromCard('EXP'))),'log(x)');
});
test('every legal move is previewable',()=>{
  const s=newGame();const moves=legalMoves(s);assert.ok(moves.length>0);
  assert.ok(moves.every(m=>preview(s,m).ok));
});
test('COM produces a legal move',()=>{
  const s=newGame();s.turn=1;const action=chooseComMove(s);
  assert.ok(action);assert.ok(preview(s,action).ok);
});
test('reflecting x² does not create a duplicate basis',()=>{
  const reflected=pow(mul(constant(-1),x()),2);
  assert.equal(display(reflected),display(fromCard('X2')));
  assert.equal(reduceBasis([fromCard('X2'),reflected]).kept.length,1);
});
test('unsafe inverse of square root is rejected until domains are tracked',()=>{
  assert.throws(()=>inverse(fn('sqrt',x())),/逆関数/);
});
test('exp(Log(x)) cancels under the game principal-log convention',()=>{
  assert.equal(display(fn('exp',fn('log',x()))),display(x()));
});
