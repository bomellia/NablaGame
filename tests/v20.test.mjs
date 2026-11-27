import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,normalizeGame,legalMoves,chooseComMove} from '../engine.js';
import {x,constant as n,fn,pow,mul,compose,simplify} from '../game-math.js';
import {makeDeck} from '../cards.js';
const X=x(),sin=fn('sin',X),go=(s,m)=>{const p=preview(s,m);assert.ok(p.ok,p.reason);return p.state;};
const inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
test('repeat bonus without replenishment until end',()=>{
 const s=newGame();s.boards[1]=[n(1),X,pow(X,3),sin];s.hands[0]=['DIFF','INT_ALL','INT_ALL','INT_ALL','X','ONE','MUL','EXP_OP'];
 let a=go(s,{cardIndex:0,owner:1,target:0});assert.equal(a.pending.bonusCount,1);
 a=go(a,{cardIndex:0,owner:1,target:0,interval:'symmetricX'});assert.equal(a.pending.bonusCount,2);
 a=go(a,{cardIndex:0,owner:1,target:0,interval:'symmetricX'});assert.equal(a.pending.bonusCount,3);assert.deepEqual(a.deck,s.deck);assert.deepEqual(inv(a),inv(s));assert.equal(a.hands[0].length,5);
 a=go(a,{cardIndex:0,owner:1,target:0,interval:'symmetricX'});assert.equal(a.winner,0);assert.equal(a.pending,null);assert.equal(a.hands[0].length,8);assert.deepEqual(inv(a),inv(s));
});
test('bonus ends when next operation does not remove a basis',()=>{const s=newGame();s.boards[1]=[n(1),X,sin];s.hands[0]=['DIFF','EXP_OP','DIFF','X','ONE','MUL','DIV','LOG'];const a=go(s,{cardIndex:0,owner:1,target:0});const b=go(a,{cardIndex:0,owner:1,target:0});assert.equal(b.turn,1);assert.equal(b.pending,null);assert.deepEqual(inv(b),inv(s));});
test('composition both directions and undefined constant',()=>{
 assert.deepEqual(compose(sin,pow(X,2)),fn('sin',pow(X,2)));assert.deepEqual(compose(pow(X,2),sin),simplify(pow(sin,2)));assert.deepEqual(compose(sin,n(0)),n(0));assert.throws(()=>compose(pow(X,-1),n(0)));
 const s=newGame();s.boards[1]=[pow(X,2),X];s.hands[0][0]='COMPOSE';s.hands[0][1]='SIN';
 for(const [direction,expected] of [['basisOverCard',simplify(pow(sin,2))],['cardOverBasis',fn('sin',pow(X,2))]]){const a=go(s,{cardIndex:0,partnerIndex:1,owner:1,target:0,direction});assert.deepEqual(a.boards[1][0],expected);assert.deepEqual(inv(a),inv(s));}
 assert.equal(preview(s,{cardIndex:0,partnerIndex:1,owner:1,target:0}).ok,false);
 const moves=legalMoves(s).filter(m=>m.cardIndex===0&&m.partnerIndex===1&&m.owner===1&&m.target===0);assert.equal(moves.length,2);
});
test('new deck and idempotent legacy migration',()=>{const s=newGame();assert.equal(makeDeck().length,129);assert.equal(makeDeck(false).length,109);assert.equal(s.deck.length,113);delete s.compositionDeck;s.deck=s.deck.filter(id=>id!=='COMPOSE');s.hands=s.hands.map(h=>h.map(id=>id==='COMPOSE'?'X':id));const a=normalizeGame(s),b=normalizeGame(a);assert.equal(inv(a).filter(id=>id==='COMPOSE').length,3);assert.deepEqual(a,b);});
