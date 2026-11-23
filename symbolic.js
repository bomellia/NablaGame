/* Conservative, self-contained symbolic core. No numeric guesses are used to
   declare two functions equal or an operation mathematically valid. */
const near = (a,b=0) => Math.abs(a-b)<1e-9;
const tidy = v => near(v)?0:+v.toPrecision(12);
const n = v => ({t:'n',v:tidy(v)});
export const x = () => ({t:'x'});
export const constant = n;
export class Unsupported extends Error { constructor(msg){super(msg);this.name='Unsupported';} }
export const sig = e => JSON.stringify(e);
const isN = (e,v) => e?.t==='n' && (v===undefined||near(e.v,v));
export const isZero = e => isN(e,0);
export const isOne = e => isN(e,1);
const keyOrder = (a,b) => sig(a).localeCompare(sig(b));
export function mul(...items) {
  const flat=[];
  for(const e of items.flat()){
    if(!e)throw new Unsupported('式が不正です');
    if(e.t==='m')flat.push(...e.v);else flat.push(e);
  }
  let coeff=1;
  const factors=new Map();
  for(const item of flat){
    if(item.t==='n'){coeff*=item.v;continue;}
    const exp=item.t==='p'?item.e:1, b=item.t==='p'?item.b:item;
    const key=sig(b),prev=factors.get(key);
    factors.set(key,{b,exp:tidy((prev?.exp||0)+exp)});
  }
  coeff=tidy(coeff);
  if(!Number.isFinite(coeff))throw new Unsupported('数値が大きすぎます');
  if(near(coeff))return n(0);
  const core=[];
  for(const {b,exp} of factors.values())if(!near(exp))core.push(near(exp,1)?b:pow(b,exp));
  core.sort(keyOrder);
  if(!core.length)return n(coeff);
  if(!near(coeff,1))core.unshift(n(coeff));
  return core.length===1?core[0]:{t:'m',v:core};
}
function splitCoef(e) {
  if(e.t==='n') return [e.v,n(1)];
  if(e.t==='m'&&e.v[0].t==='n') return [e.v[0].v,mul(...e.v.slice(1))];
  return [1,e];
}
export function add(...items) {
  const flat=[];
  for(const e of items.flat()) {if(e.t==='a') flat.push(...e.v);else flat.push(e);}
  const map=new Map();let total=0;
  for(const e of flat) {
    if(e.t==='n'){ total+=e.v; continue; }
    const [c,base]=splitCoef(e), id=sig(base);
    const old=map.get(id);
    map.set(id,{base,c:tidy((old?.c||0)+c)});
  }
  const out=[];
  for(const {base,c} of map.values()) if(!near(c)) out.push(mul(n(c),base));
  if(!near(total)) out.push(n(total));
  out.sort(keyOrder);
  return out.length===0?n(0):out.length===1?out[0]:{t:'a',v:out};
}
export function pow(base,exp) {
  if(!Number.isFinite(exp)||Math.abs(exp)>16) throw new Unsupported('指数の範囲外です');
  if(near(exp,0)) return n(1);
  if(near(exp,1)) return base;
  if(base.t==='n') {
    if(near(base.v,0)&&exp<0) throw new Unsupported('0で除算できません');
    if(base.v<0&&!Number.isInteger(exp)) throw new Unsupported('実数で定義されません');
    return n(base.v**exp);
  }
  if(base.t==='p' && Number.isInteger(base.e) && Number.isInteger(exp) && base.e>=0 && exp>=0) return pow(base.b,base.e*exp);
  // Safe for nonnegative integral powers; e.g. (-x)^2 = x^2.
  if(base.t==='m' && Number.isInteger(exp) && Math.abs(exp)>=2 && Math.abs(exp)<=8) return mul(...base.v.map(factor=>pow(factor,exp)));
  return {t:'p',b:base,e:exp};
}
export function fn(f,arg) {
  if((f==='sin'||f==='cos')&&arg.t==='m'&&arg.v[0]?.t==='n'&&near(arg.v[0].v,-1)){
    const unsigned=mul(...arg.v.slice(1));
    return f==='sin'?mul(n(-1),fn('sin',unsigned)):fn('cos',unsigned);
  }
  if(arg.t==='n') {
    const a=arg.v;
    if(f==='exp') return n(Math.exp(a));
    if(f==='sin') return n(Math.sin(a));
    if(f==='cos') return n(Math.cos(a));
    if(f==='log') {if(a<=0) throw new Unsupported('対数の実数定義域が空です');return n(Math.log(a));}
    if(f==='logabs') {if(near(a)) throw new Unsupported('log|0|は未定義です');return n(Math.log(Math.abs(a)));}
    if(f==='sqrt') {if(a<0) throw new Unsupported('平方根の実数定義域が空です');return n(Math.sqrt(a));}
    if(f==='abs') return n(Math.abs(a));
    if(f==='asin'||f==='acos') {if(a< -1||a>1) throw new Unsupported('逆三角関数の定義域外です');return n(f==='asin'?Math.asin(a):Math.acos(a));}
  }
  if(f==='log' && arg.t==='f'&&arg.f==='exp') return arg.arg;
  // exp(log(x)) must NOT simplify to x without preserving x>0 domain.
  return {t:'f',f,arg};
}
export const neg = e => mul(n(-1),e);
export const div = (a,b) => mul(a,pow(b,-1));
export function simplify(e){
  if(!e||typeof e!=='object')throw new Unsupported('式が不正です');
  switch(e.t){
    case 'n':return n(e.v);
    case 'x':return x();
    case 'a':return add(...e.v.map(simplify));
    case 'm':return mul(...e.v.map(simplify));
    case 'p':return pow(simplify(e.b),e.e);
    case 'f':return fn(e.f,simplify(e.arg));
    default:throw new Unsupported('未知の式形式です');
  }
}
export function fromCard(id) {
  switch(id) {
    case 'ZERO':return n(0);case 'ONE':return n(1);case 'X':return x();
    case 'X2':return pow(x(),2);case 'EXP':return fn('exp',x());
    case 'SIN':return fn('sin',x());case 'COS':return fn('cos',x());
    default:throw new Unsupported('関数カードではありません');
  }
}
export function derivative(e) {
  switch(e.t) {
    case 'n':return n(0);
    case 'x':return n(1);
    case 'a':return add(...e.v.map(derivative));
    case 'm':return add(...e.v.map((part,i)=>mul(derivative(part),...e.v.filter((_,j)=>i!==j))));
    case 'p':return mul(n(e.e),pow(e.b,e.e-1),derivative(e.b));
    case 'f': {
      const a=e.arg, da=derivative(a);
      switch(e.f) {
        case 'exp':return mul(fn('exp',a),da);
        case 'sin':return mul(fn('cos',a),da);
        case 'cos':return neg(mul(fn('sin',a),da));
        case 'log':case 'logabs':return div(da,a);
        case 'sqrt':return div(da,mul(n(2),fn('sqrt',a)));
        case 'asin':return div(da,fn('sqrt',add(n(1),neg(pow(a,2)))));
        case 'acos':return neg(div(da,fn('sqrt',add(n(1),neg(pow(a,2))))));
        default:throw new Unsupported('この式の微分はまだ非対応です');
      }
    }
    default:throw new Unsupported('この式の微分はまだ非対応です');
  }
}
function integralInner(e) {
  if(e.t==='n') return mul(e,x());
  if(e.t==='x') return mul(n(.5),pow(x(),2));
  if(e.t==='a') return add(...e.v.map(integralInner));
  if(e.t==='m') {
    const [co, rest]=splitCoef(e);
    if(!near(co,1)) return mul(n(co),integralInner(rest));
  }
  if(e.t==='p'&&e.b.t==='x') {
    if(near(e.e,-1)) return fn('logabs',x());
    return mul(n(1/(e.e+1)),pow(x(),e.e+1));
  }
  if(e.t==='f'&&e.arg.t==='x') {
    if(e.f==='sin') return neg(fn('cos',x()));
    if(e.f==='cos') return fn('sin',x());
    if(e.f==='exp') return fn('exp',x());
    if(e.f==='log'||e.f==='logabs') return add(mul(x(),e),neg(x()));
    if(e.f==='sqrt') return mul(n(2/3),pow(x(),1.5));
  }
  throw new Unsupported('この式の積分は試作版では未対応です');
}
export function integrate(e,C=0) {return add(integralInner(e),n(C));}
export function substituteNegX(e) {
  switch(e.t) {
    case 'x':return neg(x());
    case 'n':return e;
    case 'a':return add(...e.v.map(substituteNegX));
    case 'm':return mul(...e.v.map(substituteNegX));
    case 'p':return pow(substituteNegX(e.b),e.e);
    case 'f':return fn(e.f,substituteNegX(e.arg));
  }
  throw new Unsupported('変数置換に未対応です');
}
export function inverse(e) {
  if(e.t==='x') return x();
  if(e.t==='p'&&e.b.t==='x'&&e.e===2) return fn('sqrt',x()); // principal branch x >= 0
  if(e.t==='f'&&e.arg.t==='x') {
    if(e.f==='exp') return fn('log',x());
    if(e.f==='log') return fn('exp',x());
    if(e.f==='sin') return fn('asin',x());
    if(e.f==='cos') return fn('acos',x());
    // Inverse of sqrt(x) would require the domain x>=0 to be preserved;
    // refuse until domain tracking is implemented.
  }
  // linear form ax+b
  const co=linearForm(e);
  if(co && [...co.keys()].every(k=>k==='1'||k==='x')) {
    const a=co.get('x')||0,b=co.get('1')||0;
    if(!near(a)) return mul(n(1/a),add(x(),n(-b)));
  }
  throw new Unsupported('逆関数は単調な既知の形だけに対応します');
}
function atom(e) {
  if(e.t==='x') return 'x';
  if(e.t==='p'&&e.b.t==='x'&&Number.isInteger(e.e)&&e.e>=0) return e.e===0?'1':`x^${e.e}`;
  if(e.t==='f'&&e.arg.t==='x'&&['exp','sin','cos'].includes(e.f)) return e.f;
  return null;
}
/* Exact coefficient extraction for known linearly independent elementary atoms.
   Unknown nonlinear expressions are not guessed to be dependent. */
export function linearForm(e) {
  if(e.t==='n') return new Map([['1',e.v]]);
  const a=atom(e);
  if(a) return new Map([[a,1]]);
  if(e.t==='a') {
    const out=new Map();
    for(const term of e.v) {
      const sub=linearForm(term);if(!sub)return null;
      for(const [key,val] of sub)out.set(key,(out.get(key)||0)+val);
    }
    return out;
  }
  if(e.t==='m') {
    const [c,base]=splitCoef(e);
    if(!near(c,1)) {
      const sub=linearForm(base);
      return sub?new Map([...sub].map(([k,v])=>[k,v*c])):null;
    }
  }
  return null;
}
function rank(vectors) {
  const columns=[...new Set(vectors.flatMap(v=>[...v.keys()]))];
  if(!columns.length)return 0;
  const m=vectors.map(v=>columns.map(k=>v.get(k)||0));
  let r=0;
  for(let col=0;col<columns.length && r<m.length;col++) {
    let pivot=r;
    for(let i=r+1;i<m.length;i++) if(Math.abs(m[i][col])>Math.abs(m[pivot][col]))pivot=i;
    if(Math.abs(m[pivot][col])<1e-9)continue;
    [m[r],m[pivot]]=[m[pivot],m[r]];
    const d=m[r][col];for(let j=col;j<columns.length;j++)m[r][j]/=d;
    for(let i=r+1;i<m.length;i++) {
      const scale=m[i][col];for(let j=col;j<columns.length;j++)m[i][j]-=scale*m[r][j];
    }
    r++;
  }
  return r;
}
export function reduceBasis(board) {
  const kept=[]; const removed=[]; const known=[];
  for(let i=0;i<board.length;i++) {
    const e=board[i];
    if(isZero(e)){ removed.push(i);continue; }
    const linear=linearForm(e);
    if(linear){
      if(rank([...known,linear])===rank(known)){removed.push(i);continue;}
      known.push(linear);
    }else if(kept.some(old=>sig(old)===sig(e))) {removed.push(i);continue;}
    kept.push(e);
  }
  return {kept,removed};
}
// Extended-real limits; return undefined when symbolic proof is not available.
const F = v => ({type:'finite',v:tidy(v)});
const P = {type:'infinity',sign:1}, M={type:'infinity',sign:-1};
const U = {type:'undefined'};
function limAdd(vals) {
  let acc=0,sgn=0;
  for(const v of vals) {
    if(v.type==='undefined')return U;
    if(v.type==='infinity'){if(sgn && sgn!==v.sign)return U;sgn=v.sign;}
    else acc+=v.v;
  }
  return sgn?(sgn===1?P:M):F(acc);
}
function limMul(vals) {
  let val=1,inf=1,hasInf=false;
  for(const v of vals){
    if(v.type==='undefined')return U;
    if(v.type==='infinity'){hasInf=true;inf*=v.sign;}
    else val*=v.v;
  }
  if(hasInf&&near(val))return U;
  if(hasInf)return Math.sign(val)*inf<0?M:P;
  return F(val);
}
export function limit(e,point='plus',side='two') {
  if(e.t==='n')return F(e.v);
  if(e.t==='x')return point==='plus'?P:point==='minus'?M:F(0);
  if(e.t==='a')return limAdd(e.v.map(t=>limit(t,point,side)));
  if(e.t==='m')return limMul(e.v.map(t=>limit(t,point,side)));
  if(e.t==='p') {
    const v=limit(e.b,point,side), exponent=e.e;
    if(v.type==='undefined')return U;
    if(v.type==='finite') {
      if(near(v.v,0)&&exponent<0){
        if(point==='zero' && e.b.t==='x') {
          if(side==='two' && Number.isInteger(exponent)&&Math.abs(exponent)%2===1)return U;
          const s=side==='minus'&&Number.isInteger(exponent)&&Math.abs(exponent)%2===1?-1:1;
          return s<0?M:P;
        }
        return U;
      }
      const calc=v.v**exponent;return Number.isFinite(calc)&&!Number.isNaN(calc)?F(calc):U;
    }
    if(exponent<0)return F(0);
    if(!Number.isInteger(exponent))return v.sign===1?P:U;
    return v.sign<0&&exponent%2!==0?M:P;
  }
  if(e.t==='f') {
    if((e.f==='sin'||e.f==='cos')&&point!=='zero')return U;
    const l=limit(e.arg,point,side);
    if(l.type==='undefined')return U;
    if(l.type==='infinity') {
      if(e.f==='exp')return l.sign===1?P:F(0);
      if(e.f==='log'||e.f==='logabs')return P;
      if(e.f==='sqrt')return l.sign===1?P:U;
      return U;
    }
    try {const r=fn(e.f,n(l.v));return r.t==='n'?F(r.v):U;}catch{return U;}
  }
  return U;
}
export function oscillatoryLimit(e,kind='sup') {
  // Proved for a*sin(x)+b and a*cos(x)+b only.
  let shift=0, amp=0;
  const terms=e.t==='a'?e.v:[e];
  for(const t of terms){
    if(t.t==='n'){shift+=t.v;continue;}
    const [c,base]=splitCoef(t);
    if(base.t==='f'&&base.arg.t==='x'&&['sin','cos'].includes(base.f)) {
      // A combination a sin(x)+b cos(x) has amplitude sqrt(a²+b²)
      amp+=0;continue;
    }
    return U;
  }
  let a=0,b=0;
  for(const t of terms){
    const [c,base]=splitCoef(t);
    if(base.t==='f'&&base.f==='sin'&&base.arg.t==='x')a+=c;
    if(base.t==='f'&&base.f==='cos'&&base.arg.t==='x')b+=c;
  }
  return F(shift+(kind==='sup'?1:-1)*Math.hypot(a,b));
}
export function expressionSize(e) {return 1+ (e.v&&Array.isArray(e.v)?e.v.reduce((s,t)=>s+expressionSize(t),0):0) + (e.b?expressionSize(e.b):0)+(e.arg?expressionSize(e.arg):0);}
function prettyNumber(v){return Number.isInteger(v)?String(v):String(+v.toPrecision(5));}
export function display(e,wrap=false) {
  switch(e.t) {
    case 'n':return prettyNumber(e.v);
    case 'x':return 'x';
    case 'a':return (wrap?'(':'')+e.v.map(display).join(' + ').replace(/\+ -/g,'− ')+(wrap?')':'');
    case 'm': {
      if(e.v[0]?.t==='n'&&e.v.length===2){const a=e.v[0].v,b=e.v[1];return (near(a,-1)?'−':prettyNumber(a))+ (b.t==='x'||b.t==='p'||b.t==='f'?'':'·')+display(b,true);}
      return e.v.map((v,i)=>display(v,i>0)).join('·');
    }
    case 'p':return display(e.b,true)+'^'+prettyNumber(e.e);
    case 'f': {
      const fmt={sin:'sin',cos:'cos',exp:'exp',log:'log',logabs:'ln|·|',sqrt:'√',asin:'arcsin',acos:'arccos',abs:'|·|'};
      if(e.f==='sqrt')return '√('+display(e.arg)+')';
      if(e.f==='logabs')return 'ln|'+display(e.arg)+'|';
      return (fmt[e.f]||e.f)+'('+display(e.arg)+')';
    }
  }
  return '?';
}
export function hasEmptyRealDomain(e,op) {
  if(e.t==='n')return op==='log'?e.v<=0:e.v<0;
  const [coef,base]=splitCoef(e);
  if(coef<0 && (base.t==='f'&&base.f==='exp'||base.t==='p'&&base.b.t==='x'&&base.e%2===0)) return true;
  return false;
}
