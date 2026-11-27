import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,preview} from '../engine.js';
import {x,pow,fn} from '../game-math.js';
import {escapeText as esc} from '../latex.js';
const source=readFileSync(new URL('../ui.js',import.meta.url),'utf8');
const actionSource=source.slice(source.indexOf('function errorRune('),source.indexOf('let fitFrame='));
function renderAction(game,c,move,result,message=''){
 const render=new Function('game','thinking','comScene','swapSelection','currentCard','currentMove','resultFor','isFieldCard','preview','selection','rune','optionsHtml','ritualResult','actionButton','message','esc',actionSource+'\nreturn actionMarkup();');
 return render(game,false,null,null,()=>c,()=>move,()=>result,()=>false,preview,{operands:[]},s=>s,()=>'',()=>'<div>RESULT</div>',(id,icon,label,primary,disabled)=>'<button id="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>',message,esc);
}
test('failed integral renders actual reason and disables cast rather than throwing',()=>{
 const s=newGame();s.boards[1]=[pow(x(),-1),fn('sin',x())];s.hands[0][0]='INT_ALL';
 const m={cardIndex:0,owner:1,target:0,interval:'all'},r=preview(s,m);
 assert.equal(r.ok,false);assert.equal(r.state,undefined);
 const html=renderAction(s,{kind:'interval'},m,r,'OLD MESSAGE');
 assert.ok(html.includes(esc(r.reason)));assert.match(html,/id="act-btn" disabled/);assert.ok(!html.includes('OLD MESSAGE'));assert.ok(html.includes('INTEGRAL'));
});
test('new failure replaces old reason, successful and cleared selections remove stale feedback',()=>{
 const s=newGame();const c={kind:'single'},m={cardIndex:0,owner:1,target:0};
 const a=renderAction(s,c,m,{ok:false,reason:'積分できません'});
 const b=renderAction(s,c,m,{ok:false,reason:'定義域外です <x>'});
 assert.ok(a.includes('積分できません'));assert.ok(b.includes('定義域外です &lt;x&gt;'));assert.ok(!b.includes('積分できません'));
 const success=renderAction(s,c,m,{ok:true,state:s});
 assert.ok(success.includes('RESULT'));assert.ok(!success.includes('error-detail'));
 const cleared=renderAction(s,null,null,null);assert.ok(!cleared.includes('error-detail'));
});
