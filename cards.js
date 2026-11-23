/* Deck data: adding a new card definition does not require UI changes.
   Effects are registered in engine.js. Original counts follow a player inventory,
   not an official guarantee of precise distribution. */
export const CARDS = [
  {id:'ZERO',label:'0',kind:'function',count:2,description:'基底0の追加／乗除算の材料'},
  {id:'ONE',label:'1',kind:'function',count:2,description:'基底1の追加／乗除算の材料'},
  {id:'X',label:'x',kind:'function',count:8,description:'基底xの追加／乗除算の材料'},
  {id:'X2',label:'x²',kind:'function',count:3,description:'基底x²の追加／乗除算の材料'},
  {id:'EXP',label:'eˣ',kind:'function',count:4,description:'基底eˣの追加／乗除算の材料'},
  {id:'SIN',label:'sin x',kind:'function',count:4,description:'基底sin xの追加／乗除算の材料'},
  {id:'COS',label:'cos x',kind:'function',count:4,description:'基底cos xの追加／乗除算の材料'},
  {id:'NABLA',label:'∇',kind:'global',count:10,description:'対象の場全体を1階微分'},
  {id:'DELTA',label:'Δ',kind:'global',count:2,description:'対象の場全体を2階微分'},
  {id:'DIFF',label:'d/dx',kind:'single',count:8,description:'指定した基底を微分'},
  {id:'INTEGRATE',label:'∫dx',kind:'constant',count:8,description:'積分。積分定数Cを選べる'},
  {id:'MUL',label:'×',kind:'binary',count:5,description:'関数カードを使用して乗算'},
  {id:'DIV',label:'÷',kind:'binary',count:5,description:'関数カードを使用して除算'},
  {id:'LIM_PLUS',label:'lim +∞',kind:'single',count:2,description:'x→+∞ の極限'},
  {id:'LIM_MINUS',label:'lim −∞',kind:'single',count:2,description:'x→−∞ の極限'},
  {id:'LIM_ZERO',label:'lim 0',kind:'limitZero',count:2,description:'x→0の極限。片側も選択可能'},
  {id:'LIMSUP',label:'lim sup',kind:'single',count:1,description:'x→+∞ の上極限'},
  {id:'LIMINF',label:'lim inf',kind:'single',count:1,description:'x→+∞ の下極限'},
  {id:'SQRT',label:'√',kind:'single',count:2,description:'平方根を取る'},
  {id:'INVERSE',label:'f⁻¹',kind:'single',count:2,description:'既知の関数に対し主枝の逆関数を取る'},
  {id:'LOG',label:'log',kind:'single',count:3,description:'自然対数を取る'},
  // Prototype expansion cards (opt-in deck option)
  {id:'PLUS_C',label:'+C',kind:'constant',count:5,expansion:true,description:'指定した基底に定数Cを加える（独自カード）'},
  {id:'REFLECT',label:'x↦−x',kind:'single',count:3,expansion:true,description:'f(x)をf(−x)へ変換する（独自カード）'}
];
export const CARD_MAP = Object.fromEntries(CARDS.map(card=>[card.id,card]));
export const CONSTANTS = [-2,-1,0,1,2];
export const FUNCTION_CARDS = CARDS.filter(c=>c.kind==='function').map(c=>c.id);
export const makeDeck = (extended=true) => CARDS.flatMap(c=>!extended&&c.expansion?[]:Array(c.count).fill(c.id));
