/* Game-level complex arithmetic and certified transform rules.
   Real symbolic core is intentionally retained; unsupported complex branches
   and transform/integral forms are refused rather than guessed. */
import * as R from './symbolic-extended.js?v=0.18';
import {asymptoticLimit,periodicRange,trigExtrema} from './asymptotic.js?v=0.16';
export * from './symbolic-extended.js?v=0.18';
const n=R.constant,X=R.x,Z=()=>n(0),O=()=>n(1);
const fail=msg=>{throw new R.Unsupported(msg);};
const zero=e=>e?.t==='n'&&e.v===0;
const isC=e=>e?.t==='complex';
const pair=e=>isC(e)?[e.re,e.im]:[e,Z()];
const equal=(a,b)=>R.sig(R.simplify(a))===R.sig(R.simplify(b));
const plus=(...a)=>R.simplify(R.add(...a)), times=(...a)=>R.simplify(R.mul(...a)), power=(a,b)=>R.simplify(R.pow(a,b)), quotient=(a,b)=>R.simplify(R.div(a,b)), F=(name,a)=>R.simplify(R.fn(name,a));
export function complex(re,im){
 re=R.simplify(re);im=R.simplify(im);
 return zero(im)?re:{t:'complex',re,im};
}
export function simplify(e){return isC(e)?complex(e.re,e.im):R.simplify(e);}
export function add(...items){
 if(!items.some(isC))return R.add(...items);
 const ps=items.map(pair);return complex(plus(...ps.map(p=>p[0])),plus(...ps.map(p=>p[1])));
}
export function mul(...items){
 if(!items.some(isC))return R.mul(...items);
 let a=O(),b=Z();
 for(const item of items){const [c,d]=pair(item);const re=plus(times(a,c),times(n(-1),b,d));b=plus(times(a,d),times(b,c));a=re;}
 return complex(a,b);
}
export function div(a,b){
 if(!isC(a)&&!isC(b))return R.div(a,b);
 const [u,v]=pair(a),[c,d]=pair(b);
 const den=plus(power(c,2),power(d,2));
 if(zero(den))fail('0で除算できません');
 return complex(quotient(plus(times(u,c),times(v,d)),den),quotient(plus(times(v,c),times(n(-1),u,d)),den));
}
export function pow(e,k){
 if(!isC(e))return R.pow(e,k);
 if(k===.5)return fn('sqrt',e);
 if(!Number.isSafeInteger(k))fail('複素数の分数乗は未対応です');
 if(k<0)return div(O(),pow(e,-k));
 let a=O(),b=e;while(k>0){if(k%2===1)a=mul(a,b);k=Math.floor(k/2);if(k)b=mul(b,b);}return a;
}
function sign(e){
 if(e.t==='n')return Math.sign(e.v);
 if(e.t==='f'&&['exp','abs','sqrt'].includes(e.f))return 1;
 if(e.t==='p'&&Number.isInteger(e.e)&&e.e%2===0)return 1;
 if(e.t==='m'){let s=1;for(const p of e.v){const q=sign(p);if(q===null)return null;s*=q;}return s;}
 if(e.t==='a'){const ss=e.v.map(sign);if(ss.every(v=>v===0||v===1))return 1;if(ss.every(v=>v===0||v===-1))return -1;}
 return null;
}
export function fn(name,e){
 if(name==='exp'&&e?.t==='f'&&e.f==='log')return simplify(e.arg);
 e=simplify(e);
 if(isC(e)){
  const [a,b]=pair(e);
  if(name==='exp')return complex(times(F('exp',a),F('cos',b)),times(F('exp',a),F('sin',b)));
  if(['sqrt','log'].includes(name)&&a.t==='n'&&b.t==='n'){
   const r=Math.hypot(a.v,b.v),theta=Math.atan2(b.v,a.v);
   if(name==='log'){if(r===0)fail('ln(0)は未定義です');return complex(n(Math.log(r)),n(theta));}
   return complex(n(Math.sqrt(r)*Math.cos(theta/2)),n(Math.sqrt(r)*Math.sin(theta/2)));
  }
  fail('この複素数値関数の主枝計算は未対応です');
 }
 if(name==='sqrt'&&sign(e)===-1)return complex(Z(),F('sqrt',times(n(-1),e)));
 if(name==='log'&&sign(e)===-1)return complex(F('log',times(n(-1),e)),n(Math.PI));
 return R.fn(name,e);
}
export function fromCard(id){
 const x=X();
 switch(id){
  case 'NEGEXP':return F('exp',times(n(-1),x));
  case 'TAN':return F('tan',x);
  case 'LN_X':return F('log',x);
  case 'RECIP_X':return power(x,-1);
  case 'ROOT_X':return F('sqrt',x);
  case 'CAUCHY':return power(plus(O(),power(x,2)),-1);
  case 'GAUSS':return F('exp',times(n(-1),power(x,2)));
  default:return R.fromCard(id);
 }
}
export function derivative(e){return isC(e)?complex(R.derivative(e.re),R.derivative(e.im)):R.derivative(e);}
export function integrate(e,C=0){
 if(isC(e))return complex(integrate(e.re,C),integrate(e.im,0));
 e=simplify(e);
 // d|u|/dx = sgn(u)u' away from isolated zeros (game convention).
 const fs=e.t==='m'?e.v:[e];
 for(const f of fs){if(f.t!=='f'||f.f!=='sign')continue;
  const rest=times(...fs.filter(v=>v!==f));const du=R.simplify(R.derivative(f.arg));
  if(zero(du))continue;
  try{const k=quotient(rest,du);if(k.t==='n')return plus(times(k,F('abs',f.arg)),n(C));}catch{}
 }
 return R.integrate(e,C);
}
export function inverse(e){if(isC(e))fail('複素数値関数の逆関数は未対応です');return R.inverse(e);}
export function substituteNegX(e){return isC(e)?complex(R.substituteNegX(e.re),R.substituteNegX(e.im)):R.substituteNegX(e);}
export function expressionSize(e){return isC(e)?1+R.expressionSize(e.re)+R.expressionSize(e.im):R.expressionSize(e);}
export function display(e,wrap=false){
 if(!isC(e))return R.display(e,wrap);
 const im=R.display(e.im,true);
 const out=zero(e.re)?'i·'+im:R.display(e.re)+' + i·'+im;
 return wrap?'('+out+')':out;
}
function realTreeLimit(e,point='plus',side='two'){
 if(point==='plus'||point==='minus'){
  const phaseExpr=point==='minus'?R.simplify(R.substituteNegX(e)):e;
  const r=trigExtrema(phaseExpr,R.limit);
  if(r&&r[0]!==r[1])return {type:'nonexistent'};
 }
 const a=asymptoticLimit(e,point,side);
 if(a.type==='complex')return {type:'symbolic',expr:complex(n(a.re),n(a.im))};
 if(a.type==='complexInfinity')return {type:'infinity',sign:1};
 if(a.type!=='unknown')return a;
 const q=R.limit(e,point,side);
 if(point==='plus'&&(q.type==='unknown'||q.type==='nonexistent')){const r=periodicRange(e,R.limit);if(r&&r.every(Number.isFinite))return r[0]===r[1]?{type:'finite',v:r[0]}:{type:'nonexistent'};}
 return q;
}
export function limit(e,point='plus',side='two'){
 if(!isC(e))return realTreeLimit(e,point,side);
 const a=realTreeLimit(e.re,point,side),b=realTreeLimit(e.im,point,side);
 if(a.type==='infinity'||b.type==='infinity')return {type:'infinity',sign:1};
 if(a.type==='nonexistent'||b.type==='nonexistent')return {type:'nonexistent'};
 const val=q=>q.type==='finite'?n(q.v):q.type==='symbolic'?q.expr:null;
 const re=val(a),im=val(b);
 return re&&im?{type:'symbolic',expr:complex(re,im)}:{type:'unknown'};
}
export function oscillatoryLimit(e,kind='sup'){
 e=realRepresentative(simplify(e));
 if(!isC(e)){
  const bounds=trigExtrema(e,R.limit);
  if(bounds){const v=bounds[kind==='sup'?1:0];return Number.isFinite(v)?{type:'finite',v}:{type:'infinity',sign:Math.sign(v)};}
  const q=asymptoticLimit(e,'plus','two');
  if(q.type==='complexInfinity')return {type:'unknown'};
  if(q.type==='complex')return {type:'symbolic',expr:complex(n(q.re),n(q.im))};
  if(q.type==='finite'||q.type==='infinity')return q;
  const r=periodicRange(e,realTreeLimit);
  if(r&&r.every(Number.isFinite))return {type:'finite',v:r[kind==='sup'?1:0]};
  return R.oscillatoryLimit(e,kind);
 }
 const q=limit(e,'plus');return q.type==='symbolic'||q.type==='finite'?q:{type:'unknown'};
}
// Complex rank by realification: each complex vector contributes v and i*v.
function terms(e,out=new Map(),c=1){
 if(e.t==='n'){out.set('#1',(out.get('#1')||0)+c*e.v);return out;}
 if(e.t==='a'){e.v.forEach(v=>terms(v,out,c));return out;}
 if(e.t==='m'&&e.v[0]?.t==='n'){
  return terms(e.v.length===2?e.v[1]:R.mul(...e.v.slice(1)),out,c*e.v[0].v);
 }
 const k=R.sig(e);out.set(k,(out.get(k)||0)+c);return out;
}
// A complex basis proportional to a real function has a real representative.
 // Do not project arbitrary complex functions: x+i sin(x) is not x or sin(x).
 export function realRepresentative(e){
  if(!isC(e))return e;
  const [a,b]=pair(e);
  if(zero(a))return b;
  if(zero(b))return a;
  const re=terms(a),im=terms(b);
  const k=[...re.keys()].find(k=>re.get(k)!==0);
  if(k===undefined)return e;
  const ratio=(im.get(k)||0)/re.get(k);
  if(Number.isFinite(ratio)&&equal(b,times(n(ratio),a)))return a;
  return e;
 }
function vector(e){
 const [a,b]=pair(e),re=terms(a),im=terms(b),v=new Map(),w=new Map();
 for(const k of new Set([...re.keys(),...im.keys()])){
  const r=re.get(k)||0,i=im.get(k)||0;
  v.set('r'+k,r);v.set('i'+k,i);w.set('r'+k,-i);w.set('i'+k,r);
 }
 return [v,w];
}
function rank(vs){
 const keys=[...new Set(vs.flatMap(v=>[...v.keys()]))],m=vs.map(v=>keys.map(k=>v.get(k)||0));let r=0;
 for(let j=0;j<keys.length&&r<m.length;j++){
  let p=r;for(let i=r+1;i<m.length;i++)if(Math.abs(m[i][j])>Math.abs(m[p][j]))p=i;
  if(Math.abs(m[p][j])<1e-8)continue;
  [m[r],m[p]]=[m[p],m[r]];const d=m[r][j];
  for(let k=j;k<keys.length;k++)m[r][k]/=d;
  for(let i=r+1;i<m.length;i++){const c=m[i][j];for(let k=j;k<keys.length;k++)m[i][k]-=c*m[r][k];}r++;
 }return r;
}
export function reduceBasis(board){
 board=board.map(e=>realRepresentative(simplify(e)));
 if(!board.some(isC))return R.reduceBasis(board);
 const kept=[],removed=[],vs=[];
 board.forEach((raw,i)=>{const e=simplify(raw),v=vector(e);if(rank([...vs,...v])===rank(vs))removed.push(i);else{kept.push(e);vs.push(...v);}});
 return {kept,removed};
}
// Transform rules. x is the new real argument after each transform.
function scalar(e){
 if(e.t==='m'&&e.v[0]?.t==='n')return [e.v[0].v,R.mul(...e.v.slice(1))];
 return [1,e];
}
function monomial(e,k){
 const [c,b]=scalar(e);
 if(k===0&&b.t==='n')return c*b.v;
 if(k===1&&b.t==='x')return c;
 if(b.t==='p'&&b.b.t==='x'&&b.e===k)return c;
 return null;
}
function degree(e){return e.t==='x'?1:e.t==='p'&&e.b.t==='x'?e.e:e.t==='n'&&e.v===1?0:null;}
function gammaHalf(k){
 if(k===0)return 1;
 if(k===-.5)return Math.sqrt(Math.PI);
 if(k===.5)return Math.sqrt(Math.PI)/2;
 if(k>0&&k<=12&&Number.isInteger(k*2))return k*gammaHalf(k-1);
 return null;
}
function expMonomial(e){
 const factors=e.t==='m'?e.v:[e];
 const exp=factors.filter(v=>v.t==='f'&&v.f==='exp');
 if(exp.length!==1)return null;
 const rest=R.simplify(R.mul(...factors.filter(v=>v!==exp[0])));
 const [c,term]=scalar(rest),p=degree(term);
 if(p===null)return null;
 const a=monomial(exp[0].arg,1),q=monomial(exp[0].arg,2);
 return {c,p,a,q};
}
function linear(e,op){
 e=simplify(e);
 if(isC(e))return add(op(e.re),mul(complex(Z(),O()),op(e.im)));
 if(e.t==='a')return add(...e.v.map(op));
 const [c,b]=scalar(e);
 if(c!==1)return mul(n(c),op(b));
 if(zero(e))return Z();
 return null;
}
function shifted(a){return plus(X(),n(-a));}
function expTrig(e){
 const factors=e.t==='m'?e.v:[e];let a=0,b=null,kind=null;
 for(const factor of factors){
  if(factor.t!=='f')return null;
  if(factor.f==='exp'){const k=monomial(factor.arg,1);if(k===null)return null;a+=k;}
  else if(['sin','cos','sinh','cosh'].includes(factor.f)&&kind===null){b=monomial(factor.arg,1);if(b===null)return null;kind=factor.f;}
  else return null;
 }
 return kind?{a,b,kind}:null;
}
function lap(e){
 const l=linear(e,lap);if(l!==null)return l;
 const x=X(),p=degree(e),g=p!==null?gammaHalf(p):null;
 const sinc=sincParts(e);if(sinc)return times(n(sinc.coef),F('atan',quotient(n(sinc.b),shifted(sinc.a))));
 if(g!==null)return times(n(g),power(x,-p-1));
 if(e.t==='n')return quotient(e,x);
 const t=expTrig(e);if(t){const y=shifted(t.a),hyper=t.kind==='sinh'||t.kind==='cosh',den=plus(power(y,2),n((hyper?-1:1)*t.b*t.b));return quotient(t.kind==='sin'||t.kind==='sinh'?n(t.b):y,den);}
 const m=expMonomial(e);
 if(m&&m.a!==null){const g=gammaHalf(m.p);if(g!==null)return times(n(m.c*g),power(shifted(m.a),-m.p-1));}
 if(e.t==='f'&&['sin','cos'].includes(e.f)){
  const a=monomial(e.arg,1);
  if(a!==null&&a!==0)return quotient(e.f==='sin'?n(a):x,plus(power(x,2),n(a*a)));
 }
 if(e.t==='f'&&e.f==='sqrt'&&e.arg.t==='x')return times(n(Math.sqrt(Math.PI)/2),power(x,-1.5));
 if(e.t==='f'&&e.f==='log'&&e.arg.t==='x')return quotient(times(n(-1),plus(n(.5772156649015329),F('log',x))),x);
 fail('このラプラス変換の収束または閉じた結果を確定できません');
}
function invLap(e){
 const l=linear(e,invLap);if(l!==null)return l;
 const x=X();
 if(e.t==='p'&&e.e<0){
  let a=null;if(e.b.t==='x')a=0;
  else if(e.b.t==='a'){
   const v=e.b.v.find(t=>t.t==='x'),c=e.b.v.find(t=>t.t==='n');
   if(v&&c&&e.b.v.length===2)a=-c.v;
  }
  const p=-e.e-1,g=gammaHalf(p);
  if(a!==null&&g!==null)return times(n(1/g),power(x,p),F('exp',times(n(a),x)));
 }
 for(const k of [1,2,3,4,5]){
  const den=plus(power(x,2),n(k*k));
  if(equal(e,power(den,-1)))return times(n(1/k),F('sin',times(n(k),x)));
  if(equal(e,quotient(x,den)))return F('cos',times(n(k),x));
 }
 fail('この逆ラプラス変換は未対応です');
}
function fourier(e){
 const l=linear(e,fourier);if(l!==null)return l;
 const x=X(),m=expMonomial(e);
 if(m&&m.q!==null&&m.q<0&&[0,1].includes(m.p)){
  const a=-m.q,gaussian=times(n(m.c*Math.sqrt(Math.PI/a)),F('exp',times(n(-1/(4*a)),power(x,2))));
  return m.p===0?gaussian:mul(complex(Z(),n(-1/(2*a))),x,gaussian);
 }
 if(e.t==='f'&&e.f==='exp'){
  const [c,b]=scalar(e.arg);
  if(c<0&&b.t==='f'&&b.f==='abs'&&b.arg.t==='x'){
   const a=-c;return quotient(n(2*a),plus(n(a*a),power(x,2)));
  }
 }
 // A/(x^2+a^2), using actual positive constant in the denominator.
 if(e.t==='p'&&e.e===-1&&e.b.t==='a'){
  const q=e.b.v.find(t=>t.t==='p'&&t.b.t==='x'&&t.e===2),c=e.b.v.find(t=>t.t==='n');
  if(q&&c&&c.v>0&&e.b.v.length===2){const a=Math.sqrt(c.v);return times(n(Math.PI/a),F('exp',times(n(-a),F('abs',x))));}
 }
 fail('通常関数としてのフーリエ変換を確定できません（超関数は対象外）');
}
// x^p/(x²+a²)^k with p>=0 integer and p<2k-1.
// The positive quadratic has no real pole and the beta integral converges.
function betaQuadratic(e){
 const fs=e.t==='m'?e.v:[e];
 let p=0,k=null,a=null,scale=1;
 for(const term of fs){
  if(term.t==='n'){scale*=term.v;continue;}
  const degreeX=degree(term);
  if(degreeX!==null){p+=degreeX;continue;}
  if(k!==null||term.t!=='p'||!Number.isInteger(term.e)||term.e>=0||term.b.t!=='a')return null;
  const q=term.b.v.find(t=>t.t==='p'&&t.b.t==='x'&&t.e===2),c=term.b.v.find(t=>t.t==='n');
  if(!q||!c||c.v<=0||term.b.v.length!==2)return null;
  k=-term.e;a=Math.sqrt(c.v);
 }
 if(k===null||!Number.isInteger(p)||p<0||p>=2*k-1)return null;
 const u=gammaHalf((p-1)/2),v=gammaHalf(k-(p+1)/2-1),w=gammaHalf(k-1);
 if(u===null||v===null||w===null)return null;
 const value=scale*a**(p+1-2*k)*u*v/(2*w);return Number.isFinite(value)?n(value):null;
}
function sincParts(e){
 const fs=e.t==='m'?e.v:[e];let b=null,a=0,reciprocal=false,coef=1;
 for(const t of fs){
  if(t.t==='n'){coef*=t.v;continue;}
  if(t.t==='p'&&t.b.t==='x'&&t.e===-1&&!reciprocal){reciprocal=true;continue;}
  if(t.t==='f'&&t.f==='sin'&&b===null){b=monomial(t.arg,1);if(b===null)return null;continue;}
  if(t.t==='f'&&t.f==='exp'){const q=monomial(t.arg,1);if(q===null)return null;a+=q;continue;}
  return null;
 }
 return b!==null&&reciprocal?{a,b,coef}:null;
}
function halfIntegral(e){
 const l=linear(e,halfIntegral);if(l!==null)return l;
 const x=X(),m=expMonomial(e);
 const beta=betaQuadratic(e);if(beta!==null)return beta;
 const sinc=sincParts(e);if(sinc&&sinc.a<=0)return n(sinc.coef*(sinc.a===0?Math.sign(sinc.b)*Math.PI/2:Math.atan(sinc.b/-sinc.a)));
 const t=expTrig(e);if(t){const hyper=t.kind==='sinh'||t.kind==='cosh';if(t.a<0&&(!hyper||-t.a>Math.abs(t.b))){const d=t.a*t.a+(hyper?-1:1)*t.b*t.b;return n((t.kind==='sin'||t.kind==='sinh'?t.b:-t.a)/d);}}
 if(m&&m.a!==null&&m.a<0){const g=gammaHalf(m.p);if(g!==null)return n(m.c*g/(-m.a)**(m.p+1));}
 if(m&&m.q!==null&&m.q<0&&m.p>=0&&Number.isInteger(m.p)){
  const g=gammaHalf((m.p-1)/2);if(g!==null)return n(m.c*g/(2*(-m.q)**((m.p+1)/2)));
 }
 if(equal(e,quotient(F('sin',x),x)))return n(Math.PI/2);
 if(e.t==='p'&&e.e===-1&&e.b.t==='a'){
  const q=e.b.v.find(t=>t.t==='p'&&t.b.t==='x'&&t.e===2),c=e.b.v.find(t=>t.t==='n');
  if(q&&c&&c.v>0&&e.b.v.length===2)return n(Math.PI/(2*Math.sqrt(c.v)));
 }
 if(e.t==='f'&&e.f==='exp'){
  const [c,b]=scalar(e.arg);if(c<0&&b.t==='f'&&b.f==='abs'&&b.arg.t==='x')return n(-1/c);
 }
 fail('広義積分の収束と値を確定できません');
}
export function advancedOperation(id,e){
 e=simplify(e);
 switch(id){
  case 'EXP_OP':return fn('exp',e);
  case 'SQUARE':return pow(e,2);
  case 'INT_HALF':return halfIntegral(e);
  case 'INT_ALL':return add(halfIntegral(e),halfIntegral(simplify(substituteNegX(e))));
  case 'LAPLACE':return lap(e);
  case 'INV_LAPLACE':return invLap(e);
  case 'FOURIER':return fourier(e);
  case 'INV_FOURIER':return mul(n(1/(2*Math.PI)),substituteNegX(fourier(e)));
  default:fail('未対応の演算カード');
 }
}
