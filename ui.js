import {newGame,normalizeGame,preview,applyMove,chooseComMove,legalMoves,getCard,display} from './engine.js?v=0.2';
import {FUNCTION_CARDS,CONSTANTS} from './cards.js?v=0.2';
import {toLatex,cardLatex,mathMarkup} from './latex.js?v=0.5';
const $=id=>document.getElementById(id);
const formulaHtml=e=>mathMarkup(toLatex(e),display(e));
const cardHtml=id=>mathMarkup(cardLatex(id),getCard(id).label);
let game;
let selection={cardIndex:0,owner:1,target:0,partnerIndex:-1,C:0,side:'two',direction:'basisOverCard'};
let thinking=false;
let gameSerial=0;
function escapeHtml(v) {return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function containsFormal(e){return !!e&&(['I','D','L'].includes(e.t)||e.arg&&containsFormal(e.arg)||e.b&&containsFormal(e.b)||Array.isArray(e.v)&&e.v.some(containsFormal));}
function selectedCard() {return game?.hands[0][selection.cardIndex]||null;}
function currentMove() {
  const cardId=selectedCard(); if(!cardId) return null;
  const card=getCard(cardId);
  return {cardIndex:selection.cardIndex,owner:selection.owner,
    target:card.kind==='function'||card.kind==='global'?null:selection.target,
    partnerIndex:selection.partnerIndex, C:selection.C,side:selection.side,direction:selection.direction};
}
function save() {
  try {localStorage.setItem('basis-duel-save',JSON.stringify(game));}catch{}
}
function load() {
  try {
    const s=JSON.parse(localStorage.getItem('basis-duel-save'));
    if(s&&Array.isArray(s.boards)&&s.boards.length===2&&Array.isArray(s.hands)&&Array.isArray(s.deck)&&Number.isInteger(s.turn))return normalizeGame(s);
  }catch{}
  return null;
}
function start() {
  gameSerial++;
  thinking=false;
  game=newGame({extended:$('extended').checked,difficulty:$('difficulty').value});
  selection={cardIndex:0,owner:1,target:0,partnerIndex:-1,C:0,side:'two',direction:'basisOverCard'};
  save();render();
}
function fieldMarkup(owner) {
  const isEnemy=owner===1, name=isEnemy?'COM':'あなた', board=game.boards[owner];
  const fieldTarget=selection.owner===owner;
  const bases=board.length?board.map((e,i)=>`<button type="button" class="basis ${fieldTarget&&selection.target===i?'selected':''}" data-owner="${owner}" data-index="${i}" ${game.turn!==0||game.finished||thinking?'disabled':''} aria-label="${name}の基底 ${i+1} ${escapeHtml(display(e))}"><span class="index">BASIS ${String(i+1).padStart(2,'0')}${containsFormal(e)?' · 未評価':''}</span><span class="formula">${formulaHtml(e)}</span></button>`).join(''):'<div class="basis-empty">基底なし（0次元）</div>';
  return `<div class="field-head"><div class="person"><div class="avatar">${isEnemy?'C':'P'}</div><div><div class="person-name">${name}</div><div class="person-sub">${isEnemy?'COMPUTER OPPONENT':'PLAYER · YOU'}</div></div></div><div class="dimension"><strong>${board.length}</strong> 次元</div></div><div class="bases">${bases}</div>`;
}
function syncSelection() {
  selection.cardIndex=Math.max(0,Math.min(selection.cardIndex,game.hands[0].length-1));
  selection.target=Math.max(0,Math.min(selection.target,Math.max(0,game.boards[selection.owner].length-1)));
  const c=selectedCard()&&getCard(selectedCard());
  if(c?.id==='PLUS_C'&&selection.C===0)selection.C=1;
  if(c?.kind==='binary'){
    const valid=i=>i>=0&&i!==selection.cardIndex&&FUNCTION_CARDS.includes(game.hands[0][i]);
    if(!valid(selection.partnerIndex))selection.partnerIndex=game.hands[0].findIndex((id,i)=>valid(i));
  }
}
function handMarkup() {
  return game.hands[0].map((id,i)=>{
    const c=getCard(id);
    return `<button type="button" ${thinking||game.finished||game.turn!==0?'disabled':''} class="card ${escapeHtml(c.kind)} ${c.expansion?'expansion':''} ${selection.cardIndex===i?'selected':''}" data-card="${i}" title="${escapeHtml(c.description)}"><span class="card-type">${c.expansion?'拡張':c.kind==='function'?'関数':c.kind==='global'?'全体演算':'演算'}</span><span class="card-symbol">${cardHtml(id)}</span><span class="card-number">CARD ${i+1}</span></button>`;
  }).join('');
}
function actionMarkup() {
  if(game.finished){const result=game.winner===-1?'引き分け':game.winner===0?'あなたの勝利':'COMの勝利';return `<div class="result">${result} — あなた ${game.boards[0].length}次元 / COM ${game.boards[1].length}次元</div><button class="act-button" id="restart-btn" type="button">もう一度対戦</button>`;}
  if(game.turn!==0||thinking)return `<div class="action-title">COMが次の操作を選択しています</div><div class="action-desc">盤面の基底とカードの組合せを評価しています。</div>`;
  const id=selectedCard(); if(!id)return '<div class="action-desc">手札がありません</div>';
  const card=getCard(id),move=currentMove();
  const result=move?preview(game,move):{ok:false,reason:'カードを選択してください'};
  const targetName=selection.owner===0?'あなた':'COM';
  const targetText=card.kind==='global'||card.kind==='function'?`${targetName}の場`:`${targetName}の基底 ${selection.target+1}`;
  let opts='';
  if(card.kind==='binary') {
    const partnerOptions=game.hands[0].map((cid,i)=>({cid,i})).filter(({cid,i})=>i!==selection.cardIndex&&FUNCTION_CARDS.includes(cid));
    opts+=`<label class="input-group">材料となる関数カード<select id="partner-select">${partnerOptions.length?partnerOptions.map(({cid,i})=>`<option value="${i}" ${selection.partnerIndex===i?'selected':''}>${escapeHtml(getCard(cid).label)}（手札${i+1}）</option>`).join(''):'<option value="-1">なし</option>'}</select></label>`;
    if(id==='DIV')opts+=`<label class="input-group">割り算の向き<select id="direction-select"><option value="basisOverCard" ${selection.direction==='basisOverCard'?'selected':''}>基底 ÷ 関数</option><option value="cardOverBasis" ${selection.direction==='cardOverBasis'?'selected':''}>関数 ÷ 基底</option></select></label>`;
  }
  if(card.kind==='constant')opts+=`<label class="input-group">${id==='INTEGRATE'?'積分定数':'加算する定数'} C<select id="constant-select">${CONSTANTS.filter(c=>id!=='PLUS_C'||c!==0).map(c=>`<option value="${c}" ${selection.C===c?'selected':''}>${c}</option>`).join('')}</select></label>`;
  if(card.kind==='limitZero')opts+=`<label class="input-group">極限の方向<select id="side-select"><option value="two" ${selection.side==='two'?'selected':''}>両側</option><option value="plus" ${selection.side==='plus'?'selected':''}>右側（+0）</option><option value="minus" ${selection.side==='minus'?'selected':''}>左側（−0）</option></select></label>`;
  const summary=result.ok?`操作可能。次元の変化：あなた ${result.delta[0]>0?'+':''}${result.delta[0]} / COM ${result.delta[1]>0?'+':''}${result.delta[1]}${result.state.boards.some(board=>board.some(containsFormal))?'（未評価の式を含む）':''}`:result.reason;
  return `<div class="swap-note">現在の手で計算しづらいときは、カードを1枚交換できます（ターン消費）。</div><div class="action-header"><div><div class="action-title">${escapeHtml(card.label)} を使用</div><div class="action-desc">${escapeHtml(card.description)}</div></div><div class="action-target">対象：${escapeHtml(targetText)}</div></div><div class="action-row">${opts}<div class="preview ${result.ok?'':'invalid'}" role="status">${escapeHtml(summary)}</div><button class="hint-button" id="hint-btn" type="button">合法手を提案</button><button class="hint-button swap-button" id="swap-btn" type="button" ${game.deck.length?'':'disabled'}>選択中のカードを交換</button><button id="act-btn" class="act-button" type="button" ${result.ok?'':'disabled'}>操作する</button></div>`;
}
function render() {
  syncSelection();
  $('opponent').className='field opponent'; $('player').className='field';
  $('opponent').innerHTML=fieldMarkup(1);$('player').innerHTML=fieldMarkup(0);
  $('hand').innerHTML=handMarkup();$('action-panel').innerHTML=actionMarkup();
  $('hand-count').textContent=`${game.hands[0].length}枚`;
  $('deck-count').textContent=`山札 ${game.deck.length} 枚`;
  $('turn-indicator').textContent=game.finished?'対戦終了':game.turn===0?'あなたのターン':'COMのターン';
  $('turn-indicator').classList.toggle('busy',game.turn===1&&!game.finished);
  $('event-text').textContent=game.log[0];
  $('log').innerHTML=game.log.slice(0,8).map(t=>`<div class="log-item">${escapeHtml(t)}</div>`).join('');
}
function setSelectionFromMove(move){
  selection.cardIndex=move.cardIndex;selection.owner=move.owner;selection.target=move.target??0;
  if(move.partnerIndex!==undefined)selection.partnerIndex=move.partnerIndex;
  if(move.C!==undefined)selection.C=move.C;
  if(move.side!==undefined)selection.side=move.side;
  if(move.direction!==undefined)selection.direction=move.direction;
}
function runCom(){
  if(game.finished||game.turn!==1)return;
  const runningGame=gameSerial;
  thinking=true;render();
  setTimeout(()=>{
    if(runningGame!==gameSerial||game.turn!==1||game.finished)return;
    const move=chooseComMove(game);
    if(move)game=applyMove(game,move);
    thinking=false;selection.cardIndex=0;selection.owner=1;selection.target=0;selection.partnerIndex=-1;
    save();render();
  },360);
}
function takeTurn(move){
  const r=preview(game,move);
  if(!r.ok)return;
  game=r.state;selection.cardIndex=0;selection.partnerIndex=-1;
  save();render();runCom();
}
function hint(){
  const moves=legalMoves(game);
  if(!moves.length)return;
  const best=[...moves].sort((a,b)=>{
    const da=a.scoreDelta||[0,0],db=b.scoreDelta||[0,0];
    return (db[0]-db[1]*1.3)-(da[0]-da[1]*1.3);
  })[0];
  if(best.discard){$('event-text').textContent='有効な手がないためカード交換が必要です';takeTurn(best);return;}
  setSelectionFromMove(best);render();
  $('event-text').textContent='合法手を選択しました。操作内容を確認してください。';
}
function handleClick(e){
  const elem=e.target.closest('button');if(!elem)return;
  if(elem.dataset.card!==undefined) {selection.cardIndex=Number(elem.dataset.card);selection.partnerIndex=-1;selection.C=selectedCard()==='PLUS_C'?1:0;render();return;}
  if(elem.dataset.owner!==undefined){
    const owner=Number(elem.dataset.owner),idx=Number(elem.dataset.index);
    if(selection.owner===owner&&selection.target===idx&&game.boards[owner]?.[idx]){
      $('formula-title').textContent=(owner===1?'COM':'あなた')+' の基底 '+(idx+1);
      $('formula-body').innerHTML=formulaHtml(game.boards[owner][idx]);
      $('formula-dialog').showModal();return;
    }
    selection.owner=owner;selection.target=idx;render();return;
  }
  if(elem.id==='act-btn'){const move=currentMove();if(move)takeTurn(move);}
  if(elem.id==='hint-btn')hint();
  if(elem.id==='swap-btn'&&game.deck.length)takeTurn({discard:true,cardIndex:selection.cardIndex});
  if(elem.id==='restart-btn'||elem.id==='new-btn'){
    if(elem.id==='new-btn'&&!game.finished&&!confirm('対戦を最初からやり直しますか？'))return;
    start();
  }
  if(elem.id==='help-btn')$('help-dialog').showModal();
  if(elem.id==='close-help')$('help-dialog').close();
  if(elem.id==='close-formula')$('formula-dialog').close();
}
document.addEventListener('click',handleClick);
document.addEventListener('change',e=>{
  if(e.target.id==='partner-select')selection.partnerIndex=Number(e.target.value);
  if(e.target.id==='constant-select')selection.C=Number(e.target.value);
  if(e.target.id==='direction-select')selection.direction=e.target.value;
  if(e.target.id==='side-select')selection.side=e.target.value;
  if(['partner-select','constant-select','direction-select','side-select'].includes(e.target.id))render();
  if(e.target.id==='difficulty') {game.difficulty=e.target.value;save();}
});
const prior=load();
if(prior){game=prior;$('difficulty').value=prior.difficulty||'normal';$('extended').checked=!!prior.extended;render();if(game.turn===1&&!game.finished)runCom();}
else start();
window.addEventListener('load',()=>{if(game)render();});
