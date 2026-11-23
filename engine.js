import {CARD_MAP, CONSTANTS, FUNCTION_CARDS,makeDeck} from './cards.js?v=0.10';
import {Unsupported, x, constant, add, mul, div, derivative, integrate, inverse, fn,
  fromCard, limit, oscillatoryLimit, reduceBasis, display, expressionSize,
  hasEmptyRealDomain, substituteNegX, simplify, antiderivative} from './symbolic-extended.js?v=0.10';
const copy = obj => JSON.parse(JSON.stringify(obj));
function shuffle(items,random=Math.random) {
  const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
// Both players receive the exact same three independent random bases.
// Function classes are mirrored to eliminate start-position strength disparity.
export function initialBoard(random=Math.random){
  const choose=options=>options[Math.min(options.length-1,Math.floor(random()*options.length))];
  return [
    choose([fromCard('X2'),mul(fromCard('X2'),x())]),
    choose([fromCard('SIN'),fromCard('COS')]),
    choose([fromCard('EXP'),fn('exp',mul(constant(-1),x()))])
  ].map(simplify);
}

const MAX_EXPRESSION_SIZE=175;
const MAX_DISPLAY_LENGTH=2000;
/** Never turn a mathematically computable derivative into an inert D symbol.
 * A very large expression may still be rejected by the normal game-size guard. */
function safeDerivative(e){
 const value=simplify(derivative(simplify(e)));
 if(containsUnevaluatedDerivative(value))throw new Unsupported('微分結果を確定できません');
 return value;
}
function containsUnevaluatedDerivative(e){
 return !!e && (e.t==='D'||(e.arg&&containsUnevaluatedDerivative(e.arg))||
   (e.b&&containsUnevaluatedDerivative(e.b))||(Array.isArray(e.v)&&e.v.some(containsUnevaluatedDerivative)));
}
const SOFT_SIZE=110, SOFT_LENGTH=260;
function safeIntegral(e,C){
 // Unsupported integrals are illegal, never formal placeholder bases.
 const out=integrate(simplify(e),C);
 if(expressionSize(out)>=SOFT_SIZE||display(out).length>=SOFT_LENGTH)
   throw new Unsupported('積分結果が大きすぎるため、この操作はできません');
 return out;
}
/** A legacy formal limit was never proven. It must not take part in scoring. */
function hasLegacyLimit(e){
  return !!e && ((e.t==='L'||e.t==='I') || (e.arg && hasLegacyLimit(e.arg)) ||
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
  state.version=8;
  return state;
}
export function newGame({extended=true,difficulty='normal',startingPlayer=0,random=Math.random}={}) {
  const deck=shuffle(makeDeck(extended),random);
  const hands=[[],[]];
  for(let i=0;i<7;i++)for(let p=0;p<2;p++)hands[p].push(deck.pop());
  const opening=initialBoard(random);
  return {version:8,boards:[copy(opening),copy(opening)],hands,deck,turn:startingPlayer,
    turns:0,finished:false,winner:null,extended,difficulty,
    log:['対戦を開始しました。基底を0次元にすると勝利です。']};
}
function opTargetRequired(kind) {return kind!=='function';}
export function validate(s,move) {
  if(s.finished)throw new Unsupported('対戦は終了しています');
  const actor=s.turn;
  if(move.cardIndex<0||move.cardIndex>=s.hands[actor].length)throw new Unsupported('カードが選択されていません');
  const cardId=s.hands[actor][move.cardIndex], card=CARD_MAP[cardId];
  if(!card)throw new Unsupported('カードが不正です');
  if(move.owner!==0&&move.owner!==1)throw new Unsupported('対象のプレイヤーが不正です');
  if(opTargetRequired(card.kind) && !(card.kind==='global')) {
    if(!Number.isInteger(move.target)||move.target<0||move.target>=s.boards[move.owner].length)throw new Unsupported('対象の基底を選んでください');
  }
  if(cardId==='DELTA'&&s.turns===0 && s.turn===0)throw new Unsupported('先攻1ターン目のΔは使用できません');
  if(card.kind==='binary') {
    if(move.partnerIndex===move.cardIndex || !Number.isInteger(move.partnerIndex) || !FUNCTION_CARDS.includes(s.hands[actor][move.partnerIndex]))throw new Unsupported('別の関数カードが必要です');
    if(cardId==='DIV'&&!['basisOverCard','cardOverBasis'].includes(move.direction))throw new Unsupported('除算の向きを指定してください');
  }
  if(card.kind==='constant') {
    if(!CONSTANTS.includes(move.C))throw new Unsupported('定数Cを選択してください');
    if(cardId==='PLUS_C'&&move.C===0)throw new Unsupported('追加カードのCは0以外にしてください');
  }
  if(card.kind==='limitZero' && !['two','plus','minus'].includes(move.side))throw new Unsupported('0への極限の向きを選択してください');
  return card;
}
function opSingle(id,basis,move,partner) {
  switch(id){
    case 'DIFF':return safeDerivative(basis);
    case 'INTEGRATE':return safeIntegral(basis,move.C);
    case 'MUL':return mul(basis,partner);
    case 'DIV': {
      const numerator = move.direction==='cardOverBasis'?partner:basis;
      const denominator= move.direction==='cardOverBasis'?basis:partner;
      if(denominator.t==='n' && denominator.v===0)throw new Unsupported('恒等的に0となる式では除算できません');
      return div(numerator,denominator);
    }
    case 'SQRT':if(hasEmptyRealDomain(basis,'sqrt'))return constant(0);return fn('sqrt',basis);
    case 'LOG':if(hasEmptyRealDomain(basis,'log'))return constant(0);return fn('log',basis);
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
function draw(state,actor,count) {
  for(let i=0;i<count&&state.deck.length;i++) state.hands[actor].push(state.deck.pop());
}
function finish(state) {
  if(state.boards.some(b=>b.length===0)||state.deck.length===0){
    state.finished=true;
    const a=state.boards[0].length,b=state.boards[1].length;
    state.winner=a===b?-1:a>b?0:1;
  }
}
export function applyMove(s,move) {
  if(move.discard) {
    const ns=copy(s),actor=ns.turn;
    if(s.finished||!ns.deck.length||!Number.isInteger(move.cardIndex)||move.cardIndex<0||move.cardIndex>=s.hands[actor].length)throw new Unsupported('捨て札にできません');
    ns.log.unshift(`${actor===0?'あなた':'COM'}：カードを1枚交換（ターン消費）`);
    ns.hands[actor].splice(move.cardIndex,1);draw(ns,actor,1);
    ns.turn=1-actor;ns.turns++;finish(ns);return ns;
  }
  const card=validate(s,move), actor=s.turn, id=card.id;
  const ns=copy(s), own=ns.boards[move.owner];
  const used=[move.cardIndex]; let info='';
  if(card.kind==='function') {
    own.push(simplify(fromCard(id)));
    info=`${card.label} を基底に追加`;
  } else if(card.kind==='global') {
    const transformed=own.map(e=>simplify(id==='DELTA'?safeDerivative(safeDerivative(e)):safeDerivative(e)));
    own.splice(0,own.length,...transformed);
    info=`場全体を${id==='DELTA'?'2階':'1階'}微分`;
  } else {
    const before=display(own[move.target]);
    const partner=card.kind==='binary'?fromCard(s.hands[actor][move.partnerIndex]):null;
    let after=simplify(opSingle(id,own[move.target],move,partner));
    if(!after || expressionSize(after)>MAX_EXPRESSION_SIZE || display(after).length>MAX_DISPLAY_LENGTH)throw new Unsupported('この式は巨大なため安全上制限しています。カード交換も利用できます');
    own[move.target]=after;
    info=`${before} → ${display(after)}`;
    if(partner)used.push(move.partnerIndex);
  }
  if(ns.boards[move.owner].some(e=>expressionSize(e)>MAX_EXPRESSION_SIZE||display(e).length>MAX_DISPLAY_LENGTH))throw new Unsupported('式が大きすぎます');
  const preCount=own.length;
  const resolved=reduceBasis(own);
  ns.boards[move.owner]=resolved.kept;
  const erased=preCount-resolved.kept.length;
  const targetName=move.owner===0?'あなた':'COM';
  const actorName=actor===0?'あなた':'COM';
  ns.log.unshift(`${actorName}：${targetName}の場に ${card.label} ／ ${info}${erased?`（基底${erased}個消滅）`:''}`);
  ns.log=ns.log.slice(0,16);
  used.sort((a,b)=>b-a).forEach(i=>ns.hands[actor].splice(i,1));
  draw(ns,actor,used.length);
  ns.turn=1-actor;ns.turns++;finish(ns);
  return ns;
}
export function preview(s,move) {
  try {
    const after=applyMove(s,move);
    return {ok:true,state:after,delta:[after.boards[0].length-s.boards[0].length,after.boards[1].length-s.boards[1].length],description:after.log[0]};
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
    if(!card)continue;
    for(let owner=0;owner<2;owner++) {
      let accepted=0;
      const indices=card.kind==='function'||card.kind==='global'?[null]:s.boards[owner].map((_,j)=>j);
      for(const target of indices) {
        let choices=[{}];
        if(card.kind==='binary') {
          choices=[];
          for(let j=0;j<s.hands[s.turn].length;j++) if(i!==j&&FUNCTION_CARDS.includes(s.hands[s.turn][j]))
            for(const direction of (card.id==='DIV'?['basisOverCard','cardOverBasis']:['basisOverCard']))choices.push({partnerIndex:j,direction});
        }
        if(card.kind==='constant')choices=CONSTANTS.filter(c=>!(card.id==='PLUS_C'&&c===0)).map(C=>({C}));
        if(card.kind==='limitZero')choices=['two','plus','minus'].map(side=>({side}));
        for(const opts of choices) {
          const move={cardIndex:i,owner,target,...opts};
          const result=preview(s,move);
          if(result.ok){
            moves.push({...move,scoreDelta:result.delta,...(includeState?{nextState:result.state}:{})});
            accepted++;
            if(moves.length>=limit)return moves;
            if(accepted>=perCardOwner)break;
          }
        }
        if(accepted>=perCardOwner)break;
      }
    }
  }
  if(!moves.length&&s.deck.length)return s.hands[s.turn].map((_,i)=>({discard:true,cardIndex:i}));
  return moves;
}
function valueOf(e) {
  const text=display(e);
  let score=1;
  if(/arcsin|arccos|√|log|ln\|/.test(text))score+=0.55;
  if(/sin|cos|exp/.test(text))score+=0.3;
  if(text.length>28)score-=.1;
  return score;
}
function scoreMove(state,move,after,difficulty) {
  const a=state.turn, enemy=1-a;
  if(after.finished){if(after.winner===a)return 10000;if(after.winner===enemy)return -10000;}
  const ownDelta=after.boards[a].length-state.boards[a].length;
  const otherDelta=state.boards[enemy].length-after.boards[enemy].length;
  const ownValue=after.boards[a].reduce((acc,e)=>acc+valueOf(e),0);
  const oppValue=after.boards[enemy].reduce((acc,e)=>acc+valueOf(e),0);
  const used=move.partnerIndex===undefined?1:2;
  const raw=otherDelta*14+ownDelta*12+0.9*(ownValue-oppValue)-used*0.3;
  if(difficulty==='easy') return raw*.3+Math.random()*15;
  if(difficulty==='hard') return raw+Math.random()*1.3;
  return raw+Math.random()*5;
}
export function chooseComMove(s) {
  // Search both players for every card instead of exhausting the first cards.
  // Preview results are reused for scoring, avoiding duplicate CAS work.
  const moves=legalMoves(s,{limit:150,perCardOwner:10,includeState:true});
  if(!moves.length)return null;
  let best=moves[0],bestScore=-Infinity;
  for(const move of moves){
    const score=move.discard?(-1000+Math.random()):scoreMove(s,move,move.nextState,s.difficulty);
    if(score>bestScore){bestScore=score;best=move;}
  }
  const {nextState,scoreDelta,...chosen}=best;
  return chosen;
}
export function getCard(id){return CARD_MAP[id];}
export {display};
