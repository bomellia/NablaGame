import {CARD_MAP, CONSTANTS, FUNCTION_CARDS,makeDeck,HAND_SIZE,MAX_DIMENSION,SCALES,cardPool,LIMIT_CARDS,integralIntervals,integralInterval} from './cards.js?v=0.44';
import {Unsupported, x, constant, add, mul, div, derivative, integrate, inverse, fn,
  fromCard, limit, oscillatoryLimit, reduceBasis, display, expressionSize,
  hasEmptyRealDomain, substituteNegX, simplify, antiderivative,advancedOperation,compose,complex,linearScale} from './game-math.js?v=0.46';
const copy = obj => JSON.parse(JSON.stringify(obj));
function shuffle(items,random=Math.random) {
  const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
// Curated low-complexity candidates, independent of the card inventory.
// Both sides draw from one shuffled pool; no matched-family requirement.
export function openingPool(){
 const X=x(),n=constant,Q=fromCard('X2'),C=mul(Q,X),negative=e=>mul(n(-1),e),
  scaled=k=>mul(n(k),X),unitQ=add(n(1),Q),sin=fromCard('SIN'),cos=fromCard('COS');
 return [
  ['polynomial',[X,Q,C,mul(Q,Q),add(Q,X),add(C,negative(X)),add(Q,n(1))]],
  ['trigonometric',[sin,cos,fn('sin',scaled(2)),fn('cos',scaled(2)),fromCard('TAN'),mul(sin,sin),add(sin,cos)]],
  ['exponential',[fromCard('EXP'),fromCard('NEGEXP'),fn('exp',scaled(2)),fn('exp',scaled(-2)),fromCard('GAUSS'),mul(X,fromCard('NEGEXP'))]],
  ['rational',[fromCard('RECIP_X'),div(n(1),Q),fromCard('CAUCHY'),div(X,unitQ),div(n(1),mul(unitQ,unitQ))]],
  ['radical',[fromCard('ROOT_X'),fn('abs',X),fn('sqrt',unitQ)]],
  ['logarithmic',[fromCard('LN_X'),fn('log',unitQ)]],
  ['inverse-trig',[fn('atan',X),fn('asin',X)]]
 ].flatMap(([family,expressions])=>expressions.map(expr=>({family,expr:simplify(expr)})));
}
export function initialBoards(random=Math.random){
 const pool=shuffle(openingPool(),random);
 const boards=[[],[]],families=[new Map(),new Map()];
 const start=random()<.5?0:1;
 for(let round=0;round<3;round++){
  for(const owner of [start,1-start]){
   const board=boards[owner],counts=families[owner];
   // Keep three independent nonconstant directions, including independence
   // from 1 so adding a constant remains a meaningful defensive option.
   // Two members of one family are allowed; no family pairing across sides.
   const i=pool.findIndex(({family,expr})=>(counts.get(family)||0)<2&&
    reduceBasis([constant(1),...board,expr]).kept.length===board.length+2);
   if(i<0)throw new Error('Opening pool cannot provide an independent basis');
   const [{family,expr}]=pool.splice(i,1);
   board.push(expr);counts.set(family,(counts.get(family)||0)+1);
  }
 }
 return boards;
}
export function initialBoard(random=Math.random){return initialBoards(random)[0];}

/** Never turn a mathematically computable derivative into an inert D symbol.
 * No fixed AST or display length cap is applied. */
function safeDerivative(e){
 const value=simplify(derivative(simplify(e)));
 if(containsUnevaluatedDerivative(value))throw new Unsupported('微分結果を確定できません');
 return value;
}
function containsUnevaluatedDerivative(e){
 return !!e && (e.t==='D'||(e.t==='complex'&&(containsUnevaluatedDerivative(e.re)||containsUnevaluatedDerivative(e.im)))||(e.arg&&containsUnevaluatedDerivative(e.arg))||
   (e.b&&containsUnevaluatedDerivative(e.b))||(Array.isArray(e.v)&&e.v.some(containsUnevaluatedDerivative)));
}
function safeIntegral(e,C){
 // Unsupported integrals are illegal, but valid expressions have no size quota.
 return integrate(simplify(e),C);
}
/** A legacy formal limit was never proven. It must not take part in scoring. */
function hasLegacyLimit(e){
  return !!e && ((e.t==='L'||e.t==='I') || (e.t==='complex'&&(hasLegacyLimit(e.re)||hasLegacyLimit(e.im))) || (e.arg && hasLegacyLimit(e.arg)) ||
    (e.b && hasLegacyLimit(e.b)) || (Array.isArray(e.v) && e.v.some(hasLegacyLimit)));
}
/** Restore saved games made by older, less aggressive formula simplifiers. */
export function normalizeGame(game){
  const state=copy(game);
  let removed=0;
  state.boards=state.boards.map(board=>{
    const accepted=[];
    for(const expr of board){
      // Re-evaluating a legacy unproved limit is unsafe: it may be oscillatory,
      // zero or divergent. Remove it until a future domain-aware migration exists.
      if(hasLegacyLimit(expr)){removed++;continue;}
      try{accepted.push(simplify(expr));}
      catch(error){
        if(JSON.stringify(expr).includes('"t":"D"')){removed++;continue;}
        accepted.push(expr);
      }
    }
    return reduceBasis(accepted).kept;
  });
  if(removed){
    state.log=Array.isArray(state.log)?state.log:[];
    state.log.unshift(`旧版の未証明・未評価演算式を${removed}個除外しました。勝敗判定には使用できません。`);
    state.log=state.log.slice(0,16);
    if(state.boards.some(b=>b.length===0)){
      state.finished=true;
      const a=state.boards[0].length,b=state.boards[1].length;
      state.winner=a===b?-1:a>b?0:1;
    }
  }
  finish(state);
  // Old saves have no pending phase. If a migrated chain lost its target,
  // settle the already consumed cards instead of silently retargeting.
  if(state.pending&&(state.finished||state.pending.phase==='chain'&&
    (state.boards[state.pending.owner].length!==game.boards[state.pending.owner].length||
     !state.boards[state.pending.owner][state.pending.target])))endTurn(state,state.turn);
  // Add the two new cards once to an existing saved deck, without resetting play.
  if(!state.compositionDeck){
    const count=[...state.deck,...state.hands.flat(),...(state.pending?.spent||[])].filter(id=>id==='COMPOSE').length;
    for(let i=count;i<CARD_MAP.COMPOSE.count;i++)state.deck.splice(Math.floor(nextRandom(state)*(state.deck.length+1)),0,'COMPOSE');
    state.compositionDeck=true;
  }
  // Preserve ongoing matches and insert only the new expansion inventory once.
  if(!state.strategyDeck){
    if(state.extended!==false){
      const inventory=[...state.deck,...state.hands.flat(),...(state.pending?.spent||[])];
      for(const card of Object.values(CARD_MAP).filter(c=>c.strategy)){
        const count=inventory.filter(id=>id===card.id).length;
        for(let i=count;i<card.count;i++)state.deck.splice(Math.floor(nextRandom(state)*(state.deck.length+1)),0,card.id);
      }
    }
    state.strategyDeck=true;
  }
  if(!state.rules34||!state.rules37||!state.rules39){
    const convert=id=>id==='SHIFT'?'SCALE':id;
    state.deck=state.deck.map(convert).filter(id=>CARD_MAP[id]);
    state.hands=state.hands.map(h=>h.map(convert));
    if(state.pending)state.pending.spent=(state.pending.spent||[]).map(convert);
    const counts=new Map();for(const id of makeDeck(state.extended!==false))counts.set(id,(counts.get(id)||0)+1);
    const used=new Map(),keep=id=>{const k=used.get(id)||0;if(k>=(counts.get(id)||0))return false;used.set(id,k+1);return true;};
    const pending=state.pending,slots=[];
    state.hands=state.hands.map((h,p)=>h.map((id,i)=>{if(keep(id))return id;slots.push([p,i]);return null;}));
    if(pending)pending.spent=pending.spent.map(id=>keep(id)?id:null);
    state.deck=state.deck.filter(keep);
    for(const [id,count] of counts)for(let i=used.get(id)||0;i<count;i++)state.deck.splice(Math.floor(nextRandom(state)*(state.deck.length+1)),0,id);
    for(const [p,i] of slots)state.hands[p][i]=state.deck.pop();
    if(pending)pending.spent=pending.spent.map(id=>id||state.deck.pop());
    if(state.boards.some(b=>b.length>MAX_DIMENSION)){
      if(state.pending)endTurn(state,state.turn);
      state.boards=state.boards.map(b=>b.slice(0,MAX_DIMENSION));
      state.log.unshift('次元上限変更により5個目以降の基底を除外しました。');
    }
    state.rules34=true;state.rules37=true;state.rules39=true;
  }
  if(state.pending?.phase==='bonus'&&!state.pending.bonusCount)state.pending.bonusCount=1;
  state.version=14;
  return state;
}
export function newGame({extended=true,difficulty='normal',startingPlayer=0,random=Math.random}={}) {
  const deck=shuffle(makeDeck(extended),random);
  const hands=[[],[]];
  for(let i=0;i<HAND_SIZE;i++)for(let p=0;p<2;p++)hands[p].push(deck.pop());
  const boards=initialBoards(random);
  return {version:14,boards,hands,deck,rng:Math.floor(random()*4294967296)>>>0,turn:startingPlayer,
    turns:0,finished:false,winner:null,pending:null,compositionDeck:true,strategyDeck:true,rules34:true,rules37:true,rules39:true,extended,difficulty,
    log:['対戦を開始しました。基底を0次元にすると勝利です。']};
}
function opTargetRequired(kind) {return kind!=='function';}
export function validate(s,move) {
  if(s.finished)throw new Unsupported('対戦は終了しています');
  const actor=s.turn;
  if(move.cardIndex<0||move.cardIndex>=s.hands[actor].length)throw new Unsupported('カードが選択されていません');
  const cardId=s.hands[actor][move.cardIndex], card=CARD_MAP[cardId];
  if(!card)throw new Unsupported('カードが不正です');
  if(s.pending){
    if(card.kind==='function')throw new Unsupported('連続演算・追加行動では基底を追加できません');
    if(s.pending.phase==='chain'&&(card.kind==='global'||move.owner!==s.pending.owner||move.target!==s.pending.target))
      throw new Unsupported('2つ目の演算は同じ基底に適用してください');
    // Hand size is the resource limit; no fixed chain length.
  }
  if(move.continue&&['function','global'].includes(card.kind))throw new Unsupported('個別演算のみ連続使用できます');
  if(move.owner!==0&&move.owner!==1)throw new Unsupported('対象のプレイヤーが不正です');
  if(opTargetRequired(card.kind) && !(card.kind==='global')) {
    if(!Number.isInteger(move.target)||move.target<0||move.target>=s.boards[move.owner].length)throw new Unsupported('対象の基底を選んでください');
  }
  if(card.kind==='function'&&s.boards[move.owner].length>=MAX_DIMENSION)throw new Unsupported('次元上限は4です');
  if(card.kind==='boardBinary'&&(!Number.isInteger(move.otherTarget)||move.otherTarget===move.target||move.otherTarget<0||move.otherTarget>=s.boards[move.owner].length))throw new Unsupported('同じ場の異なる2基底を選んでください');
  if(card.kind==='interval'&&!integralInterval(cardId,move.interval))throw new Unsupported('積分区間を指定してください');
  if(card.kind==='diffSign'&&![1,-1].includes(move.diffSign))throw new Unsupported('D±1 の符号を選んでください');
  if(card.kind==='scale'&&!SCALES.includes(move.a))throw new Unsupported('倍率aを選んでください');
  if(cardId==='DELTA'&&s.turns===0)throw new Unsupported('先攻1ターン目のΔは使用できません');
  if(card.kind==='binary') {
    if(move.partnerIndex===move.cardIndex || !Number.isInteger(move.partnerIndex) || !FUNCTION_CARDS.includes(s.hands[actor][move.partnerIndex]))throw new Unsupported('別の関数カードが必要です');
    if(cardId==='COMPOSE'&&!['basisOverCard','cardOverBasis'].includes(move.direction))throw new Unsupported('合成順序（外側・内側）を指定してください');
  }
  if(card.kind==='constant') {
    if(!CONSTANTS.includes(move.C))throw new Unsupported('定数Cを選択してください');
    if(['PLUS_C','SHIFT'].includes(cardId)&&move.C===0)throw new Unsupported('追加カードのCは0以外にしてください');
  }
  if(card.kind==='limitZero' && !['two','plus','minus'].includes(move.side))throw new Unsupported('0への極限の向きを選択してください');
  return card;
}
function opSingle(id,basis,move,partner) {
  switch(id){
    case 'DIFF':return safeDerivative(basis);
    case 'DIFF_PM':return simplify(add(safeDerivative(basis),linearScale(basis,move.diffSign)));
    case 'DIFF2_PLUS':return simplify(add(safeDerivative(safeDerivative(basis)),basis));
    case 'INTEGRATE':return safeIntegral(basis,move.C);
    case 'MUL':return mul(basis,partner);
    case 'ADD':return add(basis,partner);
    case 'SUB':return add(basis,linearScale(partner,-1));
    case 'SCALE':return compose(basis,move.a==='i'?complex(constant(0),x()):mul(constant(move.a),x()));
    case 'RECIP':{
      if(basis.t==='n'&&basis.v===0)throw new Unsupported('0の逆数は定義されません');
      return div(constant(1),basis);
    }
    case 'COMPOSE':return move.direction==='cardOverBasis'?compose(partner,basis):compose(basis,partner);
    case 'DIV': {
      const numerator=basis;
      const denominator=partner;
      if(denominator.t==='n' && denominator.v===0)throw new Unsupported('恒等的に0となる式では除算できません');
      return div(numerator,denominator);
    }
    case 'SQRT':return fn('sqrt',basis);
    case 'LOG':return fn('log',basis);
    case 'INT_HALF':case 'INT_ALL':return advancedOperation(id,basis,move.interval);
    case 'EXP_OP':case 'SQUARE':case 'LAPLACE':return advancedOperation(id,basis);
    case 'INVERSE':return inverse(basis);
    case 'PLUS_C':return add(basis,constant(move.C));
    case 'REFLECT':return substituteNegX(basis);
    case 'LIM_PLUS':case 'LIM_MINUS':case 'LIM_ZERO':case 'LIMSUP':case 'LIMINF': {
      const result=id==='LIMSUP'||id==='LIMINF'?
        oscillatoryLimit(basis,id==='LIMSUP'?'sup':'inf'):
        limit(basis,id==='LIM_PLUS'?'plus':id==='LIM_MINUS'?'minus':'zero', move.side||'two');
      if(result.reason==='realDomain')throw new Unsupported('上極限・下極限には無限遠で実数値を取ることの確認が必要です');
      if(result.type==='nonexistent')throw new Unsupported('この極限は振動・左右差などにより存在しません');
      if(result.type==='infinity')return constant(0);
      if(result.type==='finite')return constant(result.v);
      if(result.type==='symbolic')return result.expr; // continuity gives a proven symbolic constant
      throw new Unsupported('極限の収束・発散を厳密に判定できません（未評価のまま使用不可）');
    }
    default:throw new Unsupported('未対応カードです');
  }
}
// Preview modifies only the cloned state's deterministic PRNG.
function nextRandom(state){state.rng=(Math.imul(state.rng>>>0,1664525)+1013904223)>>>0;return state.rng/4294967296;}
// Weighted draws without replacement; preserve the physical card inventory.
export function limitWeight(opponentDimension){return 1;}
function drawWeighted(state,actor){
 const deck=state.deck,w=limitWeight(state.boards[1-actor].length);
 if(w===1)return deck.pop();
 let total=0;for(const id of deck)total+=LIMIT_CARDS.includes(id)?w:1;
 let r=nextRandom(state)*total;
 for(let i=0;i<deck.length;i++){r-=LIMIT_CARDS.includes(deck[i])?w:1;if(r<0)return deck.splice(i,1)[0];}
 return deck.pop();
}
function consume(state,actor,indices){
 return [...indices].sort((a,b)=>b-a).map(i=>state.hands[actor].splice(i,1)[0]);
}
function replenish(state,actor,used){
 const deck=state.deck;
 if(deck.length<used.length)throw new Unsupported('山札データが不正です');
 for(const id of used)state.hands[actor].push(drawWeighted(state,actor));
 for(const id of used)deck.splice(Math.floor(nextRandom(state)*(deck.length+1)),0,id);
}
function recycle(state,actor,indices){replenish(state,actor,consume(state,actor,indices));}
function endTurn(state,actor,used=[]){
 const spent=[...(state.pending?.spent||[]),...used];
 replenish(state,actor,spent);state.pending=null;state.turn=1-actor;state.turns++;finish(state);
 return state;
}
export function deckCount(state){return state.deck.length;}
export function resign(state,actor=0){const s=copy(state);if(s.pending){replenish(s,s.turn,s.pending.spent);s.pending=null;}s.finished=true;s.winner=1-actor;s.log.unshift('投了しました。');return s;}
function finish(state) {
  if(state.boards.some(b=>b.length===0)){
    state.finished=true;
    const a=state.boards[0].length,b=state.boards[1].length;
    state.winner=a===b?-1:a>b?0:1;
  }
}
export function applyMove(s,move,trace=null) {
  if(move.pass){
    if(s.finished||!s.pending)throw new Unsupported('追加行動中のみ終了できます');
    const ns=copy(s);ns.log.unshift(`${s.turn===0?'あなた':'COM'}：追加の演算を行わずターン終了`);ns.log=ns.log.slice(0,16);
    return endTurn(ns,s.turn);
  }
  if(move.discard) {
    if(s.pending)throw new Unsupported('連続演算・追加行動中は交換できません');
    const ns=copy(s),actor=ns.turn;
    const indices=move.cardIndices??[move.cardIndex];
    if(s.finished||!Array.isArray(indices)||!indices.length||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=s.hands[actor].length))throw new Unsupported('交換するカードを正しく選択してください');
    ns.log.unshift(`${actor===0?'あなた':'COM'}：カードを${indices.length}枚交換（ターン消費）`);
    ns.log=ns.log.slice(0,16);
    recycle(ns,actor,indices);
    ns.turn=1-actor;ns.turns++;finish(ns);return ns;
  }
  const card=validate(s,move), actor=s.turn, id=card.id;
  const ns=copy(s), own=ns.boards[move.owner];
  const used=[move.cardIndex]; let info='';
  if(card.kind==='function') {
    own.push(simplify(fromCard(id)));
    if(trace)trace.result=[own.at(-1)];
    info=`${card.label} を基底に追加`;
  } else if(card.kind==='global') {
    const transformed=own.map(e=>simplify(id==='DELTA'?safeDerivative(safeDerivative(e)):safeDerivative(e)));
    own.splice(0,own.length,...transformed);
    if(trace)trace.result=transformed;
    info=`場全体を${id==='DELTA'?'2階':'1階'}微分`;
  } else {
    const logText=e=>{const t=display(e);return t.length>180?t.slice(0,177)+'…':t;};
    const before=logText(own[move.target]);
    const partner=card.kind==='binary'?fromCard(s.hands[actor][move.partnerIndex]):card.kind==='boardBinary'?own[move.otherTarget]:null;
    let after=simplify(opSingle(id,own[move.target],move,partner));
    if(!after)throw new Unsupported('演算結果を確定できません');
    own[move.target]=after;
    if(trace)trace.result=[after];
    info=`${before} → ${logText(after)}`;
    if(card.kind==='binary')used.push(move.partnerIndex);
  }
  const preCount=own.length;
  // Board arithmetic changes the first operand only. Keep every unaffected
  // independent direction before testing the rewritten target for dependence.
  let resolved;
  if(card.kind==='boardBinary'){
    const order=own.map((_,i)=>i).filter(i=>i!==move.target).concat(move.target);
    const reduced=reduceBasis(order.map(i=>own[i])),removed=new Set(reduced.removed);
    const kept=order.filter((_,i)=>!removed.has(i)).map((i,j)=>({i,e:reduced.kept[j]})).sort((a,b)=>a.i-b.i);
    resolved={kept:kept.map(z=>z.e),removed:reduced.removed.map(i=>order[i]).sort((a,b)=>a-b)};
  }else resolved=reduceBasis(own);
  ns.boards[move.owner]=resolved.kept;
  const erased=preCount-resolved.kept.length;
  if(trace){trace.erased=erased;trace.removed=resolved.removed.filter(i=>i<s.boards[move.owner].length);}
  const targetName=move.owner===0?'あなた':'COM';
  const actorName=actor===0?'あなた':'COM';
  ns.log.unshift(`${actorName}：${targetName}の場に ${card.kind==='interval'?'∫ '+integralInterval(id,move.interval).label:card.kind==='diffSign'?(move.diffSign===1?'D+1':'D−1'):card.label} ／ ${info}${erased?`（基底${erased}個消滅）`:''}`);
  ns.log=ns.log.slice(0,16);
  const spent=consume(ns,actor,used);
  finish(ns);
  const enemyErased=move.owner===1-actor&&ns.boards[move.owner].length<s.boards[move.owner].length;
  if(move.continue){
    if(ns.finished||erased||!ns.hands[actor].some(id=>CARD_MAP[id]&&!['function','global'].includes(CARD_MAP[id].kind)))
      throw new Unsupported('この操作からは連続演算できません');
    ns.pending={phase:'chain',owner:move.owner,target:move.target,spent:[...(s.pending?.spent||[]),...spent],chainCount:(s.pending?.chainCount||0)+1};
    return ns;
  }
  if(!ns.finished&&enemyErased&&ns.hands[actor].some(id=>CARD_MAP[id]&&CARD_MAP[id].kind!=='function')){
    ns.pending={phase:'bonus',bonusCount:(s.pending?.bonusCount||0)+1,spent:[...(s.pending?.spent||[]),...spent]};
    return ns;
  }
  return endTurn(ns,actor,spent);
}
export function preview(s,move) {
  try {
    const effect={};const after=applyMove(s,move,effect);
    return {ok:true,state:after,effect,delta:[after.boards[0].length-s.boards[0].length,after.boards[1].length-s.boards[1].length],description:after.log[0]};
  } catch(e) {
    if(e instanceof Unsupported || e instanceof RangeError)return {ok:false,reason:e.message};
    throw e;
  }
}
export function legalMoves(s,{limit=2500,perCardOwner=Infinity,includeState=false,shouldStop=null,uniqueCards=false}={}) {
  if(s.finished)return [];
  const moves=[],seenCards=new Set();
  for(let i=0;i<s.hands[s.turn].length;i++) {
    if(shouldStop?.())return moves;
    if(uniqueCards){const id=s.hands[s.turn][i];if(seenCards.has(id))continue;seenCards.add(id);}
    const card=CARD_MAP[s.hands[s.turn][i]];
    if(!card||s.pending&&card.kind==='function'||s.pending?.phase==='chain'&&card.kind==='global')continue;
    for(let owner=0;owner<2;owner++) {
      if(s.pending?.phase==='chain'&&owner!==s.pending.owner)continue;
      let accepted=0;
      const indices=s.pending?.phase==='chain'?[s.pending.target]:card.kind==='function'||card.kind==='global'?[null]:s.boards[owner].map((_,j)=>j);
      for(const target of indices) {
        let choices=[{}];
        if(card.kind==='binary') {
          choices=[];
          for(let j=0;j<s.hands[s.turn].length;j++) if(i!==j&&FUNCTION_CARDS.includes(s.hands[s.turn][j]))
            for(const direction of (card.id==='COMPOSE'?['basisOverCard','cardOverBasis']:['basisOverCard']))choices.push({partnerIndex:j,direction});
        }
        if(card.kind==='boardBinary')choices=s.boards[owner].map((_,otherTarget)=>({otherTarget})).filter(z=>z.otherTarget!==target);
        if(card.kind==='scale')choices=SCALES.map(a=>({a}));
        if(card.kind==='diffSign')choices=[-1,1].map(diffSign=>({diffSign}));
        if(card.kind==='interval')choices=integralIntervals(card.id).map(z=>({interval:z.id}));
        if(card.kind==='constant')choices=CONSTANTS.filter(c=>!(['PLUS_C','SHIFT'].includes(card.id)&&c===0)).map(C=>({C}));
        if(card.kind==='limitZero')choices=['two','plus','minus'].map(side=>({side}));
        for(const opts of choices) {
          if(shouldStop?.())return moves;
          const move={cardIndex:i,owner,target,...opts};
          const result=preview(s,move);
          if(result.ok){
            moves.push({...move,scoreDelta:result.delta,...(includeState?{nextState:result.state}:{})});
            accepted++;
            if(moves.length>=limit)return moves;
            if(accepted>=Math.max(perCardOwner,card.kind==='interval'?MAX_DIMENSION*integralIntervals(card.id).length:0))break;
          }
        }
        if(accepted>=Math.max(perCardOwner,card.kind==='interval'?MAX_DIMENSION*integralIntervals(card.id).length:0))break;
      }
    }
  }
  if(!moves.length)return s.pending?[{pass:true}]:s.hands[s.turn].map((_,i)=>({discard:true,cardIndex:i,cardIndices:[i]}));
  return moves;
}
function valueOf(e) {
  const text=display(e);
  let score=e.t==='n'?0.35:1;
  if(/arcsin|arccos|√|log|ln\|/.test(text))score+=0.55;
  if(/sin|cos|exp/.test(text))score+=0.3;
  if(text.length>28)score-=.1;
  return score;
}
function makeThreatEvaluator(){
 const cache=new Map(), tests=[...LIMIT_CARDS.map(id=>[id,id==='LIM_ZERO'?{side:'two'}:{}]),['LIM_ZERO',{side:'plus'}],['LIM_ZERO',{side:'minus'}],['DIFF',{}],['DIFF_PM',{diffSign:-1}],['DIFF_PM',{diffSign:1}],['DIFF2_PLUS',{}],['INT_ALL',{interval:'symmetricX'}]];
 return e=>{
  const key=JSON.stringify(e);if(cache.has(key))return cache.get(key);
  if(cache.size>=100||expressionSize(e)>80)return {zero:0,constant:0,derivative:false};
  let zero=0,constant=0,diff=false;const counted=new Set();
  for(const [id,opt] of tests){
   if(counted.has(id))continue;
   try{
    const v=simplify(opSingle(id,e,opt,null));
    if(v.t==='n'||v.t==='complex'&&v.re.t==='n'&&v.im.t==='n'){
     const z=v.t==='n'?v.v===0:v.re.v===0&&v.im.v===0;
     const w=CARD_MAP[id].count;
     if(z){zero+=w;if(id==='DIFF')diff=true;}else constant+=w;
     counted.add(id);
    }
   }catch{}
  }
  const result={zero,constant,derivative:diff};cache.set(key,result);return result;
 };
}
function boardRisk(board,threat){
 const constants=board.some(e=>e.t==='n'||e.t==='complex'&&e.re.t==='n'&&e.im.t==='n');
 return board.reduce((sum,e)=>{
  const t=threat(e),isConstant=e.t==='n'||e.t==='complex'&&e.re.t==='n'&&e.im.t==='n';
  return sum+Math.min(1.8,t.zero*.085+t.constant*(constants&&!isConstant?.075:.025)+(t.derivative?.18:0));
 },0)*(board.length===1?2:board.length===2?1.25:1);
}
function scoreMove(state,move,after,difficulty,threat) {
  const a=state.turn, enemy=1-a;
  if(after.finished){if(after.winner===a)return 10000;if(after.winner===enemy)return -10000;}
  const ownDelta=after.boards[a].length-state.boards[a].length;
  const otherDelta=state.boards[enemy].length-after.boards[enemy].length;
  const ownValue=after.boards[a].reduce((acc,e)=>acc+valueOf(e),0);
  const oppValue=after.boards[enemy].reduce((acc,e)=>acc+valueOf(e),0);
  const used=Number.isInteger(move.partnerIndex)&&move.partnerIndex>=0?2:1;
  const unchanged=JSON.stringify(state.boards)===JSON.stringify(after.boards);
  const defense=state.boards[a].length===1?23:state.boards[a].length===2?16:12;
  const risk=threat?boardRisk(after.boards[enemy],threat)-boardRisk(after.boards[a],threat):0;
  const bonus=after.turn===a&&after.pending?.phase==='bonus'?2.2:0;
  const raw=otherDelta*14+ownDelta*defense+0.9*(ownValue-oppValue)+risk*2.1+bonus-used*.45-(unchanged?5:0);
  if(difficulty==='easy') return raw*.3+Math.random()*15;
  if(difficulty==='hard') return raw+Math.random()*1.3;
  return raw+Math.random()*5;
}
export function chooseLegacyComMove(s) {
  // Search both players for every card instead of exhausting the first cards.
  // Preview results are reused for scoring, avoiding duplicate CAS work.
  const moves=legalMoves(s,{limit:1000,perCardOwner:10,includeState:true});
  if(!moves.length)return null;
  if(moves[0].pass)return {pass:true};
  const threat=makeThreatEvaluator();
  let best=moves[0],bestScore=-Infinity;
  const cardScores=new Map();
  for(const move of moves){
    const score=move.discard?(-1000+Math.random()):scoreMove(s,move,move.nextState,s.difficulty,threat);
    cardScores.set(move.cardIndex,Math.max(cardScores.get(move.cardIndex)??-Infinity,score));
    if(score>bestScore){bestScore=score;best=move;}
  }
  const usefulAttack=moves.some(m=>!m.discard&&m.scoreDelta?.[1-s.turn]<0);
  if(s.pending){
    // The free follow-up is optional. Spend cards only for immediate gains
    // or for a winning action; otherwise keep them for the next turn.
    if(!usefulAttack&&!moves.some(m=>m.scoreDelta?.[s.turn]>0)&&s.pending.phase!=='chain')return {pass:true};
    if(usefulAttack){const attacks=moves.filter(m=>m.scoreDelta?.[1-s.turn]<0);best=attacks.reduce((a,b)=>scoreMove(s,b,b.nextState,'hard',threat)>scoreMove(s,a,a.nextState,'hard',threat)?b:a);}
    if(usefulAttack||s.pending.phase!=='chain'){const {nextState,scoreDelta,...chosen}=best;return chosen;}
  }
  // Bounded two-step lookahead. No replacement cards are drawn between steps,
  // so this search uses only the known hand and board.
  if(s.hands[s.turn].filter(id=>CARD_MAP[id]?.kind!=='function').length>=2){
    const candidates=moves.filter(m=>!m.discard&&m.owner===1-s.turn&&m.target!=null&&
      m.scoreDelta?.[1-s.turn]===0&&m.scoreDelta?.[s.turn]===0&&m.nextState&&!m.nextState.finished)
      .sort((a,b)=>Number(LIMIT_CARDS.includes(s.hands[s.turn][a.cardIndex]))-Number(LIMIT_CARDS.includes(s.hands[s.turn][b.cardIndex])));
    // Round-robin across first card indices to avoid starving later cards.
    const shortlist=[],seen=new Set(),remaining=[];
    for(const m of candidates){const k=m.cardIndex+':'+m.target;if(seen.has(k))remaining.push(m);else{seen.add(k);shortlist.push(m);}}
    shortlist.push(...remaining);shortlist.length=Math.min(shortlist.length,18);
    for(const m of shortlist){
      const {nextState,scoreDelta,...first}=m;
      const p=preview(s,{...first,continue:true});if(!p.ok)continue;
      for(const second of legalMoves(p.state,{limit:48,perCardOwner:8,includeState:true})){
        if(second.pass||second.discard||!second.nextState||second.scoreDelta[1-s.turn]>=0)continue;
        const score=scoreMove(s,first,second.nextState,s.difficulty,threat)-1.1;
        if(score>bestScore){bestScore=score;best={...first,continue:true,scoreDelta:second.scoreDelta,nextState:second.nextState};}
      }
    }
    if(best.continue){const {nextState,scoreDelta,...chosen}=best;return chosen;}
  }
  if(s.pending)return {pass:true};
  // Exchange is evaluated from the visible hand and legal actions only.
  // Never inspect the order of unseen replacement cards.
  const hand=s.hands[s.turn], functions=hand.filter(id=>cardPool(id)==='function').length;
  const useful=new Set(moves.filter(m=>!m.discard&&(m.scoreDelta[s.turn]>0||m.scoreDelta[1-s.turn]<0)).flatMap(m=>[m.cardIndex,m.partnerIndex].filter(Number.isInteger)));
  const legal=new Set(moves.filter(m=>!m.discard).map(m=>m.cardIndex));
  const neutral=.9*(s.boards[s.turn].reduce((a,e)=>a+valueOf(e),0)-s.boards[1-s.turn].reduce((a,e)=>a+valueOf(e),0))+2.1*(boardRisk(s.boards[1-s.turn],threat)-boardRisk(s.boards[s.turn],threat));
  if(!useful.size){
    const bad=hand.map((id,i)=>({i,id})).filter(({i,id})=>(!legal.has(i)||(cardScores.get(i)??-Infinity)<neutral-1)&&!(functions===1&&cardPool(id)==='function')).map(v=>v.i);
    if((bad.length>=2&&bestScore<neutral+2)||moves.every(m=>m.discard)) {
      const indices=bad.length?bad:hand.map((_,i)=>i);
      return {discard:true,cardIndex:indices[0],cardIndices:indices};
    }
  }
  const {nextState,scoreDelta,...chosen}=best;
  return chosen;
}

// v0.45: bounded search across complete turns under hidden information.
// Search state is reconstructed from the public board and the actor's own hand.
// Never read the real opponent hand, deck order, or game RNG to plan an action.
const STRATEGY={
 easy:{depth:2,width:2,plans:2,samples:1,horizon:2,budget:500,ms:1000,noise:5},
 normal:{depth:4,width:4,plans:3,samples:2,horizon:3,budget:1600,ms:2700,noise:1.0},
 hard:{depth:6,width:6,plans:3,samples:3,horizon:5,budget:2800,ms:4200,noise:0.12}
};
function seeded(seed){let a=seed>>>0;return ()=>((a=(Math.imul(a,1664525)+1013904223)>>>0)/4294967296);}
function publicSeed(s){let h=2166136261;const data=JSON.stringify([s.boards,s.hands[s.turn],s.turn,s.turns,s.pending,s.extended]);for(let i=0;i<data.length;i++)h=Math.imul(h^data.charCodeAt(i),16777619);return h>>>0;}
function hypothetical(s,seed){
 const random=seeded(seed),actor=s.turn,hand=[...s.hands[actor]],spent=[...(s.pending?.spent||[])];
 const unseen=makeDeck(s.extended!==false);
 for(const id of [...hand,...spent]){const i=unseen.indexOf(id);if(i>=0)unseen.splice(i,1);}
 const deck=shuffle(unseen,random),hands=[[],[]];hands[actor]=hand;hands[1-actor]=deck.splice(0,HAND_SIZE);
 return {...copy({boards:s.boards,turn:actor,turns:s.turns,pending:s.pending,finished:s.finished,winner:s.winner,extended:s.extended,difficulty:s.difficulty}),hands,deck,rng:Math.floor(random()*4294967296),log:[]};
}
const bare=m=>{const {nextState,scoreDelta,...move}=m;return move;};
function handQuality(hand){
 const functions=hand.filter(id=>cardPool(id)==='function'&&id!=='ZERO').length;
 const operators=hand.filter(id=>cardPool(id)==='operator');
 const variety=new Set(operators).size;
 return Math.min(2,functions)*.85+variety*.21+operators.reduce((v,id)=>v+(LIMIT_CARDS.includes(id)?.43:['DIFF_PM','DIFF2_PLUS','DIFF','NABLA','DELTA','DIV','INT_ALL'].includes(id)?.28:.10),0);
}
function createStrategicEvaluator(stop){
 const threat=makeThreatEvaluator(),cache=new Map(),exactCache=new Map();
 function risk(board,exact=false){
  const key=JSON.stringify(board),target=exact?exactCache:cache;if(target.has(key))return target.get(key);
  // Cheap structural estimate for broad search, exact symbolic tests only on finalists.
  let result=board.reduce((v,e)=>v+(e.t==='n'?1.6:/^(sin|cos|exp)$/.test(e.f||'')?.65:e.t==='x'?.8:.35),0)*(board.length===1?2:board.length===2?1.25:1);
  if(exact&&!stop()&&exactCache.size<32&&board.every(e=>expressionSize(e)<=24)){
   result=boardRisk(board,threat);
   for(const id of ['NABLA','DELTA','MUL','DIV']){
    if(stop())break;
    let loss=0;
    if(id==='NABLA'||id==='DELTA'){
     try{const b=board.map(e=>id==='DELTA'?safeDerivative(safeDerivative(e)):safeDerivative(e));loss=board.length-reduceBasis(b).kept.length;}catch{}
    }else{
     for(let i=0;i<board.length&&!stop();i++)for(let j=0;j<board.length&&!stop();j++)if(i!==j){
      try{const b=[...board];b[i]=opSingle(id,b[i],{},b[j]);loss=Math.max(loss,board.length-reduceBasis(b).kept.length);}catch{}
     }
    }
    result+=loss*(id==='NABLA'?.65:id==='DELTA'?.33:.35);
   }
  }
  target.set(key,result);return result;
 }
 return (s,actor,exact=false)=>{
  if(s.finished)return s.winner===actor?10000:s.winner===1-actor?-10000:0;
  const a=s.boards[actor],b=s.boards[1-actor];
  const strength=d=>[0,0,24,38,49][d]??49;
  return strength(a.length)-strength(b.length)+.9*(a.reduce((v,e)=>v+valueOf(e),0)-b.reduce((v,e)=>v+valueOf(e),0))+1.7*(risk(b,exact)-risk(a,exact));
 };
}
function sameBoard(a,b){return JSON.stringify(a.boards)===JSON.stringify(b.boards);}
function planKey(s){return JSON.stringify([s.boards,s.hands[s.turn],s.pending?.phase,s.pending?.owner,s.pending?.target]);}
function planTurn(root,ctx,{width=3,depth=4,plans=4,rootSearch=false,allowSwap=true,quick=false,onBest=null}={}){
 const actor=root.turn,initialHand=root.hands[actor],terminal=[],seen=new Set();
 const initial={state:root,path:[],cost:0,remaining:initialHand};
 let frontier=[initial];
 const survival=node=>rootSearch&&root.boards[actor].length===1&&node.state.boards[actor].length===1&&!node.state.finished?18:0;
 const rating=node=>ctx.evaluate(node.state,actor)+.50*handQuality(node.remaining)-node.cost*.6-survival(node);
 let reported=-Infinity;
 const retain=(node,arr)=>{node.score=rating(node);arr.push(node);if(arr===terminal&&node.score>reported){reported=node.score;onBest?.(node);}};
 for(let level=0;level<depth&&frontier.length&&!ctx.stop();level++){
  const next=[];
  for(const node of frontier){
   if(ctx.stop())break;
   const s=node.state;
   if(s.pending&&node.path.length===0){const p=ctx.run(s,{pass:true});if(p?.ok)retain({...node,state:p.state,path:[{pass:true}]},terminal);}
   const moves=legalMoves(s,{limit:quick?48:rootSearch&&level===0?300:80,perCardOwner:quick?2:rootSearch&&level===0?12:6,includeState:true,uniqueCards:true,shouldStop:ctx.tick});
   for(const m of moves){
    if(m.pass||m.discard||!m.nextState)continue;
    const move=bare(m),used=[move.cardIndex,...(Number.isInteger(move.partnerIndex)?[move.partnerIndex]:[])];
    const remaining=s.hands[actor].filter((_,i)=>!used.includes(i));
    const n={state:m.nextState,path:[...node.path,move],cost:node.cost+used.length,remaining};
    if(n.state.finished||n.state.turn!==actor){
     retain(n,terminal);
     if(n.state.finished&&n.state.winner===actor)return [n];
    }else{
     retain(n,next);
     // Passing is always a valid conclusion of a bonus or chain.
     const p=ctx.run(n.state,{pass:true});if(p?.ok)retain({...n,state:p.state,path:[...n.path,{pass:true}]},terminal);
    }
    if(ctx.stop())break;
    if(!quick&&!m.nextState.finished&&m.nextState.turn!==actor&&move.target!=null&&!sameBoard(s,m.nextState)&&m.scoreDelta[actor]===0&&m.scoreDelta[1-actor]===0&&remaining.some(id=>!['function','global'].includes(CARD_MAP[id]?.kind))){
     const chain={...move,continue:true},p=ctx.run(s,chain);
     if(p?.ok){
      const candidate={...n,state:p.state,path:[...node.path,chain]};
      // On the last enemy basis, test known finishers before pruning setup moves.
      if(rootSearch&&p.state.boards[1-actor].length===1&&move.owner===1-actor){
       const h=p.state.hands[actor];
       for(let j=0;j<h.length&&!ctx.stop();j++){
        const id=h[j];let opts=LIMIT_CARDS.includes(id)?(id==='LIM_ZERO'?[{side:'two'},{side:'plus'},{side:'minus'}]:[{}]):id==='DIFF_PM'?[{diffSign:-1},{diffSign:1}]:id==='INT_ALL'?integralIntervals(id).map(v=>({interval:v.id})):['DIFF','DIFF2_PLUS','SQRT','LOG'].includes(id)?[{}]:[];
        for(const opt of opts){
         const fin={cardIndex:j,owner:1-actor,target:move.target,...opt},q=ctx.run(p.state,fin);
         if(q?.ok&&q.state.finished&&q.state.winner===actor){
          const winner={state:q.state,path:[...candidate.path,fin],cost:n.cost+1,remaining:h.filter((_,i)=>i!==j)};
          retain(winner,terminal);return [winner];
         }
        }
       }
      }
      retain(candidate,next);
     }
    }
   }
  }
  // Keep a separate quota for setup chains so immediate bonus paths do not
  // crowd out all preparatory moves. Deduplicate equivalent board/hand states.
  next.sort((a,b)=>b.score-a.score);
  const chosen=[],counts={chain:0,bonus:0};
  for(const n of next){const key=planKey(n.state),phase=n.state.pending?.phase;
   if(seen.has(key)||counts[phase]>=Math.ceil(width/2))continue;
   seen.add(key);counts[phase]++;chosen.push(n);if(chosen.length>=width)break;
  }
  frontier=chosen;
 }
 if(allowSwap&&!root.pending&&initialHand.length&&!ctx.stop()){
  // Discard redundant or low-value cards but preserve at least one useful
  // function for recovery and avoid throwing away every tactical operator.
  const useful=new Set(terminal.filter(n=>n.cost===1&&(n.state.boards[actor].length>root.boards[actor].length||n.state.boards[1-actor].length<root.boards[1-actor].length)).map(n=>n.path[0].cardIndex));
  const seenIds=new Set(),indices=[];
  initialHand.forEach((id,i)=>{const duplicate=seenIds.has(id);seenIds.add(id);if(!useful.has(i)&&(duplicate||id==='ZERO'||['REFLECT','PLUS_C','ADD','SUB'].includes(id)))indices.push(i);});
  if(!indices.length&&!useful.size){const i=initialHand.findIndex(id=>!LIMIT_CARDS.includes(id)&&cardPool(id)==='operator');indices.push(i>=0?i:0);}
  if(indices.length){const move={discard:true,cardIndex:indices[0],cardIndices:indices},p=ctx.run(root,move);
   if(p?.ok)retain({state:p.state,path:[move],cost:0,remaining:initialHand.filter((_,i)=>!indices.includes(i)),swap:true},terminal);
  }
 }
 terminal.sort((a,b)=>b.score-a.score);
 const selected=[],firstSeen=new Set();
 for(const n of terminal){const key=JSON.stringify(n.path[0]);if(firstSeen.has(key))continue;firstSeen.add(key);selected.push(n);if(selected.length>=plans)break;}
 if(rootSearch&&plans>1){
  const rescue=root.boards[actor].length===1?terminal.find(n=>n.state.boards[actor].length>1):null;
  const swap=!root.pending&&selected.every(n=>n.state.boards[1-actor].length===root.boards[1-actor].length&&n.state.boards[actor].length===root.boards[actor].length)?terminal.find(n=>n.swap):null;
  const alternative=rescue&&!selected.some(n=>n.state.boards[actor].length>1)?rescue:swap&&!selected.some(n=>n.swap)?swap:null;
  if(alternative){if(selected.length>=plans)selected.pop();selected.push(alternative);}
 }
 return selected;
}
export function chooseComMove(s,{timeMs,onProgress,now=Date.now,workBudget}={}){
 if(s.finished||!s.hands[s.turn].length)return s.pending?{pass:true}:null;
 const cfg=STRATEGY[s.difficulty]||STRATEGY.normal,seed=publicSeed(s),actor=s.turn,random=seeded(seed^0x5e4a8712);
 const duration=timeMs??cfg.ms,start=now(),deadline=start+duration,limit=workBudget??cfg.budget;let work=0,ceiling=limit,phaseDeadline=deadline;
 const stop=()=>work>=ceiling||now()>=phaseDeadline;
 const tick=()=>{if(stop())return true;work++;return false;};
 const ctx={stop,tick,run:(state,move)=>tick()?null:preview(state,move)};
 ctx.evaluate=createStrategicEvaluator(stop);
 const fallback=s.pending?{pass:true}:{discard:true,cardIndex:0,cardIndices:[0]};
 let best=fallback;onProgress?.(best);
 const root=hypothetical(s,seed),rootBudget=Math.max(1,Math.floor(limit*.45));
 ceiling=rootBudget;phaseDeadline=start+duration*.38;
 const candidates=planTurn(root,ctx,{width:cfg.width,depth:cfg.depth,plans:cfg.plans,rootSearch:true,onBest:n=>{best=n.path[0];onProgress?.(best,{phase:'turn',plies:1});}});
 if(!candidates.length)return best;
 best=candidates[0].path[0];onProgress?.(best);
 if(candidates[0].state.finished&&candidates[0].state.winner===actor)return best;
 // Common random scenarios for each candidate: replay the known turn on
 // independently sampled hands/decks, then opponent reply and our next turn.
 // Only complete rounds count, avoiding bias from partial timeouts.
 const outcomes=candidates.map(n=>({n,sum:0,count:0,worst:Infinity}));
 ceiling=limit;phaseDeadline=deadline;
 for(let sample=0;sample<cfg.samples&&!stop();sample++){
  const scenario=hypothetical(s,(seed+Math.imul(sample+1,0x9e3779b9))>>>0);
  const round=[];
  for(const o of outcomes){
   if(stop())break;
   let state=scenario,valid=true;
   for(const move of o.n.path){const p=ctx.run(state,move);if(!p?.ok){valid=false;break;}state=p.state;}
   if(!valid||state.turn===actor&&!state.finished)break;
   const initial=ctx.evaluate(state,actor);
   for(let ply=1;ply<cfg.horizon&&!state.finished;ply++){
    const moves=planTurn(state,ctx,{width:1,depth:2,plans:1,allowSwap:false,quick:true});
    if(!moves.length){if(stop()){valid=false;break;}const p=ctx.run(state,state.pending?{pass:true}:{discard:true,cardIndex:0});if(!p?.ok){valid=false;break;}state=p.state;}
    else state=moves[0].state;
   }
   if(!valid)break;
   const final=ctx.evaluate(state,actor);
   round.push({o,value:final>=10000?140:final<=-10000?-160:.30*initial+.70*final});
  }
  if(round.length!==outcomes.length)break;
  for(const {o,value} of round){o.sum+=value;o.count++;o.worst=Math.min(o.worst,value);}
  let bestScore=-Infinity;
  for(const o of outcomes){
   const base=ctx.evaluate(o.n.state,actor,true),future=o.sum/o.count;
   const exposure=s.boards[actor].length===1&&o.n.state.boards[actor].length===1&&!o.n.state.finished?18:0;
   const score=.42*base+.58*(.78*future+.22*o.worst)+.45*handQuality(o.n.remaining)-o.n.cost*.60-exposure+random()*cfg.noise;
   if(score>bestScore){bestScore=score;best=o.n.path[0];}
  }
  onProgress?.(best,{phase:'future',plies:cfg.horizon,scenarios:sample+1});
 }
 return best;
}

export function getCard(id){return CARD_MAP[id];}
export {display};
