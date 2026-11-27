/* Deck data: adding a new card definition does not require UI changes.
   Effects are registered in engine.js. Original counts follow a player inventory,
   not an official guarantee of precise distribution. */
export const CARDS = [
  {id:'ZERO',label:'0',kind:'function',count:1,description:'基底0の追加／乗除算の材料'},
  {id:'ONE',label:'1',kind:'function',count:2,description:'基底1の追加／乗除算の材料'},
  {id:'X',label:'x',kind:'function',count:3,description:'基底xの追加／乗除算の材料'},
  {id:'X2',label:'x²',kind:'function',count:2,description:'基底x²の追加／乗除算の材料'},
  {id:'EXP',label:'eˣ',kind:'function',count:3,description:'基底eˣの追加／乗除算の材料'},
  {id:'SIN',label:'sin x',kind:'function',count:3,description:'基底sin xの追加／乗除算の材料'},
  {id:'COS',label:'cos x',kind:'function',count:3,description:'基底cos xの追加／乗除算の材料'},
  {id:'NEGEXP',label:'e⁻ˣ',kind:'function',count:3,description:'減衰指数関数：基底追加・乗除算の材料'},
  {id:'TAN',label:'tan x',kind:'function',count:2,description:'正接：基底追加・乗除算の材料'},
  {id:'LN_X',label:'ln x',kind:'function',count:2,description:'自然対数：基底追加・乗除算の材料'},
  {id:'RECIP_X',label:'1/x',kind:'function',count:3,description:'逆数：基底追加・乗除算の材料'},
  {id:'ROOT_X',label:'√x',kind:'function',count:2,description:'平方根：基底追加・乗除算の材料'},
  {id:'CAUCHY',label:'1/(1+x²)',kind:'function',count:2,description:'コーシー型関数：基底追加・乗除算の材料'},
  {id:'GAUSS',label:'e⁻ˣ²',kind:'function',count:2,description:'ガウス関数：基底追加・乗除算の材料'},
  {id:'NABLA',label:'∇',kind:'global',count:8,description:'対象の場全体を1階微分'},
  {id:'DELTA',label:'Δ',kind:'global',count:2,description:'対象の場全体を2階微分'},
  {id:'DIFF',label:'d/dx',kind:'single',count:8,description:'指定した基底を微分'},
  {id:'DIFF_PM',label:'D±1',kind:'diffSign',count:2,description:'D=d/dx。f′(x)±f(x)（符号を選択）'},
  {id:'DIFF2_PLUS',label:'D²+1',kind:'single',count:2,description:'D=d/dx。f″(x)+f(x)'},
  {id:'INTEGRATE',label:'∫dx',kind:'constant',count:8,description:'積分。積分定数Cを選べる'},
  {id:'MUL',label:'×',kind:'boardBinary',count:6,description:'相手の場の2基底を選び、最初の基底を fg に置換'},
  {id:'DIV',label:'÷',kind:'boardBinary',count:5,description:'相手の場の2基底を選び、最初の基底を f/g に置換'},
  {id:'COMPOSE',label:'∘',kind:'binary',count:3,description:'場の基底と関数カードを合成。外側→内側の順に選択'},
  {id:'LIM_PLUS',label:'lim +∞',kind:'single',count:2,description:'x→+∞ の極限'},
  {id:'LIM_MINUS',label:'lim −∞',kind:'single',count:2,description:'x→−∞ の極限'},
  {id:'LIM_ZERO',label:'lim 0',kind:'limitZero',count:2,description:'x→0の極限。片側も選択可能'},
  {id:'LIMSUP',label:'lim sup',kind:'single',count:2,description:'x→+∞ の上極限'},
  {id:'LIMINF',label:'lim inf',kind:'single',count:2,description:'x→+∞ の下極限'},
  {id:'SQRT',label:'√',kind:'single',count:2,description:'平方根を取る'},
  {id:'INVERSE',label:'f⁻¹',kind:'single',count:6,description:'実数の主枝で逆関数を取る'},
  {id:'LOG',label:'log',kind:'single',count:3,description:'自然対数を取る'},
  {id:'EXP_OP',label:'exp',kind:'single',count:2,description:'指数化（結果確定時のみ）'},
  {id:'SQUARE',label:'□²',kind:'single',count:2,description:'二乗（結果確定時のみ）'},
  {id:'INT_HALF',label:'∫ₐᵇ',kind:'interval',count:2,description:'片側積分：区間を選択（収束と結果が確定する場合のみ）'},
  {id:'INT_ALL',label:'∫₋ₐᵃ',kind:'interval',count:3,description:'対称積分：区間を選択（収束と結果が確定する場合のみ）'},
  {id:'LAPLACE',label:'ℒ',kind:'single',count:2,description:'ラプラス変換（結果確定時のみ）'},
  // Tactical expansion (v0.33): new functions and noncommutative arithmetic.
  {id:'X3',label:'x³',kind:'function',count:2,expansion:true,strategy:true,description:'三次関数を追加・演算材料に使用'},
  {id:'ABS_X',label:'|x|',kind:'function',count:2,expansion:true,strategy:true,description:'絶対値関数を追加・演算材料に使用'},
  {id:'ADD',label:'+',kind:'boardBinary',count:2,expansion:true,strategy:true,description:'相手の場の2基底を選び、最初の基底を f+g に置換'},
  {id:'SUB',label:'−',kind:'boardBinary',count:2,expansion:true,strategy:true,description:'相手の場の2基底を選び、最初の基底を f−g に置換'},
  {id:'SCALE',label:'x↦ax',kind:'scale',count:2,expansion:true,strategy:true,description:'f(x)をf(ax)へ変換（a=1/2, 2, i）'},
  {id:'RECIP',label:'1/f',kind:'single',count:2,expansion:true,strategy:true,description:'指定した基底の逆数（逆関数ではない）'},
  // Prototype expansion cards (opt-in deck option)
  {id:'PLUS_C',label:'+C',kind:'constant',count:5,expansion:true,description:'指定した基底に定数Cを加える（独自カード）'},
  {id:'REFLECT',label:'x↦−x',kind:'single',count:3,expansion:true,description:'f(x)をf(−x)へ変換する（独自カード）'}
];
export const CARD_MAP = Object.fromEntries(CARDS.map(card=>[card.id,card]));
export const CONSTANTS = [-2,-1,0,1,2];
export const FUNCTION_CARDS = CARDS.filter(c=>c.kind==='function').map(c=>c.id);
export const makeDeck = (extended=true) => CARDS.flatMap(c=>!extended&&c.expansion?[]:Array(c.count).fill(c.id));

export const HAND_SIZE=8;
export const MAX_DIMENSION=4;
export const SCALES=[0.5,2,'i'];
export const cardPool=id=>CARD_MAP[id]?.kind==='function'?'function':'operator';

export const LIMIT_CARDS=['LIM_PLUS','LIM_MINUS','LIM_ZERO','LIMSUP','LIMINF'];

export const INTEGRAL_INTERVALS=Object.freeze({
 INT_HALF:Object.freeze([
  {id:'zeroPlus',label:'0 → +∞',latex:'\\int_0^\\infty'},
  {id:'minusZero',label:'−∞ → 0',latex:'\\int_{-\\infty}^0'},
  {id:'onePlus',label:'1 → +∞',latex:'\\int_1^\\infty'},
  {id:'xPlus',label:'x → +∞',latex:'\\int_x^\\infty'},
  {id:'minusX',label:'−∞ → x',latex:'\\int_{-\\infty}^x'}
 ]),
 INT_ALL:Object.freeze([
  {id:'all',label:'−∞ → +∞',latex:'\\int_{-\\infty}^\\infty'},
  {id:'symmetricX',label:'−x → x',latex:'\\int_{-x}^x'}
 ])
});
export const integralIntervals=id=>INTEGRAL_INTERVALS[id]||[];
export const integralInterval=(id,value)=>integralIntervals(id).find(i=>i.id===(value??integralIntervals(id)[0]?.id));
