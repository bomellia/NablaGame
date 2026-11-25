import test from 'node:test';
import assert from 'node:assert/strict';
import {x,constant as n,fn,mul,pow,complex,reduceBasis,simplify,integrate,limit,oscillatoryLimit} from '../game-math.js';
import {newGame,preview,normalizeGame} from '../engine.js';
const X=x(),s=fn('sin',X),c=fn('cos',X),a=fn('abs',s),sg=fn('sign',s);
test('complex proportional bases become real; genuinely complex bases remain',()=>{assert.deepEqual(reduceBasis([complex(n(0),a)]).kept,[a]);assert.deepEqual(reduceBasis([complex(s,mul(n(2),s)),s]).kept,[s]);assert.equal(reduceBasis([complex(X,s)]).kept[0].t,'complex');});
test('screenshot complex lower limit and sign products',()=>{assert.equal(oscillatoryLimit(complex(n(0),a),'inf').v,0);const e=mul(c,sg);assert.equal(oscillatoryLimit(e,'sup').v,1);assert.equal(oscillatoryLimit(e,'inf').v,-1);assert.equal(limit(e,'plus').type,'nonexistent');assert.equal(limit(mul(fn('exp',mul(n(-1),X)),sg),'plus').v,0);assert.deepEqual(simplify(integrate(e)),a);});
test('log exponent cancellation including nested screenshot',()=>{const u=mul(n(-.5),fn('sqrt',mul(n(-4),fn('log',X))));assert.deepEqual(simplify({t:'f',f:'exp',arg:{t:'f',f:'log',arg:u}}),simplify(u));assert.deepEqual(simplify(fn('exp',fn('log',X))),X);assert.deepEqual(simplify(fn('exp',fn('log',pow(X,3)))),pow(X,3));assert.deepEqual(simplify(fn('exp',fn('logabs',X))),fn('abs',X));});
test('game applies complex lower limit and migrates saved board',()=>{const g=newGame();g.hands[0][0]='LIMINF';g.boards[1]=[complex(n(0),a),s];const p=preview(g,{cardIndex:0,owner:1,target:0});assert.ok(p.ok,p.reason);assert.deepEqual(p.state.boards[1],[s]);assert.deepEqual(normalizeGame(g).boards[1],[a,s]);});
