import test from 'node:test';
import assert from 'node:assert/strict';
import {toLatex,cardLatex,escapeText,mathMarkup} from '../latex.js';
import {x,constant as n,fn,pow,mul,div,integrate,derivative} from '../symbolic-extended.js';
const X=x();
test('LaTeX fractions and trigonometry',()=>{
 assert.equal(toLatex(div(fn('sin',X),fn('cos',X))),'\\tan\\left(x\\right)');
 assert.equal(toLatex(div(n(1),pow(X,2))),'\\frac{1}{x^{2}}');
 assert.equal(toLatex(mul(n(-1),fn('sin',X))),'-\\sin\\left(x\\right)');
});
test('LaTeX integration, differentiation, special functions',()=>{
 assert.match(toLatex(integrate(div(n(1),fn('log',X)))),/\\operatorname\{Li\}/);
 assert.match(toLatex({t:'I',arg:X,order:2}),/\\underbrace/);
 assert.match(toLatex({t:'D',arg:fn('Si',X),order:2}),/\\frac\{\\mathrm\{d\}\^\{2\}\}/);
 assert.match(toLatex({t:'L',arg:fn('cos',X),point:'zero',side:'plus'}),/x\\to 0\^\+/);
});
test('every card has safe TeX and fallback escapes HTML',()=>{
 for(const id of ['X2','SIN','COS','NABLA','DELTA','INTEGRATE','LIMSUP','LIMINF','PLUS_C','REFLECT'])assert.ok(cardLatex(id));
 assert.equal(escapeText('<script>alert(1)</script>'),'&lt;script&gt;alert(1)&lt;/script&gt;');
 assert.equal(mathMarkup('x^2','<x>'),'&lt;x&gt;');
});
