/* Additional special-function and deferred symbolic algebra for the game.
   Never assume an unproved limit has a numeric value. */
import * as base from './symbolic.js?v=0.2';
export * from './symbolic.js?v=0.2';
const n=base.constant, X=base.x, f=base.fn, add=base.add, mul=base.mul, pow=base.pow, div=base.div;
const neg = a => mul(n(-1),a);
const finite = v => ({type:'finite',v});
const P={type:'infinity',sign:1}, M={type:'infinity',sign:-1};
const unknown={type:'unknown'}, nonexistent={type:'nonexistent'};
const symbolic = expr => ({type:'symbolic',expr});
const close=(a,b)=>Math.abs(a-b)<1e-8;
export const antiderivative=(arg,order=1)=>({t:'I',arg,order});
export const formalLimit=(arg,point='plus',side='two',kind='lim')=>({t:'L',arg,point,side,kind});
function independent(e){return !!e&&(['I','D','L'].includes(e.t)||e.arg&&independent(e.arg)||e.b&&independent(e.b)||Array.isArray(e.v)&&e.v.some(independent)||e.t==='f'&&['Li','Ei','Si','Ci','erf','erfi','FresnelS','FresnelC','Shi','Chi','abs'].includes(e.f));}
function derivativeFn(e){
 const a=e.arg, da=derivative(a), df=v=>mul(v,da);
 switch(e.f){
  case 'exp':return df(f('exp',a));
  case 'sin':return df(f('cos',a));
  case 'cos':return df(neg(f('sin',a)));
  case 'log':case 'logabs':return div(da,a);
  case 'sqrt':return div(da,mul(n(2),f('sqrt',a)));
  case 'abs':return df(div(a,f('abs',a)));
  case 'asin':return div(da,f('sqrt',add(n(1),neg(pow(a,2)))));
  case 'acos':return neg(div(da,f('sqrt',add(n(1),neg(pow(a,2))))));
  case 'atan':return div(da,add(n(1),pow(a,2)));
  case 'Li':return div(da,f('log',a));
  case 'Ei':return df(div(f('exp',a),a));
  case 'Si':return df(div(f('sin',a),a));
  case 'Ci':return a.t==='f'&&a.f==='abs'?div(mul(f('cos',a.arg),derivative(a.arg)),a.arg):df(div(f('cos',a),a));
  case 'Shi':return df(div(f('sinh',a),a));
  case 'Chi':return a.t==='f'&&a.f==='abs'?div(mul(f('cosh',a.arg),derivative(a.arg)),a.arg):df(div(f('cosh',a),a));
  case 'erf':return df(mul(n(2/Math.sqrt(Math.PI)),f('exp',neg(pow(a,2)))));
  case 'erfi':return df(mul(n(2/Math.sqrt(Math.PI)),f('exp',pow(a,2))));
  case 'FresnelS':return df(f('sin',mul(n(Math.PI/2),pow(a,2))));
  case 'FresnelC':return df(f('cos',mul(n(Math.PI/2),pow(a,2))));
  case 'sinh':return df(f('cosh',a));
  case 'cosh':return df(f('sinh',a));
  case 'tanh':return div(da,pow(f('cosh',a),2));
  default:return {t:'D',arg:e,order:1};
 }
}
export function derivative(e){
 switch(e.t){
  case 'n':return n(0);case 'x':return n(1);
  case 'L':return n(0); // A formal limit is considered a symbolic constant by the game rule.
  case 'I':return (e.order||1)===1?e.arg:antiderivative(e.arg,(e.order||1)-1);
  case 'D':return {t:'D',arg:e.arg,order:(e.order||1)+1};
  case 'a':return add(...e.v.map(derivative));
  case 'm':return add(...e.v.map((part,i)=>mul(derivative(part),...e.v.filter((_,j)=>i!==j))));
  case 'p':return mul(n(e.e),pow(e.b,e.e-1),derivative(e.b));
  case 'f':return derivativeFn(e);
  default:return {t:'D',arg:e,order:1};
 }
}
function slope(expr){const lm=base.linearForm(expr);if(!lm||[...lm.keys()].some(k=>k!=='1'&&k!=='x'))return null;return lm.get('x')||null;}
function quadratic(expr){const [c,expr2] = expr.t==='m'&&expr.v[0].t==='n'?[expr.v[0].v,expr.v.length===2?expr.v[1]:null]:[1,expr];return expr2?.t==='p'&&expr2.b.t==='x'&&close(expr2.e,2)?c:null;}
function specialAntiderivative(e){
 // li(x)=Ei(log x), real logarithmic integral on x>0 away from its pole x=1.
 if(e.t==='p'&&e.e===-1&&e.b.t==='f'&&e.b.f==='log'&&e.b.arg.t==='x')return f('Li',X());
 const parts=e.t==='m'?e.v:[e];
 const reciprocal=parts.find(p=>p.t==='p'&&p.e===-1&&p.b.t==='x');
 if(reciprocal&&parts.length===2){
   const other=parts.find(p=>p!==reciprocal);
   if(other?.t==='f'&&['exp','sin','cos','sinh','cosh'].includes(other.f)){
     const k=slope(other.arg),lm=base.linearForm(other.arg);
     if(k!==null && lm && close(lm.get('1')||0,0)){
       const mapped={exp:'Ei',sin:'Si',cos:'Ci',sinh:'Shi',cosh:'Chi'}[other.f];
       return f(mapped, ['Ci','Chi'].includes(mapped)?f('abs',other.arg):other.arg);
     }
   }
 }
 if(e.t==='f'){
   const c=quadratic(e.arg);
   if(c!==null&&c!==0&&e.f==='exp'){
     const v=Math.sqrt(Math.abs(c));return mul(n(Math.sqrt(Math.PI)/(2*v)),f(c<0?'erf':'erfi',mul(n(v),X())));
   }
   if(c!==null&&close(c,1)&&['sin','cos'].includes(e.f))
     return mul(n(Math.sqrt(Math.PI/2)),f(e.f==='sin'?'FresnelS':'FresnelC',mul(n(Math.sqrt(2/Math.PI)),X())));
 }
 return null;
}
function integralInner(e){
 const special=specialAntiderivative(e);if(special)return special;
 if(e.t==='I')return antiderivative(e.arg,(e.order||1)+1);
 if(e.t==='D')return (e.order||1)===1?e.arg:{t:'D',arg:e.arg,order:e.order-1};
 if(e.t==='L')return mul(e,X());
 if(e.t==='a')return add(...e.v.map(integralInner));
 if(e.t==='m'&&e.v[0].t==='n')return mul(e.v[0],integralInner(mul(...e.v.slice(1))));
 if(e.t==='f'&&e.arg.t!=='x'){
   const k=slope(e.arg),lm=base.linearForm(e.arg);
   if(k!==null&&lm){
     if(e.f==='exp')return div(f('exp',e.arg),n(k));
     if(e.f==='sin')return div(neg(f('cos',e.arg)),n(k));
     if(e.f==='cos')return div(f('sin',e.arg),n(k));
     if(e.f==='sinh')return div(f('cosh',e.arg),n(k));
     if(e.f==='cosh')return div(f('sinh',e.arg),n(k));
   }
 }
 if(e.t==='f'&&e.arg.t==='x'){
   if(e.f==='sinh')return f('cosh',X());
   if(e.f==='cosh')return f('sinh',X());
 }
 try{return base.integrate(e,0);}catch(error){if(error instanceof base.Unsupported||error instanceof RangeError)return antiderivative(e);throw error;}
}
export const integrate=(e,C=0)=>add(integralInner(e),n(C));
export function simplify(e){
 if(!e||typeof e!=='object')throw new base.Unsupported('式データが破損しています');
 switch(e.t){
  case 'I':return antiderivative(simplify(e.arg),e.order||1);
  case 'D':return {t:'D',arg:simplify(e.arg),order:e.order||1};
  case 'L':return formalLimit(simplify(e.arg),e.point,e.side,e.kind||'lim');
  case 'a':return add(...e.v.map(simplify));
  case 'm':return mul(...e.v.map(simplify));
  case 'p':return pow(simplify(e.b),e.e);
  case 'f':return f(e.f,simplify(e.arg));
  default:return base.simplify(e);
 }
}
export function substituteNegX(e){
 switch(e.t){
  case 'I':return antiderivative(substituteNegX(e.arg),e.order||1);
  case 'D':return {t:'D',arg:substituteNegX(e.arg),order:e.order||1};
  case 'L':return e; // Bound x is unaffected by substitution of the outer x.
  case 'a':return add(...e.v.map(substituteNegX));
  case 'm':return mul(...e.v.map(substituteNegX));
  case 'p':return pow(substituteNegX(e.b),e.e);
  case 'f':return f(e.f,substituteNegX(e.arg));
  default:return base.substituteNegX(e);
 }
}
const pretty=base.display;
export function display(e,wrap=false){
 if(!independent(e))return pretty(e,wrap);
 switch(e.t){
  case 'I':return e.order>1?`∫^${e.order}(${display(e.arg)})dx^${e.order}`:`∫(${display(e.arg)})dx`;
  case 'D':return e.order>1?`d^${e.order}/dx^${e.order}(${display(e.arg)})`:`d/dx(${display(e.arg)})`;
  case 'L':{
   const point=e.point==='plus'?'+∞':e.point==='minus'?'−∞':e.side==='plus'?'0⁺':e.side==='minus'?'0⁻':'0';
   return `${e.kind||'lim'}[x→${point}](${display(e.arg)})`;
  }
  case 'n':case 'x':return pretty(e,wrap);
  case 'a':return `${wrap?'(' : ''}${e.v.map(v=>display(v)).join(' + ').replace(/\+ -/g,'− ')}${wrap?')':''}`;
  case 'm':return e.v.map((v,i)=>display(v,i>0)).join('·');
  case 'p':return `${display(e.b,true)}^${e.e}`;
  case 'f':return e.f==='abs'?`|${display(e.arg)}|`:`${e.f==='logabs'?'ln|·|':e.f}(${display(e.arg)})`;
  default:return pretty(e,wrap);
 }
}
function specialLimit(e,point,side){
 const l=limit(e.arg,point,side);
 if(l.type==='unknown'||l.type==='nonexistent')return l;
 if(l.type==='symbolic')return unknown;
 const name=e.f;
 if(l.type==='infinity'){
  const sign=l.sign;
  switch(name){
   case 'Li':return sign>0?P:nonexistent;
   case 'Ei':return sign>0?P:finite(0);
   case 'Si':return finite(sign*Math.PI/2);
   case 'Ci':return sign>0?finite(0):nonexistent;
   case 'erf':return finite(sign);
   case 'erfi':return sign>0?P:M;
   case 'FresnelS':case 'FresnelC':return finite(sign/2);
   case 'sinh':case 'Shi':return sign>0?P:M;
   case 'cosh':case 'Chi':return P;
   case 'tanh':return finite(sign);
   case 'atan':return finite(sign*Math.PI/2);
   case 'abs':return P;
   case 'sin':case 'cos':return nonexistent;
  }
 }
 if(l.type==='finite'){
  const v=l.v;
  if(close(v,0)){
    if(name==='Ei'||name==='Ci'||name==='Chi'||name==='logabs')return M;
    if(name==='Li'||name==='log'||name==='sqrt')return point==='zero'&&side!=='plus'?nonexistent:name==='sqrt'?finite(0):name==='Li'?finite(0):M;
    if(['Si','Shi','erf','erfi','FresnelS','FresnelC'].includes(name))return finite(0);
  }
  if(name==='Li'&&close(v,1))return M;
  if(name==='Ci'&&v<0 || name==='Li'&&v<0)return nonexistent;
  try {const v2=f(name,n(v));return v2.t==='n'?finite(v2.v):symbolic(v2);}catch{return nonexistent;}
 }
 return unknown;
}
function ratioParts(expr){
 if(expr.t!=='m')return null;
 const numerator=[],denominator=[];
 for(const item of expr.v){
  if(item.t==='p'&&item.e<0)denominator.push(pow(item.b,-item.e));
  else numerator.push(item);
 }
 return denominator.length?{num:mul(...numerator),den:mul(...denominator)}:null;
}
function visiblyBounded(expr){
 if(expr.t==='n')return true;
 if(expr.t==='f'&&['sin','cos','tanh','erf'].includes(expr.f))return true;
 if(expr.t==='a')return expr.v.every(visiblyBounded);
 if(expr.t==='m')return expr.v.every(visiblyBounded);
 return false;
}
function commonRatioLimit(expr,point,side){
 let current=expr;
 for(let depth=0;depth<4;depth++){
  const parts=ratioParts(current);
  if(!parts)return unknown;
  const a=base.limit(parts.num,point,side),b=base.limit(parts.den,point,side);
  if(b.type==='infinity'&&visiblyBounded(parts.num))return finite(0);
  const indeterminate=(a.type==='finite'&&close(a.v,0)&&b.type==='finite'&&close(b.v,0)) ||
    (a.type==='infinity'&&b.type==='infinity');
  if(!indeterminate)return unknown;
  try{
   current=div(derivative(parts.num),derivative(parts.den));
   const value=base.limit(current,point,side);
   if(value.type==='finite'||value.type==='infinity')return value;
  }catch {return unknown;}
 }
 return unknown;
}
export function limit(e,point='plus',side='two'){
 // Delegate ordinary algebra to the original certified rules (including L'Hôpital).
 if(!independent(e)){
  const result=base.limit(e,point,side);
  if(result.type!=='undefined')return result;
  if(e.t==='m'){const ratio=commonRatioLimit(e,point,side);if(ratio.type!=='unknown')return ratio;}
  if(e.t==='f'&&['sin','cos'].includes(e.f)&&point!=='zero')return nonexistent;
  if(e.t==='p'&&e.b.t==='x'&&e.e<0&&point==='zero'&&side==='two'&&Math.abs(e.e)%2===1)return nonexistent;
  return unknown;
 }
 if(e.t==='L')return symbolic(e);
 if(e.t==='I'||e.t==='D')return unknown;
 if(e.t==='f')return specialLimit(e,point,side);
 if(e.t==='a'||e.t==='m'){
   const parts=e.v.map(v=>limit(v,point,side));
   if(parts.some(v=>v.type==='unknown'||v.type==='nonexistent'))return parts.find(v=>v.type==='nonexistent')||unknown;
   if(parts.some(v=>v.type==='infinity'))return unknown; // Avoid false ∞-∞ / 0·∞.
   const nodes=parts.map(v=>v.type==='finite'?n(v.v):v.expr);
   const result=e.t==='a'?add(...nodes):mul(...nodes);
   return result.t==='n'?finite(result.v):symbolic(result);
 }
 if(e.t==='p'){
   const inner=limit(e.b,point,side);
   if(inner.type==='finite'){
     try {const result=pow(n(inner.v),e.e);return result.t==='n'?finite(result.v):symbolic(result);}catch{return unknown;}
   }
   if(inner.type==='symbolic')return symbolic(pow(inner.expr,e.e));
   return unknown;
 }
 return unknown;
}