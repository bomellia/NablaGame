import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, preview, applyMove, legalMoves} from '../engine.js';
import {x,constant as n,fn,add,mul,pow,div,limit,integrate,derivative,display,oscillatoryLimit,simplify} from '../symbolic-extended.js';
const X=x(),sin=fn('sin',X),cos=fn('cos',X);
const value=(e,point,side='two')=>limit(e,point,side);
const number=(e,point,expected,side='two')=>{
 const got=value(e,point,side);
 assert.equal(got.type,'finite',`expected ${expected} but ${JSON.stringify(got)} for ${display(e)}`);
 assert.ok(Math.abs(got.v-expected)<1e-8,`expected ${expected}, got ${got.v} for ${display(e)}`);
};
const infinity=(e,point,sign,side='two')=>assert.deepEqual(value(e,point,side),{type:'infinity',sign});
const missing=(e,point,side='two')=>assert.equal(value(e,point,side).type,'nonexistent',`expected nonexisting limit for ${display(e)}`);
test('sin/cos and cos/sin are canonicalized as tan/cot',()=>{
 assert.equal(display(div(sin,cos)),'tan(x)');
 assert.equal(display(div(cos,sin)),'cot(x)');
 assert.equal(display(mul(sin,pow(cos,-1))),'tan(x)');
 assert.equal(display(mul(cos,pow(sin,-1))),'cot(x)');
});
test('tan/cot and sec² integrals and derivatives',()=>{
 assert.match(display(integrate(fn('tan',X))),/ln\|cos/);
 assert.match(display(integrate(fn('cot',X))),/ln\|sin/);
 assert.equal(display(integrate(pow(cos,-2))),'tan(x)');
 assert.match(display(integrate(pow(sin,-2))),/cot/);
 assert.equal(display(integrate(pow(add(n(1),pow(X,2)),-1))),'arctan(x)');
 assert.deepEqual(simplify(derivative(integrate(fn('tan',X)))),simplify(fn('tan',X)));
});
test('ordinary limits at zero, infinity with exact classifications',()=>{
 number(div(sin,X),'zero',1);
 number(div(sin,X),'plus',0);
 number(div(add(n(1),mul(n(-1),cos)),pow(X,2)),'zero',.5);
 number(mul(X,fn('sin',pow(X,-1))),'zero',0);
 number(mul(X,fn('sin',pow(X,-1))),'plus',1);
});
test('divergence and oscillation do not silently become a basis',()=>{
 infinity(pow(X,-2),'zero',1);
 infinity(pow(X,-1),'zero',1,'plus');
 infinity(pow(X,-1),'zero',-1,'minus');
 missing(pow(X,-1),'zero');
 missing(sin,'plus');
 missing(fn('sin',pow(X,-1)),'zero');
 missing(fn('tan',X),'plus');
 missing(pow(cos,-2),'plus');
 missing(div(cos,sin),'zero');
 infinity(div(cos,sin),'zero',1,'plus');
 infinity(div(cos,sin),'zero',-1,'minus');
});
test('lim sup/inf are classified for periodic and divergent functions',()=>{
 assert.deepEqual(oscillatoryLimit(fn('tan',X),'sup'),{type:'infinity',sign:1});
 assert.deepEqual(oscillatoryLimit(fn('tan',X),'inf'),{type:'infinity',sign:-1});
 assert.deepEqual(oscillatoryLimit(X,'sup'),{type:'infinity',sign:1});
 assert.equal(oscillatoryLimit(pow(sin,2),'inf').v,0);
 assert.equal(oscillatoryLimit(pow(cos,2),'sup').v,1);
});
test('game outcome follows proved limit, not unknown or nonexisting limit',()=>{
 const s=newGame();s.turn=0;s.turns=4;s.hands[0]=['LIM_PLUS'];s.boards[1]=[sin];
 let p=preview(s,{owner:1,target:0,cardIndex:0});assert.equal(p.ok,false);assert.match(p.reason,/存在/);
 s.boards[1]=[pow(X,2)];p=preview(s,{owner:1,target:0,cardIndex:0});assert.equal(p.ok,true);
 assert.equal(p.state.boards[1].length,0);assert.equal(p.state.winner,0);
 s.boards[1]=[fn('sin',fn('exp',X))];p=preview(s,{owner:1,target:0,cardIndex:0});assert.equal(p.ok,false);
});
