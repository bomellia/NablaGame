import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,fn,mul,div,pow,add,simplify,limit,reduceBasis} from '../game-math.js';
import {toLatex,cardLatex} from '../latex.js';
const X=x(),e=fn('exp',X),l=fn('log',X);
test('exponential notation',()=>{assert.equal(toLatex(e),'e^{x}');assert.equal(toLatex(fn('exp',fn('sqrt',X))),'e^{\\sqrt{x}}');assert.equal(cardLatex('EXP_OP'),'\\exp');});
test('exponential identities',()=>{assert.deepEqual(simplify(mul(e,e)),simplify(fn('exp',mul(n(2),X))));assert.deepEqual(simplify(div(e,e)),n(1));assert.deepEqual(simplify(pow(e,2)),simplify(fn('exp',mul(n(2),X))));assert.deepEqual(simplify(fn('exp',add(X,l))),simplify(mul(X,e)));assert.deepEqual(simplify(fn('exp',add(X,mul(n(-1),l)))),simplify(div(e,X)));assert.equal(reduceBasis([fn('exp',add(X,n(1))),e]).kept.length,1);});
test('square-root exponential is retained and diverges at positive infinity',()=>{const f=fn('exp',fn('sqrt',X));assert.deepEqual(limit(f,'plus'),{type:'infinity',sign:1});});
