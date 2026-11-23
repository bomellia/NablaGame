/* Additional special-function and deferred symbolic algebra for the game.
   Never assume an unproved limit has a numeric value. */
import * as base from './symbolic.js?v=0.6';
export * from './symbolic.js?v=0.6';
const n=base.constant, X=base.x, add=base.add, pow=base.pow;
// Canonicalize basic trigonometric quotients before they become large trees.
// tan(a) has precisely the domain of sin(a)/cos(a); unlike cancelling x/x,
// this rewriting does not add points to the real domain.
export function fn(name,arg){
 if(arg?.t==='n'){
  const v=arg.v;
  if(name==='tan'){
   if(Math.abs(Math.cos(v))<1e-10)throw new base.Unsupported('tan の極に当たります');
   return n(Math.tan(v));
  }
  if(name==='cot'){
   if(Math.abs(Math.sin(v))<1e-10)throw new base.Unsupported('cot の極に当たります');
   return n(1/Math.tan(v));
  }
  if(name==='sec'){
   if(Math.abs(Math.cos(v))<1e-10)throw new base.Unsupported('sec の極に当たります');
   return n(1/Math.cos(v));
  }
  if(name==='csc'){
   if(Math.abs(Math.sin(v))<1e-10)throw new base.Unsupported('csc の極に当たります');
   return n(1/Math.sin(v));
  }
  if(name==='sinh')return n(Math.sinh(v));
  if(name==='cosh')return n(Math.cosh(v));
  if(name==='tanh')return n(Math.tanh(v));
  if(name==='atan')return n(Math.atan(v));
 }
 if(arg?.t==='m'&&arg.v[0]?.t==='n'&&arg.v[0].v===-1&&['tan','cot','sec','csc'].includes(name)){
  const pos=base.mul(...arg.v.slice(1));
  return ['tan','cot','csc'].includes(name)?base.mul(n(-1),fn(name,pos)):fn(name,pos);
 }
 return base.fn(name,arg);
}
const f=fn;
export function mul(...parts){
 const e=base.mul(...parts);
 if(e.t!=='m')return e;
 // A single numerator and denominator trig factor with the same argument.
 const factors=[...e.v];
 for(let i=0;i<factors.length;i++){
  const v=factors[i];
  if(v?.t!=='f'||!['sin','cos'].includes(v.f))continue;
  const other=v.f==='sin'?'cos':'sin';
  const j=factors.findIndex((w,k)=>k!==i&&w?.t==='p'&&w.e===-1&&w.b?.t==='f'&&w.b.f===other&&base.sig(w.b.arg)===base.sig(v.arg));
  if(j>=0){
   const name=v.f==='sin'?'tan':'cot';
   return base.mul(f(name,v.arg),...factors.filter((_,k)=>k!==i&&k!==j));
  }
 }
 return e;
}
export function div(a,b){
 if(a?.t==='f'&&b?.t==='f'&&base.sig(a.arg)===base.sig(b.arg)){
  if(a.f==='sin'&&b.f==='cos')return f('tan',a.arg);
  if(a.f==='cos'&&b.f==='sin')return f('cot',a.arg);
 }
 if(a?.t==='n'&&a.v===1&&b?.t==='f'){
  if(b.f==='cos')return f('sec',b.arg);
  if(b.f==='sin')return f('csc',b.arg);
 }
 return mul(a,pow(b,-1));
}
const neg = a => mul(n(-1),a);
const finite = v => ({type:'finite',v});
const P={type:'infinity',sign:1}, M={type:'infinity',sign:-1};
const unknown={type:'unknown'}, nonexistent={type:'nonexistent'};
const symbolic = expr => ({type:'symbolic',expr});
const close=(a,b)=>Math.abs(a-b)<1e-8;
export const antiderivative=(arg,order=1)=>({t:'I',arg,order});
export const formalLimit=(arg,point='plus',side='two',kind='lim')=>({t:'L',arg,point,side,kind});
function independent(e){return !!e&&(['I','D','L'].includes(e.t)||e.arg&&independent(e.arg)||e.b&&independent(e.b)||Array.isArray(e.v)&&e.v.some(independent)||e.t==='f'&&['Li','Ei','Si','Ci','erf','erfi','FresnelS','FresnelC','Shi','Chi','abs','tan','cot','sec','csc','atan','tanh','sinh','cosh'].includes(e.f));}
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
  case 'tan':return div(da,pow(f('cos',a),2));
  case 'cot':return neg(div(da,pow(f('sin',a),2)));
  case 'sec':return mul(f('sec',a),f('tan',a),da);
  case 'csc':return neg(mul(f('csc',a),f('cot',a),da));
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
 // arctangent: d/dx atan(x) = 1/(1+x²).
 if(e.t==='p'&&e.e===-1&&e.b?.t==='a'&&e.b.v.length===2){
   const one=e.b.v.some(v=>v.t==='n'&&close(v.v,1));
   const sq=e.b.v.some(v=>v.t==='p'&&v.b.t==='x'&&close(v.e,2));
   if(one&&sq)return f('atan',X());
 }
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
 // Derivatives of tan and cot provide elementary antiderivatives of sec² and csc².
 if(e.t==='p'&&e.e===-2&&e.b?.t==='f'&&e.b.arg?.t==='x'){
  if(e.b.f==='cos')return f('tan',X());
  if(e.b.f==='sin')return neg(f('cot',X()));
 }
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
   if(e.f==='tan')return neg(f('logabs',f('cos',X())));
   if(e.f==='cot')return f('logabs',f('sin',X()));
   if(e.f==='tanh')return f('log',f('cosh',X()));
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
  case 'f':{
   if(e.f==='sqrt')return `√(${display(e.arg)})`;
   if(e.f==='logabs')return `ln|${display(e.arg)}|`;
   if(e.f==='abs')return `|${display(e.arg)}|`;
   const names={asin:'arcsin',acos:'arccos',atan:'arctan'};
   return `${names[e.f]||e.f}(${display(e.arg)})`;
  }
  default:return pretty(e,wrap);
 }
}
// A certificate-based limit evaluator. An unknown result is NEVER treated as a
// successful limit-card action: zero/infinity/nonexistence affect the winner.
const isFinite = z=>z?.type==='finite';
const isInf = z=>z?.type==='infinity';
const isZero = z=>isFinite(z)&&close(z.v,0);
const isKnown = z=>['finite','infinity','symbolic'].includes(z?.type);
const isBad = z=>z?.type==='nonexistent';
function trigOuter(name,arg,point,side,depth){
 const lim=limitRec(arg,point,side,depth+1);
 if(isBad(lim))return nonexistent;
 if(isInf(lim)){
  if(['sin','cos','tan','cot','sec','csc'].includes(name))return nonexistent;
  return unknown;
 }
 if(isFinite(lim)){
  try { const v=f(name,n(lim.v));return v.t==='n'?finite(v.v):symbolic(v); }
  catch {return unknown;}
 }
 return unknown;
}
function specialLimit(e,point,side,depth){
 const name=e.f;
 if(['sin','cos','tan','cot','sec','csc','exp','log','logabs','sqrt'].includes(name)){
  const l=limitRec(e.arg,point,side,depth+1);
  if(isBad(l))return nonexistent;
  if(isInf(l)){
   if(['sin','cos','tan','cot','sec','csc'].includes(name))return nonexistent;
   if(name==='exp')return l.sign>0?P:finite(0);
   if(name==='log'||name==='logabs')return P;
   if(name==='sqrt')return l.sign>0?P:nonexistent;
  }
  if(isFinite(l)){
   const v=l.v;
   if(close(v,0)){
    if(name==='logabs')return M;
    if(name==='log')return point==='zero'&&side==='plus'?M:point==='zero'&&side==='minus'?nonexistent:unknown;
    if(name==='cot'||name==='csc'){
     const sign=signNear(e.arg,point,side);
     return sign===1?P:sign===-1?M:nonexistent;
    }
   }
   try {const result=f(name,n(v));return result.t==='n'?finite(result.v):symbolic(result);}catch{return unknown;}
  }
  return unknown;
 }
 const l=limitRec(e.arg,point,side,depth+1);
 if(isBad(l))return nonexistent;
 if(!isKnown(l))return unknown;
 if(l.type==='symbolic')return unknown;
 if(isInf(l)){
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
  }
 }
 if(isFinite(l)){
  const v=l.v;
  if(close(v,0)){
   if(['Ei','Ci','Chi','logabs'].includes(name))return M;
   if(name==='Li')return point==='zero'&&side==='plus'?finite(0):unknown;
   if(['Si','Shi','erf','erfi','FresnelS','FresnelC'].includes(name))return finite(0);
  }
  if(name==='Li'&&close(v,1))return M;
  if((name==='Ci'&&v<0)||(name==='Li'&&v<0))return nonexistent;
  try {const v2=f(name,n(v));return v2.t==='n'?finite(v2.v):symbolic(v2);}catch{return unknown;}
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
function bounded(e){
 if(e.t==='n')return true;
 if(e.t==='f'&&['sin','cos','tanh','erf'].includes(e.f))return true;
 if(e.t==='a'||e.t==='m')return e.v.every(bounded);
 if(e.t==='p'&&e.e>=0&&Number.isInteger(e.e))return bounded(e.b);
 return false;
}
// Known near-zero signs for x, x^odd/even, sin(x), tan(x) and products.
// null means sign not established; it must not be guessed numerically.
function signNear(e,point,side){
 if(point!=='zero'||side==='two')return null;
 switch(e.t){
  case 'n':return Math.sign(e.v);
  case 'x':return side==='plus'?1:-1;
  case 'f':return ['sin','tan'].includes(e.f)?signNear(e.arg,point,side):null;
  case 'p':{
   const s=signNear(e.b,point,side);
   if(s===null)return null;
   return Number.isInteger(e.e)&&e.e%2===0?1:s;
  }
  case 'm':{
   let sign=1;for(const q of e.v){const s=signNear(q,point,side);if(s===null)return null;sign*=s;}return sign;
  }
 }
 return null;
}
function productLimit(e,point,side,depth){
 const factors=e.t==='m'?e.v:[e];
 const vals=factors.map(v=>limitRec(v,point,side,depth+1));
 if(vals.every(isFinite))return finite(vals.reduce((r,v)=>r*v.v,1));
 // The product of one factor tending to zero and bounded remaining factors is zero.
 if(vals.some(isZero) && factors.every((v,i)=>isZero(vals[i])||isFinite(vals[i])||bounded(v)))return finite(0);
 if(vals.some(isBad)||vals.some(v=>v.type==='unknown'))return unknown;
 const infinities=vals.filter(isInf);
 if(infinities.length && vals.some(isZero))return unknown;
 if(infinities.length && vals.every(v=>isFinite(v)||isInf(v))){
  let sign=1;
  for(const v of vals)sign*=isInf(v)?v.sign:Math.sign(v.v);
  return sign>0?P:M;
 }
 if(vals.every(isKnown)){
  const nodes=vals.map(v=>isFinite(v)?n(v.v):v.expr);
  return symbolic(mul(...nodes));
 }
 return unknown;
}
function sumLimit(e,point,side,depth){
 const terms=e.t==='a'?e.v:[e];
 const vals=terms.map(v=>limitRec(v,point,side,depth+1));
 if(vals.every(isFinite))return finite(vals.reduce((r,v)=>r+v.v,0));
 const inf=vals.filter(isInf);
 if(inf.length && inf.every(v=>v.sign===inf[0].sign) && terms.every((e,i)=>isKnown(vals[i])||bounded(e))){
  return inf[0].sign>0?P:M;
 }
 if(vals.some(isBad)||vals.some(v=>v.type==='unknown'))return unknown;
 if(inf.length)return unknown;
 if(vals.every(isKnown))return symbolic(add(...vals.map(v=>isFinite(v)?n(v.v):v.expr)));
 return unknown;
}
function ratioLimit(e,point,side,depth){
 let current=e;
 for(let step=0;step<5;step++){
  const parts=ratioParts(current);
  if(!parts)return unknown;
  const a=limitRec(parts.num,point,side,depth+1);
  const b=limitRec(parts.den,point,side,depth+1);
  if(isInf(b)&&bounded(parts.num))return finite(0);
  if(isFinite(a)&&isInf(b))return finite(0);
  // numerator finite nonzero; denominator tends to 0 with a proved sign
  if(isFinite(a)&&!close(a.v,0)&&isZero(b)){
   const sign=signNear(parts.den,point,side);
   if(sign)return a.v*sign>0?P:M;
   if(point==='zero'&&side==='two')return nonexistent;
  }
  if(!((isZero(a)&&isZero(b))||(isInf(a)&&isInf(b))))return unknown;
  try {
   current=div(derivative(parts.num),derivative(parts.den));
   const candidate=limitRec(current,point,side,depth+1);
   if(isFinite(candidate)||isInf(candidate))return candidate;
  } catch {return unknown;}
 }
 return unknown;
}
function limitRec(e,point,side,depth){
 if(depth>18)return unknown;
 if(e.t==='L')return unknown; // never bless a previously unproved limit
 if(e.t==='I'||e.t==='D')return unknown;
 if(e.t==='n')return finite(e.v);
 if(e.t==='x')return point==='plus'?P:point==='minus'?M:finite(0);
 if(e.t==='f')return specialLimit(e,point,side,depth);
 if(e.t==='a')return sumLimit(e,point,side,depth);
 if(e.t==='m'){
  const product=productLimit(e,point,side,depth);
  if(isKnown(product))return product;
  const ratio=ratioParts(e);
  if(ratio){const answer=ratioLimit(e,point,side,depth);if(isKnown(answer)||isBad(answer))return answer;}
  return product;
 }
 if(e.t==='p'){
  const inner=limitRec(e.b,point,side,depth+1);
  if(isFinite(inner)){
   if(close(inner.v,0)&&e.e<0){
    const s=signNear(e.b,point,side);
    if(s!==null){const sign=Number.isInteger(e.e)&&e.e%2===0?1:s;return sign>0?P:M;}
    if(point==='zero'&&side==='two'&&e.b.t==='x'&&Number.isInteger(e.e))
      return e.e%2===0?P:nonexistent;
    return unknown;
   }
   try{const result=pow(n(inner.v),e.e);return result.t==='n'?finite(result.v):unknown;}
   catch{return unknown;}
  }
  if(isInf(inner)){
   if(e.e<0)return finite(0);
   if(Number.isInteger(e.e))return inner.sign<0&&e.e%2!==0?M:P;
   return inner.sign>0?P:unknown;
  }
  if(isBad(inner)){
    // Even powers of a genuinely oscillating sinusoid are still nonconvergent.
    if(e.b?.t==='f'&&['sin','cos'].includes(e.b.f)&&Number.isInteger(e.e)&&e.e>0)return nonexistent;
    if(e.b?.t==='f'&&['sin','cos'].includes(e.b.f)&&Number.isInteger(e.e)&&e.e<0)return nonexistent;
    return unknown;
  }
  return unknown;
 }
 return unknown;
}
function reciprocalX(e){
 switch(e.t){
  case 'n':return e;
  case 'x':return pow(X(),-1);
  case 'a':return add(...e.v.map(reciprocalX));
  case 'm':return mul(...e.v.map(reciprocalX));
  case 'p':return e.b.t==='x'&&Number.isInteger(e.e)?pow(X(),-e.e):pow(reciprocalX(e.b),e.e);
  case 'f':return f(e.f,reciprocalX(e.arg));
  default:return e;
 }
}
function algebraicGrowth(e){
 if(e.t==='n')return true;
 if(e.t==='x')return true;
 if(e.t==='p'&&e.b.t==='x')return true;
 if(e.t==='f'&&['sin','cos','tanh','erf'].includes(e.f))return true;
 if(e.t==='a'||e.t==='m')return e.v.every(algebraicGrowth);
 return false;
}
function dominanceAtInfinity(e,point){
 if(e.t!=='m')return unknown;
 // An exponentially decreasing factor defeats every polynomial factor.
 for(let i=0;i<e.v.length;i++){
  const v=e.v[i];
  if(v?.t!=='f'||v.f!=='exp')continue;
  const l=limitRec(v.arg,point,'two',0);
  if(isInf(l)&&l.sign<0&&e.v.every((q,j)=>i===j||algebraicGrowth(q)))return finite(0);
 }
 return unknown;
}
function trigOscillatesWithoutDamping(e,point,side='two'){
 if(e.t!=='m')return unknown;
 for(const direction of point==='zero'&&side==='two'?['plus','minus']:[side]){
  const factors=e.v;
  const trig=factors.filter(q=>q.t==='f'&&['sin','cos','tan','cot','sec','csc'].includes(q.f)
    &&isInf(limitRec(q.arg,point,direction,0)));
  if(!trig.length)continue;
  const others=factors.filter(q=>!trig.includes(q));
  if(!others.length)return nonexistent;
  if(others.every(algebraicGrowth)&&others.every(q=>{
   const v=limitRec(q,point,direction,0);
   return isInf(v)||(isFinite(v)&&!close(v.v,0));
  }))return nonexistent;
 }
 return unknown;
}
export function limit(e,point='plus',side='two'){
 const clean=simplify(e);
 const first=limitRec(clean,point,side,0);
 if(isKnown(first)||isBad(first))return first;
 if(point==='plus'||point==='minus'){
  const dominated=dominanceAtInfinity(clean,point);
  if(isKnown(dominated))return dominated;
  const oscillates=trigOscillatesWithoutDamping(clean,point);
  if(isBad(oscillates))return oscillates;
  // x = ±∞ is the corresponding one-sided t=1/x -> 0 limit.
  // This makes x*sin(1/x), x²*(1-cos(1/x)), etc. tractable.
  try{
   const transformed=reciprocalX(clean);
   if(base.sig(transformed)!==base.sig(clean)){
    const alternative=limitRec(transformed,'zero',point==='plus'?'plus':'minus',0);
    if(isKnown(alternative)||isBad(alternative))return alternative;
   }
  }catch{}
 }
 if(point==='zero'){
  const oscillates=trigOscillatesWithoutDamping(clean,point,side);
  if(isBad(oscillates))return oscillates;
 }
 return unknown;
}
// For limsup / liminf we only evaluate certified, exactly known harmonic forms.
export function oscillatoryLimit(e,kind='sup'){
 const normal=simplify(e);
 const simple=base.oscillatoryLimit(normal,kind);
 if(simple.type==='finite')return simple;
 // When an ordinary limit exists, upper and lower limits agree with it.
 const ordinary=limit(normal,'plus');
 if(isFinite(ordinary)||isInf(ordinary))return ordinary;
 if(normal.t==='f'&&['tan','cot','sec','csc'].includes(normal.f)&&isInf(limitRec(normal.arg,'plus','two',0)))
   return kind==='sup'?P:M;
 if(normal.t==='p'&&normal.e===-2&&normal.b?.t==='f'&&['sin','cos'].includes(normal.b.f)
   &&isInf(limitRec(normal.b.arg,'plus','two',0)))
   return kind==='sup'?P:finite(1);
 if(normal.t==='p'&&Number.isInteger(normal.e)&&normal.e>0&&normal.b?.t==='f'&&['sin','cos'].includes(normal.b.f)
   &&isInf(limitRec(normal.b.arg,'plus','two',0)))
   return kind==='sup'?finite(1):finite(normal.e%2===0?0:-1);
 return unknown;
}
