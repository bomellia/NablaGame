import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,preview,normalizeGame,chooseComMove,limitWeight} from '../engine.js';
import {makeDeck,LIMIT_CARDS,CARD_MAP} from '../cards.js';
import {x,constant as n,fn,pow} from '../game-math.js';
const X=x(),inv=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
const go=(s,m)=>{const r=preview(s,m);assert.ok(r.ok,r.reason);return r.state;};
test('limit stockpiling cannot sweep three bases in one turn',()=>{
 const s=newGame();s.boards[1]=[X,pow(X,2),pow(X,3)];s.hands[0]=['LIM_PLUS','LIM_MINUS','LIM_ZERO','LIMSUP','DIFF','X','SIN','COS'];
 const a=go(s,{cardIndex:0,owner:1,target:0});assert.equal(a.boards[1].length,2);assert.equal(a.turn,1);assert.equal(a.pending,null);assert.equal(a.hands[0].length,8);assert.deepEqual(inv(a),inv(s));
});
test('nonlimit bonus still chains but a limit kill ends it',()=>{
 const s=newGame();s.boards[1]=[n(1),X,pow(X,2)];s.hands[0]=['DIFF','LIM_PLUS','LIM_MINUS','LIM_ZERO','X','SIN','COS','MUL'];
 const a=go(s,{cardIndex:0,owner:1,target:0});assert.equal(a.pending.phase,'bonus');
 const b=go(a,{cardIndex:0,owner:1,target:0});assert.equal(b.boards[1].length,1);assert.equal(b.turn,1);assert.equal(b.pending,null);assert.deepEqual(inv(b),inv(s));
});
test('balanced deck and v36 migration conserve counts and hand sizes',()=>{
 const s=newGame();delete s.rules37;const deck=makeDeck();for(const [id,replacement] of [['COMPOSE','LIM_PLUS'],['MUL','LIM_MINUS'],['INT_ALL','LIM_ZERO'],['CAUCHY','LIM_ZERO']])deck[deck.indexOf(id)]=replacement;
 s.hands=[deck.splice(0,8),deck.splice(0,8)];s.deck=deck;
 const a=normalizeGame(s);assert.deepEqual(a.boards,s.boards);assert.deepEqual(inv(a),makeDeck().sort());assert.deepEqual(a.hands.map(h=>h.length),[8,8]);assert.deepEqual(normalizeGame(a),a);
 assert.equal(makeDeck().filter(id=>LIMIT_CARDS.includes(id)).length,10);assert.equal(makeDeck().length,125);assert.equal(makeDeck(false).length,105);assert.equal(limitWeight(4),1);
});
test('COM prefers rescue at one dimension but takes a winning attack',()=>{
 const s=newGame({difficulty:'hard'});s.boards=[[n(1)],[X,pow(X,2),fn('cos',X)]];s.hands[0]=['X','LIM_PLUS','ONE','ZERO','INVERSE','SQUARE','RECIP','LOG'];
 const a=chooseComMove(s);assert.ok(preview(s,a).ok);assert.equal(a.owner,0);assert.equal(s.hands[0][a.cardIndex],'X');
 s.boards[1]=[X];const b=chooseComMove(s);assert.equal(go(s,b).winner,0);
});
