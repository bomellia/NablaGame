import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,initialBoard} from '../engine.js';
import {x,constant as n,fn,pow,mul,div,add,integrate,display,simplify,reduceBasis,limit} from '../symbolic-extended.js';
import {toLatex} from '../latex.js';
import {makeDeck} from '../cards.js';
const X=x();
const eq=(a,b)=>assert.deepEqual(simplify(a),simplify(b));
test('x/x cancels without preserving excluded points: limit to zero is 1',()=>{
 const r=simplify(div(X,X));eq(r,n(1));assert.equal(limit(r,'zero').v,1);
});
test('polynomial rational cancellation and descending powers',()=>{
 const r=simplify(div(add(pow(X,2),n(-1)),add(X,n(-1))));
 eq(r,add(X,n(1)));
 assert.equal(display(add(n(2),pow(X,2),mul(n(3),X),pow(X,3))),'x^3 + x^2 + 3·x + 2');
 assert.equal(toLatex(add(n(2),pow(X,2),X)), 'x^{2} + x + 2');
});
test('Pythagorean trig identity and known trig products',()=>{
 eq(add(pow(fn('sin',X),2),pow(fn('cos',X),2)),n(1));
 eq(mul(fn('tan',X),fn('cos',X)),fn('sin',X));
});
test('general normalized basis dependence sees multiples of tan and rational functions',()=>{
 assert.equal(reduceBasis([fn('tan',X),mul(n(2),fn('tan',X))]).kept.length,1);
 assert.equal(reduceBasis([n(1),add(pow(fn('sin',X),2),pow(fn('cos',X),2))]).kept.length,1);
 const rational=div(add(pow(X,2),n(-1)),add(X,n(-1)));
 assert.equal(reduceBasis([rational,add(X,n(1))]).kept.length,1);
});
test('initial boards are shared and vary independently from deck shuffle',()=>{
 const a=initialBoard(()=>.1),b=initialBoard(()=>.9);
 assert.equal(a.length,3);assert.equal(b.length,3);
 assert.notDeepEqual(a,b);
 const s=newGame({random:()=>.5});assert.deepEqual(s.boards[0],s.boards[1]);
 assert.equal(s.boards[0].some(e=>e.t==='n'),false);
});
test('v14 limit-card frequencies',()=>{
 const deck=makeDeck(false);
 for(const id of ['LIM_PLUS','LIM_MINUS','LIM_ZERO','LIMSUP','LIMINF'])assert.equal(deck.filter(v=>v===id).length,({LIM_PLUS:3,LIM_MINUS:3,LIM_ZERO:4,LIMSUP:2,LIMINF:2})[id]);
});
test('elementary integrals sec csc tan cot sin squared and derivative substitutions',()=>{
 for(const e of [fn('sec',X),fn('csc',X),fn('tan',X),fn('cot',X),pow(fn('sin',X),2),mul(X,fn('exp',X)),mul(X,fn('sin',pow(X,2))),fn('sin',mul(n(3),X))]) {
   const integral=integrate(e);
   assert.ok(!JSON.stringify(integral).includes('"t":"I"'));
   assert.ok(!JSON.stringify(integral).includes('"t":"D"'));
 }
});
test('unmatched non-elementary primitive is rejected by move preview',()=>{
 const s=newGame();s.hands[0]=['INTEGRATE'];s.boards[1]=[fn('sin',fn('exp',X))];
 const result=preview(s,{cardIndex:0,owner:1,target:0,C:0});
 assert.equal(result.ok,false);assert.match(result.reason,/積分/);
});
