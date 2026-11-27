import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,fn,pow,mul,div,add,simplify,reduceBasis,derivative,integrate} from '../game-math.js';
import {newGame,preview,normalizeGame} from '../engine.js';
const X=x(),r=fn('sqrt',X),eq=(a,b)=>assert.deepEqual(simplify(a),simplify(b));
test('root and same-base powers merge',()=>{eq(mul(X,r),pow(X,1.5));eq(mul(pow(X,2),r),pow(X,2.5));eq(div(r,X),pow(X,-.5));eq(div(X,r),r);eq(mul(r,r),X);eq(div(r,pow(X,.5)),n(1));eq(mul(fn('sqrt',fn('sin',X)),fn('sin',X)),pow(fn('sin',X),1.5));eq(fn('sqrt',pow(X,2)),fn('abs',X));assert.equal(reduceBasis([r,pow(X,.5)]).kept.length,1);eq(add(r,pow(X,.5)),mul(n(2),r));});
test('derivative and integration of merged root product',()=>{const e=mul(X,r);eq(derivative(e),mul(n(1.5),r));eq(derivative(integrate(e)),e);});
test('multiply card and old saved board',()=>{const g=newGame();g.boards[1]=[r,X];g.hands[0][0]='MUL';const result=preview(g,{cardIndex:0,owner:1,target:0,otherTarget:1});assert.ok(result.ok,result.reason);eq(result.effect.result[0],pow(X,1.5));const old={t:'m',v:[{t:'f',f:'sqrt',arg:X},X]};g.boards[1]=[old];eq(normalizeGame(g).boards[1][0],pow(X,1.5));});
