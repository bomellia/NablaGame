import {CARD_MAP, CONSTANTS, FUNCTION_CARDS,makeDeck,HAND_SIZE,MAX_DIMENSION,SCALES,cardPool,LIMIT_CARDS,integralIntervals,integralInterval} from './cards.js?v=0.39';
import {Unsupported, x, constant, add, mul, div, derivative, integrate, inverse, fn,
  fromCard, limit, oscillatoryLimit, reduceBasis, display, expressionSize,
  hasEmptyRealDomain, substituteNegX, simplify, antiderivative,advancedOperation,compose,complex,linearScale} from './game-math.js?v=0.36';
const copy = obj => JSON.parse(JSON.stringify(obj));
function shuffle(items,random=Math.random) {
  const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
// Pair openings by family and approximate complexity, then independently
// randomize which player gets each member. No redraw loop or identical bases.
export function initialBoards(random=Math.random){
  const X=x(),Q=fromCard('X2'),C=mul(Q,X),n=constant;
  const pairs=[
    [[Q,C],[add(Q,X),add(Q,mul(n(-1),X))],[add(C,X),add(C,mul(n(-1),X))]],
    [[fromCard('SIN'),fromCard('COS')],[fn('sin',mul(n(2),X)),fn('cos',mul(n(2),X))]],
    [[fromCard('EXP'),fn('exp',mul(n(-1),X))],[fn('exp',mul(n(2),X)),fn('exp',mul(n(-2),X))]]
  ];
  const boards=[[],[]];
  for(const family of pairs){
    const pair=family[Math.min(family.length-1,Math.floor(random()*family.length))];
    const first=random()<.5?0:1;
    boards[0].push(simplify(pair[first]));boards[1].push(simplify(pair[1-first]));
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
    if(['DIV','COMPOSE','SUB'].includes(cardId)&&!['basisOverCard','cardOverBasis'].includes(move.direction))throw new Unsupported(cardId==='COMPOSE'?'合成順序（外側・内側）を指定してください':'演算の順序を指定してください');
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
      const numerator = move.direction==='cardOverBasis'?partner:basis;
      const denominator= move.direction==='cardOverBasis'?basis:partner;
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
  const resolved=reduceBasis(own);
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
export function legalMoves(s,{limit=2500,perCardOwner=Infinity,includeState=false}={}) {
  if(s.finished)return [];
  const moves=[];
  for(let i=0;i<s.hands[s.turn].length;i++) {
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
            for(const direction of (['DIV','COMPOSE','SUB'].includes(card.id)?['basisOverCard','cardOverBasis']:['basisOverCard']))choices.push({partnerIndex:j,direction});
        }
        if(card.kind==='boardBinary')choices=s.boards[owner].map((_,otherTarget)=>({otherTarget})).filter(z=>z.otherTarget!==target);
        if(card.kind==='scale')choices=SCALES.map(a=>({a}));
        if(card.kind==='diffSign')choices=[-1,1].map(diffSign=>({diffSign}));
        if(card.kind==='interval')choices=integralIntervals(card.id).map(z=>({interval:z.id}));
        if(card.kind==='constant')choices=CONSTANTS.filter(c=>!(['PLUS_C','SHIFT'].includes(card.id)&&c===0)).map(C=>({C}));
        if(card.kind==='limitZero')choices=['two','plus','minus'].map(side=>({side}));
        for(const opts of choices) {
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
export function chooseComMove(s) {
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
export function getCard(id){return CARD_MAP[id];}
export {display};
