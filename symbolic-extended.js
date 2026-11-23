import {displayNumber} from './number-format.js?v=0.9';
/* Additional special-function and deferred symbolic algebra for the game.
   Never assume an unproved limit has a numeric value. */
import * as base from './symbolic.js?v=0.9';
import {rationalNormalize,trigNormalize,orderedTerms} from './normalization.js?v=0.9';
export * from './symbolic.js?v=0.9';
const n=base.constant, X=base.x, add=base.add, pow=base.pow;
// Canonicalize basic trigonometric quotients before they become large trees.
// tan(a) has precisely the domain of sin(a)/cos(a); unlike cancelling x/x,
// this rewriting does not add points to the real domain.
// Standard incomplete elliptic integrals with parameter m=2. The stored
// argument is the original trigonometric phase u, not the elliptic amplitude.
// This keeps differentiation exact without a floating-point pi/4 shift.
function ellipticInfo(name){
 const match=/^Elliptic([EF])(Sin|Cos)(?::(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?))?$/.exec(name);
 if(!match)return null;
 const m=match[3]===undefined?2:Number(match[3]);
 return Number.isFinite(m)?{kind:match[1],trig:match[2].toLowerCase(),m}:null;
}
export {ellipticInfo};
export function fn(name,arg){
 if((name==='log'||name==='logabs')&&arg?.t==='p'){
  const k=arg.e;
  if(Number.isInteger(k)){
   if(name==='logabs'||k%2===0)return base.mul(n(k),fn('logabs',arg.b));
   return base.mul(n(k),fn('log',arg.b));
  }
  // Real fractional powers of a positive base: retain the positive log branch.
  if(Number.isInteger(k*2))return base.mul(n(k),fn('log',arg.b));
 }
 if((name==='log'||name==='logabs')&&arg?.t==='f'&&arg.f==='sqrt')return base.mul(n(.5),fn('log',arg.arg));
 if(name==='logabs'&&arg?.t==='f'&&arg.f==='abs')return fn('logabs',arg.arg);
 if(name==='logabs'&&arg?.t==='f'&&arg.f==='exp')return arg.arg;
 if(name==='logabs'&&arg?.t==='m')return base.add(...arg.v.map(v=>fn('logabs',v)));
 if(name==='log'&&arg?.t==='m'&&arg.v[0]?.t==='n'&&arg.v[0].v>0)
  return base.add(fn('log',arg.v[0]),fn('log',base.mul(...arg.v.slice(1))));
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
 if(arg?.t==='m'&&arg.v[0]?.t==='n'&&arg.v[0].v<0&&['sin','cos','sinh','cosh'].includes(name)){
  const positive=base.mul(n(-arg.v[0].v),...arg.v.slice(1));
  const val=fn(name,positive);
  return ['sin','sinh'].includes(name)?base.mul(n(-1),val):val;
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
 const elliptic=ellipticInfo(e.f);
 if(elliptic){
  const radicand=add(n(1-elliptic.m/2),mul(n(elliptic.m/2),f(elliptic.trig,a)));
  return df(mul(n(.5),pow(radicand,elliptic.kind==='E'?.5:-.5)));
 }
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
  default:throw new base.Unsupported('未対応の関数を微分できません');
 }
}
export function derivative(e){
 switch(e.t){
  case 'n':return n(0);case 'x':return n(1);
  case 'L':return n(0); // A formal limit is considered a symbolic constant by the game rule.
  case 'I':return (e.order||1)===1?e.arg:antiderivative(e.arg,(e.order||1)-1);
  case 'D':{
   let evaluated=e.arg;
   for(let j=0;j<Math.min(16,(e.order||1)+1);j++)evaluated=derivative(evaluated);
   return evaluated;
  }
  case 'a':return add(...e.v.map(derivative));
  case 'm':return add(...e.v.map((part,i)=>mul(derivative(part),...e.v.filter((_,j)=>i!==j))));
  case 'p':return mul(n(e.e),pow(e.b,e.e-1),derivative(e.b));
  case 'f':return derivativeFn(e);
  default:throw new base.Unsupported('未知の式を微分できません');
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

// Named elementary antiderivatives and simple substitution/integration by parts.
// Unsupported inputs raise Unsupported; no unevaluated integral is admitted.
function linearArgument(u){
 const v=base.linearForm(u);
 if(!v||[...v.keys()].some(k=>k!=='1'&&k!=='x'))return null;
 const a=v.get('x')||0,b=v.get('1')||0;
 return Math.abs(a)>1e-9?{a,b}:null;
}
function elementaryFunctionPrimitive(name,u){
 switch(name){
  case 'exp':return f('exp',u);
  case 'sin':return neg(f('cos',u));
  case 'cos':return f('sin',u);
  case 'sinh':return f('cosh',u);
  case 'cosh':return f('sinh',u);
  case 'tan':return neg(f('logabs',f('cos',u)));
  case 'cot':return f('logabs',f('sin',u));
  case 'sec':return f('logabs',add(f('sec',u),f('tan',u)));
  case 'csc':return f('logabs',add(f('csc',u),neg(f('cot',u))));
  case 'tanh':return f('log',f('cosh',u));
  case 'log':case 'logabs':return add(mul(u,f(name,u)),neg(u));
 }
 return null;
}
function powerOfX(e){
 if(e.t==='x')return 1;
 if(e.t==='p'&&e.b.t==='x'&&Number.isInteger(e.e)&&e.e>=0&&e.e<=7)return e.e;
 return null;
}
function integratePolynomialTimes(fnName,k,power){
 if(power===0){const primitive=elementaryFunctionPrimitive(fnName,mul(n(k),X()));return primitive&&mul(n(1/k),primitive);}
 const u=mul(n(k),X()),term=pow(X(),power);
 // Recurrences by integration by parts.
 if(fnName==='exp')return add(mul(term,f('exp',u),n(1/k)),neg(mul(n(power/k),integratePolynomialTimes(fnName,k,power-1))));
 if(fnName==='sin')return add(neg(mul(term,f('cos',u),n(1/k))),mul(n(power/k),integratePolynomialTimes('cos',k,power-1)));
 if(fnName==='cos')return add(mul(term,f('sin',u),n(1/k)),neg(mul(n(power/k),integratePolynomialTimes('sin',k,power-1))));
 return null;
}
function pairPrimitive(e){
 if(e.t!=='m')return null;
 const factors=[...e.v];
 // ∫ x^n exp(kx), x^n sin(kx), x^n cos(kx) by repeated parts.
 if(factors.length===2){
  const q=factors.find(v=>v.t==='f'&&['exp','sin','cos'].includes(v.f));
  if(q){const other=factors.find(v=>v!==q),p=powerOfX(other),lin=linearArgument(q.arg);
   if(p!==null&&lin&&Math.abs(lin.b)<1e-9&&p<=6)return integratePolynomialTimes(q.f,lin.a,p);
  }
 }
 // ∫ u' F(u) dx, with a constant multiplier, where F has a primitive.
 for(const candidate of factors){
  if(candidate.t!=='f')continue;
  const primitive=elementaryFunctionPrimitive(candidate.f,candidate.arg);
  if(!primitive)continue;
  let du;
  try{du=simplify(derivative(candidate.arg));}catch{continue;}
  if(du.t==='n'&&Math.abs(du.v)<1e-9)continue;
  const rest=mul(...factors.filter(v=>v!==candidate));
  try{
   const ratio=simplify(div(rest,du));
   if(ratio.t==='n'&&Number.isFinite(ratio.v))return mul(ratio,primitive);
  }catch{}
 }
 // ∫ u'/u dx = log|u|, including e.g. cos(x)/sin(x).
 for(const factor of factors){
  if(factor.t!=='p'||factor.e!==-1)continue;
  const u=factor.b;
  let du;try{du=simplify(derivative(u));}catch{continue;}
  const rest=mul(...factors.filter(v=>v!==factor));
  try{const ratio=simplify(div(rest,du));
    if(ratio.t==='n'&&Number.isFinite(ratio.v))return mul(ratio,f('logabs',u));
  }catch{}
 }
 return null;
}
function elementaryPowerPrimitive(e){
 if(e.t==='p'&&e.b?.t==='f'&&e.e===2&&e.b.arg.t==='x'){
  const u=X();
  if(e.b.f==='sin')return add(mul(n(.5),u),neg(mul(n(.25),f('sin',mul(n(2),u)))));
  if(e.b.f==='cos')return add(mul(n(.5),u),mul(n(.25),f('sin',mul(n(2),u))));
  if(e.b.f==='sec')return f('tan',u);
  if(e.b.f==='tan')return add(f('tan',u),neg(u));
 }
 // (ax+b)^p via substitution, including 1/(ax+b).
 if(e.t==='p'&&Number.isFinite(e.e)&&e.e>=-8&&e.e<=8){
  const lin=linearArgument(e.b);if(lin){
   if(e.e===-1)return mul(n(1/lin.a),f('logabs',e.b));
   return mul(n(1/(lin.a*(e.e+1))),pow(e.b,e.e+1));
  }
 }
 return null;
}

// Elementary primitives discovered by replaying game-like product/quotient states.
// Restrict arguments to linear functions so chain factors are exact constants.
function trigPowerFactor(e){
 if(e?.t==='f'&&['sin','cos'].includes(e.f))return {name:e.f,u:e.arg,k:1};
 if(e?.t==='p'&&Number.isInteger(e.e)&&e.e>=1&&e.e<=8&&e.b?.t==='f'&&['sin','cos'].includes(e.b.f))
   return {name:e.b.f,u:e.b.arg,k:e.e};
 return null;
}
function binomial(n,k){let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return Math.round(v);}
function trigonometricSubstitutionPrimitive(u,m,k,slope){
 // If one power is odd, substitute the other trigonometric function to
 // avoid expansion into multiple-angle expressions.
 const cosineOdd=k%2===1;
 if(!cosineOdd&&m%2!==1)return null;
 const t=cosineOdd?f('sin',u):f('cos',u);
 const a=cosineOdd?m:k, times=(cosineOdd?k:m)-1;
 let terms=[];
 for(let j=0;j<=times/2;j++){
  const sign=(j%2===0?1:-1)*(cosineOdd?1:-1);
  const exp=a+2*j+1;
  terms.push(mul(n(sign*binomial(times/2,j)/(slope*exp)),pow(t,exp)));
 }
 return add(...terms);
}
function trigonometricPowerPrimitive(expr){
 const factors=expr.t==='m'?expr.v:[expr];
 if(factors.length>2)return null;
 const parts=factors.map(trigPowerFactor);
 if(parts.some(z=>!z))return null;
 const u=parts[0].u,lin=linearArgument(u);
 if(!lin||parts.some(z=>base.sig(z.u)!==base.sig(u)))return null;
 const m=parts.filter(z=>z.name==='sin').reduce((v,z)=>v+z.k,0);
 const k=parts.filter(z=>z.name==='cos').reduce((v,z)=>v+z.k,0);
 if(m+k>12||m+k===0)return null;
 const substituted=trigonometricSubstitutionPrimitive(u,m,k,lin.a);
 if(substituted)return simplify(substituted);
 const result=[];const factor=2**(m+k)*lin.a;
 // Euler's formula gives a finite Fourier expansion for integral powers.
 for(let i=0;i<=m;i++)for(let j=0;j<=k;j++){
   const freq=m+k-2*(i+j);
   const numerator=binomial(m,i)*binomial(k,j)*(i%2===0?1:-1);
   if(m%2===0){
     const coeff=(m%4===0?1:-1)*numerator;
     if(freq===0)result.push(mul(n(coeff/(2**(m+k))),X()));
     else result.push(mul(n(coeff/(factor*freq)),f('sin',mul(n(freq),u))));
   }else if(freq!==0){
     const coeff=(m%4===1?1:-1)*numerator;
     result.push(mul(n(-coeff/(factor*freq)),f('cos',mul(n(freq),u))));
   }
 }
 return simplify(add(...result));
}
function exponentialTrigPrimitive(expr){
 if(expr.t!=='m'||expr.v.length!==2)return null;
 const exponential=expr.v.find(z=>z.t==='f'&&z.f==='exp');
 const trig=expr.v.find(z=>z.t==='f'&&['sin','cos'].includes(z.f));
 if(!exponential||!trig)return null;
 const a=linearArgument(exponential.arg),b=linearArgument(trig.arg);
 if(!a||!b)return null;
 const denom=a.a*a.a+b.a*b.a;
 if(denom<1e-12)return null;
 return mul(n(1/denom),exponential,
   trig.f==='sin'?add(mul(n(a.a),trig),neg(mul(n(b.a),f('cos',trig.arg)))):
     add(mul(n(a.a),trig),mul(n(b.a),f('sin',trig.arg))));
}
function expTerm(e){
 if(e?.t==='f'&&e.f==='exp')return {coef:1,arg:e.arg};
 if(e?.t==='m'&&e.v.length===2&&e.v[0].t==='n'&&e.v[1].t==='f'&&e.v[1].f==='exp')
   return {coef:e.v[0].v,arg:e.v[1].arg};
 return null;
}
function exponentialQuotientPrimitive(expr){
 const factors=expr.t==='m'?expr.v:[expr];
 const denominator=factors.find(z=>z.t==='p'&&z.e===-1&&z.b.t==='a');
 if(!denominator)return null;
 const remaining=factors.filter(z=>z!==denominator);
 if(remaining.length>1)return null;
 const numerator=remaining.length?remaining[0]:n(1);
 const terms=denominator.b.v;
 let A=0,exp=null;
 for(const term of terms){
  if(term.t==='n'){A+=term.v;continue;}
  const found=expTerm(term);
  if(!found||exp)return null;
  exp=found;
 }
 if(!exp||Math.abs(exp.coef)<1e-12)return null;
 const slope=linearArgument(exp.arg);
 if(!slope)return null;
 const numexp=expTerm(numerator);
 if(numerator.t==='n'){
  const scale=numerator.v;
  if(Math.abs(A)<1e-12)return mul(n(-scale/(exp.coef*slope.a)),f('exp',neg(exp.arg)));
  return add(mul(n(scale/A),X()),
     neg(mul(n(scale/(A*slope.a)),f('logabs',denominator.b))));
 }
 if(numexp&&base.sig(numexp.arg)===base.sig(exp.arg))
   return mul(n(numexp.coef/(exp.coef*slope.a)),f('logabs',denominator.b));
 return null;
}
function quadraticReciprocalPrimitive(expr){
 // ∫ dx/(a x²+b x+c), for nonzero a and real coefficients.
 if(expr.t!=='p'||expr.e!==-1)return null;
 const terms=base.linearForm(expr.b);
 if(!terms||![...terms.keys()].every(k=>['1','x','x^2'].includes(k)))return null;
 const a=terms.get('x^2')||0,b=terms.get('x')||0,c=terms.get('1')||0;
 if(Math.abs(a)<1e-12||Math.abs(c)<1e-12&&Math.abs(b)<1e-12)return null;
 const D=4*a*c-b*b;
 const u=add(mul(n(2*a),X()),n(b));
 if(Math.abs(D)<1e-10)return mul(n(-2),pow(u,-1));
 if(D>0)return mul(n(2/Math.sqrt(D)),f('atan',mul(n(1/Math.sqrt(D)),u)));
 const root=Math.sqrt(-D);
 return mul(n(1/root),f('logabs',div(add(u,n(-root)),add(u,n(root)))));
}

// Recurrences for exp(kx)/x^n, sin(kx)/x^n, cos(kx)/x^n.
// All n≥1 cases reduce to Ei/Si/Ci and elementary terms.
function inversePowerSpecialPrimitive(e){
 if(e.t!=='m'||e.v.length!==2)return null;
 const special=e.v.find(z=>z.t==='f'&&['exp','sin','cos'].includes(z.f));
 const power=e.v.find(z=>z.t==='p'&&z.b?.t==='x'&&Number.isInteger(z.e)&&z.e<=-1&&z.e>=-8);
 if(!special||!power)return null;
 const lin=linearArgument(special.arg);
 if(!lin||Math.abs(lin.b)>1e-10)return null;
 const a=lin.a;
 function recur(name,k){
  if(k===1){
   if(name==='exp')return f('Ei',special.arg);
   if(name==='sin')return f('Si',special.arg);
   return f('Ci',f('abs',special.arg));
  }
  const func=f(name,special.arg);
  const lead=neg(mul(n(1/(k-1)),func,pow(X(),1-k)));
  const mapped=name==='sin'?'cos':name==='cos'?'sin':'exp';
  return add(lead,mul(n((name==='cos'?-1:1)*a/(k-1)),recur(mapped,k-1)));
 }
 return recur(special.f,-power.e);
}
// Weierstrass substitution: t=tan(x/2) integrates 1/(a+b*sin(x))
// and 1/(a+b*cos(x)) in real elementary functions (per connected domain).
function quadraticInVariablePrimitive(a,b,c,t){
 const D=4*a*c-b*b;
 if(Math.abs(a)<1e-12){
   if(Math.abs(b)<1e-12)return Math.abs(c)<1e-12?null:mul(n(1/c),t);
   return mul(n(1/b),f('logabs',add(mul(n(b),t),n(c))));
 }
 const u=add(mul(n(2*a),t),n(b));
 if(Math.abs(D)<1e-10)return mul(n(-2),pow(u,-1));
 if(D>0)return mul(n(2/Math.sqrt(D)),f('atan',mul(n(1/Math.sqrt(D)),u)));
 const root=Math.sqrt(-D);
 return mul(n(1/root),f('logabs',div(add(u,n(-root)),add(u,n(root)))));
}
function trigDenominatorInfo(expr){
 const e=expr?.t==='p'&&expr.e===-1?expr.b:expr;
 if(e?.t!=='a'||e.v.length!==2)return null;
 const constants=e.v.filter(z=>z.t==='n');
 if(constants.length!==1)return null;
 const component=e.v.find(z=>z!==constants[0]);
 const single=component?.t==='f'?{coef:1,fn:component}:component?.t==='m'&&component.v.length===2&&component.v[0].t==='n'&&component.v[1].t==='f'?{coef:component.v[0].v,fn:component.v[1]}:null;
 if(!single||!['sin','cos'].includes(single.fn.f))return null;
 const lin=linearArgument(single.fn.arg);
 if(!lin||Math.abs(lin.b)>1e-10)return null;
 return {a:constants[0].v,b:single.coef,kind:single.fn.f,theta:single.fn.arg,k:lin.a,base:e};
}
function trigLinearDenominatorPrimitive(denomInfo){
 const {a,b,kind,theta,k}=denomInfo;
 const t=f('tan',mul(n(.5),theta));
 const A=kind==='sin'?a:a-b, B=kind==='sin'?2*b:0, C=kind==='sin'?a:a+b;
 const result=quadraticInVariablePrimitive(A,B,C,t);
 return result&&mul(n(2/k),result);
}
function trigQuotientPrimitive(expr){
 const factors=expr.t==='m'?expr.v:[expr];
 const reciprocal=factors.find(z=>z.t==='p'&&z.e===-1&&z.b.t==='a');
 if(!reciprocal)return null;
 const info=trigDenominatorInfo(reciprocal);
 if(!info)return null;
 const rest=factors.filter(z=>z!==reciprocal);
 if(rest.length>1)return null;
 const numerator=rest.length?rest[0]:n(1);
 const antideriv=trigLinearDenominatorPrimitive(info);
 if(!antideriv)return null;
 if(numerator.t==='n')return mul(n(numerator.v),antideriv);
 const factor=numerator.t==='f'?{coef:1,fn:numerator}:numerator.t==='m'&&numerator.v[0].t==='n'&&numerator.v.length===2&&numerator.v[1].t==='f'?{coef:numerator.v[0].v,fn:numerator.v[1]}:null;
 if(!factor||base.sig(factor.fn.arg)!==base.sig(info.theta))return null;
 if(factor.fn.f===info.kind){
   if(Math.abs(info.b)<1e-12)return null;
   return mul(n(factor.coef/info.b),add(X(),neg(mul(n(info.a),antideriv))));
 }
 if((info.kind==='sin'&&factor.fn.f==='cos')||(info.kind==='cos'&&factor.fn.f==='sin')){
   if(Math.abs(info.b)<1e-12)return null;
   return mul(n(factor.coef/(info.b*(info.kind==='sin'?1:-1)*info.k)),f('logabs',info.base));
 }
 return null;
}

function distributedPrimitive(e){
 if(e.t!=='m'||base.expressionSize(e)>85)return null;
 const idx=e.v.findIndex(z=>z.t==='a'&&z.v.length<=3);
 if(idx<0)return null;
 try{
  const rest=e.v.filter((_,i)=>i!==idx);
  return add(...e.v[idx].v.map(term=>integralInner(simplify(mul(...rest,term)))));
 }catch(error){
  if(error instanceof base.Unsupported||error instanceof RangeError)return null;
  throw error;
 }
}
// Rational powers of quadratic polynomials created by sqrt and inverse cards.
function quadraticPowerPrimitive(e){
 if(e.t!=='p'||(Math.abs(e.e+.5)>1e-10&&Math.abs(e.e+1.5)>1e-10))return null;
 const lm=base.linearForm(e.b);
 if(!lm||![...lm.keys()].every(key=>['1','x','x^2'].includes(key)))return null;
 const A=lm.get('x^2')||0,B=lm.get('x')||0,C=lm.get('1')||0;
 if(Math.abs(A)<1e-10)return null; // handled as a linear power
 if(Math.abs(e.e+1.5)<1e-10){
   const D=4*A*C-B*B;
   if(Math.abs(D)<1e-10)return null;
   return mul(n(2/D),add(mul(n(2*A),X()),n(B)),pow(e.b,-.5));
 }
 // Complete the square when the linear term is zero.
 if(Math.abs(B)>1e-10)return null;
 if(A<0&&C>0)return mul(n(1/Math.sqrt(-A)),f('asin',mul(n(Math.sqrt(-A/C)),X())));
 if(A>0)return mul(n(1/Math.sqrt(A)),f('logabs',add(mul(n(Math.sqrt(A)),X()),f('sqrt',e.b))));
 return null;
}
function powerSubstitutionPrimitive(e){
 if(e.t!=='m')return null;
 for(const factor of e.v){
  if(factor.t!=='p'||Math.abs(factor.e)>8)continue;
  let du;try{du=simplify(derivative(factor.b));}catch{continue;}
  if(du.t==='n'&&Math.abs(du.v)<1e-10)continue;
  const rest=mul(...e.v.filter(z=>z!==factor));
  try{
   const r=simplify(div(rest,du));
   if(r.t!=='n'||!Number.isFinite(r.v))continue;
   if(Math.abs(factor.e+1)<1e-10)return mul(r,f('logabs',factor.b));
   return mul(n(r.v/(factor.e+1)),pow(factor.b,factor.e+1));
  }catch{}
 }
 return null;
}
// Integrate arbitrary game-supported integer and half-integer powers of
// sin/cos by reduction. Reciprocal powers of tan/cot/sec/csc use the
// same algebra. Elliptic E and F are the two half-integer base cases.
function singleTrigPower(e){
 let t=e,k=1;
 if(e.t==='p'){t=e.b;k=e.e;}
 if(t.t==='f'&&t.f==='sqrt'){t=t.arg;k*=.5;}
 if(t.t!=='f'||!['sin','cos','tan','cot','sec','csc'].includes(t.f)||!Number.isInteger(k*2)||Math.abs(k)>16)return null;
 let name=t.f;
 if(name==='sec'||name==='csc'){name=name==='sec'?'cos':'sin';k=-k;}
 if((name==='tan'||name==='cot')&&k<0){name=name==='tan'?'cot':'tan';k=-k;}
 return {name,u:t.arg,k};
}
function trigSinglePrimitive(name,u,k){
 const v=f(name,u), S=f('sin',u), C=f('cos',u);
 if(k===0)return u;
 if(name==='tan'||name==='cot'){
  if(!Number.isInteger(k)||k<0)return null;
  if(k===1)return elementaryFunctionPrimitive(name,u);
  const prior=trigSinglePrimitive(name,u,k-2);
  return add(mul(n((name==='tan'?1:-1)/(k-1)),pow(v,k-1)),neg(prior));
 }
 if(k===1)return name==='sin'?neg(C):S;
 if(k===-1)return elementaryFunctionPrimitive(name==='sin'?'csc':'sec',u);
 if(k===.5||k===-.5){
  const special='Elliptic'+(k>0?'E':'F')+(name==='sin'?'Sin':'Cos');
  return mul(n(2),f(special,u));
 }
 const other=name==='sin'?C:S;
 const sign=name==='sin'?-1:1;
 if(k>1){
  const prior=trigSinglePrimitive(name,u,k-2);if(!prior)return null;
  return add(mul(n(sign/k),pow(v,k-1),other),mul(n((k-1)/k),prior));
 }
 if(k<-1){
  const prior=trigSinglePrimitive(name,u,k+2);if(!prior)return null;
  return add(mul(n(-sign/(k+1)),pow(v,k+1),other),mul(n((k+2)/(k+1)),prior));
 }
 return null;
}
function trigExtendedPrimitive(e){
 const parts=(e.t==='m'?e.v:[e]).map(singleTrigPower);
 if(parts.some(p=>!p)||parts.length>2)return null;
 const u=parts[0].u,lin=linearArgument(u);
 if(!lin||parts.some(p=>base.sig(p.u)!==base.sig(u)))return null;
 if(parts.length===1){
  const {name,k}=parts[0];
  // Keep the compact existing Fourier/substitution rules for positive integers.
  if(['sin','cos'].includes(name)&&Number.isInteger(k)&&k>=1&&k<=8&&trigPowerFactor(e))return null;
  const result=trigSinglePrimitive(name,u,k);return result&&mul(n(1/lin.a),result);
 }
 if(parts.some(p=>!['sin','cos'].includes(p.name)))return null;
 let m=parts.filter(p=>p.name==='sin').reduce((a,p)=>a+p.k,0), c=parts.filter(p=>p.name==='cos').reduce((a,p)=>a+p.k,0);
 if(m>=0&&c>=0&&Number.isInteger(m)&&Number.isInteger(c))return null;
 // An odd positive exponent permits t=sin(u) or t=cos(u) substitution;
 // the other exponent can be negative or fractional, including the log case.
 for(const cosineOdd of [true,false]){
  const odd=cosineOdd?c:m, other=cosineOdd?m:c;
  if(odd<1||!Number.isInteger(odd)||odd%2!==1)continue;
  const t=f(cosineOdd?'sin':'cos',u), terms=[];
  for(let j=0;j<=(odd-1)/2;j++){
   const k=other+2*j+1,coef=(cosineOdd?1:-1)*(-1)**j*binomial((odd-1)/2,j)/lin.a;
   terms.push(mul(n(k===0?coef:coef/k),k===0?f('logabs',t):pow(t,k)));
  }
  return add(...terms);
 }
 // Both even/negative powers: t=tan(u) turns the expression into a
 // finite Laurent polynomial when -(m+c)/2-1 is a nonnegative integer.
 const d=-(m+c)/2-1;
 if(Number.isInteger(m)&&Number.isInteger(d)&&d>=0&&d<=12){
  const t=f('tan',u),terms=[];
  for(let j=0;j<=d;j++){
   const k=m+2*j+1,coef=binomial(d,j)/lin.a;
   if(Math.abs(k)>16)return null;
   terms.push(mul(n(k===0?coef:coef/k),k===0?f('logabs',t):pow(t,k)));
  }
  return add(...terms);
 }
 return null;
}
function affineTrigEllipticPrimitive(e){
 let u,p;
 if(e.t==='f'&&e.f==='sqrt'){u=e.arg;p=.5;}
 else if(e.t==='p'&&Math.abs(e.e)===.5){u=e.b;p=e.e;}else return null;
 if(u.t!=='a'||u.v.length!==2)return null;
 const constant=u.v.find(t=>t.t==='n');if(!constant)return null;
 const term=u.v.find(t=>t!==constant);
 let coef=1,trig=term;
 if(term.t==='m'&&term.v.length===2&&term.v[0].t==='n'){coef=term.v[0].v;trig=term.v[1];}
 if(trig.t!=='f'||!['sin','cos'].includes(trig.f))return null;
 const lin=linearArgument(trig.arg),a=constant.v+coef;
 if(!lin||a<=0||coef===0)return null;
 const m=2*coef/a;if(!Number.isFinite(m))return null;
 const name='Elliptic'+(p>0?'E':'F')+(trig.f==='sin'?'Sin':'Cos')+(m===2?'':':'+m);
 return mul(n(2*a**p/lin.a),f(name,trig.arg));
}
function integralInner(e){
 const elliptic=affineTrigEllipticPrimitive(e);if(elliptic)return elliptic;
 const extendedTrig=trigExtendedPrimitive(e);if(extendedTrig)return extendedTrig;
 const powers=trigonometricPowerPrimitive(e);if(powers)return powers;
 const expTrig=exponentialTrigPrimitive(e);if(expTrig)return expTrig;
 const inverseSpecial=inversePowerSpecialPrimitive(e);if(inverseSpecial)return inverseSpecial;
 const logistic=exponentialQuotientPrimitive(e);if(logistic)return logistic;
 const trigRatio=trigQuotientPrimitive(e);if(trigRatio)return trigRatio;
 const distribution=distributedPrimitive(e);if(distribution)return distribution;
 const quad=quadraticReciprocalPrimitive(e);if(quad)return quad;
 const qpow=quadraticPowerPrimitive(e);if(qpow)return qpow;
 const substitutedPower=powerSubstitutionPrimitive(e);if(substitutedPower)return substitutedPower;
 const elementary=elementaryPowerPrimitive(e);if(elementary)return elementary;
 const paired=pairPrimitive(e);if(paired)return paired;
 const special=specialAntiderivative(e);if(special)return special;
 // Derivatives of tan and cot provide elementary antiderivatives of sec² and csc².
 if(e.t==='p'&&e.e===-2&&e.b?.t==='f'&&e.b.arg?.t==='x'){
  if(e.b.f==='cos')return f('tan',X());
  if(e.b.f==='sin')return neg(f('cot',X()));
 }
 if(e.t==='I')throw new base.Unsupported('未評価の積分を積み重ねる操作は許可されません');
 if(e.t==='D')return (e.order||1)===1?e.arg:{t:'D',arg:e.arg,order:e.order-1};
 if(e.t==='L')throw new base.Unsupported('未評価の極限式は積分できません');
 if(e.t==='a')return add(...e.v.map(integralInner));
 if(e.t==='m'&&e.v[0].t==='n')return mul(e.v[0],integralInner(mul(...e.v.slice(1))));
 if(e.t==='f'){
   const a=linearArgument(e.arg),primitive=elementaryFunctionPrimitive(e.f,e.arg);
   if(a&&primitive)return mul(n(1/a.a),primitive);
 }
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
 try{return base.integrate(e,0);}catch(error){if(error instanceof base.Unsupported||error instanceof RangeError)throw new base.Unsupported('この積分は対応済みの初等関数・特殊関数で表せません');throw error;}
}
// Only explicit closed forms are legal. No formal I nodes are ever added to a field.
export function integrate(e,C=0){
 const integrand=simplify(e);
 const value=integralInner(integrand);
 if(containsFormal(value))throw new base.Unsupported('未評価の積分式は場に追加できません');
 return simplify(add(value,n(C)));
}
function containsFormal(e){return !!e&&(['I','D','L'].includes(e.t)||e.arg&&containsFormal(e.arg)||e.b&&containsFormal(e.b)||Array.isArray(e.v)&&e.v.some(containsFormal));}

function normalized(e){
 let current=e;
 for(let i=0;i<3;i++){
   const revised=rationalNormalize(trigNormalize(current));
   if(base.sig(revised)===base.sig(current))break;
   current=revised;
 }
 return current;
}
// For dependence proofs, any *identical normalized subexpression* can serve as
// an atom. Unknown identities are never guessed, but multiples and sums match.
function linearTerms(e){
 if(e.t==='n')return new Map([['#1',e.v]]);
 if(e.t==='a'){
   const values=new Map();
   for(const term of e.v)for(const [k,v] of linearTerms(term))values.set(k,(values.get(k)||0)+v);
   return values;
 }
 if(e.t==='m'&&e.v[0]?.t==='n'){
   const inner=e.v.length===2?e.v[1]:base.mul(...e.v.slice(1));
   return new Map([...linearTerms(inner)].map(([k,v])=>[k,v*e.v[0].v]));
 }
 // On the common real domain, ln|u| = ln(u) wherever ln(u) exists.
 // Keep the displayed domain distinction; only identify these linear atoms.
 if(e.t==='f'&&e.f==='logabs')return new Map([[base.sig({t:'f',f:'log',arg:e.arg}),1]]);
 return new Map([[base.sig(e),1]]);
}
function vectorRank(vectors){
 const keys=[...new Set(vectors.flatMap(v=>[...v.keys()]))];
 const table=vectors.map(v=>keys.map(k=>v.get(k)||0));
 let rank=0;
 for(let j=0;j<keys.length&&rank<table.length;j++){
  let pivot=rank;
  for(let i=rank+1;i<table.length;i++)if(Math.abs(table[i][j])>Math.abs(table[pivot][j]))pivot=i;
  if(Math.abs(table[pivot][j])<1e-8)continue;
  [table[rank],table[pivot]]=[table[pivot],table[rank]];
  const denom=table[rank][j];for(let k=j;k<keys.length;k++)table[rank][k]/=denom;
  for(let i=rank+1;i<table.length;i++){
   const ratio=table[i][j];for(let k=j;k<keys.length;k++)table[i][k]-=ratio*table[rank][k];
  }
  rank++;
 }
 return rank;
}
export function reduceBasis(board){
 const kept=[],removed=[],vectors=[];
 for(let i=0;i<board.length;i++){
   const e=simplify(board[i]);
   if(e.t==='n'&&Math.abs(e.v)<1e-9){removed.push(i);continue;}
   const v=linearTerms(e);
   if(vectorRank([...vectors,v])===vectorRank(vectors)){removed.push(i);continue;}
   kept.push(e);vectors.push(v);
 }
 return {kept,removed};
}
export function simplify(e){
 if(!e||typeof e!=='object')throw new base.Unsupported('式データが破損しています');
 switch(e.t){
  case 'I':return antiderivative(simplify(e.arg),e.order||1);
  case 'D':{
   let evaluated=simplify(e.arg);
   for(let i=0;i<Math.min(16,e.order||1);i++)evaluated=simplify(derivative(evaluated));
   return evaluated;
  }
  case 'L':return formalLimit(simplify(e.arg),e.point,e.side,e.kind||'lim');
  case 'a':return normalized(add(...e.v.map(simplify)));
  case 'm':return normalized(mul(...e.v.map(simplify)));
  case 'p':{
   const inner=simplify(e.b);
   if(inner.t==='p'&&inner.b?.t==='x'&&Number.isInteger(inner.e)&&inner.e>0&&inner.e%2===1&&
     Number.isInteger(e.e*2))return pow(X(),inner.e*e.e);
   if(e.e===-1 && inner.t==='f'){
    const reciprocal={sin:'csc',cos:'sec',csc:'sin',sec:'cos',tan:'cot',cot:'tan'}[inner.f];
    if(reciprocal)return f(reciprocal,inner.arg);
   }
   return normalized(pow(inner,e.e));
  }
  case 'f':{
   const u=simplify(e.arg);
   if(e.f==='sqrt'&&u.t==='p'&&u.b?.t==='x'&&Number.isInteger(u.e)&&u.e>0&&u.e%2===1)
     return pow(X(),u.e/2);
   if(e.f==='sqrt'&&u.t==='f'&&['sin','cos'].includes(u.f))return pow(u,.5);
   return normalized(f(e.f,u));
  }
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
 // Sum display follows descending degree even for plain elementary functions.
 if(e?.t==='n')return displayNumber(e.v);
 if(!independent(e)&&e.t!=='a'&&e.t!=='m'&&e.t!=='p'&&e.t!=='f')return pretty(e,wrap);
 switch(e.t){
  case 'I':return e.order>1?`∫^${e.order}(${display(e.arg)})dx^${e.order}`:`∫(${display(e.arg)})dx`;
  case 'D':return e.order>1?`d^${e.order}/dx^${e.order}(${display(e.arg)})`:`d/dx(${display(e.arg)})`;
  case 'L':{
   const point=e.point==='plus'?'+∞':e.point==='minus'?'−∞':e.side==='plus'?'0⁺':e.side==='minus'?'0⁻':'0';
   return `${e.kind||'lim'}[x→${point}](${display(e.arg)})`;
  }
  case 'n':return displayNumber(e.v);case 'x':return pretty(e,wrap);
  case 'a':return `${wrap?'(' : ''}${orderedTerms(e.v).map(v=>display(v)).join(' + ').replace(/\+ -/g,'− ')}${wrap?')':''}`;
  case 'm':return e.v.map((v,i)=>display(v,v.t==='a'||i>0)).join('·');
  case 'p':return `${display(e.b,true)}^${displayNumber(e.e)}`;
  case 'f':{
   const ell=ellipticInfo(e.f);
   if(ell){
    const phase=ell.trig==='sin'?`(${display(e.arg)})/2−π/4`:`(${display(e.arg)})/2`;
    return `Elliptic${ell.kind}(${phase}|${displayNumber(ell.m)})`;
   }
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
 const ell=ellipticInfo(name);
 if(ell){
  const l=limitRec(e.arg,point,side,depth+1);
  if(!isFinite(l))return unknown;
  const phase=ell.trig==='sin'?l.v/2-Math.PI/4:l.v/2;
  if(Math.abs(phase)>Math.PI/4+1e-10)return unknown;
  if(Math.abs(phase)<1e-10)return finite(0);
  // Nonzero elliptic constants require a constant-algebra implementation
  // before they can safely be used for basis rank. Do not guess.
  return unknown;
 }
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
