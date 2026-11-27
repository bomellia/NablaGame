import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,fn,add,mul,pow,derivative,limit,oscillatoryLimit,complex} from '../game-math.js';
import {asymptoticLimit,hasRealTail} from '../asymptotic.js';
import {newGame,preview} from '../engine.js';
const X=x(),acos=fn('acos',X),asin=fn('asin',X),da=derivative(acos),zero={type:'finite',v:0};
test('inverse cosine and its derivative have complex ordinary limits but no ordered extrema',()=>{
 for(const e of [acos,asin,da,derivative(asin)]){
  assert.equal(hasRealTail(e),false);
  for(const kind of ['inf','sup'])assert.equal(oscillatoryLimit(e,kind).reason,'realDomain');
 }
 for(const point of ['plus','minus']){
  assert.equal(asymptoticLimit(acos,point,'two').type,'complexInfinity');
  assert.equal(asymptoticLimit(asin,point,'two').type,'complexInfinity');
  assert.equal(limit(acos,point).type,'infinity');
  assert.deepEqual(limit(da,point),zero);
 }
});
test('real tails and punctured periodic domains retain ordered limits',()=>{
 const cases=[[fn('cos',X),-1,1],[pow(fn('sin',X),2),0,1],[fn('tan',X),-Infinity,Infinity],[pow(add(n(1),pow(X,2)),-.5),0,0],[fn('acos',pow(X,-1)),Math.PI/2,Math.PI/2],[fn('asin',fn('sin',X)),-Math.PI/2,Math.PI/2]];
 for(const [e,lo,hi] of cases){
  assert.equal(hasRealTail(e),true);
  for(const [kind,v] of [['inf',lo],['sup',hi]]){
   const q=oscillatoryLimit(e,kind);
   if(!Number.isFinite(v))assert.deepEqual(q,{type:'infinity',sign:Math.sign(v)});
   else{assert.equal(q.type,'finite');assert.ok(Math.abs(q.v-v)<1e-9);}
  }
 }
});
test('implicit nonreal branches and genuine complex functions cannot use upper/lower limits',()=>{
 const e=pow(add(n(1),mul(n(-1),pow(X,2))),-.5);
 for(const value of [e,fn('log',mul(n(-1),X)),fn('sin',acos),complex(X,fn('sin',X))]){
  assert.equal(oscillatoryLimit(value,'inf').reason,'realDomain');
  assert.equal(oscillatoryLimit(value,'sup').reason,'realDomain');
 }
 assert.deepEqual(limit(e,'plus'),zero);
 // Scalar multiples of a real basis retain the established normalization.
 assert.equal(oscillatoryLimit(complex(n(0),fn('abs',fn('sin',X))),'inf').v,0);
});
test('actual card preview rejects invalid extrema and accepts ordinary complex divergence/decay',()=>{
 for(const e of [acos,da]){
  const s=newGame();s.boards[1]=[e];s.hands[0][0]='LIMINF';s.hands[0][1]='LIMSUP';s.hands[0][2]='LIM_PLUS';
  for(const cardIndex of [0,1]){
   const r=preview(s,{cardIndex,owner:1,target:0});assert.equal(r.ok,false);assert.match(r.reason,/実数値/);
  }
  const r=preview(s,{cardIndex:2,owner:1,target:0});assert.ok(r.ok,r.reason);assert.equal(r.state.winner,0);
 }
});
