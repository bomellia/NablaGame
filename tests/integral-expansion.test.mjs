import test from 'node:test';
import assert from 'node:assert/strict';
import {x, constant as n, fn, pow, mul, div, add, simplify, derivative, integrate, display} from '../symbolic-extended.js';
import {toLatex} from '../latex.js';
import {displayNumber} from '../number-format.js';
import {newGame,preview,normalizeGame} from '../engine.js';
const X=x();
function ev(e,xv){
 switch(e.t){
  case 'n':return e.v;
  case 'x':return xv;
  case 'a':return e.v.reduce((v,t)=>v+ev(t,xv),0);
  case 'm':return e.v.reduce((v,t)=>v*ev(t,xv),1);
  case 'p':return ev(e.b,xv)**e.e;
  case 'f':{
   const v=ev(e.arg,xv);
   switch(e.f){
    case 'sin':return Math.sin(v);case 'cos':return Math.cos(v);
    case 'exp':return Math.exp(v);case 'sqrt':return Math.sqrt(v);
    case 'log':return Math.log(v);case 'logabs':return Math.log(Math.abs(v));
    case 'abs':return Math.abs(v);case 'atan':return Math.atan(v);
    case 'tan':return Math.tan(v);case 'cot':return 1/Math.tan(v);
    case 'sec':return 1/Math.cos(v);case 'csc':return 1/Math.sin(v);
    case 'asin':return Math.asin(v);case 'acos':return Math.acos(v);
    case 'sinh':return Math.sinh(v);case 'cosh':return Math.cosh(v);case 'tanh':return Math.tanh(v);
   }
  }
 }
 throw new Error('unhandled node in evaluator '+JSON.stringify(e));
}
const S=(arg)=>fn('sin',arg), C=arg=>fn('cos',arg), E=arg=>fn('exp',arg);
const cases=[
 ['inverse sqrt',div(n(1),fn('sqrt',X)),[.3,.7,1.4]],
 ['sqrt of x cubed',fn('sqrt',pow(X,3)),[.3,.7,1.4]],
 ['inverse sqrt of x cubed',pow(pow(X,3),-.5),[.3,.7,1.4]],
 ['inverse exponential',div(n(1),E(X)),[.3,.7,1.4]],
 ['linear power -3/2',pow(add(mul(n(2),X),n(1)),-1.5),[.3,.7,1.4]],
 ['quadratic power -3/2',pow(add(n(1),mul(n(-1),pow(X,2))),-1.5),[.3,.45,.7]],
 ['inverse sqrt of 1-x²',pow(add(n(1),mul(n(-1),pow(X,2))),-.5),[.3,.45,.7]],
 ['x/(1-x²)^3/2',mul(X,pow(add(n(1),mul(n(-1),pow(X,2))),-1.5)),[.3,.45,.7]],
 ['exp sin',mul(E(X),S(X)),[.3,.7,1.4]],
 ['exp(2x) cos(3x)',mul(E(mul(n(2),X)),C(mul(n(3),X))),[.3,.7,1.4]],
 ['sin cubed cos',mul(pow(S(X),3),C(X)),[.3,.7,1.4]],
 ['sin squared cos squared',mul(pow(S(X),2),pow(C(X),2)),[.3,.7,1.4]],
 ['sin to fifth',pow(S(X),5),[.3,.7,1.4]],
 ['cos to fourth',pow(C(X),4),[.3,.7,1.4]],
 ['exp over x^2',mul(E(X),pow(X,-2)),[.3,.7,1.4]],
 ['sin over x^3',mul(S(X),pow(X,-3)),[.3,.7,1.4]],
 ['cos over x^4',mul(C(X),pow(X,-4)),[.3,.7,1.4]],
 ['1+exp denominator',div(n(1),add(n(1),E(X))),[.3,.7,1.4]],
 ['exp/(3+2exp)',div(E(X),add(n(3),mul(n(2),E(X)))),[.3,.7,1.4]],
 ['1/(2+sin)',div(n(1),add(n(2),S(X))),[.3,.7,1.4]],
 ['cos/(2+sin)',div(C(X),add(n(2),S(X))),[.3,.7,1.4]],
 ['sin/(2+sin)',div(S(X),add(n(2),S(X))),[.3,.7,1.4]],
 ['1/(1+cos)',div(n(1),add(n(1),C(X))),[.3,.7,1.4]],
 ['1/(x²+4)',div(n(1),add(pow(X,2),n(4))),[.3,.7,1.4]],
 ['1/(x²-1)',div(n(1),add(pow(X,2),n(-1))),[.3,.7,1.4]],
 ['(sin+2)*exp',mul(add(S(X),n(2)),E(X)),[.3,.7,1.4]],
 ['(sin+2)/x',div(add(S(X),n(2)),X),[.3,.7,1.4]],
];
for(const [name,integrand,values] of cases){
 test('antiderivative check: '+name,()=>{
  const primitive=integrate(integrand);
  assert.ok(!JSON.stringify(primitive).includes('"t":"I"'));
  const differentiated=simplify(derivative(primitive));
  assert.ok(!JSON.stringify(differentiated).includes('"t":"D"'));
  for(const xv of values){
   const expected=ev(integrand,xv),actual=ev(differentiated,xv);
   assert.ok(Number.isFinite(actual));
   assert.ok(Math.abs(actual-expected)<2e-6*Math.max(1,Math.abs(expected)),
    name+' x='+xv+' expected '+expected+', got '+actual+', primitive '+display(primitive));
  }
 });
}
test('very long derivatives are never deferred',()=>{
 const big=mul(pow(S(X),-11),pow(C(X),4),pow(X,2));
 const state=newGame();state.hands[0]=['DIFF'];state.boards[1]=[big];
 const move=preview(state,{cardIndex:0,owner:1,target:0});
 assert.equal(move.ok,true,move.reason);
 assert.ok(!JSON.stringify(move.state.boards[1]).includes('"t":"D"'));
});
test('legacy D saved expressions are evaluated',()=>{
 const state=newGame();
 state.boards[1]=[{t:'D',arg:mul(S(X),E(X)),order:1}];
 const normalized=normalizeGame(state);
 assert.ok(!JSON.stringify(normalized.boards[1]).includes('"t":"D"'));
});
test('rational and irrational coefficients are presented consistently',()=>{
 const oneThird=n(1/3),sqrt2=n(Math.sqrt(2));
 assert.equal(displayNumber(oneThird.v),'1/3');
 assert.equal(toLatex(oneThird),'\\frac{1}{3}');
 assert.equal(toLatex(sqrt2),'1.41');
 assert.equal(displayNumber(n(-2/3).v),'-2/3');
 assert.equal(toLatex(pow(X,-.5)),'\\frac{1}{\\sqrt{x}}');
 assert.equal(toLatex(mul(oneThird,pow(X,3))),'\\frac{1}{3}\\,x^{3}');
});
test('integral only rejects presently unsupported special forms',()=>{
 assert.throws(()=>integrate(mul(E(X),fn('csc',X))),/積分/);
});
