import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,legalMoves,normalizeGame,chooseComMove} from '../engine.js';
import {makeDeck,CARD_MAP} from '../cards.js';
import {x,constant as n,fn,pow,mul,add,simplify} from '../game-math.js';
const X=x(),exp=fn('exp',X),negexp=fn('exp',mul(n(-1),X)),sin=fn('sin',X),cos=fn('cos',X);
const inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
const go=(s,m)=>{const r=preview(s,m);assert.ok(r.ok,r.reason);return r;};
test('differential annihilators erase matching functions, with ordinary bonuses',()=>{
 for(const [id,expr,opts] of [['DIFF_PM',exp,{diffSign:-1}],['DIFF_PM',negexp,{diffSign:1}],['DIFF2_PLUS',sin,{}],['DIFF2_PLUS',cos,{}]]){
  const s=newGame();s.boards[1]=[expr,pow(X,3)];s.hands[0][0]=id;s.hands[0][1]='DIFF';
  const r=go(s,{cardIndex:0,owner:1,target:0,...opts});
  assert.equal(r.delta[1],-1);assert.equal(r.state.pending.phase,'bonus');assert.deepEqual(inv(r.state),inv(s));
 }
});
test('nonmatching targets transform mathematically; sign required',()=>{
 const s=newGame();s.boards[1]=[pow(X,2),cos];s.hands[0][0]='DIFF_PM';s.hands[0][1]='DIFF2_PLUS';
 for(const diffSign of [-1,1]){
  const r=go(s,{cardIndex:0,owner:1,target:0,diffSign});
  assert.deepEqual(simplify(r.effect.result[0]),simplify(add(mul(n(2),X),mul(n(diffSign),pow(X,2)))));
 }
 const r=go(s,{cardIndex:1,owner:1,target:0});assert.deepEqual(simplify(r.effect.result[0]),simplify(add(pow(X,2),n(2))));
 assert.equal(preview(s,{cardIndex:0,owner:1,target:0,diffSign:0}).ok,false);
 assert.ok(legalMoves(s).some(m=>m.cardIndex===0&&m.diffSign===1));assert.ok(legalMoves(s).some(m=>m.cardIndex===0&&m.diffSign===-1));
});
test('scale then annihilate, and COM takes a winning new-card attack',()=>{
 const s=newGame({difficulty:'hard'});s.boards[1]=[fn('sin',mul(n(2),X))];s.hands[0]=['SCALE','DIFF2_PLUS','ONE','X','SIN','COS','EXP','NEGEXP'];
 const a=go(s,{cardIndex:0,owner:1,target:0,a:.5,continue:true}).state;
 assert.equal(go(a,{cardIndex:0,owner:1,target:0}).state.winner,0);
 s.boards[1]=[cos];assert.equal(go(s,chooseComMove(s)).state.winner,0);
});
test('four new cards added without changing old hands or boards',()=>{
 for(const extended of [false,true]){
  const s=newGame({extended});delete s.rules39;
  const deck=makeDeck(extended).filter(id=>!['DIFF_PM','DIFF2_PLUS'].includes(id));s.hands=[deck.splice(0,8),deck.splice(0,8)];s.deck=deck;
  const a=normalizeGame(s);assert.deepEqual(a.hands,s.hands);assert.deepEqual(a.boards,s.boards);assert.deepEqual(inv(a),makeDeck(extended).sort());assert.deepEqual(normalizeGame(a),a);
 }
 assert.equal(CARD_MAP.DIFF_PM.count,2);assert.equal(CARD_MAP.DIFF2_PLUS.count,2);assert.equal(makeDeck().length,129);assert.equal(makeDeck(false).length,109);
});
