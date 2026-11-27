import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,preview,normalizeGame,chooseComMove,resign} from '../engine.js';
import {x,constant as n,fn} from '../game-math.js';
const X=x(),sin=fn('sin',X);
const fixture=()=>{const s=newGame({random:()=>.37});s.boards=[[X],[sin,X,n(1)]];s.hands[0]=['COMPOSE','NEGEXP','LIM_PLUS','DIFF','X','DIV','PLUS_C','ONE'];return s;};
const inventory=s=>[...s.deck,...s.hands.flat(),...(s.pending?.spent||[])].sort();
const go=(s,m)=>{const p=preview(s,m);assert.ok(p.ok,p.reason);return p.state;};
const first={cardIndex:0,partnerIndex:1,owner:1,target:0,direction:'basisOverCard',continue:true};
test('two-step combo delays draw and limit elimination grants bonus',()=>{
 const s=fixture(),a=go(s,first);
 assert.equal(a.pending.phase,'chain');assert.equal(a.turn,0);assert.equal(a.turns,0);assert.equal(a.hands[0].length,6);
 assert.deepEqual(a.deck,s.deck);assert.deepEqual(inventory(a),inventory(s));
 for(const mv of [{cardIndex:0,owner:1,target:1},{discard:true,cardIndex:0},{cardIndex:2,owner:0}])assert.equal(preview(a,mv).ok,false);
 const b=go(a,{cardIndex:0,owner:1,target:0});
 assert.equal(b.pending.phase,'bonus');assert.equal(b.boards[1].length,2);assert.equal(b.hands[0].length,5);assert.equal(b.turn,0);
 assert.deepEqual(inventory(b),inventory(s));
});
test('optional pass and victory settle all consumed cards',()=>{
 const s=fixture(),a=go(s,first);
 const b=go({...s,hands:[['DIFF',...s.hands[0].slice(1)],s.hands[1]]},{cardIndex:0,owner:1,target:2});
 for(const pending of [a,b]){const c=go(pending,{pass:true});assert.equal(c.turn,1);assert.equal(c.turns,1);assert.equal(c.hands[0].length,8);assert.deepEqual(inventory(c),inventory(pending));assert.deepEqual(inventory(resign(pending)),inventory(pending));}
 assert.equal(preview(s,{pass:true}).ok,false);
 s.boards[1]=[sin];const w=go(go(s,first),{cardIndex:0,owner:1,target:0});assert.equal(w.finished,true);assert.equal(w.winner,0);assert.equal(w.pending,null);assert.equal(w.hands[0].length,8);
});
test('COM finds a winning two-step attack',()=>{const s=fixture();s.difficulty='hard';s.boards[1]=[sin];s.hands[0]=['COMPOSE','NEGEXP','LIM_PLUS','EXP_OP','INTEGRATE','SQRT','ONE','X'];const m=chooseComMove(s);assert.equal(m.continue,true);const a=go(s,m);const b=go(a,chooseComMove(a));assert.equal(b.winner,0);});
test('no bonus for removing own basis or adding dependent function',()=>{const s=fixture();s.boards[0]=[X,n(1)];s.hands[0][0]='DIFF';const a=go(s,{cardIndex:0,owner:0,target:1});assert.equal(a.pending,null);assert.equal(a.turn,1);s.hands[0][0]='X';const b=go(s,{cardIndex:0,owner:1});assert.equal(b.pending,null);assert.equal(b.turn,1);});
