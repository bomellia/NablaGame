import test from 'node:test';
import assert from 'node:assert/strict';
import {intervalIntegral,advancedOperation,x,constant as n,pow,fn,add,mul,div,fromCard,simplify} from '../game-math.js';
import {newGame,preview,legalMoves,chooseComMove} from '../engine.js';
import {makeDeck,integralIntervals} from '../cards.js';
const X=x(),neg=mul(n(-1),X),p=k=>pow(X,k);
const f=(name,arg=X)=>fn(name,arg);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,JSON.stringify({a,b}));
const eq=(a,b)=>assert.deepEqual(simplify(a),simplify(b));
test('fixed one-sided intervals support reciprocal powers and both directions',()=>{
 near(intervalIntegral(f('exp',neg),'zeroPlus').v,1);
 near(intervalIntegral(f('exp'),'minusZero').v,1);
 near(intervalIntegral(p(-2),'onePlus').v,1);
 near(intervalIntegral(fromCard('GAUSS'),'all').v,Math.sqrt(Math.PI));
 near(advancedOperation('INT_HALF',div(f('sin',mul(n(2),X)),X)).v,Math.PI/2);
});
test('variable endpoints retain functions and use the finite asymptotic constant',()=>{
 eq(intervalIntegral(p(-2),'xPlus'),p(-1));
 eq(intervalIntegral(p(-3),'xPlus'),mul(n(.5),p(-2)));
 eq(intervalIntegral(f('exp',mul(n(-2),X)),'xPlus'),mul(n(.5),f('exp',mul(n(-2),X))));
 eq(intervalIntegral(f('exp'),'minusX'),f('exp'));
 eq(intervalIntegral(fromCard('CAUCHY'),'xPlus'),add(n(Math.PI/2),mul(n(-1),f('atan'))));
 eq(intervalIntegral(fromCard('GAUSS'),'xPlus'),add(n(Math.sqrt(Math.PI)/2),mul(n(-Math.sqrt(Math.PI)/2),f('erf'))));
});
test('symmetric integrals distinguish odd, even and non-integrable singularities',()=>{
 eq(intervalIntegral(X,'symmetricX'),n(0));
 eq(intervalIntegral(f('sin'),'symmetricX'),n(0));
 const even=intervalIntegral(p(2),'symmetricX');assert.equal(even.t,'m');near(even.v[0].v,2/3);eq(even.v[1],p(3));
 for(const mode of ['all','symmetricX'])assert.throws(()=>intervalIntegral(p(-1),mode));
 for(const [expr,mode] of [[p(-2),'all'],[f('sin'),'zeroPlus'],[f('exp'),'zeroPlus'],[f('tan'),'symmetricX'],[div(n(1),add(X,n(-1))),'onePlus']])assert.throws(()=>intervalIntegral(expr,mode));
});
test('all selectable intervals are legal move options, validated and consume one card',()=>{
 const s=newGame();s.hands[0]=['INT_HALF','INT_ALL','DIFF','EXP','X','X2','SIN','COS'];s.boards[1]=[X,p(-2),f('exp',neg),f('exp')];
 const moves=legalMoves(s,{perCardOwner:10});
 assert.ok(moves.some(m=>m.cardIndex===0&&m.owner===1&&m.target===3&&m.interval==='minusZero'));
 assert.ok(moves.some(m=>m.cardIndex===0&&m.owner===1&&m.target===1&&m.interval==='onePlus'));
 assert.ok(moves.some(m=>m.cardIndex===1&&m.owner===1&&m.target===0&&m.interval==='symmetricX'));
 const result=preview(s,{cardIndex:1,owner:1,target:0,interval:'symmetricX'});
 assert.ok(result.ok,result.reason);assert.equal(result.delta[1],-1);assert.equal(result.state.pending.spent.length,1);
 assert.equal(preview(s,{cardIndex:0,owner:1,target:0,interval:'all'}).ok,false);
 assert.ok(preview(s,chooseComMove(s)).ok);
 assert.equal(integralIntervals('INT_HALF').length,5);assert.equal(integralIntervals('INT_ALL').length,2);
 assert.equal(makeDeck().length,125);assert.equal(makeDeck().filter(id=>id==='INT_HALF').length,2);
});

test('finite constant intervals are retired in both engine and direct calculation',()=>{
 const s=newGame();s.hands[0][0]='INT_HALF';s.hands[0][1]='INT_ALL';s.boards[1]=[X,p(2),f('cos')];
 for(const [cardIndex,interval] of [[0,'zeroOne'],[1,'symmetricOne']]){
  assert.throws(()=>intervalIntegral(X,interval));
  assert.equal(preview(s,{cardIndex,owner:1,target:0,interval}).ok,false);
 }
 assert.ok(legalMoves(s).every(m=>!['zeroOne','symmetricOne'].includes(m.interval)));
 assert.deepEqual(integralIntervals('INT_HALF').map(z=>z.id),['zeroPlus','minusZero','onePlus','xPlus','minusX']);
 assert.deepEqual(integralIntervals('INT_ALL').map(z=>z.id),['all','symmetricX']);
});
