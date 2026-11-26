import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,fn,pow,mul,add,div,limit,oscillatoryLimit,derivative,simplify} from '../game-math.js';
import {newGame,preview} from '../engine.js';
import {trigSumPoleSigns} from '../asymptotic.js';
const X=x(),s=fn('sin',X),c=fn('cos',X),t=fn('tan',X);
const f=add(div(mul(n(-12),s,pow(t,2)),pow(c,3)),div(mul(n(-12),t),pow(c,4)),div(mul(n(-4),s),pow(c,3)));
const inf=sign=>({type:'infinity',sign});
test('reported sum: both unbounded extrema and ordinary limits',()=>{
 assert.deepEqual(oscillatoryLimit(f,'sup'),inf(1));assert.deepEqual(oscillatoryLimit(f,'inf'),inf(-1));
 assert.deepEqual(limit(f,'plus'),{type:'nonexistent'});assert.deepEqual(limit(f,'minus'),{type:'nonexistent'});assert.deepEqual(limit(f,'zero'),{type:'finite',v:0});
});
test('pole proof handles signs, parity and rejects cancellation and mixed phase',()=>{
 const phaseLimit=e=>limit(e,'plus');
 assert.deepEqual(trigSumPoleSigns(add(pow(c,-4),pow(t,2)),phaseLimit),{positive:true,negative:false});
 assert.deepEqual(trigSumPoleSigns(add(mul(n(-1),pow(c,-4)),mul(n(-1),pow(t,2))),phaseLimit),{positive:false,negative:true});
 assert.equal(trigSumPoleSigns(add(pow(c,-2),mul(n(-1),pow(t,2))),phaseLimit),null);
 assert.equal(trigSumPoleSigns(add(pow(c,-2),fn('sin',mul(n(2),X))),phaseLimit),null);
 assert.equal(trigSumPoleSigns(add(fn('tan',s),fn('cos',s)),phaseLimit),null);
 assert.notDeepEqual(oscillatoryLimit(add(pow(c,-4),pow(t,2)),'inf'),inf(-1));
});
test('actual limit cards eliminate reported sum',()=>{
 for(const id of ['LIMSUP','LIMINF','LIM_ZERO']){
  const st=newGame();st.hands[0][0]=id;st.boards[1]=[f];const p=preview(st,{cardIndex:0,owner:1,target:0,side:'two'});
  assert.ok(p.ok,p.reason);assert.equal(p.state.boards[1].length,0);assert.equal(p.state.winner,0);
 }
});
