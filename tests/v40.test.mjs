import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,preview} from '../engine.js';
import {x,pow,fn} from '../game-math.js';
import {escapeText as esc} from '../latex.js';
import {feedbackEnglish} from '../operation-feedback.js';
import {rune} from '../sigil.js';
const source=readFileSync(new URL('../ui.js',import.meta.url),'utf8');
const actionSource=source.slice(source.indexOf('function errorRune('),source.indexOf('let fitFrame='));
function renderAction(game,c,move,result,message=null){
 const render=new Function('game','thinking','comScene','swapSelection','currentCard','currentMove','resultFor','isFieldCard','preview','selection','rune','optionsHtml','ritualResult','actionButton','message','esc','feedbackEnglish',actionSource+'\nreturn actionMarkup();');
 return render(game,false,null,null,()=>c,()=>move,()=>result,()=>false,preview,{operands:[]},rune,()=>'',()=>'<div>RESULT</div>',(id,icon,label,primary,disabled)=>'<button id="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>',message,esc,feedbackEnglish);
}
test('failed integral renders actual reason and disables cast rather than throwing',()=>{
 const s=newGame();s.boards[1]=[pow(x(),-1),fn('sin',x())];s.hands[0][0]='INT_ALL';
 const m={cardIndex:0,owner:1,target:0,interval:'all'},r=preview(s,m);
 assert.equal(r.ok,false);assert.equal(r.state,undefined);
 const html=renderAction(s,{kind:'interval'},m,r,{kind:'notice',text:'OLD MESSAGE'});
 assert.ok(html.includes(esc(rune(feedbackEnglish(r.reason)))));assert.match(html,/id="act-btn" disabled/);assert.ok(!html.includes('OLD MESSAGE'));assert.ok(html.includes(rune('INTEGRAL')));
});
test('new failure replaces old reason, successful and cleared selections remove stale feedback',()=>{
 const s=newGame();const c={kind:'single'},m={cardIndex:0,owner:1,target:0};
 const a=renderAction(s,c,m,{ok:false,reason:'積分できません'});
 const b=renderAction(s,c,m,{ok:false,reason:'定義域外です <x>'});
 assert.ok(a.includes(rune('Integral cannot be evaluated.')));assert.ok(b.includes(rune('Outside the supported domain.')));assert.ok(!b.includes(rune('Integral cannot be evaluated.')));assert.ok(!/[ぁ-んァ-ヶ一-龯]/.test(a+b));
 const success=renderAction(s,c,m,{ok:true,state:s});
 assert.ok(success.includes('RESULT'));assert.ok(!success.includes('error-detail'));
 const cleared=renderAction(s,null,null,null);assert.ok(!cleared.includes('error-detail'));
});

test('English rune feedback preserves known distinctions and safely escapes fallback text',()=>{
 assert.equal(feedbackEnglish('広義積分の境界で有限な収束値を確定できません'),'No verified finite boundary limit.');
 assert.equal(feedbackEnglish('この積分は対応済みの初等関数・特殊関数で表せません'),'No supported closed form for this integral.');
 assert.equal(feedbackEnglish('次元上限は4です'),'Maximum dimension is 4.');
 const s=newGame(),m={cardIndex:0,owner:1,target:0};
 const html=renderAction(s,{kind:'single'},m,{ok:false,reason:'Invalid <x>'});
 assert.ok(html.includes('aria-label="Invalid &lt;x&gt;"'));assert.ok(html.includes(esc(rune('Invalid <x>'))));
});

test('successful hints are neutral guidance; a rejected operation is still an error',()=>{
 const s=newGame(),c={kind:'single'},m={cardIndex:0,owner:1,target:0};
 const notice={kind:'notice',text:'提案した対象を確認して実行します。'};
 const html=renderAction(s,c,m,{ok:true,state:s},notice);
 assert.ok(html.includes('RESULT'));
 assert.ok(html.includes('preview notice'));
 assert.ok(html.includes(rune('Confirm the suggested target.')));
 assert.ok(!html.includes('preview invalid'));assert.ok(!html.includes('⊘'));assert.ok(!html.includes('error-kind'));assert.ok(!html.includes('error-detail'));
 const noMove=renderAction(s,null,null,null,{kind:'notice',text:'合法手が見つかりません。カード交換を試してください。'});
 assert.ok(noMove.includes('preview notice'));assert.ok(!noMove.includes('preview invalid'));
 const invalid=renderAction(s,c,m,{ok:false,reason:'積分できません'},notice);
 assert.ok(invalid.includes('preview invalid'));assert.ok(!invalid.includes('preview notice'));
 const rejected=renderAction(s,c,null,null,{kind:'error',text:'同じ基底を選択してください。'});
 assert.ok(rejected.includes('preview invalid'));
});
test('hint replaces stale feedback for all operand types and clears invalid selection on no moves',()=>{
 const hintSource=source.slice(source.indexOf('function hint(){'),source.indexOf('function runCom(){'));
 const invoke=new Function('game','moves','card','fresh','playerActive','legalMoves','currentCard','render','let selection={cardIndex:99},message={kind:"error",text:"OLD"};'+hintSource+';hint();return {selection,message};');
 const s=newGame(),fresh=()=>({cardIndex:-1,operands:[]});
 for(const kind of ['single','binary','boardBinary']){
  const m={cardIndex:0,owner:1,target:0,otherTarget:1,partnerIndex:1,scoreDelta:[0,-1]};
  const result=invoke(s,[m],{kind},fresh,()=>true,(_,o)=>[m],()=>({kind}),()=>{});
  assert.equal(result.message.kind,'notice');
  assert.equal(result.selection.cardIndex,0);
 }
 const empty=invoke(s,[],null,fresh,()=>true,()=>[],()=>null,()=>{});
 assert.equal(empty.selection.cardIndex,-1);assert.equal(empty.message.kind,'notice');
});
