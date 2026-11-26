// Presentation-only AST projections. Never pass these nodes to the game engine.
import {toLatex} from './latex.js?v=0.28';
import {orderedTerms} from './normalization.js?v=0.18';
import {inscription} from './sigil.js?v=0.28';
const omitted=Object.freeze({t:'preview'});
const atomic=e=>e?.t==='n'||e?.t==='x';
const reciprocal=e=>e?.t==='p'&&e.e<0;
export function previewVariants(e){
 const ordering=new WeakMap();
 const order=v=>{
  if(!ordering.has(v))ordering.set(v,orderedTerms(v.v));
  return ordering.get(v);
 };
 function project(v,depth,breadth){
  if(!v||typeof v!=='object')return omitted;
  if(atomic(v))return v;
  if(depth<0)return omitted;
  const child=z=>project(z,depth-1,breadth);
  switch(v.t){
   case 'a':{
    const terms=order(v),kept=terms.slice(0,breadth).map(child);
    if(terms.length>breadth)kept.push(omitted);
    return {...v,v:kept,previewOrdered:true};
   }
   case 'm':{
    const numerator=v.v.filter(z=>!reciprocal(z)),denominator=v.v.filter(reciprocal);
    // Keep the denominator separate, even when most factors are omitted.
    const coefficient=numerator[0]?.t==='n'?numerator[0]:null;
    const factors=coefficient?numerator.slice(1):numerator;
    const top=[...(coefficient?[coefficient]:[]),...factors.slice(0,breadth).map(child)];
    if(factors.length>breadth)top.push(omitted);
    const bottom=denominator.slice(0,breadth).map(z=>({...z,b:child(z.b)}));
    if(denominator.length>breadth)bottom.push({t:'p',b:omitted,e:-1});
    return {...v,v:[...top,...bottom]};
   }
   case 'p':return {...v,b:child(v.b)};
   case 'f':case 'I':case 'D':case 'L':return {...v,arg:child(v.arg)};
   case 'complex':return {...v,re:child(v.re),im:child(v.im)};
   default:return v;
  }
 }
 const variants=[],seen=new Set();
 for(const [depth,breadth] of [[4,4],[3,3],[2,2],[2,1],[1,1]]){
  const partial=project(e,depth,breadth);
  const latex=toLatex(partial);
  if(!latex.includes('\\cdots')||seen.has(latex))continue;
  seen.add(latex);
  variants.push({latex:'\\displaystyle '+latex,text:inscription(partial,1000)});
 }
 return variants;
}
