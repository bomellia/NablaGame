import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,fn,pow,mul,add,div,limit,oscillatoryLimit} from '../game-math.js';
import {newGame,preview} from '../engine.js';
const X=x(),s=fn('sin',X),c=fn('cos',X),t=fn('tan',X),inf=sign=>({type:'infinity',sign});
function range(e,lo,hi){for(const [kind,v] of [['inf',lo],['sup',hi]]){const a=oscillatoryLimit(e,kind);if(Number.isFinite(v)){assert.equal(a.type,'finite');assert.ok(Math.abs(a.v-v)<1e-9,JSON.stringify(a));}else assert.deepEqual(a,inf(Math.sign(v)));}}
test('trig rational extrema and removable poles',()=>{
 range(add(pow(c,-2),mul(n(-1),pow(t,2))),1,1);
 assert.deepEqual(limit(add(pow(c,-2),mul(n(-1),pow(t,2))),'plus'),{type:'finite',v:1});
 range(div(s,add(n(2),c)),-1/Math.sqrt(3),1/Math.sqrt(3));
 range(div(n(1),add(n(1),mul(n(-1),s))),.5,Infinity);
 range(div(n(1),add(n(2),c)),1/3,1);
 range(div(n(1),add(n(.5),c)),-Infinity,Infinity);
 range(div(add(n(1),mul(n(-1),pow(c,2))),pow(s,2)),1,1);
 range(div(pow(s,2),add(n(2),c)),0,4-2*Math.sqrt(3));
 range(add(fn('sin',mul(n(2),X)),mul(n(-2),s,c)),0,0);
 range(add(pow(c,-4),pow(t,2)),1,Infinity);
});
test('reported sum and cards',()=>{const e=add(div(mul(n(-12),s,pow(t,2)),pow(c,3)),div(mul(n(-12),t),pow(c,4)),div(mul(n(-4),s),pow(c,3)));range(e,-Infinity,Infinity);for(const id of ['LIMSUP','LIMINF']){const st=newGame();st.boards[1]=[e];st.hands[0][0]=id;const p=preview(st,{cardIndex:0,owner:1,target:0});assert.ok(p.ok,p.reason);assert.equal(p.state.winner,0);}});
test('bounded or unrelated phases are not assigned spurious poles',()=>{assert.notDeepEqual(oscillatoryLimit(fn('tan',s),'sup'),inf(1));});

test('local removable singularity and signed one-sided poles',()=>{const u=div(add(n(1),mul(n(-1),c)),pow(s,2));assert.deepEqual(limit(u,'zero'),{type:'finite',v:.5});assert.deepEqual(limit(div(n(1),add(n(1),mul(n(-1),c))),'zero'),inf(1));assert.deepEqual(limit(pow(s,-1),'zero','plus'),inf(1));assert.deepEqual(limit(pow(s,-1),'zero','minus'),inf(-1));assert.deepEqual(limit(pow(s,-1),'zero'),{type:'nonexistent'});});
