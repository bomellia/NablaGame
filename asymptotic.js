// Structural asymptotic certificates. No numeric sampling of a limit.
// The comparison variable t tends to +infinity; x is +/-t or +/-1/t.
// A scale is exp(q2*t²+q1*t)*t^p*(log t)^l.
// Unknown leading cancellation or branch behavior is deliberately rejected.
const finite=v=>({type:'finite',v}), unknown={type:'unknown'};
const cmp=(a,b)=>{for(let i=0;i<4;i++){if(a[i]!==b[i])return Math.sign(a[i]-b[i]);}return 0;};
const scale0=[0,0,0,0];
const make=(c,s=scale0,exact=true)=>Number.isFinite(c)&&s.every(Number.isFinite)?{c,s,exact}:null;
const cplx=(a,b)=>({re:a,im:b});
const cx=(a,b)=>cplx(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
const cp=(a,k)=>{if(a.im===0&&a.re>0)return cplx(a.re**k,0);if(a.im===0&&a.re<0&&Number.isInteger(2*k)){const p=((2*k)%4+4)%4,r=(-a.re)**k;return [cplx(r,0),cplx(0,r),cplx(-r,0),cplx(0,-r)][p];}const r=Math.hypot(a.re,a.im),theta=Math.atan2(a.im,a.re)*k;return cplx(r**k*Math.cos(theta),r**k*Math.sin(theta));};
const clean=v=>v===0?0:v;
const zeroScale=s=>cmp(s,scale0)===0;
function lead(e,point,side,depth=0){
 if(!e||depth>100)return null;
 const rec=v=>lead(v,point,side,depth+1);
 const direction=point==='minus'||point==='zero'&&side==='minus'?-1:1;
 const atZero=point==='zero';
 if(e.t==='n')return make(e.v);
 if(e.t==='x')return make(direction,[0,0,atZero?-1:1,0]);
 if(e.t==='m'){
  let s=[0,0,0,0],a=cplx(1,0),exact=true;
  for(const v of e.v){const z=rec(v);if(!z)return null;if(z.c===0&&(!z.z||z.z.im===0)&&z.exact)return make(0);a=cx(a,z.z||cplx(z.c,0));s=s.map((n,i)=>n+z.s[i]);exact&&=z.exact;}
  return Number.isFinite(a.re)&&Number.isFinite(a.im)&&s.every(Number.isFinite)?{c:clean(a.re),z:cplx(clean(a.re),clean(a.im)),s,exact}:null;
 }
 if(e.t==='a'){
  const parts=e.v.map(rec);if(parts.some(v=>!v))return null;
  const nonzero=parts.filter(v=>v.c!==0||v.z?.im!==0&&v.z?.im!==undefined);
  if(!nonzero.length)return make(0);
  let s=nonzero[0].s;for(const z of nonzero)if(cmp(z.s,s)>0)s=z.s;
  const top=nonzero.filter(z=>cmp(z.s,s)===0);
  if(top.some(z=>!z.exact)){
   if(cmp(s,scale0)<0)return {c:1,s,exact:false};
   return null;
  }
  const a=top.reduce((a,z)=>{const b=z.z||cplx(z.c,0);return cplx(a.re+b.re,a.im+b.im);},cplx(0,0));
  if(a.re===0&&a.im===0)return null; // cancellation needs higher terms
  return {c:a.re,z:a,s,exact:true};
 }
 if(e.t==='p'){
  const b=rec(e.b),k=e.e;if(!b||!Number.isFinite(k))return null;
  if(!b.exact&&k<0)return null;
  const a=b.z||cplx(b.c,0);
  if(a.re===0&&a.im===0){if(k>0)return make(0);return null;}
  if(a.im===0&&a.re<0&&!Number.isInteger(k)&&!realTail(e.b,point,side,depth+1))return null;
  const z=cp(a,k),s=b.s.map(v=>v*k);
  if(!Number.isFinite(z.re)||!Number.isFinite(z.im)||!s.every(Number.isFinite))return null;
  return {c:clean(z.re),z:cplx(clean(z.re),clean(z.im)),s,exact:b.exact};
 }
 if(e.t!=='f')return null;
 const u=rec(e.arg),name=e.f;
 // boundedness is sufficient for a squeeze-to-zero, never for a nonzero limit.
 if(['sin','cos','tanh','erf','sign'].includes(name)&&(!u||!u.exact||cmp(u.s,scale0)>0)){
  // A complex-valued argument is not certified bounded by these real bounds.
  if(!u||u.z?.im||!realTail(e.arg,point,side))return null;
  if(['sin','cos','sign','tanh','erf'].includes(name)&&(!u.exact||['sin','cos'].includes(name)))return make(1,scale0,false);
 }
 if(u&&!u.exact&&name==='abs'&&realTail(e.arg,point,side))return make(1,u.s,false);
 if(!u||!u.exact)return null;
 const a=u.z||cplx(u.c,0),r=cmp(u.s,scale0);
 if(a.im!==0)return null;
 if(name==='abs')return make(Math.abs(a.re),u.s);
 if(name==='sign'&&a.re!==0)return make(Math.sign(a.re));
 if(name==='sqrt'){if(a.re<0&&!realTail(e.arg,point,side))return null;if(a.re<0)return {c:0,z:cplx(0,Math.sqrt(-a.re)),s:u.s.map(v=>v*.5),exact:true};return make(Math.sqrt(a.re),u.s.map(v=>v*.5));}
 if(name==='exp'){
  if(r<0)return make(1);
  if(r===0)return make(Math.exp(a.re));
  // Only exact polynomial exponents with no subleading divergent terms.
  // The input is matched structurally, not inferred from its leading order.
  const polynomial=expPolynomial(e.arg,point,side);
  if(polynomial)return make(Math.exp(polynomial[2]),[polynomial[0],polynomial[1],0,0]);
  return null;
 }
 if(name==='log'||name==='logabs'){
  if(a.re===0)return null;
  if(u.s[0]!==0)return make(u.s[0],[0,0,2,0]);
  if(u.s[1]!==0)return make(u.s[1],[0,0,1,0]);
  if(u.s[2]!==0)return make(u.s[2],[0,0,0,1]);
  if(u.s[3]!==0)return null;
  if(r===0){const v=Math.log(Math.abs(a.re));return name==='log'&&a.re<0?{c:v,z:cplx(v,Math.PI),s:scale0,exact:true}:v===0?null:make(v);}
 }
 if(r<0){
  if(['sin','tan','sinh','tanh','asin','atan','asinh','atanh'].includes(name))return u;
  if(['cos','cosh'].includes(name))return make(1);
  if(['cot','csc'].includes(name))return make(1/a.re,u.s.map(v=>-v));
  if(name==='sec')return make(1);
 }
 if(r>0){
  if(name==='tanh'||name==='erf'||name==='sign')return make(Math.sign(a.re));
  if(name==='atan')return make(Math.sign(a.re)*Math.PI/2);
 }
 return null;
}
function expPolynomial(e,point,side){
 const direction=point==='minus'||point==='zero'&&side==='minus'?-1:1,atZero=point==='zero';
 const terms=e.t==='a'?e.v:[e],out=[0,0,0];
 for(const term of terms){
  let c=1,b=term;
  if(term.t==='m'&&term.v[0]?.t==='n'&&term.v.length===2){c=term.v[0].v;b=term.v[1];}
  if(b.t==='n'){out[2]+=c*b.v;continue;}
  const p=b.t==='x'?1:b.t==='p'&&b.b.t==='x'?b.e:null;
  if(p===null||!Number.isInteger(p))return null;
  const k=atZero?-p:p;if(k<0)return null;
  if(k!==1&&k!==2)return null;
  out[2-k]+=c*direction**p;
 }
 return out;
}
export function asymptoticLimit(e,point,side){
 if(point==='zero'&&side==='two'){
  const a=asymptoticLimit(e,point,'plus'),b=asymptoticLimit(e,point,'minus');
  if(a.type==='unknown'||b.type==='unknown')return unknown;
  if(a.type===b.type&&JSON.stringify(a)===JSON.stringify(b))return a;
  // Unequal one-sided certified values, including +/-infinity.
  if(['finite','complex','infinity'].includes(a.type)&&['finite','complex','infinity'].includes(b.type))return {type:'nonexistent'};
  return unknown;
 }
 const u=lead(e,point,side);if(!u)return unknown;
 const z=u.z||cplx(u.c,0),r=cmp(u.s,scale0);
 if(r<0||u.exact&&z.re===0&&z.im===0)return finite(0);
 if(!u.exact)return unknown;
 if(r>0)return z.im!==0?{type:'complexInfinity'}:{type:'infinity',sign:Math.sign(z.re)};
 return z.im!==0?{type:'complex',re:z.re,im:z.im}:finite(z.re);
}
// Exact range of a single oscillating phase or a monotone composition.
// Do not combine independent ranges of multiple correlated functions.
// Sufficient, not necessary, test of reality and eventual continuity.
function realTail(e,point,side,depth=0){
 if(!e||depth>100)return false;
 const rec=v=>realTail(v,point,side,depth+1);
 if(e.t==='n'||e.t==='x')return true;
 if(e.t==='a'||e.t==='m')return e.v.every(rec);
 if(e.t==='p'){
  if(!rec(e.b))return false;
  if(Number.isInteger(e.e))return true;
  const q=lead(e.b,point,side,depth+1);
  return !!q&&q.exact&&!(q.z?.im)&&q.c>0;
 }
 if(e.t!=='f'||!rec(e.arg))return false;
 if(['sin','cos','tan','cot','sec','csc','abs','sign','exp','sinh','cosh','tanh','erf','erfi','atan','asinh','logabs'].includes(e.f))return true;
 if(['sqrt','log'].includes(e.f)){const q=lead(e.arg,point,side,depth+1);return !!q&&q.exact&&!(q.z?.im)&&q.c>0;}
 return false;
}
function continuousTail(e,depth=0){
 if(!e||depth>100)return false;
 if(!realTail(e,'plus','two',depth))return false;
 if(e.t==='n'||e.t==='x')return true;
 if(e.t==='a'||e.t==='m')return e.v.every(v=>continuousTail(v,depth+1));
 if(e.t==='p'){
  if(!continuousTail(e.b,depth+1))return false;
  if(e.e>=0&&Number.isInteger(e.e))return true;
  const q=lead(e.b,'plus','two',depth+1);return !!q&&q.exact&&q.c!==0&&!q.z?.im;
 }
 if(e.t==='f'&&['sin','cos','exp','abs','sqrt','log','logabs','sinh','cosh','tanh','erf','erfi','atan','asinh'].includes(e.f)){
  if(!continuousTail(e.arg,depth+1))return false;
  if(e.f==='logabs'){const q=lead(e.arg,'plus','two',depth+1);return !!q&&q.exact&&q.c!==0&&!q.z?.im;}
  return true;
 }
 return false;
}

export function periodicRange(e,realLimit){
 if(e.t==='n')return [e.v,e.v];
 if(e.t==='f'&&['sin','cos'].includes(e.f)){
  const v=realLimit(e.arg,'plus');if(v.type==='infinity'&&continuousTail(e.arg))return [-1,1];
 }
 if(e.t==='a'){
  const varying=e.v.filter(v=>v.t!=='n');if(varying.length!==1)return null;
  const r=periodicRange(varying[0],realLimit);if(!r)return null;
  const c=e.v.filter(v=>v.t==='n').reduce((a,b)=>a+b.v,0);return r.map(v=>v+c);
 }
 if(e.t==='m'){
  const varying=e.v.filter(v=>v.t!=='n');
  if(varying.length===2&&varying.every(v=>v.t==='f'&&['sin','cos'].includes(v.f))&&varying[0].f!==varying[1].f&&JSON.stringify(varying[0].arg)===JSON.stringify(varying[1].arg)&&continuousTail(varying[0].arg)&&realLimit(varying[0].arg,'plus').type==='infinity'){
   const c=e.v.filter(v=>v.t==='n').reduce((a,b)=>a*b.v,1);return [-Math.abs(c)/2,Math.abs(c)/2];
  }
  if(varying.length===2){
   const sg=varying.find(v=>v.t==='f'&&v.f==='sign'),trig=varying.find(v=>v.t==='f'&&['sin','cos'].includes(v.f));
   if(sg&&trig&&sg.arg?.t==='f'&&['sin','cos'].includes(sg.arg.f)&&JSON.stringify(sg.arg.arg)===JSON.stringify(trig.arg)&&continuousTail(trig.arg)&&realLimit(trig.arg,'plus').type==='infinity'){
    const c=e.v.filter(v=>v.t==='n').reduce((a,b)=>a*b.v,1);
    return sg.arg.f===trig.f?[Math.min(0,c),Math.max(0,c)]:[-Math.abs(c),Math.abs(c)];
   }
  }
  if(varying.length!==1)return null;
  const r=periodicRange(varying[0],realLimit);if(!r)return null;
  const c=e.v.filter(v=>v.t==='n').reduce((a,b)=>a*b.v,1);return r.map(v=>v*c).sort((a,b)=>a-b);
 }
 if(e.t==='p'){
  const r=periodicRange(e.b,realLimit),k=e.e;if(!r||k<0||!Number.isInteger(k)&&r[0]<0)return null;
  const a=r.map(v=>v**k);if(Number.isInteger(k)&&k%2===0&&r[0]<=0&&r[1]>=0)a.push(0);return [Math.min(...a),Math.max(...a)];
 }
 if(e.t==='f'){
  const r=periodicRange(e.arg,realLimit);if(!r)return null;
  const [a,b]=r;
  if(e.f==='exp')return [Math.exp(a),Math.exp(b)];
  if(e.f==='log'&&a>0)return [Math.log(a),Math.log(b)];
  if(e.f==='sqrt'&&a>=0)return [Math.sqrt(a),Math.sqrt(b)];
  if(e.f==='abs')return [a<=0&&b>=0?0:Math.min(Math.abs(a),Math.abs(b)),Math.max(Math.abs(a),Math.abs(b))];
  if(e.f==='atan')return r.map(Math.atan);
  if(e.f==='sign'&&a<0&&b>0)return [-1,1];
  if(e.f==='sign'&&a>0)return [1,1];
  if(e.f==='sign'&&b<0)return [-1,-1];
 }
 return null;
}

// Exact extrema of c*sin(u)^a*cos(u)^b for integer a,b and a continuous
// unbounded real phase u. Poles are approached on the punctured domain.
// Unlike interval multiplication, this preserves the correlation sin²+cos²=1.
function trigMonomial(e){
 const powers={sin:[1,0],cos:[0,1],tan:[1,-1],cot:[-1,1],sec:[0,-1],csc:[-1,0]};
 let coefficient=1,a=0,b=0,phase=null;
 function visit(t,k=1){
  if(!Number.isSafeInteger(k))return false;
  if(t.t==='n'){coefficient*=t.v**k;return Number.isFinite(coefficient)&&coefficient!==0;}
  if(t.t==='m')return t.v.every(v=>visit(v,k));
  if(t.t==='p')return visit(t.b,k*t.e);
  if(t.t!=='f'||!Object.hasOwn(powers,t.f))return false;
  if(phase&&JSON.stringify(phase)!==JSON.stringify(t.arg))return false;
  phase=t.arg;a+=k*powers[t.f][0];b+=k*powers[t.f][1];
  return Number.isSafeInteger(a)&&Number.isSafeInteger(b);
 }
 return visit(e)&&phase?{coefficient,a,b,phase}:null;
}
export function trigExtrema(e,realLimit){
 const m=trigMonomial(e);
 if(m&&continuousTail(m.phase)&&realLimit(m.phase,'plus').type==='infinity'){
  const {a,b,coefficient:c}=m;
  // On each quadrant y=sin²(u) traverses (0,1). Magnitude is
  // |c| y^(a/2)(1-y)^(b/2). Its only possible interior critical
  // point is y=a/(a+b).
  const values=[a<0?Infinity:a>0?0:1,b<0?Infinity:b>0?0:1];
  if(a+b!==0){
   const y=a/(a+b);
   if(y>0&&y<1){const v=Math.exp((a*Math.log(y)+b*Math.log1p(-y))/2);if(!Number.isFinite(v)||v===0)return null;values.push(v);}
  }
  const lo=Math.min(...values)*Math.abs(c),hi=Math.max(...values)*Math.abs(c);
  if(!Number.isFinite(lo)||Number.isNaN(hi))return null;
  // A finite result must not be produced by floating-point overflow.
  if(!Number.isFinite(hi)&&a>=0&&b>=0)return null;
  if(a%2!==0||b%2!==0)return [-hi,hi];
  return c<0?[-hi,-lo]:[lo,hi];
 }
 // Monotone transformations of a certified pair of extrema preserve them,
 // including unbounded endpoints. Do not assume all intermediate values occur.
 if(e.t==='a'){
  const v=e.v.filter(t=>t.t!=='n');if(v.length!==1)return null;
  const r=trigExtrema(v[0],realLimit);if(!r)return null;
  const c=e.v.filter(t=>t.t==='n').reduce((s,t)=>s+t.v,0);
  return Number.isFinite(c)?r.map(t=>t+c):null;
 }
 if(e.t==='m'){
  const v=e.v.filter(t=>t.t!=='n');if(v.length!==1)return null;
  const r=trigExtrema(v[0],realLimit);if(!r)return null;
  const c=e.v.filter(t=>t.t==='n').reduce((s,t)=>s*t.v,1);
  return Number.isFinite(c)&&c!==0?r.map(t=>t*c).sort((a,b)=>a-b):null;
 }
 if(e.t==='f'){
  const r=trigExtrema(e.arg,realLimit);if(!r)return null;
  if(e.f==='atan')return r.map(Math.atan);
  if(e.f==='tanh')return r.map(Math.tanh);
  if(e.f==='exp'){
   const out=r.map(Math.exp);return out.some((v,i)=>!Number.isFinite(v)&&Number.isFinite(r[i]))?null:out;
  }
  if(e.f==='log'&&r[0]>0)return r.map(Math.log);
 }
 return null;
}

// Certified pole signs for sums of same-phase trigonometric Laurent monomials.
// At a cosine zero, sin tends to +1 or -1; at a sine zero, cos does.
// Only the terms with the lowest power of the vanishing factor contribute
// to the leading pole. When their signs disagree, decline to certify that
// approach rather than infer a sign from an approximate cancellation.
// A finite extremum cannot be inferred merely from absence of a pole.
export function trigSumPoleSigns(e,realLimit){
 if(e.t!=='a')return null;
 let phase=null;
 const terms=[];
 for(const term of e.v){
  if(term.t==='n'){if(term.v!==0)terms.push({a:0,b:0,coefficient:term.v});continue;}
  const m=trigMonomial(term);
  if(!m)return null;
  if(phase&&JSON.stringify(phase)!==JSON.stringify(m.phase))return null;
  phase=m.phase;terms.push(m);
 }
 if(!phase||!continuousTail(phase)||realLimit(phase,'plus').type!=='infinity')return null;
 const signs={positive:false,negative:false};
 const parity=(s,k)=>k%2===0?1:s;
 for(const axis of ['a','b']){
  const other=axis==='a'?'b':'a';
  const min=Math.min(...terms.map(t=>t[axis]));
  if(min>=0)continue;
  const leading=terms.filter(t=>t[axis]===min);
  for(const small of [-1,1])for(const fixed of [-1,1]){
   const cs=leading.map(t=>t.coefficient*parity(small,t[axis])*parity(fixed,t[other]));
   // No floating-point summation of opposed leading coefficients: this
   // also prevents false pole claims for identities such as sec²-tan².
   if(cs.every(v=>v>0))signs.positive=true;
   if(cs.every(v=>v<0))signs.negative=true;
  }
 }
 return signs.positive||signs.negative?signs:null;
}
