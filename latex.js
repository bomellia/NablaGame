import {latexNumber} from './number-format.js?v=0.8';
import {orderedTerms} from './normalization.js?v=0.8';
/** Pure AST-to-LaTeX presentation layer. This module never changes game math. */
const small = value => Number.isFinite(value) && Math.abs(value)<1e-12;
const ascii = value => String(value).replace(/[\\{}]/g,'');
const braced = latex => `{${latex}}`;
const round = latex => `\\left(${latex}\\right)`;
const safeOrder = value => Number.isInteger(value)&&value>0&&value<64?value:1;
const fnNames={
  sin:'\\sin',cos:'\\cos',tan:'\\tan',cot:'\\cot',sec:'\\sec',csc:'\\csc',
  sinh:'\\sinh',cosh:'\\cosh',tanh:'\\tanh',exp:'\\exp',
  log:'\\ln',asin:'\\arcsin',acos:'\\arccos',atan:'\\arctan',
  Li:'\\operatorname{Li}',Ei:'\\operatorname{Ei}',Si:'\\operatorname{Si}',Ci:'\\operatorname{Ci}',
  Shi:'\\operatorname{Shi}',Chi:'\\operatorname{Chi}',erf:'\\operatorname{erf}',erfi:'\\operatorname{erfi}',
  FresnelS:'\\operatorname{S}',FresnelC:'\\operatorname{C}'
};
const atomLike=e=>['n','x','f'].includes(e?.t);
const numberLatex = latexNumber;
function sumTerms(terms){
 let result='';
 for(const term of terms){
  const value=toLatex(term);
  if(!result)result=value;
  else if(value.startsWith('-'))result+=` - ${value.slice(1)}`;
  else result+=` + ${value}`;
 }
 return result||'0';
}
function factorLatex(e){
 const latex=toLatex(e);
 if(e?.t==='a')return round(latex);
 return latex;
}
function productLatex(factors){
 const numer=[],denom=[];
 for(const factor of factors){
  if(factor.t==='p'&&factor.e<0){denom.push(factor.e===-1?factorLatex(factor.b):toLatex({t:'p',b:factor.b,e:-factor.e}));}
  else numer.push(factor);
 }
 let sign='';
 if(numer[0]?.t==='n'&&numer[0].v<0){
  sign='-';const c=-numer[0].v;
  if(c===1&&numer.length>1)numer.shift();
  else numer[0]={t:'n',v:c};
 }
 const top=numer.map(factorLatex).join('\\,')||'1';
 const bottom=denom.join('\\,');
 return bottom?`${sign}\\frac{${top}}{${bottom}}`:`${sign}${top}`;
}
export function toLatex(e){
 if(!e||typeof e!=='object')return '\\text{?}';
 switch(e.t){
  case 'n':return numberLatex(e.v);
  case 'x':return 'x';
  case 'a':return sumTerms(orderedTerms(e.v));
  case 'm':return productLatex(e.v);
  case 'p':{
   if(e.e===1)return toLatex(e.b);
   if(e.e===.5)return `\\sqrt{${toLatex(e.b)}}`;
   if(e.e===-.5)return `\\frac{1}{\\sqrt{${toLatex(e.b)}}}`;
   if(e.e<0){
    const denominator=e.e===-1?toLatex(e.b):toLatex({t:'p',b:e.b,e:-e.e});
    return `\\frac{1}{${denominator}}`;
   }
   const b=atomLike(e.b)?toLatex(e.b):round(toLatex(e.b));
   return `${b}^{${numberLatex(e.e)}}`;
  }
  case 'f':{
   const a=toLatex(e.arg);
   if(e.f==='sqrt')return `\\sqrt{${a}}`;
   if(e.f==='abs')return `\\left|${a}\\right|`;
   if(e.f==='logabs')return `\\ln\\left|${a}\\right|`;
   const command=fnNames[e.f]||`\\operatorname{${ascii(e.f)}}`;
   return `${command}${round(a)}`;
  }
  case 'I':{
   const k=safeOrder(e.order);
   return k===1?`\\int ${toLatex(e.arg)}\\,\\mathrm{d}x`:
     `\\underbrace{\\int\\cdots\\int}_{${k}}${toLatex(e.arg)}\\,(\\mathrm{d}x)^{${k}}`;
  }
  case 'D':{
   const k=safeOrder(e.order);
   return k===1?`\\frac{\\mathrm{d}}{\\mathrm{d}x}${round(toLatex(e.arg))}`:
     `\\frac{\\mathrm{d}^{${k}}}{\\mathrm{d}x^{${k}}}${round(toLatex(e.arg))}`;
  }
  case 'L':{
   const tgt=e.point==='plus'?'+\\infty':e.point==='minus'?'-\\infty':
     (e.side==='plus'?'0^+':e.side==='minus'?'0^-':'0');
   const kind=e.kind==='sup'?'\\limsup':e.kind==='inf'?'\\liminf':'\\lim';
   return `${kind}_{x\\to ${tgt}} ${toLatex(e.arg)}`;
  }
  default:return '\\text{?}';
 }
}
const labels={
 ZERO:'0',ONE:'1',X:'x',X2:'x^2',EXP:'e^x',SIN:'\\sin x',COS:'\\cos x',
 NABLA:'\\nabla',DELTA:'\\Delta',DIFF:'\\frac{\\mathrm{d}}{\\mathrm{d}x}',
 INTEGRATE:'\\int\\!\\mathrm{d}x',MUL:'\\times',DIV:'\\div',
 LIM_PLUS:'\\lim_{x\\to+\\infty}',LIM_MINUS:'\\lim_{x\\to-\\infty}',
 LIM_ZERO:'\\lim_{x\\to0}',LIMSUP:'\\limsup',LIMINF:'\\liminf',
 SQRT:'\\sqrt{\\phantom{x}}',INVERSE:'f^{-1}',LOG:'\\ln',
 PLUS_C:'+C',REFLECT:'x\\mapsto-x'
};
export const cardLatex=id=>labels[id]||'\\text{?}';
export function mathMarkup(latex,fallback=''){
 // All produced LaTeX originates in this module from known AST node kinds.
 // KaTeX sanitizes the markup; when the CDN is unavailable show readable text.
 if(typeof window!=='undefined'&&window.katex){
  try{return window.katex.renderToString(latex,{displayMode:false,throwOnError:false,strict:'ignore',trust:false,maxExpand:500});}catch{}
 }
 return escapeText(fallback||latex);
}
export function escapeText(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
