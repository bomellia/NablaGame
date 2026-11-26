import {newGame,normalizeGame,preview,applyMove,chooseComMove,legalMoves,getCard,display,resign} from './engine.js?v=0.23';
import {FUNCTION_CARDS,CONSTANTS} from './cards.js?v=0.20';
import {toLatex,cardLatex,mathMarkup,escapeText as esc} from './latex.js?v=0.20';
import {rune,sealMarkup,logRune} from './sigil.js?v=0.27';
import {fitMath} from './fit-math.js?v=0.27';
const $=id=>document.getElementById(id);
const formula=e=>mathMarkup(toLatex(e),display(e));
const basisFormula=e=>mathMarkup('\\displaystyle '+toLatex(e),display(e));
const card=id=>mathMarkup(cardLatex(id),getCard(id).label);
const name=o=>o===1?'C':'P';
const fresh=()=>({cardIndex:-1,owner:null,target:null,partnerIndex:-1,C:0,side:'two',direction:'basisOverCard',operands:[]});
let game,selection=fresh(),thinking=false,gameSerial=0,comWorker=null,comScene=null,lastScene=null,message='',cached=null,swapSelection=null;
const playerActive=()=>game.turn===0&&!game.finished&&!thinking;
const currentCard=()=>getCard(game.hands[0][selection.cardIndex]);
const lockedCard=c=>!!game.pending&&(c?.kind==='function'||game.pending.phase==='chain'&&c?.kind==='global');
const isBinary=()=>currentCard()?.kind==='binary';
function currentMove(){
 if(swapSelection!==null)return null;
 const c=currentCard();if(!c||selection.owner===null)return null;
 if(!['function','global'].includes(c.kind)&&selection.target===null)return null;
 if(c.kind==='binary'&&selection.operands.length!==2)return null;
 return {cardIndex:selection.cardIndex,owner:selection.owner,target:['function','global'].includes(c.kind)?null:selection.target,partnerIndex:selection.partnerIndex,C:selection.C,side:selection.side,direction:selection.direction};
}
function resultFor(move){if(!move)return null;const key=JSON.stringify(move);if(cached?.game===game&&cached.key===key)return cached.result;const result=preview(game,move);cached={game,key,result};return result;}
function save(){try{localStorage.setItem('basis-duel-grimoire-v14',JSON.stringify(game));}catch{}}
function load(){try{const s=JSON.parse(localStorage.getItem('basis-duel-grimoire-v14')||localStorage.getItem('basis-duel-save-v14'));if(s&&s.version===14&&s.boards?.length===2&&Array.isArray(s.hands)&&Array.isArray(s.deck)&&s.hands.every((h,i)=>h.length+(s.pending&&i===s.turn?(s.pending.spent?.length||0):0)===8))return normalizeGame(s);}catch{}return null;}
function start(){gameSerial++;if(comWorker){comWorker.terminate();comWorker=null;}thinking=false;comScene=null;lastScene=null;selection=fresh();swapSelection=null;message='';cached=null;game=newGame({extended:$('extended').checked,difficulty:$('difficulty').value});save();render();}
function isFieldCard(c){return c&&['function','global'].includes(c.kind);}
function fieldMarkup(owner){
 const board=game.boards[owner],c=currentCard(),active=playerActive(),fieldMode=active&&isFieldCard(c);
 const marked=comScene?.stage>=2&&comScene.move?.owner===owner;
 const selected=i=>active&&(selection.owner===owner&&selection.target===i||game.pending?.phase==='chain'&&game.pending.owner===owner&&game.pending.target===i)||marked&&comScene.move?.target===i;
 return '<div class="field-head"><div class="person"><div class="avatar">'+name(owner)+'</div><div class="dimension"><strong>'+board.length+'</strong><span>'+rune('SEALS')+'</span></div></div>'+(fieldMode?'<button class="field-pick" data-field="'+owner+'" type="button" aria-label="Select entire field">◎ '+rune('FIELD')+'</button>':'')+'</div><div class="bases '+(marked&&comScene.move.target==null?'com-field-target':'')+'">'+(board.length?board.map((e,i)=>'<button type="button" class="basis '+(selected(i)?'selected ':'')+(marked&&comScene.move.target===i?'com-target ':'')+(active&&c&&!fieldMode?'target-ready ':'')+'" data-owner="'+owner+'" data-index="'+i+'" aria-label="'+name(owner)+' '+(i+1)+' '+esc(display(e))+'" '+(thinking?'disabled':'')+'>'+'<span class="seal-art">'+sealMarkup(e,'board-'+owner+'-'+i)+'</span><span class="basis-equation"><span class="card-ink">'+basisFormula(e)+'</span><span class="equation-overflow" aria-hidden="true">…</span></span><span class="seal-index">'+String(i+1).padStart(2,'0')+'</span></button>').join(''):'<div class="basis-empty" aria-label="Field destroyed">◇ '+rune('VOID')+'</div>')+'</div>';
}
function handMarkup(){return game.hands[0].map((id,i)=>{const c=getCard(id),material=isBinary()&&i!==selection.cardIndex&&FUNCTION_CARDS.includes(id),order=selection.operands.findIndex(z=>z.kind==='hand'&&z.index===i);return '<button type="button" '+(playerActive()&&(!lockedCard(c)||material)?'':'disabled')+' class="card '+esc(c.kind)+' '+(c.expansion?'expansion ':'')+(swapSelection!==null?(swapSelection.includes(i)?'selected swap-selected':''):(selection.cardIndex===i||order>=0?'selected':''))+' '+(material?'operand-choice':'')+'" data-card="'+i+'" aria-label="'+esc(id)+'"><span class="card-type">'+(c.kind==='function'?'◇':c.kind==='global'?'◎':'✧')+'</span><span class="card-symbol"><span class="card-ink">'+card(id)+'</span></span><span class="card-number">'+(order>=0?order+1:String(i+1).padStart(2,'0'))+'</span></button>';}).join('');}
function operandsHtml(state,move){if(move.pass)return rune('END');const id=state.hands[state.turn][move.cardIndex],c=getCard(id);if(move.discard)return (move.cardIndices??[move.cardIndex]).map(i=>card(state.hands[state.turn][i])).join(' / ');if(c.kind==='binary'){const a=formula(state.boards[move.owner][move.target]),b=card(state.hands[state.turn][move.partnerIndex]);return (move.direction==='cardOverBasis'?b:a)+' <span class="op-sign">'+card(id)+'</span> '+(move.direction==='cardOverBasis'?a:b);}if(isFieldCard(c))return card(id)+' → '+name(move.owner)+' ◎';return card(id)+' → '+formula(state.boards[move.owner][move.target]);}
function binarySelectionHtml(){const c=currentCard(),vals=selection.operands.map(z=>z.kind==='hand'?card(game.hands[0][z.index]):formula(game.boards[z.owner][z.index]));return (vals[0]||'<span class="operand-slot">Ⅰ</span>')+' <span class="op-sign">'+card(c.id)+'</span> '+(vals[1]||'<span class="operand-slot">Ⅱ</span>');}
function showFormula(owner,index){const e=game.boards[owner][index];if(!e)return;$('formula-title').textContent=name(owner)+' · '+String(index+1).padStart(2,'0');$('formula-body').innerHTML='<div class="inspect-seal">'+sealMarkup(e,'inspect')+'</div><div class="inspect-equation">'+basisFormula(e)+'</div>';$('formula-dialog').showModal();}
function optionsHtml(c){let s='';if(c.kind==='constant')s+='<label class="input-group">C <select aria-label="Constant" id="constant-select">'+CONSTANTS.filter(v=>c.id!=='PLUS_C'||v!==0).map(v=>'<option value="'+v+'" '+(v===selection.C?'selected':'')+'>'+v+'</option>').join('')+'</select></label>';if(c.kind==='limitZero')s+='<label class="input-group">x → <select aria-label="Limit direction" id="side-select">'+[['two','0'],['plus','0⁺'],['minus','0⁻']].map(([v,label])=>'<option value="'+v+'" '+(selection.side===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';return s;}
function effectHtml(result){const list=result?.effect?.result;if(!list?.length)return '';const removed=result.effect.erased||0;return '<div class="effect-formula"><span>→</span> '+list.map(formula).join(' , ')+(removed?' <small class="break-count">✦ −'+removed+'</small>':'')+'</div>';}
function ritualPreview(state,move,result){
 if(!move||move.target==null||!result?.ok||!result.effect?.result?.length)return '';
 const before=state.boards[move.owner]?.[move.target],after=result.effect.result[0];
 if(!before||!after)return '';
 const broken=result.effect.removed?.includes(move.target);
 return '<div class="ritual-preview"><div class="ritual-seal">'+sealMarkup(before,'rite-before')+'</div><span class="ritual-arrow">→</span><div class="ritual-seal '+(broken?'preview-broken':'')+'">'+(broken?'<svg viewBox="-84 -84 168 168" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M-12 -76A77 77 0 0 0 -74 21M-64 42A77 77 0 0 0 12 76M34 68A77 77 0 0 0 77 -7M71 -29A77 77 0 0 0 12 -76"/><path d="M-9 -73L5 -20 -10 0 13 23 -6 73M-70 21L-20 8 0 -8 27 8 74 -9"/></g><text x="0" y="6" text-anchor="middle" fill="currentColor" font-size="20">◇</text></svg>':sealMarkup(after,'rite-after'))+'</div></div>';
}
function ritualResult(state,move,result){
 const preview=ritualPreview(state,move,result);
 return '<div class="ritual-result'+(preview?' has-seals':'')+'">'+preview+'<div class="effect-summary">'+effectHtml(result)+'<div class="delta">'+deltaText(result)+'</div></div></div>';
}
function deltaText(result){return 'P '+(result.delta[0]>0?'+':'')+result.delta[0]+' / C '+(result.delta[1]>0?'+':'')+result.delta[1];}
function actionButton(id,icon,label,primary=false,disabled=false){return '<button id="'+id+'" class="'+(primary?'act-button':'hint-button')+'" type="button" aria-label="'+label+'" '+(disabled?'disabled':'')+'><span class="button-icon">'+icon+'</span><span class="button-rune">'+rune(label)+'</span></button>';}
function errorRune(s){return rune(/極限|収束|発散/.test(s)?'LIMIT':/積分/.test(s)?'INTEGRAL':/同じ|対象/.test(s)?'TARGET':/定義|分母|ゼロ/.test(s)?'DOMAIN':/合法手/.test(s)?'NO RITE':'INVALID');}
function actionMarkup(){
 if(game.finished)return '<div class="result">'+rune(game.winner===-1?'DRAW':game.winner===0?'VICTORY':'DEFEAT')+'</div><div class="action-buttons">'+actionButton('restart-btn','↻','RENEW',true)+'</div>';
 if(thinking||game.turn===1){const scene=comScene;return '<div class="flow-steps">'+[1,2,3].map(i=>'<span class="'+(scene?.stage>=i?'done':'')+'">'+i+' '+['','◇','◎','✧'][i]+'</span>').join('')+'</div><div class="flow-body"><div class="action-title">'+rune(scene?['','DRAW','MARK','CAST'][scene.stage]:'THINK')+'</div>'+(scene?.stage===3?ritualResult(scene.state,scene.move,scene.result):'')+'</div><div class="action-buttons">'+actionButton('skip-com','»','SKIP',false,!scene)+'</div>';}
 if(swapSelection!==null)return '<div class="flow-steps"><span class="current">↻ '+swapSelection.length+'</span></div><div class="flow-body"><div class="action-title">'+rune('SWAP')+'</div></div><div class="action-buttons confirm-actions">'+actionButton('cancel-btn','↶','BACK')+actionButton('swap-confirm','↻','SWAP',true,!swapSelection.length)+'</div>';
 const c=currentCard(),move=currentMove(),result=resultFor(move),confirming=!!move;
 const canChain=confirming&&!isFieldCard(c)&&!game.pending&&result?.ok&&!result.state.finished&&!result.effect.erased&&game.hands[0].some((id,i)=>i!==move.cardIndex&&i!==move.partnerIndex&&!['function','global'].includes(getCard(id)?.kind));
 const phase=game.pending?.phase==='chain'?rune('CHAIN')+' 2':game.pending?.phase==='bonus'?rune('BREAK')+' '+(game.pending.bonusCount||1):'';
 const actionLabel=result?.state.finished?'FINISH':result?.state.pending?.phase==='bonus'?'BREAK':'CAST';
 const title=!c?'DRAW':move?'CAST':c.kind==='binary'?(selection.operands.length?'SECOND':'FIRST'):isFieldCard(c)?'FIELD':'MARK';
 const buttons=confirming?'<div class="action-buttons confirm-actions" data-count="'+(canChain?3:2)+'">'+actionButton('cancel-btn','↶','BACK')+(canChain?actionButton('chain-btn','⛓','CHAIN'):'')+actionButton('act-btn','✧',actionLabel,true,!result?.ok)+'</div>':'<div class="action-buttons">'+actionButton('hint-btn','✦','HINT')+(game.pending?actionButton('pass-btn','»','END'):actionButton('swap-btn','↻','SWAP',false,!game.deck.length))+(c?actionButton('cancel-btn','↶','BACK'):'')+'</div>';
 return '<div class="flow-steps"><span class="'+(c?'done':'current')+'">1 ◇</span><span class="'+(c&&!move?'current':move?'done':'')+'">2 ◎</span><span class="'+(move?'current':'')+'">3 ✧</span></div><div class="flow-body"><div class="action-title">'+(phase?phase+' · ':'')+rune(title)+'</div>'+(c?optionsHtml(c):'')+(move&&result?.ok?ritualResult(game,move,result):'')+(result&&!result.ok||message?'<div class="preview invalid" role="status" aria-label="Operation unavailable">⊘ '+errorRune(result?.reason||message)+'</div>':'')+'</div>'+buttons;
}
let fitFrame=null;
function scheduleFit(){
 if(typeof requestAnimationFrame!=='function'){fitMath(document);return;}
 if(fitFrame!==null)return;
 fitFrame=requestAnimationFrame(()=>{fitFrame=null;fitMath(document);});
}
function render(){
 const scroll=['opponent','player','hand'].map(k=>{const e=k==='hand'?$(k):$(k).querySelector('.bases');return e?.scrollLeft||0;});
 const fieldPick=playerActive()&&isFieldCard(currentCard());$('opponent').className='field opponent'+(fieldPick?' field-selectable':'');$('player').className='field'+(fieldPick?' field-selectable':'');$('opponent').innerHTML=fieldMarkup(1);$('player').innerHTML=fieldMarkup(0);$('hand').innerHTML=handMarkup();
 const c=currentCard(),active=selection.owner===null||selection.target===null?null:game.boards[selection.owner]?.[selection.target];
 $('selected-card').innerHTML=swapSelection!==null?'↻':thinking&&comScene?.move?(comScene.move.pass?'»':comScene.move.discard?'↻':card(comScene.state.hands[1][comScene.move.cardIndex])):c?card(c.id):'◇';
 $('selected-card').innerHTML='<span class="card-ink">'+$('selected-card').innerHTML+'</span>';
 $('selected-label').textContent=thinking?'C':active?name(selection.owner)+' · '+String(selection.target+1).padStart(2,'0'):rune('RITE');
 $('selected-formula').innerHTML=swapSelection!==null?(swapSelection.map(i=>card(game.hands[0][i])).join(' / ')||rune('SWAP')):thinking&&comScene?.stage>=2?operandsHtml(comScene.state,comScene.move):thinking?rune('THINK'):isBinary()?binarySelectionHtml():active?formula(active):c?(isFieldCard(c)&&selection.owner!==null?name(selection.owner)+' ◎':rune('MARK')):rune('DRAW');
 $('action-panel').innerHTML=actionMarkup();$('hand-count').textContent=game.hands[0].length;$('deck-count').textContent='▤ '+game.deck.length;$('deck-mini').textContent='▤ '+game.deck.length;$('turn-indicator').textContent=game.finished?rune('END'):name(game.turn)+' · '+(game.pending?.phase==='bonus'?rune('BREAK')+' '+(game.pending.bonusCount||1):game.pending?rune('CHAIN'):rune('TURN'));$('turn-indicator').classList.toggle('busy',game.turn===1&&!game.finished);$('event-text').textContent=game.turn===0?'◈':'◇';$('log').innerHTML=game.log.slice(0,8).map(t=>'<div class="log-item">'+logRune(t)+'</div>').join('');$('log-mobile').innerHTML=game.log.map(t=>'<div class="log-item">'+logRune(t)+'</div>').join('');
 scheduleFit();
 ['opponent','player','hand'].forEach((k,i)=>{const e=k==='hand'?$(k):$(k).querySelector('.bases');if(e)e.scrollLeft=scroll[i];});if(thinking&&comScene?.stage===2&&comScene.move?.target!=null){const e=$(comScene.move.owner===1?'opponent':'player').querySelector('.com-target');e?.scrollIntoView({block:'nearest',inline:'nearest'});}
}
// Animate the exact indices removed by rank reduction. Ghosts retain the old
// seal on screen while the new board is rendered, and never intercept input.
function animateBreak(move,result){
 if(!result?.effect?.erased||move.owner==null||typeof document.createElement!=='function'||!document.body)return;
 const field=$(move.owner?'opponent':'player'),indices=result.effect.removed||[];
 for(const i of indices){
  const old=field.querySelector('[data-index="'+i+'"]');if(!old)continue;
  const art=old.querySelector('.seal-art');if(!art)continue;
  const r=art.getBoundingClientRect(),ghost=document.createElement('div');
  ghost.className='break-ghost';ghost.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
  // Fracture only the geometric seal, not the separate equation label.
  for(let j=0;j<4;j++){
   const fragment=document.createElement('div');fragment.className='seal-fragment fragment-'+j;
   fragment.innerHTML=art.innerHTML;ghost.appendChild(fragment);
  }
  for(let j=0;j<8;j++){const shard=document.createElement('i');shard.style.setProperty('--a',j*45+'deg');ghost.appendChild(shard);}
  document.body.appendChild(ghost);setTimeout(()=>ghost.remove(),850);
 }
 if(result.state.boards[move.owner].length===0){field.classList.add('field-destroyed');}
}
function animateChange(move,result){
 if(move.owner==null||!result?.ok)return;
 const field=$(move.owner?'opponent':'player');
 if(result.delta[move.owner]>0){field.querySelector('.basis:last-child')?.classList.add('inscribed');}
 else if(!result.effect?.erased&&move.target!=null)field.querySelector('[data-index="'+move.target+'"]')?.classList.add('rewritten');
 if(result.state.boards[move.owner].length===0)field.classList.add('field-destroyed');
}
function takeTurn(move,result=resultFor(move)){if(!result?.ok){message=result?.reason||'操作できません';render();return;}animateBreak(move,result);game=result.state;selection=fresh();swapSelection=null;message='';lastScene=null;cached=null;save();render();runCom();animateChange(move,result);}
function chooseCard(i){if(lockedCard(getCard(game.hands[0][i])))return;selection=fresh();selection.cardIndex=i;selection.C=currentCard()?.id==='PLUS_C'?1:0;message='';lastScene=null;render();}
function selectOperand(z){if(game.pending?.phase==='chain'&&z.kind==='basis'&&(z.owner!==game.pending.owner||z.index!==game.pending.target)){message='同じ基底を選択してください。';render();return;}if(selection.operands.length>=2)return;if(selection.operands.some(a=>a.kind===z.kind)){message='場の基底と手札の関数カードを1枚ずつ選択してください。';render();return;}selection.operands.push(z);if(z.kind==='basis'){selection.owner=z.owner;selection.target=z.index;}else selection.partnerIndex=z.index;selection.direction=selection.operands[0].kind==='hand'?'cardOverBasis':'basisOverCard';message='';render();}
function selectTarget(owner,index){if(swapSelection!==null)return;if(!playerActive()){if(!thinking&&index!=null)showFormula(owner,index);return;}const c=currentCard();if(!c){if(index!=null)showFormula(owner,index);return;}if(game.pending?.phase==='chain'&&(owner!==game.pending.owner||index!==game.pending.target)){message='同じ基底を選択してください。';render();return;}if(c.kind==='binary'){if(index!=null)selectOperand({kind:'basis',owner,index});return;}if(!isFieldCard(c)&&index==null)return;selection.owner=owner;selection.target=isFieldCard(c)?null:index;message='';const move=currentMove();render();}
function hint(){if(!playerActive())return;const moves=legalMoves(game,{limit:1000,perCardOwner:10});const best=[...moves].filter(m=>!m.discard&&!m.pass).sort((a,b)=>{const da=a.scoreDelta||[0,0],db=b.scoreDelta||[0,0];return(db[0]-db[1]*1.3)-(da[0]-da[1]*1.3);})[0];if(!best){message=game.pending?'追加できる演算がありません。ターンを終了してください。':'合法手が見つかりません。カード交換を試してください。';render();return;}selection={...fresh(),...best,target:best.target??null};if(currentCard().kind==='binary'){const a={kind:'basis',owner:best.owner,index:best.target},b={kind:'hand',index:best.partnerIndex};selection.operands=best.direction==='cardOverBasis'?[b,a]:[a,b];}else{message='提案した対象を確認して実行します。';}render();}
function runCom(){if(game.finished||game.turn!==1)return;const serial=gameSerial;thinking=true;comScene=null;render();let ended=false,watchdog,worker;
 const valid=()=>serial===gameSerial&&game.turn===1&&!game.finished;
 const finishScene=()=>{if(!valid()||!comScene)return;const scene=comScene;animateBreak(scene.move,scene.result);comScene=null;thinking=false;game=scene.result.state;lastScene=scene.result.description;selection=fresh();message='';cached=null;save();render();if(game.turn===1&&!game.finished)runCom();animateChange(scene.move,scene.result);};
 const show=(move)=>{if(ended)return;ended=true;clearTimeout(watchdog);if(worker){worker.terminate();if(comWorker===worker)comWorker=null;}if(!valid())return;let result;try{result=move?preview(game,move):null;if(!result?.ok){move=game.pending?{pass:true}:{discard:true,cardIndex:0};result=preview(game,move);}}catch{}if(!result?.ok){thinking=false;game.log.unshift('COMの操作を確定できません。新規対戦を開始してください。');render();return;}const scene={state:game,move,result,stage:1,finish:finishScene};comScene=scene;render();setTimeout(()=>{if(!valid()||comScene!==scene)return;scene.stage=2;render();setTimeout(()=>{if(!valid()||comScene!==scene)return;scene.stage=3;render();setTimeout(()=>{if(comScene===scene)finishScene();},800);},650);},550);};
 try{worker=new Worker('./com-worker.js?v=0.23',{type:'module'});comWorker=worker;watchdog=setTimeout(()=>show(null),5000);worker.onmessage=e=>show(e.data?.move||null);worker.onerror=()=>show(null);worker.postMessage(game);}catch{setTimeout(()=>{if(!valid()||ended)return;let m=null;try{m=chooseComMove(game);}catch{}show(m);},80);}
}
document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el){const field=e.target.closest('#opponent,#player');if(field&&playerActive()&&isFieldCard(currentCard()))selectTarget(field.id==='opponent'?1:0,null);return;}if(el.dataset.card!==undefined&&playerActive()){const i=+el.dataset.card;if(swapSelection!==null){swapSelection=swapSelection.includes(i)?swapSelection.filter(j=>j!==i):[...swapSelection,i];render();return;}if(isBinary()&&i!==selection.cardIndex&&FUNCTION_CARDS.includes(game.hands[0][i]))selectOperand({kind:'hand',index:i});else if(i===selection.cardIndex){selection=fresh();message='';render();}else chooseCard(i);return;}if(el.dataset.field!==undefined){selectTarget(+el.dataset.field,null);return;}if(el.dataset.owner!==undefined){selectTarget(+el.dataset.owner,+el.dataset.index);return;}switch(el.id){case 'chain-btn':if(playerActive()&&currentMove())takeTurn({...currentMove(),continue:true});break;case 'pass-btn':if(playerActive()&&game.pending)takeTurn({pass:true});break;case 'act-btn':if(playerActive()&&currentMove())takeTurn(currentMove());break;case 'cancel-btn':swapSelection=null;selection=fresh();message='';render();break;case 'inspect-btn':showFormula(selection.owner,selection.target);break;case 'skip-com':comScene?.finish();break;case 'hint-btn':hint();break;case 'swap-btn':if(playerActive()&&!game.pending){swapSelection=currentCard()?[selection.cardIndex]:[];selection=fresh();message='';render();}break;case 'swap-confirm':if(playerActive()&&swapSelection?.length)takeTurn({discard:true,cardIndex:swapSelection[0],cardIndices:[...swapSelection]});break;case 'restart-btn':start();break;case 'resign-btn':if(!game.finished&&confirm(rune('YIELD')+' ?')){gameSerial++;if(comWorker){comWorker.terminate();comWorker=null;}thinking=false;comScene=null;swapSelection=null;game=resign(game);save();render();}break;case 'new-btn':if(game.finished||confirm(rune('RENEW')+' ?'))start();break;case 'help-btn':$('help-dialog').showModal();break;case 'settings-btn':$('settings-panel').classList.toggle('show');break;case 'history-btn':$('log-dialog').showModal();break;case 'close-log':$('log-dialog').close();break;case 'close-formula':$('formula-dialog').close();break;case 'close-help':$('help-dialog').close();break;}});
document.addEventListener('change',e=>{if(e.target.id==='constant-select'){selection.C=+e.target.value;selection.owner=null;selection.target=null;message='';render();}if(e.target.id==='side-select'){selection.side=e.target.value;selection.owner=null;selection.target=null;message='';render();}if(e.target.id==='difficulty'){game.difficulty=e.target.value;save();}});
const prior=load();if(prior){game=prior;save();$('difficulty').value=prior.difficulty||'normal';$('extended').checked=!!prior.extended;render();if(game.turn===1&&!game.finished)runCom();}else start();window.addEventListener('load',()=>{if(game)render();});
window.addEventListener('resize',scheduleFit);
if(typeof ResizeObserver!=='undefined'){
 const observer=new ResizeObserver(scheduleFit);
 observer.observe($('hand'));observer.observe($('selected-card'));
}
document.fonts?.ready?.then(scheduleFit);
document.fonts?.addEventListener?.('loadingdone',scheduleFit);
