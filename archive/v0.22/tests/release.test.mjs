import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,normalizeGame,legalMoves,preview,chooseComMove} from '../engine.js';
import {x,constant,fn,formalLimit} from '../symbolic-extended.js';

test('legacy unknown limit must not contribute a winning basis',()=>{
 const s=newGame();
 s.boards[1]=[formalLimit(fn('sin',x()),'plus')];
 const next=normalizeGame(s);
 assert.equal(next.boards[1].length,0);
 assert.equal(next.winner,0);
 assert.equal(next.finished,true);
 assert.match(next.log[0],/未証明/);
});
test('COM candidate search is capped per card per owner and outputs legal actions',()=>{
 const s=newGame({difficulty:'hard'});
 const moves=legalMoves(s,{limit:140,perCardOwner:10});
 assert.ok(moves.length<=140);
 const tally=new Map();
 for(const m of moves){
   const key=`${m.cardIndex}:${m.owner}`;
   tally.set(key,(tally.get(key)||0)+1);
   assert.ok(preview(s,m).ok);
 }
 assert.ok([...tally.values()].every(v=>v<=10));
 const com=chooseComMove(s);
 assert.ok(com===null || (com.discard || preview(s,com).ok));
 assert.equal(com?.nextState,undefined);
});
