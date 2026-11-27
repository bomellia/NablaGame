import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,preview,legalMoves,normalizeGame,chooseComMove} from '../engine.js';
import {makeDeck,CARD_MAP} from '../cards.js';
import {x,constant as n,fn,pow,add,mul,compose,simplify,complex,realRepresentative,linearScale} from '../game-math.js';
const X=x(),inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
const eq=(a,b)=>assert.deepEqual(simplify(a),simplify(b));
const run=(s,m)=>{const r=preview(s,m);assert.ok(r.ok,r.reason);return r;};
test('scale choices and Euler conversion',()=>{
 const s=newGame();s.hands[0][0]='SCALE';s.boards[1]=[fn('sin',X),fn('cos',X)];
 for(const a of [.5,2])eq(run(s,{cardIndex:0,owner:1,target:0,a}).effect.result[0],fn('sin',mul(n(a),X)));
 const a=run(s,{cardIndex:0,owner:1,target:0,a:'i'});
 const expected=add(mul(n(.5),fn('exp',X)),mul(n(-.5),fn('exp',mul(n(-1),X))));
 eq(a.effect.result[0],complex(n(0),expected));eq(a.state.boards[1][0],expected);
 assert.equal(preview(s,{cardIndex:0,owner:1,target:0,a:1}).ok,false);
 eq(compose(fn('exp',X),complex(n(0),X)),complex(fn('cos',X),fn('sin',X)));
});
test('board arithmetic produces both exponential functions by Euler identities',()=>{
 const s=newGame(),ix=complex(n(0),X);
 const sh=realRepresentative(compose(fn('sin',X),ix)),ch=compose(fn('cos',X),ix);
 s.boards[0]=[sh,ch];s.hands[0][0]='ADD';s.hands[0][1]='SUB';
 const a=run(s,{cardIndex:0,owner:0,target:0,otherTarget:1});
 eq(a.state.boards[0][0],fn('exp',X));eq(a.state.boards[0][1],ch);
 const b=run(s,{cardIndex:1,owner:0,target:1,otherTarget:0});
 eq(b.state.boards[0][1],fn('exp',mul(n(-1),X)));eq(b.state.boards[0][0],sh);
 for(const r of [a,b]){assert.equal(r.delta[0],0);assert.deepEqual(inv(r.state),inv(s));}
 assert.equal(preview(s,{cardIndex:0,owner:0,target:0,otherTarget:0}).ok,false);
 assert.ok(legalMoves(s).some(m=>m.cardIndex===0&&m.owner===0&&m.target===0&&m.otherTarget===1));
});
test('three-step chain conserves all spent cards and does not refill early',()=>{
 const s=newGame();s.boards[1]=[pow(X,5),fn('sin',X)];s.hands[0]=['DIFF','DIFF','DIFF','DIFF','X','ONE','MUL','RECIP'];
 let a=s;
 for(let i=0;i<3;i++){a=run(a,{cardIndex:0,owner:1,target:0,continue:true}).state;assert.equal(a.pending.spent.length,i+1);assert.equal(a.pending.chainCount,i+1);assert.equal(a.hands[0].length,7-i);assert.deepEqual(inv(a),inv(s));}
 a=run(a,{pass:true}).state;assert.equal(a.hands[0].length,8);assert.equal(a.pending,null);assert.deepEqual(inv(a),inv(s));
});
test('dimension cap and retired cards',()=>{
 const s=newGame();s.boards[0]=[X,pow(X,2),pow(X,3),fn('sin',X)];s.hands[0][0]='ONE';
 assert.equal(preview(s,{cardIndex:0,owner:0}).ok,false);
 assert.ok(!legalMoves(s).some(m=>m.cardIndex===0&&m.owner===0));assert.equal(makeDeck().length,129);
 for(const id of ['SHIFT','SINH_X','COSH_X'])assert.equal(CARD_MAP[id],undefined);
 assert.ok(preview(s,chooseComMove(s)).ok);
});
test('legacy migration retires cards, caps dimension and conserves new inventory',()=>{
 const s=newGame();delete s.rules34;s.boards[0]=[X,pow(X,2),pow(X,3),fn('sin',X),fn('cos',X)];
 const old=makeDeck().map(id=>id==='SCALE'?'SHIFT':id).concat('SINH_X','COSH_X');s.hands=[old.splice(0,8),old.splice(0,8)];s.deck=old;
 const a=normalizeGame(s);assert.equal(a.boards[0].length,4);assert.deepEqual(inv(a),makeDeck().sort());assert.deepEqual(normalizeGame(a),a);
});
