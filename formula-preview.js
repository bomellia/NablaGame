// Presentation-only AST projections. Only omit complete additive terms.
import {toLatex} from './latex.js?v=0.28';
import {orderedTerms} from './normalization.js?v=0.18';
import {inscription} from './sigil.js?v=0.28';
const omitted=Object.freeze({t:'preview'});
export function previewVariants(e){
 const ordering=new WeakMap();
 const order=v=>{
  if(!ordering.has(v))ordering.set(v,orderedTerms(v.v));
  return ordering.get(v);
 };
 // Preserve every function, power, factor and denominator. A sum may be
 // shortened at any nesting level, but its first term remains intact in shape.
 function project(v,breadth){
  if(!v||typeof v!=='object')return v;
  const child=z=>project(z,breadth);
  switch(v.t){
   case 'a':{
    const terms=order(v),kept=terms.slice(0,breadth).map(child);
    if(terms.length>breadth)kept.push(omitted);
    return {...v,v:kept,previewOrdered:true};
   }
   case 'm':return {...v,v:v.v.map(child)};
   case 'p':return {...v,b:child(v.b)};
   case 'f':case 'I':case 'D':case 'L':return {...v,arg:child(v.arg)};
   case 'complex':return {...v,re:child(v.re),im:child(v.im)};
   default:return v;
  }
 }
 const variants=[],seen=new Set();
 for(const breadth of [4,3,2,1]){
  const partial=project(e,breadth);
  const latex=toLatex(partial);
  if(!latex.includes('\\cdots')||seen.has(latex))continue;
  seen.add(latex);
  variants.push({latex:'\\displaystyle '+latex,text:inscription(partial,1000)});
 }
 return variants;
}
