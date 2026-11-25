import fs from 'node:fs';
import {newGame,chooseComMove,applyMove} from './engine.js';
import {fromCard,integrate,derivative,display,simplify,mul,div,sig,expressionSize} from './game-math.js';
const seed=Number(process.argv[2]||3), rounds=Number(process.argv[3]||8), maxTurns=Number(process.argv[4]||24);
let rngSeed=seed; const random=()=>((rngSeed=(Math.imul(rngSeed,1664525)+1013904223)>>>0)/4294967296);
const stats={rounds,turns:0,completed:0,partial:0,diffOK:0,diffFAIL:0,integralOK:0,integralFAIL:0,mixedOK:0,mixedFAIL:0};
const errors=new Map();
function attempt(e,mode,origin){
 try{
  const result=mode==='diff'?simplify(derivative(e)):integrate(e);
  if(mode==='diff'){
   stats.diffOK++;
   if(JSON.stringify(result).includes('"t":"D"'))throw new Error('Formal D survived derivative');
  } else stats.integralOK++;
  if(origin==='mix')stats.mixedOK++;
 }catch(err){
  if(mode==='diff')stats.diffFAIL++;else stats.integralFAIL++;
  if(origin==='mix')stats.mixedFAIL++;
  const key=sig(simplify(e));
  const old=errors.get(key);
  if(old){old.count++;return;}
  const sample={expression:display(e),ast:simplify(e),kind:mode,origin,error:err.message,count:1};
  errors.set(key,sample);
 }
}
const materials=['X','X2','EXP','SIN','COS','NEGEXP','TAN','LN_X','RECIP_X','ROOT_X','CAUCHY','GAUSS'];
for(let gameIndex=0;gameIndex<rounds;gameIndex++){
 let state=newGame({extended:true,difficulty:'normal',random});
 state.turn=gameIndex%2;
 for(let t=0;t<maxTurns && !state.finished;t++){
  for(const board of state.boards)for(const e of board){
   attempt(e,'diff','field');attempt(e,'integral','field');
   for(const id of materials){
    const partner=fromCard(id);
    for(const calc of [()=>mul(e,partner),()=>div(e,partner),()=>div(partner,e)]){
     try{
      const mixed=simplify(calc());
      if(expressionSize(mixed)>100)continue;
      attempt(mixed,'diff','mix');attempt(mixed,'integral','mix');
     }catch{};
    }
   }
  }
  try{const move=chooseComMove(state);if(!move)break;state=applyMove(state,move);stats.turns++;}
  catch(err){stats.error=err.message;break;}
 }
 if(state.finished)stats.completed++;else stats.partial++;
}
const entries=[...errors.values()].sort((a,b)=>b.count-a.count);
fs.writeFileSync('audit-results.json',JSON.stringify({stats,errors:entries},null,2));
console.log(JSON.stringify(stats,null,2));
console.log('top errors',JSON.stringify(entries.slice(0,26).map(e=>({expr:e.expression.slice(0,115),kind:e.kind,origin:e.origin,reason:e.error,count:e.count})),null,2));
