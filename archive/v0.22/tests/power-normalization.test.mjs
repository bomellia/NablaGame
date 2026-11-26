import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,pow,fn,mul,div,simplify,derivative,integrate,limit,reduceBasis} from '../symbolic-extended.js';
import {toLatex} from '../latex.js';
import {newGame,preview,applyMove} from '../engine.js';
const X=x(), abs=fn('abs',X), sign=fn('sign',X), clean=simplify;
const eq=(a,b)=>assert.deepEqual(clean(a),clean(b));
test('even powers preserve real sign under square root',()=>{
 eq(fn('sqrt',pow(X,2)),abs);eq(fn('sqrt',pow(X,4)),pow(X,2));
 eq(fn('sqrt',pow(X,6)),pow(abs,3));eq(fn('sqrt',pow(X,-2)),pow(abs,-1));
 eq(fn('sqrt',mul(n(4),pow(X,2))),mul(n(2),abs));
});
test('powers compose and removable holes are ignored',()=>{
 eq(pow(pow(X,3),.5),pow(X,1.5));eq(pow(pow(X,.5),.5),pow(X,.25));
 eq(fn('sqrt',fn('sqrt',X)),pow(X,.25));eq(pow(fn('sqrt',X),-1),pow(X,-.5));
 eq(pow(fn('exp',X),.5),fn('exp',mul(n(.5),X)));
 eq(div(X,X),n(1));eq(div(pow(X,5),pow(X,2)),pow(X,3));
});
test('sign cancels absolute-value powers correctly',()=>{
 eq(div(X,fn('sqrt',pow(X,2))),sign);eq(div(fn('sqrt',pow(X,2)),X),sign);
 eq(div(pow(X,2),abs),abs);eq(div(abs,pow(X,2)),pow(abs,-1));
 eq(mul(sign,X),abs);eq(mul(sign,abs),X);eq(pow(sign,2),n(1));
 eq(div(sign,sign),n(1));eq(fn('abs',sign),n(1));
});
test('sign differentiation, integration, limits and basis rank',()=>{
 eq(derivative(sign),n(0));eq(integrate(sign),abs);eq(derivative(abs),sign);
 eq(derivative(integrate(abs)),abs);
 assert.deepEqual(limit(sign,'zero','plus'),{type:'finite',v:1});
 assert.deepEqual(limit(sign,'zero','minus'),{type:'finite',v:-1});
 assert.equal(limit(sign,'zero','two').type,'nonexistent');
 assert.deepEqual(limit(sign,'plus'),{type:'finite',v:1});
 assert.deepEqual(limit(sign,'minus'),{type:'finite',v:-1});
 assert.deepEqual(limit(pow(abs,-1),'zero','two'),{type:'infinity',sign:1});
 assert.equal(reduceBasis([sign,mul(n(2),div(X,fn('sqrt',pow(X,2))))]).kept.length,1);
 assert.equal(reduceBasis([n(1),sign]).kept.length,2);
 assert.match(toLatex(sign),/sgn/);
});
test('game square-root card normalizes before dependence test',()=>{
 const g=newGame();g.boards=[[X,abs],[pow(X,2),abs]];g.hands[0]=['SQRT'];g.turn=0;g.turns=1;
 const move={cardIndex:0,owner:1,target:0};assert.ok(preview(g,move).ok);
 assert.equal(applyMove(g,move).boards[1].length,1);
});
